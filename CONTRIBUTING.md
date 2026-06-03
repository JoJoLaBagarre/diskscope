# Contributing to DiskScope

Thanks for your interest in improving DiskScope! This guide covers the dev setup
and the quality gates your changes need to pass.

## Project layout

```
src-tauri/        Rust backend
  src/
    commands.rs   IPC command surface (the one API the frontend calls)
    scan/         disk traversal, size tree, cache
    search/       fuzzy index + filesystem watcher
    apps/         installed-app enumeration + uninstall (per-OS behind cfg)
    platform/     OS abstractions (allocated size, recycle bin)
    state.rs      shared app state (RwLock-guarded scan/search)
src/              React + TypeScript frontend
  i18n/           string catalogs (en = source of truth, fr = typed mirror)
  hooks/          useScan, useSearch, useApps, useTrash, useSettings, …
  components/     one folder per view + shared `common/`
  api/tauri.ts    typed wrappers around invoke()/listen()
```

The **IPC boundary is identical on every OS**: platform specifics live in Rust
behind `cfg(target_os = …)`; the frontend calls one API. Unsupported actions
return a clear message — never `unimplemented!` or a panic.

## Setup

```bash
npm install
npm run tauri dev      # hot-reloading dev window
```

## Quality gates

Your change must pass all of these (CI enforces them across windows/ubuntu/macos):

```bash
# Backend
cd src-tauri
cargo fmt --all -- --check
cargo clippy --all-targets -- -D warnings
cargo test

# Frontend
npx tsc --noEmit
```

## Adding UI strings (i18n)

1. Add the key + English text to `src/i18n/en.ts` (the source of truth).
2. Add the matching French text to `src/i18n/fr.ts`. The compiler will fail if
   a key is missing — `fr.ts` is typed as `Record<TranslationKey, string>`.
3. Use it in a component via `const { t } = useTranslation();` → `t("your.key")`.
   Use `{placeholder}` tokens for interpolation and `useFormat()` for
   locale-aware sizes/counts/dates.

## Conventions

- Keep the IPC surface OS-agnostic; push platform code behind `cfg`.
- Destructive actions always confirm and show what will happen.
- Prefer reusing existing hooks/components over adding new ones.
- Background work that can be slow (scan, batch delete) runs on a thread and
  streams progress via Tauri events — don't block the IPC thread or hold a
  write lock across syscalls.

## Pull requests

- Branch off `main`, keep changes focused.
- Describe what changed and how you verified it.
- Make sure the quality gates above are green.
