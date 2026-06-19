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

// `Intl.*Format` construction is comparatively expensive; cache one instance per
// language so the hot scroll path (every visible row formats a date + count on
// each render) reuses it instead of rebuilding the formatter each call.
const dateFormatters: Partial<Record<Lang, Intl.DateTimeFormat>> = {};
const countFormatters: Partial<Record<Lang, Intl.NumberFormat>> = {};

function dateFormatter(lang: Lang): Intl.DateTimeFormat {
  let f = dateFormatters[lang];
  if (!f) {
    f = new Intl.DateTimeFormat(localeOf(lang), {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    dateFormatters[lang] = f;
  }
  return f;
}

function countFormatter(lang: Lang): Intl.NumberFormat {
  let f = countFormatters[lang];
  if (!f) {
    f = new Intl.NumberFormat(localeOf(lang));
    countFormatters[lang] = f;
  }
  return f;
}

export function formatDate(secs?: number | null, lang: Lang = "en"): string {
  if (!secs) return "—";
  return dateFormatter(lang).format(new Date(secs * 1000));
}

/** Grouped integer, e.g. 12345 → "12,345" (en) / "12 345" (fr). */
export function formatCount(n: number, lang: Lang = "en"): string {
  return countFormatter(lang).format(n);
}
