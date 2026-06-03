# DiskScope

> Disk space analyzer, lightning-fast fuzzy search, and application uninstaller — for Windows, Linux and macOS.

DiskScope is a small, fast desktop app that helps you understand **what is taking
up space on your disk**, **find files and folders instantly** (much faster than
the file explorer), and **uninstall applications** through the system's native
uninstaller — all from one clean, light/dark interface.

Built with **Tauri 2** (Rust backend, web frontend) + **React + TypeScript**.

🇫🇷 *[Lire en français](README.fr.md)*

---

## Features

- **Disk analysis** — parallel directory traversal (jwalk), bottom-up size
  aggregation, a virtualized table of the largest items, a tree explorer with
  breadcrumbs, and a zoomable **treemap**. Progress streams live; results are
  cached for instant reload. Sizes reflect **actual on-disk usage** (sparse and
  compressed files count for what they really occupy).
- **Search** — instant fuzzy search (nucleo) over the indexed tree, with filters
  by type, extension, size and date. Virtualized results stay smooth at 100k+
  rows. A filesystem watcher flags when results drift from disk.
- **Applications** — list installed apps (Windows registry + Microsoft Store)
  with publisher, version and size; uninstall via the native uninstaller with a
  **mandatory confirmation showing the exact command** and UAC elevation when
  needed. Filter by drive, sort by name/size.
- **Multi-select delete** with a non-blocking progress popup, and a one-click
  **Empty Recycle Bin**.
- **English & French**, light & dark themes, and a built-in **auto-updater**.

## Screenshots

> _Add screenshots here before publishing (Disk analysis, Treemap, Search, Applications, Options)._

## Install

Download the latest installer from the [Releases page](https://github.com/JoJoLaBagarre/diskscope/releases):

- **Windows** — `DiskScope_x.y.z_x64_en-US.msi` or `DiskScope_x.y.z_x64-setup.exe`
- **Linux** — `.AppImage` or `.deb`
- **macOS** — `.dmg`

The app updates itself: when a newer signed release is published, DiskScope offers
to download and install it.

## Build from source

### Prerequisites
- [Rust](https://rustup.rs/) (stable; MSVC toolchain on Windows)
- [Node.js](https://nodejs.org/) 20+
- **Windows**: WebView2 (preinstalled on Windows 11) + Visual Studio Build Tools
  ("Desktop development with C++")
- **Linux**: `libwebkit2gtk-4.1-dev`, `libgtk-3-dev`, `librsvg2-dev`, `patchelf`,
  `libappindicator3-dev`
- **macOS**: Xcode Command Line Tools

### Develop
```bash
npm install
npm run tauri dev
```

### Production build
```bash
npm run tauri build   # MSI/NSIS (Windows), AppImage/.deb (Linux), .dmg (macOS)
```

## Verification
```bash
# Backend
cd src-tauri
cargo test
cargo clippy --all-targets -- -D warnings
cargo fmt --all -- --check

# Frontend
npx tsc --noEmit
```

CI (`.github/workflows/ci.yml`) runs these on every PR across the
windows / ubuntu / macos matrix.

## Platform support

| Feature                    | Windows | Linux | macOS |
|----------------------------|:-------:|:-----:|:-----:|
| Disk analysis              |   ✅    |  ✅¹  |  ✅¹  |
| Search                     |   ✅    |  ✅¹  |  ✅¹  |
| Applications / uninstall   |   ✅    |  🚧²  |  🚧²  |
| Empty recycle bin          |   ✅    |  —    |  —    |
| Auto-update                |   ✅    |  ✅¹  |  ✅¹  |

¹ Portable code, validated by CI compilation; runtime confirmed during porting.
² Planned; currently returns a clear "not yet implemented" message.

## Contributing

Contributions are welcome! See **[CONTRIBUTING.md](CONTRIBUTING.md)** for the
dev setup, project layout, and the quality gates every change must pass
(`cargo fmt`, `clippy -D warnings`, `cargo test`, `tsc --noEmit`). CI runs these
on Windows, Linux and macOS for every pull request.

- 🐛 Found a bug or have an idea? [Open an issue](../../issues/new/choose).
- 🔒 Security vulnerability? Please follow [SECURITY.md](SECURITY.md) — do not
  open a public issue.

## Releasing

Releases are built and signed automatically by CI when a `v*` tag is pushed,
producing the cross-platform installers and the signed update manifest.

## License

[MIT](LICENSE) © `JoJoLaBagarre`

## Acknowledgements

Built on [Tauri](https://tauri.app/), [jwalk](https://github.com/Byron/jwalk),
[nucleo](https://github.com/helix-editor/nucleo),
[d3-hierarchy](https://github.com/d3/d3-hierarchy), and
[@tanstack/react-virtual](https://tanstack.com/virtual).
