import { describe, expect, it } from "vitest";
import {
  campDistanceMiles,
  categoryCount,
  compareFromParams,
  compareToParams,
  dotTrack,
  elevationNote,
  featureDiffers,
  featureMark,
  formatDistance,
  formatElevation,
  isAreaGeo,
  isSurveyed,
  nearestCampId,
  tempNote,
  type CompareState,
} from "./compare";
import { FEATURE_CATEGORIES } from "./format";
import type { Camp } from "./types";
import vocab from "../../public/data/vocab.json";

function camp(over: Partial<Camp> & Pick<Camp, "id">): Camp {
  return {
    name: over.id,
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
    features_signature: [],
    features_verified_at: "2026-06-01",
    state: "OR",
    city: null,
    lat: 45,
    lon: -122,
    july_high_f: 80,
    july_low_f: 55,
    elevation_ft: 1000,
    operating_status: "active",
    geo_precision: "exact",
    reservation: null,
    verified_at: "2026-06-01",
    confidence: 1,
    ...over,
  } as Camp;
}

describe("survey + geo predicates", () => {
  it("treats a null feature-survey date as unsurveyed", () => {
    expect(isSurveyed(camp({ id: "a", features_verified_at: null }))).toBe(false);
    expect(isSurveyed(camp({ id: "b", features_verified_at: "2025-01-01" }))).toBe(true);
  });
  it("maps geo_precision 'approximate' to area", () => {
    expect(isAreaGeo(camp({ id: "a", geo_precision: "approximate" }))).toBe(true);
    expect(isAreaGeo(camp({ id: "b", geo_precision: "exact" }))).toBe(false);
  });
});

describe("featureMark — the null-vs-empty rule", () => {
  it("returns not_surveyed for an unsurveyed camp, never not_offered", () => {
    const c = camp({ id: "a", features_verified_at: null, features: [] });
    expect(featureMark(c, "swimming")).toBe("not_surveyed");
  });
  it("distinguishes surveyed-and-has from surveyed-and-lacks", () => {
    const c = camp({ id: "a", features: ["swimming"] });
    expect(featureMark(c, "swimming")).toBe("offered");
    expect(featureMark(c, "sailing")).toBe("not_offered");
  });
  it("counts a descendant as offering its broader ancestor is NOT implied downward", () => {
    // Upward expansion: a camp listing kayaking offers the aquatics parent, not vice versa.
    const c = camp({ id: "a", features: ["kayaking"] });
    expect(featureMark(c, "aquatics")).toBe("offered");
    expect(featureMark(c, "sailing")).toBe("not_offered");
  });
});

describe("categoryCount", () => {
  const members = ["swimming", "sailing", "kayaking"];
  it("is null for an unsurveyed camp", () => {
    expect(categoryCount(camp({ id: "a", features_verified_at: null }), members)).toBeNull();
  });
  it("counts offered members against the taxonomy total", () => {
    const c = camp({ id: "a", features: ["swimming", "kayaking"] });
    expect(categoryCount(c, members)).toEqual({ n: 2, of: 3 });
  });
  it("reads 0 of N for a surveyed camp offering none (not 0 of 0)", () => {
    expect(categoryCount(camp({ id: "a", features: [] }), members)).toEqual({ n: 0, of: 3 });
  });
});

describe("distance + elevation formatting (geo precision)", () => {
  it("returns null distance without an origin or coords", () => {
    expect(campDistanceMiles(camp({ id: "a" }), null)).toBeNull();
    expect(campDistanceMiles(camp({ id: "a", lat: null }), { lat: 45, lon: -122 })).toBeNull();
  });
  it("rounds exact distance to the mile; area distance to 5 mi with a ≈ prefix", () => {
    expect(formatDistance(253.4, false)).toBe("253 mi");
    expect(formatDistance(71.2, true)).toBe("\u224870 mi");
    expect(formatDistance(null, false)).toBeNull();
  });
  it("formats elevation with a thousands separator; area rounds to 50 ft", () => {
    expect(formatElevation(4180, false)).toBe("4,180 ft");
    expect(formatElevation(4137, true)).toBe("4,150 ft");
    expect(formatElevation(null, true)).toBeNull();
  });
});

describe("nearestCampId", () => {
  const origin = { lat: 45, lon: -122 };
  const at = (id: string, dLat: number) => camp({ id, lat: 45 + dLat, lon: -122 });
  it("returns null without an origin", () => {
    expect(nearestCampId([at("a", 0), at("b", 0.1)], null)).toBeNull();
  });
  it("returns null with fewer than two located camps", () => {
    expect(nearestCampId([at("a", 0), camp({ id: "b", lat: null })], origin)).toBeNull();
  });
  it("picks the closest when the margin clears the rounding granularity", () => {
    // 0.1° lat ≈ 6.9 mi apart — a real winner.
    expect(nearestCampId([at("b", 0.1), at("a", 0)], origin)).toBe("a");
  });
  it("suppresses the badge when the 1st/2nd margin is within 5 mi", () => {
    // 0.05° lat ≈ 3.4 mi apart — too close to claim a winner.
    expect(nearestCampId([at("a", 0), at("c", 0.05)], origin)).toBeNull();
  });
});

describe("interpretive notes", () => {
  it("temp note thresholds", () => {
    expect(tempNote(90)).toBe("Hot afternoons");
    expect(tempNote(84)).toBe("Hot afternoons");
    expect(tempNote(70)).toBe("Cool and damp");
    expect(tempNote(78)).toBe("Warm, dry days");
    expect(tempNote(null)).toBeNull();
  });
  it("elevation note thresholds", () => {
    expect(elevationNote(4000)).toBe("Cool nights, thin air");
    expect(elevationNote(300)).toBe("Coastal, humid");
    expect(elevationNote(1500)).toBe("Mid-elevation");
    expect(elevationNote(null)).toBeNull();
  });
});

describe("featureDiffers — excludes unsurveyed camps", () => {
  it("is true only when known camps genuinely disagree", () => {
    const has = camp({ id: "a", features: ["sailing"] });
    const lacks = camp({ id: "b", features: [] });
    expect(featureDiffers([has, lacks], "sailing")).toBe(true);
  });
  it("is false when all surveyed camps agree", () => {
    const a = camp({ id: "a", features: ["sailing"] });
    const b = camp({ id: "b", features: ["sailing"] });
    expect(featureDiffers([a, b], "sailing")).toBe(false);
  });
  it("does not manufacture a difference from an unsurveyed camp", () => {
    const has = camp({ id: "a", features: ["sailing"] });
    const unknown = camp({ id: "b", features_verified_at: null });
    expect(featureDiffers([has, unknown], "sailing")).toBe(false);
  });
});

describe("dotTrack", () => {
  it("renders n filled then (of-n) hollow", () => {
    expect(dotTrack(2, 5)).toBe("\u25CF\u25CF\u25CB\u25CB\u25CB");
    expect(dotTrack(0, 3)).toBe("\u25CB\u25CB\u25CB");
  });
});

describe("FEATURE_CATEGORIES model", () => {
  it("partitions every vocab feature term into exactly one category", () => {
    const allCodes = new Set(vocab.features.map((t) => t.code));
    const covered = new Set<string>();
    for (const c of FEATURE_CATEGORIES) {
      for (const m of c.members) {
        expect(covered.has(m)).toBe(false); // no term in two categories
        covered.add(m);
      }
      if (allCodes.has(c.key)) covered.add(c.key); // a cluster key is a real term (its parent)
    }
    expect(covered).toEqual(allCodes);
  });
  it("leads with Aquatics and orders activity clusters by depth", () => {
    expect(FEATURE_CATEGORIES[0].key).toBe("aquatics");
    const clusterSizes = FEATURE_CATEGORIES.filter((c) =>
      new Set(vocab.features.map((t) => t.code)).has(c.key),
    ).map((c) => c.members.length);
    expect(clusterSizes).toEqual([...clusterSizes].sort((a, b) => b - a));
  });
});

describe("compare URL state", () => {
  const base: CompareState = { campIds: ["a", "b"], zip: "97403", open: new Set(["aquatics"]), onlyDiff: false };
  it("round-trips a full state", () => {
    const back = compareFromParams(compareToParams(base));
    expect(back).toEqual(base);
  });
  it("dedupes, caps at 5, and drops unknown ids when a valid set is given", () => {
    const p = new URLSearchParams("camps=a,a,b,x,c,d,e,f");
    const s = compareFromParams(p, { validIds: new Set(["a", "b", "c", "d", "e", "f"]) });
    expect(s.campIds).toEqual(["a", "b", "c", "d", "e"]); // x dropped, dupes removed, capped
  });
  it("defaults open to aquatics only when the param is absent, but honors an empty param", () => {
    expect([...compareFromParams(new URLSearchParams("camps=a,b")).open]).toEqual(["aquatics"]);
    expect([...compareFromParams(new URLSearchParams("camps=a,b&open=")).open]).toEqual([]);
  });
  it("rejects a malformed ZIP", () => {
    expect(compareFromParams(new URLSearchParams("zip=abc")).zip).toBeNull();
    expect(compareFromParams(new URLSearchParams("zip=97403")).zip).toBe("97403");
  });
  it("reflects the differences toggle", () => {
    expect(compareFromParams(new URLSearchParams("diff=1")).onlyDiff).toBe(true);
    expect(compareToParams({ ...base, onlyDiff: true }).get("diff")).toBe("1");
  });
});
