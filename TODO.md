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
  about acclimatization and heat. Data now in the API (`elevation_ft`); ready to build — mirror
  the July-high slider (`maxJulyHigh` in `filter.ts` / `Filters.tsx` / `searchParams.ts`).
- **Export the filtered camp list** (CSV → opens in Excel / Google Sheets / LibreOffice) for
  offline planning. Client-side only, no backend: a pure `web/src/lib/csv.ts` serializes the
  current `ranked` set (from `SearchApp.tsx`) → CSV string; an "Export" button in the results
  controls row (`SearchApp.tsx` ~L127, beside the view toggle / `ResultsList` sort) triggers a
  Blob download. Export exactly what's currently filtered + sorted. Columns: name, council,
  city/state, program categories, features, avg July temp, official `url`. Unit-test the
  serializer (comma/quote/newline escaping).
- **Former/non-council camping (parked).** Camps sold to orgs that still allow Scout camping;
  local/state/federal camping locations. Beyond current scope (BSA council camps) — park.

## Crowdsourcing / corrections (parked)

Corrections now flow **upstream** to open-scout-api (the "Suggest a correction" link points
there). If we still want an in-app intake, options were: GitHub Issue Forms + agent triage → PR
(recommended, $0, no backend) vs. a hosted form. Open decisions: intake channel, require a
council-page URL, attribution. Resume when ready to scope — but confirm it isn't fully covered
by upstream first.

## Notes

- CI (informational, not a failure): the deploy workflow logs "Node.js 20 is deprecated" for
  GitHub's own actions; GitHub auto-forces Node 24. Clears when those actions ship Node 24 majors.
