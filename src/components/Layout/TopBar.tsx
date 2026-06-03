import { useTranslation } from "../../i18n/context";
import type { TranslationKey } from "../../i18n";
import type { View } from "../../types/models";

const TITLE_KEYS: Record<View, TranslationKey> = {
  scan: "title.scan",
  search: "title.search",
  apps: "title.apps",
  options: "title.options",
  about: "title.about",
};

export function TopBar({ view }: { view: View }) {
  const { t } = useTranslation();
  return (
    <header className="topbar">
      <h1 className="topbar-title">{t(TITLE_KEYS[view])}</h1>
      <div className="topbar-actions" />
    </header>
  );
}
