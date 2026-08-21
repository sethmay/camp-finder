import { describe, it, expect } from "vitest";
import { buildChecklist, type ChecklistSection } from "./checklist";
import type { Camp } from "./types";

function camp(overrides: Partial<Camp> = {}): Camp {
  return {
    id: "x",
    name: "Test Camp",
    camp_type: "resident_camp",
    operator: "council",
    council: "council:test",
    council_name: "Test Council",
    council_website: null,
    council_number: null,
    url: "https://example.org/",
    website: null,
    summary: null,
    program_types: [],
    features: [],
    features_signature: [],
    features_verified_at: null,
    state: "OH",
    city: null,
    lat: null,
    lon: null,
    july_high_f: null,
    july_low_f: null,
    elevation_ft: null,
    operating_status: "active",
    geo_precision: null,
    reservation: null,
    verified_at: "2026-01-01",
    confidence: 1,
    ...overrides,
  };
}

const ids = (secs: ChecklistSection[]): string[] => secs.flatMap((s) => s.items.map((i) => i.id));
const titles = (secs: ChecklistSection[]): string[] => secs.map((s) => s.title);

describe("buildChecklist", () => {
  it("always includes the health documents", () => {
    expect(ids(buildChecklist(camp()))).toContain("health-form");
  });

  it("keeps every item id unique (they key per-camp localStorage state)", () => {
    const list = ids(
      buildChecklist(
        camp({
          features: ["aquatics", "scuba", "high_adventure_option", "mountain_biking", "fishing", "cope"],
          july_low_f: 40,
          july_high_f: 95,
          elevation_ft: 7000,
        }),
      ),
    );
    expect(new Set(list).size).toBe(list.length);
  });

  it("packs overnight gear for a resident camp but not a day camp", () => {
    expect(titles(buildChecklist(camp({ camp_type: "resident_camp" })))).toContain("Bedding & shelter");
    expect(ids(buildChecklist(camp({ camp_type: "resident_camp" })))).toContain("sleeping-bag");
    expect(titles(buildChecklist(camp({ camp_type: "day_camp" })))).not.toContain("Bedding & shelter");
  });

  it("adds swim gear for a waterfront camp, and omits it for a dry one", () => {
    expect(ids(buildChecklist(camp({ features: ["waterfront"] })))).toContain("swimsuit");
    expect(ids(buildChecklist(camp({ features: [] })))).not.toContain("swimsuit");
  });

  it("adds warm layers for cold nights (low July low OR high elevation)", () => {
    expect(ids(buildChecklist(camp({ july_low_f: 42 })))).toContain("warm-layer");
    expect(ids(buildChecklist(camp({ elevation_ft: 8000 })))).toContain("warm-layer");
    expect(ids(buildChecklist(camp({ july_low_f: 65, elevation_ft: 500 })))).not.toContain("warm-layer");
  });

  it("asks about a tent only when no provided shelter is on record", () => {
    expect(ids(buildChecklist(camp({ features: [] })))).toContain("tent-check");
    expect(ids(buildChecklist(camp({ features: ["platform_tents"] })))).not.toContain("tent-check");
    expect(ids(buildChecklist(camp({ features: ["cabins"] })))).not.toContain("tent-check");
  });
});
