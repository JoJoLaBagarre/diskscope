//! Filesystem watcher that flags the search index / scan as stale.
//!
//! A full incremental index update (surgically adding/removing nodes and
//! re-aggregating sizes) is error-prone; instead we watch the scanned root and,
//! on the first change of each scan generation, emit a single `search://stale`
//! event so the UI can offer a re-scan. The `stale` flag resets when a new scan
//! starts. This keeps correctness simple while still telling the user when
//! results have drifted from disk.

use std::path::Path;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

use notify::{RecommendedWatcher, RecursiveMode, Watcher};
use tauri::{AppHandle, Emitter};

/// Start watching `root` recursively. Returns the watcher, which the caller
/// must keep alive (dropping it stops watching). Best-effort: returns `None` if
/// a watch can't be established.
pub fn watch(app: AppHandle, root: &Path, stale: Arc<AtomicBool>) -> Option<RecommendedWatcher> {
    let mut watcher = notify::recommended_watcher(move |res: notify::Result<notify::Event>| {
        if res.is_ok() {
            // Emit the stale signal only once per scan generation.
            if !stale.swap(true, Ordering::SeqCst) {
                let _ = app.emit("search://stale", ());
            }
        }
    })
    .ok()?;

    watcher.watch(root, RecursiveMode::Recursive).ok()?;
    Some(watcher)
}
