// MapLibre setup isolated behind one module so the tile source is swappable
// (IMPLEMENTATION.md §1). Default: MapTiler-free style if a key is provided at build
// time via PUBLIC_MAPTILER_KEY; otherwise the OpenFreeMap "liberty" style (no key, $0).
// `muteBasemap` recolors that vector style to the muted handoff palette so markers pop
// (design §9), replacing the earlier CSS saturation filter.

import type { Map as MlMap, StyleSpecification } from "maplibre-gl";

const MAPTILER_KEY = import.meta.env.PUBLIC_MAPTILER_KEY as string | undefined;

// OpenFreeMap: free, key-less vector tiles. Good default for a $0 static deploy.
const OPENFREEMAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";

export function mapStyle(): string | StyleSpecification {
  if (MAPTILER_KEY) {
    return `https://api.maptiler.com/maps/landscape/style.json?key=${MAPTILER_KEY}`;
  }
  return OPENFREEMAP_STYLE;
}

// Muted basemap palette (design §9 / handoff README) — low saturation so markers pop.
export const BASEMAP = {
  land: "#E6E2D6",
  water: "#CBD9DE",
  park: "#D3DBCB",
  road: "#EFEDE6",
  label: "#B8BEB0",
} as const;

// Our own overlay layers — never recolor these as if they were basemap. Keep in sync with
// the layers MapView adds; a partial list silently protects only a subset.
const OVERLAY_LAYERS = new Set(["point", "point-label", "cluster", "cluster-count"]);

// Recolor the loaded vector basemap to the muted palette. Works on any OpenMapTiles-schema
// style (OpenFreeMap, MapTiler) by role — background/fill/line/symbol — rather than by
// brittle per-layer ids. Call once the style has loaded, before overlay layers are added.
export function muteBasemap(map: MlMap): void {
  const layers = map.getStyle()?.layers;
  if (!layers) return;
  for (const layer of layers) {
    if (OVERLAY_LAYERS.has(layer.id)) continue;
    const id = layer.id;
    const sl = "source-layer" in layer ? (layer["source-layer"] as string | undefined) : undefined;
    const isWater = sl === "water" || /water|ocean|sea|river|lake|bay/i.test(id);
    const isGreen =
      sl === "landcover" || /park|wood|forest|grass|golf|cemeter|nature|landcover|landuse/i.test(id);
    try {
      switch (layer.type) {
        case "background":
          map.setPaintProperty(id, "background-color", BASEMAP.land);
          break;
        case "fill":
          map.setPaintProperty(id, "fill-color", isWater ? BASEMAP.water : isGreen ? BASEMAP.park : BASEMAP.land);
          map.setPaintProperty(id, "fill-outline-color", BASEMAP.road);
          break;
        case "line":
          map.setPaintProperty(id, "line-color", isWater ? BASEMAP.water : BASEMAP.road);
          break;
        case "symbol":
          if (map.getLayoutProperty(id, "text-field") != null) {
            map.setPaintProperty(id, "text-color", BASEMAP.label);
            map.setPaintProperty(id, "text-halo-color", "#FFFFFF");
          }
          break;
      }
    } catch {
      // Layer may reject a property (data-driven paint, missing field); leave it as-is.
    }
  }
}

// Handoff palette (design §Map) — applied to marker/cluster layers, not the basemap.
export const MAP_COLORS = {
  markerDefault: "#20261F",
  markerText: "#FFFFFF",
  markerActive: "#1D5E42",
  cluster: "#1D5E42",
  clusterText: "#FFFFFF",
} as const;

// Continental US default view.
export const US_CENTER: [number, number] = [-96, 38];
export const US_ZOOM = 3.2;
