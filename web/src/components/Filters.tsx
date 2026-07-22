import { X } from "lucide-react";
import type { ProgramCategory } from "@lib/types";
import { ALL_FEATURE_CODES, featureLabel, PROGRAM_CATEGORY_LABEL } from "@lib/format";
import type { UiState } from "@lib/searchParams";

type CriteriaPatch = Partial<UiState["criteria"]>;

const RADII = [25, 50, 100, 150, 250, 300, 400, 500, 600, 800, 1000, 1500, 2000];
const ALL_CATEGORIES = Object.keys(PROGRAM_CATEGORY_LABEL) as ProgramCategory[];

export default function Filters({
  criteria,
  text,
  states,
  onPatch,
  onText,
  onClearAll,
}: {
  criteria: UiState["criteria"];
  text: string;
  states: string[];
  onPatch: (patch: CriteriaPatch) => void;
  onText: (value: string) => void;
  onClearAll: () => void;
}) {
  const features = criteria.features ?? [];
  const toggleFeature = (f: string) =>
    onPatch({
      features: features.includes(f) ? features.filter((x) => x !== f) : [...features, f],
    });
  const categories = criteria.categories ?? [];
  const toggleCategory = (cat: ProgramCategory) =>
    onPatch({
      categories: categories.includes(cat)
        ? categories.filter((x) => x !== cat)
        : [...categories, cat],
    });

  const activeCount =
    (criteria.zip ? 1 : 0) +
    (criteria.state ? 1 : 0) +
    features.length +
    categories.length +
    (text ? 1 : 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-h3 text-ink">Filters</h2>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={onClearAll}
            className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink"
          >
            <X size={14} aria-hidden="true" /> Clear all
          </button>
        )}
      </div>

      <label className="flex flex-col gap-1 text-sm font-semibold text-ink">
        Search by name
        <input
          type="search"
          value={text}
          onChange={(e) => onText(e.target.value)}
          placeholder="Camp or council name"
          data-lpignore="true"
          autoComplete="off"
          className="cf-tap rounded-md border border-border bg-surface px-3 text-body font-normal"
        />
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-semibold text-ink">Distance</legend>
        <div className="flex gap-2">
          <input
            type="text"
            name="near-code"
            inputMode="numeric"
            maxLength={5}
            value={criteria.zip ?? ""}
            onChange={(e) => onPatch({ zip: e.target.value.replace(/\D/g, "").slice(0, 5) || undefined })}
            placeholder="97405"
            aria-label="Distance origin, 5-digit code"
            autoComplete="off"
            data-lpignore="true"
            data-form-type="other"
            className="cf-tap w-28 rounded-md border border-border bg-surface px-3"
          />
          <select
            value={criteria.radiusMiles ?? ""}
            onChange={(e) => onPatch({ radiusMiles: e.target.value ? Number(e.target.value) : undefined })}
            aria-label="Radius in miles"
            className="cf-tap flex-1 rounded-md border border-border bg-surface px-3"
          >
            <option value="">Any distance</option>
            {RADII.map((r) => (
              <option key={r} value={r}>
                Within {r} mi
              </option>
            ))}
          </select>
        </div>
      </fieldset>

      <label className="flex flex-col gap-1 text-sm font-semibold text-ink">
        State
        <select
          value={criteria.state ?? ""}
          onChange={(e) => onPatch({ state: e.target.value || undefined })}
          className="cf-tap rounded-md border border-border bg-surface px-3 font-normal"
        >
          <option value="">All states</option>
          {states.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-semibold text-ink">Program</legend>
        <div className="flex flex-wrap gap-1.5">
          {ALL_CATEGORIES.map((cat) => {
            const on = categories.includes(cat);
            return (
              <button
                key={cat}
                type="button"
                aria-pressed={on}
                onClick={() => toggleCategory(cat)}
                className={`rounded-pill border px-3 py-1.5 text-xs font-medium transition ${
                  on
                    ? "border-primary bg-primary text-surface"
                    : "border-border bg-surface text-ink hover:border-primary"
                }`}
              >
                {PROGRAM_CATEGORY_LABEL[cat]}
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-semibold text-ink">Features</legend>
        <div className="flex flex-wrap gap-1.5">
          {ALL_FEATURE_CODES.map((f) => {
            const on = features.includes(f);
            return (
              <button
                key={f}
                type="button"
                aria-pressed={on}
                onClick={() => toggleFeature(f)}
                className={`rounded-pill border px-3 py-1.5 text-xs font-medium transition ${
                  on
                    ? "border-primary bg-primary text-surface"
                    : "border-border bg-surface text-ink hover:border-primary"
                }`}
              >
                {featureLabel(f)}
              </button>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}
