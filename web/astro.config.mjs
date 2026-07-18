import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwind from "@astrojs/tailwind";

// Static output: the browser loads web/public/data/*.json and filters client-side.
// No SSR, no backend. See IMPLEMENTATION.md §1, §8.
export default defineConfig({
  output: "static",
  integrations: [react(), tailwind({ applyBaseStyles: false })],
  // GitHub Pages project site: https://sethmay.github.io/camp-finder/
  site: "https://sethmay.github.io",
  base: "/camp-finder",
});
