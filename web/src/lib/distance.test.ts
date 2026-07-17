import { describe, expect, it } from "vitest";
import { haversineMiles } from "./distance";

describe("haversineMiles", () => {
  it("is zero for identical points", () => {
    expect(haversineMiles(45.5, -122.6, 45.5, -122.6)).toBe(0);
  });

  it("matches a known Portland->Seattle distance (~145 mi)", () => {
    const d = haversineMiles(45.5152, -122.6784, 47.6062, -122.3321);
    expect(d).toBeGreaterThan(140);
    expect(d).toBeLessThan(150);
  });

  it("is symmetric", () => {
    const a = haversineMiles(44.0, -124.1, 47.6, -122.9);
    const b = haversineMiles(47.6, -122.9, 44.0, -124.1);
    expect(Math.abs(a - b)).toBeLessThan(1e-9);
  });
});
