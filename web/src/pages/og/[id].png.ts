// Per-camp OpenGraph image, prerendered to /og/<id>.png in static output (one per camp).
import type { APIRoute } from "astro";
import campsData from "../../../public/data/camps.json";
import { renderOgPng } from "@lib/og";
import type { Camp } from "@lib/types";

export function getStaticPaths() {
  const camps = campsData as unknown as Camp[];
  return camps.map((camp) => ({ params: { id: camp.id }, props: { camp } }));
}

export const GET: APIRoute = async ({ props }) => {
  const camp = props.camp as Camp;
  const subtitle = [camp.council_name, camp.state].filter(Boolean).join("  \u00b7  ");
  const png = await renderOgPng({ title: camp.name, subtitle: subtitle || undefined });
  return new Response(new Uint8Array(png), {
    headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=86400" },
  });
};
