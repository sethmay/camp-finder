// Geographic region for a US state/territory. A deliberately simple four-way split
// (Northeast, Southeast, Central, West) used by the OG stat rail — and, later, the
// region index pages. This is NOT the council's own region naming; it is derived from
// the camp's state so both surfaces read the same way.
//
// Overseas military ZIP prefixes (AE = Transatlantic Council, AP = Far East Council)
// have no US region, so `regionForState` returns null and callers omit the field rather
// than print a false region. Puerto Rico maps to Southeast (its nearest mainland region).

const REGION_BY_STATE: Record<string, string> = {
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
export function regionForState(state: string | null | undefined): string | null {
  if (!state) return null;
  return REGION_BY_STATE[state.toUpperCase()] ?? null;
}
