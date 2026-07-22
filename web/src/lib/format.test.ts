import { describe, expect, it } from "vitest";
import { featureLabel, isStale, programCategories } from "./format";

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
    expect(featureLabel("zip_line")).toBe("Zip Line");
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
