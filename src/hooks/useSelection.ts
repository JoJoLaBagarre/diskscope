import { useCallback, useMemo, useState } from "react";

/** Tracks a set of selected rows and the running total of their sizes.
 *
 *  Sizes are stored alongside ids (`Map<id, size>`) so the selected total is a
 *  sum over the *selected* entries only — not a scan over every row in the table
 *  on each checkbox click, which on the 100k-row explorer was O(rows) per toggle. */
export function useSelection() {
  const [selected, setSelected] = useState<Map<number, number>>(() => new Map());

  const toggle = useCallback((id: number, size: number) => {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(id)) next.delete(id);
      else next.set(id, size);
      return next;
    });
  }, []);

  const clear = useCallback(() => setSelected(new Map()), []);

  const has = useCallback((id: number) => selected.has(id), [selected]);

  // Sum over the selected entries (bounded by selection size), recomputed only
  // when the selection changes — independent of the table's total row count.
  const totalSize = useMemo(() => {
    let sum = 0;
    for (const size of selected.values()) sum += size;
    return sum;
  }, [selected]);

  return { selected, toggle, clear, has, count: selected.size, totalSize };
}
