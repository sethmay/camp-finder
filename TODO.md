# TODO

Active queue and deferred work. Write each item to survive a clean context.

## UI refinement (deferred) — live at https://sethmay.github.io/camp-finder/

Site is deployed and clean; polish pass tabled. Observed so far:
- **Map overlay clips at the top-left** — stray "…not posted / view details →" text bleeds
  over the map's top-left corner on load (likely a marker popup / mini-CampCard positioned
  at the origin, or z-index/overflow). See `web/src/components/MapView.tsx`.
- General design polish: result-card spacing, "Fee not posted" treatment, filter rail
  rhythm — review against the design spec (`.claude/handoffs/website_design/`).
- Confirm map basemap renders on the live site (openfreemap.org tiles; showed an
  intermittent abort under headless test) — swap tile source in `web/src/lib/map.ts` if flaky.

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
  - **Fees**: not scraped — Black Pug loads pricing via a JS `ses.myPricing` POST
    (`/Ajax/SES`) returning an HTML modal; reverse-engineer it to fill `fee_youth`/`fee_adult`.
  - **Name cleanup**: some events keep council-specific prefixes (e.g. MO council 358's
    "Summer Camp-Famous Eagle"); a curation/LLM pass could canonicalize to "Camp Famous Eagle".
  - **Coverage ramp**: 5 blackpug councils returned 0 (no open resident events / different
    landing); the 4 curated demo councils (492/606/609/697) were excluded from merge to
    protect the hand-authored frontend fixtures — revisit once real data should replace demo.
  - **Merge precedence**: when a future scrape supersedes a *curated* camp, `merge._merge_camp`
    replaces `website_url` (with the scoutingevent URL) and `features` wholesale. Add
    method/authority precedence before scrapes overlap curated camps (demo councils are
    excluded today, so not yet exercised).
- Doubleknot scraper + LLM long-tail extractor with review queue — §6.2, §6.3.
- CI: **`deploy.yml` DONE (0.5.0)** — GitHub Pages project site at
  `https://sethmay.github.io/camp-finder/` (enable once: Settings -> Pages -> Source =
  GitHub Actions). Still TODO: **`refresh.yml`** scheduled scrape -> PR on data diff (§10).
