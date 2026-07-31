// Pure logic for the Camp Compare view (/compare). No I/O, no DOM. Unit-tested.
//
// Two data-integrity rules are load-bearing here and must never be softened:
//   1. features_verified_at null-vs-empty. `null` = never surveyed = UNKNOWN; it must never
//      render as "no". A surveyed camp with zero matching features genuinely has none.
//   2. geo_precision "approximate" = an area, not a pin. Its distance/elevation are rounded
//      in the FORMATTER so no code path can emit a false-precision figure.
//
// Registry note: camp-finder has no routing backend (a hard non-negotiable), so the decision
// row shows STRAIGHT-LINE distance from the home ZIP — the same haversine the search page
// uses — not drive time. There is deliberately no "Xh Ym" anywhere.

import { haversineMiles } from "./distance";
import { expandFeatures } from "./format";
import type { Camp } from "./types";
import type { Centroid } from "./zip";

export type FeatureMark = "offered" | "not_offered" | "not_surveyed";

/** Coarsest distance rounding in play (area camps round to 5 mi); used to avoid claiming a
 *  "nearest" winner on a margin smaller than our own precision. */
const DISTANCE_ROUND_MI = 5;
const ELEVATION_ROUND_FT = 50;

/** A camp is surveyed iff it has a feature-survey date. null = never surveyed = unknown. */
export function isSurveyed(camp: Camp): boolean {
  return camp.features_verified_at !== null;
}

/** True when the camp's geo is only area-level (centroid), not a precise pin. */
export function isAreaGeo(camp: Camp): boolean {
  return camp.geo_precision === "approximate";
}

function round(n: number, to: number): number {
  return Math.round(n / to) * to;
}

/** Mark for one feature code on one camp. Unsurveyed camps are always UNKNOWN, never "no".
 *  Pass a precomputed upward-expanded set to avoid re-expanding per cell. */
export function featureMark(camp: Camp, code: string, expanded?: Set<string>): FeatureMark {
  if (!isSurveyed(camp)) return "not_surveyed";
  const set = expanded ?? expandFeatures(camp.features);
  return set.has(code) ? "offered" : "not_offered";
}

/** Offered-of-total tally for a category on one camp, or null when the camp is unsurveyed.
 *  `of` is the taxonomy size (members.length), so a surveyed camp offering none reads 0/of. */
export function categoryCount(
  camp: Camp,
  members: string[],
  expanded?: Set<string>,
): { n: number; of: number } | null {
  if (!isSurveyed(camp)) return null;
  const set = expanded ?? expandFeatures(camp.features);
  let n = 0;
  for (const m of members) if (set.has(m)) n++;
  return { n, of: members.length };
}

/** Straight-line miles from origin to a camp; null when no origin or the camp lacks coords. */
export function campDistanceMiles(camp: Camp, origin: Centroid | null): number | null {
  if (!origin || camp.lat === null || camp.lon === null) return null;
  return haversineMiles(origin.lat, origin.lon, camp.lat, camp.lon);
}

/** Distance display. Area camps get a ≈ prefix and 5-mi rounding (never false precision). */
export function formatDistance(miles: number | null, area: boolean): string | null {
  if (miles === null) return null;
  const v = area ? round(miles, DISTANCE_ROUND_MI) : Math.round(miles);
  return (area ? "\u2248" : "") + v.toLocaleString("en-US") + " mi";
}

/** Elevation display. Area camps round to 50 ft; thousands separator always. */
export function formatElevation(ft: number | null, area: boolean): string | null {
  if (ft === null) return null;
  const v = area ? round(ft, ELEVATION_ROUND_FT) : ft;
  return v.toLocaleString("en-US") + " ft";
}

/** Id of the single closest camp, or null. Suppressed when there is no origin, fewer than two
 *  camps have known coords, or the 1st/2nd margin is within our rounding granularity — better
 *  no badge than a winner claimed on noise across mixed-precision camps. */
export function nearestCampId(camps: Camp[], origin: Centroid | null): string | null {
  if (!origin) return null;
  const withD = camps
    .map((c) => ({ id: c.id, d: campDistanceMiles(c, origin) }))
    .filter((x): x is { id: string; d: number } => x.d !== null)
    .sort((a, b) => a.d - b.d);
  if (withD.length < 2) return null;
  if (withD[1].d - withD[0].d < DISTANCE_ROUND_MI) return null;
  return withD[0].id;
}

/** Interpretive July-temperature note keyed on the daytime high. null when temp unknown. */
export function tempNote(hi: number | null): string | null {
  if (hi === null) return null;
  if (hi >= 84) return "Hot afternoons";
  if (hi <= 70) return "Cool and damp";
  return "Warm, dry days";
}

/** Interpretive elevation note. null when elevation unknown. */
export function elevationNote(ft: number | null): string | null {
  if (ft === null) return null;
  if (ft > 3000) return "Cool nights, thin air";
  if (ft < 500) return "Coastal, humid";
  return "Mid-elevation";
}

/** "Only show differences" predicate for one feature across the selected camps: among the
 *  SURVEYED (known) camps, at least one offers it AND at least one does not. Unsurveyed camps
 *  are excluded so a data gap never manufactures a phantom difference. */
export function featureDiffers(
  camps: Camp[],
  code: string,
  expandedById?: Map<string, Set<string>>,
): boolean {
  let anyYes = false;
  let anyNo = false;
  for (const c of camps) {
    if (!isSurveyed(c)) continue;
    const set = expandedById?.get(c.id) ?? expandFeatures(c.features);
    if (set.has(code)) anyYes = true;
    else anyNo = true;
    if (anyYes && anyNo) return true;
  }
  return false;
}

/** Dot track for a category tally: n filled then (of-n) hollow. Presentation helper kept here
 *  so the glyph choice is unit-testable alongside the counts it visualizes. */
export function dotTrack(n: number, of: number): string {
  return "\u25CF".repeat(Math.max(0, n)) + "\u25CB".repeat(Math.max(0, of - n));
}

// --- URL state ---------------------------------------------------------------
// The whole comparison lives in the query string so it is shareable and survives reload
// (the committee-chair use case). Params: camps=id,id  zip=NNNNN  open=key,key  diff=1.

export const MAX_COMPARE = 5;

export interface CompareState {
  campIds: string[]; // display order, deduped, capped at MAX_COMPARE
  zip: string | null;
  open: Set<string>; // open category keys
  onlyDiff: boolean;
}

/** Default open categories when the URL carries no `open` key at all (first visit). Aquatics
 *  is the canonical hierarchy example, so it leads expanded. */
export const DEFAULT_OPEN = ["aquatics"];

export function compareToParams(state: CompareState): URLSearchParams {
  const p = new URLSearchParams();
  if (state.campIds.length) p.set("camps", state.campIds.join(","));
  if (state.zip) p.set("zip", state.zip);
  // Always emit `open` once state is serialized so a closed-everything view is distinct from
  // a first visit; an empty value round-trips to the empty set.
  p.set("open", [...state.open].join(","));
  if (state.onlyDiff) p.set("diff", "1");
  return p;
}

export function compareFromParams(
  p: URLSearchParams,
  opts: { validIds?: Set<string>; validKeys?: Set<string> } = {},
): CompareState {
  const { validIds, validKeys } = opts;
  const rawIds = (p.get("camps") ?? "").split(",").filter(Boolean);
  const seen = new Set<string>();
  const campIds: string[] = [];
  for (const id of rawIds) {
    if (seen.has(id)) continue; // dedupe
    if (validIds && !validIds.has(id)) continue; // drop stale/unknown so a bad id can't wedge
    seen.add(id);
    campIds.push(id);
    if (campIds.length === MAX_COMPARE) break;
  }

  const zipRaw = (p.get("zip") ?? "").trim();
  const zip = /^\d{5}$/.test(zipRaw) ? zipRaw : null;

  const openParam = p.get("open");
  const openList = openParam === null ? DEFAULT_OPEN : openParam.split(",").filter(Boolean);
  const open = new Set(validKeys ? openList.filter((k) => validKeys.has(k)) : openList);

  return { campIds, zip, open, onlyDiff: p.get("diff") === "1" };
}
