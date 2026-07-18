# Changelog

All notable changes, newest first. One line per merge: `` - `<short-sha>` <imperative> ``.

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
