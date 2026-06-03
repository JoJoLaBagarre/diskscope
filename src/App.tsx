import { useState } from "react";
import { Sidebar } from "./components/Layout/Sidebar";
import { TopBar } from "./components/Layout/TopBar";
import { ScanView } from "./components/ScanView/ScanView";
import { SearchView } from "./components/SearchView/SearchView";
import { AppsView } from "./components/AppsView/AppsView";
import { OptionsView } from "./components/OptionsView/OptionsView";
import { AboutView } from "./components/AboutView/AboutView";
import { UpdateBanner } from "./components/common/UpdateBanner";
import { useScan } from "./hooks/useScan";
import type { View } from "./types/models";

function App() {
  const [view, setView] = useState<View>("scan");
  // The scan lifecycle lives here, above the views, so an in-progress scan and
  // its progress survive switching tabs (you can leave and come back to it).
  const scan = useScan();

  return (
    <div className="app-shell">
      <Sidebar view={view} onChange={setView} scanning={scan.status === "scanning"} />
      <div className="main">
        <TopBar view={view} />
        <UpdateBanner />
        <div className="content">
          {view === "scan" && <ScanView scan={scan} />}
          {view === "search" && <SearchView />}
          {view === "apps" && <AppsView />}
          {view === "options" && <OptionsView />}
          {view === "about" && <AboutView />}
        </div>
      </div>
    </div>
  );
}

export default App;
