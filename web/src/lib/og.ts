// Build-time OpenGraph card generator (1200x630), design direction 2a "Night Plate": a
// dark-green gradient field, a blue accent rail, and — on camp cards — a right-hand stat
// rail carrying the program-feature count, location, and region. satori lays out an element
// tree and renders text to vector paths using the bundled Montserrat; sharp rasterizes the
// SVG to PNG with no system-font requirement. Consumed by the og/[id].png (one per camp) and
// og/default.png endpoints.
//
// Spec: .workbench/handoffs/design_handoff_og_cards/README.md (open-scout-api repo). Satori
// invariants honored here:
//   - every multi-child node sets display:flex;
//   - every sized+padded panel sets boxSizing:"border-box" (satori defaults to content-box and
//     would clip the PNG by ~100px);
//   - letterSpacing is px (the spec's em values resolved against each font size at author time);
//   - solid fills use backgroundColor, the field gradient uses backgroundImage;
//   - fonts are STATIC Montserrat 400/700 (variable fonts crash satori's opentype parser).
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import satori from "satori";
import sharp from "sharp";
import type { Camp } from "./types";
import { featureLabel, campTypeLabel } from "./format";
import { regionForState } from "./region";

// Direction 2a palette (README "Design Tokens"). white / body / label / line are the card-only
// text + hairline tiers on green; the rest mirror the scoutsbsa design-system tokens.
const C = {
  green: "#243E2C",
  gradient: "linear-gradient(135deg, #2C4A36 0%, #1E3526 62%, #172B1E 100%)",
  blue: "#003F87",
  cream: "#F5F1E6",
  white: "#FFFFFF",
  body: "#C9D3C2",
  label: "#8A9A84",
  line: "#4E6754",
  khaki: "#AD9D7B",
};
const FONT = "Montserrat";

// Project-relative reads (the build always runs with cwd = web/); import.meta.url can't be
// used here, it points into dist/chunks after bundling.
const fontRegular = readFileSync(resolve("src/assets/og/Montserrat-Regular.ttf"));
const fontBold = readFileSync(resolve("src/assets/og/Montserrat-Bold.ttf"));

// ---- element-tree helpers --------------------------------------------------
type Style = Record<string, unknown>;
interface Node {
  type: string;
  props: { style: Style; children?: unknown };
}
const el = (type: string, style: Style, children?: unknown): Node => ({
  type,
  props: children === undefined ? { style } : { style, children },
});
/** Drop falsy children so conditional nodes can be inlined. */
const kids = (...c: (Node | null | undefined | false)[]): Node[] => c.filter(Boolean) as Node[];

// ---- shared marks ----------------------------------------------------------
const accentRail = (): Node =>
  el("div", { position: "absolute", top: 0, left: 0, width: 16, height: 630, backgroundColor: C.blue });

const wordmark = (): Node =>
  el(
    "div",
    {
      display: "flex", alignItems: "center", padding: "8px 16px", backgroundColor: C.blue,
      fontFamily: FONT, fontSize: 14, fontWeight: 700, letterSpacing: 2.8 /* 0.2em */, color: C.white,
    },
    "CAMP FINDER",
  );

const domainMark = (): Node =>
  el(
    "div",
    { fontFamily: FONT, fontSize: 19, fontWeight: 700, letterSpacing: 1.14 /* 0.06em */, color: C.khaki },
    "scoutcamps.org",
  );

const field = (label: string, value: string, valueSize = 30): Node =>
  el("div", { display: "flex", flexDirection: "column", gap: 3 }, kids(
    el("div", { fontFamily: FONT, fontSize: 14, fontWeight: 700, letterSpacing: 2.52 /* 0.18em */, color: C.label }, label),
    el("div", { fontFamily: FONT, fontSize: valueSize, fontWeight: 700, color: C.cream }, value),
  ));

const signatureChip = (text: string): Node =>
  el("div", {
    display: "flex", alignItems: "center", gap: 10, padding: "10px 18px", borderRadius: 6,
    backgroundColor: C.cream, fontFamily: FONT, fontSize: 18, fontWeight: 700, color: C.green,
  }, kids(
    el("div", { display: "flex", width: 10, height: 10, borderRadius: 5, backgroundColor: C.blue }),
    el("div", { display: "flex" }, text),
  ));

const outlineChip = (text: string, size = 18, radius = 6, padding = "10px 18px"): Node =>
  el("div", {
    display: "flex", alignItems: "center", padding, borderRadius: radius,
    border: `2px solid ${C.line}`, fontFamily: FONT, fontSize: size, color: C.body,
  }, text);

// ---- content helpers -------------------------------------------------------
/** Camp names are the one variable-length element; step down rather than wrap to 3 lines. */
function headlineSize(name: string): number {
  if (name.length > 34) return 76;
  if (name.length > 22) return 88;
  return 100;
}

/** camp_type → uppercased vocab label, with a NOT-OPERATING suffix when inactive. */
function typeLabel(camp: Camp): string {
  const base = campTypeLabel(camp.camp_type).toUpperCase();
  return camp.operating_status && camp.operating_status !== "active" ? `${base} \u00b7 NOT OPERATING` : base;
}

/** Summary trimmed to the design's char budget (tighter when a long name ate a line). */
function trimSummary(summary: string | null, nameLen: number): string | null {
  if (!summary) return null;
  const max = nameLen > 34 ? 70 : 90;
  if (summary.length <= max) return summary;
  const cut = summary.slice(0, max);
  const sp = cut.lastIndexOf(" ");
  return `${(sp > 40 ? cut.slice(0, sp) : cut).replace(/[\s,.;:\u2014-]+$/u, "")}\u2026`;
}

// satori can't measure text, so estimate each chip's width at 18px Montserrat and stop before
// the left panel's 640px content width (760 - 76 - 44). Conservative per-char advances keep the
// row on one line ("never wrap the chip row — truncate the list").
const CHIP_ROW_MAX = 640;
const CHIP_GAP = 10;
const chipWidth = (label: string, filled: boolean): number =>
  label.length * (filled ? 11 : 10.2) + 36 /* padding */ + (filled ? 20 /* dot + gap */ : 0);

/** Signature chips (filled, <=2) then non-signature chips (outlined), <=4 total, width-budgeted. */
function chipRow(camp: Camp): Node[] {
  const chips: Node[] = [];
  let used = 0;
  const push = (node: Node, w: number): boolean => {
    const next = used + (chips.length ? CHIP_GAP : 0) + w;
    if (chips.length && next > CHIP_ROW_MAX) return false;
    chips.push(node);
    used = next;
    return true;
  };
  for (const code of camp.features_signature.slice(0, 2)) {
    const label = featureLabel(code);
    if (!push(signatureChip(label), chipWidth(label, true))) break;
  }
  for (const code of camp.features.filter((c) => !camp.features_signature.includes(c))) {
    if (chips.length >= 4) break;
    const label = featureLabel(code);
    if (!push(outlineChip(label), chipWidth(label, false))) break;
  }
  return chips;
}

// ---- cards -----------------------------------------------------------------
/** Per-camp share image for a camp detail page. */
export async function renderCampCard(camp: Camp): Promise<Buffer> {
  const nameSize = headlineSize(camp.name);
  const summary = trimSummary(camp.summary, camp.name.length);
  const region = regionForState(camp.state);
  const location = camp.city ? `${camp.city}, ${camp.state}` : (camp.state ?? "");
  const featureCount = camp.features.length;

  const facts = kids(
    location ? field("LOCATION", location) : null,
    region ? field("REGION", region) : null,
  );

  const left = el("div", {
    position: "relative", boxSizing: "border-box", display: "flex", flexDirection: "column",
    justifyContent: "space-between", width: 760, height: 630, padding: "60px 44px 56px 76px",
  }, kids(
    el("div", { display: "flex", alignItems: "center", gap: 14 }, kids(
      wordmark(),
      el("div", { fontFamily: FONT, fontSize: 16, fontWeight: 700, letterSpacing: 2.56 /* 0.16em */, color: C.khaki }, typeLabel(camp)),
    )),
    el("div", { display: "flex", flexDirection: "column", gap: 16 }, kids(
      el("div", {
        display: "flex", fontFamily: FONT, fontSize: nameSize, fontWeight: 700,
        lineHeight: 0.9, letterSpacing: nameSize * -0.035, color: C.white,
      }, camp.name),
      summary
        ? el("div", { display: "flex", fontFamily: FONT, fontSize: 26, lineHeight: 1.35, color: C.body, maxWidth: 600 }, summary)
        : null,
    )),
    el("div", { display: "flex", gap: 10 }, chipRow(camp)),
  ));

  // >=5 features: big count top, facts centered, domain bottom. <5: no count block and the
  // facts rise to the top of the rail (README edge case), domain still bottom.
  const countBlock = el("div", { display: "flex", flexDirection: "column", gap: 4 }, kids(
    el("div", { display: "flex", fontFamily: FONT, fontSize: 14, fontWeight: 700, letterSpacing: 2.52, color: C.label }, "PROGRAM FEATURES"),
    el("div", { display: "flex", fontFamily: FONT, fontSize: 132, fontWeight: 700, lineHeight: 1, letterSpacing: -5.28 /* -0.04em */, color: C.white }, String(featureCount)),
  ));
  const factsGroup = el("div", { display: "flex", flexDirection: "column", gap: 22 }, facts);
  const railChildren = featureCount >= 5
    ? kids(countBlock, factsGroup, domainMark())
    : kids(factsGroup, domainMark());

  const right = el("div", {
    position: "relative", boxSizing: "border-box", display: "flex", flexDirection: "column",
    justifyContent: "space-between", width: 440, height: 630, padding: "60px 72px 56px 44px",
    borderLeft: `2px solid ${C.line}`,
  }, railChildren);

  return rasterize(el("div", {
    position: "relative", display: "flex", width: 1200, height: 630,
    backgroundColor: C.green, backgroundImage: C.gradient, overflow: "hidden",
  }, kids(accentRail(), left, right)));
}

/** Site-wide share image: homepage, about, compare, and any route without a camp record. */
export async function renderSiteCard(opts?: {
  headline?: string;
  subtitle?: string;
  tags?: string[];
}): Promise<Buffer> {
  const headline = opts?.headline ?? "Find a Scouts BSA Summer Camp";
  const subtitle = opts?.subtitle ?? "Search by program, region, and features";
  const tags = opts?.tags ?? ["Free", "Open Source", "Council-Sourced"];

  const panel = el("div", {
    position: "relative", boxSizing: "border-box", display: "flex", flexDirection: "column",
    justifyContent: "space-between", width: 1200, height: 630, padding: "60px 76px 56px 76px",
  }, kids(
    wordmark(),
    el("div", { display: "flex", flexDirection: "column", gap: 18 }, kids(
      el("div", {
        display: "flex", fontFamily: FONT, fontSize: 104, fontWeight: 700,
        lineHeight: 0.9, letterSpacing: -3.64 /* -0.035em */, color: C.white, maxWidth: 940,
      }, headline),
      el("div", { display: "flex", alignItems: "center", gap: 16 }, kids(
        el("div", { display: "flex", width: 52, height: 4, backgroundColor: C.blue }),
        el("div", { display: "flex", fontFamily: FONT, fontSize: 30, color: C.body }, subtitle),
      )),
    )),
    el("div", { display: "flex", justifyContent: "space-between", alignItems: "flex-end" }, kids(
      el("div", { display: "flex", gap: 12 }, tags.map((t) => outlineChip(t, 20, 8, "11px 22px"))),
      domainMark(),
    )),
  ));

  return rasterize(el("div", {
    position: "relative", display: "flex", width: 1200, height: 630,
    backgroundColor: C.green, backgroundImage: C.gradient, overflow: "hidden",
  }, kids(accentRail(), panel)));
}

async function rasterize(tree: Node): Promise<Buffer> {
  const svg = await satori(tree as never, {
    width: 1200,
    height: 630,
    fonts: [
      { name: FONT, data: fontRegular, weight: 400, style: "normal" },
      { name: FONT, data: fontBold, weight: 700, style: "normal" },
    ],
  });
  return sharp(Buffer.from(svg)).png().toBuffer();
}
