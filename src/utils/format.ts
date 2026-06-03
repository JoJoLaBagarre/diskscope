// Display formatting helpers (base 1024). Locale-aware: byte units and number
// grouping follow the selected language. Components should prefer the
// `useFormat()` hook, which binds these to the current language automatically.

import type { Lang } from "../i18n";
import { localeOf } from "../i18n";

const UNITS: Record<Lang, string[]> = {
  en: ["B", "KB", "MB", "GB", "TB", "PB"],
  fr: ["o", "Ko", "Mo", "Go", "To", "Po"],
};

export function formatBytes(n: number, lang: Lang = "en"): string {
  const units = UNITS[lang] ?? UNITS.en;
  if (!Number.isFinite(n) || n <= 0) return `0 ${units[0]}`;
  const i = Math.min(units.length - 1, Math.floor(Math.log(n) / Math.log(1024)));
  const v = n / Math.pow(1024, i);
  const text = i === 0 ? String(Math.round(v)) : v.toFixed(v < 10 ? 1 : 0);
  return `${text} ${units[i]}`;
}

export function formatDate(secs?: number | null, lang: Lang = "en"): string {
  if (!secs) return "—";
  return new Date(secs * 1000).toLocaleDateString(localeOf(lang), {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Grouped integer, e.g. 12345 → "12,345" (en) / "12 345" (fr). */
export function formatCount(n: number, lang: Lang = "en"): string {
  return n.toLocaleString(localeOf(lang));
}
