import { useCallback, useState } from "react";

/** Tracks a set of selected numeric ids for multi-select tables. */
export function useSelection() {
  const [selected, setSelected] = useState<Set<number>>(() => new Set());

  const toggle = useCallback((id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clear = useCallback(() => setSelected(new Set()), []);

  const has = useCallback((id: number) => selected.has(id), [selected]);

  return { selected, toggle, clear, has, count: selected.size };
}
