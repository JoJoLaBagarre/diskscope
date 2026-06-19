//! DiskScope library entry point.
//!
//! `main.rs` (the binary) simply calls [`run`]. All application wiring —
//! shared state, plugins and the IPC command surface — lives here so the same
//! setup can be reused by the mobile entry point and by integration tests.

mod apps;
mod commands;
mod platform;
mod scan;
mod search;
mod state;

use state::AppState;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Structured logging, silent unless RUST_LOG is set (e.g.
    // `RUST_LOG=diskscope=debug`). `try_init` so a second call (mobile
    // re-entry / tests) can't panic.
    let _ = tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .try_init();

    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        // Remember window size/position across launches.
        .plugin(tauri_plugin_window_state::Builder::default().build());

    // Auto-updater + relaunch — desktop only.
    #[cfg(desktop)]
    {
        builder = builder
            .plugin(tauri_plugin_updater::Builder::new().build())
            .plugin(tauri_plugin_process::init());
    }

    let app = builder
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            commands::app_info,
            commands::list_volumes,
            commands::start_scan,
            commands::cancel_scan,
            commands::scan_summary,
            commands::try_load_cache,
            commands::get_children,
            commands::get_largest,
            commands::extension_breakdown,
            commands::export_scan,
            commands::reveal_path,
            commands::trash_path,
            commands::start_trash,
            commands::cancel_trash,
            commands::recycle_bin_info,
            commands::recycle_bin_supported,
            commands::empty_recycle_bin,
            commands::search,
            commands::search_stats,
            commands::list_apps,
            commands::uninstall_app,
        ])
        .build(tauri::generate_context!())
        .expect("error while running tauri application");

    app.run(|app_handle, event| {
        // Tear the filesystem watcher down deterministically when the app exits,
        // releasing its OS handle (ReadDirectoryChangesW on Windows) and the
        // AppHandle clone it holds, instead of leaving it to linger until the
        // process is reaped.
        if let tauri::RunEvent::Exit = event {
            if let Some(state) = app_handle.try_state::<AppState>() {
                *state.watcher.lock() = None;
            }
        }
    });
}
