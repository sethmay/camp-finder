// Prefix an app-internal path with Astro's configured `base` (e.g. "/camp-finder/")
// so links and fetches resolve under a GitHub Pages project subpath and at root alike.
// Vite inlines import.meta.env.BASE_URL at build; reading it inside the function keeps
// production behavior identical while letting tests stub a non-root base.
export function withBase(path = "/"): string {
  const base = import.meta.env.BASE_URL;
  return base.replace(/\/$/, "") + "/" + path.replace(/^\//, "");
}
