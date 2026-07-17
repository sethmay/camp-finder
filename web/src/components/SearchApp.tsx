import { useEffect, useMemo, useRef, useState } from "react";
import MiniSearch from "minisearch";
import { Map as MapIcon, List as ListIcon, SlidersHorizontal, X } from "lucide-react";
import type { Camp, Criteria, Meta, SortKey } from "@lib/types";
import { rankCamps, sortRanked } from "@lib/filter";
import { fromParams, toParams, type UiState } from "@lib/searchParams";
import { isValidZip, loadCentroids, setCentroids, zipToCentroid, type Centroid } from "@lib/zip";
import Filters from "./Filters";
import ResultsList from "./ResultsList";
import MapView from "./MapView";
import EmptyState from "./EmptyState";

interface ZipData {
  zips: [string, number, number][];
}

const EMPTY: UiState = { text: "", sort: "distance", criteria: {} };

export default function SearchApp() {
  const [camps, setCamps] = useState<Camp[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [ui, setUi] = useState<UiState>(EMPTY);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<"list" | "map">("list");
  const [showFilters, setShowFilters] = useState(false);
  const centroidsRef = useRef<Map<string, Centroid> | null>(null);

  // Load data + initial URL state once.
  useEffect(() => {
    setUi(fromParams(new URLSearchParams(window.location.search)));
    Promise.all([
      fetch(`${import.meta.env.BASE_URL}data/camps.json`).then((r) => r.json()),
      fetch(`${import.meta.env.BASE_URL}data/meta.json`).then((r) => r.json()),
      fetch(`${import.meta.env.BASE_URL}data/zip-centroids.json`).then((r) => r.json()),
    ])
      .then(([c, m, z]: [Camp[], Meta, ZipData]) => {
        setCamps(c);
        setMeta(m);
        const map = loadCentroids(z);
        centroidsRef.current = map;
        setCentroids(map);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, []);

  // Reflect UI state in the URL (shareable searches).
  useEffect(() => {
    if (loading) return;
    const qs = toParams(ui).toString();
    const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState(null, "", url);
  }, [ui, loading]);

  const search = useMemo(() => {
    const ms = new MiniSearch<Camp>({
      fields: ["name", "council_name"],
      storeFields: ["id"],
      searchOptions: { prefix: true, fuzzy: 0.2, combineWith: "AND" },
    });
    ms.addAll(camps);
    return ms;
  }, [camps]);

  const states = useMemo(
    () => Array.from(new Set(camps.map((c) => c.state))).sort(),
    [camps],
  );

  const ranked = useMemo(() => {
    if (!meta) return [];
    const textIds = ui.text.trim()
      ? new Set(search.search(ui.text).map((r) => r.id as string))
      : undefined;
    const origin: Centroid | null =
      ui.criteria.zip && isValidZip(ui.criteria.zip) ? zipToCentroid(ui.criteria.zip) : null;
    const criteria: Criteria = {
      ...ui.criteria,
      textIds,
      upcomingYear: meta.upcoming_summer_year,
    };
    return sortRanked(rankCamps(camps, criteria, origin), ui.sort);
  }, [camps, meta, ui, search]);

  const patch = (p: Partial<UiState["criteria"]>) =>
    setUi((s) => ({ ...s, criteria: { ...s.criteria, ...p } }));
  const setText = (text: string) => setUi((s) => ({ ...s, text }));
  const setSort = (sort: SortKey) => setUi((s) => ({ ...s, sort }));
  const clearAll = () => setUi((s) => ({ ...EMPTY, sort: s.sort }));

  if (error) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <EmptyState variant="no-results" />
        <p className="mt-4 text-center text-sm text-muted">
          We couldn't load camp data. Please refresh to try again.
        </p>
      </div>
    );
  }

  const filtersEl = (
    <Filters
      criteria={ui.criteria}
      text={ui.text}
      states={states}
      onPatch={patch}
      onText={setText}
      onClearAll={clearAll}
    />
  );
  return (
    <div className="mx-auto max-w-[1280px] px-4 py-4">
      <div className="grid gap-6 lg:grid-cols-[264px_minmax(0,1fr)_470px]">
        {/* Desktop filter rail */}
        <aside className="hidden lg:block">
          <div className="sticky top-20">{filtersEl}</div>
        </aside>

        {/* Results */}
        <section aria-label="Search results">
          {/* Mobile controls */}
          <div className="mb-3 flex items-center gap-2 lg:hidden">
            <button
              type="button"
              onClick={() => setShowFilters(true)}
              className="cf-tap inline-flex items-center gap-2 rounded-md border border-border bg-surface px-3 font-semibold"
            >
              <SlidersHorizontal size={16} aria-hidden="true" /> Filters
            </button>
            <div className="ml-auto inline-flex rounded-md border border-border bg-surface p-0.5">
              <button
                type="button"
                onClick={() => setMobileView("list")}
                aria-pressed={mobileView === "list"}
                className={`cf-tap inline-flex items-center gap-1 rounded px-3 text-sm font-semibold ${
                  mobileView === "list" ? "bg-primary text-surface" : "text-muted"
                }`}
              >
                <ListIcon size={16} aria-hidden="true" /> List
              </button>
              <button
                type="button"
                onClick={() => setMobileView("map")}
                aria-pressed={mobileView === "map"}
                className={`cf-tap inline-flex items-center gap-1 rounded px-3 text-sm font-semibold ${
                  mobileView === "map" ? "bg-primary text-surface" : "text-muted"
                }`}
              >
                <MapIcon size={16} aria-hidden="true" /> Map
              </button>
            </div>
          </div>

          <div className={mobileView === "map" ? "hidden lg:block" : "block"}>
            <ResultsList
              ranked={ranked}
              selectedId={selectedId}
              sort={ui.sort}
              loading={loading}
              onSort={setSort}
              onHover={setSelectedId}
              onLeave={() => setSelectedId(null)}
              onClearAll={clearAll}
            />
          </div>

          {/* Mobile map */}
          <div className={mobileView === "map" ? "block h-[70vh] lg:hidden" : "hidden"}>
            <MapView ranked={ranked} selectedId={selectedId} onSelect={setSelectedId} />
          </div>
        </section>

        {/* Desktop sticky map */}
        <aside className="hidden lg:block">
          <div className="sticky top-20 h-[calc(100vh-6rem)]">
            <MapView ranked={ranked} selectedId={selectedId} onSelect={setSelectedId} />
          </div>
        </aside>
      </div>

      {/* Mobile filter sheet */}
      {showFilters && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-ink/40"
            onClick={() => setShowFilters(false)}
            aria-hidden="true"
          />
          <div className="absolute inset-y-0 left-0 w-[85%] max-w-sm overflow-y-auto bg-bg p-4 shadow-sh-2">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-h2">Filters</h2>
              <button
                type="button"
                onClick={() => setShowFilters(false)}
                aria-label="Close filters"
                className="cf-tap inline-flex items-center rounded-md border border-border px-3"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            {filtersEl}
            <button
              type="button"
              onClick={() => setShowFilters(false)}
              className="cf-tap mt-6 w-full rounded-md bg-primary font-semibold text-surface"
            >
              Show {ranked.length} camps
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
