"""Classify a council's registration platform from its website (IMPLEMENTATION.md §6).

Fetches the council homepage and scans HTML + outbound links for signatures of the known
registration platforms. When the homepage itself carries no signature, follows a few
same-site links whose href/text hints at registration (camp / register / events / ...)
and scans those too — registration widgets usually live one click off the homepage. Cheap
heuristic used to route each council to the right scraper.
"""

from __future__ import annotations

import time
from urllib.parse import urljoin, urlparse

import httpx
from selectolax.parser import HTMLParser

from . import config
from .models import Platform

# host/text signatures -> platform
_SIGNATURES: tuple[tuple[str, Platform], ...] = (
    ("247scouting.com", Platform.blackpug),
    ("scoutingevent.com", Platform.blackpug),  # Black Pug's event domain (registration)
    ("blackpug", Platform.blackpug),
    ("doubleknot.com", Platform.doubleknot),
    ("tentaroo.com", Platform.tentaroo),
)


def detect_from_html(html: str) -> Platform:
    lowered = html.lower()
    for needle, platform in _SIGNATURES:
        if needle in lowered:
            return platform
    return Platform.unknown


def _registrable(host: str) -> str:
    """Coarse registrable domain: last two labels (``www.foo.org`` -> ``foo.org``)."""
    parts = host.lower().split(".")
    return ".".join(parts[-2:]) if len(parts) >= 2 else host.lower()


def extract_candidate_links(html: str, base_url: str) -> list[str]:
    """Same-site links hinting at registration, absolutized, deduped, capped.

    Cross-site platform links (e.g. a homepage anchor straight to ``247scouting.com``)
    are intentionally NOT returned here — ``detect_from_html`` already catches those in the
    homepage HTML. This crawls only *within* the council's own site to reach the page that
    embeds the platform.
    """
    base_host = urlparse(base_url).netloc
    tree = HTMLParser(html)
    out: list[str] = []
    seen: set[str] = set()
    for anchor in tree.css("a[href]"):
        href = anchor.attributes.get("href") or ""
        if not href or href.startswith(("#", "mailto:", "tel:", "javascript:")):
            continue
        text = anchor.text() or ""
        if not (
            config.PLATFORM_LINK_HINTS_RE.search(href) or config.PLATFORM_LINK_HINTS_RE.search(text)
        ):
            continue
        absolute = urljoin(base_url, href)
        parsed = urlparse(absolute)
        if parsed.scheme not in ("http", "https"):
            continue
        if _registrable(parsed.netloc) != _registrable(base_host):
            continue
        if absolute in seen:
            continue
        seen.add(absolute)
        out.append(absolute)
        if len(out) >= config.PLATFORM_MAX_CRAWL_LINKS:
            break
    return out


def detect(website: str, client: httpx.Client | None = None) -> Platform:
    """Best-effort platform detection for a council website URL.

    Pass ``client`` to reuse a session (and for offline testing); otherwise a short-lived
    redirect-following client is created and closed here.
    """
    owns = client is None
    client = client or httpx.Client(
        follow_redirects=True,
        headers={"User-Agent": config.USER_AGENT},
        timeout=config.HTTP_TIMEOUT_S,
    )
    try:
        home = client.get(str(website))
        home.raise_for_status()
        platform = detect_from_html(home.text)
        if platform is not Platform.unknown:
            return platform

        # Homepage had no signature — follow a few registration-hinted links.
        base_url = str(home.url)  # final URL after redirects, for relative resolution
        for link in extract_candidate_links(home.text, base_url):
            time.sleep(config.MIN_REQUEST_INTERVAL_S)  # polite: same host as the homepage
            try:
                page = client.get(link)
                page.raise_for_status()
            except httpx.HTTPError:
                continue
            platform = detect_from_html(page.text)
            if platform is not Platform.unknown:
                return platform
        return Platform.unknown
    except httpx.HTTPError:
        return Platform.unknown
    finally:
        if owns:
            client.close()
