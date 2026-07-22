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
