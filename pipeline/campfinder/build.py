"""Compile the canonical dataset into frontend-ready static JSON (IMPLEMENTATION.md §7.3).

``data/councils/*.json``  ->  ``web/public/data/camps.json`` + ``meta.json``

The output is deterministic (sorted keys) so committed build artifacts diff cleanly.
Camps are denormalized with their council name/website and a precomputed ``fee_from``.
Non-active camps with no upcoming session are dropped. ``verified_at`` is the newest
verification date across the camp and its sessions (drives the frontend stale badge).
"""

from __future__ import annotations

from datetime import date, datetime, timezone

from . import config
from .io import dumps_canonical, load_all_councils
from .models import Camp, Council


def upcoming_summer_year(today: date | None = None) -> int:
    """The summer season troops are currently shopping for.

    From September onward, next year's summer is the one being planned.
    """
    today = today or date.today()
    return today.year + 1 if today.month >= 9 else today.year


def _flatten_session(s) -> dict:
    return {
        "id": s.id,
        "year": s.year,
        "start_date": s.start_date.isoformat(),
        "end_date": s.end_date.isoformat(),
        "program_type": s.program_type.value,
        "fee_youth": s.fee_youth,
        "fee_adult": s.fee_adult,
        "fee_notes": s.fee_notes,
        "registration_url": str(s.registration_url) if s.registration_url else None,
        "availability": s.availability.value,
        "source_url": str(s.provenance.source_url),
        "verified_at": s.provenance.verified_at.isoformat(),
    }


def _newest_verified(camp: Camp) -> date:
    dates = [camp.provenance.verified_at] + [s.provenance.verified_at for s in camp.sessions]
    return max(dates)


def _min_fee_youth(camp: Camp) -> int | None:
    fees = [s.fee_youth for s in camp.sessions if s.fee_youth is not None]
    return min(fees) if fees else None


def _flatten_camp(council: Council, camp: Camp) -> dict:
    sessions = sorted(camp.sessions, key=lambda s: s.start_date)
    return {
        "id": camp.id,
        "name": camp.name,
        "council_id": council.id,
        "council_name": council.name,
        "council_website": str(council.website) if council.website else None,
        "council_platform": council.platform.value,
        "status": camp.status.value,
        "address": camp.address,
        "city": camp.city,
        "state": camp.state,
        "lat": camp.lat,
        "lon": camp.lon,
        "website_url": str(camp.website_url),
        "program_types": [p.value for p in camp.program_types],
        "features": [f.value for f in camp.features],
        "description": camp.description,
        "fee_from": _min_fee_youth(camp),
        "verified_at": _newest_verified(camp).isoformat(),
        "source_url": str(camp.provenance.source_url),
        "method": camp.provenance.method.value,
        "confidence": camp.provenance.confidence,
        "sessions": [_flatten_session(s) for s in sessions],
    }


def _include_camp(camp: Camp, min_year: int) -> bool:
    if camp.status.value == "closed":
        return False
    has_upcoming = any(s.year >= min_year for s in camp.sessions)
    if camp.status.value == "active":
        return True  # active properties are always listed
    # not_operating: only if it still has an upcoming session
    return has_upcoming


def build(today: date | None = None) -> dict:
    councils = load_all_councils()
    min_year = upcoming_summer_year(today)

    camps: list[dict] = []
    states: set[str] = set()
    for council in councils:
        for camp in council.camps:
            if not _include_camp(camp, min_year):
                continue
            camps.append(_flatten_camp(council, camp))
            states.add(camp.state)

    camps.sort(key=lambda c: c["id"])
    meta = {
        "build_time": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "upcoming_summer_year": min_year,
        "council_count": len(councils),
        "camp_count": len(camps),
        "session_count": sum(len(c["sessions"]) for c in camps),
        "states_covered": sorted(states),
        "dead_link_count": 0,
    }

    config.WEB_DATA_DIR.mkdir(parents=True, exist_ok=True)
    (config.WEB_DATA_DIR / "camps.json").write_text(dumps_canonical(camps), encoding="utf-8")
    (config.WEB_DATA_DIR / "meta.json").write_text(dumps_canonical(meta), encoding="utf-8")
    return meta
