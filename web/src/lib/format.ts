// Display formatting + small static lookup tables. Pure; unit-tested.

import type { Availability, Feature, ProgramCategory } from "./types";

export const FEATURE_LABEL: Record<Feature, string> = {
  dining_hall: "Dining hall",
  waterfront: "Waterfront",
  pool: "Pool",
  shooting_sports: "Shooting sports",
  climbing: "Climbing",
  horseback: "Horseback",
  atv: "ATV",
  cope: "COPE",
  older_scout_program: "Older-scout program",
  high_adventure_option: "High adventure",
  stem: "STEM",
  scuba: "Scuba",
  mountain_biking: "Mountain biking",
};

export const PROGRAM_CATEGORY_LABEL: Record<ProgramCategory, string> = {
  scouts_bsa: "Scouts BSA",
  cub: "Cub Scout",
  high_adventure: "High Adventure",
};

const PROGRAM_TYPE_TO_CATEGORY: Record<string, ProgramCategory> = {
  scouts_bsa_resident: "scouts_bsa",
  cub_resident: "cub",
  cub_day: "cub",
  webelos: "cub",
  high_adventure: "high_adventure",
};

/** Distinct user-facing categories a camp belongs to, from its program_types. */
export function programCategories(programTypes: string[]): ProgramCategory[] {
  const out: ProgramCategory[] = [];
  for (const pt of programTypes) {
    const cat = PROGRAM_TYPE_TO_CATEGORY[pt];
    if (cat && !out.includes(cat)) out.push(cat);
  }
  return out;
}

// Status tone -> Tailwind classes (color + we always pair with icon + text in the UI).
export const AVAILABILITY_LABEL: Record<Availability, string> = {
  open: "Open",
  waitlist: "Waitlist",
  full: "Full",
  unknown: "Availability unknown",
};

export const AVAILABILITY_CLASS: Record<Availability, string> = {
  open: "bg-open-bg text-open-ink",
  waitlist: "bg-waitlist-bg text-waitlist-ink",
  full: "bg-full-bg text-full-ink",
  unknown: "bg-unknown-bg text-unknown-ink",
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function parseISO(iso: string): { y: number; m: number; d: number } {
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m, d };
}

/** "Jun 21–27" within a month; "Jun 28 – Jul 4" across months. */
export function formatDateRange(startISO: string, endISO: string): string {
  const s = parseISO(startISO);
  const e = parseISO(endISO);
  const left = `${MONTHS[s.m - 1]} ${s.d}`;
  if (s.m === e.m) return `${left}–${e.d}`;
  return `${left} – ${MONTHS[e.m - 1]} ${e.d}`;
}

export function formatFee(cents: number | null): string {
  return cents === null ? "Fee TBD" : `$${cents.toLocaleString("en-US")}`;
}

export function formatFeeFrom(feeFrom: number | null): string {
  return feeFrom === null ? "Fee not posted" : `From $${feeFrom.toLocaleString("en-US")}`;
}

/** True when the newest verification is more than 12 months old. */
export function isStale(verifiedISO: string, now: Date = new Date()): boolean {
  const v = parseISO(verifiedISO);
  const monthsOld = (now.getFullYear() - v.y) * 12 + (now.getMonth() + 1 - v.m);
  return monthsOld > 12;
}

export function formatVerified(verifiedISO: string): string {
  const v = parseISO(verifiedISO);
  return `${MONTHS[v.m - 1]} ${v.y}`;
}
