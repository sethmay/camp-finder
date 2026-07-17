// MapLibre setup isolated behind one module so the tile source is swappable
// (IMPLEMENTATION.md §1). Default: MapTiler-free style if a key is provided at build
// time via PUBLIC_MAPTILER_KEY; otherwise the OpenFreeMap "liberty" style (no key, $0).
// Muted basemap palette per the design handoff so price-pill markers pop.

import type { StyleSpecification } from "maplibre-gl";

const MAPTILER_KEY = import.meta.env.PUBLIC_MAPTILER_KEY as string | undefined;

// OpenFreeMap: free, key-less vector tiles. Good default for a $0 static deploy.
const OPENFREEMAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";

export function mapStyle(): string | StyleSpecification {
  if (MAPTILER_KEY) {
    return `https://api.maptiler.com/maps/landscape/style.json?key=${MAPTILER_KEY}`;
  }
  return OPENFREEMAP_STYLE;
}

// Handoff palette (design README §Map) — applied to marker/cluster layers, not the basemap.
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
