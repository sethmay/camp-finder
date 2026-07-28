// MapLibre setup isolated behind one module so the tile source is swappable
// (IMPLEMENTATION.md §1). Default: MapTiler-free style if a key is provided at build
// time via PUBLIC_MAPTILER_KEY; otherwise the OpenFreeMap "liberty" style (no key, $0).
// `muteBasemap` recolors that vector style to the muted handoff palette so markers pop
// (design §9), replacing the earlier CSS saturation filter.
//
// COLOUR SOURCING. MapLibre paint properties are evaluated in JS/WebGL, not CSS, so they
// cannot read `rgb(var(--primary))`. Every colour below therefore comes from `TOKENS`, the
// design system's framework-neutral token data — the documented escape hatch for exactly
// this case ("passing a color to a charting library, a <canvas>, ..."). This module is the
// ONE place map colours are derived; the map components import the results. Consequence:
// the map cannot follow a runtime `data-program` swap the way CSS-driven surfaces do.

import type { Map as MlMap, StyleSpecification } from "maplibre-gl";
import { TOKENS } from "@opensourcescouting/design-system";

// The program stamped on <html> in layouts/Base.astro. Keep the two in sync.
const COLORS = TOKENS.scoutsbsa.colors;

type MapColorToken = keyof typeof COLORS;
type Rgb = readonly [number, number, number];

/** Concrete `#RRGGBB` for a design-system colour token — the only form paint accepts. */
export function mapColor(name: MapColorToken): string {
  return COLORS[name].hex;
}

/** Linear per-channel blend of two token colours. `t` = 0 -> `a`, 1 -> `b`. */
function mix(a: Rgb, b: Rgb, t: number): Rgb {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

/** Serialize a blended triplet the way `TOKENS` already serializes an unblended one. */
function toHex(c: Rgb): string {
  return `#${c.map((n) => n.toString(16).padStart(2, "0")).join("").toUpperCase()}`;
}

// The design system ships no cartographic tokens — no land / water / landcover / road
// vocabulary at all — so the basemap palette is derived from the nearest UI-surface tokens.
// Scoped strictly to the basemap; this is NOT a new app-wide colour scale.
//
//   land  = background/secondary midpoint. Plain `background` would equal `road`, because in
//           the scoutsbsa palette `--card` and `--background` are the same tan; that erases
//           the road/land figure-ground the muted basemap depends on. The midpoint keeps
//           land one step darker than the road ribbons drawn over it. (#E6E0D2, vs the
//           #E6E2D6 of the retired handoff palette.)
//   park  = no landcover token exists. `os-on-primary-soft` is the palette's only
//           primary-derived pale green, so it supplies the vegetation hue; a 5% bite of
//           `primary` drops it to basemap value (#D3D5C4, vs #D3DBCB). Semantically
//           `os-on-primary-soft` is a TEXT tint, so this is a knowing misuse.
const LAND = mix(COLORS.background.rgb, COLORS.secondary.rgb, 0.5);
const PARK = mix(mix(LAND, COLORS["os-on-primary-soft"].rgb, 0.65), COLORS.primary.rgb, 0.05);

// Cartography constant with NO design-system counterpart, kept from the handoff palette. The
// palette holds no cool hue at basemap value: `os-accent` is a saturated BSA blue, an order
// of magnitude too strong for a water fill, and nothing else has a blue cast. Do not treat
// this as a token — it is basemap-local and has exactly one consumer, `muteBasemap`.
const BASEMAP_WATER = "#CBD9DE";

// Muted basemap palette (design §9 / handoff README) — low saturation so markers pop.
export const BASEMAP = {
  land: toHex(LAND),
  water: BASEMAP_WATER,
  park: toHex(PARK),
  road: mapColor("card"),
  // The documented >=3:1 dim-text token; darker than the handoff #B8BEB0, so basemap labels
  // gain contrast rather than lose it.
  label: mapColor("os-on-surface-faint"),
  // Halo behind basemap labels — the page surface token, so labels sit on our own tan.
  labelHalo: mapColor("background"),
} as const;

const MAPTILER_KEY = import.meta.env.PUBLIC_MAPTILER_KEY as string | undefined;

// OpenFreeMap: free, key-less vector tiles. Good default for a $0 static deploy.
const OPENFREEMAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";

export function mapStyle(): string | StyleSpecification {
  if (MAPTILER_KEY) {
    return `https://api.maptiler.com/maps/landscape/style.json?key=${MAPTILER_KEY}`;
  }
  return OPENFREEMAP_STYLE;
}

// Our own overlay layers — never recolor these as if they were basemap. Keep in sync with
// the layers MapView adds; a partial list silently protects only a subset.
const OVERLAY_LAYERS: Record<string, true> = {
  point: true,
  "point-label": true,
  cluster: true,
  "cluster-count": true,
};

// Recolor the loaded vector basemap to the muted palette. Works on any OpenMapTiles-schema
// style (OpenFreeMap, MapTiler) by role — background/fill/line/symbol — rather than by
// brittle per-layer ids. Call once the style has loaded, before overlay layers are added.
export function muteBasemap(map: MlMap): void {
  const layers = map.getStyle()?.layers;
  if (!layers) return;
  for (const layer of layers) {
    // `=== true` so an id colliding with an Object.prototype key can't read as an overlay.
    if (OVERLAY_LAYERS[layer.id] === true) continue;
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
            map.setPaintProperty(id, "text-halo-color", BASEMAP.labelHalo);
          }
          break;
      }
    } catch {
      // Layer may reject a property (data-driven paint, missing field); leave it as-is.
    }
  }
}

// Marker/cluster palette — applied to our overlay layers, not the basemap.
//
// `clusterActive` replaces a hard-coded `#164A34` in MapView that duplicated the retired
// local `primary-700`. The design system ships no primary ramp (no `primary-600/700/800`),
// so the darker selected state is a blend of two real tokens: `primary` darkened 55% toward
// `foreground`. That reproduces the same ~20-point green-channel drop the old `primary-700`
// gave (62 -> 42, matching 94 -> 74), without inventing an app-wide shade scale. Caveat:
// scoutsbsa `primary` is already near-black, so the same numeric delta is far less legible
// than it was against the old lighter green.
export const MAP_COLORS = {
  markerDefault: mapColor("foreground"),
  markerActive: mapColor("primary"),
  cluster: mapColor("primary"),
  clusterActive: toHex(mix(COLORS.primary.rgb, COLORS.foreground.rgb, 0.55)),
  clusterText: mapColor("primary-foreground"),
  // Ring separating a marker from the basemap beneath it: the on-primary surface token.
  markerStroke: mapColor("primary-foreground"),
  // Halo behind our own camp-name labels: the page surface token.
  labelHalo: mapColor("background"),
} as const;

// Continental US default view.
export const US_CENTER: [number, number] = [-96, 38];
export const US_ZOOM = 3.2;
