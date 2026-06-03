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
