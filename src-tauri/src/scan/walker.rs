//! Parallel filesystem traversal via `jwalk`.
//!
//! Produces a flat `Vec<Node>` with parent/child links resolved. Symbolic links
//! and reparse points are not followed (avoids cycles and double-counting);
//! inaccessible entries are counted and skipped. Directory sizes are left at 0
//! here and filled in by [`super::tree::aggregate_sizes`].

use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::{Instant, UNIX_EPOCH};

use jwalk::{DirEntry, WalkDirGeneric};

use super::{Node, ScanError};

/// Per-entry state jwalk carries from the parallel `process_read_dir` callback
/// to the consumer: `(on_disk_size, mtime_unix_secs, metadata_failed)`.
type EntryData = (u64, Option<u64>, bool);
type EntryState = ((), EntryData);

/// On-disk size + mtime for a file entry. The expensive `allocated_size` syscall
/// (Windows `GetCompressedFileSizeW`) fires only for files >= 1 MiB — exactly as
/// the old sequential path did. Called on jwalk's rayon workers for every entry
/// except the root, so this cost is now parallelized across cores.
fn file_payload(entry: &DirEntry<EntryState>) -> EntryData {
    match entry.metadata() {
        Ok(m) => {
            let mtime = m
                .modified()
                .ok()
                .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
                .map(|d| d.as_secs());
            // Real on-disk footprint, so sparse/compressed files (e.g. VM images)
            // are counted by what they actually occupy, not their logical length.
            let logical = m.len();
            let size = if logical >= 1024 * 1024 {
                crate::platform::allocated_size(&entry.path(), &m)
            } else {
                logical
            };
            (size, mtime, false)
        }
        Err(_) => (0, None, true),
    }
}

/// Progress snapshot passed to the caller's callback during a scan.
pub struct Progress {
    pub files: u64,
    pub dirs: u64,
    pub bytes: u64,
    pub current: String,
}

/// Output of a completed walk. `nodes[0]` is the root.
pub struct WalkOutput {
    pub nodes: Vec<Node>,
    pub files: u64,
    pub dirs: u64,
    pub errors: u64,
    /// Bounded sample of entries that could not be read (permission denied,
    /// etc.) so the UI can surface *which* locations were skipped, not just a
    /// count.
    pub inaccessible: Vec<String>,
}

/// Walk `root` into a flat arena with running tallies. `nodes[0]` is the root.
pub fn walk<F: FnMut(&Progress)>(
    root: &Path,
    cancel: &Arc<AtomicBool>,
    mut on_progress: F,
) -> Result<WalkOutput, ScanError> {
    // Cap the collected sample so a drive with millions of locked files can't
    // balloon the cache/IPC payload; the full tally still lives in `errors`.
    const MAX_INACCESSIBLE: usize = 100;

    let mut nodes: Vec<Node> = Vec::new();
    let mut index: HashMap<PathBuf, usize> = HashMap::new();
    let (mut files, mut dirs, mut bytes, mut errors) = (0u64, 0u64, 0u64, 0u64);
    let mut inaccessible: Vec<String> = Vec::new();
    let mut last = Instant::now();
    let mut since_emit = 0u64;

    // Pass 1 — collect every entry into the arena. Per-file size/mtime is
    // computed inside jwalk's parallel `process_read_dir` callback (on its rayon
    // pool), so the costly metadata + on-disk-size syscalls run across cores
    // instead of serializing on this consumer thread, which only assembles nodes.
    // Benchmarked on C:\Windows\System32 (31k entries, 13.6 GB): ~1.25 s → ~0.80 s
    // (≈36% faster) with byte-identical tallies vs. the old sequential path.
    let walk_cancel = cancel.clone();
    let walk_iter = WalkDirGeneric::<EntryState>::new(root)
        .follow_links(false)
        .skip_hidden(false)
        .process_read_dir(move |_depth, _path, _read_dir_state, children| {
            // Once cancellation is requested, stop doing the expensive per-file
            // metadata + on-disk-size syscalls on the rayon workers. The consumer
            // loop below also bails on this flag, but the parallel producers can
            // otherwise run seconds ahead of it on a huge tree — making a cancel
            // feel frozen. Leaving client_state at its default is fine: those
            // nodes are discarded the moment the consumer returns Cancelled.
            if walk_cancel.load(Ordering::Relaxed) {
                return;
            }
            for child in children.iter_mut() {
                let Ok(entry) = child else { continue };
                let ft = entry.file_type;
                let data = if ft.is_dir() || ft.is_symlink() {
                    (0, None, false)
                } else {
                    file_payload(entry)
                };
                entry.client_state = data;
            }
        });

    for entry in walk_iter {
        if cancel.load(Ordering::Relaxed) {
            return Err(ScanError::Cancelled);
        }
        let entry = match entry {
            Ok(e) => e,
            Err(err) => {
                errors += 1;
                if inaccessible.len() < MAX_INACCESSIBLE {
                    if let Some(p) = err.path() {
                        inaccessible.push(p.to_string_lossy().to_string());
                    }
                }
                continue;
            }
        };

        let path = entry.path();
        let is_dir = entry.file_type().is_dir();

        // The root is never visited by `process_read_dir` (it is not a child of
        // any read dir), so its payload stays at the default zero. Compute it
        // here for the rare "scan a single file" case; for a directory root the
        // zero size is correct (filled in later by aggregate_sizes).
        let (size, mtime, meta_failed) = if entry.depth() == 0 && !is_dir {
            file_payload(&entry)
        } else {
            entry.client_state
        };

        if meta_failed {
            errors += 1;
            if inaccessible.len() < MAX_INACCESSIBLE {
                inaccessible.push(path.to_string_lossy().to_string());
            }
        }

        let name = {
            let n = entry.file_name().to_string_lossy().to_string();
            if n.is_empty() {
                path.to_string_lossy().to_string()
            } else {
                n
            }
        };

        let idx = nodes.len();
        nodes.push(Node {
            name,
            path: path.clone(),
            size,
            is_dir,
            mtime,
            parent: None,
            children: Vec::new(),
            removed: false,
        });
        index.insert(path, idx);

        if is_dir {
            dirs += 1;
        } else {
            files += 1;
            bytes += size;
        }

        since_emit += 1;
        if since_emit >= 1000 || last.elapsed().as_millis() >= 60 {
            on_progress(&Progress {
                files,
                dirs,
                bytes,
                current: nodes[idx].path.to_string_lossy().to_string(),
            });
            last = Instant::now();
            since_emit = 0;
        }
    }

    // Pass 2 — resolve parent/child links by path (robust to traversal order).
    for i in 0..nodes.len() {
        if let Some(parent_path) = nodes[i].path.parent() {
            if let Some(&p) = index.get(parent_path) {
                if p != i {
                    nodes[i].parent = Some(p);
                    nodes[p].children.push(i);
                }
            }
        }
    }

    on_progress(&Progress {
        files,
        dirs,
        bytes,
        current: String::new(),
    });

    Ok(WalkOutput {
        nodes,
        files,
        dirs,
        errors,
        inaccessible,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Manual benchmark — ignored by default. Run with a real corpus:
    ///   `BENCH_WALK_PATH=C:\some\dir cargo test --release --lib bench_walk -- --ignored --nocapture`
    /// Prints the median wall-clock plus the tallies, so a before/after change
    /// can be checked for BOTH a speed delta and identical counts/bytes (the
    /// latter guards against a regression in size aggregation).
    #[test]
    #[ignore = "manual benchmark; set BENCH_WALK_PATH"]
    fn bench_walk() {
        let Ok(path) = std::env::var("BENCH_WALK_PATH") else {
            eprintln!("bench_walk: set BENCH_WALK_PATH to a directory to benchmark");
            return;
        };
        let root = Path::new(&path);
        let cancel = Arc::new(AtomicBool::new(false));

        // Warm the OS file cache once; cold timings are noise.
        let _ = walk(root, &cancel, |_| {});

        const RUNS: usize = 5;
        let mut times = Vec::with_capacity(RUNS);
        let mut tally = None;
        for _ in 0..RUNS {
            let start = Instant::now();
            let out = walk(root, &cancel, |_| {}).expect("walk failed");
            times.push(start.elapsed());
            // Sum leaf bytes as the correctness check (identical before/after).
            let bytes: u64 = out.nodes.iter().filter(|n| !n.is_dir).map(|n| n.size).sum();
            tally = Some((out.nodes.len(), out.files, out.dirs, bytes, out.errors));
        }
        times.sort();
        let (nodes, files, dirs, bytes, errors) = tally.unwrap();
        eprintln!(
            "bench_walk[{}]: median={:?} (min={:?} max={:?}) | nodes={} files={} dirs={} bytes={} errors={}",
            path, times[RUNS / 2], times[0], times[RUNS - 1], nodes, files, dirs, bytes, errors
        );
    }
}
