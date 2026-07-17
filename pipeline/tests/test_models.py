"""Schema/identity invariants for the canonical models."""

import json
from datetime import date
from pathlib import Path

import pytest
from pydantic import ValidationError

from campfinder.models import (
    Availability,
    Camp,
    Council,
    Method,
    Provenance,
    Session,
    make_session_id,
)

FIXTURES = sorted((Path(__file__).resolve().parents[2] / "data" / "councils").glob("*.json"))


def _prov(**kw):
    base = dict(source_url="https://example.org/", method=Method.manual, verified_at=date(2026, 6, 1))
    base.update(kw)
    return Provenance(**base)


def _session(camp_id="or-x", start=date(2026, 6, 21), end=date(2026, 6, 27), **kw):
    return Session(
        id=make_session_id(camp_id, start), camp_id=camp_id,
        year=start.year, start_date=start, end_date=end, provenance=_prov(), **kw,
    )


@pytest.mark.parametrize("path", FIXTURES, ids=[p.stem for p in FIXTURES])
def test_fixtures_validate(path):
    Council.model_validate(json.loads(path.read_text(encoding="utf-8")))


def test_session_id_must_match_computed():
    with pytest.raises(ValidationError):
        Session(id="wrong", camp_id="or-x", year=2026,
                start_date=date(2026, 6, 21), end_date=date(2026, 6, 27), provenance=_prov())


def test_session_end_before_start_rejected():
    with pytest.raises(ValidationError):
        _session(start=date(2026, 6, 27), end=date(2026, 6, 21))


def test_session_year_must_match_start_date():
    with pytest.raises(ValidationError):
        Session(id="or-x-2026-06-21", camp_id="or-x", year=2025,
                start_date=date(2026, 6, 21), end_date=date(2026, 6, 27), provenance=_prov())


def test_camp_id_shape_enforced():
    with pytest.raises(ValidationError):
        Camp(id="Bad_ID", name="X", council_id="council-001", state="OR",
             website_url="https://x.org/", provenance=_prov())


def test_state_must_be_two_letter():
    with pytest.raises(ValidationError):
        Camp(id="or-x", name="X", council_id="council-001", state="Oregon",
             website_url="https://x.org/", provenance=_prov())


def test_llm_provenance_requires_sub_unity_confidence():
    with pytest.raises(ValidationError):
        _prov(method=Method.llm_extraction, confidence=1.0)
    # valid when confidence < 1.0
    _prov(method=Method.llm_extraction, confidence=0.8)


def test_session_camp_id_must_match_parent_camp():
    s = _session(camp_id="or-other")
    with pytest.raises(ValidationError):
        Camp(id="or-x", name="X", council_id="council-001", state="OR",
             website_url="https://x.org/", provenance=_prov(), sessions=[s])


def test_availability_default_unknown():
    assert _session().availability is Availability.unknown
