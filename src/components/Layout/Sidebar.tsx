import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { appInfo } from "../../api/tauri";
import { useTranslation } from "../../i18n/context";
import type { TranslationKey } from "../../i18n";
import type { AppInfo, View } from "../../types/models";

const NAV: { id: View; labelKey: TranslationKey; icon: ReactNode }[] = [
  {
    id: "scan",
    labelKey: "nav.scan",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="2" y="6" width="20" height="12" rx="2" />
        <circle cx="17" cy="12" r="1.3" fill="currentColor" stroke="none" />
        <line x1="6" y1="12" x2="12" y2="12" />
      </svg>
    ),
  },
  {
    id: "search",
    labelKey: "nav.search",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="11" cy="11" r="7" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    ),
  },
  {
    id: "apps",
    labelKey: "nav.apps",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    id: "options",
    labelKey: "nav.options",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
  {
    id: "about",
    labelKey: "nav.about",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="9" />
        <line x1="12" y1="11" x2="12" y2="16" />
        <line x1="12" y1="8" x2="12" y2="8" />
      </svg>
    ),
  },
];

export function Sidebar({
  view,
  onChange,
  scanning = false,
}: {
  view: View;
  onChange: (v: View) => void;
  scanning?: boolean;
}) {
  const { t } = useTranslation();
  const [info, setInfo] = useState<AppInfo | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    appInfo()
      .then(setInfo)
      .catch(() => setFailed(true));
  }, []);

  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-mark">◆</span>
        <span className="brand-name">DiskScope</span>
      </div>

      <nav className="nav">
        {NAV.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${view === item.id ? "active" : ""}`}
            onClick={() => onChange(item.id)}
          >
            {item.icon}
            <span>{t(item.labelKey)}</span>
            {item.id === "scan" && scanning && (
              <span
                className="nav-spinner"
                role="status"
                aria-label={t("shell.scanningTitle")}
                title={t("shell.scanningTitle")}
              />
            )}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        {info ? (
          <span className="ipc-ok">● {t("shell.ipcConnected", { version: info.version })}</span>
        ) : failed ? (
          <span className="ipc-err">● {t("shell.ipcUnavailable")}</span>
        ) : (
          <span>○ {t("shell.connecting")}</span>
        )}
      </div>
    </aside>
  );
}
