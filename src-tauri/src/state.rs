//! Shared application state, managed by Tauri and accessed from commands.
//!
//! The full scan tree lives here (not shipped wholesale over IPC); commands
//! return small DTO slices on demand for tables, drill-down and the treemap.
//! The fuzzy search index is derived lazily from the current scan.

use std::sync::atomic::AtomicBool;
use std::sync::{Arc, Mutex, RwLock};

use crate::scan::ScanResult;
use crate::search::SearchIndex;

#[derive(Default)]
pub struct AppState {
    /// Result of the most recent completed (or cache-restored) scan.
    pub scan: RwLock<Option<ScanResult>>,
    /// Fuzzy-search index built lazily from `scan`; cleared on every new scan.
    pub search: RwLock<Option<SearchIndex>>,
    /// Set to `true` to request cancellation of an in-progress scan.
    pub cancel: Arc<AtomicBool>,
    /// Guards against two scans running at once (they would race on `scan`).
    pub scanning: Arc<AtomicBool>,
    /// Set to `true` to request cancellation of an in-progress batch delete.
    pub trash_cancel: Arc<AtomicBool>,
    /// Guards against two batch deletes running at once.
    pub trashing: Arc<AtomicBool>,
    /// Set by the filesystem watcher when changes are seen under the scan root,
    /// so the UI can offer to re-scan. Reset at the start of each scan.
    pub stale: Arc<AtomicBool>,
    /// Live filesystem watcher; kept alive by storing it here (dropping stops it).
    pub watcher: Mutex<Option<notify::RecommendedWatcher>>,
}
