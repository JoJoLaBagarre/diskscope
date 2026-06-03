//! Windows implementation: enumerate installed apps from the registry
//! `Uninstall` keys (HKLM, HKLM\WOW6432Node, HKCU) plus Store/MSIX apps via
//! `Get-AppxPackage`. Uninstallation runs the registry `UninstallString`
//! (preferring the quiet variant) or `Remove-AppxPackage`.

use std::os::windows::process::CommandExt;
use std::process::Command;

use winreg::enums::*;
use winreg::RegKey;

use super::{
    preview_command, AppManager, InstalledApp, UninstallAction, UninstallKind, UninstallOutcome,
};

/// CREATE_NO_WINDOW — avoid flashing a console when we shell out.
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

pub struct WindowsAppManager;

impl AppManager for WindowsAppManager {
    fn list(&self) -> Result<Vec<InstalledApp>, String> {
        let mut apps = Vec::new();
        let mut seen = std::collections::HashSet::new();

        for (hive, path, source) in uninstall_roots() {
            let root = RegKey::predef(hive);
            let Ok(uninstall) = root.open_subkey_with_flags(path, KEY_READ) else {
                continue;
            };
            for sub_name in uninstall.enum_keys().flatten() {
                let Ok(sub) = uninstall.open_subkey_with_flags(&sub_name, KEY_READ) else {
                    continue;
                };
                if let Some(app) = parse_app(&sub, &sub_name, source) {
                    if seen.insert(app.id.clone()) {
                        apps.push(app);
                    }
                }
            }
        }

        // Store / MSIX apps (best-effort; ignored if PowerShell unavailable).
        if let Ok(mut appx) = list_appx() {
            for a in appx.drain(..) {
                if seen.insert(a.id.clone()) {
                    apps.push(a);
                }
            }
        }

        Ok(apps)
    }

    fn uninstall(&self, app: &InstalledApp) -> UninstallOutcome {
        match app.uninstall.kind {
            UninstallKind::Appx => {
                // Strip the `appx::` routing prefix so the package name matches
                // what `Get-AppxPackage` reports *and* the command shown in the
                // preview. Running `app.id` verbatim would both fail to match
                // and diverge from what the user confirmed.
                let pkg = app.id.strip_prefix("appx::").unwrap_or(&app.id);
                run_powershell(&format!(
                    "Remove-AppxPackage -Package '{}'",
                    pkg.replace('\'', "''")
                ))
            }
            UninstallKind::ShellExecuteRunas => {
                shell_execute_runas(&app.uninstall.program, &app.uninstall.args)
            }
            // Default path: run the UninstallString via cmd so quotes/switches
            // are honored exactly as the vendor registered them.
            UninstallKind::Command => run_command(&app.uninstall.program, &app.uninstall.args),
            UninstallKind::TrashBundle => UninstallOutcome {
                success: false,
                code: None,
                stdout: String::new(),
                stderr: String::new(),
                message: "Action non applicable sous Windows.".into(),
            },
        }
    }

    /// Targeted, authoritative lookup by `id` — avoids re-running the slow Appx
    /// enumeration when uninstalling a registry app, and re-reads the command
    /// straight from the OS so it can never be spoofed by the caller.
    fn find(&self, id: &str) -> Option<InstalledApp> {
        if let Some(sub_name) = id.strip_prefix("registry::") {
            // Defense in depth: although `id` originates from our own
            // enumeration, treat it as untrusted. A real Uninstall subkey name
            // is a single path segment — reject anything that could traverse to
            // an arbitrary (user-writable) registry key whose UninstallString we
            // would otherwise execute.
            if sub_name.is_empty()
                || sub_name.contains('\\')
                || sub_name.contains('/')
                || sub_name.contains("..")
            {
                return None;
            }
            for (hive, path, source) in uninstall_roots() {
                let root = RegKey::predef(hive);
                let Ok(uninstall) = root.open_subkey_with_flags(path, KEY_READ) else {
                    continue;
                };
                let Ok(sub) = uninstall.open_subkey_with_flags(sub_name, KEY_READ) else {
                    continue;
                };
                if let Some(app) = parse_app(&sub, sub_name, source) {
                    return Some(app);
                }
            }
            None
        } else if id.starts_with("appx::") {
            // Must equal an actually-installed package's id; a crafted value
            // simply won't match and resolves to `None`.
            list_appx().ok()?.into_iter().find(|a| a.id == id)
        } else {
            None
        }
    }
}

fn uninstall_roots() -> Vec<(isize, &'static str, &'static str)> {
    vec![
        (
            HKEY_LOCAL_MACHINE,
            r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall",
            "registry",
        ),
        (
            HKEY_LOCAL_MACHINE,
            r"SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall",
            "registry",
        ),
        (
            HKEY_CURRENT_USER,
            r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall",
            "registry",
        ),
    ]
}

fn parse_app(key: &RegKey, sub_name: &str, source: &str) -> Option<InstalledApp> {
    let name: String = key.get_value("DisplayName").ok()?;
    let name = name.trim().to_string();
    if name.is_empty() {
        return None;
    }

    // Skip system components, updates, and entries with no uninstaller.
    if get_dword(key, "SystemComponent") == Some(1) {
        return None;
    }
    if key.get_value::<String, _>("ParentKeyName").is_ok() {
        return None; // hotfix/update child entries
    }
    let release_type: Option<String> = key.get_value("ReleaseType").ok();
    if matches!(
        release_type.as_deref(),
        Some("Security Update") | Some("Update") | Some("Hotfix")
    ) {
        return None;
    }

    let uninstall_string: Option<String> = key.get_value("UninstallString").ok();
    let quiet: Option<String> = key.get_value("QuietUninstallString").ok();
    let raw = quiet.or(uninstall_string)?;
    if raw.trim().is_empty() {
        return None;
    }

    let version: Option<String> = key.get_value("DisplayVersion").ok();
    let publisher: Option<String> = key.get_value("Publisher").ok();
    let install_location: Option<String> = key
        .get_value::<String, _>("InstallLocation")
        .ok()
        .filter(|s| !s.trim().is_empty());
    let icon: Option<String> = key.get_value("DisplayIcon").ok();
    // EstimatedSize is a DWORD in KiB.
    let size_estimate = get_dword(key, "EstimatedSize").map(|kb| (kb as u64) * 1024);

    let (program, args) = split_commandline(&raw);
    let preview = preview_command(&program, &args);

    Some(InstalledApp {
        id: format!("registry::{sub_name}"),
        name,
        version,
        publisher,
        install_location,
        size_estimate,
        icon,
        source: source.to_string(),
        uninstall: UninstallAction {
            kind: UninstallKind::ShellExecuteRunas,
            program,
            args,
            needs_elevation: true,
            preview,
        },
    })
}

fn get_dword(key: &RegKey, name: &str) -> Option<u32> {
    key.get_value::<u32, _>(name).ok()
}

/// Split a Windows command line into (program, args), honoring quotes. Used to
/// turn a registry `UninstallString` into something ShellExecute can run with
/// elevation.
fn split_commandline(cmd: &str) -> (String, Vec<String>) {
    let cmd = cmd.trim();
    let mut tokens: Vec<String> = Vec::new();
    let mut cur = String::new();
    let mut in_quotes = false;

    for ch in cmd.chars() {
        match ch {
            '"' => in_quotes = !in_quotes,
            c if c.is_whitespace() && !in_quotes => {
                if !cur.is_empty() {
                    tokens.push(std::mem::take(&mut cur));
                }
            }
            c => cur.push(c),
        }
    }
    if !cur.is_empty() {
        tokens.push(cur);
    }
    if tokens.is_empty() {
        return (cmd.to_string(), Vec::new());
    }
    let program = tokens.remove(0);
    (program, tokens)
}

/// Run a program directly, capturing output (used for non-elevated commands).
fn run_command(program: &str, args: &[String]) -> UninstallOutcome {
    match Command::new(program)
        .args(args)
        .creation_flags(CREATE_NO_WINDOW)
        .output()
    {
        Ok(out) => outcome_from_output(out.status.code(), &out.stdout, &out.stderr),
        Err(e) => fail(&format!("Échec du lancement : {e}")),
    }
}

/// Launch via ShellExecuteW with the "runas" verb so Windows shows the UAC
/// prompt. We can't capture output from an elevated, detached process, so we
/// report that elevation was requested and let the vendor uninstaller drive.
fn shell_execute_runas(program: &str, args: &[String]) -> UninstallOutcome {
    use windows::core::{HSTRING, PCWSTR};
    use windows::Win32::Foundation::HWND;
    use windows::Win32::UI::Shell::ShellExecuteW;
    use windows::Win32::UI::WindowsAndMessaging::SW_SHOWNORMAL;

    let params = super::preview_command("", args); // args joined, program omitted
    let verb = HSTRING::from("runas");
    let file = HSTRING::from(program);
    let params_h = HSTRING::from(params.trim());

    let result = unsafe {
        ShellExecuteW(
            HWND(std::ptr::null_mut()),
            PCWSTR(verb.as_ptr()),
            PCWSTR(file.as_ptr()),
            PCWSTR(params_h.as_ptr()),
            PCWSTR::null(),
            SW_SHOWNORMAL,
        )
    };

    // ShellExecuteW returns an HINSTANCE > 32 on success.
    if result.0 as isize > 32 {
        UninstallOutcome {
            success: true,
            code: None,
            stdout: String::new(),
            stderr: String::new(),
            message: "Désinstalleur lancé (élévation demandée). Suivez ses instructions.".into(),
        }
    } else {
        fail("Le lancement du désinstalleur a échoué ou a été refusé (UAC).")
    }
}

fn list_appx() -> Result<Vec<InstalledApp>, String> {
    let script = "Get-AppxPackage | Where-Object { -not $_.IsFramework -and -not $_.NonRemovable } | \
        Select-Object Name, PackageFullName, Publisher, Version, InstallLocation | ConvertTo-Json -Compress";
    let out = powershell_command(script).map_err(|e| e.to_string())?;
    if !out.status.success() {
        return Err("Get-AppxPackage a échoué".into());
    }
    let text = String::from_utf8_lossy(&out.stdout);
    let json: serde_json::Value = serde_json::from_str(text.trim()).map_err(|e| e.to_string())?;

    let arr = match json {
        serde_json::Value::Array(a) => a,
        serde_json::Value::Object(_) => vec![json],
        _ => return Ok(Vec::new()),
    };

    let mut apps = Vec::new();
    for item in arr {
        let name = item
            .get("Name")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        let full = item
            .get("PackageFullName")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        if name.is_empty() || full.is_empty() {
            continue;
        }
        let publisher = item
            .get("Publisher")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string());
        let version = item
            .get("Version")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string());
        let install_location = item
            .get("InstallLocation")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string());

        let preview = format!("Remove-AppxPackage -Package '{full}'");
        apps.push(InstalledApp {
            id: format!("appx::{full}"),
            name,
            version,
            publisher,
            install_location,
            size_estimate: None,
            icon: None,
            source: "appx".to_string(),
            uninstall: UninstallAction {
                kind: UninstallKind::Appx,
                program: "powershell".to_string(),
                args: vec!["-NoProfile".into(), "-Command".into(), preview.clone()],
                needs_elevation: false,
                preview,
            },
        });
    }
    Ok(apps)
}

fn run_powershell(script: &str) -> UninstallOutcome {
    match powershell_command(script) {
        Ok(out) => outcome_from_output(out.status.code(), &out.stdout, &out.stderr),
        Err(e) => fail(&format!("Échec du lancement de PowerShell : {e}")),
    }
}

fn powershell_command(script: &str) -> std::io::Result<std::process::Output> {
    Command::new(system_powershell())
        .args(["-NoProfile", "-NonInteractive", "-Command", script])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
}

/// Absolute path to the system PowerShell, so a `powershell.exe` planted in the
/// current directory or earlier on `PATH` can't be executed in its place. Falls
/// back to the bare name only if `%SystemRoot%` is somehow unset.
fn system_powershell() -> String {
    match std::env::var("SystemRoot") {
        Ok(root) => format!(r"{root}\System32\WindowsPowerShell\v1.0\powershell.exe"),
        Err(_) => "powershell".to_string(),
    }
}

fn outcome_from_output(code: Option<i32>, stdout: &[u8], stderr: &[u8]) -> UninstallOutcome {
    let success = code == Some(0);
    let so = String::from_utf8_lossy(stdout).trim().to_string();
    let se = String::from_utf8_lossy(stderr).trim().to_string();
    UninstallOutcome {
        success,
        code,
        message: if success {
            "Désinstallation terminée.".into()
        } else {
            format!("La désinstallation a échoué (code {code:?}).")
        },
        stdout: so,
        stderr: se,
    }
}

fn fail(msg: &str) -> UninstallOutcome {
    UninstallOutcome {
        success: false,
        code: None,
        stdout: String::new(),
        stderr: String::new(),
        message: msg.to_string(),
    }
}
