// Hand-rolled sitemap (prerendered to /sitemap.xml in static output). We generate it
// ourselves rather than via @astrojs/sitemap: that integration's build:done hook is out of
// step with this Astro line and crashes. This lists the static routes plus one URL per camp,
// enumerated from the same camps.json the [id] pages are built from.
import type { APIRoute } from "astro";
import campsData from "../../public/data/camps.json";

const SITE = "https://scoutcamps.org";
const STATIC_PATHS = ["/", "/about/", "/compare/"];

export const GET: APIRoute = () => {
  const camps = campsData as unknown as { id: string }[];
  const paths = [...STATIC_PATHS, ...camps.map((c) => `/camps/${c.id}/`)];
  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    paths.map((p) => `  <url><loc>${SITE}${p}</loc></url>`).join("\n") +
    `\n</urlset>\n`;
  return new Response(body, { headers: { "Content-Type": "application/xml" } });
};
