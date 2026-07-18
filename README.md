# Camp Finder

A free, static website that helps Scout troops discover **Scouts BSA resident summer
camps** across the ~235 Scouting America councils — filter by distance, available weeks,
cost, and program — and click through to each camp's **official council page**.

> **Unofficial community tool.** Not affiliated with, endorsed by, or sponsored by
> Scouting America (Boy Scouts of America). Camp Finder aggregates public information and
> links to authoritative sources; always confirm dates and fees on the council's own page.

Planning & specs: [`PLAN.md`](./PLAN.md) · [`IMPLEMENTATION.md`](./IMPLEMENTATION.md) ·
[`DESIGN_BRIEF.md`](./DESIGN_BRIEF.md) · agent guide: [`CLAUDE.md`](./CLAUDE.md).

## Architecture

A **Python pipeline** (`pipeline/`) turns council/camp data into a canonical,
human-reviewed dataset (`data/councils/<id>.json`, one file per council). A build step
flattens it to static JSON (`web/public/data/*.json`). An **Astro + React static site**
(`web/`) loads that JSON and filters entirely **client-side** — no backend, no runtime
database.

```
data/councils/*.json  --(campfinder build)-->  web/public/data/{camps,meta}.json  -->  Astro static site
```

## Pipeline (`pipeline/`)

Requires Python 3.11+. `uv` is recommended; a plain venv works too.

```bash
cd pipeline
python -m venv .venv && . .venv/Scripts/activate   # Windows: .venv\Scripts\activate
pip install -e ".[dev,llm]"

campfinder schema        # regenerate data/schema/*.json from the models
campfinder registry      # build/refresh council stubs from Wikipedia
campfinder detect --council all   # classify registration platform per council
campfinder enrich        # fill council websites: curated seed then Wikipedia
campfinder enrich --report-missing   # list councils still lacking a website
campfinder geocode       # fill missing camp lat/lon from addresses
campfinder validate      # schema + referential + sanity gate (exits nonzero on error)
campfinder build         # compile data/ -> web/public/data/*.json
campfinder zipcentroids  # (re)build web/public/data/zip-centroids.json from the Census gazetteer

pytest                   # pipeline suite (models, registry, enrich, validate, build, scrapers)
```

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

The site reads `web/public/data/*.json`, which is produced by `campfinder build` and
committed so the site deploys from a clean checkout.

## Status

- **Done & verified:** canonical schema + pipeline (registry, validate, build, geocode,
  platform detect) with 19 passing tests; a Pacific-Northwest fixture dataset (4 councils,
  8 camps) exercising all UI states; the full frontend (search/map/filter island, static
  camp pages, about, 404) built against the approved design system.
- **Next:** platform scrapers (Black Pug, Doubleknot) + LLM long-tail extractor with
  review queue; CI deploy + scheduled refresh; national coverage ramp. See
  `IMPLEMENTATION.md` §6, §10, §12.
