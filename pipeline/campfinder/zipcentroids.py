"""Build ``web/public/data/zip-centroids.json`` from the US Census ZCTA gazetteer.

The frontend resolves a ZIP to an origin centroid for the distance filter (§8.3). Ships the
full national dataset (~33k ZIP Code Tabulation Areas) compacted to ``[zip, lat, lon]`` tuples.
Source: US Census 2023 gazetteer (public domain) — GEOID + internal point lat/lon.
"""

from __future__ import annotations

import io
import json
import zipfile

import httpx

from . import config

GAZETTEER_URL = (
    "https://www2.census.gov/geo/docs/maps-data/data/gazetteer/"
    "2023_Gazetteer/2023_Gaz_zcta_national.zip"
)


def parse_gazetteer(text: str) -> list[tuple[str, float, float]]:
    """Parse the tab-delimited gazetteer into sorted ``(zip, lat, lon)``. Pure — testable.

    Columns: GEOID, ALAND, AWATER, ALAND_SQMI, AWATER_SQMI, INTPTLAT, INTPTLONG.
    """
    rows: list[tuple[str, float, float]] = []
    for line in text.splitlines()[1:]:  # skip header
        parts = line.split("\t")
        if len(parts) < 7:
            continue
        zip_code = parts[0].strip()
        if len(zip_code) != 5 or not zip_code.isdigit():
            continue
        try:
            lat = round(float(parts[5].strip()), 4)
            lon = round(float(parts[6].strip()), 4)
        except ValueError:
            continue
        rows.append((zip_code, lat, lon))
    rows.sort()
    return rows


def fetch_rows(client: httpx.Client | None = None) -> list[tuple[str, float, float]]:
    owns = client is None
    client = client or httpx.Client(
        headers={"User-Agent": config.USER_AGENT}, follow_redirects=True
    )
    try:
        resp = client.get(GAZETTEER_URL, timeout=120.0)
        resp.raise_for_status()
        archive = zipfile.ZipFile(io.BytesIO(resp.content))
        raw = archive.read(archive.namelist()[0]).decode("latin-1")
    finally:
        if owns:
            client.close()
    return parse_gazetteer(raw)


def build(rows: list[tuple[str, float, float]] | None = None) -> int:
    """Write the compacted zip-centroids.json. Returns the ZIP count."""
    rows = rows if rows is not None else fetch_rows()
    payload = {
        "format": "[zip,lat,lon]",
        "note": "US ZIP (ZCTA) centroids, US Census 2023 gazetteer (public domain).",
        "zips": [[z, lat, lon] for z, lat, lon in rows],
    }
    config.WEB_DATA_DIR.mkdir(parents=True, exist_ok=True)
    out = config.WEB_DATA_DIR / "zip-centroids.json"
    out.write_text(json.dumps(payload, separators=(",", ":")) + "\n", encoding="utf-8")
    return len(rows)
