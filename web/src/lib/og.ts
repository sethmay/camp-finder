// Build-time OpenGraph card generator (1200x630). satori lays out the card and renders text
// to vector paths using the bundled Montserrat, so the resulting SVG is self-contained; sharp
// (already a dependency) rasterizes it to PNG with no system-font requirement. Consumed by the
// og/[id].png and og/default.png endpoints, which prerender one PNG per camp plus a default.
//
// Fonts are STATIC Montserrat instances (Regular 400, Bold 700) produced from the variable TTF
// via `python -m fontTools.varLib.instancer`; satori's opentype parser cannot read a variable
// font's fvar table.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import satori from "satori";
import sharp from "sharp";

// Brand tokens (scoutsbsa program), mirroring src/lib/map.ts fallbacks / the design system.
const BG = "#F5F1E6";
const INK = "#1A1A14";
const GREEN = "#243E2C";
const MUTED = "#6E6F60";

// Project-relative reads (the build always runs with cwd = web/); import.meta.url can't be
// used here, it points into dist/chunks after bundling.
const fontRegular = readFileSync(resolve("src/assets/og/Montserrat-Regular.ttf"));
const fontBold = readFileSync(resolve("src/assets/og/Montserrat-Bold.ttf"));

/** Camp names vary a lot in length; scale the headline so long names still fit. */
function nameSize(t: string): number {
  if (t.length > 46) return 44;
  if (t.length > 32) return 54;
  if (t.length > 22) return 64;
  return 74;
}

export interface OgCard {
  title: string;
  subtitle?: string;
}

export async function renderOgPng({ title, subtitle }: OgCard): Promise<Buffer> {
  const children: unknown[] = [
    {
      type: "div",
      props: {
        style: { display: "flex", fontSize: 30, fontWeight: 700, color: GREEN, letterSpacing: 3 },
        children: "CAMP FINDER",
      },
    },
    {
      type: "div",
      props: {
        style: { display: "flex", marginTop: 46, fontSize: nameSize(title), fontWeight: 700, color: INK, lineHeight: 1.05 },
        children: title,
      },
    },
  ];
  if (subtitle) {
    children.push({
      type: "div",
      props: { style: { display: "flex", marginTop: 22, fontSize: 34, color: MUTED }, children: subtitle },
    });
  }
  children.push({
    type: "div",
    props: {
      style: { display: "flex", marginTop: "auto", fontSize: 27, fontWeight: 700, color: GREEN },
      children: "scoutcamps.org",
    },
  });

  const tree = {
    type: "div",
    props: {
      style: {
        width: "1200px",
        height: "630px",
        display: "flex",
        flexDirection: "column",
        backgroundColor: BG,
        padding: "72px",
        fontFamily: "Montserrat",
        borderBottom: `22px solid ${GREEN}`,
      },
      children,
    },
  };

  const svg = await satori(tree as never, {
    width: 1200,
    height: 630,
    fonts: [
      { name: "Montserrat", data: fontRegular, weight: 400, style: "normal" },
      { name: "Montserrat", data: fontBold, weight: 700, style: "normal" },
    ],
  });
  return sharp(Buffer.from(svg)).png().toBuffer();
}
