//! Windows-specific filesystem helpers.

use std::os::windows::ffi::OsStrExt;
use std::path::Path;

use windows::core::PCWSTR;
use windows::Win32::Storage::FileSystem::GetCompressedFileSizeW;
use windows::Win32::UI::Shell::{
    SHEmptyRecycleBinW, SHQueryRecycleBinW, SHERB_NOCONFIRMATION, SHERB_NOPROGRESSUI,
    SHERB_NOSOUND, SHQUERYRBINFO,
};

// GetCompressedFileSizeW returns this in the low dword to signal an error.
const INVALID_FILE_SIZE: u32 = u32::MAX;

/// Actual bytes used on disk for `path` (sparse- and compression-aware) via
/// `GetCompressedFileSizeW`. Returns `None` on error so the caller can fall
/// back to the logical length.
pub fn compressed_size(path: &Path) -> Option<u64> {
    let wide: Vec<u16> = path
        .as_os_str()
        .encode_wide()
        .chain(std::iter::once(0))
        .collect();

    let mut high: u32 = 0;
    // SAFETY: `wide` is a valid NUL-terminated UTF-16 buffer that outlives the
    // call, and `high` is a valid out-pointer.
    let low = unsafe { GetCompressedFileSizeW(PCWSTR(wide.as_ptr()), Some(&mut high as *mut u32)) };

    // On failure the function returns INVALID_FILE_SIZE in the low dword and
    // leaves `high` at 0. That low value is technically also valid for a file
    // of exactly 4 GiB − 1 with a zero high dword, but treating that single
    // size as "fall back to logical length" is harmless (the two are equal),
    // and this avoids a GetLastError round-trip.
    if low == INVALID_FILE_SIZE && high == 0 {
        return None;
    }
    Some(((high as u64) << 32) | low as u64)
}

/// Number of items and total bytes currently in the recycle bin across all
/// drives. Returns `(0, 0)` if the query fails.
pub fn recycle_bin_info() -> (u64, u64) {
    let mut info = SHQUERYRBINFO {
        cbSize: std::mem::size_of::<SHQUERYRBINFO>() as u32,
        i64Size: 0,
        i64NumItems: 0,
    };
    // SAFETY: `info.cbSize` is set; passing a null root path queries all drives.
    let hr = unsafe { SHQueryRecycleBinW(PCWSTR::null(), &mut info) };
    if hr.is_ok() {
        (info.i64NumItems.max(0) as u64, info.i64Size.max(0) as u64)
    } else {
        (0, 0)
    }
}

/// Empty the recycle bin across all drives. The app shows its own confirmation,
/// so we suppress the shell's confirmation, progress UI and sound.
pub fn empty_recycle_bin() -> Result<(), String> {
    // SAFETY: null hwnd + null root path = empty every drive's bin.
    let hr = unsafe {
        SHEmptyRecycleBinW(
            None,
            PCWSTR::null(),
            SHERB_NOCONFIRMATION | SHERB_NOPROGRESSUI | SHERB_NOSOUND,
        )
    };
    // SHEmptyRecycleBinW returns a windows::core::Result.
    hr.map_err(|e| e.message())
}
