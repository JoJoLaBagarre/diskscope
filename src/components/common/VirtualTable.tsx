import { useRef } from "react";
import type { ReactNode } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

/** Virtualized vertical list — renders only visible rows, so it stays smooth
 *  with 100k+ entries. The caller supplies a render function per item. */
export function VirtualTable<T>({
  rows,
  rowHeight = 46,
  render,
  getKey,
}: {
  rows: T[];
  rowHeight?: number;
  render: (item: T, index: number) => ReactNode;
  /** Stable identity per row (e.g. `(e) => e.id`). When provided, React and the
   *  virtualizer key rows by identity instead of index, so a re-sort or deletion
   *  re-associates DOM nodes correctly instead of reusing them by position. */
  getKey?: (item: T, index: number) => string | number;
}) {
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 14,
    getItemKey: getKey ? (index) => getKey(rows[index], index) : undefined,
  });

  return (
    <div ref={parentRef} className="vtable-scroll">
      <div style={{ height: virtualizer.getTotalSize(), position: "relative", width: "100%" }}>
        {virtualizer.getVirtualItems().map((vi) => (
          <div
            key={vi.key}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: vi.size,
              transform: `translateY(${vi.start}px)`,
            }}
          >
            {render(rows[vi.index], vi.index)}
          </div>
        ))}
      </div>
    </div>
  );
}
