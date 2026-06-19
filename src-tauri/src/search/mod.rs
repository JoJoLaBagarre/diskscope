//! Fuzzy search over scanned entries.
//!
//! The index is a flat list derived from the scan arena (no extra traversal).
//! Matching uses `nucleo-matcher` — the same scoring engine the Helix editor
//! uses — run in parallel with `rayon`, one matcher per worker thread. Because
//! the index is cheap to rebuild from the (cached) scan, we don't persist it
//! separately: loading the scan cache and rebuilding gives instant search at
//! next launch.

pub mod watcher;

use nucleo_matcher::pattern::{CaseMatching, Normalization, Pattern};
use nucleo_matcher::{Config, Matcher, Utf32Str};
use rayon::prelude::*;
use serde::Serialize;

use crate::scan::{ItemKind, ScanResult};

/// One indexed entry (mirrors the relevant fields of a scan `Node`).
#[derive(Debug, Clone)]
pub struct IndexEntry {
    pub id: usize,
    pub name: String,
    pub path: String,
    pub size: u64,
    pub is_dir: bool,
    pub mtime: Option<u64>,
    /// Lowercased extension without the dot, for files only.
    pub ext: Option<String>,
}

impl IndexEntry {
    fn to_hit(&self, score: u32) -> SearchHit {
        SearchHit {
            id: self.id,
            name: self.name.clone(),
            path: self.path.clone(),
            size: self.size,
            is_dir: self.is_dir,
            mtime: self.mtime,
            score,
        }
    }
}

/// One search result row sent to the frontend.
#[derive(Debug, Clone, Serialize)]
pub struct SearchHit {
    pub id: usize,
    pub name: String,
    pub path: String,
    pub size: u64,
    pub is_dir: bool,
    pub mtime: Option<u64>,
    pub score: u32,
}

/// Filters applied before (and independent of) fuzzy scoring.
#[derive(Debug, Clone, Default)]
pub struct SearchFilters {
    pub kind: Option<ItemKind>,
    /// Lowercased extension without the dot.
    pub ext: Option<String>,
    pub min_size: Option<u64>,
    pub max_size: Option<u64>,
    pub modified_after: Option<u64>,
    pub modified_before: Option<u64>,
}

impl SearchFilters {
    fn matches(&self, e: &IndexEntry) -> bool {
        if let Some(kind) = self.kind {
            let ok = match kind {
                ItemKind::Files => !e.is_dir,
                ItemKind::Dirs => e.is_dir,
                ItemKind::All => true,
            };
            if !ok {
                return false;
            }
        }
        if let Some(want) = &self.ext {
            // Extension filtering only makes sense for files.
            match &e.ext {
                Some(x) if x == want => {}
                _ => return false,
            }
        }
        if let Some(min) = self.min_size {
            if e.size < min {
                return false;
            }
        }
        if let Some(max) = self.max_size {
            if e.size > max {
                return false;
            }
        }
        if let Some(after) = self.modified_after {
            match e.mtime {
                Some(t) if t >= after => {}
                _ => return false,
            }
        }
        if let Some(before) = self.modified_before {
            match e.mtime {
                Some(t) if t <= before => {}
                _ => return false,
            }
        }
        true
    }
}

#[derive(Debug)]
pub struct SearchIndex {
    entries: Vec<IndexEntry>,
}

impl SearchIndex {
    pub fn len(&self) -> usize {
        self.entries.len()
    }

    /// Build the index from a scan result (skips the root and trashed entries).
    pub fn build(res: &ScanResult) -> Self {
        let entries = res
            .nodes
            .iter()
            .enumerate()
            .filter(|(i, n)| !n.removed && *i != res.root)
            .map(|(i, n)| IndexEntry {
                id: i,
                name: n.name.clone(),
                path: n.path.to_string_lossy().to_string(),
                size: n.size,
                is_dir: n.is_dir,
                mtime: n.mtime,
                ext: ext_of(&n.name, n.is_dir),
            })
            .collect();
        Self { entries }
    }

    /// Run a query. An empty query returns filtered entries sorted by size, so
    /// the filters are usable on their own.
    pub fn query(&self, raw: &str, f: &SearchFilters, limit: usize) -> Vec<SearchHit> {
        /// Cap on query length handed to the fuzzy matcher. Guards against a
        /// pathological input (e.g. a multi-megabyte paste) driving the parser
        /// into pathological work; far longer than any real file-name query.
        const MAX_QUERY_LEN: usize = 1024;

        let trimmed = raw.trim();
        // Truncate on a char boundary so multi-byte UTF-8 can never panic, and
        // only allocate in the rare over-length case.
        let truncated: String;
        let q: &str = match trimmed.char_indices().nth(MAX_QUERY_LEN) {
            Some((byte_idx, _)) => {
                truncated = trimmed[..byte_idx].to_string();
                &truncated
            }
            None => trimmed,
        };

        if q.is_empty() {
            let mut v: Vec<&IndexEntry> =
                self.entries.par_iter().filter(|e| f.matches(e)).collect();
            v.par_sort_unstable_by(|a, b| b.size.cmp(&a.size));
            return v.into_iter().take(limit).map(|e| e.to_hit(0)).collect();
        }

        let pattern = Pattern::parse(q, CaseMatching::Smart, Normalization::Smart);

        // (index, score, name_match): a basename hit is the strongest signal and
        // always outranks a path-only hit.
        let mut scored: Vec<(usize, u32, bool)> = self
            .entries
            .par_iter()
            .enumerate()
            .filter(|(_, e)| f.matches(e))
            .map_init(
                || (Matcher::new(Config::DEFAULT), Vec::<char>::new()),
                |(matcher, buf), (i, e)| {
                    // Score the basename first; only fall back to the full path
                    // when the name misses, so queries like "node_modules/react"
                    // or "AppData/Local/Temp" can locate an entry by its folder
                    // too — a core expectation of a disk tool.
                    let name_score = {
                        let hay = Utf32Str::new(&e.name, buf);
                        pattern.score(hay, matcher)
                    };
                    if let Some(s) = name_score {
                        return Some((i, s, true));
                    }
                    let path_score = {
                        let hay = Utf32Str::new(&e.path, buf);
                        pattern.score(hay, matcher)
                    };
                    path_score.map(|s| (i, s, false))
                },
            )
            .flatten()
            .collect();

        // Name matches first, then best score, then larger size.
        scored.par_sort_unstable_by(|a, b| {
            b.2.cmp(&a.2)
                .then_with(|| b.1.cmp(&a.1))
                .then_with(|| self.entries[b.0].size.cmp(&self.entries[a.0].size))
        });

        scored
            .into_iter()
            .take(limit)
            .map(|(i, s, _)| self.entries[i].to_hit(s))
            .collect()
    }
}

fn ext_of(name: &str, is_dir: bool) -> Option<String> {
    if is_dir {
        return None;
    }
    let dot = name.rfind('.')?;
    // Ignore dotfiles like ".gitignore" (leading dot, nothing before it).
    if dot == 0 {
        return None;
    }
    let ext = &name[dot + 1..];
    if ext.is_empty() {
        None
    } else {
        Some(ext.to_lowercase())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn entry(id: usize, name: &str, size: u64, is_dir: bool, mtime: Option<u64>) -> IndexEntry {
        IndexEntry {
            id,
            name: name.to_string(),
            path: format!("/x/{name}"),
            size,
            is_dir,
            mtime,
            ext: ext_of(name, is_dir),
        }
    }

    fn index() -> SearchIndex {
        SearchIndex {
            entries: vec![
                entry(0, "report_final.pdf", 1000, false, Some(100)),
                entry(1, "report_draft.docx", 500, false, Some(200)),
                entry(2, "photos", 5000, true, None),
                entry(3, "vacation_photo.jpg", 2000, false, Some(300)),
                entry(4, "notes.txt", 50, false, Some(400)),
            ],
        }
    }

    #[test]
    fn fuzzy_finds_and_ranks() {
        let hits = index().query("report", &SearchFilters::default(), 10);
        assert!(hits.len() >= 2);
        assert!(hits[0].name.contains("report"));
    }

    #[test]
    fn empty_query_sorts_by_size() {
        let hits = index().query("  ", &SearchFilters::default(), 10);
        assert_eq!(hits.first().unwrap().name, "photos"); // largest (5000)
    }

    #[test]
    fn filter_files_only() {
        let f = SearchFilters {
            kind: Some(ItemKind::Files),
            ..Default::default()
        };
        let hits = index().query("", &f, 10);
        assert!(hits.iter().all(|h| !h.is_dir));
    }

    #[test]
    fn filter_by_extension() {
        let f = SearchFilters {
            ext: Some("jpg".into()),
            ..Default::default()
        };
        let hits = index().query("", &f, 10);
        assert_eq!(hits.len(), 1);
        assert_eq!(hits[0].name, "vacation_photo.jpg");
    }

    #[test]
    fn filter_by_size_range() {
        let f = SearchFilters {
            min_size: Some(600),
            ..Default::default()
        };
        let hits = index().query("", &f, 10);
        assert!(hits.iter().all(|h| h.size >= 600));
    }

    #[test]
    fn extension_parsing() {
        assert_eq!(ext_of("a.PDF", false), Some("pdf".into()));
        assert_eq!(ext_of(".gitignore", false), None);
        assert_eq!(ext_of("noext", false), None);
        assert_eq!(ext_of("folder.thing", true), None);
    }

    #[test]
    fn matches_path_when_name_does_not() {
        let idx = SearchIndex {
            entries: vec![
                IndexEntry {
                    id: 0,
                    name: "main.rs".into(),
                    path: "/proj/node_modules/main.rs".into(),
                    size: 10,
                    is_dir: false,
                    mtime: None,
                    ext: Some("rs".into()),
                },
                IndexEntry {
                    id: 1,
                    name: "readme.md".into(),
                    path: "/proj/src/readme.md".into(),
                    size: 20,
                    is_dir: false,
                    mtime: None,
                    ext: Some("md".into()),
                },
            ],
        };
        // "node_modules" appears only in entry 0's path, not in any basename.
        let hits = idx.query("node_modules", &SearchFilters::default(), 10);
        assert_eq!(hits.len(), 1);
        assert_eq!(hits[0].id, 0);
    }

    #[test]
    fn name_match_outranks_path_match() {
        let idx = SearchIndex {
            entries: vec![
                IndexEntry {
                    id: 0,
                    name: "app.tsx".into(),
                    path: "/proj/src/app.tsx".into(),
                    size: 9999,
                    is_dir: false,
                    mtime: None,
                    ext: Some("tsx".into()),
                },
                IndexEntry {
                    id: 1,
                    name: "src".into(),
                    path: "/proj/src".into(),
                    size: 1,
                    is_dir: true,
                    mtime: None,
                    ext: None,
                },
            ],
        };
        // The folder literally named "src" (name match) ranks above the much
        // larger file that only has "src" in its path.
        let hits = idx.query("src", &SearchFilters::default(), 10);
        assert_eq!(hits[0].id, 1);
    }
}
