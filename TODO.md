# TODO

Active queue and deferred work. Write each item to survive a clean context.

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
- Doubleknot scraper + LLM long-tail extractor with review queue — §6.2, §6.3.
- CI: `deploy.yml` (GitHub Pages project site at `sethmay.github.io/camp-finder/`,
  needs Astro `site` + `base: '/camp-finder'`) and `refresh.yml` — §10.
