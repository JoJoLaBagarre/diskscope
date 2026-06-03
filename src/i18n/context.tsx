import { createContext, useContext, useMemo } from "react";
import type { ReactNode } from "react";
import { translate, type Lang, type TranslationKey } from "./index";

export type TFunction = (
  key: TranslationKey,
  vars?: Record<string, string | number>,
) => string;

interface I18nValue {
  lang: Lang;
  t: TFunction;
}

const I18nContext = createContext<I18nValue | null>(null);

/** Provides `t()` bound to the current language. Re-renders the tree when
 *  `lang` changes (it's keyed off the Settings provider above it). */
export function I18nProvider({ lang, children }: { lang: Lang; children: ReactNode }) {
  const value = useMemo<I18nValue>(
    () => ({ lang, t: (key, vars) => translate(lang, key, vars) }),
    [lang],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useTranslation must be used within I18nProvider");
  return ctx;
}
