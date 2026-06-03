# DiskScope — User Guide

## Disk Analysis

1. Open **Disk Analysis** and pick a drive card, or **Browse a folder…** for a
   specific path.
2. A scan runs in the background — you can switch tabs and come back; a spinner on
   the sidebar shows it's still working.
3. When it finishes you get three views:
   - **Largest** — the biggest files/folders across the whole scan (filter by
     all / files / folders).
   - **Explorer** — drill down folder by folder with a breadcrumb; click column
     headers to sort by name, size or date.
   - **Treemap** — a zoomable map where rectangle area = size; click a folder to
     zoom in.
4. On any row: **reveal** in the file explorer, or **send to the Recycle Bin**.
5. Tick the checkboxes to **select multiple items**, then **Delete selection**.
   For large batches a progress window shows how many items are done and the
   elapsed time (the app stays responsive).

> **About sizes:** DiskScope reports **actual on-disk usage**. A sparse or
> compressed file (e.g. a VM image) counts for what it really occupies, which can
> be far less than its reported length — so totals match what deleting actually
> frees.

## Empty Recycle Bin

In the scan results toolbar, **Empty Recycle Bin** permanently clears the entire
Windows Recycle Bin (everything in it, from any app — not just DiskScope's
deletions). It shows the item count and size and asks for confirmation first.

## Search

The **Search** tab needs a completed analysis (it reuses the indexed tree).
Type to search — results are fuzzy, instant and ranked. Narrow with filters:
type, extension, size range, and modified-date range. Each result can be revealed
or sent to the Recycle Bin.

## Applications

Lists installed applications Windows reports (registry + Microsoft Store).
Filter by name/publisher, choose a specific **drive**, and sort by **name** or
**size**. **Uninstall** launches the app's own native uninstaller — DiskScope
first shows the **exact command** it will run and asks you to confirm; admin
rights (UAC) are requested when needed.

> Some system components and apps without an uninstaller are intentionally hidden.

## Options

- **Language** — English or French.
- **Appearance** — System, Light, or Dark.
- **Updates** — see your version and check for updates. When a newer signed
  release exists, DiskScope can download and install it, then relaunch.

Your language and theme are remembered between launches.
