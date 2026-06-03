import { useMemo } from "react";
import { useTranslation } from "../i18n/context";
import { formatBytes, formatCount, formatDate } from "../utils/format";

/** Formatting helpers bound to the current UI language. */
export function useFormat() {
  const { lang } = useTranslation();
  return useMemo(
    () => ({
      bytes: (n: number) => formatBytes(n, lang),
      count: (n: number) => formatCount(n, lang),
      date: (secs?: number | null) => formatDate(secs, lang),
    }),
    [lang],
  );
}
