import type { SearchHit } from "../../types/models";
import { useTranslation } from "../../i18n/context";
import { useFormat } from "../../hooks/useFormat";
import { FileIcon, FolderIcon, RevealIcon, TrashIcon } from "../common/icons";

export function SearchHitRow({
  hit,
  onReveal,
  onTrash,
}: {
  hit: SearchHit;
  onReveal: (h: SearchHit) => void;
  onTrash: (h: SearchHit) => void;
}) {
  const { t } = useTranslation();
  const fmt = useFormat();
  return (
    <div className="hit-row">
      <span className={`entry-icon ${hit.is_dir ? "dir" : "file"}`}>
        {hit.is_dir ? <FolderIcon /> : <FileIcon />}
      </span>
      <div className="hit-text">
        <span className="entry-title" title={hit.name}>
          {hit.name}
        </span>
        <span className="entry-sub" title={hit.path}>
          {hit.path}
        </span>
      </div>
      <div className="hit-size">{fmt.bytes(hit.size)}</div>
      <div className="hit-mtime">{fmt.date(hit.mtime)}</div>
      <div className="entry-actions">
        <button
          className="icon-btn"
          title={t("action.reveal")}
          aria-label={t("action.reveal")}
          onClick={() => onReveal(hit)}
        >
          <RevealIcon />
        </button>
        <button
          className="icon-btn danger"
          title={t("action.trash")}
          aria-label={t("action.trash")}
          onClick={() => onTrash(hit)}
        >
          <TrashIcon />
        </button>
      </div>
    </div>
  );
}
