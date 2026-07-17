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

- **Black Pug scraper — IMPLEMENTATION.md §6.1 (next).** Platform detect classified 39/95
  councils (blackpug 15, doubleknot 8, tentaroo 15, other 1; 56 unknown). blackpug + tentaroo
  (tentaroo migrates to Black Pug by Oct 2026) = 30/39 of classified councils, confirming
  Black Pug as the platform to scrape first. 15 councils are ready targets today.
- Deepen detect coverage later: 56 councils with a website still `unknown` (registration
  behind JS, or >1 click deep, or on an unlinked subdomain); 140 have no website yet.
- Doubleknot scraper + LLM long-tail extractor with review queue — §6.2, §6.3.
- CI: `deploy.yml` (GitHub Pages project site at `sethmay.github.io/camp-finder/`,
  needs Astro `site` + `base: '/camp-finder'`) and `refresh.yml` — §10.
