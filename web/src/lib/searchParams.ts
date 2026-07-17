// Serialize filter state <-> URL query params so every search is shareable/bookmarkable
// (IMPLEMENTATION.md §8.4). Pure; unit-testable.

import type { Criteria, Feature, SortKey } from "./types";

export interface UiState {
  criteria: Omit<Criteria, "upcomingYear" | "textIds">;
  text: string;
  sort: SortKey;
}

export function toParams(state: UiState): URLSearchParams {
  const p = new URLSearchParams();
  const c = state.criteria;
  if (c.zip) p.set("zip", c.zip);
  if (c.radiusMiles !== undefined) p.set("radius", String(c.radiusMiles));
  if (c.dateStart) p.set("from", c.dateStart);
  if (c.dateEnd) p.set("to", c.dateEnd);
  if (c.maxCost !== undefined) p.set("cost", String(c.maxCost));
  if (c.state) p.set("state", c.state);
  if (c.features && c.features.length) p.set("feat", c.features.join(","));
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
  const sortRaw = p.get("sort");
  const sort: SortKey =
    sortRaw === "cost" || sortRaw === "name" ? sortRaw : "distance";
  return {
    text: p.get("q") ?? "",
    sort,
    criteria: {
      zip: p.get("zip") ?? undefined,
      radiusMiles: num(p.get("radius")),
      dateStart: p.get("from") ?? undefined,
      dateEnd: p.get("to") ?? undefined,
      maxCost: num(p.get("cost")),
      state: p.get("state") ?? undefined,
      features: (p.get("feat")?.split(",").filter(Boolean) as Feature[]) ?? undefined,
    },
  };
}
