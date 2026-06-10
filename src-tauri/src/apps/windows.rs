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
            if !is_valid_subkey(sub_name) {
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

/// Whether `sub_name` is a safe single-segment registry subkey name. Rejects
/// empty names and any separator/parent reference that could traverse out of the
/// `Uninstall` hive to an attacker-writable key whose `UninstallString` we would
/// then execute with elevation. This is the security boundary for `find()`.
fn is_valid_subkey(sub_name: &str) -> bool {
    !(sub_name.is_empty()
        || sub_name.contains('\\')
        || sub_name.contains('/')
        || sub_name.contains(".."))
}

/// Split a Windows command line into (program, args) using the OS parser
/// `CommandLineToArgvW`, so quoting and backslash-escaping are tokenized exactly
/// the way Windows itself would. Used to turn a registry `UninstallString` into
/// something ShellExecute can run with elevation. The hand-rolled predecessor
/// mishandled escaped quotes (`\"`); deferring to the API removes that class of
/// bug.
fn split_commandline(cmd: &str) -> (String, Vec<String>) {
    use std::os::windows::ffi::OsStrExt;
    use windows::core::PCWSTR;
    use windows::Win32::Foundation::{LocalFree, HLOCAL};
    use windows::Win32::UI::Shell::CommandLineToArgvW;

    let cmd = cmd.trim();
    // `CommandLineToArgvW("")` returns the current executable's own path — not
    // what we want here. An empty UninstallString simply has no program.
    if cmd.is_empty() {
        return (String::new(), Vec::new());
    }

    let wide: Vec<u16> = std::ffi::OsStr::new(cmd)
        .encode_wide()
        .chain(std::iter::once(0))
        .collect();

    let mut argc: i32 = 0;
    // SAFETY: `wide` is a valid NUL-terminated UTF-16 buffer that outlives the
    // call and `argc` is a valid out-pointer. The returned array, when non-null,
    // must be released exactly once with `LocalFree` (done below).
    let argv = unsafe { CommandLineToArgvW(PCWSTR(wide.as_ptr()), &mut argc) };
    if argv.is_null() || argc <= 0 {
        // Never panic: fall back to treating the whole string as the program.
        return (cmd.to_string(), Vec::new());
    }

    // SAFETY: on success `argv` points to `argc` consecutive valid `PWSTR`s; we
    // only read them, copying each into an owned `String` before freeing.
    let mut tokens: Vec<String> = unsafe { std::slice::from_raw_parts(argv, argc as usize) }
        .iter()
        .map(|p| unsafe { p.to_string().unwrap_or_default() })
        .collect();

    // SAFETY: `argv` was allocated by `CommandLineToArgvW`; free it exactly once.
    unsafe {
        let _ = LocalFree(HLOCAL(argv as *mut core::ffi::c_void));
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

#[cfg(test)]
mod tests {
    // This module only compiles on Windows (gated by `apps/mod.rs`), so the
    // CommandLineToArgvW-backed `split_commandline` is exercised on its real OS.
    use super::*;

    #[test]
    fn split_quoted_program_with_spaces() {
        // The classic vendor form: a quoted path containing spaces, then a flag.
        let (program, args) = split_commandline("\"C:\\Program Files\\App\\unins.exe\" /S");
        assert_eq!(program, "C:\\Program Files\\App\\unins.exe");
        assert_eq!(args, vec!["/S".to_string()]);
    }

    #[test]
    fn split_unquoted_program_and_args() {
        let (program, args) = split_commandline("C:\\Tool\\setup.exe --uninstall --quiet");
        assert_eq!(program, "C:\\Tool\\setup.exe");
        assert_eq!(args, vec!["--uninstall".to_string(), "--quiet".to_string()]);
    }

    #[test]
    fn split_msi_style_guid_arg_stays_one_token() {
        let (program, args) =
            split_commandline("MsiExec.exe /X{0AF1B2C3-0000-0000-0000-000000000000}");
        assert_eq!(program, "MsiExec.exe");
        assert_eq!(
            args,
            vec!["/X{0AF1B2C3-0000-0000-0000-000000000000}".to_string()]
        );
    }

    #[test]
    fn split_program_only_has_no_args() {
        let (program, args) = split_commandline("unins000.exe");
        assert_eq!(program, "unins000.exe");
        assert!(args.is_empty());
    }

    #[test]
    fn split_empty_or_whitespace_yields_empty() {
        assert_eq!(split_commandline(""), (String::new(), Vec::new()));
        assert_eq!(split_commandline("   "), (String::new(), Vec::new()));
    }

    #[test]
    fn valid_subkey_accepts_single_segment() {
        assert!(is_valid_subkey("{0AF1B2C3-1234-5678-9ABC-DEF012345678}"));
        assert!(is_valid_subkey("Mozilla Firefox 100.0 (x64 en-US)"));
    }

    #[test]
    fn valid_subkey_rejects_empty_and_traversal() {
        assert!(!is_valid_subkey(""));
        assert!(!is_valid_subkey(".."));
        assert!(!is_valid_subkey("..\\..\\Run"));
        assert!(!is_valid_subkey("foo\\bar"));
        assert!(!is_valid_subkey("foo/bar"));
    }
}
