import { useTranslation } from "../../i18n/context";
import { useFormat } from "../../hooks/useFormat";

/** Action bar shown above a table when one or more rows are selected. */
export function SelectionBar({
  count,
  totalSize,
  onDelete,
  onClear,
}: {
  count: number;
  totalSize: number;
  onDelete: () => void;
  onClear: () => void;
}) {
  const { t } = useTranslation();
  const fmt = useFormat();
  return (
    <div className="selection-bar">
      <span>{t("selection.summary", { count, size: fmt.bytes(totalSize) })}</span>
      <div className="selection-bar-actions">
        <button className="btn" onClick={onClear}>
          {t("selection.clear")}
        </button>
        <button className="btn btn-danger" onClick={onDelete}>
          {t("selection.delete")}
        </button>
      </div>
    </div>
  );
}
