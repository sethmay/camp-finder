# Lessons

Curated, durable, project-specific engineering lessons. Read before similar work.
Distilled from `code-reviewer` output; dedupe and fold, don't append blindly.

## Data pipeline

- **Enrichment/registry passes MUST be idempotent and non-clobbering.** Default to filling
  only empty fields; gate destructive refills behind an explicit `--overwrite`; never wipe
  an existing value when the source fails to re-resolve; route every write through
  `io.save_council` (the canonical writer) so diffs stay minimal. Established in
  `registry.py`, followed by `enrich.py`.

- **MediaWiki/Wikipedia passes belong to the `registry.py` family, not `base.Scraper`.**
  Single trusted endpoint, batched (≤50 titles), `redirects=1`, `formatversion=2`,
  User-Agent + timeout from `config.py`. The §6 scraper etiquette (robots.txt, ≥1s
  rate-limit, 3× retry+backoff) is written for long-tail council-site scrapers and applies
  to these passes only by analogy — don't treat its absence as a defect here, but DO add
  retry/backoff if a pass ever runs unattended (annual refresh cron).

- **Wikipedia title resolution order is fixed: normalized (`from`→`to`) → redirects
  (`from`→`to`) → page lookup by final title.** Any resolver must follow that order and
  guard non-council redirect targets. Today only `Scouting in <State>` and
  `List of councils` are excluded; broader-org / cross-council redirects still pass and
  would adopt a wrong URL — widen the guard if such a case appears.

## Data safety / security

- **URLs entering the dataset from an externally-editable source (Wikipedia infobox) are
  validated only as pydantic `HttpUrl`**, which permits internal/loopback hosts. Anything
  that later fetches a stored `website`/`*_url` with `follow_redirects=True`
  (e.g. `platform_detect.py`) inherits a low-grade SSRF surface. Add a host sanity check
  if a pass fetches these URLs from a non-operator context.

## Docs / process

- **Keep `CHANGELOG.md` / `TODO.md` coverage counts derivable from the committed tree, not
  from a run's printed tally.** A run prints "filled N", but "N/235 have a website" must be
  counted from `data/councils/*.json` at the reviewed rev, and the filled + remaining
  figures must sum to 235. Pre-set fixtures make the run tally and the tree total differ.
