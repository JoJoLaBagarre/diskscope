import { useCallback, useEffect, useState } from "react";
import { getChildren } from "../../api/tauri";
import { useTranslation } from "../../i18n/context";
import type { ScanEntry, SortKey } from "../../types/models";
import { useSelection } from "../../hooks/useSelection";
import { useTrashActions } from "../../hooks/useTrashActions";
import { VirtualTable } from "../common/VirtualTable";
import { SelectionBar } from "../common/SelectionBar";
import { EntryRow } from "./EntryRow";

type Crumb = { id: number | null; name: string };

export function TreeExplorer({ rootPath }: { rootPath: string }) {
  const { t } = useTranslation();
  const [stack, setStack] = useState<Crumb[]>([{ id: null, name: rootName(rootPath) }]);
  const [rows, setRows] = useState<ScanEntry[]>([]);
  const [sort, setSort] = useState<SortKey>("size");
  const [desc, setDesc] = useState(true);
  const [loading, setLoading] = useState(true);
  const sel = useSelection();
  // `clear` is referentially stable (useCallback in useSelection); destructure it
  // so the effect/callback can depend on it directly without pulling in the whole
  // (per-render) `sel` object and re-running on every render.
  const { clear: clearSel } = sel;

  const current = stack[stack.length - 1];

  useEffect(() => {
    let alive = true;
    setLoading(true);
    clearSel();
    getChildren(current.id, sort, desc, 100000, 0)
      .then((r) => {
        if (alive) {
          setRows(r);
          setLoading(false);
        }
      })
      .catch(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [current.id, sort, desc, clearSel]);

  const removeRows = useCallback(
    (ids: number[]) => {
      const set = new Set(ids);
      setRows((rows) => rows.filter((r) => !set.has(r.id)));
      clearSel();
    },
    [clearSel],
  );

  const { reveal, deleteOne, deleteMany, modal } = useTrashActions(removeRows);

  function openDir(e: ScanEntry) {
    setStack((s) => [...s, { id: e.id, name: e.name }]);
  }
  function goto(i: number) {
    setStack((s) => s.slice(0, i + 1));
  }
  function toggleSort(k: SortKey) {
    if (k === sort) {
      setDesc((d) => !d);
    } else {
      setSort(k);
      setDesc(k !== "name");
    }
  }
  function onDeleteSelected() {
    deleteMany(rows.filter((r) => sel.selected.has(r.id)));
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
          {loading ? t("common.loading") : t("common.elements", { count: rows.length })}
        </span>
      </div>

      {sel.count > 0 && (
        <SelectionBar
          count={sel.count}
          totalSize={sel.totalSize}
          onDelete={onDeleteSelected}
          onClear={sel.clear}
        />
      )}

      <div className="table">
        <div className="table-head">
          <button className="th" onClick={() => toggleSort("name")}>
            {t("table.name")} {arrow("name", sort, desc)}
          </button>
          <div />
          <div className="right">{t("table.share")}</div>
          <button className="th right" onClick={() => toggleSort("size")}>
            {t("table.size")} {arrow("size", sort, desc)}
          </button>
          <button className="th right" onClick={() => toggleSort("mtime")}>
            {t("table.modified")} {arrow("mtime", sort, desc)}
          </button>
          <div />
          <div className="center">{t("table.select")}</div>
        </div>
        {rows.length === 0 && !loading ? (
          <div className="muted pad">{t("explorer.empty")}</div>
        ) : (
          <VirtualTable
            rows={rows}
            getKey={(e) => e.id}
            render={(e) => (
              <EntryRow
                entry={e}
                selected={sel.has(e.id)}
                onToggleSelect={() => sel.toggle(e.id, e.size)}
                onOpen={openDir}
                onReveal={reveal}
                onTrash={deleteOne}
              />
            )}
          />
        )}
      </div>

      {modal}
    </div>
  );
}

function rootName(p: string): string {
  const trimmed = p.replace(/[\\/]+$/, "");
  const parts = trimmed.split(/[\\/]/);
  return parts[parts.length - 1] || p;
}

function arrow(col: SortKey, sort: SortKey, desc: boolean): string {
  if (col !== sort) return "";
  return desc ? "▾" : "▴";
}
