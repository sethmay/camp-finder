# TODO

Active queue and deferred work. Write each item to survive a clean context.

## UI refinement — live at https://sethmay.github.io/camp-finder/

Initial polish done in 0.8.0: date-range inputs no longer overflow the rail; map load-race
hardened (data + fitBounds now apply on first load, not just after a filter change); basemap
muted via a saturation filter. Remaining (bigger, "features down the road"):
- **Verify map markers on the live site.** Headless software-WebGL here paints the basemap but
  not the added circle layers, so marker rendering couldn't be confirmed locally — check the
  deployed site. Source now carries all camp features and fitBounds runs (verified).
- **Price-pill markers** (design §9): replace the plain circle layers with white/ink price
  pills + primary-green hover/selected; count clusters. `web/src/components/MapView.tsx`.
- **Popup positioning** — the "…not posted / view details →" overlay you saw at the map's
  top-left is the marker popup; confirm/fix its anchor once markers are verified live.
- **Custom muted basemap style** to the exact handoff palette (land #E6E2D6, water #CBD9DE,
  ...) instead of the CSS saturation filter, in `web/src/lib/map.ts`.
- General design-spec pass: card spacing, "Fee not posted" treatment, mobile list/map toggle.

CI note (informational, not a failure): the deploy workflow logs "Node.js 20 is deprecated"
for GitHub's own actions (checkout/setup-node/setup-python/deploy-pages); GitHub auto-forces
them to Node 24. Clears when those actions ship Node 24 majors — nothing for us to change now.

## Website enrichment — long-tail fallback (deferred; decision pending)

`campfinder enrich` (Wikipedia infobox) filled **91** councils this pass; **95/235**
now have a website. The remaining **140** cannot be resolved from Wikipedia. Across all
235 councils the MediaWiki lookup breaks down as ~92 with an infobox website, 128 whose
name redirects to a `Scouting in <State>` overview (its site is the state program's, not
the council's — correctly skipped), 6 with no article, and 9 with an article but no
`website` field.

Next step: pick a fallback source for the ~140 unresolved official council sites.
- Option A — keyed search API (Brave / Bing / SerpAPI): reproducible in-pipeline fallback;
  needs an API key. Best if enrichment must re-run annually unattended.
- Option B — Scouting America Local Council Locator: authoritative but Cloudflare-gated,
  no public JSON API found (2026-07).
- Option C — one-time assisted curation with `method=community` provenance; fast, not
  reproducible.

Key file: `pipeline/campfinder/enrich.py`. Unblocked by: a source decision.

## Next pipeline passes

- **Black Pug scraper — DONE (0.4.0).** `campfinder scrape`/`merge` off scoutingevent.com;
  14 camps / 51 sessions merged across 8 non-demo councils. Follow-ups:
  - **Fees**: DONE (0.7.0) — `ses.myPricing` POST to `/Ajax/SES` (needs `orgKey=BSA<nnn>`)
    fills youth/adult regular prices; 66/67 scraped sessions priced. Remaining: 1 session
    with no Youth category resolved null; part-time/sibling tiers ignored (regular price only).
  - **Name cleanup**: some events keep council-specific prefixes (e.g. MO council 358's
    "Summer Camp-Famous Eagle"); a curation/LLM pass could canonicalize to "Camp Famous Eagle".
  - **Coverage ramp**: 5 blackpug councils returned 0 (no open resident events / different
    landing); the 4 curated demo councils (492/606/609/697) were excluded from merge to
    protect the hand-authored frontend fixtures — revisit once real data should replace demo.
  - **Merge precedence**: when a future scrape supersedes a *curated* camp, `merge._merge_camp`
    replaces `website_url` (with the scoutingevent URL) and `features` wholesale. Add
    method/authority precedence before scrapes overlap curated camps (demo councils are
    excluded today, so not yet exercised).
- **Doubleknot — handled via Black Pug routing (0.6.0).** Most "doubleknot" councils are
  doubleknot.com CMS but register on scoutingevent.com; scrape now routes them to
  BlackPugScraper (got Camp Horseshoe/539, Camp Yawgoog/546). Remaining: (a) genuine
  Doubleknot-registration councils (e.g. Three Harbors/636) whose event pages are
  JS-rendered — would need a headless renderer; deferred. (b) reclassify these councils'
  `platform` to blackpug via `detect --overwrite` (scoutingevent.com signature now added).
  (c) name cleanup: strip "Long-term Camp" suffix (Camp Horseshoe). LLM long-tail — §6.3.
- CI: **`deploy.yml` DONE (0.5.0)** — GitHub Pages project site at
  `https://sethmay.github.io/camp-finder/` (enable once: Settings -> Pages -> Source =
  GitHub Actions). Still TODO: **`refresh.yml`** scheduled scrape -> PR on data diff (§10).
