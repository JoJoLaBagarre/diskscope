import { useTranslation } from "../../i18n/context";
import type { TranslationKey } from "../../i18n";
import type { ItemKind, SearchFilters } from "../../types/models";

const KINDS: { id: ItemKind; labelKey: TranslationKey }[] = [
  { id: "all", labelKey: "kind.all" },
  { id: "files", labelKey: "kind.files" },
  { id: "dirs", labelKey: "kind.folders" },
];

export function FilterBar({
  filters,
  onChange,
  onReset,
}: {
  filters: SearchFilters;
  onChange: (f: SearchFilters) => void;
  onReset: () => void;
}) {
  const { t } = useTranslation();
  const set = <K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) =>
    onChange({ ...filters, [key]: value });

  const dirty =
    filters.kind !== "all" ||
    filters.ext !== "" ||
    filters.minSizeMB !== "" ||
    filters.maxSizeMB !== "" ||
    filters.modifiedAfter !== "" ||
    filters.modifiedBefore !== "";

  return (
    <div className="filterbar">
      <div className="seg">
        {KINDS.map((k) => (
          <button
            key={k.id}
            className={`seg-btn${filters.kind === k.id ? " active" : ""}`}
            onClick={() => set("kind", k.id)}
          >
            {t(k.labelKey)}
          </button>
        ))}
      </div>

      <label className="filter-field">
        <span>{t("filter.extension")}</span>
        <input
          type="text"
          placeholder={t("filter.extensionPlaceholder")}
          value={filters.ext}
          disabled={filters.kind === "dirs"}
          onChange={(e) => set("ext", e.target.value.trim())}
          style={{ width: 90 }}
        />
      </label>

      <label className="filter-field">
        <span>{t("filter.sizeMB")}</span>
        <div className="range">
          <input
            type="number"
            min={0}
            placeholder={t("filter.min")}
            value={filters.minSizeMB}
            onChange={(e) => set("minSizeMB", e.target.value)}
          />
          <span className="dash">–</span>
          <input
            type="number"
            min={0}
            placeholder={t("filter.max")}
            value={filters.maxSizeMB}
            onChange={(e) => set("maxSizeMB", e.target.value)}
          />
        </div>
      </label>

      <label className="filter-field">
        <span>{t("filter.modifiedAfter")}</span>
        <input
          type="date"
          value={filters.modifiedAfter}
          onChange={(e) => set("modifiedAfter", e.target.value)}
        />
      </label>

      <label className="filter-field">
        <span>{t("filter.modifiedBefore")}</span>
        <input
          type="date"
          value={filters.modifiedBefore}
          onChange={(e) => set("modifiedBefore", e.target.value)}
        />
      </label>

      {dirty && (
        <button className="btn link-btn" onClick={onReset}>
          {t("common.reset")}
        </button>
      )}
    </div>
  );
}
