"""Reconcile council platform from Black Pug's global index (scoutingevent.com).

`scoutingevent.com/indexMap.php` server-renders every council as a ``createMarker(...)``
call carrying an authoritative orgKey, a **managed** flag (does the council actually
register on Black Pug), the council website, and HQ coordinates. The managed flag is a
far more reliable Black Pug signal than the homepage-HTML `detect` heuristic, so we use
it to route more councils to the (working) Black Pug scraper.

Conservative by design:
- Only **upgrade** ``unknown``/``other`` councils to ``blackpug`` (never downgrade, so a
  council we already scrape is untouched).
- **Skip ``tentaroo`` councils** even when managed: they already carry agent-extracted
  camps, and re-scraping them via Black Pug would duplicate camps until a precedence
  reconciliation exists (deferred; reported to the review file).
- **Never auto-changes websites** - the index's URLs are sometimes older than our curated
  seed (e.g. a pre-merger council name), so discrepancies are only reported for review.
"""

from __future__ import annotations

import re
from urllib.parse import urlsplit

import httpx

from . import config
from .io import load_all_councils, save_council
from .models import Platform

INDEX_URL = "https://scoutingevent.com/indexMap.php"
NATIONAL_ID = "council-999"  # BSA national HQ, not a local resident-camp council

# createMarker('lat','lon','name',campID,managed,'orgKey','council','website','default')
# name/council/website may contain escaped quotes (e.g. Patriots\' Path).
_MARKER_RE = re.compile(
    r"createMarker\("
    r"'([^']*)',\s*"  # lat
    r"'([^']*)',\s*"  # lon
    r"'(?:[^'\\]|\\.)*',\s*"  # name (unused)
    r"\d+,\s*"  # campID
    r"(\d+),\s*"  # managed
    r"'(BSA\d+)',\s*"  # orgKey
    r"'(?:[^'\\]|\\.)*',\s*"  # council (unused)
    r"'([^']*)'"  # website
)


def parse_index(html: str) -> dict[int, dict]:
    """Map council ``number`` -> ``{managed, website}`` from the Global index HTML. Pure."""
    out: dict[int, dict] = {}
    for lat, lon, managed, org_key, website in _MARKER_RE.findall(html):
        m = re.match(r"BSA(\d+)", org_key)
        if not m:
            continue
        out[int(m.group(1))] = {"managed": managed == "1", "website": website}
    return out


def fetch_index(client: httpx.Client | None = None) -> dict[int, dict]:
    owns = client is None
    client = client or httpx.Client(
        headers={"User-Agent": config.USER_AGENT},
        follow_redirects=True,
        timeout=config.HTTP_TIMEOUT_S,
    )
    try:
        r = client.get(INDEX_URL)
        r.raise_for_status()
        return parse_index(r.text)
    finally:
        if owns:
            client.close()


def _host(url: str) -> str:
    try:
        return (
            urlsplit(url if url.startswith("http") else "http://" + url)
            .netloc.replace("www.", "")
            .lower()
        )
    except ValueError:
        return (url or "").lower()


def sync(client: httpx.Client | None = None) -> dict:
    """Upgrade ``unknown``/``other`` managed councils to ``blackpug``; report the rest.

    Returns counts and writes a review file (reclassified, website diffs, deferred tentaroo).
    """
    idx = fetch_index(client)
    reclassified: list[tuple[str, str]] = []
    website_diffs: list[tuple[str, str, str, str]] = []
    deferred_tentaroo: list[tuple[str, str]] = []

    for council in load_all_councils():
        n = council.number
        if n is None or n not in idx:
            continue
        row = idx[n]
        if (
            council.website
            and row["website"]
            and _host(str(council.website)) != _host(row["website"])
        ):
            website_diffs.append((council.id, council.name, str(council.website), row["website"]))
        if not row["managed"] or council.id == NATIONAL_ID:
            continue
        if council.platform is Platform.tentaroo:
            deferred_tentaroo.append((council.id, council.name))
            continue
        if council.platform in (Platform.unknown, Platform.other):
            council.platform = Platform.blackpug
            save_council(council)
            reclassified.append((council.id, council.name))

    _write_review(reclassified, website_diffs, deferred_tentaroo)
    return {
        "managed": sum(1 for r in idx.values() if r["managed"]),
        "reclassified": len(reclassified),
        "website_diffs": len(website_diffs),
        "deferred_tentaroo": len(deferred_tentaroo),
    }


def _write_review(
    reclassified: list[tuple[str, str]],
    website_diffs: list[tuple[str, str, str, str]],
    deferred_tentaroo: list[tuple[str, str]],
) -> None:
    lines = [
        "# Black Pug Global index sync (scoutingevent.com/indexMap.php)",
        "",
        f"Reclassified **{len(reclassified)}** unknown/other councils -> `blackpug` (managed on Black Pug):",
        "",
    ]
    lines += [f"- {cid} {name}" for cid, name in sorted(reclassified)] or ["- (none)"]
    lines += [
        "",
        "## Deferred: tentaroo councils that are managed on Black Pug",
        "",
        "These register on Black Pug but already carry agent-extracted camps. Re-scrape via Black",
        "Pug and let it supersede the `llm_extraction` camps once a precedence reconciliation exists.",
        "",
    ]
    lines += [f"- {cid} {name}" for cid, name in sorted(deferred_tentaroo)] or ["- (none)"]
    lines += [
        "",
        f"## Website discrepancies vs the index ({len(website_diffs)}) - NOT auto-applied",
        "",
        "The index URL is sometimes older than our curated seed (e.g. a pre-merger council name),",
        "so these need per-case judgment. `ours` = current data, `index` = scoutingevent.com.",
        "",
        "| Council | ours | index |",
        "|---|---|---|",
    ]
    lines += [
        f"| {cid} {name} | {ours} | {theirs} |" for cid, name, ours, theirs in sorted(website_diffs)
    ]
    config.REVIEW_DIR.mkdir(parents=True, exist_ok=True)
    (config.REVIEW_DIR / "global-sync-2026-07-18.md").write_text(
        "\n".join(lines) + "\n", encoding="utf-8"
    )
