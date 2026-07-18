// Prefix an app-internal path with Astro's configured `base` (e.g. "/camp-finder/")
// so links resolve under a GitHub Pages project subpath and at root alike.
// Runtime data fetches use `import.meta.env.BASE_URL` directly (see SearchApp).
const BASE = import.meta.env.BASE_URL;

export function withBase(path = "/"): string {
  return BASE.replace(/\/$/, "") + "/" + path.replace(/^\//, "");
}
