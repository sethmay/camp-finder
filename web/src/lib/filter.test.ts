import { describe, expect, it } from "vitest";
import { rankCamps, sortRanked } from "./filter";
import type { Camp } from "./types";

function camp(over: Partial<Camp> & Pick<Camp, "id" | "name" | "state">): Camp {
  return {
    camp_type: "resident_camp",
    operator: "council",
    council: "council:test",
    council_name: "Test Council",
    council_website: "https://x.org/",
    council_number: 1,
    url: "https://x.org/",
    website: null,
    summary: null,
    program_types: ["scouts_bsa_resident"],
    features: [],
    city: null,
    lat: 45.5,
    lon: -122.6,
    july_high_f: 80,
    july_low_f: 55,
    geo_precision: "exact",
    reservation: null,
    verified_at: "2026-06-01",
    confidence: 1,
    ...over,
  };
}

const PDX = { lat: 45.5152, lon: -122.6784 };

describe("rankCamps", () => {
  const near = camp({ id: "or-near", name: "Near", state: "OR", lat: 45.6, lon: -122.5 });
  const far = camp({ id: "wa-far", name: "Far", state: "WA", lat: 47.6, lon: -122.3 });

  it("filters by radius from origin and computes distance", () => {
    const r = rankCamps([near, far], { radiusMiles: 50 }, PDX);
    expect(r.map((x) => x.camp.id)).toEqual(["or-near"]);
    expect(r[0].distanceMiles).toBeGreaterThan(0);
  });

  it("excludes camps without coords when an origin is set", () => {
    const noGeo = camp({ id: "or-nogeo", name: "NoGeo", state: "OR", lat: null, lon: null });
    const r = rankCamps([near, noGeo], {}, PDX);
    expect(r.map((x) => x.camp.id)).toEqual(["or-near"]);
  });

  it("keeps camps without coords when no origin is set", () => {
    const noGeo = camp({ id: "or-nogeo", name: "NoGeo", state: "OR", lat: null, lon: null });
    const r = rankCamps([noGeo], {}, null);
    expect(r.map((x) => x.camp.id)).toEqual(["or-nogeo"]);
    expect(r[0].distanceMiles).toBeNull();
  });

  it("requires ALL selected features (AND semantics)", () => {
    const a = camp({ id: "or-a", name: "A", state: "OR", features: ["waterfront", "climbing"] });
    const b = camp({ id: "or-b", name: "B", state: "OR", features: ["waterfront"] });
    const r = rankCamps([a, b], { features: ["waterfront", "climbing"] }, null);
    expect(r.map((x) => x.camp.id)).toEqual(["or-a"]);
  });

  it("filters by state", () => {
    const r = rankCamps([near, far], { state: "WA" }, null);
    expect(r.map((x) => x.camp.id)).toEqual(["wa-far"]);
  });

  it("restricts by text-matched ids when provided", () => {
    const r = rankCamps([near, far], { textIds: new Set(["wa-far"]) }, null);
    expect(r.map((x) => x.camp.id)).toEqual(["wa-far"]);
  });

  it("drops camps over the July-high cap but keeps unknown-temp camps", () => {
    const hot = camp({ id: "hot", name: "Hot", state: "OR", july_high_f: 95 });
    const edge = camp({ id: "edge", name: "Edge", state: "OR", july_high_f: 85 });
    const cool = camp({ id: "cool", name: "Cool", state: "OR", july_high_f: 78 });
    const unknown = camp({ id: "unk", name: "Unknown", state: "OR", july_high_f: null });
    const r = rankCamps([hot, edge, cool, unknown], { maxJulyHigh: 85 }, null);
    expect(new Set(r.map((x) => x.camp.id))).toEqual(new Set(["edge", "cool", "unk"]));
  });

  it("filters by program category with OR semantics across categories", () => {
    const scouts = camp({ id: "s", name: "S", state: "OR", program_types: ["scouts_bsa_resident"] });
    const cub = camp({ id: "c", name: "C", state: "OR", program_types: ["cub_day"] });
    const ha = camp({ id: "h", name: "H", state: "OR", program_types: ["high_adventure"] });
    const r = rankCamps([scouts, cub, ha], { categories: ["cub", "high_adventure"] }, null);
    expect(new Set(r.map((x) => x.camp.id))).toEqual(new Set(["c", "h"]));
  });
});

describe("sortRanked", () => {
  const ranked = [
    { camp: camp({ id: "b", name: "Bravo", state: "OR" }), distanceMiles: 30 },
    { camp: camp({ id: "a", name: "Alpha", state: "OR" }), distanceMiles: 60 },
  ];
  it("sorts by distance ascending", () => {
    expect(sortRanked(ranked, "distance").map((r) => r.camp.id)).toEqual(["b", "a"]);
  });
  it("sorts by name", () => {
    expect(sortRanked(ranked, "name").map((r) => r.camp.name)).toEqual(["Alpha", "Bravo"]);
  });
});
