//! macOS implementation (portage milestone M5).
//!
//! Plan: enumerate `.app` bundles in `/Applications` and `~/Applications`
//! (reading `Info.plist` for name/version, summing bundle size), plus Homebrew
//! casks via `brew list --cask`. Uninstall = move the bundle to the Trash
//! (`trash` crate) or `brew uninstall --cask <name>`. "Native" scope: no deep
//! `~/Library` residue cleanup.
//!
//! Until M5 this returns a clear, non-panicking message so the shared command
//! surface behaves everywhere.

use super::{AppManager, InstalledApp, UninstallOutcome};

pub struct MacAppManager;

impl AppManager for MacAppManager {
    fn list(&self) -> Result<Vec<InstalledApp>, String> {
        Err("La gestion des applications macOS sera disponible au jalon de portage (M5).".into())
    }

    fn uninstall(&self, _app: &InstalledApp) -> UninstallOutcome {
        UninstallOutcome {
            success: false,
            code: None,
            stdout: String::new(),
            stderr: String::new(),
            message: "Désinstallation macOS non encore implémentée (M5).".into(),
        }
    }
}
