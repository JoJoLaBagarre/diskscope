# Seed issues to open on GitHub

Copy each block below into a **New issue** and apply the suggested labels.
The first four are genuine *good first issues* (small, self-contained, clear
done-criteria). The last two are larger `help wanted` efforts — keep them
separate so beginners aren't scared off.

> Tip: create the labels first (Issues → Labels): `good first issue`,
> `help wanted`, `enhancement`, `i18n`, `docs`, `platform: linux`,
> `platform: macos`.

---

## 1. Add a "Copy path" action to file/search rows
**Labels:** `good first issue`, `enhancement`

Rows in the scan tables and search results have *Reveal* and *Trash* actions,
but no quick "copy the full path to clipboard". This is a small, self-contained
addition.

**Where:**
- `src/components/ScanView/EntryRow.tsx` and
  `src/components/SearchView/SearchHitRow.tsx` — add a third icon button.
- Use Tauri's clipboard: `import { writeText } from "@tauri-apps/plugin-clipboard-manager"`
  (add the plugin if not present) **or** the web `navigator.clipboard.writeText`.
- Add an icon to `src/components/common/icons.tsx` (e.g. a "copy" glyph).
- Add the strings `action.copyPath` to **both** `src/i18n/en.ts` and `fr.ts`.

**Done when:** clicking the new button copies the row's path, with a brief
confirmation (reuse `notify()` or a small toast). Gates green
(`tsc --noEmit`, and a manual click test).

---

## 2. Persist the last scanned root and offer to re-open it
**Labels:** `good first issue`, `enhancement`

When the app starts, the scan view always shows the volume picker. It would be
friendlier to remember the last scanned path and offer a one-click "re-open".

**Where:**
- `src/hooks/useSettings.tsx` — add an optional `lastRoot?: string` to
  `Settings` (it already persists to `localStorage`, so just extend the shape
  and the loader).
- `src/components/ScanView/VolumePicker.tsx` — if `lastRoot` is set, show a
  small "Re-open <path>" button above the volume grid.
- Add i18n strings in `en.ts` + `fr.ts`.

**Done when:** after scanning a folder and restarting, the picker shows a
shortcut to re-open it. No backend changes needed.

---

## 3. Add a keyboard shortcut to focus the search box
**Labels:** `good first issue`, `enhancement`

Power users expect `Ctrl+F` (or `Cmd+F` on macOS) to jump to search.

**Where:**
- `src/components/SearchView/SearchView.tsx` — the input already exists; add a
  `useEffect` with a `keydown` listener that switches to the search view and
  focuses the input. (View switching lives in `src/App.tsx` via `setView` — you
  may need to lift a small handler or use a ref.)

**Done when:** pressing the shortcut from anywhere focuses the search field.
Make sure it doesn't hijack typing inside other inputs.

---

## 4. Add a third language (e.g. Spanish or German)
**Labels:** `good first issue`, `i18n`

The i18n system is designed for this: English is the source of truth and every
other language is a typed mirror, so the compiler tells you exactly which keys
are missing.

**Where:**
- Create `src/i18n/es.ts` (or `de.ts`) as
  `export const es: Record<TranslationKey, string> = { … }` — copy the keys from
  `src/i18n/fr.ts` and translate the values.
- Register it in `src/i18n/index.ts`: extend `Lang`, the `LANGUAGES` array, the
  `CATALOGS` map, and `localeOf()`.

**Done when:** the new language appears in Options → Language and `tsc --noEmit`
passes (which proves every key is translated — a missing key won't compile).

---

## 5. Implement Linux application listing & uninstall
**Labels:** `help wanted`, `platform: linux`

> Larger effort — not a first issue, but well-scoped and documented.

`src-tauri/src/apps/linux.rs` is currently a graceful stub. The intended design
is written at the top of that file: read `.desktop` entries, map each to its
owning package via whichever package managers are present (dpkg/apt, rpm/dnf,
pacman, flatpak, snap), and uninstall via the right manager with elevation
(`pkexec`/`sudo`). Only offer managers actually detected on the system.

**Contract to satisfy:** implement `AppManager::list` and `uninstall` for
`LinuxAppManager` (see the `AppManager` trait + `InstalledApp` / `UninstallAction`
models in `src-tauri/src/apps/mod.rs`). The Windows impl
(`src-tauri/src/apps/windows.rs`) is a good reference for the shape.

**Done when:** on a Linux machine, the Applications tab lists installed apps and
can uninstall at least one package manager's apps, with confirmation. Keep the
IPC surface unchanged.

---

## 6. Implement macOS application listing & uninstall
**Labels:** `help wanted`, `platform: macos`

> Larger effort — companion to #5.

`src-tauri/src/apps/macos.rs` is a stub with the design in its header comment:
enumerate `.app` bundles in `/Applications` and `~/Applications` (read
`Info.plist` for name/version, sum bundle size), plus Homebrew casks via
`brew list --cask`. Uninstall = move the bundle to the Trash (the `trash` crate
is already a dependency) or `brew uninstall --cask <name>`.

**Done when:** on macOS, the Applications tab lists `.app` bundles and casks and
can uninstall them with confirmation. IPC surface unchanged.
