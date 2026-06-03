//! Cross-platform OS abstractions.
//!
//! Currently exposes [`allocated_size`], the real on-disk footprint of a file
//! (sparse- and compression-aware). This is what users expect when judging how
//! much space deleting something will reclaim: a 512 GB sparse VM image that
//! only has 2.6 GB actually written should count as ~2.6 GB, not 512 GB.

#[cfg(unix)]
mod unix;
#[cfg(windows)]
mod windows;

use std::fs::Metadata;
use std::path::Path;

/// Bytes a file actually occupies on disk. Falls back to the logical length
/// when the platform query is unavailable or fails.
pub fn allocated_size(path: &Path, metadata: &Metadata) -> u64 {
    #[cfg(windows)]
    {
        windows::compressed_size(path).unwrap_or(metadata.len())
    }
    #[cfg(unix)]
    {
        let _ = path;
        unix::allocated_size(metadata)
    }
    #[cfg(not(any(windows, unix)))]
    {
        let _ = path;
        metadata.len()
    }
}

/// `(item_count, total_bytes)` currently in the OS recycle bin. `(0, 0)` when
/// unsupported on this platform.
pub fn recycle_bin_info() -> (u64, u64) {
    #[cfg(windows)]
    {
        windows::recycle_bin_info()
    }
    #[cfg(not(windows))]
    {
        (0, 0)
    }
}

/// Empty the OS recycle bin. Only implemented on Windows for now.
pub fn empty_recycle_bin() -> Result<(), String> {
    #[cfg(windows)]
    {
        windows::empty_recycle_bin()
    }
    #[cfg(not(windows))]
    {
        Err("La corbeille n'est gérée que sous Windows pour le moment.".into())
    }
}

/// Whether emptying the recycle bin is supported on this platform.
pub fn recycle_bin_supported() -> bool {
    cfg!(windows)
}
