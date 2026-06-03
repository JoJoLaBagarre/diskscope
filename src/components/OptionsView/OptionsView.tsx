import { useEffect, useState } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { appInfo } from "../../api/tauri";
import { REPO_URL } from "../../config";
import { useTranslation } from "../../i18n/context";
import { LANGUAGES, type Lang } from "../../i18n";
import { useSettings, type Theme } from "../../hooks/useSettings";
import { useUpdate } from "../../hooks/useUpdate";
import type { AppInfo } from "../../types/models";
import { SegmentedControl } from "../common/SegmentedControl";

export function OptionsView() {
  const { t } = useTranslation();
  const { language, setLanguage, theme, setTheme } = useSettings();
  const update = useUpdate();
  const [info, setInfo] = useState<AppInfo | null>(null);

  useEffect(() => {
    appInfo().then(setInfo).catch(() => setInfo(null));
  }, []);

  const themeOptions: { id: Theme; label: string }[] = [
    { id: "system", label: t("options.themeSystem") },
    { id: "light", label: t("options.themeLight") },
    { id: "dark", label: t("options.themeDark") },
  ];
  const langOptions = LANGUAGES.map((l) => ({ id: l.id as Lang, label: l.label }));

  return (
    <div className="options">
      <section className="option-row">
        <div className="option-label">
          <h3>{t("options.language")}</h3>
          <p>{t("options.languageDesc")}</p>
        </div>
        <SegmentedControl value={language} options={langOptions} onChange={setLanguage} />
      </section>

      <section className="option-row">
        <div className="option-label">
          <h3>{t("options.appearance")}</h3>
          <p>{t("options.appearanceDesc")}</p>
        </div>
        <SegmentedControl value={theme} options={themeOptions} onChange={setTheme} />
      </section>

      <section className="option-row">
        <div className="option-label">
          <h3>{t("options.updates")}</h3>
          <p>{info ? t("options.currentVersion", { version: info.version }) : ""}</p>
        </div>
        <div className="option-control">
          <UpdateControls update={update} />
        </div>
      </section>

      <section className="option-row">
        <div className="option-label">
          <h3>DiskScope</h3>
          <p>{t("about.builtWith")}</p>
        </div>
        <button className="btn" onClick={() => openUrl(REPO_URL).catch(() => {})}>
          {t("options.repoLink")}
        </button>
      </section>
    </div>
  );
}

function UpdateControls({ update }: { update: ReturnType<typeof useUpdate> }) {
  const { t } = useTranslation();
  const { state, checkForUpdate, downloadAndInstall } = update;

  if (state.kind === "downloading") {
    return <span className="muted">{t("options.installing", { percent: state.percent })}</span>;
  }
  if (state.kind === "available") {
    return (
      <div className="update-control">
        <span className="update-available">
          {t("options.updateAvailable", { version: state.version })}
        </span>
        <button className="btn btn-primary" onClick={downloadAndInstall}>
          {t("options.downloadInstall")}
        </button>
      </div>
    );
  }

  return (
    <div className="update-control">
      {state.kind === "none" && <span className="muted">{t("options.upToDate")}</span>}
      {state.kind === "error" && <span className="muted">{t("options.updateError")}</span>}
      <button
        className="btn"
        onClick={() => checkForUpdate(false)}
        disabled={state.kind === "checking"}
      >
        {state.kind === "checking" ? t("options.checking") : t("options.checkUpdates")}
      </button>
    </div>
  );
}
