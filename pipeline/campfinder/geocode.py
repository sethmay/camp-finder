"""Address -> (lat, lon) geocoding with an on-disk cache.

Primary: US Census Geocoder (free, no key). Fallback: OpenStreetMap Nominatim
(1 req/sec, descriptive UA). Results cache to ``data/.cache/geocode.json`` so reruns are
free and offline for already-seen addresses.
"""

from __future__ import annotations

import json
import time

import httpx

from . import config

_CACHE: dict[str, list[float] | None] | None = None


def _cache_file():
    return config.CACHE_DIR / "geocode.json"


def _load_cache() -> dict[str, list[float] | None]:
    global _CACHE
    if _CACHE is None:
        f = _cache_file()
        _CACHE = json.loads(f.read_text(encoding="utf-8")) if f.exists() else {}
    return _CACHE


def _save_cache() -> None:
    config.CACHE_DIR.mkdir(parents=True, exist_ok=True)
    _cache_file().write_text(json.dumps(_load_cache(), indent=2, sort_keys=True), encoding="utf-8")


def _census(address: str, client: httpx.Client) -> tuple[float, float] | None:
    r = client.get(
        "https://geocoding.geo.census.gov/geocoder/locations/onelineaddress",
        params={"address": address, "benchmark": "Public_AR_Current", "format": "json"},
        timeout=config.HTTP_TIMEOUT_S,
    )
    r.raise_for_status()
    matches = r.json().get("result", {}).get("addressMatches", [])
    if matches:
        c = matches[0]["coordinates"]
        return (float(c["y"]), float(c["x"]))
    return None


def _nominatim(address: str, client: httpx.Client) -> tuple[float, float] | None:
    time.sleep(config.MIN_REQUEST_INTERVAL_S)
    r = client.get(
        "https://nominatim.openstreetmap.org/search",
        params={"q": address, "format": "json", "limit": 1, "countrycodes": "us"},
        headers={"User-Agent": config.USER_AGENT},
        timeout=config.HTTP_TIMEOUT_S,
    )
    r.raise_for_status()
    data = r.json()
    if data:
        return (float(data[0]["lat"]), float(data[0]["lon"]))
    return None


def geocode(address: str) -> tuple[float, float] | None:
    """Return (lat, lon) for an address, or None. Cached across runs."""
    cache = _load_cache()
    if address in cache:
        val = cache[address]
        return tuple(val) if val else None

    result: tuple[float, float] | None = None
    with httpx.Client() as client:
        try:
            result = _census(address, client)
            if result is None:
                result = _nominatim(address, client)
        except httpx.HTTPError:
            result = None

    cache[address] = list(result) if result else None
    _save_cache()
    return result
