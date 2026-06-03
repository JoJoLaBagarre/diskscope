import { useEffect, useState } from "react";
import { listVolumes, pickFolder } from "../../api/tauri";
import { useTranslation } from "../../i18n/context";
import { useFormat } from "../../hooks/useFormat";
import type { VolumeInfo } from "../../types/models";

export function VolumePicker({
  onOpen,
  error,
}: {
  onOpen: (root: string) => void;
  error?: string | null;
}) {
  const { t } = useTranslation();
  const fmt = useFormat();
  const [volumes, setVolumes] = useState<VolumeInfo[] | null>(null);

  useEffect(() => {
    listVolumes()
      .then(setVolumes)
      .catch(() => setVolumes([]));
  }, []);

  async function browse() {
    const dir = await pickFolder();
    if (dir) onOpen(dir);
  }

  return (
    <div className="picker">
      <div className="picker-head">
        <h2>{t("picker.heading")}</h2>
        <p>{t("picker.subtitle")}</p>
      </div>

      {error && <div className="banner error">{error}</div>}

      <div className="volume-grid">
        {volumes === null && <div className="muted">{t("picker.loadingVolumes")}</div>}
        {volumes?.map((v) => {
          const used = Math.max(0, v.total_bytes - v.free_bytes);
          const pct = v.total_bytes > 0 ? (used / v.total_bytes) * 100 : 0;
          return (
            <button key={v.mount_point} className="volume-card" onClick={() => onOpen(v.mount_point)}>
              <div className="volume-top">
                <span className="volume-name">{v.name || v.mount_point}</span>
                <span className="volume-fs">{v.file_system}</span>
              </div>
              <div className="volume-mount">{v.mount_point}</div>
              <div className="volume-bar">
                <div className="volume-bar-fill" style={{ width: `${pct}%` }} />
              </div>
              <div className="volume-stats">
                <span>{t("picker.free", { size: fmt.bytes(v.free_bytes) })}</span>
                <span className="muted">{t("picker.outOf", { size: fmt.bytes(v.total_bytes) })}</span>
              </div>
            </button>
          );
        })}
      </div>

      <button className="btn" onClick={browse}>
        {t("picker.browse")}
      </button>
    </div>
  );
}
