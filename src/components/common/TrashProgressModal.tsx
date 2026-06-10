import { useTranslation } from "../../i18n/context";
import { useElapsed } from "../../hooks/useElapsed";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import type { TrashProgress } from "../../types/models";

/** Determinate progress overlay shown during a large batch delete, so the user
 *  knows the app is working (not frozen) and how long it's taking. */
export function TrashProgressModal({
  progress,
  onCancel,
}: {
  progress: TrashProgress;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const ref = useFocusTrap<HTMLDivElement>();
  const elapsed = useElapsed(true);
  const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <div className="modal-backdrop">
      <div
        className="modal"
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="trash-progress-title"
      >
        <h2 className="modal-title" id="trash-progress-title">
          {t("trash.title")}
        </h2>

        <div className="trash-progress">
          <div
            className="progress-track"
            role="progressbar"
            aria-label={t("trash.title")}
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div className="progress-determinate" style={{ width: `${pct}%` }} />
          </div>
          <div className="trash-progress-stats">
            <span>{t("trash.progress", { done: progress.done, total: progress.total })}</span>
            <span>{t("trash.elapsed", { seconds: elapsed })}</span>
          </div>
          <div className="trash-current" title={progress.current}>
            {progress.current || " "}
          </div>
          {progress.failed > 0 && (
            <div className="trash-failed">{t("trash.failedNote", { count: progress.failed })}</div>
          )}
        </div>

        <div className="modal-actions">
          <button className="btn" onClick={onCancel}>
            {t("common.cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}
