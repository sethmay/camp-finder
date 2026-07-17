# Changelog

All notable changes, newest first. One line per merge: `` - `<short-sha>` <imperative> ``.

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
