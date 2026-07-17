# Camp Finder — Implementation Specification

> **Audience:** the engineer/agent building this. This document is **self-contained** —
> you should not need any other file to implement v1. `PLAN.md` holds the strategic
> rationale; `DESIGN_BRIEF.md` is the input for visual design. Where this doc and the
> design package disagree on layout, the design package wins; where they disagree on
> data shape or behavior, this doc wins.

---

## 0. What you are building (one paragraph)

A **static website** that lets a Scout troop find Scouts BSA resident summer camps
across the ~242 Scouting America councils, filter them by distance-from-ZIP, available
weeks, cost, and features, and click through to each camp's **official council page**.
The site is generated from a **JSON dataset kept in this repo**. The dataset is
populated by a **Python pipeline** (scrapers + LLM extraction) whose output is reviewed
as pull requests before it ships. There is **no production backend and no runtime
database** — the browser loads a static JSON file and does all filtering client-side.

The product is a **directory and pointer**, never an authority: every fact shown carries
a source URL and a verification date, and the primary call-to-action on every camp is
"visit the official council page."

---

## 1. Tech stack (use exactly these unless a listed reason forces a change)

### Frontend (`web/`)
- **Astro 4.x** (static output, `output: 'static'`) — static camp detail pages for SEO
  (discovery via Google is a core acquisition channel) + one interactive island.
- **React 18** islands (via `@astrojs/react`) for the interactive search view only.
- **TypeScript 5.x**, `strict: true`.
- **Tailwind CSS 3.x** (via `@astrojs/tailwind`) — design tokens map to Tailwind theme
  (see §9 and DESIGN_BRIEF handoff).
- **MapLibre GL JS 4.x** for the map. Basemap = **Protomaps** `.pmtiles` US extract
  served as a static asset (no API key, $0), rendered with a free style. If the pmtiles
  US extract is too large to host, fall back to **MapTiler** free tier (key via build
  env). Keep the tile source behind one module (`web/src/lib/map.ts`) so it is swappable.
- **MiniSearch 6.x** for client-side text search (camp/council name).
- No component library. Build the ~12 components in §8 directly against the design tokens.

### Pipeline (`pipeline/`)
- **Python 3.11+**, dependency + venv management via **uv** (`uv sync`, `uv run`).
- **httpx** (HTTP, with retries + timeouts), **selectolax** (fast HTML parsing;
  BeautifulSoup acceptable if selectolax is awkward for a given site).
- **pydantic v2** for the canonical schema (single source of truth for types + validation).
- **Anthropic Python SDK** for long-tail LLM extraction (`claude-3-5-sonnet` or newer;
  model id in config). Uses tool-use / JSON-schema structured output.
- **US Census Geocoder** (https://geocoding.geo.census.gov, free, no key) for
  address→lat/lon; **Nominatim** (OpenStreetMap) as fallback with 1 req/sec + caching.
- **pytest** for tests. **ruff** for lint/format.

### Hosting / CI
- **Cloudflare Pages** (preferred) or **GitHub Pages**. Static output only.
- **GitHub Actions**: one workflow to build+deploy on push to `main`; one scheduled
  workflow to run scrapers and open a PR on data diffs (§10).

---

## 2. Repository layout (create exactly this)

```
camp-finder/
├── PLAN.md                      # strategy (exists)
├── IMPLEMENTATION.md            # this file
├── DESIGN_BRIEF.md              # designer input
├── README.md                    # setup + "unofficial community tool" disclaimer
├── data/
│   ├── schema/
│   │   ├── council.schema.json  # JSON Schema, generated from pydantic (§4)
│   │   ├── camp.schema.json
│   │   └── session.schema.json
│   └── councils/
│       └── <council_id>.json    # ONE file per council: council + its camps + sessions
├── pipeline/
│   ├── pyproject.toml
│   ├── uv.lock
│   ├── campfinder/
│   │   ├── __init__.py
│   │   ├── models.py            # pydantic models (§4) — the canonical schema
│   │   ├── config.py            # constants: bounding boxes, enums, model id, paths
│   │   ├── registry.py          # build/refresh the council registry (§5)
│   │   ├── geocode.py           # address -> lat/lon, cached to data/.cache/geocode.json
│   │   ├── platform_detect.py   # classify a council site: blackpug|doubleknot|other
│   │   ├── scrapers/
│   │   │   ├── base.py          # Scraper ABC: fetch -> list[CampCandidate]
│   │   │   ├── blackpug.py      # §6.1
│   │   │   ├── doubleknot.py    # §6.2
│   │   │   └── longtail_llm.py  # §6.3
│   │   ├── validate.py          # validation gate (§7)
│   │   ├── merge.py             # merge candidates into data/councils/*.json (§7)
│   │   ├── build.py             # compile data/ -> web/public/data/*.json (§7)
│   │   └── cli.py               # `campfinder <command>` entrypoint (§11)
│   └── tests/
│       ├── fixtures/            # saved HTML pages for scraper tests
│       ├── test_models.py
│       ├── test_blackpug.py
│       ├── test_doubleknot.py
│       ├── test_validate.py
│       └── test_build.py
├── web/
│   ├── package.json
│   ├── astro.config.mjs
│   ├── tailwind.config.mjs
│   ├── tsconfig.json
│   ├── public/
│   │   └── data/                # BUILD OUTPUT — do not hand-edit; gitignored or committed per §7
│   │       ├── camps.json       # flattened, frontend-ready (§7)
│   │       ├── meta.json        # counts, coverage, build timestamp
│   │       └── zip-centroids.json
│   └── src/
│       ├── pages/
│       │   ├── index.astro      # hosts <SearchApp> island (§8)
│       │   ├── camps/[id].astro # static per-camp detail page (§8)
│       │   ├── about.astro      # methodology, disclaimer, "how to submit a correction"
│       │   └── 404.astro
│       ├── components/          # §8
│       ├── lib/
│       │   ├── filter.ts        # pure filtering logic (§8.3) — unit tested
│       │   ├── distance.ts      # haversine (§8.3) — unit tested
│       │   ├── zip.ts           # ZIP -> centroid lookup
│       │   ├── types.ts         # TS types mirroring §4 (keep in sync w/ pydantic)
│       │   └── map.ts           # MapLibre setup, swappable tile source
│       └── styles/
│           └── tokens.css       # design tokens from the design handoff
└── .github/workflows/
    ├── deploy.yml
    └── refresh.yml
```

---

## 3. Data model — narrative

Three entities. **Council** owns **Camps**; a **Camp** owns **Sessions** (one summer
week / one bookable resident-camp period). Stored **nested** in one file per council
(`data/councils/<council_id>.json`) so a reviewer sees an entire council's changes in
one diff. The build step (§7) **flattens** this into `web/public/data/camps.json` for
the browser.

**Identity rules (stable IDs are load-bearing — never regenerate them casually):**
- `council.id` = `council-<3-digit BSA council number>`, e.g. `council-006`. BSA council
  numbers are stable across renames/mergers. If a number is genuinely unknown, use a
  slug of the current name and add a `TODO` note; backfill the number later.
- `camp.id` = `<state-lower>-<kebab-camp-name>`, e.g. `co-camp-alexander`. Independent
  of council so a camp keeps its identity if its council merges.
- `session.id` = `<camp.id>-<year>-<start_date>`, e.g. `co-camp-alexander-2026-06-14`.

**Provenance is mandatory** on every Camp and Session: where the fact came from, how it
was obtained, and when it was last confirmed. This drives the "last verified" UI and the
staleness rules.

---

## 4. Canonical schema (pydantic v2 — `pipeline/campfinder/models.py`)

Implement exactly this. Generate the JSON Schema files in `data/schema/` from these
models (`Model.model_json_schema()`), and mirror the shapes in `web/src/lib/types.ts`.

```python
from datetime import date, datetime
from enum import Enum
from pydantic import BaseModel, Field, HttpUrl

class Platform(str, Enum):
    blackpug = "blackpug"       # 247scouting.com
    doubleknot = "doubleknot"
    tentaroo = "tentaroo"       # migrating away by Oct 2026; keep for detection
    other = "other"
    unknown = "unknown"

class ProgramType(str, Enum):
    scouts_bsa_resident = "scouts_bsa_resident"   # v1 focus
    cub_resident = "cub_resident"                 # schema-ready, not populated in v1
    cub_day = "cub_day"
    high_adventure = "high_adventure"
    webelos = "webelos"

class Feature(str, Enum):
    dining_hall = "dining_hall"
    waterfront = "waterfront"
    pool = "pool"
    shooting_sports = "shooting_sports"
    climbing = "climbing"
    horseback = "horseback"
    atv = "atv"
    cope = "cope"
    older_scout_program = "older_scout_program"   # e.g. trailblazer / first-year & 14+ tracks
    high_adventure_option = "high_adventure_option"
    stem = "stem"
    scuba = "scuba"
    mountain_biking = "mountain_biking"

class CampStatus(str, Enum):
    active = "active"
    not_operating = "not_operating"   # property exists, no resident camp this year
    closed = "closed"

class Method(str, Enum):
    manual = "manual"
    blackpug = "blackpug"
    doubleknot = "doubleknot"
    llm_extraction = "llm_extraction"
    community = "community"

class Provenance(BaseModel):
    source_url: HttpUrl
    method: Method
    verified_at: date              # last date a human/scraper confirmed this record
    confidence: float = Field(1.0, ge=0.0, le=1.0)  # <1.0 for LLM-extracted fields
    notes: str | None = None

class Session(BaseModel):
    id: str
    camp_id: str
    year: int = Field(ge=2024, le=2100)
    start_date: date
    end_date: date
    program_type: ProgramType = ProgramType.scouts_bsa_resident
    fee_youth: int | None = None   # USD, whole dollars; null = unknown, NOT free
    fee_adult: int | None = None
    fee_notes: str | None = None   # e.g. "early-bird by 3/1; $30 more after"
    registration_url: HttpUrl | None = None
    availability: str | None = None  # best-effort: "open" | "waitlist" | "full" | null
    provenance: Provenance

class Camp(BaseModel):
    id: str
    name: str
    council_id: str
    status: CampStatus = CampStatus.active
    address: str | None = None
    city: str | None = None
    state: str                     # 2-letter USPS
    lat: float | None = None
    lon: float | None = None
    website_url: HttpUrl           # authoritative council/camp page — REQUIRED
    program_types: list[ProgramType] = [ProgramType.scouts_bsa_resident]
    features: list[Feature] = []
    description: str | None = None # 1–3 sentences, plain text, no marketing fluff
    sessions: list[Session] = []
    provenance: Provenance

class Council(BaseModel):
    id: str
    name: str
    number: int | None = None      # BSA council number
    state: str                     # HQ state, 2-letter
    hq_city: str | None = None
    website: HttpUrl
    platform: Platform = Platform.unknown
    camps: list[Camp] = []
```

**Cross-field validators to add:**
- `Session.end_date >= start_date`; both months in May–Sept (warn, don't hard-fail).
- `Session.id == f"{camp_id}-{year}-{start_date.isoformat()}"`.
- `Camp.id` matches `^[a-z]{2}-[a-z0-9-]+$`.
- `lat/lon` (when present) inside continental-US + AK/HI bounding boxes (`config.py`).
- If `method == llm_extraction`, `confidence` MUST be set and `< 1.0` allowed.

---

## 5. Council registry (`registry.py`) — the foundation, build this first

Produces/refreshes a `data/councils/<id>.json` file for **every** council with at least
`{id, name, number, state, website, platform: unknown, camps: []}`. This alone (even
before any camp data) is a shippable improvement over the status quo.

**Sources (in priority order):**
1. Scouting America Local Council Locator — https://www.scouting.org/about/local-council-locator/
   (authoritative names + council sites; may require parsing an embedded data source —
   inspect network calls for a JSON endpoint before scraping HTML).
2. Wikipedia "List of councils (Scouting America)" —
   https://en.wikipedia.org/wiki/List_of_councils_(Scouting_America) (council numbers,
   states — good for the stable `number`).
3. ScoutWiki council + camp lists — https://en.scoutwiki.org/List_of_BSA_Camps and
   https://en.scoutwiki.org/List_of_councils_(Scouting_America) (seed camp names +
   states for the registry; treat as low-confidence, verify before publishing sessions).

**Steps:**
1. Pull council names + numbers + states from sources 1–2; reconcile by council number.
2. Resolve each council's official website (from source 1; else a web search fallback).
3. Write one file per council. Idempotent: re-running updates fields without clobbering
   hand-curated `camps`.

**Acceptance:** `campfinder registry build` yields ≥ 240 council files that all validate
against `Council`; ≥ 95% have a non-null `number` and a reachable `website`.

---

## 6. Scrapers

All scrapers subclass `base.Scraper` and return `list[Camp]` (with nested `Session`s)
as **candidates** — they do NOT write to `data/`. `merge.py` handles writing. Every
scraper: sets a descriptive `User-Agent` (`CampFinderBot/1.0 (+<about-url>)`), checks
`robots.txt`, rate-limits (≥1s between requests to one host), retries 3× with backoff,
and records `Provenance` on every record.

### 6.1 Black Pug (`blackpug.py`) — highest ROI, build first
- Council registration lives under `*.247scouting.com` or the council site embeds/links
  Black Pug event pages. Event list URL pattern is typically
  `https://<council>.247scouting.com/events` (confirm during Phase-1 probe).
- Each event page exposes structured fields: event name, dates, location, and a fee
  table. Parse: title → candidate camp/session name; date range → `start_date`/`end_date`;
  fee cells → `fee_youth`/`fee_adult`; the event's own URL → `registration_url`.
- Camp grouping: multiple weekly events map to ONE `Camp` (dedupe by normalized name +
  location) with multiple `Session`s. Filter to resident-camp events (name contains
  "resident"/"summer camp"; exclude day camps, trainings, banquets) — keep a keyword
  allow/deny list in `config.py`.
- **Fixtures:** save 2–3 real event pages into `tests/fixtures/blackpug/`; test parses
  them to exact expected `Camp`/`Session` objects.

### 6.2 Doubleknot (`doubleknot.py`)
- Hosted under `*.doubleknot.com` (e.g. `sac-bsa.doubleknot.com`) or embedded. Event
  catalog + registration pages. Structure is older/less uniform than Black Pug — parse
  the event calendar/detail pages; same candidate-extraction contract as §6.1.
- Same dedupe→Camp/Sessions logic and fixture-based tests.

### 6.3 Long-tail LLM extraction (`longtail_llm.py`)
- For councils where `platform ∈ {other, unknown}`: fetch the council's camping page(s)
  (start from `website` + common paths `/camping`, `/summer-camp`, `/camps`; follow
  in-domain links whose anchor text matches camp keywords, depth ≤ 2).
- Convert page HTML → readable text; send to Claude with a **tool/JSON-schema call whose
  schema is the `Camp` model** (minus ids). Require, per extracted field, a
  `source_quote` and a `confidence`. Prompt instructs: extract only Scouts BSA resident
  summer camp info; return `null` for anything not explicitly on the page; never guess
  fees or dates.
- Any record with any field `confidence < 0.7` → written to `data/.review/` (a review
  queue), NOT merged automatically. Everything else becomes a candidate with
  `method=llm_extraction`.

**Acceptance for §6 overall:** on the Phase-1 sample, produce valid `Camp`+`Session`
records for ≥ 5 camps spanning Black Pug, Doubleknot, and long-tail sources, each with
correct dates/fees verified by hand against the source page.

---

## 7. Validation, merge, build

### 7.1 Validate (`validate.py`) — the gate
Runs on candidate records AND on the whole `data/` tree in CI. Checks:
- **Schema:** every record parses against pydantic models. Hard fail on error.
- **Referential:** `session.camp_id` exists; `camp.council_id` exists.
- **Sanity (warn, collect into a report; configurable hard-fail set):**
  fee_youth outside $100–$1500; session dates outside May–Sept; `end<start`;
  lat/lon outside US bbox; missing `website_url`.
- **Link liveness:** HEAD each `website_url`/`registration_url` (cached, weekly);
  record dead links in `meta.json`, don't delete the record.
- Emits `validation_report.json` (used by CI to comment on the PR).

### 7.2 Merge (`merge.py`)
- Merges scraper candidates into `data/councils/*.json`: match camps by `id`; for each,
  match sessions by `id`. New → add. Existing → update fields **only when the new record
  has equal-or-higher confidence and newer `verified_at`**. Never silently drop a camp
  that disappeared from a scrape — flag it `status` review instead.
- Writes **newline-stable, key-sorted** JSON (deterministic `json.dumps(sort_keys=True,
  indent=2)` + trailing newline) so diffs are minimal and reviewable.

### 7.3 Build (`build.py`) → frontend assets
- Flatten `data/councils/*.json` into `web/public/data/camps.json`: an array of camps,
  each with denormalized `council_name`, `council_website`, and its `sessions`. Drop
  `status != active` unless a session exists for the current/next year.
- Emit `meta.json`: `{ build_time, camp_count, council_count, session_count,
  states_covered, dead_link_count }`.
- Copy/generate `zip-centroids.json` (US ZIP → {lat, lon, state}; source: free US ZIP
  code centroid dataset, ~1–2 MB; ship compacted to `[zip, lat, lon]` tuples).
- **Decision — commit built data?** Yes: commit `web/public/data/*.json` so the site is
  deployable from a clean checkout and diffs are visible. `build` must be deterministic.

**Acceptance:** `campfinder build` produces a `camps.json` that every camp in validates
against `web/src/lib/types.ts`, and `meta.json` counts match `data/`.

---

## 8. Frontend

### 8.1 Pages
- **`/` (index.astro):** hero + the interactive `<SearchApp>` React island (§8.2).
  Server-render a static list of all camps inside a `<noscript>`/SEO fallback.
- **`/camps/[id].astro`:** statically generated for every active camp. Shows name,
  council, location + mini-map, features, description, a **sessions table** (week, dates,
  youth/adult fee), a prominent **"Visit official council page"** button (→
  `website_url`), per-session "Register" links (→ `registration_url`), and a
  **provenance footer** ("Source: <link> · Last verified <date>"). This page is the SEO
  surface — include structured metadata.
- **`/about`:** methodology, the unofficial-tool disclaimer, correction-submission link.

### 8.2 Components (React island + Astro components)
1. `SearchApp.tsx` — island root; owns filter state (URL-synced query params), loads
   `camps.json` once, holds the list⇄map split view.
2. `Filters.tsx` — ZIP + radius, week/date-range, cost slider, features multiselect,
   state select, text search. Debounced; every change updates URL params.
3. `ResultsList.tsx` — virtualized list of `CampCard`s; result count; sort (distance /
   cost / name).
4. `CampCard.tsx` — name, council, distance, next available week, fee-from, feature
   chips, "last verified" badge; click → detail page; hover → highlight map marker.
5. `MapView.tsx` — MapLibre map, clustered markers, viewport-synced with the list,
   popup on marker → mini CampCard.
6. `ProvenanceBadge.tsx`, `FeatureChip.tsx`, `EmptyState.tsx`, `StaleBadge.tsx`,
   `Header.tsx`, `Footer.tsx` (with disclaimer).

### 8.3 Core logic (pure, unit-tested — `web/src/lib/`)
- `distance.ts`: `haversineMiles(a, b)`.
- `zip.ts`: `zipToCentroid(zip)` → `{lat, lon} | null` from `zip-centroids.json`.
- `filter.ts`: `filterCamps(camps, criteria)` — a **pure function** applying:
  - **distance**: camp within `radiusMiles` of ZIP centroid (skip if no ZIP);
  - **weeks/date range**: camp has ≥1 session overlapping the selected range;
  - **cost**: min `fee_youth` across sessions ≤ `maxCost` (camps with all-null fees are
    included but visually flagged "fee unknown");
  - **features**: camp `features ⊇` selected set;
  - **state**, **text** (MiniSearch over name + council).
  Returns camps annotated with computed `distanceMiles` + `nextSession` for display/sort.
- Staleness rule: a session whose `year < currentSummerYear` is hidden; a camp whose
  newest `verified_at` is > 12 months old shows a `StaleBadge`.

### 8.4 Behavior requirements
- **Mobile-first** (scoutmasters browse on phones): list is primary on mobile, map is a
  toggle; both visible side-by-side ≥ `lg`.
- **URL is shareable state**: all filters serialize to query params; loading a URL
  reproduces the exact result set.
- **Accessibility:** WCAG 2.1 AA — keyboard-operable filters + map controls, focus
  states, aria labels on markers, sufficient contrast (design tokens must pass).
- **Performance:** initial JS < 200 KB gz; `camps.json` fetched once and cached;
  filtering is synchronous in-memory (dataset is small).

---

## 9. Design tokens & the design handoff

The visual design comes from `DESIGN_BRIEF.md` → a design handoff package. When it
arrives, encode it as:
- Tailwind theme (`tailwind.config.mjs`) + `web/src/styles/tokens.css` CSS variables:
  color scale, typography scale, spacing, radii, shadows, breakpoints.
- A component-to-spec map: each component in §8.2 corresponds to a design frame; build to
  the redlines. Until the handoff exists, build with neutral placeholder tokens and keep
  markup semantic so restyling is CSS-only.

---

## 10. CI / automation (`.github/workflows/`)
- **`deploy.yml`** (on push to `main`): `cd web && npm ci && npm run build`; deploy
  `web/dist` to Cloudflare Pages / GH Pages. Also runs `campfinder validate` and
  frontend unit tests as a required check.
- **`refresh.yml`** (cron: weekly Sep–Jan, monthly otherwise): `campfinder scrape --all`
  → `merge` → `validate` → `build`; if `data/` changed, open a PR titled
  `data: automated refresh <date>` with the `validation_report.json` summary in the body.
  A human reviews and merges. **Scrapers never push to `main` directly.**

---

## 11. CLI (`campfinder`, via `cli.py`)
```
campfinder registry build                 # §5
campfinder detect --council <id|all>      # classify platform
campfinder scrape --council <id|all>      # run appropriate scraper -> candidates
campfinder merge <candidates.json>        # §7.2
campfinder validate [--strict]            # §7.1, exits nonzero on hard fail
campfinder build                          # §7.3
campfinder geocode --missing              # fill lat/lon for camps missing it
```

---

## 12. Build order (do in this sequence) + acceptance gates

Each step is independently verifiable. Do NOT proceed past a gate that fails.

1. **Scaffold** repo (§2), pydantic models (§4), generate JSON Schemas, TS types.
   *Gate:* `pytest tests/test_models.py` green; `Council/Camp/Session` round-trip JSON.
2. **Council registry** (§5). *Gate:* ≥240 valid council files; §5 acceptance.
3. **Validation + build skeleton** (§7.1, §7.3) over registry-only data.
   *Gate:* `campfinder validate` clean; `build` emits `camps.json` (camps may be empty)
   + `meta.json`.
4. **Frontend shell** (§8) reading `camps.json`: index with map+list+filters, static
   camp pages, about page. *Gate:* filters (distance/date/cost/features) work against a
   hand-authored 10-camp fixture dataset; `filter.ts`/`distance.ts` unit tests green;
   Lighthouse a11y ≥ 95, perf ≥ 90.
5. **Black Pug scraper** (§6.1) with fixtures. *Gate:* §6.1 fixture test exact-match;
   merged data for ≥1 real council validates + renders.
6. **Doubleknot scraper** (§6.2). *Gate:* §6.2 fixture test; ≥1 real council merged.
7. **Long-tail LLM extractor** (§6.3) + review queue. *Gate:* §6 acceptance (5 camps
   across all 3 source types); low-confidence records land in `data/.review/`, not `data/`.
8. **CI** (§10). *Gate:* deploy workflow ships the site; refresh workflow opens a PR on a
   simulated data change.
9. **Coverage ramp**: run registry→detect→scrape across all councils; triage review
   queue. *Gate:* PLAN.md Phase-3 ship bar — 10–15 states with complete, verified data.

---

## 13. Non-negotiables (violating these is a bug)
- Every `Camp` has a real `website_url`; every displayed fact is traceable to a
  `source_url` + `verified_at`. No orphan data.
- No runtime backend/DB. The browser loads static JSON only.
- Scrapers respect robots.txt, rate-limit, and identify themselves; they emit
  candidates and never write `main` directly — humans approve every data change.
- LLM output below the confidence threshold never auto-publishes.
- IDs are stable; never regenerate a camp id because a council was renamed/merged.
- Built JSON is deterministic (sorted keys) so diffs are reviewable.
- The site states clearly, on every page footer, that it is an **unofficial community
  tool, not affiliated with or endorsed by Scouting America.**
```
