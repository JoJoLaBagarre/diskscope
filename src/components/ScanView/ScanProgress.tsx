import { useTranslation } from "../../i18n/context";
import { useFormat } from "../../hooks/useFormat";
import type { ScanProgress as Progress } from "../../types/models";

export function ScanProgress({
  progress,
  onCancel,
}: {
  progress: Progress | null;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const fmt = useFormat();
  return (
    <div className="scanning">
      <div className="scanning-card">
        <div className="spinner" />
        <h2>{t("scan.progressTitle")}</h2>

        <div className="scanning-stats">
          <div className="stat">
            <span className="stat-value">{fmt.count(progress?.files ?? 0)}</span>
            <span className="stat-label">{t("scan.files")}</span>
          </div>
          <div className="stat">
            <span className="stat-value">{fmt.count(progress?.dirs ?? 0)}</span>
            <span className="stat-label">{t("scan.folders")}</span>
          </div>
          <div className="stat">
            <span className="stat-value">{fmt.bytes(progress?.bytes ?? 0)}</span>
            <span className="stat-label">{t("scan.analyzed")}</span>
          </div>
        </div>

        <div className="progress-track">
          <div className="progress-indeterminate" />
        </div>

        <div className="scanning-current" title={progress?.current}>
          {progress?.current || " "}
        </div>

        <button className="btn" onClick={onCancel}>
          {t("common.cancel")}
        </button>
      </div>
    </div>
  );
}
