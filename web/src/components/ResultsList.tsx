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
          <li key={i} className="h-36 animate-pulse rounded-md border border-border bg-surface" />
        ))}
      </ul>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted" role="status" aria-live="polite">
          {ranked.length} {ranked.length === 1 ? "camp" : "camps"}
        </p>
        <label className="flex items-center gap-2 text-sm text-muted">
          Sort
          <select
            value={sort}
            onChange={(e) => onSort(e.target.value as SortKey)}
            className="cf-tap rounded-md border border-border bg-surface px-2 text-ink"
          >
            <option value="distance">Distance</option>
            <option value="cost">Cost</option>
            <option value="name">Name</option>
          </select>
        </label>
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
