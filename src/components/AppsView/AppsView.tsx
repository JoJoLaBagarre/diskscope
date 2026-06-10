import { useMemo, useState } from "react";
import { notify, uninstallApp } from "../../api/tauri";
import { useApps } from "../../hooks/useApps";
import { useTranslation } from "../../i18n/context";
import { useFormat } from "../../hooks/useFormat";
import type { InstalledApp } from "../../types/models";
import { EmptyState } from "../common/EmptyState";
import { Footnote } from "../common/Footnote";
import { VirtualTable } from "../common/VirtualTable";
import { AppRow } from "./AppRow";
import { UninstallDialog } from "./UninstallDialog";

type AppSort = "name" | "size";

/** Drive letter (e.g. "C:") from an install location, or null if unknown. */
function driveOf(loc: string | null): string | null {
  if (!loc) return null;
  const m = /^([a-zA-Z]):/.exec(loc.trim());
  return m ? `${m[1].toUpperCase()}:` : null;
}

export function AppsView() {
  const { t } = useTranslation();
  const fmt = useFormat();
  const { apps, loading, error, reload } = useApps();
  const [filter, setFilter] = useState("");
  const [drive, setDrive] = useState("all");
  const [sort, setSort] = useState<AppSort>("size");
  const [desc, setDesc] = useState(true);
  const [target, setTarget] = useState<InstalledApp | null>(null);
  const [busy, setBusy] = useState(false);

  // Drives present among the apps' install locations, for the filter dropdown.
  const drives = useMemo(() => {
    const set = new Set<string>();
    for (const a of apps) {
      const d = driveOf(a.install_location);
      if (d) set.add(d);
    }
    return [...set].sort();
  }, [apps]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    let list = apps.filter((a) => {
      if (drive !== "all" && driveOf(a.install_location) !== drive) return false;
      if (!q) return true;
      return a.name.toLowerCase().includes(q) || (a.publisher?.toLowerCase().includes(q) ?? false);
    });
    list = [...list].sort((a, b) => {
      let c: number;
      if (sort === "name") c = a.name.toLowerCase().localeCompare(b.name.toLowerCase());
      else c = (a.size_estimate ?? 0) - (b.size_estimate ?? 0);
      return desc ? -c : c;
    });
    return list;
  }, [apps, filter, drive, sort, desc]);

  const totalSize = useMemo(
    () => filtered.reduce((sum, a) => sum + (a.size_estimate ?? 0), 0),
    [filtered],
  );

  function toggleSort(k: AppSort) {
    if (k === sort) setDesc((d) => !d);
    else {
      setSort(k);
      setDesc(k !== "name");
    }
  }

  async function confirmUninstall() {
    if (!target) return;
    setBusy(true);
    try {
      const outcome = await uninstallApp(target.id);
      await notify(
        outcome.message + (outcome.stderr ? `\n\n${outcome.stderr}` : ""),
        outcome.success ? t("uninstall.resultOk") : t("uninstall.resultFail"),
      );
      if (outcome.success) await reload();
    } catch (e) {
      await notify(String(e), t("uninstall.error"));
    } finally {
      setBusy(false);
      setTarget(null);
    }
  }

  if (error) {
    return (
      <EmptyState
        icon={
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="9" />
            <line x1="12" y1="8" x2="12" y2="13" />
            <line x1="12" y1="16.5" x2="12" y2="16.5" />
          </svg>
        }
        title={t("apps.unavailableTitle")}
      >
        <p>{error}</p>
        <button className="btn" onClick={reload}>
          {t("common.retry")}
        </button>
      </EmptyState>
    );
  }

  return (
    <div className="apps">
      <div className="apps-toolbar">
        <input
          className="apps-filter"
          placeholder={t("apps.filterPlaceholder")}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <select
          className="drive-select"
          value={drive}
          onChange={(e) => setDrive(e.target.value)}
          title={t("apps.allDrives")}
        >
          <option value="all">{t("apps.allDrives")}</option>
          {drives.map((d) => (
            <option key={d} value={d}>
              {t("apps.drive", { letter: d })}
            </option>
          ))}
        </select>
        <div className="apps-stats muted">
          {loading
            ? t("common.loading")
            : t("apps.stats", { count: fmt.count(filtered.length), size: fmt.bytes(totalSize) })}
        </div>
        <button className="btn" onClick={reload} disabled={loading}>
          {t("apps.refresh")}
        </button>
      </div>

      <div className="table">
        <div className="app-head">
          <div />
          <button className="th" onClick={() => toggleSort("name")}>
            {t("table.name")} {arrow("name", sort, desc)}
          </button>
          <button className="th right" onClick={() => toggleSort("size")}>
            {t("table.size")} {arrow("size", sort, desc)}
          </button>
          <div />
        </div>
        {loading ? (
          <div className="muted pad">{t("apps.enumerating")}</div>
        ) : filtered.length === 0 ? (
          <div className="muted pad">{t("apps.none")}</div>
        ) : (
          <VirtualTable
            rows={filtered}
            rowHeight={60}
            render={(a) => <AppRow app={a} onUninstall={setTarget} />}
          />
        )}
      </div>

      <Footnote>{t("apps.footnote")}</Footnote>

      {target && (
        <UninstallDialog
          app={target}
          busy={busy}
          onConfirm={confirmUninstall}
          onCancel={() => setTarget(null)}
        />
      )}
    </div>
  );
}

function arrow(col: AppSort, sort: AppSort, desc: boolean): string {
  if (col !== sort) return "";
  return desc ? "▾" : "▴";
}
