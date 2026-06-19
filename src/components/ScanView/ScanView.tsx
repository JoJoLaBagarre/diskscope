import type { useScan } from "../../hooks/useScan";
import { useTranslation } from "../../i18n/context";
import { ScanProgress } from "./ScanProgress";
import { ScanResults } from "./ScanResults";
import { VolumePicker } from "./VolumePicker";

type ScanController = ReturnType<typeof useScan>;

export function ScanView({ scan }: { scan: ScanController }) {
  const { t } = useTranslation();
  const { status, progress, summary, error, open, cancel, reset } = scan;

  if (status === "scanning") {
    return <ScanProgress progress={progress} onCancel={cancel} />;
  }

  if (status === "done" && summary) {
    return (
      <ScanResults
        summary={summary}
        onRescan={() => scan.scan(summary.root_path)}
        onChangeRoot={reset}
      />
    );
  }

  return (
    <VolumePicker
      onOpen={open}
      error={error ?? (status === "cancelled" ? t("picker.cancelled") : null)}
    />
  );
}
