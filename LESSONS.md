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
- **Docs that live in agent context must not carry values that restale.** `CLAUDE.md` is
  auto-loaded every session, so never hardcode a per-merge value (the version) there — point at
  `web/package.json` / `CHANGELOG.md`. For behavior a typed, unit-tested module pins down, point
  at the code (`rankCamps` in `filter.ts`, `Criteria` in `types.ts`), not a spec section that can
  drift. When blessing part of an older spec as "still current," read that part line-by-line first
  (a partly-current section launders its stale half) and mark the stale doc at its source (an
  in-file ⚠ banner), not only from elsewhere. Cross-document "§N" refs must name the file.

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
- **A blank map after editing an island is Vite HMR, not your CSS.** MapLibre owns imperative
  DOM inside a React island, so an HMR update to `SearchApp`/`MapView` can leave the live map
  bound to a container React has already detached: canvas alive, tiles fetched, nothing
  visible — and the frame/border still renders correctly, which sends you hunting the wrong
  change. Restart `astro dev` (or hard-reload) before debugging. Confirmed: an apparent
  "border broke the map" was pure HMR state; the same build rendered fine on `dev`, on
  `preview`, cache-disabled, and across Map/List toggling.
- **MapLibre fails silently in three different ways; handle all three or you get an empty
  box.** `new maplibregl.Map()` THROWS when WebGL is unavailable (inside `useEffect`, so it
  surfaces nowhere useful); a dead style/glyph endpoint does NOT throw and only fires
  `map.on("error")`; and `webglcontextlost` blanks the canvas with no recovery. `MapView`
  handles each and renders a fallback pointing at the list view. Keep the container mounted
  and put the fallback INSIDE it — the `ref` must survive — and give it `bg-muted` so a blank
  canvas can't show the page through the frame, which is what made "map missing" and "map
  empty" indistinguishable. Drop `role="application"` when it fails. Test it by stubbing
  `HTMLCanvasElement.prototype.getContext` to return `null` for `webgl*`.
- **The map's boundary owes 3:1, not the decorative border tone.** Both map frames use
  `border-input`, not `border-border`: a map is an interactive component (`role="application"`,
  pan/zoom) so WCAG 1.4.11 applies to its edge. Pair the border with `overflow-hidden` or the
  square tile canvas overflows the radius. (Watch for the two frames drifting apart — the
  search map went a whole port without a border while the detail map had one.)

## Frontend / a11y (manual — no axe/pa11y in the toolchain)

- **Every interactive control carries `cf-tap`** (`global.css`: `min-height: 44px`) — inputs,
  selects, buttons, and especially `input[type=range]`, which renders ~20px tall by default (the
  worst offender). A control without it is a visible outlier.
  **One deliberate exception: the filter chips.** `ds-overrides.css` (§3.2) releases the floor for
  them — 30px box with a 36×60px non-overlapping target via a `::after` expansion — because a
  non-overlapping 44px target forces a 44px row pitch, which cost ~112px across 14 rows in a
  264px rail. That drops the chips from **WCAG 2.5.5 Target Size (Enhanced), AAA** to **2.5.8
  Target Size (Minimum), AA**, which they clear comfortably; every other control still holds 44px.
  Two traps this leaves behind, both already hit once: `cf-tap` on a chip is DEAD (the override
  wins on specificity), so do not read its presence as proof of 44px; and if you revert the
  override, restore the class too. The revert recipe is in that block's comment.
- **44px is WCAG 2.5.5 (Enhanced, AAA), not 2.5.8** — 2.5.8 (Minimum, AA) asks only 24×24. Worth
  knowing which one you are claiming: "we meet the 44px floor" is an AAA claim, and dropping to
  24px is still AA-conformant rather than a failure.
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
  `vocab.features.map(code)`.** The vocab is large (128 terms) and grows; the filter shows ~20
  recognizable broad facets, rendered under category subheadings (see below). Invariants on any change: every facet code must exist in the emitted
  `vocab.json` (else the chip shows a humanized fallback) and must match a non-empty camp set under
  `expandFeatures`. Recompute per-facet counts from `camps.json` before curating — don't assume a
  rollup: `category:"facility"` terms (`waterfront` 209, `dining_hall` 161) sit OUTSIDE the activity
  hierarchy, so `aquatics` never subsumes `waterfront`.
- **The Features filter groups facets by each term's vocab `category`** (`FEATURE_FACET_GROUPS`,
  `format.ts`): `activity` → Activities, `subject` + `program_model` → Programs & audience,
  `facility` + `accommodation` → Camp facilities & lodging. Adding a facet whose category is not
  mapped in `FACET_GROUP_BY_CATEGORY` drops it into a trailing "More" bucket — the partition test
  in `format.test.ts` fails loudly if that happens, so map new categories there when the vocab grows.
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

## Frontend / design system (vendored `@opensourcescouting/design-system`)

- **A vendored `file:` tarball is reproducible only if its INPUTS are in version control.** A
  committed `.tgz` whose sha512 matches `package-lock.json` proves the bytes cannot change
  unnoticed — it proves nothing about where they came from. `npm ci` succeeds while the build
  inputs live on one machine. If a pre-release must be vendored: commit the patches as files,
  record the upstream sha + the exact `npm pack` command beside the tarball, and add
  `*.tgz binary` to `.gitattributes` (git's binary auto-detection is the ONLY thing keeping the
  integrity hash valid — a later `* text=auto` breaks `npm ci` with EINTEGRITY on CI, no local
  repro). Exit criterion: swap to a registry version. See `web/vendor/README.md`.
- **Override a design system's TOKENS, never its compiled class names.** Token overrides
  (`--primary`, `--radius`) are the supported surface and survive version bumps. Selectors that
  key on the vendor's compiled Tailwind literals — `button.h-9`, `[role="tablist"].h-10`,
  `.bg-card.rounded-lg`, `[role="dialog"].bg-background` — are a silent time bomb: a patch bump
  renames one and the override vanishes with no error, no type failure, no test. One such rule
  shipped **dead on arrival** here (`tailwind-merge` strips `h-10` when the call site passes
  `h-auto`, so it could never match, while its comment claimed it did the work). Prefer passing
  classes at the call site; when a selector override is unavoidable, name the exact DS version it
  was verified against so a bump has a re-check list (see the header block in `ds-overrides.css`).
- **CSS custom properties and JS token data are two different sources of truth; a CSS override
  cannot reach a `<canvas>`/WebGL consumer.** Retuning `--primary` in a stylesheet leaves MapLibre
  (paint evaluated in JS) painting the stock value — same semantic role, two colours on one
  screen. Anything reading tokens through JS must be re-pointed in the same change, or read the
  resolved values via `getComputedStyle(document.documentElement)` at init. `map.ts` now does the
  latter, so it cannot drift from the CSS; do the same for any future charting/canvas surface.
- **Importing one data constant from a component barrel drags the whole library into the chunk.**
  `import { TOKENS } from "@opensourcescouting/design-system"` for eight hex values added ~213 KB
  (+27%) of Radix + sonner to the map chunk — on the search page AND all 451 detail pages —
  because the package's `sideEffects: ["**/*.css"]` blocks Rollup tree-shaking. Prefer a data-only
  subpath (`/tokens.json`) or `getComputedStyle`. Verify by diffing `dist/_astro/*.js` byte sizes
  against the previous build, not by reading the import.
- **A contrast audit is scoped to the surfaces it enumerated.** `ds-overrides.css` computes every
  token against *card* and *page* and says so — then a fallback put text on a third surface
  (`bg-muted`), where `os-on-surface-faint` landed at 3.71:1 (fails AA). Adding a new surface
  class means re-running the pairings; and inline ratio annotations go stale when an earlier part
  of the same file changes a surface (the `--card` tan→white collapse left two annotations wrong).
  Recompute, don't eyeball.
- **When a redesign moves a documented a11y floor, edit the doc in the SAME commit.** Releasing
  `cf-tap`'s 44px floor for the filter chips (a defensible 2.5.5 AAA → 2.5.8 AA change) while this
  file still asserted "every interactive control carries `cf-tap`" left a written invariant
  contradicting shipped CSS — the worst failure mode in a repo whose a11y checks are manual.

## Frontend / sticky layout (Camp Compare, 0.34.0)

- **`overflow-x: auto` is not a horizontal-only decision — it kills vertical `position: sticky`
  for every descendant.** Per CSS Overflow L3, when one axis is neither `visible` nor `clip` the
  other computes to `auto`, so an `overflow-x-auto` wrapper becomes a scroll container in *both*
  axes; a `sticky top-0` child then resolves against that box (usually no vertical overflow) and
  never pins. Same family as the `overflow: hidden → clip` fix, but sneakier — `clip` isn't an
  option when you genuinely need horizontal scroll. Fixes: (a) let the *document* scroll
  horizontally (`min-w-[…]` on the content, no wrapper scroller) so both axes resolve against the
  viewport — what `/compare` does; or (b) give the scroller a real height (`max-h-[100dvh]`). A
  responsive `overflow-*` on an ancestor of anything sticky needs a comment saying which it is.
- **A measured sticky offset needs the whole stack measured — `scroll-margin-top` too.** `/compare`
  measures both the camp row (`--compare-header-h`) and a section header (`--compare-section-h`)
  with one `ResizeObserver` and composes them; hard-coding either (an earlier `+ 52px`) reintroduces
  the magic number the measurement existed to kill. Put the scroll margin on focusable elements in
  the sticky-covered region (out-links, inputs, disclosures), not just the disclosure.

## Frontend / design system — extends the `.display` + token entries above

- **`.display` silently eats `font-*`, `tracking-*`, `uppercase`, `leading-*` — wrong tool for an
  11px eyebrow.** The unlayered DS rule sets family/weight/tracking/style/transform/line-height at
  once; for `scoutsbsa` that's weight 700, tracking 0, transform none, so
  `display … uppercase tracking-[0.12em] font-semibold` renders sentence-case/untracked/700 with no
  error. Tell: two eyebrows with identical utilities but only one carrying `display` visibly
  disagree. For an eyebrow, drop `display` and let the utilities apply.
- **`--os-font-body` is Source Serif 4 — this site's default body face is already serif;** Montserrat
  is the *display* face, reached only via `.display`. Any handoff wanting "serif for editorial
  emphasis, sans elsewhere" is inverted here — setting `fontFamily: var(--os-font-body)` to "make it
  serif" is a no-op. Get editorial lift another way (italic) and flag the conflict, don't ship a dead style.
- **A hex constant in a component is a token duplicate even when the comment says `// == --primary`.**
  It's correct only until `ds-overrides.css` retunes the token — same drift class as the MapLibre
  JS-token lesson. Reserve raw hex for colours with genuinely no token (the amber data-gap family,
  `#E2DAC7`/`#EFEADD`/`#A79877`/`#6E6449`); everything else goes through `bg-primary`/`text-primary`/etc.

## Frontend / a11y — extends the manual-a11y section above

- **Any state where the primary component doesn't render needs its own affordances.** `/compare`
  hides the whole table below 2 camps — and with it every `Remove` button; at one selection there
  was no way to undo the pick, and the slot rail showing it was `aria-hidden`. Enumerate
  below-threshold states and ask what a user can still *do*. Corollary: `aria-hidden` on a decorative
  container is a bug the moment real content renders inside it — hide the placeholders, not the list.
  Pair count-gated UI with a `role="status"` live region so add/remove is announced.
- **A `role="combobox"` typeahead needs `aria-activedescendant`, and `role="option"` must not wrap a
  `<button>`.** ARIA APG shape: focus stays on the input, each `<li role="option">` gets a stable id,
  `aria-activedescendant` points at the active one, and the option's content is non-focusable
  (`onMouseDown`, not a nested button). camp-finder now has two typeaheads and no automated check.
- **Choosing per-cell `aria-label`s + heading navigation over ARIA table roles makes the heading
  outline load-bearing.** Defensible over a CSS grid with sticky/`overflow-clip` ancestors (fragile
  for real table roles), but only if the outline has no jumps (no h1 → h3) and *every* cell variant
  carries its prefix — the unsurveyed cells (the null-vs-empty carriers) were the branch that lost theirs.

## URL / state — extends the shareable-URL rules above

- **Format validation is not existence validation.** `/^\d{5}$/` accepts `00000`; `zipToCentroid`
  then returns `null` and the UI degrades to em-dashes with the entry prompt already gone. A lookup
  keyed on user input has three states — absent, present-and-resolvable, present-and-unresolvable —
  and the third needs copy. (Both `/compare` and the search page share the ZIP surface.)
- **localStorage needs the clear path, not just the set path.** `if (value) setItem(...)` with no
  `removeItem` means a deliberate "clear" returns on reload, because the load path falls back to the
  stored value when the URL carries none.

## Data / provenance + testing — extends the entries above

- **Surfacing an existing API field on a *new* page re-triggers the attribution rule.** `elevation_ft`
  was always in the API; rendering it (and July normals) on `/compare` for the first time shipped with
  no derived-source label until caught — the detail page's "via Open Scout API" credit doesn't travel
  with the field. Checklist for any new page rendering climate/elevation/geocodes: does it carry its
  own attribution, or borrow one that lives elsewhere?
- **The per-id refresh diff should also assert "no new empty arrays", not just "no new nulls"** — treat
  `[]` as null-equivalent so a silently emptied `features`/`features_signature` is caught, alongside
  id-set stability, feature-code loss, and `features_verified_at` demotion, in one `node -e` pass.
- **A vocab-derived grouping deserves a partition test that tolerates the head-vs-member distinction.**
  `FEATURE_CATEGORIES` makes a `broader` cluster *head* the category label, never a member row, so a
  naive "every term appears in some `members`" assertion fails on a correct build; assert
  `covered = members ∪ {cluster head codes}` equals the full vocab. This is what keeps "no second
  hand-maintained membership list" safe as the vocab grows.
