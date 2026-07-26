// Display formatting + label lookups. Pure; unit-tested.
// Vocabulary labels come from web/public/data/vocab.json (mirrors the Open Scout API
// vocab endpoints), so the site renders any code the API emits and falls back to a
// humanized code for anything not yet in the vocab.

import type { ProgramCategory } from "./types";
import vocabData from "../../public/data/vocab.json";

interface Term {
  code: string;
  label: string;
  broader?: string | null;
  category?: string | null;
}
interface Vocab {
  features: Term[];
  program_types: Term[];
  camp_types: Term[];
}

const vocab = vocabData as Vocab;

function humanize(code: string): string {
  return code
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function lookup(terms: Term[]): (code: string) => string {
  const map = new Map(terms.map((t) => [t.code, t.label]));
  return (code) => map.get(code) ?? humanize(code);
}

export const featureLabel = lookup(vocab.features);
export const campTypeLabel = lookup(vocab.camp_types);
export const programTypeLabel = lookup(vocab.program_types);

// Feature hierarchy: each code's broader ancestor chain (shallow). Lets a broad facet
// (e.g. "aquatics") match a camp that lists only a descendant ("kayaking") — Open Scout API
// §4 rule 2: expand broader before filtering.
const FEATURE_BROADER = new Map(vocab.features.map((t) => [t.code, t.broader ?? null]));

/** A set of the given feature codes plus every broader ancestor, so filters expand upward. */
export function expandFeatures(codes: string[], broader: Map<string, string | null> = FEATURE_BROADER): Set<string> {
  const out = new Set<string>();
  for (const code of codes) {
    let c: string | null = code;
    while (c && !out.has(c)) {
      out.add(c);
      c = broader.get(c) ?? null;
    }
  }
  return out;
}

/** Curated broad feature facets shown as filter chips — the 121-term vocab is far too large
 *  to list. Several roll up descendants via expandFeatures (aquatics / shooting_sports /
 *  climbing / mountain_biking / fishing); the rest match literally. Recognizable troop draws,
 *  editorially ordered. Unknown/new vocab codes still render as camp chips, just not facets. */
export const FEATURE_FACETS: string[] = [
  "aquatics",
  "waterfront",
  "pool",
  "shooting_sports",
  "climbing",
  "cope",
  "high_adventure_option",
  "older_scout_program",
  "first_year_program",
  "stem",
  "horseback",
  "mountain_biking",
  "atv",
  "scuba",
  "dining_hall",
];

/** Feature codes ordered signature-first (stable within each group), for chip display. */
export function orderFeatures(features: string[], signature: string[]): string[] {
  const sig = new Set(signature);
  return [...features].sort((a, b) => Number(sig.has(b)) - Number(sig.has(a)));
}

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

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function parseISO(iso: string): { y: number; m: number; d: number } {
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m, d };
}

/** True when the source was last verified more than 12 months ago. */
export function isStale(verifiedISO: string, now: Date = new Date()): boolean {
  const v = parseISO(verifiedISO);
  const monthsOld = (now.getFullYear() - v.y) * 12 + (now.getMonth() + 1 - v.m);
  return monthsOld > 12;
}

export function formatVerified(verifiedISO: string): string {
  const v = parseISO(verifiedISO);
  return `${MONTHS[v.m - 1]} ${v.y}`;
}
