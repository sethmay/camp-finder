# CLAUDE.md — working guide for agents in this repo

## What this is
**Camp Finder** — a free, **static** website that helps Scout troops discover Scouts BSA
**resident summer camps** across all ~242 Scouting America councils, filter by distance /
weeks / cost / features, and click through to each camp's **official council page**.
It **aggregates and points; it is never the source of truth.** Unofficial community tool,
not affiliated with or endorsed by Scouting America.

## Read these first (authoritative, in this order)
1. **`PLAN.md`** — strategy, feasibility, scope, phases, risks. *Why* we build it.
2. **`IMPLEMENTATION.md`** — self-contained build spec: stack, repo layout, typed schema,
   scrapers, pipeline, frontend, CI, and a §12 build order with per-step acceptance
   gates. *How* to build it. **This is the contract — when in doubt, it wins on data
   shape and behavior.**
3. **`DESIGN_BRIEF.md`** — input for the designer; defines the design handoff package the
   frontend is built against.

Do not duplicate content from those docs here. If a rule changes, change it there and
keep this file pointing at it.

## Current status
Foundation + pipeline + frontend are built. Done through `IMPLEMENTATION.md` §12 step 4:
- **Pipeline** (`pipeline/`): schema (`models.py`), `registry`, `validate`, `build`,
  `geocode`, `platform_detect`, CLI. 19 passing pytest tests. Venv: create with
  `py -m venv .venv` then `pip install -e ".[dev,llm]"` (no `uv` in this environment).
- **Data** (`data/councils/`): a 4-council / 8-camp Pacific-Northwest **fixture** dataset
  for frontend dev (marked as fixtures in provenance notes). NOT the real registry yet.
- **Frontend** (`web/`): full Astro+React+Tailwind app against the approved design tokens
  (`.claude/handoffs/website_design/`). Authored but **not yet smoke-tested** — this
  environment has no Node. Run `cd web && npm install && npm run build && npm run test`.
- **Next** (§12 steps 5–9): Black Pug + Doubleknot scrapers, LLM long-tail extractor +
  review queue, CI (`deploy.yml`/`refresh.yml`), then the national coverage ramp
  (`campfinder registry` writes ~235 real council stubs — it preserves existing camps).

## Architecture in three sentences
A **Python pipeline** (`pipeline/`) scrapes/extracts camp data into a canonical,
human-reviewed JSON dataset (`data/councils/<council_id>.json`, one file per council).
A **build step** flattens that into static JSON (`web/public/data/*.json`). An **Astro +
React static site** (`web/`) loads that JSON and does all filtering **client-side** —
there is **no runtime backend and no runtime database.**

## Non-negotiables (violating these is a bug — full list in IMPLEMENTATION.md §13)
- Every `Camp` has a real official `website_url`; every displayed fact is traceable to a
  `source_url` + `verified_at`. No orphan data.
- **No runtime backend/DB.** Browser loads static JSON only.
- Scrapers respect `robots.txt`, rate-limit (≥1s/host), identify themselves
  (`CampFinderBot/1.0`), emit **candidates only**, and **never write `main` directly** —
  humans approve every data change via PR.
- LLM-extracted fields below the confidence threshold (`< 0.7`) go to `data/.review/`,
  never auto-published.
- **Stable IDs**: `council-<number>`, `<state>-<camp-slug>`, `<camp>-<year>-<start_date>`.
  Never regenerate a camp id because a council was renamed/merged.
- Canonical + built JSON is **deterministic** (`sort_keys=True`, 2-space indent, trailing
  newline) so diffs stay reviewable.
- Every page footer states it is an **unofficial community tool**, not affiliated with
  Scouting America. No BSA/Scouting America logos or trademarks.

## Conventions
- **Python** (`pipeline/`): 3.11+, managed by **uv** (`uv sync`, `uv run`). pydantic v2
  models in `campfinder/models.py` are the single source of schema truth — regenerate
  `data/schema/*.json` and mirror `web/src/lib/types.ts` when they change. Lint/format
  with **ruff**. Tests with **pytest**; scrapers are tested against saved fixtures in
  `pipeline/tests/fixtures/`, not the live web.
- **Frontend** (`web/`): Astro 4 static output + React 18 islands, TypeScript `strict`,
  Tailwind. Keep filter/distance logic **pure** in `web/src/lib/` and unit-test it.
  Map tile source stays behind `web/src/lib/map.ts` (swappable).
- **Data** (`data/`): edit `data/councils/*.json` (canonical). Never hand-edit
  `web/public/data/*.json` — it is build output (but IS committed).

## Commands (once scaffolded — see IMPLEMENTATION.md §11)
```bash
# pipeline
cd pipeline && uv sync
uv run campfinder registry build        # build council registry (do this first)
uv run campfinder scrape --council all  # run scrapers -> candidates
uv run campfinder merge <candidates>    # merge into data/councils/*
uv run campfinder validate --strict     # schema + sanity gate
uv run campfinder build                 # compile -> web/public/data/*.json
uv run pytest && uv run ruff check .

# frontend
cd web && npm ci
npm run dev                             # local dev
npm run build                           # -> web/dist (deployed by CI)
```

## Tooling notes for agents
- Use `lsp` for symbol-aware edits/renames once code exists (TS + Python servers).
- Search with `grep`/`glob`, not shell `find`/`ls`.
- Scraper work: capture a real page into `tests/fixtures/` and test the parser against
  it — do not hit live sites in tests or CI.
- When adding a data field: update pydantic model → regenerate JSON Schema → update
  `types.ts` → update `build.py` flattening → update the frontend that renders it.
  Keep all five in sync.

## What NOT to do
- Don't add a backend, database, user accounts, payments, or "live availability"
  guarantees — availability is best-effort only.
- Don't let scrapers write directly to the canonical dataset or to `main`.
- Don't introduce a second data-storage convention beside `data/councils/*.json`.
- Don't ship LLM output that hasn't passed the confidence gate + human review.

## Workflow

Here is the workflow that will define how code gets implemented

@WORKFLOW.md