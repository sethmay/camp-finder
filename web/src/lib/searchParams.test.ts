import { describe, expect, it } from "vitest";
import { fromParams, toParams, type UiState } from "./searchParams";

const state: UiState = {
  text: "meriwether",
  sort: "cost",
  criteria: {
    zip: "97201",
    radiusMiles: 150,
    dateStart: "2026-06-01",
    dateEnd: "2026-07-31",
    maxCost: 500,
    state: "OR",
    features: ["waterfront", "climbing"],
  },
};

describe("searchParams round-trip", () => {
  it("survives toParams -> fromParams", () => {
    const back = fromParams(new URLSearchParams(toParams(state).toString()));
    expect(back).toEqual(state);
  });

  it("omits defaults (distance sort, empty fields)", () => {
    const p = toParams({ text: "", sort: "distance", criteria: {} });
    expect(p.toString()).toBe("");
  });

  it("defaults sort to distance for unknown values", () => {
    expect(fromParams(new URLSearchParams("sort=bogus")).sort).toBe("distance");
  });
});
