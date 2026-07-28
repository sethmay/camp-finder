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
  const builtRef = useRef(false);
  // Last camp/reservation key we flew to, so a re-run of the selection effect (e.g. on a
  // ranked/filter change) never re-flies the camera to a camp that stayed selected.
  const lastFlownRef = useRef<string | null>(null);

  // Create the map once; the source/layers are added on first data (below).
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: mapStyle(),
      center: US_CENTER,
      zoom: US_ZOOM,
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.on("load", () => {
      muteBasemap(map);
      setReady(true);
    });

    return () => {
      map.remove();
      mapRef.current = null;
      builtRef.current = false;
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
      const body =
        members.length === 1
          ? `<a class="text-primary" href="${withBase(`/camps/${members[0].id}`)}">View details →</a>`
          : members
              .map((m) => `<a class="text-primary" href="${withBase(`/camps/${m.id}`)}">${m.name} →</a>`)
              .join("<br/>");
      new maplibregl.Popup({ offset: 14, closeButton: false })
        .setLngLat((feat.geometry as GeoJSON.Point).coordinates as [number, number])
        // Tailwind classes rather than inline styles: `setHTML` injects into a MapLibre
        // container that still lives inside <body>, so the data-program stamp on <html>
        // applies and the DS variables resolve. `font-body` is required because
        // `.maplibregl-map` sets a Helvetica `font` shorthand the popup would inherit;
        // `display` is the DS display-type helper (a plain rule in tokens.css, never purged).
        .setHTML(
          `<div class="font-body text-foreground">
             <strong class="display">${props.name}</strong><br/>
             ${body}
           </div>`,
        )
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

  return (
    <div
      ref={containerRef}
      className="h-full w-full rounded-lg"
      role="application"
      aria-label="Map of matching camps. A full list of the same camps is shown alongside."
    />
  );
}
