// Squarified treemap layout over one level of scan entries, via d3-hierarchy.
// We lay out a single level (the children of the current node) and let the user
// click to descend — this keeps each payload tiny even on multi-million-node
// trees while still giving the classic nested-rectangle feel as you zoom.

import { hierarchy, treemap, treemapSquarify } from "d3-hierarchy";
import type { ScanEntry } from "../../types/models";

export interface Tile {
  entry: ScanEntry;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Recursive node type fed to d3-hierarchy: a synthetic root holding one
 *  child per scan entry. */
interface TmNode {
  entry?: ScanEntry;
  children?: TmNode[];
}

export function computeTiles(
  entries: ScanEntry[],
  width: number,
  height: number,
): Tile[] {
  if (width <= 0 || height <= 0 || entries.length === 0) return [];

  const rootData: TmNode = { children: entries.map((entry) => ({ entry })) };

  const root = hierarchy<TmNode>(rootData)
    .sum((d) => (d.entry ? Math.max(0, d.entry.size) : 0))
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

  // `treemap()(root)` returns a HierarchyRectangularNode with x0/x1/y0/y1.
  const laid = treemap<TmNode>()
    .tile(treemapSquarify)
    .size([width, height])
    .paddingInner(2)
    .round(true)(root);

  const tiles: Tile[] = [];
  for (const leaf of laid.children ?? []) {
    const w = leaf.x1 - leaf.x0;
    const h = leaf.y1 - leaf.y0;
    // Skip slivers that can't render meaningfully.
    if (w < 1 || h < 1 || !leaf.data.entry) continue;
    tiles.push({ entry: leaf.data.entry, x: leaf.x0, y: leaf.y0, w, h });
  }
  return tiles;
}

// A calm categorical palette; directories get the saturated fills, files a
// muted grey-blue so the eye reads structure at a glance.
const DIR_COLORS = [
  "#3b82f6", "#6366f1", "#0ea5e9", "#14b8a6", "#8b5cf6",
  "#f59e0b", "#ef4444", "#ec4899", "#10b981", "#f97316",
];
const FILE_COLOR = "#9aa9bd";

export function tileColor(entry: ScanEntry, index: number): string {
  return entry.is_dir ? DIR_COLORS[index % DIR_COLORS.length] : FILE_COLOR;
}
