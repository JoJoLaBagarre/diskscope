import { useState } from "react";
import { useTranslation } from "../../i18n/context";
import { useUpdate } from "../../hooks/useUpdate";

/** Dismissible "update available" banner. Mounts its own silent update check;
 *  shows only when a newer signed release is found. */
export function UpdateBanner() {
  const { t } = useTranslation();
  const { state, downloadAndInstall } = useUpdate();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;
  if (state.kind === "downloading") {
    return (
      <div className="update-banner">
        <span>{t("options.installing", { percent: state.percent })}</span>
      </div>
    );
  }
  if (state.kind !== "available") return null;

  return (
    <div className="update-banner">
      <span>{t("update.bannerText", { version: state.version })}</span>
      <div className="update-banner-actions">
        <button className="btn btn-primary btn-sm" onClick={downloadAndInstall}>
          {t("update.bannerAction")}
        </button>
        <button className="btn btn-sm" onClick={() => setDismissed(true)}>
          {t("update.bannerDismiss")}
        </button>
      </div>
    </div>
  );
}
