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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
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

    builder
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
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
