"""Council registry builder (IMPLEMENTATION.md §5).

Parses the Wikipedia "List of councils (Scouting America)" table into council stubs
(``id, name, number, state, hq_city``) and writes one file per council under
``data/councils/``. Existing files are updated in place, **preserving hand-curated /
scraped ``camps``**. Websites are left unknown here; a later enrichment/detect pass fills
``website`` and ``platform``.
"""

from __future__ import annotations

import re

import httpx

from . import config
from .io import council_path, load_council, save_council
from .models import Council

WIKI_API = "https://en.wikipedia.org/w/api.php"
WIKI_PAGE = "List of councils (Scouting America)"

STATE_TO_CODE = {
    "Alabama": "AL", "Alaska": "AK", "Arizona": "AZ", "Arkansas": "AR",
    "California": "CA", "Colorado": "CO", "Connecticut": "CT", "Delaware": "DE",
    "District of Columbia": "DC", "Florida": "FL", "Georgia": "GA", "Hawaii": "HI",
    "Idaho": "ID", "Illinois": "IL", "Indiana": "IN", "Iowa": "IA", "Kansas": "KS",
    "Kentucky": "KY", "Louisiana": "LA", "Maine": "ME", "Maryland": "MD",
    "Massachusetts": "MA", "Michigan": "MI", "Minnesota": "MN", "Mississippi": "MS",
    "Missouri": "MO", "Montana": "MT", "Nebraska": "NE", "Nevada": "NV",
    "New Hampshire": "NH", "New Jersey": "NJ", "New Mexico": "NM", "New York": "NY",
    "North Carolina": "NC", "North Dakota": "ND", "Ohio": "OH", "Oklahoma": "OK",
    "Oregon": "OR", "Pennsylvania": "PA", "Rhode Island": "RI", "South Carolina": "SC",
    "South Dakota": "SD", "Tennessee": "TN", "Texas": "TX", "Utah": "UT",
    "Vermont": "VT", "Virginia": "VA", "Washington": "WA", "West Virginia": "WV",
    "Wisconsin": "WI", "Wyoming": "WY", "Puerto Rico": "PR", "Virgin Islands": "VI",
}


def _clean_wikilink(cell: str) -> str:
    """`[[A|B]]`->B, `[[A]]`->A, strip refs/templates/markup."""
    cell = re.sub(r"<ref[^>]*>.*?</ref>", "", cell, flags=re.DOTALL)
    cell = re.sub(r"<ref[^>]*/>", "", cell)

    def repl(m: re.Match) -> str:
        inner = m.group(1)
        return inner.split("|")[-1] if "|" in inner else inner

    cell = re.sub(r"\[\[([^\]]+)\]\]", repl, cell)
    cell = cell.replace("'''", "").replace("''", "")
    return cell.strip()


def parse_wikitext(wikitext: str) -> list[dict]:
    """Parse the councils wikitable into dicts. Pure — unit-testable without network."""
    start = wikitext.find('{| class="wikitable sortable"')
    if start == -1:
        start = wikitext.find("{|")
    end = wikitext.find("\n|}", start)
    table = wikitext[start:end if end != -1 else None]

    rows = table.split("\n|-")
    out: list[dict] = []
    for row in rows:
        row = row.strip()
        if not row or row.startswith("!") or "wikitable" in row:
            continue
        body = row[1:] if row.startswith("|") else row  # drop leading row pipe
        cells = [c.strip() for c in body.split("||")]
        if len(cells) < 4:
            continue
        num_txt = _clean_wikilink(cells[0])
        if not num_txt.isdigit():
            continue
        number = int(num_txt)
        name = _clean_wikilink(cells[1])
        hq_city = _clean_wikilink(cells[2]) or None
        state_name = _clean_wikilink(cells[3])
        code = STATE_TO_CODE.get(state_name)
        if not name or not code:
            continue
        out.append({"number": number, "name": name, "hq_city": hq_city, "state": code})
    return out


def fetch_wikitext(client: httpx.Client | None = None) -> str:
    owns = client is None
    client = client or httpx.Client(headers={"User-Agent": config.USER_AGENT})
    try:
        r = client.get(
            WIKI_API,
            params={"action": "parse", "page": WIKI_PAGE, "prop": "wikitext",
                    "format": "json", "formatversion": "2"},
            timeout=config.HTTP_TIMEOUT_S,
        )
        r.raise_for_status()
        return r.json()["parse"]["wikitext"]
    finally:
        if owns:
            client.close()


def build(records: list[dict] | None = None) -> int:
    """Create/update council stubs. Returns the number of councils written."""
    records = records if records is not None else parse_wikitext(fetch_wikitext())
    count = 0
    for rec in records:
        cid = f"council-{rec['number']:03d}"
        path = council_path(cid)
        if path.exists():
            council = load_council(path)  # preserve camps + any curated fields
            council.name = rec["name"]
            council.number = rec["number"]
            council.state = rec["state"]
            if rec["hq_city"]:
                council.hq_city = rec["hq_city"]
        else:
            council = Council(
                id=cid, name=rec["name"], number=rec["number"],
                state=rec["state"], hq_city=rec["hq_city"],
            )
        save_council(council)
        count += 1
    return count
