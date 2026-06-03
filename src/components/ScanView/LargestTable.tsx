import { useCallback, useEffect, useMemo, useState } from "react";
import { getLargest } from "../../api/tauri";
import { useTranslation } from "../../i18n/context";
import type { TranslationKey } from "../../i18n";
import type { ItemKind, ScanEntry } from "../../types/models";
import { useSelection } from "../../hooks/useSelection";
import { useTrashActions } from "../../hooks/useTrashActions";
import { VirtualTable } from "../common/VirtualTable";
import { SelectionBar } from "../common/SelectionBar";
import { EntryRow } from "./EntryRow";

const KINDS: { id: ItemKind; labelKey: TranslationKey }[] = [
  { id: "all", labelKey: "kind.all" },
  { id: "files", labelKey: "kind.files" },
  { id: "dirs", labelKey: "kind.folders" },
];

export function LargestTable() {
  const { t } = useTranslation();
  const [kind, setKind] = useState<ItemKind>("all");
  const [rows, setRows] = useState<ScanEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const sel = useSelection();

  useEffect(() => {
    let alive = true;
    setLoading(true);
    sel.clear();
    getLargest(kind, 500)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  const removeRows = useCallback((ids: number[]) => {
    const set = new Set(ids);
    setRows((rows) => rows.filter((r) => !set.has(r.id)));
    sel.clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { reveal, deleteOne, deleteMany, modal } = useTrashActions(removeRows);

  const selectedSize = useMemo(
    () => rows.filter((r) => sel.selected.has(r.id)).reduce((s, r) => s + r.size, 0),
    [rows, sel.selected],
  );

  function onDeleteSelected() {
    deleteMany(rows.filter((r) => sel.selected.has(r.id)));
  }

  return (
    <div className="results-body">
      <div className="toolbar">
        <div className="seg">
          {KINDS.map((k) => (
            <button
              key={k.id}
              className={`seg-btn${kind === k.id ? " active" : ""}`}
              onClick={() => setKind(k.id)}
            >
              {t(k.labelKey)}
            </button>
          ))}
        </div>
        <span className="muted">
          {loading ? t("common.loading") : t("common.elements", { count: rows.length })}
        </span>
      </div>

      {sel.count > 0 && (
        <SelectionBar
          count={sel.count}
          totalSize={selectedSize}
          onDelete={onDeleteSelected}
          onClear={sel.clear}
        />
      )}

      <div className="table">
        <div className="table-head">
          <div>{t("table.name")}</div>
          <div />
          <div className="right">{t("table.share")}</div>
          <div className="right">{t("table.size")}</div>
          <div className="right">{t("table.modified")}</div>
          <div />
          <div className="center">{t("table.select")}</div>
        </div>
        {rows.length === 0 && !loading ? (
          <div className="muted pad">{t("common.empty")}</div>
        ) : (
          <VirtualTable
            rows={rows}
            render={(e) => (
              <EntryRow
                entry={e}
                showPath
                selected={sel.has(e.id)}
                onToggleSelect={() => sel.toggle(e.id)}
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
