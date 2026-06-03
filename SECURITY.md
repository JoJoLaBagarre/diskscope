# Security Policy

## Supported versions

DiskScope is under active development. Security fixes target the **latest
released version**. Please update to the newest release before reporting.

| Version | Supported |
| ------- | --------- |
| 1.0.x   | ✅        |
| < 1.0   | ❌        |

## Reporting a vulnerability

**Please do not report security issues in public GitHub issues.**

DiskScope performs sensitive operations — it can delete files, empty the
Recycle Bin, and run application uninstallers with elevation (UAC). A
vulnerability could therefore have real impact, so we handle reports privately.

To report a vulnerability, use **GitHub's private advisory flow**:

1. Go to the repository's **Security** tab.
2. Click **Report a vulnerability** (Private vulnerability reporting).
3. Describe the issue, steps to reproduce, and the impact you observed.

You can expect an initial acknowledgement within a few days. Once a fix is
ready, we'll coordinate a release and credit you in the notes (unless you'd
rather stay anonymous).

## Scope & good-faith guidelines

Especially relevant for DiskScope:

- **Updater integrity** — issues with update signing/verification
  (`tauri.conf.json` `pubkey`, the `latest.json` flow).
- **Command/argument injection** — via uninstall strings, file paths, or any
  value passed to a shell or native API.
- **Privilege escalation** — anything that runs with more rights than intended.
- **Path traversal / unintended deletion** — operations affecting files the
  user did not select.

Please test only against your own machine and data. Do not run destructive
proofs-of-concept against other people's systems.
