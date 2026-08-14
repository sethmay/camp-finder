# TODO

Active queue and deferred work. Write each item to survive a clean context.

## Data source — Open Scout API (since 0.28.0)

Camp/council data comes from the **Open Scout API** (registry-only) via `npm run data`
(`web/scripts/build-data.mjs`, pinned to `EXPECTED_VERSION`). The old Python `pipeline/`
and canonical `data/` tree were removed in 0.28.0; all data authoring, corrections, and
scraping now happen upstream in [open-scout-api](https://github.com/sethmay/open-scout-api).
Refreshing the committed dataset is a deliberate step (`npm run data`), not part of the build.

**Pin + fields (done, shipped 0.34.0):** `EXPECTED_VERSION` is now `0.58.1`; the projection
carries `elevation_ft` + `operating_status` and drops `closed`/`not_operating` camps (448 → 445).
Refresh proven non-regressive by per-id diff.

**Still-unused upstream camp fields** (present in `v1/current/camps.json`, not projected):

- `features_source_tier` — `camp_page` (237) / `guide` (129) / null (82). A finer signal than
  the null-vs-empty split (how a surveyed camp's features were sourced) if a UI ever wants it.
- `parent` — camp hierarchy; unexamined.

## Design system — post-merge debt (shipped in 0.33.0)

The retheme onto `@opensourcescouting/design-system` merged in 0.33.0. Deliverables live in
`DESIGN_SYSTEM_REVIEW.md` (hand this to the DS maintainer), `DESIGN_SYSTEM_SPIKE.md`,
`DESIGN_SYSTEM_PROPOSALS.md`, and the pre-merge review at
`.workbench/reviews/2026-07-28/144803-design-system-spike-review.md`. Remaining work:

- **Send the two upstream patches** in `web/vendor/patches/` to
  [OpenSourceScouting/design-system](https://github.com/OpenSourceScouting/design-system) as PRs:
  (1) `preinstall` guard excluded from `files` makes the published package uninstallable;
  (2) `build-css.mjs` cannot run on Windows. Both block a real npm release.
- **Swap the vendored tarball → a registry version** once a release contains those patches. This
  is the exit criterion for the whole `web/vendor/` arrangement — see `web/vendor/README.md`
  §"Retiring this directory" (delete the dir, drop the `allowScripts` entry, re-run visual checks
  because `ds-overrides.css` pins DS 0.2.0-alpha.0 compiled class names).
- **Re-run the review gate** on the current tip if desired: the last adversarial pass predates the
  12-finding fix commit `5229463`; the fixes were self-verified but not independently re-reviewed.
- **Two open review items, no repo standard to judge them against.** (a) The global+DS CSS grew
  13 KB → 58 KB (inherent to `@source`-scanning the DS `dist`); there is no byte budget to call it
  pass/fail. (b) The MapLibre init-failure handling has no test, and `vitest.config.ts`
  (`environment: "node"`, `include: ["src/**/*.test.ts"]`) cannot host a DOM/`.tsx` test — the
  LESSONS entry that prescribes a `getContext` stub test can't run until vitest gains a jsdom
  project. Decide: widen vitest, or soften that lesson.

## Map & UI polish (active) — live at https://sethmay.github.io/camp-finder/

- **Verify the map on the live site.** Headless software-WebGL paints the basemap but not the
  overlay layers, so the muted palette, dot pins, and reservation count pills need a real-GPU look.
- **Popup positioning** — confirm/fix the marker popup anchor once markers are verified live.

## Feature ideas

- **Filter by camp elevation.** Altitude facet (e.g. "under 3,000 ft" vs alpine) — troops care
  about acclimatization and heat. Projection prereq is **done** (`elevation_ft` shipped 0.34.0);
  the filter UI is not built — mirror the July-high slider (`maxJulyHigh` in `filter.ts` /
  `Filters.tsx` / `searchParams.ts`).
- **Export the filtered camp list** (CSV → opens in Excel / Google Sheets / LibreOffice) for
  offline planning. Client-side only, no backend: a pure `web/src/lib/csv.ts` serializes the
  current `ranked` set (from `SearchApp.tsx`) → CSV string; an "Export" button in the results
  controls row (`SearchApp.tsx` ~L127, beside the view toggle / `ResultsList` sort) triggers a
  Blob download. Export exactly what's currently filtered + sorted. Columns: name, council,
  city/state, program categories, features, avg July temp, official `url`. Unit-test the
  serializer (comma/quote/newline escaping).
- **Former/non-council camping (parked).** Camps sold to orgs that still allow Scout camping;
  local/state/federal camping locations. Beyond current scope (BSA council camps) — park.
- **Broaden scope beyond resident summer camps (POSSIBLE — growing demand, undecided).** A number of
  user requests (incl. Reddit) to cover more camp types. The data already exists upstream: open-scout-api
  carries every camp property (449 as of API 0.58.8), but `web/scripts/build-data.mjs` keeps only camps
  with a `SUPPORTED_PROGRAMS` type AND drops `not_operating`/`closed` — so weekend/short-term and
  family-camping properties are excluded (e.g. **Camp Warren Levis**, **Camp Clark**). Broadening =
  widen `SUPPORTED_PROGRAMS` (add `short_term_camping`, `family_camping`, and maybe `venturing`,
  `sea_scout`, `training`) and/or relax the status filter. **This is a big scope addition** — a lot more
  camps (the community scout-camp-map project lists ~527 vs our ~439 in-scope) — and it reframes the site
  from "find a resident summer camp" toward a general camp directory: needs UI work (program facets, map
  density, copy) and a product call. UNDECIDED; captured for now. (Distinct from the parked
  *non-council* camping idea above — these are council camps we already exclude by program type.)

**From the open-scout-api idea inventory** (`D:\repos\claude\personal\open-scout-api\.workbench\appideas.md`,
triaged 2026-07-31; numbers below are that doc's). Rejected for this app, don't re-open without new
reasoning: the advancement, history, and unit-utility sections are off-domain (different datasets,
different audience — and the camps dataset has no merit-badge offerings, `features[]` is facilities);
drive-time isochrones (#3) need a routing service at runtime, which the great-circle ZIP radius
already covers ~80% of; MCP server, notebooks, embeddable widgets, and B2B reference sync (#28,
#30, #31, #33) belong upstream in open-scout-api; the market-gap dashboard (#8) serves council
camping directors, not troops.

Tier 1 — build (Camp Compare shipped 0.34.0):

- **Reservation pages (#7).** `/reservations/[id].astro` mirroring `camps/[id].astro`: the
  sub-camps of one property, what each offers, one map. 18 reservations covering 41 camps (Goshen
  6, Peaceful Valley 3, the rest mostly pairs). The grouping is already in the projection and the
  map already clusters on it. Handle `reservation.name === null` (Goshen) with an id-derived title.
  Small build; the `reservation` grouping exists nowhere else as data.
- **High-adventure collection page (#4).** Static curated page over the 35 `high_adventure_base`
  camps (4 national operator). Zero new fields — today they're reachable only by filtering. Lead
  with elevation + July normals; altitude acclimatization is the actual planning input.

Tier 2 — only with the stated reframing:

- **Shortlist / saved camps (#5-lite).** A `localStorage` set of camp ids; no accounts, no backend.
  The gamified "Camp Passport" (check-ins, social layer) is out — accounts are a non-negotiable.
  Camp Compare (shipped) already threads a selected set through the URL; a shortlist + the CSV
  export can reuse that same selected-set primitive rather than inventing their own.
- **Council camp pages (#21-lite).** `/councils/[slug]` listing that council's camps from the
  already-joined `council*` fields (211 councils in scope), linking out to `council_website`. Stop
  there — lineage, territories, and OA lodges need the upstream `councils` dataset (428 rows) and
  are a history product, not this one.
- **Climate note on the camp detail page (#6 reframed).** The packing-list generator as pitched
  ("pack a fleece") is advice traceable to no source and contradicts "aggregates and points; never
  the source of truth." Ship the grounded fact instead — "July lows near 48°F at 3,880 ft" — and
  let the reader conclude. `july_low_f` and `elevation_ft` are both ~100% covered.
- **Guided filtering, not a match score (#2).** The "Camp Match quiz" duplicates `Filters.tsx`
  behind a friendlier funnel, and any match percentage buries the 82 unsurveyed camps while
  implying precision the feature survey doesn't have. Acceptable only as a wizard that sets real
  filter state and hands off to the existing results view. Lowest priority of this group.

**Camp Compare follow-ups (shipped 0.34.0, deferred polish):** mobile uses native horizontal
scroll, not the prototype's swipe pager + page-dot indicator (design_handoff §Responsive) —
revisit if a pager is wanted. `features_source_tier` is not yet surfaced as a per-cell provenance
cue. Deferred `1c` head-to-head ("compare just these two") remains a natural follow-on.

Suggested order: elevation filter → reservation pages (#7) → high-adventure page (#4) →
shortlist + CSV export → council pages.

## User corrections intake (in progress)

Let visitors — especially camp directors and troops who know a camp firsthand — suggest data
corrections. Data lives upstream in open-scout-api, but users meet it here, so the entry point
is here; the queue and edits are upstream. Decisions (locked): **hosted no-account form = Tally**
(maintainer has an account); **queue = open-scout-api PRs**; **attribute via provenance**;
privacy note acceptable; triage = agent-drafts / human-decides.

**Flow (no backend anywhere):** camp-finder button → prefilled Tally form → Tally dashboard/email
(raw inbox) → maintainer + agent triage → validated edit to `data/camps/<id>.json` upstream →
release → bump `EXPECTED_VERSION` + `npm run data` → deploy. Latency days–weeks; the UI must say so.
There is **no auto-route** from Tally to GitHub (that's the deferred serverless bridge, option E);
the triage step is the join.

### camp-finder side (this repo)
- `web/src/lib/corrections.ts`: `CORRECTION_FORM_URL` constant + `correctionHref(camp?, src)` that
  builds the prefilled Tally URL (hidden-field params `camp_id`, `camp_name`, `camp_state`, `src`).
  **Falls back to `/about#corrections` when the constant is empty**, so nothing 404s pre-launch.
- Entry points: per-camp affordance on `camps/[id].astro` (unsurveyed camps get the stronger
  "help us verify" CTA — highest-value, fills the 82 never-surveyed); a "suggest a correction"
  link in the `/compare` accuracy `Alert`; `about.astro` §corrections rewritten to a form button +
  the upstream issue/PR option (for technical users) + a privacy note (no youth PII; contact used
  only for follow-up; evidence links may appear in the open dataset's provenance).
- **GO-LIVE = paste the Tally form URL into `CORRECTION_FORM_URL`.** Until then the buttons route
  to `/about#corrections`, which explains the channel.

### Tally form fields (build in the Tally account)
Hidden (prefilled from URL): `camp_id`, `camp_name`, `camp_state`, `src`, and `camp_features` (the
camp's current feature CODES, comma-joined — invisible triage context so the agent sees "what we
list today" for add/remove requests; `correctionHref` sets it). Visible: **change category**
(single-select: feature to add / feature to remove / open-or-closed status / wrong location or map
pin / website / council or operator / name / other), free-text description, **source URL**
(council/camp page proving it), **your relationship to the camp** (director / camp staff / council
staff / attended with a unit / parent / other), optional contact (email or reddit), attribution
consent (credit me / keep me anonymous).

**Optional feature multi-select — a hint, not the vocab.** Show it *conditionally* (Tally logic)
only when change category is a feature add/remove. Options = the ~20 recognizable draws already in
`FEATURE_FACETS` (`format.ts`), same labels as the search-page filter chips, grouped Activities /
Programs & audience / Camp facilities & lodging: Aquatics, Shooting sports, Climbing, COPE,
Horseback, Mountain biking, ATV, Scuba, Handicraft, Zip line · STEM, Nature study, High-adventure
option, Older-scout program, First-year program, Provisional attendance · Waterfront, Pool, Dining
hall, Cabins. It gives the triage agent a cluster hint; the exact 128-term code mapping stays the
agent's job (never make the submitter map onto our vocabulary). Do NOT expose the full 128-term
vocab as a picker — overwhelming + wrong party for the mapping.

Enable Tally captcha + honeypot. Steer climate/elevation complaints to "wrong location or map pin"
(those fields are derived from coordinates upstream, not directly editable).

### Upstream (open-scout-api) — do NOT pre-build; calibrate first
Per the triage-automation plan: run the first ~10–20 submissions **fully manual** (you + an agent),
then capture the recurring judgment as a `.claude/skills/` triage skill in open-scout-api. Automate
normalize → vet (resolve id, `check_links.py` the source URL, vocab-check the feature code) → draft
the `data/camps/<id>.json` edit + `validate_data.py`/`build.py`; keep the **truth call and the merge
human, always**; never auto-merge user data; new vocab terms are a human taxonomy decision.
Provenance on acceptance: append `provenance.sources[]` (`{url, accessed}` + a `citation` like
"community submission via Tally — <role>, <name-or-anonymous>, <date>"), bump `features_verified_at`,
raise `features_source_tier` when a director/staff confirms, add `features[].note` for texture.

## Notes

- CI (informational, not a failure): the deploy workflow logs "Node.js 20 is deprecated" for
  GitHub's own actions; GitHub auto-forces Node 24. Clears when those actions ship Node 24 majors.
