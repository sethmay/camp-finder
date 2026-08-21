// Geographic region + state naming for the OG stat rail and the region/state landing pages.
// A deliberately simple four-way region split (Northeast, Southeast, Central, West) derived
// from the camp's state — NOT the council's own region naming — so every surface groups the
// same way. Overseas military ZIP prefixes (AE = Transatlantic Council, AP = Far East Council)
// have no US region: regionForState returns null and callers omit the field / exclude them
// from region pages. Puerto Rico maps to Southeast (its nearest mainland region).

export const REGIONS = ["Northeast", "Southeast", "Central", "West"] as const;
export type Region = (typeof REGIONS)[number];

const REGION_BY_STATE: Record<string, Region> = {
  // Northeast
  CT: "Northeast", DE: "Northeast", DC: "Northeast", MA: "Northeast", MD: "Northeast",
  ME: "Northeast", NH: "Northeast", NJ: "Northeast", NY: "Northeast", PA: "Northeast",
  RI: "Northeast", VT: "Northeast",
  // Southeast
  AL: "Southeast", AR: "Southeast", FL: "Southeast", GA: "Southeast", KY: "Southeast",
  LA: "Southeast", MS: "Southeast", NC: "Southeast", PR: "Southeast", SC: "Southeast",
  TN: "Southeast", VA: "Southeast", WV: "Southeast",
  // Central
  IA: "Central", IL: "Central", IN: "Central", KS: "Central", MI: "Central", MN: "Central",
  MO: "Central", ND: "Central", NE: "Central", OH: "Central", OK: "Central", SD: "Central",
  TX: "Central", WI: "Central",
  // West
  AK: "West", AZ: "West", CA: "West", CO: "West", HI: "West", ID: "West", MT: "West",
  NM: "West", NV: "West", OR: "West", UT: "West", WA: "West", WY: "West",
};

/** The four-way region for a state code, or null for overseas/unknown (caller omits it). */
export function regionForState(state: string | null | undefined): Region | null {
  if (!state) return null;
  return REGION_BY_STATE[state.toUpperCase()] ?? null;
}

/** URL slug for a region name ("Northeast" -> "northeast"). */
export function regionSlug(region: string): string {
  return region.toLowerCase();
}

const STATE_NAMES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California", CO: "Colorado",
  CT: "Connecticut", DE: "Delaware", DC: "District of Columbia", FL: "Florida", GA: "Georgia",
  HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa", KS: "Kansas",
  KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland", MA: "Massachusetts",
  MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri", MT: "Montana",
  NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico",
  NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma",
  OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota",
  TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia", WA: "Washington",
  WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming", PR: "Puerto Rico",
  AE: "Armed Forces Europe", AP: "Armed Forces Pacific",
};

/** Full state/territory name for a postal code, or the code itself if unknown. */
export function stateName(code: string): string {
  return STATE_NAMES[code.toUpperCase()] ?? code;
}

/** URL slug from a state's full name ("New York" -> "new-york"). */
export function stateSlug(code: string): string {
  return stateName(code)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
