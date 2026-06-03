import { useCallback, useEffect, useRef, useState } from "react";
import { searchFiles, searchStats } from "../api/tauri";
import type { SearchFilters, SearchHit, SearchStats } from "../types/models";
import { useDebounced } from "./useDebounced";

const LIMIT = 1000;
const MB = 1024 * 1024;

export const EMPTY_FILTERS: SearchFilters = {
  kind: "all",
  ext: "",
  minSizeMB: "",
  maxSizeMB: "",
  modifiedAfter: "",
  modifiedBefore: "",
};

function dateToSecs(d: string): number | null {
  if (!d) return null;
  const t = Date.parse(d);
  return Number.isNaN(t) ? null : Math.floor(t / 1000);
}
function numOr(v: string, scale = 1): number | null {
  if (!v.trim()) return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n * scale) : null;
}

/**
 * Runs fuzzy search whenever the (debounced) query or filters change. Requires
 * a completed scan; `stats` is null until one exists. Each run is tagged so a
 * slow earlier request can't overwrite a newer result.
 */
export function useSearch() {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<SearchFilters>(EMPTY_FILTERS);
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [stats, setStats] = useState<SearchStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  const debouncedQuery = useDebounced(query, 150);
  const debouncedFilters = useDebounced(filters, 150);
  const runId = useRef(0);

  const refreshStats = useCallback(async () => {
    const s = await searchStats();
    setStats(s);
    setReady(s !== null);
    return s;
  }, []);

  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  useEffect(() => {
    const id = ++runId.current;
    setLoading(true);
    searchFiles({
      query: debouncedQuery,
      kind: debouncedFilters.kind,
      ext: debouncedFilters.ext || null,
      minSize: numOr(debouncedFilters.minSizeMB, MB),
      maxSize: numOr(debouncedFilters.maxSizeMB, MB),
      modifiedAfter: dateToSecs(debouncedFilters.modifiedAfter),
      modifiedBefore: dateToSecs(debouncedFilters.modifiedBefore),
      limit: LIMIT,
    })
      .then((r) => {
        if (id === runId.current) {
          setHits(r);
          setReady(true);
          setLoading(false);
        }
      })
      .catch(() => {
        if (id === runId.current) {
          setHits([]);
          setLoading(false);
          // Likely "no scan yet" — reflect that in readiness.
          refreshStats();
        }
      });
  }, [debouncedQuery, debouncedFilters, refreshStats]);

  const resetFilters = useCallback(() => setFilters(EMPTY_FILTERS), []);

  return {
    query,
    setQuery,
    filters,
    setFilters,
    resetFilters,
    hits,
    stats,
    loading,
    ready,
    refreshStats,
    limit: LIMIT,
  };
}
