import { useEffect } from "react";
import type { InstalledApp } from "../../types/models";
import { useTranslation } from "../../i18n/context";
import { useFocusTrap } from "../../hooks/useFocusTrap";

/** Confirmation modal shown before any uninstall. Displays the exact command
 *  that will run and whether elevation (admin) will be requested. Nothing is
 *  executed until the user clicks the destructive confirm button. */
export function UninstallDialog({
  app,
  busy,
  onConfirm,
  onCancel,
}: {
  app: InstalledApp;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const ref = useFocusTrap<HTMLDivElement>();

  // Escape closes the dialog (unless an uninstall is already in flight).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onCancel]);

  return (
    <div className="modal-backdrop" onClick={busy ? undefined : onCancel}>
      <div
        className="modal"
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="uninstall-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="modal-title" id="uninstall-title">
          {t("uninstall.title", { name: app.name })}
        </h2>
        <p className="modal-text">{t("uninstall.body")}</p>

        <div className="cmd-preview">
          <div className="cmd-label">{t("uninstall.commandLabel")}</div>
          <code>{app.uninstall.preview}</code>
        </div>

        {app.uninstall.needs_elevation && (
          <div className="elevation-note">{t("uninstall.elevation")}</div>
        )}

        <div className="modal-actions">
          <button className="btn" onClick={onCancel} disabled={busy}>
            {t("common.cancel")}
          </button>
          <button className="btn btn-danger" onClick={onConfirm} disabled={busy}>
            {busy ? t("uninstall.running") : t("uninstall.confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}
