# Changelog

All notable changes to DiskScope are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

<!-- Add changes here as they land; they roll into the next release. -->

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

[Unreleased]: https://github.com/JoJoLaBagarre/diskscope/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/JoJoLaBagarre/diskscope/releases/tag/v1.0.0
