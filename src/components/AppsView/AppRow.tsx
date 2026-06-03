import type { InstalledApp } from "../../types/models";
import { useTranslation } from "../../i18n/context";
import { useFormat } from "../../hooks/useFormat";

// Deterministic monogram tile color from the app name. We don't try to render
// the Windows `DisplayIcon` directly: those usually point at an .exe (which an
// <img> can't decode) and reading them would require enabling a broad asset
// protocol scope. A colored monogram is consistent, safe, and never breaks.
const TILE_COLORS = [
  "#2563eb", "#7c3aed", "#0ea5e9", "#0d9488", "#16a34a",
  "#ca8a04", "#dc2626", "#db2777", "#4f46e5", "#ea580c",
];

function colorFor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return TILE_COLORS[Math.abs(h) % TILE_COLORS.length];
}

export function AppRow({
  app,
  onUninstall,
}: {
  app: InstalledApp;
  onUninstall: (a: InstalledApp) => void;
}) {
  const { t } = useTranslation();
  const fmt = useFormat();
  const monogram = (app.name.trim().charAt(0) || "?").toUpperCase();

  return (
    <div className="app-row">
      <div className="app-icon" style={{ background: colorFor(app.name) }}>
        <span className="app-monogram">{monogram}</span>
      </div>

      <div className="app-main">
        <span className="app-name" title={app.name}>
          {app.name}
        </span>
        <span className="app-sub">
          {app.publisher || t("apps.publisherUnknown")}
          {app.version ? ` · v${app.version}` : ""}
          {app.source === "appx" ? ` · ${t("apps.store")}` : ""}
        </span>
      </div>

      <div className="app-size">
        {app.size_estimate ? fmt.bytes(app.size_estimate) : "—"}
      </div>

      <button className="btn btn-danger-soft" onClick={() => onUninstall(app)}>
        {t("apps.uninstall")}
      </button>
    </div>
  );
}
