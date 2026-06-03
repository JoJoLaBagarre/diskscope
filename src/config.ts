// Build/release configuration.
//
// REPO_SLUG drives the "view on GitHub" link and the lightweight portion of the
// update UI. The signed auto-updater itself reads its endpoint from
// src-tauri/tauri.conf.json (plugins.updater.endpoints) — update BOTH when you
// create the real repository.
export const REPO_SLUG = "JoJoLaBagarre/diskscope";
export const REPO_URL = `https://github.com/${REPO_SLUG}`;
