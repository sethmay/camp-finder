// Per-region OpenGraph image, prerendered to /og/regions/<slug>.png (one per region).
import type { APIRoute } from "astro";
import campsData from "../../../../public/data/camps.json";
import type { Camp } from "@lib/types";
import { renderSiteCard } from "@lib/og";
import { campsByRegion, statesInRegion } from "@lib/collections";
import { REGIONS, regionSlug } from "@lib/region";

export function getStaticPaths() {
  const camps = campsData as unknown as Camp[];
  const byRegion = campsByRegion(camps);
  const statesBy = statesInRegion(camps);
  return REGIONS.map((region) => ({
    params: { slug: regionSlug(region) },
    props: {
      region,
      count: (byRegion.get(region) ?? []).length,
      stateCount: (statesBy.get(region) ?? []).length,
    },
  }));
}

export const GET: APIRoute = async ({ props }) => {
  const { region, count, stateCount } = props as { region: string; count: number; stateCount: number };
  const png = await renderSiteCard({
    headline: region,
    subtitle: "Scouts BSA summer camps",
    tags: [`${count} camps`, `${stateCount} states`],
  });
  return new Response(new Uint8Array(png), {
    headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=86400" },
  });
};
