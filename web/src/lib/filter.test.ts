import { describe, expect, it } from "vitest";
import { rankCamps, sortRanked } from "./filter";
import type { Camp, Session } from "./types";

function session(over: Partial<Session> & Pick<Session, "id" | "start_date" | "end_date">): Session {
  return {
    year: Number(over.start_date.slice(0, 4)),
    program_type: "scouts_bsa_resident",
    fee_youth: 400,
    fee_adult: 180,
    fee_notes: null,
    registration_url: null,
    availability: "open",
    source_url: "https://x.org/",
    verified_at: "2026-06-01",
    ...over,
  } as Session;
}

function camp(over: Partial<Camp> & Pick<Camp, "id" | "name" | "state">): Camp {
  return {
    council_id: "council-001",
    council_name: "Test Council",
    council_website: "https://x.org/",
    council_platform: "blackpug",
    status: "active",
    address: null,
    city: null,
    lat: 45.5,
    lon: -122.6,
    website_url: "https://x.org/",
    program_types: ["scouts_bsa_resident"],
    features: [],
    description: null,
    fee_from: 400,
    verified_at: "2026-06-01",
    source_url: "https://x.org/",
    method: "manual",
    confidence: 1,
    sessions: [session({ id: `${over.id}-2026-06-21`, start_date: "2026-06-21", end_date: "2026-06-27" })],
    ...over,
  };
}

const PDX = { lat: 45.5152, lon: -122.6784 };

describe("rankCamps", () => {
  const near = camp({ id: "or-near", name: "Near", state: "OR", lat: 45.6, lon: -122.5 });
  const far = camp({ id: "wa-far", name: "Far", state: "WA", lat: 47.6, lon: -122.3 });

  it("filters by radius from origin and computes distance", () => {
    const r = rankCamps([near, far], { upcomingYear: 2026, radiusMiles: 50 }, PDX);
    expect(r.map((x) => x.camp.id)).toEqual(["or-near"]);
    expect(r[0].distanceMiles).toBeGreaterThan(0);
  });

  it("excludes camps without coords when an origin is set", () => {
    const noGeo = camp({ id: "or-nogeo", name: "NoGeo", state: "OR", lat: null, lon: null });
    const r = rankCamps([near, noGeo], { upcomingYear: 2026 }, PDX);
    expect(r.map((x) => x.camp.id)).toEqual(["or-near"]);
  });

  it("requires ALL selected features (AND semantics)", () => {
    const a = camp({ id: "or-a", name: "A", state: "OR", features: ["waterfront", "climbing"] });
    const b = camp({ id: "or-b", name: "B", state: "OR", features: ["waterfront"] });
    const r = rankCamps([a, b], { upcomingYear: 2026, features: ["waterfront", "climbing"] }, null);
    expect(r.map((x) => x.camp.id)).toEqual(["or-a"]);
  });

  it("keeps unknown-fee camps under a cost cap but drops known-over-cap", () => {
    const cheap = camp({ id: "or-cheap", name: "Cheap", state: "OR", fee_from: 300,
      sessions: [session({ id: "or-cheap-2026-06-21", start_date: "2026-06-21", end_date: "2026-06-27", fee_youth: 300 })] });
    const pricey = camp({ id: "or-pricey", name: "Pricey", state: "OR", fee_from: 600,
      sessions: [session({ id: "or-pricey-2026-06-21", start_date: "2026-06-21", end_date: "2026-06-27", fee_youth: 600 })] });
    const unknown = camp({ id: "or-unknown", name: "Unknown", state: "OR", fee_from: null,
      sessions: [session({ id: "or-unknown-2026-06-21", start_date: "2026-06-21", end_date: "2026-06-27", fee_youth: null })] });
    const r = rankCamps([cheap, pricey, unknown], { upcomingYear: 2026, maxCost: 400 }, null);
    expect(new Set(r.map((x) => x.camp.id))).toEqual(new Set(["or-cheap", "or-unknown"]));
  });

  it("matches sessions overlapping the date window", () => {
    const early = camp({ id: "or-early", name: "Early", state: "OR",
      sessions: [session({ id: "or-early-2026-06-07", start_date: "2026-06-07", end_date: "2026-06-13" })] });
    const late = camp({ id: "or-late", name: "Late", state: "OR",
      sessions: [session({ id: "or-late-2026-07-19", start_date: "2026-07-19", end_date: "2026-07-25" })] });
    const r = rankCamps([early, late], { upcomingYear: 2026, dateStart: "2026-07-01", dateEnd: "2026-07-31" }, null);
    expect(r.map((x) => x.camp.id)).toEqual(["or-late"]);
  });

  it("ignores sessions from past seasons", () => {
    const old = camp({ id: "or-old", name: "Old", state: "OR",
      sessions: [session({ id: "or-old-2025-06-21", start_date: "2025-06-21", end_date: "2025-06-27" })] });
    const r = rankCamps([old], { upcomingYear: 2026, dateStart: "2026-06-01", dateEnd: "2026-08-31" }, null);
    expect(r).toHaveLength(0);
  });

  it("restricts by text-matched ids when provided", () => {
    const r = rankCamps([near, far], { upcomingYear: 2026, textIds: new Set(["wa-far"]) }, null);
    expect(r.map((x) => x.camp.id)).toEqual(["wa-far"]);
  });

  it("filters by program category with OR semantics across categories", () => {
    const sbsa = camp({ id: "or-sbsa", name: "SBSA", state: "OR" });
    const ha = camp({ id: "or-ha", name: "HA", state: "OR", program_types: ["high_adventure"] });
    const both = camp({ id: "or-both", name: "Both", state: "OR", program_types: ["cub_resident", "high_adventure"] });
    const camps = [sbsa, ha, both];
    expect(
      rankCamps(camps, { upcomingYear: 2026, categories: ["high_adventure"] }, null).map((r) => r.camp.id).sort(),
    ).toEqual(["or-both", "or-ha"]);
    expect(rankCamps(camps, { upcomingYear: 2026, categories: ["cub"] }, null).map((r) => r.camp.id)).toEqual(["or-both"]);
    expect(rankCamps(camps, { upcomingYear: 2026 }, null).length).toBe(3);
  });
});

describe("sortRanked", () => {
  const ranked = [
    { camp: camp({ id: "b", name: "Bravo", state: "OR", fee_from: 500 }), distanceMiles: 30, nextSession: null },
    { camp: camp({ id: "a", name: "Alpha", state: "OR", fee_from: 300 }), distanceMiles: 60, nextSession: null },
  ];
  it("sorts by distance ascending", () => {
    expect(sortRanked(ranked, "distance").map((r) => r.camp.id)).toEqual(["b", "a"]);
  });
  it("sorts by cost ascending", () => {
    expect(sortRanked(ranked, "cost").map((r) => r.camp.id)).toEqual(["a", "b"]);
  });
  it("sorts by name", () => {
    expect(sortRanked(ranked, "name").map((r) => r.camp.name)).toEqual(["Alpha", "Bravo"]);
  });
});
