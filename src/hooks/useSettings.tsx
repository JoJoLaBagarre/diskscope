import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { Lang } from "../i18n";

export type Theme = "system" | "light" | "dark";

export interface Settings {
  language: Lang;
  theme: Theme;
}

const STORAGE_KEY = "diskscope.settings";
const DEFAULTS: Settings = { language: "en", theme: "system" };

/** Read persisted settings synchronously (called at module load so the first
 *  render already has the right language/theme — no flash). */
function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return {
      language: parsed.language === "fr" ? "fr" : "en",
      theme: parsed.theme === "light" || parsed.theme === "dark" ? parsed.theme : "system",
    };
  } catch {
    return DEFAULTS;
  }
}

/** Resolve "system" to a concrete light/dark using the OS preference. */
function resolveTheme(theme: Theme): "light" | "dark" {
  if (theme === "system") {
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return theme;
}

/** Apply the resolved theme to <html data-theme>. */
function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = resolveTheme(theme);
}

// Apply immediately at module load (before React mounts) to avoid any flash.
applyTheme(loadSettings().theme);

interface SettingsValue extends Settings {
  setLanguage: (lang: Lang) => void;
  setTheme: (theme: Theme) => void;
}

const SettingsContext = createContext<SettingsValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(loadSettings);

  // Persist + apply theme whenever settings change.
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    applyTheme(settings.theme);
  }, [settings]);

  // While following the system theme, react to OS changes live.
  useEffect(() => {
    if (settings.theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [settings.theme]);

  const setLanguage = useCallback((language: Lang) => setSettings((s) => ({ ...s, language })), []);
  const setTheme = useCallback((theme: Theme) => setSettings((s) => ({ ...s, theme })), []);

  return (
    <SettingsContext.Provider value={{ ...settings, setLanguage, setTheme }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}
