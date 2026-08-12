import { describe, expect, it } from "vitest";
import { correctionHref } from "./corrections";

const FORM = "https://tally.so/r/wABC12";
const camp = { id: "wa-camp-parsons", name: "Camp Parsons", state: "WA" };

describe("correctionHref", () => {
  it("falls back to the about explainer when no form URL is configured", () => {
    // Default formUrl is "" in this build; vitest pins BASE_URL to "/".
    expect(correctionHref(camp, "camp")).toBe("/about#corrections");
  });

  it("prefills camp id/name/state and the source tag into the form URL", () => {
    const url = new URL(correctionHref(camp, "camp", FORM));
    expect(url.origin + url.pathname).toBe(FORM);
    expect(url.searchParams.get("camp_id")).toBe("wa-camp-parsons");
    expect(url.searchParams.get("camp_name")).toBe("Camp Parsons"); // space decoded
    expect(url.searchParams.get("camp_state")).toBe("WA");
    expect(url.searchParams.get("src")).toBe("camp");
  });

  it("omits camp params when no camp is given", () => {
    const url = new URL(correctionHref(undefined, "about", FORM));
    expect(url.searchParams.has("camp_id")).toBe(false);
    expect(url.searchParams.get("src")).toBe("about");
  });

  it("omits camp_state when the camp has none", () => {
    const url = new URL(correctionHref({ id: "x", name: "Y", state: null }, "compare", FORM));
    expect(url.searchParams.has("camp_state")).toBe(false);
    expect(url.searchParams.get("camp_id")).toBe("x");
  });
});
