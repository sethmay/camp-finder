// Pure filtering + ranking over the camp dataset. No I/O, no DOM. Unit-tested.
// The app resolves ZIP -> origin centroid and text -> matched ids, then calls rankCamps.

import { haversineMiles } from "./distance";
import type { Camp, Criteria, RankedCamp, Session, SortKey } from "./types";
import type { Centroid } from "./zip";

function upcomingSessions(camp: Camp, year: number): Session[] {
  return camp.sessions.filter((s) => s.year >= year);
}

// A session overlaps [start, end] if it starts on/before end and ends on/after start.
function overlapsRange(s: Session, startISO?: string, endISO?: string): boolean {
  if (startISO && s.end_date < startISO) return false;
  if (endISO && s.start_date > endISO) return false;
  return true;
}

function minKnownFee(sessions: Session[]): number | null {
  const fees = sessions.map((s) => s.fee_youth).filter((f): f is number => f !== null);
  return fees.length ? Math.min(...fees) : null;
}

export function rankCamps(
  camps: Camp[],
  criteria: Criteria,
  origin: Centroid | null,
): RankedCamp[] {
  const feats = criteria.features ?? [];
  const out: RankedCamp[] = [];

  for (const camp of camps) {
    if (criteria.state && camp.state !== criteria.state) continue;
    if (criteria.textIds && !criteria.textIds.has(camp.id)) continue;
    if (feats.length && !feats.every((f) => camp.features.includes(f))) continue;

    // Sessions that count for this query: upcoming, and within the date range if set.
    const sessions = upcomingSessions(camp, criteria.upcomingYear).filter((s) =>
      overlapsRange(s, criteria.dateStart, criteria.dateEnd),
    );
    if ((criteria.dateStart || criteria.dateEnd) && sessions.length === 0) continue;

    // Cost: exclude only when a known fee exceeds the cap. Unknown fees pass (flagged in UI).
    if (criteria.maxCost !== undefined) {
      const fee = minKnownFee(sessions.length ? sessions : upcomingSessions(camp, criteria.upcomingYear));
      if (fee !== null && fee > criteria.maxCost) continue;
    }

    // Distance: when an origin is set, a camp needs coords and must be within radius.
    let distanceMiles: number | null = null;
    if (origin) {
      if (camp.lat === null || camp.lon === null) continue;
      distanceMiles = haversineMiles(origin.lat, origin.lon, camp.lat, camp.lon);
      if (criteria.radiusMiles !== undefined && distanceMiles > criteria.radiusMiles) continue;
    }

    const ranked = sessions.length ? sessions : upcomingSessions(camp, criteria.upcomingYear);
    const nextSession =
      ranked.slice().sort((a, b) => a.start_date.localeCompare(b.start_date))[0] ?? null;

    out.push({ camp, distanceMiles, nextSession });
  }

  return out;
}

export function sortRanked(ranked: RankedCamp[], key: SortKey): RankedCamp[] {
  const arr = ranked.slice();
  switch (key) {
    case "distance":
      return arr.sort((a, b) => (a.distanceMiles ?? Infinity) - (b.distanceMiles ?? Infinity));
    case "cost":
      return arr.sort(
        (a, b) => (a.camp.fee_from ?? Infinity) - (b.camp.fee_from ?? Infinity),
      );
    case "name":
      return arr.sort((a, b) => a.camp.name.localeCompare(b.camp.name));
  }
}
