import { useEffect, useMemo, useState } from "react";
import { getChildren } from "../../api/tauri";
import type { ScanEntry } from "../../types/models";
import { useTranslation } from "../../i18n/context";
import { useElementSize } from "../../hooks/useElementSize";
import { useFormat } from "../../hooks/useFormat";
import { computeTiles, tileColor } from "./layout";

type Crumb = { id: number | null; name: string };

export function Treemap({ rootPath }: { rootPath: string }) {
  const { t } = useTranslation();
  const fmt = useFormat();
  const [stack, setStack] = useState<Crumb[]>([{ id: null, name: rootName(rootPath) }]);
  const [entries, setEntries] = useState<ScanEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [hover, setHover] = useState<ScanEntry | null>(null);
  const [box, size] = useElementSize<HTMLDivElement>();

  const current = stack[stack.length - 1];

  useEffect(() => {
    let alive = true;
    setLoading(true);
    // Cap the tile count — beyond a few hundred, rectangles are sub-pixel anyway.
    getChildren(current.id, "size", true, 300, 0)
      .then((r) => {
        if (alive) {
          setEntries(r);
          setLoading(false);
        }
      })
      .catch(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [current.id]);

  const tiles = useMemo(
    () => computeTiles(entries, size.width, size.height),
    [entries, size.width, size.height],
  );

  function onTileClick(e: ScanEntry) {
    if (e.is_dir && e.child_count > 0) {
      setStack((s) => [...s, { id: e.id, name: e.name }]);
    }
  }
  function goto(i: number) {
    setStack((s) => s.slice(0, i + 1));
  }

  return (
    <div className="results-body">
      <div className="toolbar">
        <div className="breadcrumb">
          {stack.map((c, i) => (
            <span key={i} className="crumb-wrap">
              <button className="crumb" disabled={i === stack.length - 1} onClick={() => goto(i)}>
                {c.name}
              </button>
              {i < stack.length - 1 && <span className="crumb-sep">/</span>}
            </span>
          ))}
        </div>
        <span className="muted">
          {hover
            ? `${hover.name} — ${fmt.bytes(hover.size)} (${hover.percent.toFixed(1)}%)`
            : t("treemap.hint")}
        </span>
      </div>

      <div className="treemap-box" ref={box}>
        {loading && <div className="treemap-overlay muted">{t("common.loading")}</div>}
        {!loading && tiles.length === 0 && (
          <div className="treemap-overlay muted">{t("treemap.emptyLevel")}</div>
        )}
        <svg width={size.width} height={size.height} className="treemap-svg">
          {tiles.map((tile, i) => {
            const interactive = tile.entry.is_dir && tile.entry.child_count > 0;
            const showLabel = tile.w > 46 && tile.h > 22;
            return (
              <g
                key={tile.entry.id}
                transform={`translate(${tile.x},${tile.y})`}
                className={interactive ? "tile interactive" : "tile"}
                role={interactive ? "button" : undefined}
                tabIndex={interactive ? 0 : undefined}
                aria-label={
                  interactive
                    ? t("treemap.tileLabel", {
                        name: tile.entry.name,
                        size: fmt.bytes(tile.entry.size),
                      })
                    : undefined
                }
                onClick={() => onTileClick(tile.entry)}
                onKeyDown={
                  interactive
                    ? (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onTileClick(tile.entry);
                        }
                      }
                    : undefined
                }
                onMouseEnter={() => setHover(tile.entry)}
                onMouseLeave={() => setHover((h) => (h === tile.entry ? null : h))}
                onFocus={() => setHover(tile.entry)}
                onBlur={() => setHover((h) => (h === tile.entry ? null : h))}
              >
                <rect
                  width={tile.w}
                  height={tile.h}
                  rx={3}
                  fill={tileColor(tile.entry, i)}
                  fillOpacity={hover === tile.entry ? 1 : 0.86}
                  className="tile-rect"
                  strokeWidth={1}
                />
                {showLabel && (
                  <>
                    <clipPath id={`clip-${tile.entry.id}`}>
                      <rect width={tile.w - 10} height={tile.h - 6} x={5} y={3} />
                    </clipPath>
                    <text
                      clipPath={`url(#clip-${tile.entry.id})`}
                      x={7}
                      y={16}
                      className="tile-label"
                    >
                      {tile.entry.name}
                    </text>
                    {tile.h > 38 && (
                      <text
                        clipPath={`url(#clip-${tile.entry.id})`}
                        x={7}
                        y={31}
                        className="tile-sublabel"
                      >
                        {fmt.bytes(tile.entry.size)}
                      </text>
                    )}
                  </>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function rootName(p: string): string {
  const trimmed = p.replace(/[\\/]+$/, "");
  const parts = trimmed.split(/[\\/]/);
  return parts[parts.length - 1] || p;
}
