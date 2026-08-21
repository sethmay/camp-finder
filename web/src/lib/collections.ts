// Grouping helpers for the region/state landing pages, the sitemap, and their OG cards — one
// source of truth for "which states/regions exist and their camps". Pure; lists sorted by name.
import type { Camp } from "./types";
import { regionForState, stateName } from "./region";

const byName = (a: Camp, b: Camp): number => a.name.localeCompare(b.name);

function group(camps: Camp[], key: (c: Camp) => string | null): Map<string, Camp[]> {
  const m = new Map<string, Camp[]>();
  for (const c of camps) {
    const k = key(c);
    if (!k) continue;
    const list = m.get(k);
    if (list) list.push(c);
    else m.set(k, [c]);
  }
  for (const list of m.values()) list.sort(byName);
  return m;
}

/** Camps grouped by state postal code (present states only), each list sorted by name. */
export const campsByState = (camps: Camp[]): Map<string, Camp[]> => group(camps, (c) => c.state);

/** Camps grouped by derived region; excludes camps with no region (AE/AP). */
export const campsByRegion = (camps: Camp[]): Map<string, Camp[]> =>
  group(camps, (c) => regionForState(c.state));

/** State codes present in each region, sorted by full state name. */
export function statesInRegion(camps: Camp[]): Map<string, string[]> {
  const sets = new Map<string, Set<string>>();
  for (const c of camps) {
    const r = regionForState(c.state);
    if (!r || !c.state) continue;
    const set = sets.get(r);
    if (set) set.add(c.state);
    else sets.set(r, new Set([c.state]));
  }
  const out = new Map<string, string[]>();
  for (const [r, set] of sets) {
    out.set(r, [...set].sort((a, b) => stateName(a).localeCompare(stateName(b))));
  }
  return out;
}
