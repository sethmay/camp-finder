# TODO

Active queue and deferred work. Write each item to survive a clean context.

## Website enrichment — long-tail fallback (deferred; decision pending)

`campfinder enrich` (Wikipedia infobox) covers **92/235** councils. The remaining
**143** cannot be resolved from Wikipedia:

- 128 councils have no dedicated article — the name redirects to a `Scouting in <State>`
  overview whose website is the state program's, not the council's (correctly skipped).
- 6 have no article at all; 9 have an article but no `website` infobox field.

Next step: pick a fallback source for the ~143 official council sites.
- Option A — keyed search API (Brave / Bing / SerpAPI): reproducible in-pipeline fallback;
  needs an API key. Best if enrichment must re-run annually unattended.
- Option B — Scouting America Local Council Locator: authoritative but Cloudflare-gated,
  no public JSON API found (2026-07).
- Option C — one-time assisted curation with `method=community` provenance; fast, not
  reproducible.

Key file: `pipeline/campfinder/enrich.py`. Unblocked by: a source decision.

## Next pipeline passes

- `campfinder detect --council all` — classify registration platform for the 92 enriched
  councils (blackpug / doubleknot / tentaroo / other). Ready to run now.
- Black Pug scraper — IMPLEMENTATION.md §6.1.
- Doubleknot scraper + LLM long-tail extractor with review queue — §6.2, §6.3.
- CI: `deploy.yml` (GitHub Pages project site at `sethmay.github.io/camp-finder/`,
  needs Astro `site` + `base: '/camp-finder'`) and `refresh.yml` — §10.
