import type { ScanEntry } from "../../types/models";
import { useTranslation } from "../../i18n/context";
import { useFormat } from "../../hooks/useFormat";
import { ChevronRight, FileIcon, FolderIcon, RevealIcon, TrashIcon } from "../common/icons";

export function EntryRow({
  entry,
  showPath = false,
  selected = false,
  onToggleSelect,
  onOpen,
  onReveal,
  onTrash,
}: {
  entry: ScanEntry;
  showPath?: boolean;
  selected?: boolean;
  onToggleSelect?: (entry: ScanEntry) => void;
  onOpen?: (entry: ScanEntry) => void;
  onReveal: (entry: ScanEntry) => void;
  onTrash: (entry: ScanEntry) => void;
}) {
  const { t } = useTranslation();
  const fmt = useFormat();
  const clickable = !!onOpen && entry.is_dir;

  return (
    <div
      className={`entry-row${clickable ? " clickable" : ""}${selected ? " selected" : ""}`}
      onClick={clickable ? () => onOpen!(entry) : undefined}
    >
      <div className="entry-name">
        <span className={`entry-icon ${entry.is_dir ? "dir" : "file"}`}>
          {entry.is_dir ? <FolderIcon /> : <FileIcon />}
        </span>
        <div className="entry-name-text">
          <span className="entry-title" title={entry.name}>
            {entry.name}
          </span>
          {showPath && (
            <span className="entry-sub" title={entry.path}>
              {entry.path}
            </span>
          )}
        </div>
        {clickable && (
          <span className="entry-chevron">
            <ChevronRight />
          </span>
        )}
      </div>

      <div className="entry-bar" aria-hidden>
        <div className="entry-bar-fill" style={{ width: `${Math.min(100, entry.percent)}%` }} />
      </div>
      <div className="entry-percent">{entry.percent.toFixed(1)}%</div>
      <div className="entry-size">{fmt.bytes(entry.size)}</div>
      <div className="entry-mtime">{fmt.date(entry.mtime)}</div>

      <div className="entry-actions" onClick={(e) => e.stopPropagation()}>
        <button
          className="icon-btn"
          title={t("action.reveal")}
          aria-label={t("action.reveal")}
          onClick={() => onReveal(entry)}
        >
          <RevealIcon />
        </button>
        <button
          className="icon-btn danger"
          title={t("action.trash")}
          aria-label={t("action.trash")}
          onClick={() => onTrash(entry)}
        >
          <TrashIcon />
        </button>
      </div>

      {/* Selection checkbox — stop propagation so it never triggers row open. */}
      <div className="entry-select" onClick={(e) => e.stopPropagation()}>
        {onToggleSelect && (
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelect(entry)}
            aria-label={entry.name}
          />
        )}
      </div>
    </div>
  );
}
