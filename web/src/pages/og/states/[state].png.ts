// Per-state OpenGraph image, prerendered to /og/states/<slug>.png (one per state present).
import type { APIRoute } from "astro";
import campsData from "../../../../public/data/camps.json";
import type { Camp } from "@lib/types";
import { renderSiteCard } from "@lib/og";
import { campsByState } from "@lib/collections";
import { regionForState, stateName, stateSlug } from "@lib/region";

export function getStaticPaths() {
  const byState = campsByState(campsData as unknown as Camp[]);
  return [...byState].map(([code, camps]) => ({
    params: { state: stateSlug(code) },
    props: { code, count: camps.length },
  }));
}

export const GET: APIRoute = async ({ props }) => {
  const { code, count } = props as { code: string; count: number };
  const region = regionForState(code);
  const png = await renderSiteCard({
    headline: stateName(code),
    subtitle: "Scouts BSA summer camps",
    tags: [`${count} ${count === 1 ? "camp" : "camps"}`, ...(region ? [region] : [])],
  });
  return new Response(new Uint8Array(png), {
    headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=86400" },
  });
};
