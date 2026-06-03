import { useCallback, useEffect, useRef, useState } from "react";
import type { UnlistenFn } from "@tauri-apps/api/event";
import { cancelTrash, onTrashDone, onTrashProgress, startTrash } from "../api/tauri";
import type { TrashDone, TrashProgress } from "../types/models";

export type TrashStatus = "idle" | "running" | "done";

/**
 * Drives a background batch-delete: starts it, tracks `trash://progress` and
 * `trash://done`, and hands the caller the removed ids on completion. The UI
 * stays responsive because the actual deletes happen on the Rust side without
 * holding any lock (see commands::start_trash).
 */
export function useTrash(onComplete?: (done: TrashDone) => void) {
  const [status, setStatus] = useState<TrashStatus>("idle");
  const [progress, setProgress] = useState<TrashProgress | null>(null);
  const completeRef = useRef(onComplete);
  completeRef.current = onComplete;

  useEffect(() => {
    const uns: UnlistenFn[] = [];
    (async () => {
      uns.push(
        await onTrashProgress((p) => setProgress(p)),
        await onTrashDone((d) => {
          setStatus("done");
          setProgress(null);
          completeRef.current?.(d);
        }),
      );
    })();
    return () => uns.forEach((u) => u());
  }, []);

  const start = useCallback(async (ids: number[]) => {
    setStatus("running");
    setProgress({ done: 0, total: ids.length, failed: 0, current: "" });
    try {
      await startTrash(ids);
    } catch {
      // Another batch already running, or no scan — reset.
      setStatus("idle");
      setProgress(null);
    }
  }, []);

  const cancel = useCallback(() => {
    cancelTrash();
  }, []);

  const reset = useCallback(() => {
    setStatus("idle");
    setProgress(null);
  }, []);

  return { status, progress, start, cancel, reset };
}
