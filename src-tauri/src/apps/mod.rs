//! Installed-application enumeration and uninstallation.
//!
//! The frontend talks to one OS-agnostic surface: [`list`] and [`uninstall`].
//! Each platform provides an [`AppManager`] behind `cfg`; unsupported platforms
//! get a graceful fallback that returns an empty list and a clear error rather
//! than panicking.
//!
//! Safety model: uninstallation is destructive, so [`InstalledApp`] carries a
//! human-readable [`UninstallAction::preview`] of the *exact* command that will
//! run. The UI shows it in a confirmation dialog before anything executes, and
//! execution happens on a background thread with stdout/stderr captured.

#[cfg(target_os = "linux")]
mod linux;
#[cfg(target_os = "macos")]
mod macos;
#[cfg(target_os = "windows")]
mod windows;

use serde::{Deserialize, Serialize};

/// A single installed application, normalized across platforms.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstalledApp {
    /// Stable identifier (registry key, bundle id, package name…).
    pub id: String,
    pub name: String,
    pub version: Option<String>,
    pub publisher: Option<String>,
    pub install_location: Option<String>,
    /// Estimated on-disk size in bytes, when the platform reports it.
    pub size_estimate: Option<u64>,
    /// Path or URI to an icon, when available (e.g. Windows `DisplayIcon`).
    pub icon: Option<String>,
    /// Where this entry came from: "registry", "appx", "homebrew", "apt"…
    pub source: String,
    /// What uninstalling will do — including a preview of the exact command.
    pub uninstall: UninstallAction,
}

/// The concrete action used to remove an app. `kind` drives execution; `preview`
/// is the exact command shown to the user for confirmation.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UninstallAction {
    pub kind: UninstallKind,
    /// Program to execute.
    pub program: String,
    /// Arguments passed to `program`.
    pub args: Vec<String>,
    /// Whether the action typically needs elevation (admin/root).
    pub needs_elevation: bool,
    /// Human-readable, copy-pasteable command preview.
    pub preview: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum UninstallKind {
    /// Run a command line and wait for it (the OS uninstaller UI may appear).
    Command,
    /// Windows: launch via ShellExecute with the "runas" verb (UAC elevation).
    ShellExecuteRunas,
    /// Windows MSIX/Store: `Remove-AppxPackage` via PowerShell.
    Appx,
    /// macOS: move the .app bundle to the Trash.
    TrashBundle,
}

/// Result of an uninstall attempt, surfaced to the UI as a toast.
#[derive(Debug, Clone, Serialize)]
pub struct UninstallOutcome {
    pub success: bool,
    pub code: Option<i32>,
    pub stdout: String,
    pub stderr: String,
    pub message: String,
}

/// Per-platform capability. Implemented behind `cfg`; selected by [`manager`].
pub trait AppManager: Send + Sync {
    fn list(&self) -> Result<Vec<InstalledApp>, String>;
    fn uninstall(&self, app: &InstalledApp) -> UninstallOutcome;

    /// Resolve a single app by its stable `id` from the authoritative OS source
    /// (registry, package manager, …). The default re-lists and filters; a
    /// platform may override this with a cheaper, targeted lookup.
    ///
    /// Security: this is the heart of the safe-uninstall model. The IPC layer
    /// only ever passes an opaque `id`; the *command that actually runs* is
    /// re-derived here from the OS, never taken from a frontend-supplied
    /// payload. A compromised WebView therefore cannot turn uninstall into
    /// arbitrary (and possibly elevated) process execution.
    fn find(&self, id: &str) -> Option<InstalledApp> {
        self.list().ok()?.into_iter().find(|a| a.id == id)
    }
}

/// A no-op manager for platforms without a concrete implementation. Keeps the
/// command surface working everywhere without `unimplemented!`. Only compiled on
/// platforms outside {windows, linux, macos}, where it's actually used.
#[cfg(not(any(target_os = "windows", target_os = "linux", target_os = "macos")))]
struct UnsupportedManager;
#[cfg(not(any(target_os = "windows", target_os = "linux", target_os = "macos")))]
impl AppManager for UnsupportedManager {
    fn list(&self) -> Result<Vec<InstalledApp>, String> {
        Err("La gestion des applications n'est pas prise en charge sur ce système.".into())
    }
    fn uninstall(&self, _app: &InstalledApp) -> UninstallOutcome {
        UninstallOutcome {
            success: false,
            code: None,
            stdout: String::new(),
            stderr: String::new(),
            message: "Désinstallation non prise en charge sur ce système.".into(),
        }
    }
}

/// Return the manager for the current OS.
pub fn manager() -> Box<dyn AppManager> {
    #[cfg(target_os = "windows")]
    {
        Box::new(windows::WindowsAppManager)
    }
    #[cfg(target_os = "linux")]
    {
        Box::new(linux::LinuxAppManager)
    }
    #[cfg(target_os = "macos")]
    {
        Box::new(macos::MacAppManager)
    }
    #[cfg(not(any(target_os = "windows", target_os = "linux", target_os = "macos")))]
    {
        Box::new(UnsupportedManager)
    }
}

/// List installed applications, sorted by descending size then name.
pub fn list() -> Result<Vec<InstalledApp>, String> {
    let mut apps = manager().list()?;
    apps.sort_by(|a, b| {
        b.size_estimate
            .unwrap_or(0)
            .cmp(&a.size_estimate.unwrap_or(0))
            .then_with(|| a.name.to_lowercase().cmp(&b.name.to_lowercase()))
    });
    Ok(apps)
}

/// Resolve `id` against the authoritative OS source and execute the uninstall
/// action *derived there*. The frontend never supplies the command line — only
/// this opaque `id` — so the IPC boundary cannot be abused to run an arbitrary
/// program. Returns a clear failure if no matching app exists.
pub fn uninstall_by_id(id: &str) -> UninstallOutcome {
    let mgr = manager();
    match mgr.find(id) {
        Some(app) => mgr.uninstall(&app),
        None => UninstallOutcome {
            success: false,
            code: None,
            stdout: String::new(),
            stderr: String::new(),
            message: "Application introuvable (peut-être déjà désinstallée). \
                      Actualisez la liste, puis réessayez."
                .into(),
        },
    }
}

/// Shared helper: build a readable command preview from program + args.
// Only consumed by the Windows uninstaller today; the Linux/macOS managers (M5)
// will use it too. Until then it's unused on those targets, so allow dead_code
// there to keep `clippy -D warnings` green — without masking real dead code on
// Windows, where it is used.
#[cfg_attr(not(target_os = "windows"), allow(dead_code))]
pub(crate) fn preview_command(program: &str, args: &[String]) -> String {
    let mut parts = Vec::with_capacity(args.len() + 1);
    parts.push(quote_if_needed(program));
    for a in args {
        parts.push(quote_if_needed(a));
    }
    parts.join(" ")
}

#[cfg_attr(not(target_os = "windows"), allow(dead_code))]
fn quote_if_needed(s: &str) -> String {
    if s.contains(' ') || s.contains('"') {
        format!("\"{}\"", s.replace('"', "\\\""))
    } else {
        s.to_string()
    }
}
