// Typed wrappers around the Tauri IPC surface. Components call these helpers
// instead of using `invoke()` directly, so command names and payload shapes
// live in one place and stay aligned with the Rust side.

import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { ask, message, open } from "@tauri-apps/plugin-dialog";
import type {
  AppInfo,
  InstalledApp,
  ItemKind,
  ScanEntry,
  ScanProgress,
  ScanSummary,
  SearchHit,
  SearchStats,
  SortKey,
  TrashDone,
  TrashProgress,
  UninstallOutcome,
  VolumeInfo,
} from "../types/models";

/* ---- general ---- */

/** Runtime/environment info — also used as a health check for the IPC bridge. */
export function appInfo(): Promise<AppInfo> {
  return invoke<AppInfo>("app_info");
}

/* ---- scan ---- */

export function listVolumes(): Promise<VolumeInfo[]> {
  return invoke<VolumeInfo[]>("list_volumes");
}

export function startScan(root: string): Promise<void> {
  return invoke<void>("start_scan", { root });
}

export function cancelScan(): Promise<void> {
  return invoke<void>("cancel_scan");
}

export function scanSummary(): Promise<ScanSummary | null> {
  return invoke<ScanSummary | null>("scan_summary");
}

export function tryLoadCache(root: string): Promise<ScanSummary | null> {
  return invoke<ScanSummary | null>("try_load_cache", { root });
}

export function getChildren(
  parent: number | null,
  sort: SortKey,
  desc: boolean,
  limit: number,
  offset: number,
): Promise<ScanEntry[]> {
  return invoke<ScanEntry[]>("get_children", { parent, sort, desc, limit, offset });
}

export function getLargest(kind: ItemKind, limit: number): Promise<ScanEntry[]> {
  return invoke<ScanEntry[]>("get_largest", { kind, limit });
}

export function revealPath(path: string): Promise<void> {
  return invoke<void>("reveal_path", { path });
}

/* ---- search ---- */

export interface SearchArgs {
  query: string;
  kind?: ItemKind | null;
  ext?: string | null;
  minSize?: number | null;
  maxSize?: number | null;
  modifiedAfter?: number | null;
  modifiedBefore?: number | null;
  limit: number;
}

export function searchFiles(args: SearchArgs): Promise<SearchHit[]> {
  return invoke<SearchHit[]>("search", {
    query: args.query,
    kind: args.kind ?? null,
    ext: args.ext ?? null,
    minSize: args.minSize ?? null,
    maxSize: args.maxSize ?? null,
    modifiedAfter: args.modifiedAfter ?? null,
    modifiedBefore: args.modifiedBefore ?? null,
    limit: args.limit,
  });
}

export function searchStats(): Promise<SearchStats | null> {
  return invoke<SearchStats | null>("search_stats");
}

export function onSearchStale(cb: () => void): Promise<UnlistenFn> {
  return listen("search://stale", () => cb());
}

/* ---- installed apps ---- */

export function listApps(): Promise<InstalledApp[]> {
  return invoke<InstalledApp[]>("list_apps");
}

/** Uninstall an app by its stable id. Only the id crosses the IPC boundary; the
 *  backend re-derives the actual command from the OS, so the command line can
 *  never be spoofed from here. */
export function uninstallApp(id: string): Promise<UninstallOutcome> {
  return invoke<UninstallOutcome>("uninstall_app", { id });
}

export function trashPath(id: number): Promise<void> {
  return invoke<void>("trash_path", { id });
}

/* ---- batch trash (background, event-streamed) ---- */

export function startTrash(ids: number[]): Promise<void> {
  return invoke<void>("start_trash", { ids });
}
export function cancelTrash(): Promise<void> {
  return invoke<void>("cancel_trash");
}
export function onTrashProgress(cb: (p: TrashProgress) => void): Promise<UnlistenFn> {
  return listen<TrashProgress>("trash://progress", (e) => cb(e.payload));
}
export function onTrashDone(cb: (d: TrashDone) => void): Promise<UnlistenFn> {
  return listen<TrashDone>("trash://done", (e) => cb(e.payload));
}

/* ---- recycle bin ---- */

/** Returns `[itemCount, totalBytes]`. */
export function recycleBinInfo(): Promise<[number, number]> {
  return invoke<[number, number]>("recycle_bin_info");
}
export function recycleBinSupported(): Promise<boolean> {
  return invoke<boolean>("recycle_bin_supported");
}
export function emptyRecycleBin(): Promise<void> {
  return invoke<void>("empty_recycle_bin");
}

/** Native folder picker (dialog plugin). Returns `null` if cancelled. */
export function pickFolder(): Promise<string | null> {
  return open({ directory: true, multiple: false }) as Promise<string | null>;
}

/** Native yes/no confirmation. Resolves `true` when the user accepts. */
export function confirmAsk(msg: string, title = "DiskScope"): Promise<boolean> {
  return ask(msg, { title, kind: "warning" });
}

/** Native message box (used for surfacing errors). */
export async function notify(msg: string, title = "DiskScope"): Promise<void> {
  await message(msg, { title });
}

/* ---- scan events ---- */

export function onScanProgress(cb: (p: ScanProgress) => void): Promise<UnlistenFn> {
  return listen<ScanProgress>("scan://progress", (e) => cb(e.payload));
}
export function onScanDone(cb: (s: ScanSummary) => void): Promise<UnlistenFn> {
  return listen<ScanSummary>("scan://done", (e) => cb(e.payload));
}
export function onScanCancelled(cb: () => void): Promise<UnlistenFn> {
  return listen("scan://cancelled", () => cb());
}
export function onScanError(cb: (msg: string) => void): Promise<UnlistenFn> {
  return listen<string>("scan://error", (e) => cb(e.payload));
}
