import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";

// Static output: the browser loads web/public/data/*.json and filters client-side.
// No SSR, no backend. See IMPLEMENTATION.md §1, §8.
//
// Tailwind v4 is wired as a Vite plugin, not via @astrojs/tailwind (v3-only).
// The theme lives in CSS (src/styles/global.css), not a tailwind.config file --
// required by @opensourcescouting/design-system, which ships a v4 @theme mapping.
export default defineConfig({
  output: "static",
  integrations: [react()],
  vite: { plugins: [tailwindcss()] },
  // Custom domain via GitHub Pages + public/CNAME. Served at the apex root, so no `base`.
  // `site` drives canonical URLs, OpenGraph tags, and the generated sitemap.
  site: "https://scoutcamps.org",
});
