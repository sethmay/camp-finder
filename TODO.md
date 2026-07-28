# TODO

Active queue and deferred work. Write each item to survive a clean context.

## Data source — Open Scout API (since 0.28.0)

Camp/council data comes from the **Open Scout API** (registry-only) via `npm run data`
(`web/scripts/build-data.mjs`, pinned to `EXPECTED_VERSION`). The old Python `pipeline/`
and canonical `data/` tree were removed in 0.28.0; all data authoring, corrections, and
scraping now happen upstream in [open-scout-api](https://github.com/sethmay/open-scout-api).
Refreshing the committed dataset is a deliberate step (`npm run data`), not part of the build.

## Design system spike (parked, awaiting decision) — branch `feature/design-system-spike`

Full UI retheme onto `@opensourcescouting/design-system` 0.2.0-alpha.0, done as a spike.
**Not to be merged without explicit approval.** Builds clean (451 pages, `astro check` 0 errors,
35/35 tests, 0 console errors across every route). Read **`DESIGN_SYSTEM_SPIKE.md` on that branch**
— it is the deliverable: what the migration took, and ~30 findings grouped as upstream blockers
(A), a11y bugs (B), palette problems (C), missing primitives (D), API friction (E), Astro traps (F).

Blocking on somebody else, not on us:
- **A1/A2 must be fixed upstream in the design system before real adoption.** The published package
  is uninstallable (`preinstall` script excluded from `files`; reproduced against npm `0.1.1`), and
  `npm run build` cannot complete on Windows. Both are fixed in the working tree of the clone at
  `.claude/design_system` and **should be sent upstream as PRs** — they are not our repo's changes.
- The branch depends on a vendored tarball (`web/vendor/*.tgz`, `file:` dependency) purely because
  of A1. First task if the spike graduates: swap to a real registry version.

Open questions for the humans (spike deliberately does not decide these): body serif for a
data-dense UI, the 60px hero scale, whether `--card == --background` and the SA-Blue accent on
`scoutsbsa` are ours to override or theirs to fix.

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
