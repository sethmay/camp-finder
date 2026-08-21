// Site-wide default OpenGraph image (home, about, compare), prerendered to /og/default.png.
import type { APIRoute } from "astro";
import { renderSiteCard } from "@lib/og";

export const GET: APIRoute = async () => {
  const png = await renderSiteCard();
  return new Response(new Uint8Array(png), {
    headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=86400" },
  });
};
