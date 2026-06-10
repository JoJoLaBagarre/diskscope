import { useEffect, useState } from "react";
import { appInfo } from "../../api/tauri";
import { useTranslation } from "../../i18n/context";
import type { TranslationKey } from "../../i18n";
import type { AppInfo } from "../../types/models";

const FEATURES: [TranslationKey, TranslationKey][] = [
  ["about.featScan", "about.featScanDesc"],
  ["about.featSearch", "about.featSearchDesc"],
  ["about.featApps", "about.featAppsDesc"],
];

const OS_LABELS: Record<string, string> = {
  windows: "Windows",
  linux: "Linux",
  macos: "macOS",
};

export function AboutView() {
  const { t } = useTranslation();
  const [info, setInfo] = useState<AppInfo | null>(null);

  useEffect(() => {
    appInfo()
      .then(setInfo)
      .catch(() => setInfo(null));
  }, []);

  return (
    <div className="about">
      <div className="about-head">
        <span className="about-mark">◆</span>
        <div>
          <h2>DiskScope</h2>
          <p className="muted">
            {t("about.tagline", { version: info ? `v${info.version}` : "…" })}
          </p>
        </div>
      </div>

      <div className="about-grid">
        {FEATURES.map(([titleKey, descKey]) => (
          <div key={titleKey} className="about-card">
            <h3>{t(titleKey)}</h3>
            <p>{t(descKey)}</p>
          </div>
        ))}
      </div>

      {info && (
        <div className="about-meta muted">
          <span>{t("about.system", { os: OS_LABELS[info.os] ?? info.os, arch: info.arch })}</span>
          <span>{t("about.builtWith")}</span>
        </div>
      )}
    </div>
  );
}
