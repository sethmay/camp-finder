import { useEffect, useMemo, useRef, useState } from "react";
import MiniSearch from "minisearch";
import { Map as MapIcon, List as ListIcon, SlidersHorizontal } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTitle,
  ScoutThemeProvider,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@opensourcescouting/design-system";
import type { Camp, Criteria, Meta, SortKey } from "@lib/types";
import { rankCamps, sortRanked } from "@lib/filter";
import { fromParams, toParams, type UiState } from "@lib/searchParams";
import { withBase } from "@lib/paths";
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
  const [view, setView] = useState<"list" | "map">("map");
  const [showFilters, setShowFilters] = useState(false);
  const centroidsRef = useRef<Map<string, Centroid> | null>(null);
  const focusPendingRef = useRef(false);

  // Load data + initial URL state once.
  useEffect(() => {
    setUi(fromParams(new URLSearchParams(window.location.search)));
    Promise.all([
      fetch(withBase("/data/camps.json")).then((r) => r.json()),
      fetch(withBase("/data/meta.json")).then((r) => r.json()),
      fetch(withBase("/data/zip-centroids.json")).then((r) => r.json()),
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

  // Focus the "search by name" field when the header "Search" link asks, via a #search hash —
  // on first load (navigated in with #search) and on same-page clicks (hashchange). Desktop: the
  // filter rail is always visible, focus it. Mobile: open the filter sheet first, then focus.
  useEffect(() => {
    const handle = () => {
      if (window.location.hash !== "#search") return;
      // Strip the hash (keep any query) so a repeat click re-fires hashchange.
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
      if (window.matchMedia("(min-width: 1024px)").matches) {
        requestAnimationFrame(() => {
          const el = document.querySelector<HTMLInputElement>('aside input[type="search"]');
          el?.focus();
          el?.select();
        });
      } else {
        focusPendingRef.current = true;
        setShowFilters(true);
      }
    };
    handle();
    window.addEventListener("hashchange", handle);
    return () => window.removeEventListener("hashchange", handle);
  }, []);

  // After the mobile filter sheet opens for a Search request, move focus to the name field
  // (Radix moves focus into the dialog on open, so run just after that).
  useEffect(() => {
    if (!showFilters || !focusPendingRef.current) return;
    focusPendingRef.current = false;
    const t = window.setTimeout(() => {
      const el = document.querySelector<HTMLInputElement>('[role="dialog"] input[type="search"]');
      el?.focus();
      el?.select();
    }, 60);
    return () => window.clearTimeout(t);
  }, [showFilters]);

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
    () => Array.from(new Set(camps.map((c) => c.state).filter((s): s is string => !!s))).sort(),
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
      <ScoutThemeProvider
        program="scoutsbsa"
        forcePlaceholderMarks
        className="mx-auto max-w-md px-4 py-16"
      >
        <EmptyState variant="no-results" />
        <p className="mt-4 text-center text-sm text-muted-foreground">
          We couldn't load camp data. Please refresh to try again.
        </p>
      </ScoutThemeProvider>
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
    <ScoutThemeProvider
      program="scoutsbsa"
      forcePlaceholderMarks
      className="mx-auto max-w-[1280px] px-4 py-4"
    >
      <div className="grid gap-6 lg:grid-cols-[264px_minmax(0,1fr)]">
        {/* Desktop filter rail */}
        <aside className="hidden lg:block">
          <div className="sticky top-20">{filtersEl}</div>
        </aside>

        <section aria-label="Search results">
          {/* Tabs wrap the triggers AND the panes so the view switch carries real
           * tablist/tab/tabpanel semantics and arrow-key navigation. */}
          <Tabs value={view} onValueChange={(v) => setView(v as "list" | "map")}>
            {/* Controls: filters (mobile), result count, and the view toggle (all breakpoints) */}
            <div className="mb-3 flex items-center gap-3">
              <Button
                variant="secondary"
                size="md"
                leadingIcon={<SlidersHorizontal size={18} aria-hidden="true" />}
                onClick={() => setShowFilters(true)}
                className="lg:hidden"
              >
                Filters
              </Button>
              {!loading && (
                <p className="text-sm text-muted-foreground" role="status" aria-live="polite">
                  {ranked.length} {ranked.length === 1 ? "camp" : "camps"}
                </p>
              )}
              {/* h-auto lets cf-tap set the trigger height; TabsList's default h-10 is
               * a 40px desktop-density track that would shrink the hit target. */}
              <TabsList className="ml-auto h-auto">
                <TabsTrigger value="map" className="cf-tap gap-1 rounded-lg">
                  <MapIcon size={16} aria-hidden="true" /> Map
                </TabsTrigger>
                <TabsTrigger value="list" className="cf-tap gap-1 rounded-lg">
                  <ListIcon size={16} aria-hidden="true" /> List
                </TabsTrigger>
              </TabsList>
            </div>

            {/* forceMount + data-[state=inactive]:hidden keeps BOTH panes mounted, exactly as
             * the old block/hidden pair did. Non-negotiable for the map: Radix unmounts
             * inactive content by default, which would tear down the MapLibre instance and
             * reset the camera on every toggle. */}
            <TabsContent value="list" forceMount className="data-[state=inactive]:hidden">
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
            </TabsContent>

            <TabsContent value="map" forceMount className="data-[state=inactive]:hidden">
              {/* border-input, not border-border: the map is an interactive component
                * (role="application", pan/zoom), so its boundary owes WCAG 1.4.11's 3:1.
                * --border is 2.08:1 against the page, --input is 3.02:1. overflow-hidden
                * clips the tile canvas and MapLibre's own controls to the radius. */}
              <div className="h-[70vh] overflow-hidden rounded-lg border border-input lg:sticky lg:top-20 lg:h-[calc(100vh-9rem)]">
                <MapView ranked={ranked} selectedId={selectedId} onSelect={setSelectedId} />
              </div>
            </TabsContent>
          </Tabs>
        </section>
      </div>

      {/* Mobile filter sheet. Radix supplies the focus trap, Escape handler, inert
       * background and scroll lock the hand-rolled overlay never had; DialogContent
       * renders its own labelled close affordance, so there is no close button here.
       *
       * aria-modal is ours, not Radix's. Radix hides the background with aria-hidden
       * instead, but the `aria-hidden` package deliberately never hides an element
       * containing an [aria-live] region -- and our result counter is one, so <main>
       * (the whole results page) stays exposed to a screen-reader virtual cursor
       * behind the modal. aria-modal closes that hole. Verified in the browser.
       *
       * max-h/overflow are ours too: DialogContent ships no height cap, so this
       * ~30-control form would run off the bottom of a phone with no way to scroll. */}
      <Dialog open={showFilters} onOpenChange={setShowFilters}>
        <DialogContent
          aria-modal="true"
          aria-describedby={undefined}
          className="max-h-[85vh] w-[calc(100vw-2rem)] max-w-sm overflow-y-auto"
        >
          {/* Radix requires a DialogTitle for the accessible name, but Filters already
           * renders its own visible "Filters" heading for the desktop rail, so the two
           * stacked (as they did in the hand-rolled sheet). sr-only keeps the name and
           * drops the duplicate. No DialogHeader: sr-only is out of flow, so a header
           * box would only add an empty gap row to DialogContent's grid. */}
          <DialogTitle className="sr-only">Filters</DialogTitle>
          {filtersEl}
          <DialogFooter>
            <Button block onClick={() => setShowFilters(false)}>
              Show {ranked.length} camps
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ScoutThemeProvider>
  );
}
