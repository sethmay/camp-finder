# Changelog

All notable changes, newest first. One line per merge: `` - `<short-sha>` <imperative> ``.

## 0.31.2 (patch) — 2026-07-26

- `PENDING` Rename the July filter label from "Max July daytime high" to "Avg July daytime temp".

## 0.31.1 (patch) — 2026-07-26

- `d9c16eb` Refresh the stale root `CLAUDE.md` for the registry-only architecture: it still
  described the removed Python `pipeline/` + `data/councils/` and a five-way field-add sequence.
  Now documents the Open Scout API → `build-data.mjs` → `types.ts` → frontend flow, the current
  filters, and marks IMPLEMENTATION.md's pre-cutover pipeline / §8.3 sections as historical (a
  pointer in `CLAUDE.md` plus a ⚠ banner atop `IMPLEMENTATION.md`).

## 0.31.0 (minor) — 2026-07-26

- `26ac1bf` Upgrade to Open Scout API **v0.35.0**: source camp `features` (+ `features_signature`,
  `features_verified_at`) straight from the projection, dropping the per-camp canonical fetch;
  rework the feature filter to curated broad facets that expand the new 121-term vocabulary
  hierarchy (e.g. "aquatics" matches a camp listing only "kayaking"), with signature features
  highlighted. Data refreshed to v0.35.0 (78 camp websites / 75 URLs repaired upstream).

## 0.30.0 (minor) — 2026-07-25

- `3174226` Add a **Max July daytime high** filter (avg July temps per camp from Open Scout API
  v0.27.0): a slider drops camps hotter than the cap (unknown temps pass), the typical July high
  shows on result cards, and the July low–high range shows on detail pages. Data refreshed to
  v0.27.0 (449 → 448 camps).

## 0.29.2 (patch) — 2026-07-21

- `01b6a2f` Fix the map camera yanking back to a previously selected camp: fly only on a
  genuine new selection (ref-guarded, not on every filter/`ranked` change), and clear the
  selection on a background-map click (the map's only deselect).

## 0.29.1 (patch) — 2026-07-21

- `8ead3ed` Fix stale registry-cutover copy: the home hero, `Base.astro` meta description, and
  the empty-state strings still named the weeks/cost/dates filters removed in 0.28.0.

## 0.29.0 (minor) — 2026-07-21

- `75cf473` Polish the search map (design §9): mute the vector basemap to the handoff palette
  via `muteBasemap` (land/water/park/road/label) and drop the CSS saturation hack; render
  single camps as brand dot pins and reservations as primary-green **count pills**.

## 0.28.0 (minor) — 2026-07-21

- `40ccc2e` Re-source the site from the **Open Scout API** (`current/camps.json` v0.24.0):
  new `web/scripts/build-data.mjs` refresh replaces the Python pipeline as the data source.
  Registry only — drop session/fee/date data and the weeks/cost filters + sessions table;
  the CTA points at each camp's durable `url`, feature/program labels come from the API vocab
  endpoints, and co-located camps cluster by reservation on the map. Null-council national
  bases handled. 449 camps / ~213 councils / 52 states.

## 0.27.0 (minor) — 2026-07-19

- `3cd2253` Extend the distance filter with **800 / 1000 / 1500 / 2000 mi** options (`RADII` in
  `Filters.tsx`) — reach for cross-country, Alaska/Hawaii, and overseas searches.

## 0.26.1 (patch) — 2026-07-19

- `42228f0` Mark **Cabrillo Beach Youth Waterfront Sports Center** (Greater Los Angeles Area Council,
  033) **closed** — the site was reclaimed for the LA 2028 Olympic sailing venue. First use of
  `status: "closed"`: the canonical record is retained as a tombstone but excluded from the published
  site by `build._include_camp` (build camps 484 → 483).

## 0.26.0 (minor) — 2026-07-19

- `5bd2b34` **More app** — distance filter gains **300 / 400 / 500 / 600 mi** options; added
  **S-F Scout Ranch** (Greater St. Louis Area Council, 312), superseding the junk-named
  `Summer Camp-Gamble` / `Summer Camp-Famous Eagle` scrape dups (its two program styles). Added two
  overseas councils: **Far East Council** (803, AP) with 4 Scouts BSA camps (Okinawa, Tokyo, Malaysia,
  Philippines) and **Transatlantic Council** (802, AE) with 3 camps (Croatia, Kandersteg CH, Germany);
  overseas camps carry real foreign coordinates (outside US bounds — a benign validate warning) and use
  military USPS state codes AP/AE. Councils 236 → 238, camps 478 → 486, sessions 1271 → 1277.

## 0.25.0 (minor) — 2026-07-19

- `abf2a76` **usscouts OCD sweep** — worked the full 320-lead OCD review list via 16 scouts. Added
  **61 camps (+53 sessions) across 44 councils**, heavy on council **high-adventure / aquatics bases**
  and **Cub camps** the resident-camp passes missed: Pamlico Sea Base, Hanna Venture Base, Camp
  Pellissippi, and the Lumpkin / Dowling / Elkhorn / Rocky Mountain / Chilkoot / North Idaho HABs;
  MOHAB / Grizzly Base (MT); Camp Powhatan + Ottari (Blue Ridge SR); Camp Tres Ritos; Hinckley Scout
  Ranch; Medicine Mountain + Lewis & Clark (Sioux 695); Ten Mile River's Camp Ranachqua; plus many
  day/Cub camps. Dedup dropped 25 automatically + 7 manual name-variants (Hubert Eaton = HESR Big Horn,
  June Norcross Webster = J.N. Webster, ZBASE, Heritage Reservation umbrella, Camp Charles F. Perry =
  Camp Perry, Floodwood Mountain = Floodwood Trek); 3 appended to the PNW demo councils. Remaining OCD
  leads were unconfirmable (defunct / non-BSA / service centers). Camp count 417 → 478, sessions
  1218 → 1271.

## 0.24.0 (minor) — 2026-07-19

- `967a6fa` **Leads batch 5 — long-tail sweep (23 states)** — final pass over the remaining My Maps +
  OCD leads (WA/OR/AK/HI/ID/MT/WY/CO/NM/AZ/KS/NE/ND/MO/AR/NC/VA/DC/MD/DE/MI/VT/PR) via 9 regional
  scouts. Added **43 camps (+82 sessions) across 25 councils** — incl. Camp Melita Island + K-M Ranch
  (Montana), Camp Cris Dobbins + Tahosa HAB (Colorado), Camp Geiger (Pony Express), Camp Maluhia + Alan
  Faye (Hawaii), Salmon River HAB (Idaho), and the Great Lakes Sailing Adventure (Michigan). Appended 7
  camps to the legacy PNW "demo" councils (Chief Seattle, Cascade Pacific, Pacific Crest) that `merge()`
  guards — Camp Pigott/Edward, Butte Creek, Camp Pioneer (OR), Cascade Trek, Camp McLoughlin ×2.
  Dedup caught Camp Coker + J. Edward Mack (already present). Dropped Will Rogers SR (Cimarron merged
  into Last Frontier; no resident camp). Camp count 374 → 417, sessions 1136 → 1218.

## 0.23.0 (minor) — 2026-07-19

- `2b3dac6` **Leads batch 4 (SC/UT/CT/IA/KY/LA/MS/OK/RI/NH)** — processed ~70 crowdsourced My Maps +
  OCD leads across ten state pools (one scout each), plus community-suggested **Camp McKee** (Blue
  Grass 204) and the deferred **Saukenauk SR** (corrected to Mississippi Valley 141, Mendon IL). Added
  **50 camps (+82 sessions) across 27 councils**. A global (name, state) + substring dedup caught 6
  cross-batch duplicates — including a mis-keyed Camp Daniel Marshall (returned under CA council 041 but
  already held under GA 093) and "Adventure Day Camp at Camp Norse" vs the existing Camp Norse. Handled
  cross-state camps (Camp Loll → WY, Camp V-Bar → MS under a LA council, Quivira → KS, Little Sioux →
  NE). Coordinates geocoded then recovered from map pins (25 fixed, 3 nulled, ~13 coordinate-less).
  Deferred Will Rogers SR (Cimarron council 474 not in registry). Camp count 324 → 374, sessions
  1054 → 1136.

## 0.22.0 (minor) — 2026-07-19

- `41327d7` **Leads batch 3 (MN/PA/GA/AL/NY/MA/TN/WV/IL/ME)** — processed ~100 crowdsourced My Maps +
  OCD leads across ten state pools (one scout each), verified against council sites; dropped
  defunct/duplicate/non-BSA/venue-pin noise. Added **64 camps (+146 sessions) across 43 councils**,
  including **Fort Steuben Scout Reservation** (Mountaineer Area Council 615, physically in Tippecanoe,
  OH) and Camp Mountaineer. Remapped a Black Pug org id (375 → BSA council 380, Great Falls) and
  handled border-council camps (Camp Horseshoe MD, Camp Merz/Wanocksett cross-border). Coordinates
  geocoded then recovered from map pins (17 fixed, 9 wrong-region nulled, ~14 left coordinate-less).
  Skipped Spanish Trail (already present); deferred Saukenauk SR (ambiguous council key). Camp count
  260 → 324, sessions 908 → 1054.

## 0.21.0 (minor) — 2026-07-19

- `ca9f93b` **Leads batch 2 (OH/TX/NJ/FL/CA/WI)** — processed ~94 crowdsourced My Maps + OCD leads
  across six state pools (one scout each), verified against council sites; dropped defunct/sold,
  duplicate, non-BSA, and out-of-scope venue pins. Added **63 camps (+145 sessions) across 43
  councils**, including correct border-council attributions (PA Hawk Mountain / Minsi Trails, NY
  Greater NY / Greater Hudson Valley, AL Alabama-Florida, IL Three Fires / Blackhawk). Coordinates
  geocoded then recovered from the map pins where geocoding missed (23 fixed, 6 wrong-region nulled,
  18 left coordinate-less pending enrichment). Deferred Fort Steuben SR (council 619 not in registry).
  Camp count 197 → 260, sessions 763 → 908.

## 0.20.0 (minor) — 2026-07-19

- `c78121c` **Indiana leads batch** — first pass through the untrusted My Maps + usscouts OCD leads
  (IN pool), scout-verified against each council's official site: added **11 camps (+35 sessions)
  across 7 councils** — Camp Chief Little Turtle (Scouts BSA+Cub, Anthony Wayne 157), Camp ToPeNeBee
  (La Salle 165), Camp Tamarack (La Salle, MI), Camp Frank S. Betz (Pathway to Adventure 456, MI),
  Camp Belzer / Kikthawenund / Wildwood (Crossroads 160), Camp Buffalo (Scouts BSA+Cub) + Franklin L.
  Cary Camp (Sagamore 162), Maumee Scout Reservation (Hoosier Trails 145), Tunnel Mill Scout
  Reservation (Lincoln Heritage 205). Dropped as defunct/unconfirmed/out-of-scope: Camp Krietenstein
  (sold), Old Ben, Red Wing, Bear Creek, Louis Ernst, Rice Woods, and a Woodland Trails OH event hall.
  Camp count 186 → 197, sessions 728 → 763.

## 0.19.0 (minor) — 2026-07-19

- `95fd812` Add **12 user-verified camps** (+44 sessions across 11 councils, all already in the
  registry): Skymont, Camp Buck Toms, Boxwell (TN), Camp Mack Morris (+Webelos), Kia Kima (+Cub, AR),
  Camp Catoctin (Baltimore Area), Camp Hart + Camp Garrison (Musser SR), Camp Pupukea (+Cub, HI),
  Camp Bartlett (ID), Camp Hohn (+Cub+Webelos, MO), and the James C. Justice National Scout Camp at
  the Summit Bechtel Reserve (WV). Corrects earlier 0.18.0 calls: "Summit" is a real Scouts BSA
  resident camp (added), and Camp Catoctin is a Baltimore Area Council camp (added). Also mined two
  untrusted lead sources into research files: `data/.review/mymaps-camp-leads.md` (358 from the
  crowdsourced Google My Maps) and `data/.review/usscouts-ocd-leads.md` (425 incremental from the
  usscouts OCD export). Camp count 174 → 186, sessions 684 → 728.

## 0.18.0 (minor) — 2026-07-19

- `2c27947` Add **Camp Sinoquipe Scout Reservation** (6 Scouts BSA sessions, $525/$225) under
  Shenandoah Area Council (598) — the former Mason-Dixon Council is now a district of 598, so no
  council was added. Resolved the deferred verify items (no new camps): "Summit" = the national
  Summit Bechtel Reserve (out of scope); Tuscarora/bpcouncil.org = Baden-Powell's Tuscarora SR
  (already have); Camp Pioneer OH = Erie Shores' Camp Frontier (already have). Confirmed Camp Fiesta
  Island already present and accurate. Camp count 173 → 174, sessions 678 → 684.

## 0.17.0 (minor) — 2026-07-19

- `706ceb7` Add **15 community-suggested camps** (+51 sessions across 12 councils) from the r/BSA
  thread — Camp Gorsuch (AK), Camp Easton/Camp Grizzly (ID), Camp Bud Schiele (NC), Camp Davy Crockett
  (TN), H. Roe Bartle + Theodore Naish (Heart of America), Camp Arrowhead (Ozark Trails), Camp La-No-Che
  (FL), Worth Ranch (Longhorn/TX), Camp Liberty (Laurel Highlands), Goose Pond (NE PA), Akridge day camp
  (DE), Ventura County Cub day camp (CA), Lost Lake (AK). **Corrections:** D-bar-A Scout Ranch (272) →
  `not_operating` (no summer resident camp; per community); Camp Three Falls excluded (sold Nov 2024);
  Camp Catoctin excluded (not a BAC summer camp); Camp Liberty supersedes the generic Heritage SBSA entry.
  Camp count 160 → 173, sessions 635 → 678. Full r/BSA cross-check logged in
  `data/.review/community-suggested-camps.md`.

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
