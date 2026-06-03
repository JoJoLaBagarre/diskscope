import { useCallback, useEffect, useState } from "react";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

export type UpdateState =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "none" }
  | { kind: "available"; version: string; notes?: string }
  | { kind: "downloading"; version: string; percent: number }
  | { kind: "error"; message: string };

/**
 * Wraps the Tauri updater plugin: check for a newer signed release, download +
 * install with progress, then relaunch. All calls fail soft (offline, no
 * endpoint configured, etc.) so the UI never blocks on it.
 */
export function useUpdate() {
  const [state, setState] = useState<UpdateState>({ kind: "idle" });
  const [update, setUpdate] = useState<Update | null>(null);

  const checkForUpdate = useCallback(async (silent = false) => {
    if (!silent) setState({ kind: "checking" });
    try {
      const found = await check();
      if (found) {
        setUpdate(found);
        setState({ kind: "available", version: found.version, notes: found.body });
      } else {
        setUpdate(null);
        if (!silent) setState({ kind: "none" });
        else setState({ kind: "idle" });
      }
    } catch (e) {
      // Offline / no endpoint / rate-limited — stay quiet on silent checks.
      if (!silent) setState({ kind: "error", message: String(e) });
      else setState({ kind: "idle" });
    }
  }, []);

  // One silent check on mount.
  useEffect(() => {
    checkForUpdate(true);
  }, [checkForUpdate]);

  const downloadAndInstall = useCallback(async () => {
    if (!update) return;
    let total = 0;
    let received = 0;
    setState({ kind: "downloading", version: update.version, percent: 0 });
    try {
      await update.downloadAndInstall((event) => {
        if (event.event === "Started") {
          total = event.data.contentLength ?? 0;
        } else if (event.event === "Progress") {
          received += event.data.chunkLength;
          const percent = total > 0 ? Math.round((received / total) * 100) : 0;
          setState({ kind: "downloading", version: update.version, percent });
        }
      });
      await relaunch();
    } catch (e) {
      setState({ kind: "error", message: String(e) });
    }
  }, [update]);

  return { state, checkForUpdate, downloadAndInstall, hasUpdate: !!update };
}
