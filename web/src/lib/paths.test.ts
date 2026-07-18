import { afterEach, describe, expect, it, vi } from "vitest";
import { withBase } from "./paths";

afterEach(() => vi.unstubAllEnvs());

describe("withBase", () => {
  it("joins onto a subpath base without doubling the separator", () => {
    vi.stubEnv("BASE_URL", "/camp-finder");
    expect(withBase("/data/camps.json")).toBe("/camp-finder/data/camps.json");
    expect(withBase("about")).toBe("/camp-finder/about");
    expect(withBase("/")).toBe("/camp-finder/");
    expect(withBase()).toBe("/camp-finder/");
  });

  it("tolerates a base that already has a trailing slash", () => {
    vi.stubEnv("BASE_URL", "/camp-finder/");
    expect(withBase("/data/meta.json")).toBe("/camp-finder/data/meta.json");
  });

  it("maps to root when base is /", () => {
    vi.stubEnv("BASE_URL", "/");
    expect(withBase("/about")).toBe("/about");
    expect(withBase()).toBe("/");
  });
});
