"""Black Pug / scoutingevent.com scraper (IMPLEMENTATION.md §6.1).

Black Pug runs council registration at ``scoutingevent.com``:

* ``scoutingevent.com/<NNN>``            council event landing (event list)
* ``scoutingevent.com/<NNN>-<eventid>``  one event, with 1+ session instances

Each resident-camp event page lists weekly session instances; every instance carries
a date range, map coordinates, and a location address in the page text. Fees load via a
separate JS POST and are NOT scraped here (left ``None`` = unknown; see TODO.md).

Resident-camp filtering is structural: an event is kept only if it has a multi-night
session (day camps, trainings, and meetings are single-day), after a loose name pre-filter.
"""

from __future__ import annotations

import re
from datetime import date

import httpx
from selectolax.parser import HTMLParser

from .. import config
from ..models import Camp, Method, Provenance, Session
from ..registry import STATE_TO_CODE
from .base import Scraper

EVENT_BASE = "https://scoutingevent.com"
_MIN_RESIDENT_NIGHTS = 2  # a resident session spans multiple nights

_COORDS_RE = re.compile(r"^\s*(-?\d+\.\d+),\s*(-?\d+\.\d+)")
_DATE_RANGE_RE = re.compile(
    r"\b\w+day\s+(\d{2})-(\d{2})-(\d{4}).*?\bto\s+\w+day\s+(\d{2})-(\d{2})-(\d{4})",
    re.S,
)
_ADDR_STATE_RE = re.compile(r",\s*([A-Za-z][A-Za-z .]+?)\s+\d{5}(?:-\d{4})?\b")
_YEAR_PREFIX_RE = re.compile(r"^\s*(?:19|20)\d{2}\s+")
_YEAR_SUFFIX_RE = re.compile(r"\s*\b(?:19|20)\d{2}\b\s*$")
_NOISE_SUFFIX_RE = re.compile(
    r"\s*(?:[-\u2013\u2014]\s*)?"
    r"(?:scouts?\s+bsa|scouting\s+america|bsa|summer\s+camp|resident\s+camp)\s*$",
    re.I,
)
# session labels that are NOT Scouts BSA resident weeks (v1 scope)
_SESSION_DENY = ("cub", "webelos", "family", "leader", "adult", "staff", "volunteer", "attachment")


def _flatten(html: str) -> str:
    """Visible text as a single whitespace-normalized run (scripts/styles stripped)."""
    no_scripts = re.sub(r"<(script|style)\b[^>]*>.*?</\1>", " ", html, flags=re.I | re.S)
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", no_scripts)).strip()


def kebab(name: str) -> str:
    return re.sub(r"-+", "-", re.sub(r"[^a-z0-9]+", "-", name.lower())).strip("-")


def normalize_camp_name(title: str) -> str:
    """`'Cascade Pacific Council - Camp Baldwin - Summer Camp Scouts BSA'` -> `'Camp Baldwin'`."""
    name = title.split(" - ", 1)[-1].strip() if " - " in title else title.strip()
    name = _YEAR_PREFIX_RE.sub("", name)
    name = _YEAR_SUFFIX_RE.sub("", name)
    prev = None
    while prev != name:  # peel stacked trailing noise ("... - Summer Camp Scouts BSA")
        prev = name
        name = _NOISE_SUFFIX_RE.sub("", name).strip(" -\u2013\u2014")
    if name.isupper():
        name = name.title()
    return name.strip()


def _looks_like_camp(text: str) -> bool:
    low = text.lower()
    if "read more" in low or not low.strip():
        return False
    if any(bad in low for bad in config.EXCLUDE_KEYWORDS):
        return False
    return any(kw in low for kw in ("camp", "reservation", "summer"))


def discover_event_urls(landing_html: str, council_number: int) -> list[str]:
    """Absolute event URLs on a council landing page that name a plausible camp."""
    num = f"{council_number:03d}"
    href_re = re.compile(rf"^/{num}-[A-Za-z0-9]+$")
    tree = HTMLParser(landing_html)
    urls: list[str] = []
    seen: set[str] = set()
    for a in tree.css("a[href]"):
        href = (a.attributes.get("href") or "").split("?")[0]
        if not href_re.match(href) or not _looks_like_camp(a.text(strip=True)):
            continue
        url = EVENT_BASE + href
        if url not in seen:
            seen.add(url)
            urls.append(url)
    return urls


_STATE_CODES = set(STATE_TO_CODE.values())


def _address_state(address: str, fallback: str) -> str:
    m = _ADDR_STATE_RE.search(address)
    if m:
        raw = m.group(1).strip()
        code = STATE_TO_CODE.get(raw)  # full name -> code
        if code:
            return code
        if raw.upper() in _STATE_CODES:  # already a USPS code
            return raw.upper()
    return fallback


def parse_event_page(html: str, url: str, council_id: str, council_state: str) -> Camp | None:
    """Parse one scoutingevent.com event page into a resident-camp ``Camp`` candidate.

    Returns ``None`` if the event has no multi-night session (i.e. not a resident camp).
    """
    tree = HTMLParser(html)
    title_node = tree.css_first("title")
    if title_node is None:
        return None
    name = normalize_camp_name(title_node.text(strip=True))
    if not name:
        return None

    verified = date.today()
    text = _flatten(html)
    camp_id = f"{council_state.lower()}-{kebab(name)}"

    sessions: list[Session] = []
    lat = lon = None
    address: str | None = None
    seen_ids: set[str] = set()
    for chunk in text.split("Coords:")[1:]:
        cm = _COORDS_RE.match(chunk)
        dm = _DATE_RANGE_RE.search(chunk)
        if not cm or not dm:
            continue
        label = chunk[cm.end() : dm.start()].lower()
        if any(bad in label for bad in _SESSION_DENY):
            continue  # cub / family / leader / staff session -> not Scouts BSA resident
        sm, sd, sy, em, ed, ey = dm.groups()
        try:
            start = date(int(sy), int(sm), int(sd))
            end = date(int(ey), int(em), int(ed))
        except ValueError:
            continue
        if (end - start).days < _MIN_RESIDENT_NIGHTS:
            continue  # single-day -> not a resident session
        if lat is None:
            lat, lon = float(cm.group(1)), float(cm.group(2))
            address = (
                chunk[cm.end() :].split(" Phone:")[0].split(" Registration")[0].strip() or None
            )
        sid = f"{camp_id}-{start.isoformat()}"
        if sid in seen_ids:
            continue
        seen_ids.add(sid)
        sessions.append(
            Session(
                id=sid,
                camp_id=camp_id,
                year=start.year,
                start_date=start,
                end_date=end,
                registration_url=url,
                provenance=Provenance(source_url=url, method=Method.blackpug, verified_at=verified),
            )
        )

    if not sessions:
        return None

    sessions.sort(key=lambda s: s.start_date)

    camp_state = _address_state(address or "", council_state)
    camp_id = f"{camp_state.lower()}-{kebab(name)}"
    if camp_state != council_state:  # state changed -> re-key camp + sessions
        sessions = [
            s.model_copy(update={"camp_id": camp_id, "id": f"{camp_id}-{s.start_date.isoformat()}"})
            for s in sessions
        ]

    return Camp(
        id=camp_id,
        name=name,
        council_id=council_id,
        state=camp_state,
        lat=lat,
        lon=lon,
        address=address,
        website_url=url,
        sessions=sessions,
        provenance=Provenance(source_url=url, method=Method.blackpug, verified_at=verified),
    )


class BlackPugScraper(Scraper):
    """Scrapes resident-camp events for a Black Pug council off scoutingevent.com."""

    method = Method.blackpug

    def scrape(self, council: object) -> list[Camp]:
        number = getattr(council, "number", None)
        if number is None:
            return []
        landing = self.get(f"{EVENT_BASE}/{number:03d}")
        by_id: dict[str, Camp] = {}
        for url in discover_event_urls(landing.text, number):
            try:
                page = self.get(url)
            except (httpx.HTTPError, PermissionError):
                continue  # one unreachable/disallowed event must not abort the council
            try:
                camp = parse_event_page(page.text, url, council.id, council.state)
            except ValueError:
                continue  # anomalous page (bad dates/coords -> ValidationError) must not abort
            if camp is None:
                continue
            existing = by_id.get(camp.id)
            if existing is None:
                by_id[camp.id] = camp
            else:
                # Two events map to one camp (e.g. separate week groupings): fold sessions in.
                # First-seen event wins camp-level fields (same id => same state; conflicts unobserved).
                seen = {s.id for s in existing.sessions}
                existing.sessions.extend(s for s in camp.sessions if s.id not in seen)
                existing.sessions.sort(key=lambda s: s.start_date)
        return list(by_id.values())
