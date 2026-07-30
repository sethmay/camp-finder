import { Field, NativeSelect } from "@opensourcescouting/design-system";
import type { RankedCamp, SortKey } from "@lib/types";
import CampCard from "./CampCard";
import EmptyState from "./EmptyState";

// Dataset is small (a few hundred camps), so a plain map is fine; no virtualization needed.
export default function ResultsList({
  ranked,
  selectedId,
  sort,
  loading,
  onSort,
  onHover,
  onLeave,
  onClearAll,
}: {
  ranked: RankedCamp[];
  selectedId: string | null;
  sort: SortKey;
  loading: boolean;
  onSort: (s: SortKey) => void;
  onHover: (id: string) => void;
  onLeave: () => void;
  onClearAll: () => void;
}) {
  if (loading) {
    return (
      <ul className="flex flex-col gap-3" aria-busy="true" aria-label="Loading camps">
        {Array.from({ length: 5 }).map((_, i) => (
          <li key={i} className="h-36 animate-pulse rounded-lg border border-border bg-muted/40" />
        ))}
      </ul>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-end justify-end gap-3">
        <Field label="Sort by" className="w-44">
          <NativeSelect
            className="cf-tap"
            value={sort}
            onChange={(e) => onSort(e.target.value as SortKey)}
          >
            <option value="distance">Distance</option>
            <option value="name">Name</option>
          </NativeSelect>
        </Field>
      </div>

      {ranked.length === 0 ? (
        <EmptyState variant="no-results" onClear={onClearAll} />
      ) : (
        <ul className="flex flex-col gap-3">
          {ranked.map((r) => (
            <li key={r.camp.id}>
              <CampCard
                ranked={r}
                selected={r.camp.id === selectedId}
                onHover={onHover}
                onLeave={onLeave}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
