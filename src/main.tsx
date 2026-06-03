import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { SettingsProvider, useSettings } from "./hooks/useSettings";
import { I18nProvider } from "./i18n/context";
import "./index.css";

/** Bridges the selected language from Settings into the i18n provider, so a
 *  language change re-renders the whole tree with new strings. */
function Root() {
  const { language } = useSettings();
  return (
    <I18nProvider lang={language}>
      <App />
    </I18nProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <SettingsProvider>
      <Root />
    </SettingsProvider>
  </React.StrictMode>,
);
