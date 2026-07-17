import { describe, expect, it } from "vitest";
import { formatDateRange, formatFee, formatFeeFrom, isStale } from "./format";

describe("formatDateRange", () => {
  it("collapses same-month ranges", () => {
    expect(formatDateRange("2026-06-21", "2026-06-27")).toBe("Jun 21–27");
  });
  it("spans month boundaries", () => {
    expect(formatDateRange("2026-06-28", "2026-07-04")).toBe("Jun 28 – Jul 4");
  });
});

describe("fees", () => {
  it("shows TBD for null fee", () => {
    expect(formatFee(null)).toBe("Fee TBD");
    expect(formatFeeFrom(null)).toBe("Fee not posted");
  });
  it("formats dollars with separators", () => {
    expect(formatFee(1415)).toBe("$1,415");
    expect(formatFeeFrom(415)).toBe("From $415");
  });
});

describe("isStale", () => {
  const now = new Date("2026-07-17");
  it("flags data older than 12 months", () => {
    expect(isStale("2025-02-10", now)).toBe(true);
  });
  it("passes recent data", () => {
    expect(isStale("2026-06-15", now)).toBe(false);
  });
});
