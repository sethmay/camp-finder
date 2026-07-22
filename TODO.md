# TODO

Active queue and deferred work. Write each item to survive a clean context.

## Data source — Open Scout API (since 0.28.0)

Camp/council data comes from the **Open Scout API** (registry-only) via `npm run data`
(`web/scripts/build-data.mjs`, pinned to `EXPECTED_VERSION`). The old Python `pipeline/`
and canonical `data/` tree were removed in 0.28.0; all data authoring, corrections, and
scraping now happen upstream in [open-scout-api](https://github.com/sethmay/open-scout-api).
Refreshing the committed dataset is a deliberate step (`npm run data`), not part of the build.

## Map & UI polish (active) — live at https://sethmay.github.io/camp-finder/

- **Verify the map on the live site.** Headless software-WebGL paints the basemap but not the
  overlay layers, so the muted palette, dot pins, and reservation count pills need a real-GPU look.
- **Popup positioning** — confirm/fix the marker popup anchor once markers are verified live.
- **General design-spec pass:** card spacing, empty-state treatment, mobile list/map toggle.

## Feature ideas

- **Filter by camp elevation.** Altitude facet (e.g. "under 3,000 ft" vs alpine) — troops care
  about acclimatization and heat. Needs an `elevation` field per camp from the API. See API asks.
- **Filter by average summer temperature.** Screen for cooler/warmer camps — needs a climate
  field (e.g. average July high) per camp from the API. See API asks.
- **Former/non-council camping (parked).** Camps sold to orgs that still allow Scout camping;
  local/state/federal camping locations. Beyond current scope (BSA council camps) — park.

## Open Scout API asks (upstream, not in this repo)

Tracked here because each unblocks a camp-finder feature:

- **`features` in `current/camps.json`.** Currently only on the canonical `camps/{id}.json`, so
  `build-data.mjs` fetches all ~449 canonical files just for it. Adding it to the projection
  (mirrors `program_types`; vocab already published) removes that whole enrichment pass.
- **`elevation` per camp** (derivable from lat/lon via a DEM lookup) → enables the elevation filter.
- **Average summer temperature per camp** (climate field, joined by coordinates) → enables the temp filter.

## Crowdsourcing / corrections (parked)

Corrections now flow **upstream** to open-scout-api (the "Suggest a correction" link points
there). If we still want an in-app intake, options were: GitHub Issue Forms + agent triage → PR
(recommended, $0, no backend) vs. a hosted form. Open decisions: intake channel, require a
council-page URL, attribution. Resume when ready to scope — but confirm it isn't fully covered
by upstream first.

## Notes

- CI (informational, not a failure): the deploy workflow logs "Node.js 20 is deprecated" for
  GitHub's own actions; GitHub auto-forces Node 24. Clears when those actions ship Node 24 majors.
