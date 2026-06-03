import { useCallback, useEffect, useState } from "react";
import { confirmAsk, emptyRecycleBin, notify, recycleBinInfo, recycleBinSupported } from "../../api/tauri";
import { useTranslation } from "../../i18n/context";
import { useFormat } from "../../hooks/useFormat";
import { TrashIcon } from "./icons";

/** Button that empties the ENTIRE OS recycle bin, behind a confirmation showing
 *  item count + size. Hides itself on platforms where it isn't supported. */
export function EmptyRecycleBinButton({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation();
  const fmt = useFormat();
  const [supported, setSupported] = useState(false);
  const [info, setInfo] = useState<[number, number] | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setInfo(await recycleBinInfo());
    } catch {
      setInfo(null);
    }
  }, []);

  useEffect(() => {
    recycleBinSupported()
      .then((ok) => {
        setSupported(ok);
        if (ok) refresh();
      })
      .catch(() => setSupported(false));
  }, [refresh]);

  if (!supported) return null;

  const [count, bytes] = info ?? [0, 0];

  async function onClick() {
    const ok = await confirmAsk(
      t("bin.confirm", { count, size: fmt.bytes(bytes) }),
      t("bin.title"),
    );
    if (!ok) return;
    setBusy(true);
    try {
      await emptyRecycleBin();
      await notify(t("bin.done"), t("bin.title"));
      await refresh();
    } catch (e) {
      await notify(String(e), t("bin.title"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      className={`btn${compact ? "" : " btn-danger-soft"}`}
      onClick={onClick}
      disabled={busy}
      title={info ? t("bin.contains", { count, size: fmt.bytes(bytes) }) : undefined}
    >
      <TrashIcon />
      {t("bin.button")}
      {count > 0 && <span className="bin-count">{fmt.count(count)}</span>}
    </button>
  );
}
