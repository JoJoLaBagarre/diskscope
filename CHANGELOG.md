# Changelog

All notable changes to DiskScope are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

<!-- Add changes here as they land; they roll into the next release. -->

## [1.1.2] - 2026-06-11

### Changed

- **App icon & branding** — added the DiskScope logo (a disk under a magnifying
  glass) as the application icon on every platform, and used it as the sidebar
  brand mark in place of the placeholder glyph.

## [1.1.1] - 2026-06-10

### Added

- **Faster scans** — per-file size/metadata is now computed on jwalk's parallel
  worker pool instead of the consumer thread. Benchmarked on a 13.6 GB / ~31k-entry
  tree: **~36% faster** (≈1.25 s → 0.80 s), with byte-identical results.
- **Inaccessible paths surfaced** — a scan now reports a bounded sample of the
  locations it couldn't read (permission denied, etc.) as a tooltip on the
  "skipped" chip, instead of only a count.
- **Logging** via `tracing`, silent unless `RUST_LOG` is set.
- **Frontend test suite** (Vitest + Testing Library) and **ESLint + Prettier**,
  all run in CI; plus more Rust unit tests for the cache, uninstall-string parsing
  and tree patching.

### Changed

- **Uninstall strings are tokenized by the OS** (`CommandLineToArgvW`) rather than
  a hand-rolled splitter, so quoting/escaping matches Windows exactly.
- **Non-poisoning locks** (`parking_lot`) — a panicked background thread can no
  longer wedge every later command.
- Defensive bounds on query result size and search-query length.

### Fixed

- **Silent failures surfaced** — drive enumeration now shows an error banner, and
  the search "stale" listener no longer swallows rejections.
- **Accessibility** — keyboard-operable treemap tiles, `aria-label`s on icon-only
  buttons, `role="progressbar"` on progress bars, and focus-trapped modals.

## [1.0.1] - 2026-06-03

### Security

- **Uninstall is identified by an opaque id, not a command.** The IPC layer only
  passes an app id; the uninstall command is re-derived from the OS on the
  backend and never taken from the frontend, so a compromised WebView cannot use
  it to run an arbitrary (possibly elevated) program. Registry lookups also
  reject ids that could traverse to another key.
- **Strict Content-Security-Policy** is now enforced (it was disabled),
  blocking inline scripts — the primary defense against an XSS escalating to
  code execution.
- **PowerShell is invoked by absolute path**, so a planted `powershell.exe`
  earlier on `PATH` (or in the working directory) can't be run in its place.
- **Least privilege** — removed the unused `opener:allow-open-path` capability,
  scoped CI's `GITHUB_TOKEN` to `contents: read`, and added a dependency audit
  job (`npm audit` + `cargo audit`).

### Fixed

- **Dark mode** — disk names and the free-space figure on the Disk Analysis tab
  stayed dark, because color-less `<button>`s didn't inherit the theme color.
- **Microsoft Store uninstall** — the executed command now matches the previewed
  one exactly; the `appx::` routing prefix was leaking into `Remove-AppxPackage`,
  which both diverged from the confirmation and failed to match the package.

## [1.0.0] - 2026-06-03

First public release.

### Added

- **Disk analysis** — parallel filesystem traversal (jwalk) on a background
  thread with streamed progress, bottom-up size aggregation, a virtualized
  "largest items" table, a breadcrumb tree explorer, and a zoomable squarified
  treemap. Results are cached for instant reload.
- **Search** — instant fuzzy search (nucleo) over the scanned tree, with
  type / extension / size / date filters, virtualized results, and a filesystem
  watcher that flags stale results.
- **Applications** — list installed apps (Windows registry + Microsoft Store)
  with publisher, version and size; uninstall via the system's native
  uninstaller with a confirmation that previews the exact command, and UAC
  elevation when required.
- **Multi-select delete** — checkbox selection with a batch-delete action that
  runs on a background thread and shows a progress popup with elapsed time, so
  the UI stays responsive on large batches.
- **Empty Recycle Bin** — one-click emptying of the entire Windows Recycle Bin
  from the scan toolbar, behind a confirmation showing item count and size.
- **Internationalization** — English (default) and French, switchable live;
  locale-aware sizes, counts and dates.
- **Options tab** — language, appearance (System / Light / Dark) with
  persistence, and update controls.
- **Dark mode** — full dark theme via CSS variables, following the OS preference
  by default.
- **Auto-updates** — signed updates via the Tauri updater; an in-app banner and
  an Options control to download and install new releases.
- **Quality of life** — reveal in file manager, send to Recycle Bin, sortable
  columns, per-drive app filtering, explanatory footnotes, and window
  size/position persistence.

### Notes

- File sizes reflect **actual on-disk usage**: sparse/compressed files (e.g. VM
  images) count for what they really occupy, which can be far less than their
  reported length.
- Linux and macOS application listing/uninstall are not yet implemented (the
  scanner and search are cross-platform). See the open `help wanted` issues.

[Unreleased]: https://github.com/JoJoLaBagarre/diskscope/compare/v1.1.2...HEAD
[1.1.2]: https://github.com/JoJoLaBagarre/diskscope/compare/v1.1.1...v1.1.2
[1.1.1]: https://github.com/JoJoLaBagarre/diskscope/compare/v1.0.1...v1.1.1
[1.0.1]: https://github.com/JoJoLaBagarre/diskscope/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/JoJoLaBagarre/diskscope/releases/tag/v1.0.0
