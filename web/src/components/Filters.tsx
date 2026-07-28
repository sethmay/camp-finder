import { useId } from "react";
import { X } from "lucide-react";
import {
  badgeVariants,
  Button,
  Field,
  Heading,
  NativeSelect,
  TextInput,
  cn,
} from "@opensourcescouting/design-system";
import type { ProgramCategory } from "@lib/types";
import { FEATURE_FACET_GROUPS, featureLabel, PROGRAM_CATEGORY_LABEL } from "@lib/format";
import type { UiState } from "@lib/searchParams";

type CriteriaPatch = Partial<UiState["criteria"]>;

const RADII = [25, 50, 100, 150, 250, 300, 400, 500, 600, 800, 1000, 1500, 2000];
const ALL_CATEGORIES = Object.keys(PROGRAM_CATEGORY_LABEL) as ProgramCategory[];

/* The DS has no ToggleGroup/Chip primitive, so the multi-select chips stay
 * aria-pressed buttons and borrow the Badge recipe for their skin. The recipe is
 * built for a static <span>, so three things have to be undone or added by hand:
 * its uppercase/tracking-wider treatment (these are sentence-case labels), its
 * rounded-lg (chips are pills), and a focus-visible ring (a span never needs one). */
const chipClass = (on: boolean) =>
  cn(
    badgeVariants({ variant: on ? "primary" : "outline" }),
    "cf-tap normal-case tracking-normal rounded-full px-3 text-xs transition-colors",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
    on ? "hover:bg-primary/90" : "hover:bg-muted",
  );

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
    (criteria.maxJulyHigh !== undefined ? 1 : 0) +
    features.length +
    categories.length +
    (text ? 1 : 0);

  // Both a desktop rail and a mobile dialog render this component at the same time, so
  // the one id we wire by hand has to be per-instance.
  const julyHighId = useId();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <Heading level={2} size={4}>
          Filters
        </Heading>
        {activeCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            leadingIcon={<X size={14} aria-hidden="true" />}
            onClick={onClearAll}
          >
            Clear all
          </Button>
        )}
      </div>

      <Field label="Search by name">
        <TextInput
          type="search"
          value={text}
          onChange={(e) => onText(e.target.value)}
          placeholder="Camp or council name"
          data-lpignore="true"
          autoComplete="off"
          className="cf-tap"
        />
      </Field>

      <fieldset className="flex flex-col gap-2">
        <legend className="display text-sm font-medium text-foreground">Distance</legend>
        <div className="flex gap-2">
          {/* No Field label on either control: the legend is the visible label for the
           * pair, and each control carries its own aria-label. Passing a Field label
           * would give them a second, duplicated accessible name. */}
          <Field className="w-28">
            <TextInput
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
              className="cf-tap"
            />
          </Field>
          <Field className="flex-1">
            <NativeSelect
              value={criteria.radiusMiles ?? ""}
              onChange={(e) => onPatch({ radiusMiles: e.target.value ? Number(e.target.value) : undefined })}
              aria-label="Radius in miles"
              className="cf-tap"
            >
              <option value="">Any distance</option>
              {RADII.map((r) => (
                <option key={r} value={r}>
                  Within {r} mi
                </option>
              ))}
            </NativeSelect>
          </Field>
        </div>
      </fieldset>

      <Field label="State">
        <NativeSelect
          value={criteria.state ?? ""}
          onChange={(e) => onPatch({ state: e.target.value || undefined })}
          className="cf-tap"
        >
          <option value="">All states</option>
          {states.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </NativeSelect>
      </Field>

      {/* The DS ships no Slider, so this stays a native range input. Field only wires
       * its own text-like controls through context, so the id association is manual. */}
      <Field
        htmlFor={julyHighId}
        label={`Avg July daytime temp: ${
          criteria.maxJulyHigh !== undefined ? `${criteria.maxJulyHigh}°F` : "Any"
        }`}
      >
        <input
          id={julyHighId}
          type="range"
          min={70}
          max={105}
          step={5}
          value={criteria.maxJulyHigh ?? 105}
          aria-valuetext={criteria.maxJulyHigh !== undefined ? `${criteria.maxJulyHigh}°F` : "Any"}
          onChange={(e) => {
            const v = Number(e.target.value);
            onPatch({ maxJulyHigh: v >= 105 ? undefined : v });
          }}
          className="cf-tap accent-primary"
        />
      </Field>

      <fieldset className="flex flex-col gap-2">
        <legend className="display text-sm font-medium text-foreground">Program</legend>
        <div className="flex flex-wrap gap-1.5">
          {ALL_CATEGORIES.map((cat) => {
            const on = categories.includes(cat);
            return (
              <button
                key={cat}
                type="button"
                aria-pressed={on}
                onClick={() => toggleCategory(cat)}
                className={chipClass(on)}
              >
                {PROGRAM_CATEGORY_LABEL[cat]}
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="display text-sm font-medium text-foreground">Features</legend>
        {FEATURE_FACET_GROUPS.map((group) => (
          <div key={group.label} role="group" aria-label={group.label} className="flex flex-col gap-1.5">
            <p aria-hidden="true" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{group.label}</p>
            <div className="flex flex-wrap gap-1.5">
              {group.codes.map((f) => {
                const on = features.includes(f);
                return (
                  <button
                    key={f}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleFeature(f)}
                    className={chipClass(on)}
                  >
                    {featureLabel(f)}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </fieldset>
    </div>
  );
}
