// MapLibre setup isolated behind one module so the tile source is swappable
// (IMPLEMENTATION.md §1). Default: MapTiler-free style if a key is provided at build
// time via PUBLIC_MAPTILER_KEY; otherwise the OpenFreeMap "liberty" style (no key, $0).
// `muteBasemap` recolors that vector style to the muted handoff palette so markers pop
// (design §9), replacing the earlier CSS saturation filter.
//
// COLOUR SOURCING. MapLibre paint properties are evaluated in JS/WebGL, not CSS, so they
// cannot read `rgb(var(--primary))`. Every colour below is therefore RESOLVED FROM THE LIVE
// CUSTOM PROPERTIES — `getComputedStyle(document.documentElement)`, the same declarations
// every CSS surface in the app reads, on the element layouts/Base.astro stamps `data-program`
// onto. This module is the ONE place map colours are derived; the map components import the
// results.
//
// It reads the CSS rather than importing the design system's JS `TOKENS` for two reasons:
//   1. `TOKENS` carries the design system's STOCK palette, and `styles/ds-overrides.css`
//      retunes those custom properties. A CSS override cannot reach a JS object, so the map
//      painted the pre-override olive `#243E2C` while every button on the same screen was
//      `#1D5E42`. Reading the resolved properties makes disagreement impossible.
//   2. The `@opensourcescouting/design-system` barrel drags Radix UI and sonner into the map
//      chunk (+213 KB on the search page and all 451 detail pages) for eight hex values.
//
// `BASEMAP` and `MAP_COLORS` expose getters that resolve on first read and memoise, so the
// palette is resolved once per page — at map init, since both map components are client
// islands and nothing else reads them. Getters (rather than module-level constants) matter
// because SearchApp is `client:load`: this module is also evaluated in Node during the SSG
// build, where `document` does not exist. A property that resolves empty or unparseable
// degrades to its stock scoutsbsa value below instead of painting `#NaNNaNNaN`.
// Consequence, unchanged from the previous token-import version: the palette is snapshotted
// at first read, so the map cannot follow a runtime `data-program` swap the way CSS does.

import type { Map as MlMap, StyleSpecification } from "maplibre-gl";

type Rgb = readonly [number, number, number];

// The design-system colour tokens this module needs, each with its stock scoutsbsa value as a
// last-resort fallback. The live CSS is the source of truth; these exist only so a missing or
// malformed custom property degrades to a plausible colour instead of garbage.
const FALLBACK_RGB = {
  background: [245, 241, 230],
  card: [245, 241, 230],
  foreground: [26, 26, 20],
  primary: [36, 62, 44],
  "primary-foreground": [245, 241, 230],
  secondary: [214, 206, 189],
  "os-on-primary-soft": [215, 220, 200],
  "os-on-surface-faint": [138, 139, 124],
} as const;

type MapColorToken = keyof typeof FALLBACK_RGB;

/** Linear per-channel blend of two token colours. `t` = 0 -> `a`, 1 -> `b`. */
function mix(a: Rgb, b: Rgb, t: number): Rgb {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

/** Serialize a triplet as the `#RRGGBB` string paint properties and `Marker` require. */
function toHex(c: Rgb): string {
  return `#${c.map((n) => n.toString(16).padStart(2, "0")).join("").toUpperCase()}`;
}

// The tokens hold space-separated channels (`--primary: 29 94 66`) so CSS can compose
// `rgb(var(--primary) / <alpha>)`. Anything that is not three in-range numbers is rejected so
// the caller can fall back rather than emit a colour MapLibre will refuse.
function parseTriplet(value: string): Rgb | null {
  const parts = value.trim().split(/[\s,]+/);
  if (parts.length !== 3) return null;
  const [r, g, b] = parts.map(Number);
  if (![r, g, b].every((n) => Number.isFinite(n) && n >= 0 && n <= 255)) return null;
  return [r, g, b];
}

function readTokens(): Record<MapColorToken, Rgb> {
  const root = typeof document === "undefined" ? null : getComputedStyle(document.documentElement);
  const out = {} as Record<MapColorToken, Rgb>;
  for (const name of Object.keys(FALLBACK_RGB) as MapColorToken[]) {
    out[name] = (root && parseTriplet(root.getPropertyValue(`--${name}`))) ?? FALLBACK_RGB[name];
  }
  return out;
}

// Cartography constant with NO design-system counterpart, kept from the handoff palette. The
// palette holds no cool hue at basemap value: `os-accent` is a saturated BSA blue, an order
// of magnitude too strong for a water fill, and nothing else has a blue cast. Do not treat
// this as a token — it is basemap-local and has exactly one consumer, `muteBasemap`.
const BASEMAP_WATER = "#CBD9DE";

export interface MapPalette {
  /** The resolved token triplets, before any blending. */
  readonly colors: Record<MapColorToken, Rgb>;
  /** Muted basemap palette (design §9 / handoff README) — low saturation so markers pop. */
  readonly basemap: Readonly<Record<"land" | "water" | "park" | "road" | "label" | "labelHalo", string>>;
  /** Marker/cluster palette — applied to our overlay layers, not the basemap. */
  readonly markers: Readonly<
    Record<
      "markerDefault" | "markerActive" | "cluster" | "clusterActive" | "clusterText" | "markerStroke" | "labelHalo",
      string
    >
  >;
}

// The design system ships no cartographic tokens — no land / water / landcover / road
// vocabulary at all — so the basemap palette is derived from the nearest UI-surface tokens.
// Scoped strictly to the basemap; this is NOT a new app-wide colour scale.
//
//   land  = background/secondary midpoint. The original reason for the midpoint — that
//           `--card` (the road colour) and `--background` were the same tan, so plain
//           `background` would erase the road/land figure-ground — no longer holds:
//           ds-overrides.css collapses `--card` to white. The midpoint is kept anyway
//           because it still places land one step below the road ribbons drawn over it,
//           and re-picking a basemap value is a cartography change, not part of aligning
//           the map with the CSS. Resolved today: #E0D9C8 on white roads.
//   park  = no landcover token exists. `os-on-primary-soft` is the palette's only
//           primary-derived pale green, so it supplies the vegetation hue; a 5% bite of
//           `primary` drops it to basemap value (#D1D5C1). Semantically `os-on-primary-soft`
//           is a TEXT tint, so this is a knowing misuse.
//
// `clusterActive` replaces a hard-coded `#164A34` in MapView that duplicated the retired
// local `primary-700`. The design system ships no primary ramp (no `primary-600/700/800`), so
// the darker selected state is a blend of two real tokens: `primary` darkened 55% toward
// `foreground`. With the overridden `--primary` (#1D5E42) that resolves to #1B3929, a
// 94 -> 57 green-channel drop — the same kind of step the old `primary-700` gave, without
// inventing an app-wide shade scale.
export function resolveMapPalette(): MapPalette {
  const colors = readTokens();
  const land = mix(colors.background, colors.secondary, 0.5);
  const park = mix(mix(land, colors["os-on-primary-soft"], 0.65), colors.primary, 0.05);
  return {
    colors,
    basemap: {
      land: toHex(land),
      water: BASEMAP_WATER,
      park: toHex(park),
      road: toHex(colors.card),
      // The documented >=3:1 dim-text token, so basemap labels carry contrast of their own.
      label: toHex(colors["os-on-surface-faint"]),
      // Halo behind basemap labels — the page surface token, so labels sit on our own tan.
      labelHalo: toHex(colors.background),
    },
    markers: {
      markerDefault: toHex(colors.foreground),
      markerActive: toHex(colors.primary),
      cluster: toHex(colors.primary),
      clusterActive: toHex(mix(colors.primary, colors.foreground, 0.55)),
      clusterText: toHex(colors["primary-foreground"]),
      // Ring separating a marker from the basemap beneath it: the on-primary surface token.
      markerStroke: toHex(colors["primary-foreground"]),
      // Halo behind our own camp-name labels: the page surface token.
      labelHalo: toHex(colors.background),
    },
  };
}

let resolved: MapPalette | null = null;

/** The palette for this page, resolved from the CSS on first use and memoised after. */
function palette(): MapPalette {
  return (resolved ??= resolveMapPalette());
}

/** Concrete `#RRGGBB` for one design-system colour token, read from the live CSS. */
export function mapColor(name: MapColorToken): string {
  return toHex(palette().colors[name]);
}

// `BASEMAP` / `MAP_COLORS` keep the shape their call sites already use; each property reads
// through to the memoised palette, so the resolve happens at map init rather than at import.
export const BASEMAP = {
  get land() {
    return palette().basemap.land;
  },
  get water() {
    return palette().basemap.water;
  },
  get park() {
    return palette().basemap.park;
  },
  get road() {
    return palette().basemap.road;
  },
  get label() {
    return palette().basemap.label;
  },
  get labelHalo() {
    return palette().basemap.labelHalo;
  },
};

export const MAP_COLORS = {
  get markerDefault() {
    return palette().markers.markerDefault;
  },
  get markerActive() {
    return palette().markers.markerActive;
  },
  get cluster() {
    return palette().markers.cluster;
  },
  get clusterActive() {
    return palette().markers.clusterActive;
  },
  get clusterText() {
    return palette().markers.clusterText;
  },
  get markerStroke() {
    return palette().markers.markerStroke;
  },
  get labelHalo() {
    return palette().markers.labelHalo;
  },
};

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
            map.setPaintProperty(id, "text-halo-color", BASEMAP.labelHalo);
          }
          break;
      }
    } catch {
      // Layer may reject a property (data-driven paint, missing field); leave it as-is.
    }
  }
}

// Continental US default view.
export const US_CENTER: [number, number] = [-96, 38];
export const US_ZOOM = 3.2;
