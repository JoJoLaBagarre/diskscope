//! IPC command surface exposed to the frontend through `invoke()`.
//!
//! This is a single, OS-agnostic surface the React layer calls; platform
//! specifics stay behind `cfg` inside the feature modules.

use std::path::PathBuf;
use std::sync::atomic::Ordering;

use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager, State};

use crate::apps::{self, InstalledApp, UninstallOutcome};
use crate::scan::{self, ItemKind, ScanEntry, ScanSummary, SortKey, VolumeInfo};
use crate::search::{self, SearchFilters, SearchHit, SearchIndex};
use crate::state::AppState;

/// Runtime/environment information. The frontend calls this on startup to
/// confirm the Rust IPC bridge is live and to populate the About view.
#[derive(Debug, Serialize)]
pub struct AppInfo {
    pub name: String,
    pub version: String,
    pub os: String,
    pub arch: String,
}

#[tauri::command]
pub fn app_info() -> AppInfo {
    AppInfo {
        name: "DiskScope".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        os: std::env::consts::OS.to_string(),
        arch: std::env::consts::ARCH.to_string(),
    }
}

#[derive(Clone, Serialize)]
struct ProgressPayload {
    files: u64,
    dirs: u64,
    bytes: u64,
    current: String,
}

#[tauri::command]
pub fn list_volumes() -> Vec<VolumeInfo> {
    scan::volumes()
}

/// Kick off a scan on a background thread. Progress and completion are streamed
/// to the frontend as `scan://progress`, `scan://done`, `scan://cancelled` and
/// `scan://error` events; this call returns immediately.
#[tauri::command]
pub fn start_scan(app: AppHandle, root: String) -> Result<(), String> {
    let path = PathBuf::from(&root);
    if !path.exists() {
        return Err(format!("Le chemin n'existe pas : {root}"));
    }

    {
        let state = app.state::<AppState>();
        // Refuse to start a second scan while one is already running; they would
        // race on the shared scan state. The UI also prevents this, but guard
        // defensively in case a command is invoked directly.
        if state
            .scanning
            .compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst)
            .is_err()
        {
            return Err("Une analyse est déjà en cours.".into());
        }
        state.cancel.store(false, Ordering::SeqCst);
    }

    let handle = app.clone();
    std::thread::spawn(move || {
        let state = handle.state::<AppState>();
        let cancel = state.cancel.clone();
        let emit_handle = handle.clone();

        let result = scan::scan(&path, &cancel, move |p| {
            let _ = emit_handle.emit(
                "scan://progress",
                ProgressPayload {
                    files: p.files,
                    dirs: p.dirs,
                    bytes: p.bytes,
                    current: p.current.clone(),
                },
            );
        });

        match result {
            Ok(res) => {
                let _ = scan::cache::save(&path, &res);
                let summary = res.summary(false);
                *state.scan.write().unwrap() = Some(res);
                // Invalidate the derived search index; rebuilt lazily on demand.
                *state.search.write().unwrap() = None;
                // (Re)arm the staleness watcher for this scan generation.
                state.stale.store(false, Ordering::SeqCst);
                let w = search::watcher::watch(handle.clone(), &path, state.stale.clone());
                *state.watcher.lock().unwrap() = w;
                let _ = handle.emit("scan://done", summary);
            }
            Err(scan::ScanError::Cancelled) => {
                let _ = handle.emit("scan://cancelled", ());
            }
            Err(e) => {
                let _ = handle.emit("scan://error", e.to_string());
            }
        }

        // Always release the guard, whatever the outcome.
        state.scanning.store(false, Ordering::SeqCst);
    });

    Ok(())
}

#[tauri::command]
pub fn cancel_scan(state: State<AppState>) {
    state.cancel.store(true, Ordering::SeqCst);
}

#[tauri::command]
pub fn scan_summary(state: State<AppState>) -> Option<ScanSummary> {
    state
        .scan
        .read()
        .unwrap()
        .as_ref()
        .map(|r| r.summary(false))
}

/// Restore a cached scan for `root` into state, returning its summary if found.
#[tauri::command]
pub fn try_load_cache(state: State<AppState>, root: String) -> Option<ScanSummary> {
    let res = scan::cache::load(&PathBuf::from(&root))?;
    let summary = res.summary(true);
    *state.scan.write().unwrap() = Some(res);
    Some(summary)
}

#[tauri::command]
pub fn get_children(
    state: State<AppState>,
    parent: Option<usize>,
    sort: SortKey,
    desc: bool,
    limit: usize,
    offset: usize,
) -> Result<Vec<ScanEntry>, String> {
    let guard = state.scan.read().unwrap();
    let res = guard.as_ref().ok_or("Aucun scan en mémoire")?;
    Ok(res.children(parent, sort, desc, limit, offset))
}

#[tauri::command]
pub fn get_largest(
    state: State<AppState>,
    kind: ItemKind,
    limit: usize,
) -> Result<Vec<ScanEntry>, String> {
    let guard = state.scan.read().unwrap();
    let res = guard.as_ref().ok_or("Aucun scan en mémoire")?;
    Ok(res.largest(kind, limit))
}

#[tauri::command]
pub fn reveal_path(app: AppHandle, path: String) -> Result<(), String> {
    use tauri_plugin_opener::OpenerExt;
    app.opener()
        .reveal_item_in_dir(&path)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn trash_path(state: State<AppState>, id: usize) -> Result<(), String> {
    let mut guard = state.scan.write().unwrap();
    let res = guard.as_mut().ok_or("Aucun scan en mémoire")?;
    res.trash(id)?;
    // The index references node ids that still exist (entry is tombstoned), but
    // its cached copy would still list the trashed item — drop it so the next
    // search rebuilds from the patched tree.
    drop(guard);
    *state.search.write().unwrap() = None;
    Ok(())
}

#[derive(Clone, Serialize)]
struct TrashProgressPayload {
    done: usize,
    total: usize,
    failed: usize,
    current: String,
}

#[derive(Clone, Serialize)]
struct TrashDonePayload {
    removed: Vec<usize>,
    failed: usize,
    total: usize,
    cancelled: bool,
}

/// Delete several entries on a background thread, streaming progress.
///
/// The key fix over the old synchronous version: each `trash::delete` syscall
/// runs with **no lock held**, and we take the `scan` write lock only for the
/// fast in-memory `mark_trashed` patch. This keeps the UI responsive on large
/// batches. Progress is emitted as `trash://progress`; completion as
/// `trash://done`. Returns immediately.
#[tauri::command]
pub fn start_trash(app: AppHandle, ids: Vec<usize>) -> Result<(), String> {
    {
        let state = app.state::<AppState>();
        if state.scan.read().unwrap().is_none() {
            return Err("Aucun scan en mémoire".into());
        }
        if state
            .trashing
            .compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst)
            .is_err()
        {
            return Err("Une suppression est déjà en cours.".into());
        }
        state.trash_cancel.store(false, Ordering::SeqCst);
    }

    let handle = app.clone();
    std::thread::spawn(move || {
        let state = handle.state::<AppState>();
        let total = ids.len();
        let mut removed: Vec<usize> = Vec::new();
        let mut failed = 0usize;
        let mut cancelled = false;

        for (i, id) in ids.into_iter().enumerate() {
            if state.trash_cancel.load(Ordering::SeqCst) {
                cancelled = true;
                break;
            }

            // 1) Look up the path under a brief read lock, then release it.
            let path = {
                let guard = state.scan.read().unwrap();
                guard.as_ref().and_then(|r| r.node_path(id))
            };
            let Some(path) = path else {
                failed += 1;
                continue;
            };

            let _ = handle.emit(
                "trash://progress",
                TrashProgressPayload {
                    done: i,
                    total,
                    failed,
                    current: path.to_string_lossy().to_string(),
                },
            );

            // 2) Delete on disk with NO lock held (the slow part).
            match trash::delete(&path) {
                Ok(()) => {
                    // 3) Patch the tree under a short write lock.
                    let mut guard = state.scan.write().unwrap();
                    if let Some(r) = guard.as_mut() {
                        r.mark_trashed(id);
                    }
                    removed.push(id);
                }
                Err(_) => failed += 1,
            }
        }

        // The cached search index now lists trashed items — rebuild lazily.
        *state.search.write().unwrap() = None;
        state.trashing.store(false, Ordering::SeqCst);

        let _ = handle.emit(
            "trash://done",
            TrashDonePayload {
                removed,
                failed,
                total,
                cancelled,
            },
        );
    });

    Ok(())
}

/// Request cancellation of an in-progress batch delete. Items already deleted
/// stay deleted.
#[tauri::command]
pub fn cancel_trash(state: State<AppState>) {
    state.trash_cancel.store(true, Ordering::SeqCst);
}

/// `(item_count, total_bytes)` currently in the OS recycle bin.
#[tauri::command]
pub fn recycle_bin_info() -> (u64, u64) {
    crate::platform::recycle_bin_info()
}

/// Whether emptying the recycle bin is supported on this platform.
#[tauri::command]
pub fn recycle_bin_supported() -> bool {
    crate::platform::recycle_bin_supported()
}

/// Empty the entire OS recycle bin. The frontend must show its own confirmation
/// (this empties everything, not just DiskScope's deletions).
#[tauri::command]
pub async fn empty_recycle_bin() -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(crate::platform::empty_recycle_bin)
        .await
        .map_err(|e| e.to_string())?
}

/// Index statistics for the search view header. `None` when no scan is loaded.
#[derive(Debug, serde::Serialize)]
pub struct SearchStats {
    pub indexed: usize,
    pub stale: bool,
}

#[tauri::command]
pub fn search_stats(state: State<AppState>) -> Option<SearchStats> {
    ensure_index(&state)?;
    let guard = state.search.read().unwrap();
    guard.as_ref().map(|idx| SearchStats {
        indexed: idx.len(),
        stale: state.stale.load(Ordering::SeqCst),
    })
}

/// Fuzzy search over the current scan.
#[allow(clippy::too_many_arguments)]
#[tauri::command]
pub fn search(
    state: State<AppState>,
    query: String,
    kind: Option<ItemKind>,
    ext: Option<String>,
    min_size: Option<u64>,
    max_size: Option<u64>,
    modified_after: Option<u64>,
    modified_before: Option<u64>,
    limit: usize,
) -> Result<Vec<SearchHit>, String> {
    ensure_index(&state).ok_or("Aucun scan en mémoire")?;

    let filters = SearchFilters {
        kind,
        ext: ext
            .filter(|s| !s.is_empty())
            .map(|s| s.trim_start_matches('.').to_lowercase()),
        min_size,
        max_size,
        modified_after,
        modified_before,
    };

    let guard = state.search.read().unwrap();
    let idx = guard.as_ref().ok_or("Index indisponible")?;
    Ok(idx.query(&query, &filters, limit))
}

/// Ensure the search index exists, building it from the current scan if needed.
/// Returns `Some(())` when an index is available afterwards.
fn ensure_index(state: &State<AppState>) -> Option<()> {
    if state.search.read().unwrap().is_some() {
        return Some(());
    }
    let scan_guard = state.scan.read().unwrap();
    let res = scan_guard.as_ref()?;
    let idx = SearchIndex::build(res);
    drop(scan_guard);
    *state.search.write().unwrap() = Some(idx);
    Some(())
}

/* ===== installed applications ===== */

/// Enumerate installed applications (runs on a worker thread; the registry walk
/// and PowerShell call can take a moment).
#[tauri::command]
pub async fn list_apps() -> Result<Vec<InstalledApp>, String> {
    tauri::async_runtime::spawn_blocking(apps::list)
        .await
        .map_err(|e| e.to_string())?
}

/// Uninstall an application via its native uninstaller, identified *only* by its
/// opaque `id`. The actual command is re-derived from the OS inside
/// [`apps::uninstall_by_id`] — never taken from the caller — so a compromised
/// frontend cannot use this to execute an arbitrary (possibly elevated) program.
/// The UI still shows a preview + confirmation, but that is a UX affordance, not
/// the security boundary.
#[tauri::command]
pub async fn uninstall_app(id: String) -> Result<UninstallOutcome, String> {
    tauri::async_runtime::spawn_blocking(move || apps::uninstall_by_id(&id))
        .await
        .map_err(|e| e.to_string())
}
