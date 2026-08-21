// Site-wide default OpenGraph image (home, about, compare), prerendered to /og/default.png.
import type { APIRoute } from "astro";
import { renderOgPng } from "@lib/og";

export const GET: APIRoute = async () => {
  const png = await renderOgPng({
    title: "Find a Scouts BSA summer camp",
    subtitle: "Search camps from councils across the country",
  });
  return new Response(new Uint8Array(png), {
    headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=86400" },
  });
};
