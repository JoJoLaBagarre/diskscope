//! Linux implementation (portage milestone M5).
//!
//! Plan: read `.desktop` entries from the standard application directories, map
//! each to its owning package by querying whichever package managers are
//! actually present (dpkg/apt, rpm/dnf, pacman, flatpak, snap), and uninstall
//! by invoking the right manager with elevation (`pkexec`/`sudo`). Only managers
//! detected on the system are offered.
//!
//! Until M5 this returns a clear, non-panicking message so the shared command
//! surface behaves everywhere.

use super::{AppManager, InstalledApp, UninstallOutcome};

pub struct LinuxAppManager;

impl AppManager for LinuxAppManager {
    fn list(&self) -> Result<Vec<InstalledApp>, String> {
        Err("La gestion des applications Linux sera disponible au jalon de portage (M5).".into())
    }

    fn uninstall(&self, _app: &InstalledApp) -> UninstallOutcome {
        UninstallOutcome {
            success: false,
            code: None,
            stdout: String::new(),
            stderr: String::new(),
            message: "Désinstallation Linux non encore implémentée (M5).".into(),
        }
    }
}
