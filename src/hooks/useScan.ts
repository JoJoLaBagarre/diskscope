import { useCallback, useEffect, useRef, useState } from "react";
import type { UnlistenFn } from "@tauri-apps/api/event";
import {
  cancelScan,
  onScanCancelled,
  onScanDone,
  onScanError,
  onScanProgress,
  scanSummary,
  startScan,
  tryLoadCache,
} from "../api/tauri";
import type { ScanProgress, ScanSummary } from "../types/models";

export type ScanStatus = "idle" | "scanning" | "done" | "error" | "cancelled";

/**
 * Owns the scan lifecycle: wires up the `scan://*` events, exposes the current
 * status/progress/summary, and provides actions. On mount it restores any scan
 * already held in the Rust backend, so switching views doesn't lose results.
 */
export function useScan() {
  const [status, setStatus] = useState<ScanStatus>("idle");
  const [progress, setProgress] = useState<ScanProgress | null>(null);
  const [summary, setSummary] = useState<ScanSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    const unlisteners: UnlistenFn[] = [];
    (async () => {
      unlisteners.push(
        await onScanProgress((p) => mounted.current && setProgress(p)),
        await onScanDone((s) => {
          if (!mounted.current) return;
          setSummary(s);
          setProgress(null);
          setStatus("done");
        }),
        await onScanCancelled(() => {
          if (!mounted.current) return;
          setProgress(null);
          setStatus("cancelled");
        }),
        await onScanError((m) => {
          if (!mounted.current) return;
          setProgress(null);
          setError(m);
          setStatus("error");
        }),
      );
      const existing = await scanSummary();
      if (mounted.current && existing) {
        setSummary(existing);
        setStatus("done");
      }
    })();
    return () => {
      mounted.current = false;
      unlisteners.forEach((u) => u());
    };
  }, []);

  /** Fresh full scan of `root`. */
  const scan = useCallback(async (root: string) => {
    setError(null);
    setProgress({ files: 0, dirs: 0, bytes: 0, current: "" });
    setStatus("scanning");
    try {
      await startScan(root);
    } catch (e) {
      setError(String(e));
      setStatus("error");
    }
  }, []);

  /** Open `root` from cache if available, otherwise run a fresh scan. */
  const open = useCallback(
    async (root: string) => {
      try {
        const cached = await tryLoadCache(root);
        if (cached) {
          setSummary(cached);
          setStatus("done");
          return;
        }
      } catch {
        /* fall through to a fresh scan */
      }
      await scan(root);
    },
    [scan],
  );

  const cancel = useCallback(async () => {
    await cancelScan();
  }, []);

  const reset = useCallback(() => {
    setStatus("idle");
    setSummary(null);
    setProgress(null);
    setError(null);
  }, []);

  return { status, progress, summary, error, scan, open, cancel, reset };
}
