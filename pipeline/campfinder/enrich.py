"""Resolve council official websites from Wikipedia infoboxes (IMPLEMENTATION.md §5.2).

The registry pass (``registry.py``) leaves ``council.website`` null. This pass fills it
so the platform-detect pass and scrapers have a real URL to target. Source is each
council's English Wikipedia article infobox (``| website = ...``), fetched in batches via
the MediaWiki API — no key, redirect-resolving.

Councils whose name redirects to a state-overview article (``Scouting in <State>``) are
skipped: that article's infobox website is the state program's, not the council's.
"""

from __future__ import annotations

import re

import httpx
from pydantic import HttpUrl, TypeAdapter, ValidationError

from . import config
from .io import load_all_councils, save_council

WIKI_API = "https://en.wikipedia.org/w/api.php"
_BATCH = 50  # MediaWiki allows up to 50 titles per query

# Infobox website patterns, tried in order. Group 1 is the URL (scheme optional).
_WEBSITE_RE: tuple[re.Pattern[str], ...] = (
    re.compile(r"\|\s*website\s*=\s*\{\{\s*URL\s*\|\s*(?:1\s*=\s*)?([^\}\|\s]+)", re.I),
    re.compile(r"\|\s*website\s*=\s*\[\s*(https?://[^\s\]]+)", re.I),
    re.compile(r"\|\s*website\s*=\s*(https?://[^\s\|\}]+)", re.I),
    re.compile(r"\|\s*(?:url|homepage)\s*=\s*\{\{\s*URL\s*\|\s*(?:1\s*=\s*)?([^\}\|\s]+)", re.I),
)

_URL_ADAPTER = TypeAdapter(HttpUrl)


def normalize_url(raw: str) -> HttpUrl | None:
    """Trim wiki markup residue, add a scheme if missing, validate as HttpUrl."""
    raw = raw.strip().strip("|}]").strip()
    if not raw:
        return None
    if not raw.startswith(("http://", "https://")):
        raw = "https://" + raw
    try:
        return _URL_ADAPTER.validate_python(raw)
    except ValidationError:
        return None


def parse_infobox_website(wikitext: str) -> HttpUrl | None:
    """Extract the first infobox website URL from article wikitext. Pure — testable."""
    for rx in _WEBSITE_RE:
        m = rx.search(wikitext)
        if m:
            url = normalize_url(m.group(1))
            if url:
                return url
    return None


def _is_state_overview(title: str) -> bool:
    """Redirect targets that are NOT a single council's article."""
    return title.startswith("Scouting in ") or title.startswith("List of councils")


def _query(client: httpx.Client, titles: list[str]) -> dict:
    r = client.get(
        WIKI_API,
        params={
            "action": "query",
            "prop": "revisions",
            "rvslots": "main",
            "rvprop": "content",
            "titles": "|".join(titles),
            "redirects": "1",
            "format": "json",
            "formatversion": "2",
        },
        timeout=config.HTTP_TIMEOUT_S,
    )
    r.raise_for_status()
    return r.json()


def _extract_chunk(requested: list[str], data: dict) -> dict[str, HttpUrl]:
    """Map each requested council name to its infobox website (when resolvable)."""
    q = data.get("query", {})
    normalized = {n["from"]: n["to"] for n in q.get("normalized", [])}
    redirects = {r["from"]: r["to"] for r in q.get("redirects", [])}
    pages = {p["title"]: p for p in q.get("pages", [])}

    out: dict[str, HttpUrl] = {}
    for name in requested:
        title = normalized.get(name, name)
        final = redirects.get(title, title)
        if _is_state_overview(final):
            continue
        page = pages.get(final)
        if not page or page.get("missing") or not page.get("revisions"):
            continue
        wikitext = page["revisions"][0]["slots"]["main"]["content"]
        url = parse_infobox_website(wikitext)
        if url:
            out[name] = url
    return out


def fetch_websites(names: list[str], client: httpx.Client | None = None) -> dict[str, HttpUrl]:
    """Resolve ``{council_name: website}`` from Wikipedia infoboxes, batched."""
    owns = client is None
    client = client or httpx.Client(headers={"User-Agent": config.USER_AGENT})
    out: dict[str, HttpUrl] = {}
    try:
        for i in range(0, len(names), _BATCH):
            out.update(_extract_chunk(names[i : i + _BATCH], _query(client, names[i : i + _BATCH])))
    finally:
        if owns:
            client.close()
    return out


def enrich(overwrite: bool = False) -> int:
    """Fill missing ``council.website`` from Wikipedia. Returns the number filled."""
    targets = [c for c in load_all_councils() if overwrite or not c.website]
    resolved = fetch_websites([c.name for c in targets])
    filled = 0
    for council in targets:
        url = resolved.get(council.name)
        if url is not None:
            council.website = url
            save_council(council)
            filled += 1
    return filled
