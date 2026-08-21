// Per-council OpenGraph image, prerendered to /og/councils/<slug>.png (one per council).
import type { APIRoute } from "astro";
import campsData from "../../../../public/data/camps.json";
import type { Camp } from "@lib/types";
import { renderSiteCard } from "@lib/og";
import { campsByCouncil } from "@lib/collections";

export function getStaticPaths() {
  const byCouncil = campsByCouncil(campsData as unknown as Camp[]);
  return [...byCouncil].map(([slug, camps]) => ({
    params: { slug },
    props: {
      name: camps[0].council_name ?? slug,
      count: camps.length,
      stateCount: new Set(camps.map((c) => c.state).filter(Boolean)).size,
    },
  }));
}

export const GET: APIRoute = async ({ props }) => {
  const { name, count, stateCount } = props as { name: string; count: number; stateCount: number };
  const png = await renderSiteCard({
    headline: name,
    subtitle: "Scouts BSA summer camps",
    tags: [`${count} ${count === 1 ? "camp" : "camps"}`, ...(stateCount > 1 ? [`${stateCount} states`] : [])],
  });
  return new Response(new Uint8Array(png), {
    headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=86400" },
  });
};
