// Serialize filter state <-> URL query params so every search is shareable/bookmarkable
// (IMPLEMENTATION.md §8.4). Pure; unit-testable.

import type { Criteria, ProgramCategory, SortKey } from "./types";
import { FEATURE_FACETS } from "./format";

export interface UiState {
  criteria: Omit<Criteria, "textIds">;
  text: string;
  sort: SortKey;
}

export function toParams(state: UiState): URLSearchParams {
  const p = new URLSearchParams();
  const c = state.criteria;
  if (c.zip) p.set("zip", c.zip);
  if (c.radiusMiles !== undefined) p.set("radius", String(c.radiusMiles));
  if (c.maxJulyHigh !== undefined) p.set("maxtemp", String(c.maxJulyHigh));
  if (c.state) p.set("state", c.state);
  if (c.features && c.features.length) p.set("feat", c.features.join(","));
  if (c.categories && c.categories.length) p.set("prog", c.categories.join(","));
  if (state.text) p.set("q", state.text);
  if (state.sort !== "distance") p.set("sort", state.sort);
  return p;
}

function num(v: string | null): number | undefined {
  if (v === null) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

export function fromParams(p: URLSearchParams): UiState {
  const sort: SortKey = p.get("sort") === "name" ? "name" : "distance";
  return {
    text: p.get("q") ?? "",
    sort,
    criteria: {
      zip: p.get("zip") ?? undefined,
      radiusMiles: num(p.get("radius")),
      maxJulyHigh: num(p.get("maxtemp")),
      state: p.get("state") ?? undefined,
      features: p.get("feat")?.split(",").filter((f) => FEATURE_FACETS.includes(f)) ?? undefined,
      categories: (p.get("prog")?.split(",").filter(Boolean) as ProgramCategory[]) ?? undefined,
    },
  };
}
