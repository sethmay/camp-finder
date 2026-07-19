# Changelog

All notable changes, newest first. One line per merge: `` - `<short-sha>` <imperative> ``.

## 0.16.0 (minor) — 2026-07-19

- `4f5cc34` Add **program categories** (Scouts BSA / Cub Scout / High Adventure): surface the
  pipeline's per-camp `program_types` as a frontend filter facet (category chips, URL `?prog=`
  round-trip, mirrors the features facet) with category badges on cards and the detail page.
  Agent extraction added **+35 camps / +121 sessions** across 13 councils incl. new **Michigan
  Crossroads Council (272)** (camp count 126 -> 160, session 515 -> 635). Deduped vs existing
  data: skipped Camp Gamble/Famous Eagle (312), Camp Frontier (460), Long Beach Sea Base (032)
  where scraped data is better; superseded the thin "Camp Snyder Specialty Weeks" with a full
  multi-program Camp William B. Snyder. Fixed 11 geocode misses; adds unit tests for the category
  mapping + filter.

## 0.15.0 (minor) — 2026-07-19

- `0aac927` Add `campfinder global-sync`: parse Black Pug's authoritative Global index
  (`scoutingevent.com/indexMap.php`) and upgrade `unknown`/`other` councils that are "managed"
  on Black Pug to `blackpug` (**+29 councils**; never downgrades; skips tentaroo to avoid dupes;
  reports website discrepancies + deferred tentaroo to a review file). Re-ran the Black Pug scrape
  over the newly-managed councils and merged **+22 camps / +142 sessions** (camp count 104 -> 126,
  session 373 -> 515) — National Capital, Northern Star (Many Point/Tomahawk), Crossroads/Ransburg,
  Long Island/Baiting Hollow, Puerto Rico, etc. Sub-camp program areas collapsed to one camp each;
  treks/high-adventure kept; junk (day/weekend/OA/campaign) excluded; names cleaned. Adds a Puerto
  Rico validation bounding box.

## 0.14.0 (minor) — 2026-07-18

- `9a0705a` Map: label each camp with its name once zoomed past the regional view (`minzoom` 6),
  via a symbol layer on the camps source with a white halo; MapLibre collision detection hides
  overlapping labels so dense areas stay legible. Uses the OpenFreeMap Noto Sans glyphs.

## 0.13.1 (patch) — 2026-07-18

- `7a7590c` Fix the search map showing no camps at the default zoom: the clustered GeoJSON
  source never tiled at low zoom (1 of 104 features queryable; camps only appeared after
  several zoom-ins). Dropped clustering so every camp renders as a point at the default view
  (295 features tiled at z3 in the same probe); source now created with real data on first load.

## 0.13.0 (minor) — 2026-07-18

- `62123aa` UI: replace the desktop 3-column search layout (filters | list | map-always-on)
  with filters + a single map-or-list view toggled at every breakpoint, defaulting to the map.
  Result count moved to the always-visible controls row. Camp detail pages gain a single-location
  map (`CampLocationMap`) in the header — under the name, right of the basic info — when the camp
  has coordinates. `role="application"` keeps its zoom controls in the accessibility tree.

## 0.12.0 (minor) — 2026-07-18

- `4f748c9` Cover the 34 Tentaroo councils by agent-assisted extraction (Tentaroo itself is
  auth-gated + robots-blocked + JS — not publicly scrapable; deferred, see
  `data/.review/tentaroo-deferred-2026-07-18.md`). A 7-`scout` swarm read each council's OWN
  website; merged **35 camps / 116 sessions across 29 councils** (method `llm_extraction`,
  confidence 0.6, human-reviewed + fee spot-checks). Camp count 69 -> 104; all 35 camps
  geocoded to precise coords (0 validate warnings). 3 councils have no resident camp, 2 uncertain excluded.

## 0.11.0 (minor) — 2026-07-18

- `e0a73b6` Ramp Black Pug coverage: scraped all 124 blackpug councils, reviewed the 81
  candidates, and merged **46 camps / 178 sessions across 45 councils** (camp count 23 -> 69,
  245/279 sessions priced). Excluded 13 out-of-scope events (day/specialty programs, merit-
  badge signups, a care-package product, an OA fellowship, a donation page, etc.) to
  `data/.review/blackpug-2026-07-18-manual-review.md`; fixed 4 malformed camp names. Adds
  `config.DEMO_COUNCILS` + a `merge` skip so scrapes never clobber the hand-authored PNW
  fixtures (now that `detect` classifies them as blackpug).

## 0.10.1 (patch) — 2026-07-17

- `ed967f6` Classify registration platforms across all 235 councils (`campfinder detect`),
  now that every council has a website: programmatically scrapable councils **30 -> 158**
  (124 Black Pug, 34 Tentaroo); 15 doubleknot, 61 unknown, 1 other remain. Data-only.

## 0.10.0 (minor) — 2026-07-17

- `a46b787` Fill **all 235** council websites (was 95/235): `campfinder enrich` now applies
  a curated `data/council-websites.json` seed (`council_id -> url`, fill-only) before the
  Wikipedia fallback, and gains `--report-missing` to list gaps. The 140
  Wikipedia-unresolvable councils were resolved by an agent-assisted `web_search` pass (14
  `scout` subagents), each URL reachability-checked. Adds `enrich` seed tests.

## 0.9.2 (patch) — 2026-07-17

- `1d5b260` Stop LastPass badging the distance field for once and for all: the trigger was
  the literal "zip"/"ZIP code" string (payment/address autofill). Remove it from every
  scanned attribute — `name="near-code"`, `placeholder="97405"`, `aria-label="Distance
  origin, 5-digit code"`. Filter behavior unchanged.

## 0.9.1 (patch) — 2026-07-17

- `41db6f7` Suppress the LastPass field icon on the ZIP input more robustly: add
  `name="camp-zip"`, explicit `type="text"`, and `data-form-type="other"` (LastPass ignored
  `data-lpignore`/`autocomplete=off` alone on that field).

## 0.9.0 (minor) — 2026-07-17

- `868ac68` Fix the distance filter: `zip-centroids.json` was a 16-ZIP placeholder, so most
  ZIPs (e.g. 97405) resolved to nothing and the filter silently no-op'd. Add `campfinder
  zipcentroids` (US Census ZCTA gazetteer, public domain) shipping all 33,791 ZIP centroids;
  suppress the LastPass overlay on the ZIP/search inputs (`data-lpignore`).

## 0.8.0 (minor) — 2026-07-17

- `3afc506` UI polish: fix the filter-rail date-range inputs overflowing into the results
  column (grid + `minmax(0,1fr)` so native date inputs shrink); harden the map load race so
  camp data + fitBounds always apply after style load (was empty until a filter change);
  mute the basemap so markers pop.

## 0.7.0 (minor) — 2026-07-17

- `4eefd1a` Scrape Black Pug fees: reverse-engineered the `ses.myPricing` POST
  (`/Ajax/SES` with `orgKey=BSA<nnn>`) to fill youth/adult regular prices per session.
  Adds `Scraper.post`, `parse_pricing`; merge now fills an empty fee even without a newer
  timestamp. 66/67 scraped sessions now priced (e.g. Camp Winton $790, Camp Yawgoog $650).

## 0.6.0 (minor) — 2026-07-17

- `87fe121` Route Doubleknot councils through the Black Pug scraper (their registration
  runs on scoutingevent.com; doubleknot.com is just the CMS) + dedup camps by id per
  council + add `scoutingevent.com` detect signature. Adds Camp Horseshoe (MD) and Camp
  Yawgoog (RI) — dataset now spans 9 states / 23 camps.

## 0.5.0 (minor) — 2026-07-17

- `b368530` Add GitHub Pages deploy (`.github/workflows/deploy.yml`) + subpath config
  (`base: /camp-finder`, `withBase` helper): validate + web tests gate, then publish the
  static site. Fixes base-relative data fetches and all internal links for the subpath.

## 0.4.0 (minor) — 2026-07-17

- `4eeff13` Add Black Pug scraper (`scrapers/base` + `scrapers/blackpug`), `merge.py`, and
  `campfinder scrape`/`merge`: scraped 14 resident camps / 51 sessions across 8 councils
  (CA, MD, MO, NE, NJ, NY) from scoutingevent.com — dataset now spans 8 states

## 0.3.0 (minor) — 2026-07-17

- `08b367a` Enhance `platform_detect` with a 1-level registration-link crawl and make
  `campfinder detect` fill-only / non-clobbering (`--overwrite` to force): 39/95 councils
  classified (blackpug 15, doubleknot 8, tentaroo 15, other 1)

## 0.2.0 (minor) — 2026-07-17

- `b6d7891` Add `campfinder enrich`: resolve council official websites from Wikipedia
  infoboxes (91 filled this pass; 95/235 total have a website; 140 remain — tracked in TODO.md)

## 0.1.0 (baseline) — 2026-07-17

*Initial baseline. These entries pre-date the per-merge versioning rule and are
grouped here rather than split per commit.*

- `9197641` Scaffold repo: specs, Python pipeline (schema, registry, validate, build,
  geocode, platform detect) with tests, and the Astro + React static site
- `45b93db` Build national council registry (235 councils) from the Wikipedia council list
