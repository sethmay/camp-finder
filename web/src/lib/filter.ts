// Pure filtering + ranking over the camp dataset. No I/O, no DOM. Unit-tested.
// The app resolves ZIP -> origin centroid and text -> matched ids, then calls rankCamps.
// Registry only: no session/date/cost filtering — the site filters by distance, state,
// program category, and features, and links out for schedules and fees.

import { haversineMiles } from "./distance";
import { programCategories } from "./format";
import type { Camp, Criteria, RankedCamp, SortKey } from "./types";
import type { Centroid } from "./zip";

export function rankCamps(
  camps: Camp[],
  criteria: Criteria,
  origin: Centroid | null,
): RankedCamp[] {
  const feats = criteria.features ?? [];
  const cats = criteria.categories ?? [];
  const out: RankedCamp[] = [];

  for (const camp of camps) {
    if (criteria.state && camp.state !== criteria.state) continue;
    if (criteria.textIds && !criteria.textIds.has(camp.id)) continue;
    if (feats.length && !feats.every((f) => camp.features.includes(f))) continue;
    if (cats.length && !programCategories(camp.program_types).some((c) => cats.includes(c)))
      continue;

    // Temperature: drop camps whose known July high exceeds the cap. Unknown temps pass.
    if (
      criteria.maxJulyHigh !== undefined &&
      camp.july_high_f !== null &&
      camp.july_high_f > criteria.maxJulyHigh
    )
      continue;

    // Distance: when an origin is set, a camp needs coords and must be within radius.
    let distanceMiles: number | null = null;
    if (origin) {
      if (camp.lat === null || camp.lon === null) continue;
      distanceMiles = haversineMiles(origin.lat, origin.lon, camp.lat, camp.lon);
      if (criteria.radiusMiles !== undefined && distanceMiles > criteria.radiusMiles) continue;
    }

    out.push({ camp, distanceMiles });
  }

  return out;
}

export function sortRanked(ranked: RankedCamp[], key: SortKey): RankedCamp[] {
  const arr = ranked.slice();
  switch (key) {
    case "distance":
      return arr.sort((a, b) => (a.distanceMiles ?? Infinity) - (b.distanceMiles ?? Infinity));
    case "name":
      return arr.sort((a, b) => a.camp.name.localeCompare(b.camp.name));
  }
}
