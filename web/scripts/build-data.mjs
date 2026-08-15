// Compile the frontend dataset from the Open Scout API (registry-only).
//
//   open-scout-api v1/current/camps.json + v1/vocab/*.json  ->  web/public/data/{camps,meta,vocab}.json
//
// The API is the core data source. This is a deliberate REFRESH step (run `npm run data`),
// not part of `npm run build` — the emitted JSON is committed so the site deploys from a
// clean checkout with no network. Registry only: sessions, fees, dates, and availability
// are intentionally absent (they stay on each council's own page, reached via `url`).
//
// The denormalized projection carries council join, durable `url`, reservation grouping, geo
// precision, freshness dates, and (since v0.35.0) camp `features`, `features_signature`, and
// `features_verified_at` — so no canonical per-camp fetch is needed; we deliberately avoid it
// because canonical `features[]` became object-shaped at 0.29.0.

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const BASE = "https://sethmay.github.io/open-scout-api";
// Pin the release we built against. `current/*.json` is served latest-only from Pages, so
// we assert the version instead of an immutable URL; a mismatch fails the refresh loudly.
// Switch to the jsDelivr-pinned release tarball once `v*` tags are published.
const EXPECTED_VERSION = "0.58.13";

// Program types this site surfaces. A camp is included if it offers at least one.
// Anything outside this set (e.g. venturing, sea_scout) is skipped until the UI supports it.
const SUPPORTED_PROGRAMS = new Set([
  "scouts_bsa_resident",
  "cub_resident",
  "cub_day",
  "webelos",
  "high_adventure",
]);

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "data");

async function getJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status} ${res.statusText}`);
  return res.json();
}

function vocabTerms(doc) {
  return (doc.terms ?? []).map((t) => ({
    code: t.code,
    label: t.label,
    category: t.category ?? null,
    broader: t.broader ?? null,
  }));
}

async function main() {
  console.log(`Fetching Open Scout API (expecting v${EXPECTED_VERSION})...`);
  const [meta, campsDoc, featuresVocab, programVocab, typesVocab] = await Promise.all([
    getJSON(`${BASE}/v1/meta.json`),
    getJSON(`${BASE}/v1/current/camps.json`),
    getJSON(`${BASE}/v1/vocab/camp-features.json`),
    getJSON(`${BASE}/v1/vocab/camp-program-types.json`),
    getJSON(`${BASE}/v1/vocab/camp-types.json`),
  ]);

  if (meta.version !== EXPECTED_VERSION) {
    throw new Error(
      `API version drift: live is v${meta.version}, this build pins v${EXPECTED_VERSION}. ` +
        `Review changes and bump EXPECTED_VERSION in build-data.mjs.`,
    );
  }

  // Registry scope: a supported program AND currently operating. Camps the API marks
  // `closed` / `not_operating` are dropped — a directory used to pick next summer's camp
  // must not surface a camp that no longer runs (any other/unknown status passes).
  const included = campsDoc.items.filter(
    (c) =>
      (c.program_types ?? []).some((p) => SUPPORTED_PROGRAMS.has(p)) &&
      c.operating_status !== "closed" &&
      c.operating_status !== "not_operating",
  );
  console.log(`Camps: ${campsDoc.items.length} current -> ${included.length} in scope.`);

  const camps = included
    .map((c) => ({
      id: c.id,
      name: c.name,
      camp_type: c.camp_type,
      operator: c.operator,
      council: c.council,
      council_name: c.council_name,
      council_website: c.council_website,
      council_number: c.council_number,
      url: c.url,
      website: c.website,
      summary: c.summary,
      program_types: c.program_types ?? [],
      features: c.features ?? [],
      features_signature: c.features_signature ?? [],
      features_verified_at: c.features_verified_at ?? null,
      state: c.state,
      city: c.city,
      lat: c.lat,
      lon: c.lon,
      july_high_f: c.july_high_f,
      july_low_f: c.july_low_f,
      elevation_ft: c.elevation_ft,
      operating_status: c.operating_status,
      geo_precision: c.geo_precision,
      reservation: c.reservation,
      verified_at: c.verified_at,
      confidence: c.confidence,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));

  const states = [...new Set(camps.map((c) => c.state).filter(Boolean))].sort();
  const councils = new Set(camps.map((c) => c.council).filter(Boolean));

  const outMeta = {
    build_time: new Date().toISOString(),
    source: "open-scout-api",
    source_version: meta.version,
    source_url: BASE,
    camp_count: camps.length,
    council_count: councils.size,
    states_covered: states,
  };

  const vocab = {
    features: vocabTerms(featuresVocab),
    program_types: vocabTerms(programVocab),
    camp_types: vocabTerms(typesVocab),
  };

  await mkdir(OUT_DIR, { recursive: true });
  const write = (name, data) =>
    writeFile(join(OUT_DIR, name), JSON.stringify(data, null, 2) + "\n");
  await Promise.all([
    write("camps.json", camps),
    write("meta.json", outMeta),
    write("vocab.json", vocab),
  ]);

  console.log(
    `Wrote ${camps.length} camps, ${councils.size} councils, ${states.length} states ` +
      `from open-scout-api v${meta.version} -> ${OUT_DIR}`,
  );
}

main().catch((err) => {
  console.error("build-data failed:", err.message);
  process.exit(1);
});
