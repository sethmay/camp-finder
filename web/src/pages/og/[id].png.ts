// Per-camp OpenGraph image, prerendered to /og/<id>.png in static output (one per camp).
import type { APIRoute } from "astro";
import campsData from "../../../public/data/camps.json";
import { renderCampCard } from "@lib/og";
import type { Camp } from "@lib/types";

export function getStaticPaths() {
  const camps = campsData as unknown as Camp[];
  return camps.map((camp) => ({ params: { id: camp.id }, props: { camp } }));
}

export const GET: APIRoute = async ({ props }) => {
  const png = await renderCampCard(props.camp as Camp);
  return new Response(new Uint8Array(png), {
    headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=86400" },
  });
};
