# CLAUDE.md — working guide for agents in this repo

## What this is
**Camp Finder** — a free, **static** website that helps Scout troops discover Scouts BSA
**resident summer camps** across the ~230 Scouting America councils, filter by distance,
state, July temperature, program, and features, and click through to each camp's
**official council page** for dates and fees. It **aggregates and points; it is never the
source of truth.** Unofficial community tool, not affiliated with or endorsed by Scouting
America.

**Registry only.** The site carries durable registry facts (location, council, program,
features, reservation grouping, avg July temps, a durable link). Highly transitory data —
session dates, fees, availability — deliberately lives on each council's own page, reached
via each camp's `url`.

## Read these first
1. **`PLAN.md`** — strategy, feasibility, scope. *Why* we build it.
2. **`DESIGN_BRIEF.md`** + `.claude/handoffs/website_design/` — the design system the frontend
   is built against (tokens, components; map direction is §9 of `Camp-Finder-Design-Spec.html`).
3. **`IMPLEMENTATION.md`** — the original build spec. Its **design / UX intent** (§8.1–8.2,
   §8.4, §9) and repo-layout rationale remain useful, and §8.3's *features/vocab* rules are
   current. ⚠ But its `filterCamps` signature + **weeks / cost / `nextSession` / session-staleness**
   clauses (§8.3), and its **pipeline / scraper / §12 build-order** sections, predate the 0.28.0
   registry cutover — historical. The live filter/behavior contract is the code: `rankCamps` in
   `web/src/lib/filter.ts` + `Criteria` in `web/src/lib/types.ts`.
4. **`CHANGELOG.md`** — what shipped, newest first; **`LESSONS.md`** — durable gotchas,
   read before similar work; **`TODO.md`** — active queue.

Don't duplicate those docs here; if a rule changes, change it there and keep this pointing at it.

## Current status
Live at https://sethmay.github.io/camp-finder/ · current version in `web/package.json` (see `CHANGELOG.md` for what shipped).
Registry-only, sourced from the **Open Scout API** (pinned `v0.35.0`): ~448 camps across
~213 councils / 52 states. Search island filters distance / state / July-temperature /
program / features (client-side); reservation-clustered MapLibre map; static camp detail
pages. Shipped since the cutover: API cutover (0.28), map polish (0.29), July-temp filter
(0.30), API v0.35 upgrade + hierarchical feature filter (0.31).

## Architecture in three sentences
A refresh step (`web/scripts/build-data.mjs`, run via `npm run data`) fetches the **Open
Scout API** `current/camps.json` + vocab, filters to in-scope camps, and writes **committed**
static JSON (`web/public/data/*.json`). An **Astro + React static site** (`web/`) loads that
JSON and does all filtering **client-side**. There is **no data pipeline in this repo, no
runtime backend, and no runtime database** — data authoring/corrections happen upstream in
[open-scout-api](https://github.com/sethmay/open-scout-api).

## Non-negotiables (violating these is a bug)
- **No runtime backend/DB.** Browser loads committed static JSON only.
- **No orphan data.** Every displayed fact traces to the API — a durable `url` +
  `verified_at`; derived/joined stats (climate, elevation) are labeled and attributed to
  the API, not the council page (see `LESSONS.md` §Data/provenance).
- **Registry only.** Never reintroduce sessions/fees/dates/availability or a scraping
  pipeline; link out to the council page for those.
- Committed build output is **deterministic** (`build-data.mjs` writes sorted, 2-space,
  trailing-newline JSON — apart from `meta.json`'s `build_time`) so diffs stay reviewable.
  Never hand-edit `web/public/data/*.json`.
- Every page footer states it is an **unofficial community tool**, not affiliated with
  Scouting America. No BSA / Scouting America logos or trademarks.

## Conventions
- **Frontend** (`web/`): Astro 4 static output + React 18 islands, TypeScript `strict`,
  Tailwind. Keep filter/format/distance logic **pure** in `web/src/lib/` and unit-test it.
  Map tile source + basemap muting stay behind `web/src/lib/map.ts` (swappable).
- **Data** (`web/public/data/`): refreshed by `npm run data` from the Open Scout API, pinned
  by `EXPECTED_VERSION` in `build-data.mjs` (a version mismatch fails the refresh loudly).
  The JSON is **committed** so the site deploys from a clean checkout with no network; it is
  build output — never hand-edit it. `zip-centroids.json` is committed + static.
- **Adding a camp field** (registry-only, three places): pass it through in
  `build-data.mjs` → add it to `web/src/lib/types.ts` (`Camp`) → render/filter it in the
  frontend. Feature/program labels resolve through the committed `vocab.json`.

## Commands
```bash
cd web
npm install
npm run dev      # local dev server
npm run build    # static output -> web/dist (deployed by CI)
npm run test     # vitest (pure lib logic: filter, format, searchParams, distance, paths)
npm run check    # astro type-check
npm run data     # refresh web/public/data/*.json from the Open Scout API (deliberate step)
```

## Tooling notes for agents
- Use `lsp` for symbol-aware edits/renames (TS server).
- Search with `grep`/`glob`, not shell `find`/`ls`.
- Per `WORKFLOW.md`, feature work happens in a **git worktree**; run `npm run check`/`test`
  inside that worktree, not the main checkout (a root-dir run validates `main`, not your branch).

## What NOT to do
- Don't add a backend, database, user accounts, payments, or "live availability" guarantees.
- Don't reintroduce a scraping/authoring pipeline or a second data-storage convention beside
  the API-sourced `web/public/data/` — corrections go upstream to open-scout-api.
- Don't hand-edit `web/public/data/*.json` (build output).

## Workflow

Here is the workflow that will define how code gets implemented

@WORKFLOW.md
