"""Classify a council's registration platform from its website (IMPLEMENTATION.md §6).

Fetches the council homepage and scans HTML + outbound links for signatures of the known
registration platforms. Cheap heuristic used to route each council to the right scraper.
"""

from __future__ import annotations

import httpx

from . import config
from .models import Platform

# host/text signatures -> platform
_SIGNATURES: tuple[tuple[str, Platform], ...] = (
    ("247scouting.com", Platform.blackpug),
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


def detect(website: str) -> Platform:
    """Best-effort platform detection for a council website URL."""
    try:
        with httpx.Client(follow_redirects=True, headers={"User-Agent": config.USER_AGENT}) as c:
            r = c.get(website, timeout=config.HTTP_TIMEOUT_S)
            r.raise_for_status()
            return detect_from_html(r.text)
    except httpx.HTTPError:
        return Platform.unknown
