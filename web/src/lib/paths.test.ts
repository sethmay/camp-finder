import { describe, expect, it } from "vitest";
import { withBase } from "./paths";

// In vitest, import.meta.env.BASE_URL defaults to "/", so these assert the join
// logic (no double slash, leading-slash tolerance) that the base-path bug tripped on.
describe("withBase", () => {
  it("joins without doubling the separator", () => {
    expect(withBase("/about")).toBe("/about");
    expect(withBase("about")).toBe("/about");
    expect(withBase("/data/camps.json")).toBe("/data/camps.json");
  });

  it("maps root to the base", () => {
    expect(withBase("/")).toBe("/");
    expect(withBase()).toBe("/");
  });
});
