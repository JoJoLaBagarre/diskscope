// Lightweight i18n core — no runtime dependency.

import { en, type TranslationKey } from "./en";
import { fr } from "./fr";

export type { TranslationKey };
export type Lang = "en" | "fr";

export const LANGUAGES: { id: Lang; label: string }[] = [
  { id: "en", label: "English" },
  { id: "fr", label: "Français" },
];

export const CATALOGS: Record<Lang, Record<TranslationKey, string>> = { en, fr };

/** Map an app language to a BCP-47 locale for Intl formatting. */
export function localeOf(lang: Lang): string {
  return lang === "fr" ? "fr-FR" : "en-US";
}

/** Replace {name} tokens in a template with values from `vars`. */
export function interpolate(
  template: string,
  vars?: Record<string, string | number>,
): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (m, key) =>
    key in vars ? String(vars[key]) : m,
  );
}

/** Pure translate function for a given language. */
export function translate(
  lang: Lang,
  key: TranslationKey,
  vars?: Record<string, string | number>,
): string {
  const catalog = CATALOGS[lang] ?? en;
  const template = catalog[key] ?? en[key] ?? key;
  return interpolate(template, vars);
}
