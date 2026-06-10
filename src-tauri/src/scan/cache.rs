//! On-disk scan cache (bincode) keyed by root path, for instant reload.

use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};
use std::path::{Path, PathBuf};

use super::ScanResult;

fn cache_dir() -> Option<PathBuf> {
    directories::ProjectDirs::from("com", "DiskScope", "DiskScope")
        .map(|d| d.cache_dir().to_path_buf())
}

fn key_for(root: &Path) -> String {
    let mut h = DefaultHasher::new();
    root.to_string_lossy().to_lowercase().hash(&mut h);
    format!("scan-{:x}.bin", h.finish())
}

/// Persist a scan result. Best-effort: a failure to cache never breaks a scan.
pub fn save(root: &Path, result: &ScanResult) -> std::io::Result<()> {
    let Some(dir) = cache_dir() else {
        return Ok(());
    };
    std::fs::create_dir_all(&dir)?;
    let bytes = bincode::serialize(result).map_err(std::io::Error::other)?;
    std::fs::write(dir.join(key_for(root)), bytes)
}

/// Load a previously cached scan for `root`, if present and readable.
pub fn load(root: &Path) -> Option<ScanResult> {
    let dir = cache_dir()?;
    let bytes = std::fs::read(dir.join(key_for(root))).ok()?;
    bincode::deserialize(&bytes).ok()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::scan::Node;

    fn tiny_result() -> ScanResult {
        // root(0) ─ f(1, file, 40)
        let root = Node {
            name: "root".into(),
            path: PathBuf::from("root"),
            size: 40,
            is_dir: true,
            mtime: None,
            parent: None,
            children: vec![1],
            removed: false,
        };
        let file = Node {
            name: "f".into(),
            path: PathBuf::from("root/f"),
            size: 40,
            is_dir: false,
            mtime: Some(123),
            parent: Some(0),
            children: vec![],
            removed: false,
        };
        ScanResult {
            root: 0,
            root_path: PathBuf::from("root"),
            nodes: vec![root, file],
            total_size: 40,
            file_count: 1,
            dir_count: 1,
            errors: 0,
            inaccessible: Vec::new(),
            scanned_at: 42,
        }
    }

    #[test]
    fn round_trips_through_bincode() {
        // The on-disk cache is exactly this serialize/deserialize pair; exercise
        // the core without touching the real cache directory.
        let r = tiny_result();
        let bytes = bincode::serialize(&r).expect("serialize");
        let back: ScanResult = bincode::deserialize(&bytes).expect("deserialize");
        assert_eq!(back.total_size, r.total_size);
        assert_eq!(back.file_count, r.file_count);
        assert_eq!(back.dir_count, r.dir_count);
        assert_eq!(back.root_path, r.root_path);
        assert_eq!(back.nodes.len(), r.nodes.len());
        assert_eq!(back.nodes[1].name, "f");
        assert_eq!(back.nodes[1].mtime, Some(123));
    }

    #[test]
    fn corrupted_bytes_return_err_not_panic() {
        // `load()` discards a corrupt cache via `.ok()?` instead of crashing —
        // that contract relies on deserialize returning Err on garbage.
        let garbage = [0xFFu8, 0x00, 0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC];
        assert!(bincode::deserialize::<ScanResult>(&garbage).is_err());
    }

    #[test]
    fn truncated_buffer_returns_err_not_panic() {
        let bytes = bincode::serialize(&tiny_result()).expect("serialize");
        let half = &bytes[..bytes.len() / 2];
        assert!(bincode::deserialize::<ScanResult>(half).is_err());
    }
}
