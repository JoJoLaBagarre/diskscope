//! Disk scanning: volume enumeration, parallel traversal, bottom-up size
//! aggregation, and query helpers over the resulting in-memory tree.
//!
//! The tree is stored as a flat arena (`Vec<Node>`); children reference their
//! parent by index. Queries return small [`ScanEntry`] DTOs so the React layer
//! only ever receives the slice it displays, never the whole (potentially
//! multi-million-node) tree.

pub mod cache;
mod tree;
mod walker;

use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::sync::atomic::AtomicBool;
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};

pub use walker::Progress;

/// A single filesystem entry in the scan arena.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Node {
    pub name: String,
    pub path: PathBuf,
    /// File length, or aggregated subtree size for directories.
    pub size: u64,
    pub is_dir: bool,
    /// Modification time, unix seconds.
    pub mtime: Option<u64>,
    pub parent: Option<usize>,
    pub children: Vec<usize>,
    /// Tombstone set when the entry is sent to the trash, so the tree stays
    /// usable without a full re-scan.
    #[serde(default)]
    pub removed: bool,
}

/// Full scan result held in [`crate::state::AppState`].
#[derive(Debug, Serialize, Deserialize)]
pub struct ScanResult {
    pub root: usize,
    pub root_path: PathBuf,
    pub nodes: Vec<Node>,
    pub total_size: u64,
    pub file_count: u64,
    pub dir_count: u64,
    pub errors: u64,
    /// Bounded sample of paths that could not be read (permission denied, etc.).
    /// `#[serde(default)]` keeps older caches (written before this field) loadable.
    #[serde(default)]
    pub inaccessible: Vec<String>,
    pub scanned_at: u64,
}

/// Headline numbers for a scan — cheap to send to the frontend.
#[derive(Debug, Clone, Serialize)]
pub struct ScanSummary {
    pub root_path: String,
    pub total_size: u64,
    pub file_count: u64,
    pub dir_count: u64,
    pub errors: u64,
    /// Bounded sample of skipped paths, surfaced to the user.
    pub inaccessible: Vec<String>,
    pub scanned_at: u64,
    pub from_cache: bool,
}

/// One row for tables / drill-down.
#[derive(Debug, Clone, Serialize)]
pub struct ScanEntry {
    pub id: usize,
    pub name: String,
    pub path: String,
    pub size: u64,
    pub is_dir: bool,
    pub mtime: Option<u64>,
    pub child_count: usize,
    /// Size as a percentage of the relevant denominator (parent for drill-down,
    /// scan total for the "largest items" view).
    pub percent: f32,
}

/// One aggregated row for the "by file type" view: every file sharing an
/// extension, with their combined size.
#[derive(Debug, Clone, Serialize)]
pub struct ExtBucket {
    /// Lowercased extension without the dot; empty string means "no extension".
    pub ext: String,
    pub count: u64,
    pub size: u64,
    /// Combined size as a percentage of the scan total.
    pub percent: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VolumeInfo {
    pub name: String,
    pub mount_point: String,
    pub total_bytes: u64,
    pub free_bytes: u64,
    pub file_system: String,
    pub is_removable: bool,
}

#[derive(Debug, Clone, Copy, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SortKey {
    Size,
    Name,
    Mtime,
}

#[derive(Debug, Clone, Copy, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ItemKind {
    Files,
    Dirs,
    All,
}

#[derive(Debug, thiserror::Error)]
pub enum ScanError {
    #[error("scan cancelled")]
    Cancelled,
    #[error("path not found: {0}")]
    NotFound(String),
}

/// Enumerate mounted volumes with free/total space.
pub fn volumes() -> Vec<VolumeInfo> {
    use sysinfo::Disks;
    let disks = Disks::new_with_refreshed_list();
    disks
        .iter()
        .map(|d| {
            let name = d.name().to_string_lossy().to_string();
            VolumeInfo {
                name: if name.trim().is_empty() {
                    d.mount_point().to_string_lossy().to_string()
                } else {
                    name
                },
                mount_point: d.mount_point().to_string_lossy().to_string(),
                total_bytes: d.total_space(),
                free_bytes: d.available_space(),
                file_system: d.file_system().to_string_lossy().to_string(),
                is_removable: d.is_removable(),
            }
        })
        .collect()
}

/// Run a full scan: traverse with [`walker`], then aggregate sizes bottom-up.
pub fn scan<F: FnMut(&Progress)>(
    root: &Path,
    cancel: &Arc<AtomicBool>,
    on_progress: F,
) -> Result<ScanResult, ScanError> {
    if !root.exists() {
        return Err(ScanError::NotFound(root.display().to_string()));
    }
    let walker::WalkOutput {
        mut nodes,
        files: file_count,
        dirs: dir_count,
        errors,
        inaccessible,
    } = walker::walk(root, cancel, on_progress)?;
    tree::aggregate_sizes(&mut nodes, 0);
    let total_size = nodes.first().map(|n| n.size).unwrap_or(0);
    Ok(ScanResult {
        root: 0,
        root_path: root.to_path_buf(),
        total_size,
        file_count,
        dir_count,
        errors,
        inaccessible,
        scanned_at: now_secs(),
        nodes,
    })
}

impl ScanResult {
    pub fn summary(&self, from_cache: bool) -> ScanSummary {
        ScanSummary {
            root_path: self.root_path.to_string_lossy().to_string(),
            total_size: self.total_size,
            file_count: self.file_count,
            dir_count: self.dir_count,
            errors: self.errors,
            inaccessible: self.inaccessible.clone(),
            scanned_at: self.scanned_at,
            from_cache,
        }
    }

    fn entry(&self, id: usize, denom: u64) -> Option<ScanEntry> {
        let n = self.nodes.get(id)?;
        let percent = if denom == 0 {
            0.0
        } else {
            (n.size as f64 / denom as f64 * 100.0) as f32
        };
        Some(ScanEntry {
            id,
            name: n.name.clone(),
            path: n.path.to_string_lossy().to_string(),
            size: n.size,
            is_dir: n.is_dir,
            mtime: n.mtime,
            child_count: n
                .children
                .iter()
                .filter(|&&c| !self.nodes[c].removed)
                .count(),
            percent,
        })
    }

    /// Direct children of `parent` (or the root when `None`), sorted and paged.
    pub fn children(
        &self,
        parent: Option<usize>,
        sort: SortKey,
        desc: bool,
        limit: usize,
        offset: usize,
    ) -> Vec<ScanEntry> {
        let pidx = parent.unwrap_or(self.root);
        let Some(p) = self.nodes.get(pidx) else {
            return vec![];
        };
        let denom = p.size;
        let mut kids: Vec<usize> = p
            .children
            .iter()
            .copied()
            .filter(|&c| !self.nodes[c].removed)
            .collect();
        tree::sort_indices(&self.nodes, &mut kids, sort, desc);
        kids.into_iter()
            .skip(offset)
            .take(limit)
            .filter_map(|i| self.entry(i, denom))
            .collect()
    }

    /// Largest entries across the whole scan, filtered by kind.
    pub fn largest(&self, kind: ItemKind, limit: usize) -> Vec<ScanEntry> {
        let denom = self.total_size;
        let mut idxs: Vec<usize> = (0..self.nodes.len())
            .filter(|&i| {
                let n = &self.nodes[i];
                if n.removed || i == self.root {
                    return false;
                }
                match kind {
                    ItemKind::Files => !n.is_dir,
                    ItemKind::Dirs => n.is_dir,
                    ItemKind::All => true,
                }
            })
            .collect();
        // Bounded top-N selection: partition the `limit` largest indices in O(n)
        // with select_nth_unstable instead of fully sorting all n of them
        // (O(n log n)), then sort just that small slice for display order. On a
        // multi-million-node scan (ItemKind::All) this turns a full sort over
        // every node into a linear partition plus a tiny sort.
        if limit == 0 {
            return Vec::new();
        }
        if limit < idxs.len() {
            idxs.select_nth_unstable_by(limit - 1, |&a, &b| {
                self.nodes[b].size.cmp(&self.nodes[a].size)
            });
            idxs.truncate(limit);
        }
        idxs.sort_unstable_by(|&a, &b| self.nodes[b].size.cmp(&self.nodes[a].size));
        idxs.into_iter()
            .filter_map(|i| self.entry(i, denom))
            .collect()
    }

    /// Aggregate every live file by extension, returning the `limit` largest
    /// buckets by combined size. Directories are excluded — only file bytes count.
    pub fn extension_breakdown(&self, limit: usize) -> Vec<ExtBucket> {
        use std::collections::HashMap;
        let mut by_ext: HashMap<String, (u64, u64)> = HashMap::new();
        for n in &self.nodes {
            if n.removed || n.is_dir {
                continue;
            }
            let (count, size) = by_ext.entry(ext_key(&n.name)).or_insert((0, 0));
            *count += 1;
            *size += n.size;
        }
        if limit == 0 {
            return Vec::new();
        }
        let denom = self.total_size.max(1);
        let mut buckets: Vec<ExtBucket> = by_ext
            .into_iter()
            .map(|(ext, (count, size))| ExtBucket {
                ext,
                count,
                size,
                percent: (size as f64 / denom as f64 * 100.0) as f32,
            })
            .collect();
        // Same bounded top-N trick as `largest`: partition then sort the slice.
        if limit < buckets.len() {
            buckets.select_nth_unstable_by(limit - 1, |a, b| b.size.cmp(&a.size));
            buckets.truncate(limit);
        }
        buckets.sort_unstable_by(|a, b| b.size.cmp(&a.size));
        buckets
    }

    /// Read-only lookup of a live entry's path. `None` if the id is invalid or
    /// already tombstoned. Used to delete on disk *without* holding a write lock.
    pub fn node_path(&self, id: usize) -> Option<std::path::PathBuf> {
        let n = self.nodes.get(id)?;
        if n.removed {
            return None;
        }
        Some(n.path.clone())
    }

    /// Patch the tree after an entry's bytes have been removed from disk:
    /// subtract its size from every ancestor, drop it from its parent's child
    /// list, tombstone it, and refresh the total. Pure in-memory bookkeeping —
    /// no I/O — so it can run under a brief write lock.
    pub fn mark_trashed(&mut self, id: usize) {
        let Some(node) = self.nodes.get(id) else {
            return;
        };
        if node.removed {
            return;
        }
        let size = node.size;

        let mut cur = self.nodes[id].parent;
        while let Some(p) = cur {
            self.nodes[p].size = self.nodes[p].size.saturating_sub(size);
            cur = self.nodes[p].parent;
        }
        if let Some(p) = self.nodes[id].parent {
            self.nodes[p].children.retain(|&c| c != id);
        }
        self.nodes[id].removed = true;
        self.total_size = self.nodes[self.root].size;
    }

    /// Send an entry to the OS trash and patch the tree. Convenience wrapper for
    /// single, synchronous deletes (still used by `trash_path`).
    pub fn trash(&mut self, id: usize) -> Result<(), String> {
        let path = self
            .node_path(id)
            .ok_or("élément introuvable ou déjà supprimé")?;
        trash::delete(&path).map_err(|e| e.to_string())?;
        self.mark_trashed(id);
        Ok(())
    }
}

fn now_secs() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0)
}

/// Lowercased extension without the dot, or "" for none. Returns "" (not `None`)
/// so it can directly key a `HashMap`. A leading dot (".gitignore") and a
/// trailing dot ("archive.") both count as "no extension".
fn ext_key(name: &str) -> String {
    match name.rfind('.') {
        Some(dot) if dot > 0 && dot + 1 < name.len() => name[dot + 1..].to_lowercase(),
        _ => String::new(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn node(name: &str, size: u64, is_dir: bool, parent: Option<usize>) -> Node {
        Node {
            name: name.to_string(),
            path: PathBuf::from(name),
            size,
            is_dir,
            mtime: None,
            parent,
            children: Vec::new(),
            removed: false,
        }
    }

    // root(0) ┬ a(1, dir, 30) ┬ f1(2, file, 10)
    //         │               └ f2(3, file, 20)
    //         └ b(4, file, 70)         total = 100
    fn sample() -> ScanResult {
        let mut nodes = vec![
            node("root", 100, true, None),
            node("a", 30, true, Some(0)),
            node("f1", 10, false, Some(1)),
            node("f2", 20, false, Some(1)),
            node("b", 70, false, Some(0)),
        ];
        nodes[0].children = vec![1, 4];
        nodes[1].children = vec![2, 3];
        ScanResult {
            root: 0,
            root_path: PathBuf::from("root"),
            nodes,
            total_size: 100,
            file_count: 3,
            dir_count: 2,
            errors: 0,
            inaccessible: Vec::new(),
            scanned_at: 0,
        }
    }

    // root(0) ─ a(1) ─ b(2) ─ c(3) ─ f(4, file, 50)
    // A single deep chain; every directory aggregates the same 50 bytes.
    fn deep_sample() -> ScanResult {
        let mut nodes = vec![
            node("root", 50, true, None),
            node("a", 50, true, Some(0)),
            node("b", 50, true, Some(1)),
            node("c", 50, true, Some(2)),
            node("f", 50, false, Some(3)),
        ];
        nodes[0].children = vec![1];
        nodes[1].children = vec![2];
        nodes[2].children = vec![3];
        nodes[3].children = vec![4];
        ScanResult {
            root: 0,
            root_path: PathBuf::from("root"),
            nodes,
            total_size: 50,
            file_count: 1,
            dir_count: 4,
            errors: 0,
            inaccessible: Vec::new(),
            scanned_at: 0,
        }
    }

    #[test]
    fn children_sorted_by_size_desc_with_percent() {
        let r = sample();
        let kids = r.children(Some(0), SortKey::Size, true, 100, 0);
        assert_eq!(kids.len(), 2);
        assert_eq!(kids[0].name, "b"); // 70 > 30
        assert_eq!(kids[1].name, "a");
        // percent is relative to the parent (root = 100).
        assert!((kids[0].percent - 70.0).abs() < 0.01);
    }

    #[test]
    fn largest_files_only_ranks_globally() {
        let r = sample();
        let files = r.largest(ItemKind::Files, 10);
        assert_eq!(
            files.iter().map(|e| e.name.as_str()).collect::<Vec<_>>(),
            vec!["b", "f2", "f1"]
        );
        assert!(files.iter().all(|e| !e.is_dir));
    }

    #[test]
    fn largest_dirs_only_excludes_root() {
        let r = sample();
        let dirs = r.largest(ItemKind::Dirs, 10);
        // Only "a" — the root is never listed.
        assert_eq!(dirs.len(), 1);
        assert_eq!(dirs[0].name, "a");
    }

    #[test]
    fn largest_respects_limit_via_bounded_selection() {
        // limit < node count exercises the select_nth_unstable partition path,
        // not just the full-sort fallback the other tests hit with limit=10.
        // Non-root entries are {a:30, f1:10, f2:20, b:70}; the two largest are b, a.
        let r = sample();
        let top2 = r.largest(ItemKind::All, 2);
        assert_eq!(
            top2.iter().map(|e| e.name.as_str()).collect::<Vec<_>>(),
            vec!["b", "a"]
        );
    }

    #[test]
    fn largest_zero_limit_is_empty() {
        // limit == 0 must short-circuit (select_nth_unstable would panic on it).
        let r = sample();
        assert!(r.largest(ItemKind::All, 0).is_empty());
    }

    #[test]
    fn child_count_ignores_removed() {
        let mut r = sample();
        r.nodes[2].removed = true; // tombstone f1
        r.nodes[1].children.retain(|&c| c != 2);
        let kids = r.children(Some(0), SortKey::Size, true, 100, 0);
        let a = kids.iter().find(|e| e.name == "a").unwrap();
        assert_eq!(a.child_count, 1); // only f2 remains
    }

    #[test]
    fn mark_trashed_patches_sizes_and_tombstones() {
        // Removing f2 (size 20 under dir a) must subtract 20 from a and root,
        // detach it from a's children, and tombstone it — exactly what the old
        // `trash` did, minus the disk I/O.
        let mut r = sample();
        assert_eq!(r.node_path(3).unwrap(), PathBuf::from("f2"));

        r.mark_trashed(3);

        assert!(r.nodes[3].removed);
        assert_eq!(r.nodes[1].size, 10, "dir a: 30 - 20");
        assert_eq!(r.nodes[0].size, 80, "root: 100 - 20");
        assert_eq!(r.total_size, 80);
        assert!(!r.nodes[1].children.contains(&3), "f2 detached from a");
        // Second call is a no-op (already tombstoned) — no double subtraction.
        assert!(r.node_path(3).is_none());
        r.mark_trashed(3);
        assert_eq!(r.total_size, 80);
    }

    #[test]
    fn mark_trashed_subtracts_from_every_ancestor() {
        // A 4-deep chain exercises the `while let Some(p)` ancestor walk past the
        // 2-level depth of `sample()`: removing the leaf must zero every dir.
        let mut r = deep_sample();
        r.mark_trashed(4);
        assert!(r.nodes[4].removed);
        for i in 0..4 {
            assert_eq!(r.nodes[i].size, 0, "ancestor {i} fully subtracted");
        }
        assert_eq!(r.total_size, 0);
        assert!(
            !r.nodes[3].children.contains(&4),
            "leaf detached from its dir"
        );
    }

    #[test]
    fn mark_trashed_on_root_does_not_underflow() {
        // The root has no parent, so the ancestor loop is empty and the total is
        // recomputed from the root's own size. Must not panic or wrap.
        let mut r = sample();
        r.mark_trashed(0);
        assert!(r.nodes[0].removed);
        assert_eq!(r.total_size, r.nodes[0].size);
    }

    #[test]
    fn node_path_out_of_range_is_none() {
        let r = sample();
        assert!(r.node_path(999).is_none());
    }

    #[test]
    fn extension_breakdown_groups_by_ext_and_ranks_by_size() {
        let mut nodes = vec![
            node("root", 175, true, None),
            node("a.mp4", 100, false, Some(0)),
            node("b.MP4", 50, false, Some(0)), // case-insensitive → same bucket
            node("c.txt", 20, false, Some(0)),
            node("README", 5, false, Some(0)), // no extension
            node("sub", 0, true, Some(0)),     // directory → excluded
        ];
        nodes[0].children = vec![1, 2, 3, 4, 5];
        let r = ScanResult {
            root: 0,
            root_path: PathBuf::from("root"),
            nodes,
            total_size: 175,
            file_count: 4,
            dir_count: 2,
            errors: 0,
            inaccessible: Vec::new(),
            scanned_at: 0,
        };
        let b = r.extension_breakdown(10);
        assert_eq!(b.len(), 3, "mp4, txt, and the empty-ext bucket");
        assert_eq!(b[0].ext, "mp4");
        assert_eq!(b[0].count, 2);
        assert_eq!(b[0].size, 150); // 100 + 50, ranked first
        assert_eq!(b[1].ext, "txt");
        assert_eq!(b[2].ext, ""); // README, no extension
    }

    #[test]
    fn extension_breakdown_respects_limit() {
        let mut nodes = vec![
            node("root", 60, true, None),
            node("a.a", 30, false, Some(0)),
            node("b.b", 20, false, Some(0)),
            node("c.c", 10, false, Some(0)),
        ];
        nodes[0].children = vec![1, 2, 3];
        let r = ScanResult {
            root: 0,
            root_path: PathBuf::from("root"),
            nodes,
            total_size: 60,
            file_count: 3,
            dir_count: 1,
            errors: 0,
            inaccessible: Vec::new(),
            scanned_at: 0,
        };
        let b = r.extension_breakdown(2);
        assert_eq!(b.len(), 2);
        assert_eq!(b[0].ext, "a"); // 30
        assert_eq!(b[1].ext, "b"); // 20 — "c" (10) dropped by the limit
    }
}
