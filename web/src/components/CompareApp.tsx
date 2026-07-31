import { useEffect, useMemo, useRef, useState } from "react";
import MiniSearch from "minisearch";
import { Plus, Search } from "lucide-react";
import { Checkbox, ScoutThemeProvider, TooltipProvider } from "@opensourcescouting/design-system";
import type { Camp } from "@lib/types";
import { FEATURE_CATEGORIES } from "@lib/format";
import {
  compareFromParams,
  compareToParams,
  MAX_COMPARE,
  type CompareState,
} from "@lib/compare";
import { withBase } from "@lib/paths";
import {
  isValidZip,
  loadCentroids,
  setCentroids,
  zipToCentroid,
  type Centroid,
} from "@lib/zip";
import CompareTable from "./CompareTable";

interface ZipData {
  zips: [string, number, number][];
}

const ZIP_STORAGE_KEY = "camp-finder:zip";
const VALID_CATEGORY_KEYS = new Set(FEATURE_CATEGORIES.map((c) => c.key));
const VERIFY_HREF = withBase("/about#corrections");

const EMPTY: CompareState = { campIds: [], zip: null, open: new Set(), onlyDiff: false };

export default function CompareApp() {
  const [camps, setCamps] = useState<Camp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [ui, setUi] = useState<CompareState>(EMPTY);
  const centroidsRef = useRef<Map<string, Centroid> | null>(null);

  // Load committed data + resolve URL state once camps are known (so stale ids can be dropped).
  useEffect(() => {
    Promise.all([
      fetch(withBase("/data/camps.json")).then((r) => r.json()),
      fetch(withBase("/data/zip-centroids.json")).then((r) => r.json()),
    ])
      .then(([c, z]: [Camp[], ZipData]) => {
        setCamps(c);
        const map = loadCentroids(z);
        centroidsRef.current = map;
        setCentroids(map);
        const params = new URLSearchParams(window.location.search);
        const state = compareFromParams(params, {
          validIds: new Set(c.map((camp) => camp.id)),
          validKeys: VALID_CATEGORY_KEYS,
        });
        // Fall back to a remembered ZIP when the URL carries none.
        if (!state.zip) {
          const stored = window.localStorage.getItem(ZIP_STORAGE_KEY);
          if (stored && isValidZip(stored)) state.zip = stored;
        }
        setUi(state);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, []);

  // Reflect state in the URL (shareable) and remember the ZIP.
  useEffect(() => {
    if (loading) return;
    const qs = compareToParams(ui).toString();
    const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState(null, "", url);
    if (ui.zip) window.localStorage.setItem(ZIP_STORAGE_KEY, ui.zip);
  }, [ui, loading]);

  const byId = useMemo(() => new Map(camps.map((c) => [c.id, c])), [camps]);

  const search = useMemo(() => {
    const ms = new MiniSearch<Camp>({
      fields: ["name", "council_name", "city"],
      storeFields: ["id"],
      searchOptions: { prefix: true, fuzzy: 0.2, combineWith: "AND" },
    });
    ms.addAll(camps);
    return ms;
  }, [camps]);

  const selected = useMemo(
    () => ui.campIds.map((id) => byId.get(id)).filter((c): c is Camp => !!c),
    [ui.campIds, byId],
  );

  const origin: Centroid | null =
    ui.zip && isValidZip(ui.zip) ? zipToCentroid(ui.zip) : null;

  const addCamp = (id: string) =>
    setUi((s) =>
      s.campIds.includes(id) || s.campIds.length >= MAX_COMPARE
        ? s
        : { ...s, campIds: [...s.campIds, id] },
    );
  const removeCamp = (id: string) =>
    setUi((s) => ({ ...s, campIds: s.campIds.filter((x) => x !== id) }));
  const toggleOpen = (key: string) =>
    setUi((s) => {
      const open = new Set(s.open);
      if (open.has(key)) open.delete(key);
      else open.add(key);
      return { ...s, open };
    });
  const setZip = (zip: string | null) => setUi((s) => ({ ...s, zip }));
  const setOnlyDiff = (onlyDiff: boolean) => setUi((s) => ({ ...s, onlyDiff }));

  if (error) {
    return (
      <div className="mx-auto max-w-[1280px] px-4 py-12 text-center text-muted-foreground">
        <p>Couldn't load camp data. Please retry in a moment.</p>
      </div>
    );
  }
  if (loading) {
    return (
      <div className="mx-auto max-w-[1280px] px-4 py-12 text-center text-muted-foreground">
        <p>Loading camps…</p>
      </div>
    );
  }

  const atMax = selected.length >= MAX_COMPARE;
  const heading =
    selected.length >= 2 ? `Comparing ${selected.length} resident camps` : "Compare camps";

  return (
    <ScoutThemeProvider program="scoutsbsa">
      <TooltipProvider>
        <div className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6">
          <div className="mb-4 flex flex-col gap-3 md:mb-[18px] md:flex-row md:items-end md:justify-between md:gap-6">
            <div>
              <h1 className="text-[27px] font-bold leading-tight tracking-[-0.01em] text-foreground">
                {heading}
              </h1>
              <p className="mt-1 max-w-2xl text-[13px] text-muted-foreground">
                Registry facts only. Sessions, fees, and availability live on each council's own page.
              </p>
            </div>
            {selected.length >= 2 && (
              <label className="flex min-h-[44px] shrink-0 items-center gap-2 self-start rounded-[var(--radius)] border border-input bg-card px-3 text-[13px] font-medium md:self-auto">
                <Checkbox
                  checked={ui.onlyDiff}
                  onChange={(e) => setOnlyDiff(e.currentTarget.checked)}
                />
                Only show differences
              </label>
            )}
          </div>

          {!atMax && (
            <CampPicker
              search={search}
              byId={byId}
              selectedIds={ui.campIds}
              onAdd={addCamp}
              slots={selected.length < 2 ? MAX_COMPARE : undefined}
            />
          )}
          {atMax && (
            <p className="mb-4 text-[13px] text-muted-foreground">
              Comparing the maximum of {MAX_COMPARE} camps. Remove one to add another.
            </p>
          )}

          {selected.length < 2 ? (
            <p className="mt-6 text-[13px] text-muted-foreground">
              Add at least two camps to see the comparison.
            </p>
          ) : (
            <CompareTable
              camps={selected}
              origin={origin}
              zip={ui.zip}
              onSetZip={setZip}
              open={ui.open}
              onToggleOpen={toggleOpen}
              onlyDiff={ui.onlyDiff}
              onRemove={removeCamp}
              verifyHref={VERIFY_HREF}
            />
          )}
        </div>
      </TooltipProvider>
    </ScoutThemeProvider>
  );
}

// --- Camp picker (typeahead combobox) ----------------------------------------

function CampPicker({
  search,
  byId,
  selectedIds,
  onAdd,
  slots,
}: {
  search: MiniSearch<Camp>;
  byId: Map<string, Camp>;
  selectedIds: string[];
  onAdd: (id: string) => void;
  slots?: number; // when set, render the empty-state slot rail beneath the field
}) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listId = "camp-picker-list";

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const chosen = new Set(selectedIds);
    return search
      .search(query)
      .map((r) => byId.get(r.id as string))
      .filter((c): c is Camp => !!c && !chosen.has(c.id))
      .slice(0, 8);
  }, [query, search, byId, selectedIds]);

  const pick = (camp: Camp) => {
    onAdd(camp.id);
    setQuery("");
    setActive(0);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!results.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (a + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      pick(results[Math.min(active, results.length - 1)]);
    } else if (e.key === "Escape") {
      setQuery("");
    }
  };

  return (
    <div className="mb-5">
      <label htmlFor="camp-picker" className="mb-1 block text-[13px] font-semibold text-foreground">
        Add a camp to compare
      </label>
      <div className="relative max-w-xl">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          <Search size={16} aria-hidden="true" />
        </span>
        <input
          id="camp-picker"
          type="text"
          role="combobox"
          aria-expanded={results.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          value={query}
          placeholder="Search by camp name, council, or town"
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
          className="min-h-[44px] w-full rounded-[var(--radius)] border border-input bg-card pl-9 pr-3 text-[14px] text-foreground placeholder:text-muted-foreground"
        />
        {results.length > 0 && (
          <ul
            id={listId}
            role="listbox"
            className="absolute z-30 mt-1 w-full overflow-clip rounded-[var(--radius)] border border-border bg-card shadow-lg"
          >
            {results.map((c, i) => (
              <li key={c.id} role="option" aria-selected={i === active}>
                <button
                  type="button"
                  onClick={() => pick(c)}
                  onMouseEnter={() => setActive(i)}
                  className={`flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left ${
                    i === active ? "bg-[#F7F4EC]" : "bg-card"
                  }`}
                >
                  <span className="text-[14px] font-semibold text-foreground">{c.name}</span>
                  <span className="text-[12px] text-muted-foreground">
                    {[c.city, c.state].filter(Boolean).join(", ")}
                    {c.council_name ? ` · ${c.council_name}` : ""}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {slots !== undefined && (
        <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5" aria-hidden="true">
          {Array.from({ length: slots }).map((_, i) => (
            <li
              key={i}
              className="flex min-h-[96px] items-center justify-center rounded-[var(--radius)] border border-dashed border-input text-[13px] text-muted-foreground"
            >
              {i < selectedIds.length ? (
                <span className="font-medium text-foreground">{byId.get(selectedIds[i])?.name}</span>
              ) : (
                <span className="inline-flex items-center gap-1">
                  <Plus size={14} aria-hidden="true" /> Add camp
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
