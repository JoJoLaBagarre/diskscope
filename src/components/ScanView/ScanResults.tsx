import { useState } from "react";
import { exportScan, notify, pickExportPath } from "../../api/tauri";
import { useTranslation } from "../../i18n/context";
import { useFormat } from "../../hooks/useFormat";
import type { ExportFormat, ScanSummary } from "../../types/models";
import { EmptyRecycleBinButton } from "../common/EmptyRecycleBinButton";
import { Footnote } from "../common/Footnote";
import { Treemap } from "../Treemap/Treemap";
import { ExtensionTable } from "./ExtensionTable";
import { LargestTable } from "./LargestTable";
import { TreeExplorer } from "./TreeExplorer";

type Tab = "largest" | "explorer" | "types" | "treemap";

export function ScanResults({
  summary,
  onRescan,
  onChangeRoot,
}: {
  summary: ScanSummary;
  onRescan: () => void;
  onChangeRoot: () => void;
}) {
  const { t } = useTranslation();
  const fmt = useFormat();
  const [tab, setTab] = useState<Tab>("largest");

  async function onExport() {
    const dest = await pickExportPath("diskscope-export.csv");
    if (!dest) return;
    const format: ExportFormat = dest.toLowerCase().endsWith(".json") ? "json" : "csv";
    try {
      const count = await exportScan(dest, format);
      await notify(t("export.done", { count: fmt.count(count) }));
    } catch {
      await notify(t("export.error"));
    }
  }

  return (
    <div className="results">
      {/* Announce completion once for screen readers — the visual headline below
          conveys the same numbers to sighted users. */}
      <div className="sr-only" role="status">
        {t("results.complete", {
          size: fmt.bytes(summary.total_size),
          files: fmt.count(summary.file_count),
          folders: fmt.count(summary.dir_count),
        })}
      </div>

      <div className="results-header">
        <div className="results-headline">
          <div className="results-total">{fmt.bytes(summary.total_size)}</div>
          <div className="results-meta">
            <div className="results-root" title={summary.root_path}>
              {summary.root_path}
            </div>
            <div className="results-chips">
              <span>{t("results.files", { count: fmt.count(summary.file_count) })}</span>
              <span>{t("results.folders", { count: fmt.count(summary.dir_count) })}</span>
              {summary.errors > 0 && (
                <span
                  className="warn"
                  title={
                    summary.inaccessible.length > 0 ? summary.inaccessible.join("\n") : undefined
                  }
                >
                  {t("results.ignored", { count: fmt.count(summary.errors) })}
                </span>
              )}
              {summary.from_cache && (
                <span className="cache">
                  {t("results.cache", { date: fmt.date(summary.scanned_at) })}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="results-actions">
          <EmptyRecycleBinButton />
          <button className="btn" onClick={onExport}>
            {t("results.export")}
          </button>
          <button className="btn" onClick={onChangeRoot}>
            {t("results.changeTarget")}
          </button>
          <button className="btn btn-primary" onClick={onRescan}>
            {t("results.rescan")}
          </button>
        </div>
      </div>

      <div className="tabs">
        <button
          className={`tab${tab === "largest" ? " active" : ""}`}
          onClick={() => setTab("largest")}
        >
          {t("results.tabLargest")}
        </button>
        <button
          className={`tab${tab === "explorer" ? " active" : ""}`}
          onClick={() => setTab("explorer")}
        >
          {t("results.tabExplorer")}
        </button>
        <button
          className={`tab${tab === "types" ? " active" : ""}`}
          onClick={() => setTab("types")}
        >
          {t("results.tabTypes")}
        </button>
        <button
          className={`tab${tab === "treemap" ? " active" : ""}`}
          onClick={() => setTab("treemap")}
        >
          {t("results.tabTreemap")}
        </button>
      </div>

      {tab === "largest" && <LargestTable />}
      {tab === "explorer" && <TreeExplorer rootPath={summary.root_path} />}
      {tab === "types" && <ExtensionTable />}
      {tab === "treemap" && <Treemap rootPath={summary.root_path} />}

      <Footnote>{t("scan.footnote")}</Footnote>
    </div>
  );
}
