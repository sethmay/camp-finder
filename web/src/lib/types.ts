// Frontend data contract. MIRRORS the flattened output of web/scripts/build-data.mjs
// (web/public/data/camps.json + meta.json), which is a registry-only projection of the
// Open Scout API (v1/current/camps.json). Keep in sync when build-data.mjs changes.
//
// Registry only: no sessions, fees, dates, or availability — those live on each council's
// own page, reached via `url`.

export type GeoPrecision = "exact" | "approximate" | null;

// A camp's program_types (open vocab) collapse into these user-facing categories.
export type ProgramCategory = "scouts_bsa" | "cub" | "high_adventure";

// Set on camps that share a reservation (a multi-camp property). null = standalone camp.
export interface Reservation {
  id: string;
  name: string | null; // null when the member camps carry no shared name (e.g. Goshen)
}

export interface Camp {
  id: string;
  name: string;
  camp_type: string; // open vocab (resident_camp, day_camp, high_adventure_base, ...)
  operator: string; // council | national | other | unknown
  council: string | null; // council slug ref; null for national bases
  council_name: string | null;
  council_website: string | null;
  council_number: number | null;
  url: string; // durable link to the authoritative page (guaranteed non-null)
  website: string | null; // the camp's own page, when distinct
  summary: string | null; // evergreen prose; null when none on record
  program_types: string[];
  features: string[]; // open vocab; labels resolved via vocab.json
  features_signature: string[]; // headline-draw codes (subset of features); badges, not filtering
  features_verified_at: string | null; // survey date; null = never surveyed (don't imply "none")
  state: string | null;
  city: string | null;
  lat: number | null;
  lon: number | null;
  july_high_f: number | null; // avg July daytime high (°F); null when unknown
  july_low_f: number | null; // avg July overnight low (°F)
  elevation_ft: number | null; // elevation at the camp (feet); null when unknown
  operating_status: string | null; // "active" | "closed" | "not_operating" | ...; non-active dropped at build
  geo_precision: GeoPrecision; // "approximate" = centroid-level (co-located / city-level)
  reservation: Reservation | null;
  verified_at: string; // ISO date the source was last confirmed
  confidence: number;
}

export interface Meta {
  build_time: string;
  source: string;
  source_version: string;
  source_url: string;
  camp_count: number;
  council_count: number;
  states_covered: string[];
}

// A camp annotated with values computed for the current query (distance).
export interface RankedCamp {
  camp: Camp;
  distanceMiles: number | null;
}

export interface Criteria {
  zip?: string;
  radiusMiles?: number;
  /** Max avg July daytime high (°F); camps hotter than this are dropped (unknown temps pass). */
  maxJulyHigh?: number;
  features?: string[];
  categories?: ProgramCategory[];
  state?: string;
  /** Ids matched by the text search island; undefined = text filter inactive. */
  textIds?: Set<string>;
}

export type SortKey = "distance" | "name";
