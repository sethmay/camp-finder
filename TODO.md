# TODO

Active queue and deferred work. Write each item to survive a clean context.

## UI refinement — live at https://sethmay.github.io/camp-finder/

Initial polish done in 0.8.0: date-range inputs no longer overflow the rail; map load-race
hardened (data + fitBounds now apply on first load, not just after a filter change); basemap
muted via a saturation filter. Remaining (bigger, "features down the road"):
- **Verify map markers on the live site.** Headless software-WebGL here paints the basemap but
  not the added circle layers, so marker rendering couldn't be confirmed locally — check the
  deployed site. Source now carries all camp features and fitBounds runs (verified).
- **Price-pill markers** (design §9): replace the plain circle layers with white/ink price
  pills + primary-green hover/selected; count clusters. `web/src/components/MapView.tsx`.
- **Popup positioning** — the "…not posted / view details →" overlay you saw at the map's
  top-left is the marker popup; confirm/fix its anchor once markers are verified live.
- **Custom muted basemap style** to the exact handoff palette (land #E6E2D6, water #CBD9DE,
  ...) instead of the CSS saturation filter, in `web/src/lib/map.ts`.
- General design-spec pass: card spacing, "Fee not posted" treatment, mobile list/map toggle.

CI note (informational, not a failure): the deploy workflow logs "Node.js 20 is deprecated"
for GitHub's own actions (checkout/setup-node/setup-python/deploy-pages); GitHub auto-forces
them to Node 24. Clears when those actions ship Node 24 majors — nothing for us to change now.

## Website enrichment — DONE (0.10.0, agent-assisted curation)

**All 235 councils now have a website** (was 95/235). `campfinder enrich` applies a curated
seed (`data/council-websites.json`, `council_id -> url`) fill-only, then falls back to
Wikipedia for any remainder (seeded ids are never clobbered). The 140 Wikipedia-unresolvable
councils were resolved by an agent-assisted `web_search` pass (14 `scout` subagents, ~10
councils each), and every URL was reachability-checked before commit.

Re-run yearly (no keyed API — subscription-only, by design; not unattended-reproducible):
`campfinder enrich --report-missing` lists gaps -> resolve each via web_search -> add to the
seed -> `campfinder enrich`. The seed is the reviewable provenance record (git history).

Merges baked into the seed: councils **302/303** (-> Mississippi Riverlands) and **695**
(-> Sioux) point at the surviving council sites; **405** (Rip Van Winkle) is http-only.

## Next pipeline passes

**Platform coverage — `detect` run across all 235 (0.10.1).** Now every council has a website,
`campfinder detect` classified: **124 Black Pug + 34 Tentaroo = 158 programmatically scrapable**
(was 30), 15 doubleknot, 61 unknown (custom CMS or Cloudflare-gated homepages, e.g. Sam
Houston/576, Grand Canyon/010), 1 other.

**Tentaroo — DEFERRED (not publicly scrapable), 0.12.0.** The 34 Tentaroo councils cannot be
scraped politely: event pages are auth-gated (redirect to `/admin2/login` even with JS), robots
disallows `/admin2/` + `/calendar/`, and the pages are JS-rendered SPAs. Full recon + per-council
tentaroo links in `data/.review/tentaroo-deferred-2026-07-18.md`. **Covered by agent-assisted
extraction (0.12.0)**: a 7-scout swarm read each council's OWN website -> 35 camps / 116 sessions
across 29 councils (method `llm_extraction`, conf 0.6). Follow-ups in the review file: 3 councils
with no resident camp, 2 uncertain excluded, 13 camps need precise addresses to map. A future
headless+login scrape of Tentaroo itself is out of scope (no credentials).

- **Black Pug scraper — DONE (0.4.0).** `campfinder scrape`/`merge` off scoutingevent.com;
  14 camps / 51 sessions merged across 8 non-demo councils. Follow-ups:
  - **Fees**: DONE (0.7.0) — `ses.myPricing` POST to `/Ajax/SES` (needs `orgKey=BSA<nnn>`)
    fills youth/adult regular prices; 66/67 scraped sessions priced. Remaining: 1 session
    with no Youth category resolved null; part-time/sibling tiers ignored (regular price only).
  - **Name cleanup**: some events keep council-specific prefixes (e.g. MO council 358's
    "Summer Camp-Famous Eagle"); a curation/LLM pass could canonicalize to "Camp Famous Eagle".
  - **Coverage ramp — 0.11.0:** scraped all 124 blackpug councils; merged 46 camps/178 sessions
    across 45 councils (69 camps total). 13 out-of-scope events triaged to
    `data/.review/blackpug-2026-07-18-manual-review.md`. Demo councils (492/606/609/697) now
    skipped in `merge` via `config.DEMO_COUNCILS` (was incidental before). Remaining: 3 councils
    dropped to review (039/178/553 — find their real resident camp); replace demo fixtures with
    real data (needs merge-precedence guard below); the "Long-term Camp" suffix on 539.
  - **Merge precedence**: when a future scrape supersedes a *curated* camp, `merge._merge_camp`
    replaces `website_url` (with the scoutingevent URL) and `features` wholesale. Add
    method/authority precedence before scrapes overlap curated camps (demo councils are
    excluded today, so not yet exercised).
- **Doubleknot — handled via Black Pug routing (0.6.0).** Most "doubleknot" councils are
  doubleknot.com CMS but register on scoutingevent.com; scrape now routes them to
  BlackPugScraper (got Camp Horseshoe/539, Camp Yawgoog/546). Remaining: (a) genuine
  Doubleknot-registration councils (e.g. Three Harbors/636) whose event pages are
  JS-rendered — would need a headless renderer; deferred. (b) reclassify these councils'
  `platform` to blackpug via `detect --overwrite` (scoutingevent.com signature now added).
  (c) name cleanup: strip "Long-term Camp" suffix (Camp Horseshoe). LLM long-tail — §6.3.
- CI: **`deploy.yml` DONE (0.5.0)** — GitHub Pages project site at
  `https://sethmay.github.io/camp-finder/` (enable once: Settings -> Pages -> Source =
  GitHub Actions). Still TODO: **`refresh.yml`** scheduled scrape -> PR on data diff (§10).
