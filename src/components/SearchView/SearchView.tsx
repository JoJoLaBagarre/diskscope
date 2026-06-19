import { useEffect, useState } from "react";
import { confirmAsk, notify, onSearchStale, revealPath, trashPath } from "../../api/tauri";
import { useSearch } from "../../hooks/useSearch";
import { useTranslation } from "../../i18n/context";
import { useFormat } from "../../hooks/useFormat";
import type { SearchHit } from "../../types/models";
import { EmptyState } from "../common/EmptyState";
import { VirtualTable } from "../common/VirtualTable";
import { FilterBar } from "./FilterBar";
import { SearchHitRow } from "./SearchHitRow";

export function SearchView() {
  const { t } = useTranslation();
  const fmt = useFormat();
  const s = useSearch();
  const [stale, setStale] = useState(false);

  useEffect(() => {
    let un: (() => void) | undefined;
    onSearchStale(() => setStale(true))
      .then((u) => (un = u))
      .catch(() => {});
    return () => un?.();
  }, []);

  async function onReveal(h: SearchHit) {
    try {
      await revealPath(h.path);
    } catch {
      /* ignore */
    }
  }
  async function onTrash(h: SearchHit) {
    const ok = await confirmAsk(
      t("action.confirmTrashOne", { path: h.path, size: fmt.bytes(h.size) }),
    );
    if (!ok) return;
    try {
      await trashPath(h.id);
      // Re-run by nudging the query state through the hook's effect.
      s.setQuery(s.query);
    } catch (err) {
      await notify(String(err));
    }
  }

  if (!s.ready && s.stats === null) {
    return (
      <EmptyState
        icon={
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        }
        title={t("search.needScanTitle")}
      >
        <p>{t("search.needScanBody")}</p>
      </EmptyState>
    );
  }

  const resultsLabel = s.loading
    ? t("search.searching")
    : s.hits.length >= s.limit
      ? t("search.resultsLimited", { count: fmt.count(s.hits.length), limit: fmt.count(s.limit) })
      : t("search.results", { count: fmt.count(s.hits.length) });

  return (
    <div className="search">
      <div className="search-bar">
        <span className="search-icon">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </span>
        <input
          autoFocus
          className="search-input"
          placeholder={t("search.placeholder")}
          value={s.query}
          onChange={(e) => s.setQuery(e.target.value)}
        />
        {s.query && (
          <button
            className="search-clear"
            onClick={() => s.setQuery("")}
            title={t("search.clear")}
            aria-label={t("search.clear")}
          >
            ✕
          </button>
        )}
      </div>

      <FilterBar filters={s.filters} onChange={s.setFilters} onReset={s.resetFilters} />

      {stale && <div className="banner warn-banner">{t("search.staleBanner")}</div>}

      <div className="search-meta">
        <span className="muted" role="status" aria-live="polite">
          {resultsLabel}
        </span>
        {s.stats && (
          <span className="muted">
            {t("search.indexed", { count: fmt.count(s.stats.indexed) })}
          </span>
        )}
      </div>

      <div className="table">
        {s.hits.length === 0 && !s.loading ? (
          <div className="muted pad">{t("search.noResults")}</div>
        ) : (
          <VirtualTable
            rows={s.hits}
            rowHeight={52}
            getKey={(h) => h.id}
            render={(h) => <SearchHitRow hit={h} onReveal={onReveal} onTrash={onTrash} />}
          />
        )}
      </div>
    </div>
  );
}
