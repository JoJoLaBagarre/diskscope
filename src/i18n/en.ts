// English catalog — the SOURCE OF TRUTH for translation keys.
// `TranslationKey` is derived from this object, and every other language is
// typed as `Record<TranslationKey, string>`, so a missing key is a COMPILE
// error. Keep keys flat and dotted (group.purpose). Use {placeholder} tokens
// for interpolation (filled by `interpolate()` in index.ts).

export const en = {
  // ----- navigation / shell -----
  "nav.scan": "Disk Analysis",
  "nav.search": "Search",
  "nav.apps": "Applications",
  "nav.options": "Options",
  "nav.about": "About",
  "shell.ipcConnected": "IPC connected · v{version}",
  "shell.ipcUnavailable": "IPC unavailable",
  "shell.connecting": "connecting…",
  "shell.scanningTitle": "Scan in progress",

  // ----- top bar titles -----
  "title.scan": "Disk Analysis",
  "title.search": "Search",
  "title.apps": "Installed Applications",
  "title.options": "Options",
  "title.about": "About",

  // ----- common -----
  "common.cancel": "Cancel",
  "common.loading": "Loading…",
  "common.retry": "Retry",
  "common.close": "Close",
  "common.reset": "Reset",
  "common.elements": "{count} items",
  "common.empty": "Nothing to show.",

  // ----- volume picker -----
  "picker.heading": "What would you like to analyze?",
  "picker.subtitle": "Choose a drive, or pick a specific folder.",
  "picker.loadingVolumes": "Loading volumes…",
  "picker.free": "{size} free",
  "picker.outOf": "of {size}",
  "picker.browse": "Browse a folder…",
  "picker.cancelled": "Scan cancelled.",
  "picker.volumesError": "Could not list drives. Use “Browse a folder” instead.",

  // ----- scan progress -----
  "scan.progressTitle": "Analyzing…",
  "scan.files": "files",
  "scan.folders": "folders",
  "scan.analyzed": "analyzed",

  // ----- scan results -----
  "results.changeTarget": "Change target",
  "results.rescan": "Re-scan",
  "results.files": "{count} files",
  "results.folders": "{count} folders",
  "results.ignored": "{count} skipped",
  "results.cache": "cache · {date}",
  "results.tabLargest": "Largest",
  "results.tabExplorer": "Explorer",
  "results.tabTreemap": "Treemap",
  "results.tabTypes": "By type",
  "results.export": "Export",
  "results.complete": "Analysis complete: {size}, {files} files, {folders} folders.",
  "results.emptyBin": "Empty Recycle Bin",

  // ----- by-type breakdown -----
  "types.type": "Type",
  "types.count": "Files",
  "types.noExt": "(no extension)",
  "types.empty": "No files to break down.",

  // ----- export -----
  "export.done": "Exported {count} entries.",
  "export.error": "Export failed.",

  // ----- table headers / kinds -----
  "table.name": "Name",
  "table.share": "Share",
  "table.size": "Size",
  "table.modified": "Modified",
  "table.select": "Sel.",
  "kind.all": "All",
  "kind.files": "Files",
  "kind.folders": "Folders",
  "explorer.empty": "Empty folder.",
  "treemap.hint": "Click a folder to zoom in",
  "treemap.emptyLevel": "Nothing to show at this level.",
  "treemap.tileLabel": "{name}, {size}",

  // ----- row actions -----
  "action.reveal": "Reveal in explorer",
  "action.trash": "Send to Recycle Bin",
  "action.confirmTrashOne": "Send to the Recycle Bin?\n\n{path}\n({size})",
  "action.confirmTrashMany": "Send {count} item(s) to the Recycle Bin?\n({size})",

  // ----- selection bar -----
  "selection.summary": "{count} item(s) selected · {size}",
  "selection.clear": "Clear",
  "selection.delete": "Delete selection",

  // ----- trash progress -----
  "trash.title": "Deleting…",
  "trash.progress": "{done} / {total} items",
  "trash.elapsed": "Elapsed: {seconds}s",
  "trash.failedNote": "{count} item(s) could not be deleted.",
  "trash.doneTitle": "Deletion complete",
  "trash.doneSummary": "{removed} item(s) deleted{failed}.",
  "trash.doneFailedSuffix": ", {count} failed",

  // ----- search -----
  "search.placeholder": "Search for a file or folder…",
  "search.needScanTitle": "Run an analysis first",
  "search.needScanBody":
    "Search uses the tree indexed during an analysis. Open the “Disk Analysis” tab and scan a drive or folder, then come back here for instant fuzzy search.",
  "search.clear": "Clear",
  "search.results": "{count} result(s)",
  "search.resultsLimited": "{count} result(s) (limited to {limit})",
  "search.searching": "Searching…",
  "search.indexed": "{count} items indexed",
  "search.staleBanner":
    "Changes were detected on disk — results may be out of date. Re-run an analysis to refresh.",
  "search.noResults": "No results.",

  // ----- search filters -----
  "filter.extension": "Extension",
  "filter.extensionPlaceholder": "pdf, jpg…",
  "filter.sizeMB": "Size (MB)",
  "filter.min": "min",
  "filter.max": "max",
  "filter.modifiedAfter": "Modified after",
  "filter.modifiedBefore": "before",

  // ----- applications -----
  "apps.filterPlaceholder": "Filter applications…",
  "apps.allDrives": "All drives",
  "apps.drive": "Drive {letter}",
  "apps.stats": "{count} applications · {size}",
  "apps.refresh": "Refresh",
  "apps.enumerating": "Enumerating installed applications…",
  "apps.none": "No applications.",
  "apps.unavailableTitle": "Applications unavailable",
  "apps.uninstall": "Uninstall",
  "apps.publisherUnknown": "Unknown publisher",
  "apps.store": "Store",
  "apps.footnote":
    "* Shows applications Windows reports (registry + Microsoft Store). Some system components and apps without an uninstaller are intentionally hidden.",

  // ----- uninstall dialog -----
  "uninstall.title": "Uninstall “{name}”?",
  "uninstall.body": "The system's native uninstaller will run. This action is irreversible.",
  "uninstall.commandLabel": "Command to run",
  "uninstall.elevation": "⚠ Administrator rights will be requested (UAC).",
  "uninstall.confirm": "Uninstall",
  "uninstall.running": "Uninstalling…",
  "uninstall.resultOk": "Uninstall",
  "uninstall.resultFail": "Failed",
  "uninstall.error": "Error",

  // ----- empty recycle bin -----
  "bin.button": "Empty Recycle Bin",
  "bin.confirm":
    "Empty the entire Windows Recycle Bin?\n\nThis permanently deletes everything in it ({count} item(s), {size}) — not just files removed by DiskScope.",
  "bin.empty": "The Recycle Bin is already empty.",
  "bin.done": "Recycle Bin emptied.",
  "bin.title": "Recycle Bin",
  "bin.contains": "Recycle Bin: {count} item(s) · {size}",
  "bin.unsupported": "Emptying the Recycle Bin is only supported on Windows.",

  // ----- scan footnote -----
  "scan.footnote":
    "* Sizes reflect actual on-disk usage. Sparse or compressed files (e.g. VM images) count for what they really occupy, which can be far less than their reported length.",

  // ----- options -----
  "options.language": "Language",
  "options.languageDesc": "Interface language.",
  "options.appearance": "Appearance",
  "options.appearanceDesc": "Color theme.",
  "options.themeSystem": "System",
  "options.themeLight": "Light",
  "options.themeDark": "Dark",
  "options.maintenance": "Maintenance",
  "options.maintenanceDesc": "Free up space on your machine.",
  "options.updates": "Updates",
  "options.currentVersion": "Current version: {version}",
  "options.checkUpdates": "Check for updates",
  "options.checking": "Checking…",
  "options.upToDate": "DiskScope is up to date.",
  "options.updateAvailable": "Version {version} is available.",
  "options.downloadInstall": "Download & install",
  "options.installing": "Installing… {percent}%",
  "options.updateError": "Could not check for updates.",
  "options.repoLink": "View project on GitHub",

  // ----- update banner -----
  "update.bannerText": "DiskScope {version} is available.",
  "update.bannerAction": "Update",
  "update.bannerDismiss": "Later",

  // ----- about -----
  "about.tagline": "Disk space analysis, search and uninstallation — {version}",
  "about.featScan": "Disk Analysis",
  "about.featScanDesc": "Parallel traversal, largest items, tree explorer and a zoomable treemap.",
  "about.featSearch": "Search",
  "about.featSearchDesc": "Instant fuzzy search with type / extension / size / date filters.",
  "about.featApps": "Applications",
  "about.featAppsDesc":
    "Uninstall via the system's native uninstaller, with confirmation and command preview.",
  "about.system": "System: {os} ({arch})",
  "about.builtWith": "Built with Tauri 2 · React · Rust",
} as const;

export type TranslationKey = keyof typeof en;
