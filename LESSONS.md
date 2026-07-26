# Lessons

Curated, durable, project-specific engineering lessons. Read before similar work.
Distilled from `code-reviewer` output; dedupe and fold, don't append blindly.

## Data pipeline

- **Enrichment/registry/detect passes MUST be idempotent and non-clobbering.** Default to
  filling only empty fields; gate destructive refills behind an explicit `--overwrite`;
  never wipe an existing value when the source fails to re-resolve; route every write
  through `io.save_council` (the canonical writer) so diffs stay minimal. Established in
  `registry.py`, `enrich.py`, `platform_detect`/`_cmd_detect`. Corollary: **a detector's
  `unknown`/negative sentinel is NOT a confirmed negative** — a failed fetch or crawl miss
  returns the same `unknown` as a genuine "no platform", so it must never overwrite a known
  value (this bit `_cmd_detect`: a re-run demoted council-492 blackpug→unknown).
  Note the None-guard blanks-protection is NOT authority ranking: a `>=confidence AND
  strictly-newer` merge still lets a thinner scrape replace a curated non-null field
  (e.g. overwrite a council `website_url` with an event-registration URL, or wholesale-
  replace `features`). If curated fields must outrank scrapes, encode method precedence.

- **MediaWiki/Wikipedia passes belong to the `registry.py` family, not `base.Scraper`.**
  Single trusted endpoint, batched (≤50 titles), `redirects=1`, `formatversion=2`,
  User-Agent + timeout from `config.py`. The §6 scraper etiquette (robots.txt, ≥1s
  rate-limit, 3× retry+backoff) is written for long-tail council-site scrapers and applies
  to these passes only by analogy — don't treat its absence as a defect here, but DO add
  retry/backoff if a pass ever runs unattended (annual refresh cron).

- **Wikipedia title resolution order is fixed: normalized (`from`→`to`) → redirects
  (`from`→`to`) → page lookup by final title.** Any resolver must follow that order and
  guard non-council redirect targets. Today only `Scouting in <State>` and
  `List of councils` are excluded; broader-org / cross-council redirects still pass and
  would adopt a wrong URL — widen the guard if such a case appears.

## Data safety / security

- **URLs entering the dataset from an externally-editable source (Wikipedia infobox, or a
  council page we crawl) are validated only as pydantic `HttpUrl`**, which permits
  internal/loopback hosts. Anything that later fetches a stored `website`/`*_url` (or a
  link crawled from one) with `follow_redirects=True` (`platform_detect.py`) inherits a
  low-grade SSRF surface. A same-registrable-site filter is NOT an SSRF boundary — a
  same-site URL can 302 to an internal host, so the allow-list must be re-checked AFTER
  each redirect, not just on the initial URL. Add a private/loopback host check if a pass
  ever fetches these from a non-operator context (e.g. unattended refresh).

## Docs / process

- **Keep `CHANGELOG.md` / `TODO.md` coverage counts derivable from the committed tree, not
  from a run's printed tally.** A run prints "filled N", but "N/235 have a website" must be
  counted from `data/councils/*.json` at the reviewed rev, and the filled + remaining
  figures must sum to 235. Pre-set fixtures make the run tally and the tree total differ.

- **On any scope change (a filter/field removed or added), sweep ALL user-facing copy for its
  terms before merge** — a code cutover easily leaves marketing/UI copy advertising the old
  behavior (the 0.28.0 registry cutover left "weeks/cost" claims in the hero, meta description,
  and empty states, caught only at the 0.29.x visual check). Copy surfaces: `index.astro`
  (hero), `Base.astro` (title + meta/OG description), `EmptyState.tsx` (no-query AND the
  no-results *recovery* copy — a new filter that can zero results must be named there),
  `about.astro`, `camps/[id].astro` (link-out callout), `Footer.astro`, and `README.md`
  §Status (hardcodes the pinned API version + camp count + filter list). Distinguish stale
  *claims* ("the site filters by X") from intentional *link-out* copy (dates/fees live on the
  council page — keep). The filter set of record is `Filters.tsx` (name, distance, state,
  July-temperature, program, features) — validate copy against it, not memory. A dataset
  refresh (bumping `EXPECTED_VERSION` in `build-data.mjs`) is itself a copy change: it desyncs
  every quoted version/count (README §Status; `about.astro` is safe — it reads `meta.json`).
  `IMPLEMENTATION.md` §8.3 (filter predicates + the `Camp` shape) is a copy surface too — a
  `types.ts` field add or a filter-semantics change (e.g. literal → expanded-superset) must
  update it; it's the contract that "wins on data shape and behavior".
- **Run project checks inside the feature worktree, not the main checkout.** `cd web && npm run
  check` from repo root validates `main`, not your branch (tell-tale: a `0.30.0` vs `0.31.0`
  version banner). Confirm the path/version before citing a green result.

## Testing

- **Test the loop, not just the pure helper.** Network-driven wiring (per-item exception
  isolation, post-redirect base resolution, first-hit short-circuit) is where regressions
  hide. Accept an optional injected `httpx.Client` and drive it with `httpx.MockTransport`
  so the orchestration is covered offline; monkeypatch `config.MIN_REQUEST_INTERVAL_S = 0`
  to keep such tests fast.

- **Cap-before-dedupe makes dedupe tests vacuous.** If the duplicate sits beyond the result
  cap, the `seen` branch never runs and the assertion passes for the wrong reason. Put the
  duplicate inside the capped window so the guard is actually exercised.

- **Make every guard bite — test the conflict, not the singleton.** A dedup+sort fold tested
  with distinct, already-ascending inputs proves nothing (the id filter never fires, the sort
  is a no-op): feed a genuine duplicate (assert dropped) AND an out-of-order element (assert
  reordered). Likewise, when a first-match table encodes precedence (`detect_from_html` returns
  on the first `_SIGNATURES` hit), assert a page carrying BOTH competing signals resolves to the
  intended winner — a singleton "signal A -> A" test leaves the ordering unprotected.

- **An inclusive range/cap filter needs an at-the-boundary test.** `value > cap → drop` keeps a
  camp exactly at the cap; a test with only over/under/unknown cases passes identically if `>`
  silently flips to `>=`. Add a camp whose value equals the cap and assert it's kept — "make
  every guard bite" applied to range filters.

- **Rate-limit spacing must account for the request already made in the same call.** Don't
  skip the polite delay on the first crawled link — the homepage was just fetched from the
  same host. Pause before every same-host request.

- **Assert POST request bodies for positional payload mappings, not just the response.** A
  MockTransport returning a canned body for any matching URL leaves the arg->field mapping
  unguarded (`eventInstanceID`=arg1, `instanceLocationID`=arg2, `orgKey=BSA<nnn>`) — a swapped
  order or wrong key still passes. Parse and assert `request.content` in the handler.

## Scrapers (base.Scraper family)

- **Isolate model construction per item, exactly like network calls.** A scrape loop that
  try/excepts `get()` but builds `Session`/`Camp` outside the guard crashes the whole run
  on one anomalous page — pydantic `ValidationError` is a `ValueError`, and field bounds
  bite (`Session.year >= 2024`, lat/lon range), so an archived pre-2024 week or a bad
  coordinate aborts everything and discards all candidates (written only after the loop).
  Wrap the parse in `except ValueError: continue`.

- **Only retry transient failures.** `raise_for_status()` turns 4xx into `httpx.HTTPError`,
  so a blanket retry loop hammers permanent 403/404s 3x with backoff. Gate retries on
  transport errors / status >= 500; let 4xx fail fast.

- **robots.txt is a real request against the polite budget.** Fetching `/robots.txt`
  through the shared client without seeding `_last_fetch[host]` makes the next fetch fire
  with zero spacing. Route the robots probe through the rate limiter too.

- **A field extractor that re-keys an id must accept every real-world spelling.**
  `_address_state` mapping only full state names silently fell back to the council HQ state
  for postal-abbreviation addresses — mislabeling and mis-keying an out-of-state camp.
  Accept both "California" and "CA".

- **Splitting a page into per-item chunks on a delimiter: verify a co-located token belongs to
  that item, not its neighbor.** `html.split("Coords:")` pairs each session with its own
  `ses.myPricing(...)` ids only because the button renders after its own `Coords:` and before the
  next — pin that with a ground-truth cross-check fixture (session date <-> location id) + a comment.

- **`\bprice` is not "the price to charge".** "Early discount price", "Late registration price",
  "Balance Due $..." all look price-like; a `Regular price -> \bprice -> first $` fallback grabs an
  early-bird/payment amount when the regular anchor is absent. Anchor to the exact labeled line or
  return None (honor the regular-price-only scope) — never a bare `$` (it hits a $0 booking row).

- **`html.unescape` in a flatten step is safe and often necessary.** `&nbsp;` between a label and
  its value masks `Regular price\s*\$` matches; decode after tag-strip, normalize whitespace after
  decode (Python `re` `\s` matches U+00A0, so decoded entities collapse cleanly).

## Frontend / deploy (GitHub Pages project site)

- **Base-path acceptance bar is "does it 404 at the subpath", not "does it build".** For a
  project site served under `/camp-finder/`, `import.meta.env.BASE_URL` is `/camp-finder`
  (NO trailing slash), so `` `${BASE_URL}data/x` `` yields `/camp-finderdata/x`. Route every
  app-internal URL through `withBase` (links, `fetch`, `src`, `url()`, form `action`,
  canonical/OG/sitemap/favicon/manifest). A green `astro build` is not proof — grep the
  emitted `dist/**` HTML + JS for the base prefix.

- **Test env-dependent joins against the real value, not the tooling default.** vitest pins
  `import.meta.env.BASE_URL` to `/`, so a test of base-joining only exercises root unless
  you read the env inside the function and `vi.stubEnv("BASE_URL", "/camp-finder")` (or
  extract a pure `join(base, path)`). Otherwise the exact production bug passes the suite.

- **A CI gate must be non-vacuous, not just present.** Confirm (1) the gate command returns
  non-zero on failure (e.g. `campfinder validate` → `SystemExit(1)`), (2) it's reachable
  (console script / `__main__` wired), and (3) the deploy job `needs:` the gate job. GitHub
  Actions' default `bash -eo pipefail` makes newline-separated `run:` steps fail fast.

## Frontend / map (MapLibre)

- **`muteBasemap` (`web/src/lib/map.ts`) is the single basemap-muting mechanism.** Every map
  surface (MapView, CampLocationMap) mutes by reusing it on `map.on("load")`; never
  reintroduce the CSS `filter: saturate()` hack, and keep all basemap styling behind
  `map.ts` (IMPLEMENTATION.md §1). When you add a MapLibre overlay layer, add its id to
  `OVERLAY_LAYERS` in the same change — a guard listing only some overlay ids silently
  protects a subset, which is worse than no guard.
- **Data-driven overlay layers must partition the source with no gap.** Give every feature a
  discriminator (`count`) and make the layer `filter`s exhaustive (`IS_SINGLE == 1` +
  `IS_GROUP > 1`); a feature matching no layer renders on nothing and vanishes silently.
  Wire click/hover per interactive layer id, not per source.
- **Map a11y is a manual check.** No axe/pa11y in the web toolchain, so marker/label/selection
  contrast is verified only by eye on the live GPU render against `tokens.css` ratios.
- **Camera moves must fire only on a genuine new selection.** The selection effect is keyed
  `[selectedId, ranked, ready]`, so it re-runs on filter/`ranked` changes; guard `flyTo` with a
  `lastFlownRef` updated every run and reset to `null` on deselect — otherwise the camera yanks
  back to a still-selected camp on any filter tweak. Note `selectedId` is shared state for BOTH
  map selection and list-card hover (`SearchApp`: `onHover={setSelectedId}`), so a selection-keyed
  effect also fires on hover — reason about hover when touching fly/popup/recolor.
- **The background-deselect hit-test must list EVERY clickable overlay layer**, not just the
  marker circles: `queryRenderedFeatures(e.point, { layers: ["point","cluster","point-label","cluster-count"] })`.
  Omitting the text layers makes a click on a camp's name/count read as "empty map" and wrongly
  deselect. Same sync discipline as `OVERLAY_LAYERS`.

## Frontend / a11y (manual — no axe/pa11y in the toolchain)

- **Every interactive control carries `cf-tap`** (`global.css`: `min-height: 44px`, the handoff
  hit-target floor) — inputs, selects, buttons, and especially `input[type=range]`, which renders
  ~20px tall by default (the worst offender). A control without it is a visible outlier.
- **A slider whose max is a sentinel ("105 = Any") needs `aria-valuetext`** mirroring the visible
  label ("85°F" when capped, "Any" when off); assistive tech reads the raw `value`, so the
  off-state (the default) otherwise announces as a real cap. Check the sentinel against the real
  data range first — here `july_high_f` maxes at exactly 105 with a `>` guard, so "cap 105" == "no
  cap" with no off-by-one; a mirroring filter (e.g. elevation) may not be so lucky.
- **A new visual chip/badge state needs a text carrier, not a `title`.** `title` on a
  non-focusable `<span>` is invisible on touch, unreachable by keyboard, inconsistently announced —
  so colour + `title` reduces to colour alone (WCAG 1.4.1). Put the qualifier in the accessible
  name (`sr-only` suffix or `aria-label`) AND give a non-colour visual cue (the signature chip uses
  a leading ★ + `sr-only " (signature feature)"` + a detail-page legend).

## Data / provenance

- **A displayed field from a derived/joined upstream source needs its own attribution + label.**
  The detail page's single `ProvenanceBadge` reads "Source: council page · verified <date>" — it
  covers council facts only. Climate normals / elevation / geocodes joined upstream are NOT the
  council's data and `verified_at` doesn't describe them: label derived stats as such ("Typical
  July … avg", not "July") and credit the source in the same change. IMPLEMENTATION.md §13: no
  orphan or mis-attributed facts.

## Frontend / feature facets & vocab (Open Scout API)

- **`FEATURE_FACETS` (`format.ts`) is a deliberately curated subset of the open vocab, NOT
  `vocab.features.map(code)`.** The vocab is large (121 terms) and grows; the filter shows ~15
  recognizable broad facets. Invariants on any change: every facet code must exist in the emitted
  `vocab.json` (else the chip shows a humanized fallback) and must match a non-empty camp set under
  `expandFeatures`. Recompute per-facet counts from `camps.json` before curating — don't assume a
  rollup: `category:"facility"` terms (`waterfront` 209, `dining_hall` 161) sit OUTSIDE the activity
  hierarchy, so `aquatics` never subsumes `waterfront`.
- **Filter by expanding the camp's features UPWARD, not the selection downward.**
  `feats.every((f) => expandFeatures(camp.features).has(f))` keeps AND-across-facets and needs no
  descendants map; guard with `if (feats.length)` so the default path allocates nothing. The
  upstream `broader` graph is a graph, not a list — `expandFeatures` must tolerate cycles /
  self-parents / missing parents (visited-Set guard), which needs a unit test (the graph is
  re-fetched every `npm run data`).
- **Narrowing the chip list orphans URL state.** `fromParams` must drop `feat=` values that aren't
  facets (`.filter((f) => FEATURE_FACETS.includes(f))`), else a stale/hand-crafted code filters
  invisibly (no chip pressed), clearable only via "Clear all" — violating §8.4 shareable-URL state.
- **Prove a dataset refresh is non-regressive with a per-id diff of the OLD vs new committed
  `camps.json`**, not a build + eyeball: `git show <base>:web/public/data/camps.json` + a `node -e`
  set-compare. It caught the v0.35 refresh silently dropping literal `climbing`/`shooting_sports`
  from 5 camps (recovered only via the new `broader` rollup) and confirms id-set stability + no new
  nulls on repaired URLs. For a facet rework, also assert monotonicity: for every facet, the OLD
  matching id-set ⊆ the new one (counts can rise while individual camps drop out).
- **Shared card/detail display rules go in one exported `web/src/lib` helper.** Signature-first
  ordering was implemented twice (`CampCard` Set+sort vs `[id].astro` inline comparator) before
  being unified as `orderFeatures` — same class as the "keep pure logic in lib + test it" rule.
