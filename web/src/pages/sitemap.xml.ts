// Hand-rolled sitemap (prerendered to /sitemap.xml in static output). We generate it
// ourselves rather than via @astrojs/sitemap: that integration's build:done hook is out of
// step with this Astro line and crashes. This lists the static routes, the region / state /
// council landing pages, and one URL per camp — all enumerated from the same camps.json the
// pages build from.
import type { APIRoute } from "astro";
import campsData from "../../public/data/camps.json";
import type { Camp } from "@lib/types";
import { REGIONS, regionSlug, stateSlug } from "@lib/region";
import { campsByCouncil, campsByState } from "@lib/collections";

const SITE = "https://scoutcamps.org";
const STATIC_PATHS = ["/", "/about/", "/compare/", "/regions/", "/states/", "/councils/"];

export const GET: APIRoute = () => {
  const camps = campsData as unknown as Camp[];
  const paths = [
    ...STATIC_PATHS,
    ...REGIONS.map((r) => `/regions/${regionSlug(r)}/`),
    ...[...campsByState(camps).keys()].map((code) => `/states/${stateSlug(code)}/`),
    ...[...campsByCouncil(camps).keys()].map((slug) => `/councils/${slug}/`),
    ...camps.map((c) => `/camps/${c.id}/`),
  ];
  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    paths.map((p) => `  <url><loc>${SITE}${p}</loc></url>`).join("\n") +
    `\n</urlset>\n`;
  return new Response(body, { headers: { "Content-Type": "application/xml" } });
};
