# Camp Finder

A free, static website that helps Scout troops discover **Scouts BSA resident summer
camps** across the ~230 Scouting America councils — filter by distance, program, and
features — and click through to each camp's **official council page** for dates and fees.

> **Unofficial community tool.** Not affiliated with, endorsed by, or sponsored by
> Scouting America (Boy Scouts of America). Camp Finder is a directory and a pointer to
> authoritative sources; always confirm dates and fees on the council's own page.

Planning & specs: [`PLAN.md`](./PLAN.md) · [`IMPLEMENTATION.md`](./IMPLEMENTATION.md) ·
[`DESIGN_BRIEF.md`](./DESIGN_BRIEF.md) · agent guide: [`CLAUDE.md`](./CLAUDE.md).

## Architecture

Camp and council data comes from the **[Open Scout API](https://github.com/sethmay/open-scout-api)**
— an open, versioned dataset of Scouting America reference data. A small refresh step
(`web/scripts/build-data.mjs`) fetches the API's denormalized `current/camps.json` +
vocabularies, filters to the camps this site surfaces, and writes static JSON to
`web/public/data/`. An **Astro + React static site** (`web/`) loads that JSON and filters
entirely **client-side** — no backend, no runtime database.

```
Open Scout API (current/camps.json + vocab)  --(npm run data)-->  web/public/data/*.json  -->  Astro static site
```

**Registry only.** The site carries durable registry facts — location, council, program,
features, reservation grouping, and a durable link to the council page. Highly transitory
data (session dates, fees, availability) deliberately lives on each council's own site,
reached via each camp's `url`.

## Data (`web/scripts/build-data.mjs`)

The emitted JSON is **committed** so the site deploys from a clean checkout with no
network. Refreshing it is a deliberate step, pinned to an API version:

```bash
cd web
npm run data      # fetch open-scout-api -> web/public/data/{camps,meta,vocab}.json
```

The pinned API version lives in `EXPECTED_VERSION` at the top of `build-data.mjs`; a
version mismatch fails the refresh loudly so changes are reviewed before they land.
`zip-centroids.json` (US Census ZCTA gazetteer, public domain) is committed and static.

## Web (`web/`)

Requires Node.js 20+ (LTS).

```bash
cd web
npm install
npm run dev       # local dev server
npm run build     # static output -> web/dist (deployed by CI)
npm run test      # vitest: distance, filter, format, searchParams
npm run check     # astro type-check
```

The site reads `web/public/data/*.json`, produced by `npm run data` and committed so the
site deploys from a clean checkout.

## Status

- **Live data source:** Open Scout API (`v0.58.1`) — 445 camps across ~211 councils and
  52 states/territories, classified by program and camp type, with reservation grouping,
  coordinate precision, elevation, avg July temperatures, and surveyed camp features
  (128-term vocab).
- **Frontend:** search/map/filter island (distance, state, July temperature, program,
  features, text), reservation-clustered map, static camp pages, a `/compare` side-by-side
  view, about, 404 — built against the approved design system.
