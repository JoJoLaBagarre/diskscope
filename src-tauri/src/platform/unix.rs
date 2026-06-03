//! Unix-specific filesystem helpers.

use std::fs::Metadata;
use std::os::unix::fs::MetadataExt;

/// Actual bytes used on disk, from the inode's 512-byte block count. This
/// correctly reflects sparse files (a hole costs no blocks).
pub fn allocated_size(metadata: &Metadata) -> u64 {
    metadata.blocks().saturating_mul(512)
}
