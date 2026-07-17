"""Validation gate + build compiler behavior against the committed fixtures."""

from datetime import date

from campfinder import build as build_mod
from campfinder import validate


def test_tree_validates_clean():
    report = validate.validate_tree()
    assert report.ok, report.errors
    assert report.council_count >= 4
    assert report.camp_count >= 7


def test_build_flattens_and_denormalizes(tmp_path, monkeypatch):
    out = tmp_path / "data"
    monkeypatch.setattr(build_mod.config, "WEB_DATA_DIR", out)
    meta = build_mod.build(today=date(2026, 7, 17))
    assert meta["camp_count"] >= 7
    assert "OR" in meta["states_covered"] and "WA" in meta["states_covered"]

    import json
    camps = json.loads((out / "camps.json").read_text())
    baldwin = next(c for c in camps if c["id"] == "or-camp-baldwin")
    assert baldwin["council_name"] == "Cascade Pacific Council"
    assert baldwin["fee_from"] == 415  # min youth fee across its sessions
    assert baldwin["sessions"][0]["start_date"] <= baldwin["sessions"][-1]["start_date"]


def test_build_drops_not_operating_camp_without_upcoming_session(tmp_path, monkeypatch):
    monkeypatch.setattr(build_mod.config, "WEB_DATA_DIR", tmp_path)
    build_mod.build(today=date(2026, 7, 17))
    import json
    camps = json.loads((tmp_path / "camps.json").read_text())
    ids = {c["id"] for c in camps}
    assert "wa-camp-black-mountain" not in ids  # not_operating + no sessions -> dropped


def test_upcoming_summer_year_rolls_in_fall():
    assert build_mod.upcoming_summer_year(date(2026, 3, 1)) == 2026
    assert build_mod.upcoming_summer_year(date(2026, 9, 1)) == 2027
