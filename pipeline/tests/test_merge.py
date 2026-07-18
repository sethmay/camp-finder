"""Merge semantics (IMPLEMENTATION.md §7.2) — offline against a temp council tree."""

from datetime import date

import pytest

from campfinder import config, merge as merge_mod
from campfinder.io import council_path, load_council, save_council
from campfinder.models import Camp, Council, Method, Provenance, Session

URL = "https://scoutingevent.com/047-1"


def _prov(d: date, conf: float = 1.0) -> Provenance:
    return Provenance(source_url=URL, method=Method.blackpug, verified_at=d, confidence=conf)


def _session(camp_id: str, start: date, end: date, d: date, conf: float = 1.0) -> Session:
    return Session(
        id=f"{camp_id}-{start.isoformat()}",
        camp_id=camp_id,
        year=start.year,
        start_date=start,
        end_date=end,
        provenance=_prov(d, conf),
    )


def _camp(d: date, sessions=None, *, cid="ca-camp-x", description=None, lat=None, conf=1.0) -> Camp:
    return Camp(
        id=cid,
        name="Camp X",
        council_id="council-047",
        state="CA",
        lat=lat,
        description=description,
        website_url=URL,
        sessions=sessions or [],
        provenance=_prov(d, conf),
    )


@pytest.fixture
def council_dir(tmp_path, monkeypatch):
    monkeypatch.setattr(config, "COUNCILS_DIR", tmp_path)
    save_council(Council(id="council-047", name="Golden Empire", state="CA"))
    return tmp_path


def _reload() -> Council:
    return load_council(council_path("council-047"))


def test_adds_new_camp_and_sessions(council_dir):
    d = date(2026, 6, 1)
    cand = _camp(d, [_session("ca-camp-x", date(2026, 6, 21), date(2026, 6, 27), d)])
    stats = merge_mod.merge([cand])
    assert (stats.camps_added, stats.sessions_added) == (1, 1)
    council = _reload()
    assert len(council.camps) == 1 and len(council.camps[0].sessions) == 1


def test_adds_new_session_to_existing_camp(council_dir):
    old = date(2026, 1, 1)
    save_council(
        Council(
            id="council-047",
            name="Golden Empire",
            state="CA",
            camps=[_camp(old, [_session("ca-camp-x", date(2026, 6, 21), date(2026, 6, 27), old)])],
        )
    )
    new = date(2026, 6, 1)
    cand = _camp(new, [_session("ca-camp-x", date(2026, 7, 5), date(2026, 7, 11), new)])
    stats = merge_mod.merge([cand])
    assert stats.sessions_added == 1
    assert len(_reload().camps[0].sessions) == 2


def test_updates_session_only_when_newer(council_dir):
    old = date(2026, 1, 1)
    save_council(
        Council(
            id="council-047",
            name="Golden Empire",
            state="CA",
            camps=[_camp(old, [_session("ca-camp-x", date(2026, 6, 21), date(2026, 6, 27), old)])],
        )
    )
    # newer candidate with a corrected end_date -> updates
    newer = _session("ca-camp-x", date(2026, 6, 21), date(2026, 6, 28), date(2026, 6, 1))
    stats = merge_mod.merge([_camp(date(2026, 6, 1), [newer])])
    assert stats.sessions_updated == 1
    assert _reload().camps[0].sessions[0].end_date == date(2026, 6, 28)


def test_ignores_older_session(council_dir):
    recent = date(2026, 6, 1)
    save_council(
        Council(
            id="council-047",
            name="Golden Empire",
            state="CA",
            camps=[
                _camp(recent, [_session("ca-camp-x", date(2026, 6, 21), date(2026, 6, 27), recent)])
            ],
        )
    )
    stale = _session("ca-camp-x", date(2026, 6, 21), date(2026, 6, 30), date(2026, 1, 1))
    stats = merge_mod.merge([_camp(date(2026, 1, 1), [stale])])
    assert stats.sessions_updated == 0
    assert _reload().camps[0].sessions[0].end_date == date(2026, 6, 27)


def test_does_not_clobber_curated_field_with_none(council_dir):
    old = date(2026, 1, 1)
    save_council(
        Council(
            id="council-047",
            name="Golden Empire",
            state="CA",
            camps=[_camp(old, description="Curated blurb", lat=38.5)],
        )
    )
    # newer scrape supplies no description (None) and no lat
    merge_mod.merge([_camp(date(2026, 6, 1), description=None, lat=None)])
    camp = _reload().camps[0]
    assert camp.description == "Curated blurb"
    assert camp.lat == 38.5


def test_updates_camp_field_when_newer(council_dir):
    save_council(
        Council(
            id="council-047",
            name="Golden Empire",
            state="CA",
            camps=[_camp(date(2026, 1, 1), lat=None)],
        )
    )
    merge_mod.merge([_camp(date(2026, 6, 1), lat=38.5436)])
    assert _reload().camps[0].lat == 38.5436


def test_does_not_drop_camp_absent_from_scrape(council_dir):
    old = date(2026, 1, 1)
    save_council(
        Council(
            id="council-047",
            name="Golden Empire",
            state="CA",
            camps=[_camp(old, cid="ca-camp-x"), _camp(old, cid="ca-camp-y")],
        )
    )
    merge_mod.merge([_camp(date(2026, 6, 1), cid="ca-camp-x")])
    assert {c.id for c in _reload().camps} == {"ca-camp-x", "ca-camp-y"}


def test_merge_file_roundtrip(council_dir, tmp_path):
    d = date(2026, 6, 1)
    cand = _camp(d, [_session("ca-camp-x", date(2026, 6, 21), date(2026, 6, 27), d)])
    path = tmp_path / "cands.json"
    path.write_text(f"[{cand.model_dump_json()}]", encoding="utf-8")
    stats = merge_mod.merge_file(path)
    assert stats.camps_added == 1
    assert len(_reload().camps) == 1


def test_fills_empty_fee_even_when_not_newer(council_dir):
    # A later fee scrape (same verified_at, so not strictly newer) must still FILL a
    # previously-unknown fee — fill-empty is unconditional; only overwrites need recency.
    d = date(2026, 6, 1)
    save_council(
        Council(
            id="council-047",
            name="Golden Empire",
            state="CA",
            camps=[_camp(d, [_session("ca-camp-x", date(2026, 6, 21), date(2026, 6, 27), d)])],
        )
    )
    cand_session = _session("ca-camp-x", date(2026, 6, 21), date(2026, 6, 27), d)
    cand_session.fee_youth = 790
    stats = merge_mod.merge([_camp(d, [cand_session])])
    assert stats.sessions_updated == 1
    assert _reload().camps[0].sessions[0].fee_youth == 790


def test_skips_demo_councils(council_dir):
    # A hand-authored demo fixture must never be modified by a scrape merge.
    d = date(2026, 6, 1)
    fixture = Camp(
        id="or-fixture",
        name="Fixture Camp",
        council_id="council-492",
        state="OR",
        website_url=URL,
        sessions=[],
        provenance=_prov(d),
    )
    save_council(Council(id="council-492", name="Cascade Pacific", state="OR", camps=[fixture]))
    cand = Camp(
        id="or-scraped",
        name="Scraped Camp",
        council_id="council-492",
        state="OR",
        website_url=URL,
        sessions=[],
        provenance=_prov(d),
    )
    stats = merge_mod.merge([cand])
    assert stats.demo_skipped == 1
    assert stats.councils_written == 0
    assert {c.id for c in load_council(council_path("council-492")).camps} == {"or-fixture"}
