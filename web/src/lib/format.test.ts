import { describe, expect, it } from "vitest";
import { expandFeatures, FEATURE_FACETS, FEATURE_FACET_GROUPS, featureLabel, isStale, orderFeatures, programCategories } from "./format";

describe("isStale", () => {
  const now = new Date("2026-07-17");
  it("flags data older than 12 months", () => {
    expect(isStale("2025-02-10", now)).toBe(true);
  });
  it("passes recent data", () => {
    expect(isStale("2026-06-15", now)).toBe(false);
  });
});

describe("featureLabel", () => {
  it("resolves a known vocab code to its label", () => {
    expect(featureLabel("dining_hall")).toBe("Dining Hall");
  });
  it("humanizes an unknown code instead of dropping it", () => {
    expect(featureLabel("underwater_basket_weaving")).toBe("Underwater Basket Weaving");
  });
});

describe("programCategories", () => {
  it("maps program types to distinct user-facing categories", () => {
    expect(programCategories(["scouts_bsa_resident"])).toEqual(["scouts_bsa"]);
    expect(programCategories(["high_adventure"])).toEqual(["high_adventure"]);
  });
  it("collapses cub_resident, cub_day, and webelos into one cub category", () => {
    expect(programCategories(["cub_resident", "cub_day", "webelos"])).toEqual(["cub"]);
  });
  it("preserves first-seen order and dedupes", () => {
    expect(programCategories(["cub_resident", "cub_day", "scouts_bsa_resident"])).toEqual(["cub", "scouts_bsa"]);
  });
  it("ignores unknown program types and empty input", () => {
    expect(programCategories(["nonsense"])).toEqual([]);
    expect(programCategories([])).toEqual([]);
  });
});

describe("expandFeatures", () => {
  const g = new Map<string, string | null>([
    ["kayaking", "aquatics"],
    ["ice_fishing", "fishing"],
    ["fishing", "aquatics"],
    ["aquatics", null],
    ["loop_a", "loop_b"],
    ["loop_b", "loop_a"],
  ]);
  it("rolls a code up its full broader chain to the root", () => {
    expect([...expandFeatures(["ice_fishing"], g)].sort()).toEqual(["aquatics", "fishing", "ice_fishing"]);
  });
  it("returns an unknown code as just itself", () => {
    expect([...expandFeatures(["underwater_basket_weaving"], g)]).toEqual(["underwater_basket_weaving"]);
  });
  it("terminates on a cycle instead of looping forever", () => {
    expect(new Set(expandFeatures(["loop_a"], g))).toEqual(new Set(["loop_a", "loop_b"]));
  });
  it("dedupes a shared ancestor across inputs", () => {
    expect([...expandFeatures(["kayaking", "fishing"], g)].sort()).toEqual(["aquatics", "fishing", "kayaking"]);
  });
});

describe("orderFeatures", () => {
  it("puts signature features first, preserving order within each group", () => {
    expect(orderFeatures(["a", "b", "c", "d"], ["b", "d"])).toEqual(["b", "d", "a", "c"]);
  });
});

describe("FEATURE_FACET_GROUPS", () => {
  it("partitions every facet into exactly one group, none lost or duplicated", () => {
    const grouped = FEATURE_FACET_GROUPS.flatMap((g) => g.codes);
    expect(grouped).toEqual(FEATURE_FACETS);
    expect(new Set(grouped).size).toBe(grouped.length);
  });
  it("exposes the three category groups in order, each non-empty, no uncategorized bucket", () => {
    expect(FEATURE_FACET_GROUPS.map((g) => g.label)).toEqual([
      "Activities",
      "Programs & audience",
      "Camp facilities & lodging",
    ]);
    for (const g of FEATURE_FACET_GROUPS) expect(g.codes.length).toBeGreaterThan(0);
  });
});
