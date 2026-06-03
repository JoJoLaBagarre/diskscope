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

use jwalk::WalkDir;

use super::{Node, ScanError};

/// Progress snapshot passed to the caller's callback during a scan.
pub struct Progress {
    pub files: u64,
    pub dirs: u64,
    pub bytes: u64,
    pub current: String,
}

/// Returns `(nodes, file_count, dir_count, error_count)`. `nodes[0]` is the root.
pub fn walk<F: FnMut(&Progress)>(
    root: &Path,
    cancel: &Arc<AtomicBool>,
    mut on_progress: F,
) -> Result<(Vec<Node>, u64, u64, u64), ScanError> {
    let mut nodes: Vec<Node> = Vec::new();
    let mut index: HashMap<PathBuf, usize> = HashMap::new();
    let (mut files, mut dirs, mut bytes, mut errors) = (0u64, 0u64, 0u64, 0u64);
    let mut last = Instant::now();
    let mut since_emit = 0u64;

    // Pass 1 — collect every entry into the arena.
    for entry in WalkDir::new(root).follow_links(false).skip_hidden(false) {
        if cancel.load(Ordering::Relaxed) {
            return Err(ScanError::Cancelled);
        }
        let entry = match entry {
            Ok(e) => e,
            Err(_) => {
                errors += 1;
                continue;
            }
        };

        let path = entry.path();
        let ft = entry.file_type();
        let is_dir = ft.is_dir();
        let is_symlink = ft.is_symlink();

        let (size, mtime) = if is_dir || is_symlink {
            (0u64, None)
        } else {
            match entry.metadata() {
                Ok(m) => {
                    let mt = m
                        .modified()
                        .ok()
                        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
                        .map(|d| d.as_secs());
                    // Use the real on-disk footprint, not the logical length, so
                    // sparse/compressed files (e.g. VM images) are counted by
                    // what they actually occupy. The extra syscall only fires
                    // for files >= 1 MiB, so it never slows the common case of
                    // millions of small files.
                    let logical = m.len();
                    let size = if logical >= 1024 * 1024 {
                        crate::platform::allocated_size(&path, &m)
                    } else {
                        logical
                    };
                    (size, mt)
                }
                Err(_) => {
                    errors += 1;
                    (0, None)
                }
            }
        };

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

    Ok((nodes, files, dirs, errors))
}
