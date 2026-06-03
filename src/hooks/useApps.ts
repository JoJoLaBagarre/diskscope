import { useCallback, useEffect, useState } from "react";
import { listApps } from "../api/tauri";
import type { InstalledApp } from "../types/models";

/** Loads installed applications. `unsupported` carries the backend message on
 *  platforms where app management isn't available yet (Linux/macOS pre-M5). */
export function useApps() {
  const [apps, setApps] = useState<InstalledApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setApps(await listApps());
    } catch (e) {
      setError(String(e));
      setApps([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { apps, loading, error, reload: load };
}
