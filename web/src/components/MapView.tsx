import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { RankedCamp } from "@lib/types";
import { MAP_COLORS, US_CENTER, US_ZOOM, mapStyle, muteBasemap } from "@lib/map";
import { withBase } from "@lib/paths";

const SRC = "camps";

interface Member {
  id: string;
  name: string;
}
interface Group {
  key: string;
  lat: number;
  lon: number;
  name: string;
  count: number;
  members: Member[];
}

// Camps that share a reservation collapse to one pin at their centroid so co-located
// camps (e.g. the camps of one Scout reservation) don't stack into an indistinguishable dot.
function groupCamps(ranked: RankedCamp[]): Group[] {
  const byKey = new Map<string, RankedCamp[]>();
  for (const r of ranked) {
    if (r.camp.lat === null || r.camp.lon === null) continue;
    const key = r.camp.reservation?.id ?? r.camp.id;
    const arr = byKey.get(key);
    if (arr) arr.push(r);
    else byKey.set(key, [r]);
  }
  const groups: Group[] = [];
  for (const [key, members] of byKey) {
    const lat = members.reduce((s, r) => s + (r.camp.lat as number), 0) / members.length;
    const lon = members.reduce((s, r) => s + (r.camp.lon as number), 0) / members.length;
    const resName = members[0].camp.reservation?.name ?? null;
    const name = members.length > 1 ? resName ?? `${members.length} camps` : members[0].camp.name;
    groups.push({
      key,
      lat,
      lon,
      name,
      count: members.length,
      members: members.map((r) => ({ id: r.camp.id, name: r.camp.name })),
    });
  }
  return groups;
}

// The reservation/camp key of the selected camp, so the whole group highlights.
function groupKeyOf(ranked: RankedCamp[], selectedId: string | null): string | null {
  if (!selectedId) return null;
  const hit = ranked.find((r) => r.camp.id === selectedId);
  return hit ? hit.camp.reservation?.id ?? hit.camp.id : null;
}

function toGeoJSON(groups: Group[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: groups.map((g) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [g.lon, g.lat] },
      properties: { key: g.key, name: g.name, count: g.count, members: JSON.stringify(g.members) },
    })),
  };
}

// Data-driven paint: the selected group's marker renders in `active`, all others in `base`.
function keyColor(
  selectedKey: string | null,
  active: string,
  base: string,
): maplibregl.ExpressionSpecification {
  return ["case", ["==", ["get", "key"], selectedKey ?? ""], active, base];
}

const IS_SINGLE: maplibregl.ExpressionSpecification = ["==", ["get", "count"], 1];
const IS_GROUP: maplibregl.ExpressionSpecification = [">", ["get", "count"], 1];

// The map's own failure modes and the copy for each. Upstream MapLibre error text is never
// rendered: with PUBLIC_MAPTILER_KEY set (map.ts) a style-request message can carry the keyed
// URL, and user-facing copy should not be upstream error text regardless. The reason is kept
// as a code; raw errors go to the DEV-only console.warn in the init effect.
type MapFailure = "init" | "context-lost";

const FAILURE_COPY: Record<MapFailure, { lead: string; detail: string }> = {
  init: {
    lead: "The map couldn’t load.",
    detail: "Switch to the list view to browse the same camps.",
  },
  "context-lost": {
    lead: "The map lost its graphics context.",
    detail: "Reload the page to restore it, or switch to the list view to browse the same camps.",
  },
};

export default function MapView({
  ranked,
  selectedId,
  onSelect,
}: {
  ranked: RankedCamp[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [ready, setReady] = useState(false);
  // Set when MapLibre cannot start (no WebGL, lost GPU context, dead style endpoint). Without
  // this the container renders as a silently empty box -- indistinguishable from "the border
  // is drawn but the map vanished" -- and the only clue is a console throw inside an effect.
  const [failed, setFailed] = useState<MapFailure | null>(null);
  const builtRef = useRef(false);
  // Whether the map has ever reached a usable style. Read inside the `error` listener, so it
  // has to be a ref: the listener closes over the first render's state.
  const loadedRef = useRef(false);
  // Last camp/reservation key we flew to, so a re-run of the selection effect (e.g. on a
  // ranked/filter change) never re-flies the camera to a camp that stayed selected.
  const lastFlownRef = useRef<string | null>(null);

  // Create the map once; the source/layers are added on first data (below).
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({
        container: containerRef.current,
        style: mapStyle(),
        center: US_CENTER,
        zoom: US_ZOOM,
      });
    } catch (err) {
      // Constructor throws when WebGL is unavailable or the GPU context cannot be
      // acquired. Surface it instead of leaving an empty framed box.
      if (import.meta.env.DEV) console.warn("[MapView] maplibre init failed:", err);
      setFailed("init");
      return;
    }
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.on("load", () => {
      loadedRef.current = true;
      muteBasemap(map);
      setReady(true);
      // The map works, so nothing that fired before now was fatal. A lost GPU context is the
      // one failure this cannot undo (see below), so it is the only reason kept.
      setFailed((f) => (f === "context-lost" ? f : null));
    });
    // A dead style endpoint fires `error` rather than throwing, and previously left the map
    // blank with no signal. But MapLibre funnels EVERY failure through this one event --
    // sprite images, individual glyph ranges, single tile 404s -- and those are routine and
    // recoverable. Matching the error text therefore latched a permanent error panel over a
    // working map (and stripped its accessible name) on one glyph 404. Gate on the map's own
    // state instead: an error is fatal only while there is no usable style, i.e. before the
    // first `load` and with the style still not loaded. That is exactly the state a dead
    // style endpoint leaves it in.
    map.on("error", (e) => {
      if (import.meta.env.DEV) console.warn("[MapView] maplibre error:", e.error ?? e);
      if (loadedRef.current || map.isStyleLoaded()) return;
      setFailed("init");
    });
    // Recovery: a style that arrives (or is replaced) after an early error clears the panel,
    // so a transient pre-load failure cannot outlive it.
    map.on("styledata", () => {
      if (map.isStyleLoaded()) setFailed((f) => (f === "context-lost" ? f : null));
    });
    // Losing the GPU context (driver reset, too many live contexts, tab backgrounded on
    // some machines) silently blanks the canvas; MapLibre does not recover on its own. No
    // `preventDefault()` here on purpose: it only opts in to a later `webglcontextrestored`,
    // which nothing implements, so calling it contradicted the copy. Left to the browser
    // default, the context stays lost and "reload the page" is the honest instruction.
    const canvas = map.getCanvas();
    const onLost = () => setFailed("context-lost");
    canvas.addEventListener("webglcontextlost", onLost);

    return () => {
      canvas.removeEventListener("webglcontextlost", onLost);
      map.remove();
      mapRef.current = null;
      builtRef.current = false;
      loadedRef.current = false;
      setReady(false);
    };
  }, []);

  // Build the source + layers on first data, then keep the source in sync.
  // No MapLibre GeoJSON clustering: with a few hundred points a clustered source failed to
  // tile at low zoom (nothing showed until zoom-in). Reservation grouping is done in JS
  // (groupCamps) so single camps render as dot pins and reservations as one count pill.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const data = toGeoJSON(groupCamps(ranked));

    if (builtRef.current) {
      const src = map.getSource(SRC) as maplibregl.GeoJSONSource | undefined;
      src?.setData(data);
      return;
    }
    if (!data.features.length) return; // wait until we have camps to show

    map.addSource(SRC, { type: "geojson", data });

    // Single-camp dot pins.
    map.addLayer({
      id: "point",
      type: "circle",
      source: SRC,
      filter: IS_SINGLE,
      paint: {
        "circle-radius": 7,
        "circle-color": keyColor(groupKeyOf(ranked, selectedId), MAP_COLORS.markerActive, MAP_COLORS.markerDefault),
        "circle-stroke-width": 2,
        "circle-stroke-color": MAP_COLORS.markerStroke,
      },
    });

    // Reservation count pills: a larger green circle + the count.
    map.addLayer({
      id: "cluster",
      type: "circle",
      source: SRC,
      filter: IS_GROUP,
      paint: {
        "circle-radius": 12,
        "circle-color": keyColor(groupKeyOf(ranked, selectedId), MAP_COLORS.clusterActive, MAP_COLORS.cluster),
        "circle-stroke-width": 2,
        "circle-stroke-color": MAP_COLORS.markerStroke,
      },
    });
    map.addLayer({
      id: "cluster-count",
      type: "symbol",
      source: SRC,
      filter: IS_GROUP,
      layout: {
        "text-field": ["to-string", ["get", "count"]],
        "text-font": ["Noto Sans Regular"],
        "text-size": 12,
        "text-allow-overlap": true,
      },
      paint: { "text-color": MAP_COLORS.clusterText },
    });

    // Camp-name labels for single camps once zoomed past the regional view; MapLibre's
    // collision detection hides overlapping labels, so dense areas stay legible.
    map.addLayer({
      id: "point-label",
      type: "symbol",
      source: SRC,
      filter: IS_SINGLE,
      minzoom: 6,
      layout: {
        "text-field": ["get", "name"],
        "text-font": ["Noto Sans Regular"],
        "text-size": 12,
        "text-anchor": "left",
        "text-offset": [0.8, 0],
        "text-max-width": 12,
        "text-optional": true,
      },
      paint: {
        "text-color": MAP_COLORS.markerDefault,
        "text-halo-color": MAP_COLORS.labelHalo,
        "text-halo-width": 1.5,
      },
    });

    const openPopup = (e: maplibregl.MapLayerMouseEvent) => {
      const feat = e.features?.[0];
      if (!feat) return;
      const props = feat.properties as { name: string; members: string };
      const members = JSON.parse(props.members) as Member[];
      onSelect(members[0].id);
      // Built from DOM nodes with `textContent`, never interpolated HTML: camp names and ids
      // come from the committed upstream dataset, which this repo does not treat as trusted
      // markup anywhere else.
      // Tailwind classes rather than inline styles: the popup lands in a MapLibre container
      // that still lives inside <body>, so the data-program stamp on <html> applies and the
      // DS variables resolve. `font-body` is required because `.maplibregl-map` sets a
      // Helvetica `font` shorthand the popup would inherit; `display` is the DS display-type
      // helper (a plain rule in tokens.css, never purged).
      const content = document.createElement("div");
      content.className = "font-body text-foreground";
      const title = document.createElement("strong");
      title.className = "display";
      title.textContent = props.name;
      content.append(title, document.createElement("br"));
      const single = members.length === 1;
      members.forEach((m, i) => {
        if (i > 0) content.append(document.createElement("br"));
        const link = document.createElement("a");
        link.className = "text-primary";
        link.href = withBase(`/camps/${m.id}`);
        link.textContent = single ? "View details →" : `${m.name} →`;
        content.append(link);
      });
      new maplibregl.Popup({ offset: 14, closeButton: false })
        .setLngLat((feat.geometry as GeoJSON.Point).coordinates as [number, number])
        .setDOMContent(content)
        .addTo(map);
    };
    for (const id of ["point", "cluster"] as const) {
      map.on("click", id, openPopup);
      map.on("mouseenter", id, () => (map.getCanvas().style.cursor = "pointer"));
      map.on("mouseleave", id, () => (map.getCanvas().style.cursor = ""));
    }
    // Click on empty map (not on any marker, label, or count) clears the selection — the
    // map's only deselect. Include the text layers so clicking a camp's name isn't "empty".
    map.on("click", (e) => {
      const onMarker = map.queryRenderedFeatures(e.point, {
        layers: ["point", "cluster", "point-label", "cluster-count"],
      });
      if (!onMarker.length) onSelect(null);
    });

    const bounds = new maplibregl.LngLatBounds();
    for (const f of data.features) bounds.extend((f.geometry as GeoJSON.Point).coordinates as [number, number]);
    map.fitBounds(bounds, { padding: 60, maxZoom: 9, duration: 0 });

    builtRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ranked, ready]);

  // Reflect selection: recolor pins + pills, fly to the chosen camp.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !map.getLayer("point")) return;
    const key = groupKeyOf(ranked, selectedId);
    map.setPaintProperty("point", "circle-color", keyColor(key, MAP_COLORS.markerActive, MAP_COLORS.markerDefault));
    map.setPaintProperty("cluster", "circle-color", keyColor(key, MAP_COLORS.clusterActive, MAP_COLORS.cluster));
    // Fly only on a genuine NEW selection — not when this effect re-runs for a ranked/ready
    // change while the same camp stays selected (that yanked the camera back to it).
    if (selectedId && selectedId !== lastFlownRef.current) {
      const hit = ranked.find((r) => r.camp.id === selectedId);
      if (hit && hit.camp.lat !== null && hit.camp.lon !== null) {
        map.flyTo({ center: [hit.camp.lon, hit.camp.lat], zoom: Math.max(map.getZoom(), 8) });
      }
    }
    lastFlownRef.current = selectedId;
  }, [selectedId, ranked, ready]);

  // The container must keep its ref and stay mounted, so the fallback renders INSIDE it
  // rather than replacing it. bg-muted stops a blank canvas showing the page through the
  // frame, which is what made "map missing" and "map empty" look identical.
  return (
    <div
      ref={containerRef}
      className="h-full w-full rounded-lg bg-muted"
      role={failed ? undefined : "application"}
      aria-label={
        failed ? undefined : "Map of matching camps. A full list of the same camps is shown alongside."
      }
    >
      {failed ? (
        // The copy sits on an inner `bg-card` panel rather than straight on the `bg-muted`
        // frame: `--muted` (#D6CEBD) is not overridden in ds-overrides.css, and on it
        // `text-os-on-surface-faint` is 3.71:1 -- below AA 1.4.3 (4.5:1) for this 12px text.
        // On the white card the same pair is 5.81:1 (AA), and `text-muted-foreground` is
        // 8.99:1, clearing the 7:1 AAA bar the override file commits to.
        <div className="flex h-full w-full items-center justify-center p-6" role="status">
          <div className="max-w-sm rounded-lg bg-card p-4 text-center">
            <p className="text-sm text-muted-foreground">{FAILURE_COPY[failed].lead}</p>
            <p className="mt-2 text-xs text-os-on-surface-faint">{FAILURE_COPY[failed].detail}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
