// TypeScript mirrors of the Rust models exchanged over the Tauri IPC bridge.
// Keep these in sync with `src-tauri/src/**` (serde `Serialize` structs).

/** Active primary view in the shell. */
export type View = "scan" | "search" | "apps" | "options" | "about";

/** Mirror of `commands::AppInfo`. */
export interface AppInfo {
  name: string;
  version: string;
  os: string;
  arch: string;
}

/** Mirror of `scan::VolumeInfo`. */
export interface VolumeInfo {
  name: string;
  mount_point: string;
  total_bytes: number;
  free_bytes: number;
  file_system: string;
  is_removable: boolean;
}

/** Mirror of `scan::ScanSummary`. */
export interface ScanSummary {
  root_path: string;
  total_size: number;
  file_count: number;
  dir_count: number;
  errors: number;
  /** Bounded sample of paths skipped during the scan (permission denied, etc.). */
  inaccessible: string[];
  scanned_at: number;
  from_cache: boolean;
}

/** Mirror of `scan::ScanEntry` (one table / drill-down row). */
export interface ScanEntry {
  id: number;
  name: string;
  path: string;
  size: number;
  is_dir: boolean;
  mtime: number | null;
  child_count: number;
  percent: number;
}

/** Payload of the `scan://progress` event. */
export interface ScanProgress {
  files: number;
  dirs: number;
  bytes: number;
  current: string;
}

export type SortKey = "size" | "name" | "mtime";
export type ItemKind = "files" | "dirs" | "all";

/** Mirror of `scan::ExtBucket` (one row of the "by type" view). */
export interface ExtBucket {
  /** Lowercased extension without the dot; empty string = no extension. */
  ext: string;
  count: number;
  size: number;
  percent: number;
}

export type ExportFormat = "csv" | "json";

/** Payload of the `trash://progress` event. */
export interface TrashProgress {
  done: number;
  total: number;
  failed: number;
  current: string;
}

/** Payload of the `trash://done` event. */
export interface TrashDone {
  removed: number[];
  failed: number;
  total: number;
  cancelled: boolean;
}

/** Mirror of `search::SearchHit`. */
export interface SearchHit {
  id: number;
  name: string;
  path: string;
  size: number;
  is_dir: boolean;
  mtime: number | null;
  score: number;
}

/** Mirror of `commands::SearchStats`. */
export interface SearchStats {
  indexed: number;
  stale: boolean;
}

/** Client-side filter state for the search view. */
export interface SearchFilters {
  kind: ItemKind;
  ext: string;
  minSizeMB: string;
  maxSizeMB: string;
  modifiedAfter: string; // yyyy-mm-dd
  modifiedBefore: string;
}

/* ---- installed apps (mirror of `apps::*`) ---- */

export type UninstallKind = "command" | "shell_execute_runas" | "appx" | "trash_bundle";

export interface UninstallAction {
  kind: UninstallKind;
  program: string;
  args: string[];
  needs_elevation: boolean;
  preview: string;
}

export interface InstalledApp {
  id: string;
  name: string;
  version: string | null;
  publisher: string | null;
  install_location: string | null;
  size_estimate: number | null;
  icon: string | null;
  source: string;
  uninstall: UninstallAction;
}

export interface UninstallOutcome {
  success: boolean;
  code: number | null;
  stdout: string;
  stderr: string;
  message: string;
}
