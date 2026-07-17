// Frontend data contract. MIRRORS the flattened output of pipeline/campfinder/build.py
// (web/public/data/camps.json + meta.json) and the canonical enums in
// pipeline/campfinder/models.py. Keep in sync when the schema changes.

export type Availability = "open" | "waitlist" | "full" | "unknown";

export type CampStatus = "active" | "not_operating" | "closed";

export type Feature =
  | "dining_hall"
  | "waterfront"
  | "pool"
  | "shooting_sports"
  | "climbing"
  | "horseback"
  | "atv"
  | "cope"
  | "older_scout_program"
  | "high_adventure_option"
  | "stem"
  | "scuba"
  | "mountain_biking";

export interface Session {
  id: string;
  year: number;
  start_date: string; // ISO yyyy-mm-dd
  end_date: string; // ISO yyyy-mm-dd
  program_type: string;
  fee_youth: number | null;
  fee_adult: number | null;
  fee_notes: string | null;
  registration_url: string | null;
  availability: Availability;
  source_url: string;
  verified_at: string; // ISO date
}

export interface Camp {
  id: string;
  name: string;
  council_id: string;
  council_name: string;
  council_website: string | null;
  council_platform: string;
  status: CampStatus;
  address: string | null;
  city: string | null;
  state: string;
  lat: number | null;
  lon: number | null;
  website_url: string;
  program_types: string[];
  features: Feature[];
  description: string | null;
  fee_from: number | null;
  verified_at: string; // ISO date (newest across camp + sessions)
  source_url: string;
  method: string;
  confidence: number;
  sessions: Session[];
}

export interface Meta {
  build_time: string;
  upcoming_summer_year: number;
  council_count: number;
  camp_count: number;
  session_count: number;
  states_covered: string[];
  dead_link_count: number;
}

// A camp annotated with values computed for the current query (distance, next session).
export interface RankedCamp {
  camp: Camp;
  distanceMiles: number | null;
  nextSession: Session | null;
}

export interface Criteria {
  zip?: string;
  radiusMiles?: number;
  dateStart?: string; // ISO
  dateEnd?: string; // ISO
  maxCost?: number;
  features?: Feature[];
  state?: string;
  /** Ids matched by the text search island; undefined = text filter inactive. */
  textIds?: Set<string>;
  /** Season being shopped; sessions older than this year are ignored. */
  upcomingYear: number;
}

export type SortKey = "distance" | "cost" | "name";
