"""Parsing the Black Pug Global index (createMarker rows)."""

from campfinder.globalsync import parse_index

SAMPLE = (
    "createMarker('33.4','-86.7','Greater Alabama Council',0,0,'BSA001',"
    "'Greater Alabama Council','https://www.1bsa.org/','0');"
    "createMarker('40.8','-74.4','Patriots\\' Path Council',0,1,'BSA358',"
    "'Patriots\\' Path Council','https://ppcscouting.org','0');"
    "createMarker('30.6','-88.1','Mobile Area Council',0,1,'BSA004',"
    "'Mobile Area Council','https://www.bsamac.org','0');"
)


def test_parses_number_managed_website():
    idx = parse_index(SAMPLE)
    assert set(idx) == {1, 358, 4}
    assert idx[1]["managed"] is False
    assert idx[4]["managed"] is True
    assert idx[4]["website"] == "https://www.bsamac.org"


def test_handles_escaped_quote_in_name():
    # "Patriots\' Path Council" must not break the row (name has an escaped quote).
    idx = parse_index(SAMPLE)
    assert 358 in idx and idx[358]["managed"] is True
    assert idx[358]["website"] == "https://ppcscouting.org"


def test_ignores_non_bsa_and_empty():
    assert parse_index("nothing here") == {}
    assert parse_index("createMarker('1','2','X',0,1,'GSUSA9','X','http://x','0');") == {}


def test_sync_upgrades_only_managed_unknown(tmp_path, monkeypatch):
    from campfinder import config, globalsync
    from campfinder.io import council_path, load_council, save_council
    from campfinder.models import Council, Platform

    monkeypatch.setattr(config, "COUNCILS_DIR", tmp_path)
    monkeypatch.setattr(config, "REVIEW_DIR", tmp_path / ".review")
    save_council(
        Council(id="council-010", name="Up", number=10, state="AZ", platform=Platform.unknown)
    )
    save_council(
        Council(id="council-697", name="Demo", number=697, state="OR", platform=Platform.other)
    )
    save_council(
        Council(id="council-085", name="Tent", number=85, state="FL", platform=Platform.tentaroo)
    )
    save_council(
        Council(id="council-999", name="Nat", number=999, state="TX", platform=Platform.unknown)
    )
    fake = {n: {"managed": True, "website": "https://x.org"} for n in (10, 697, 85, 999)}
    monkeypatch.setattr(globalsync, "fetch_index", lambda client=None: fake)

    stats = globalsync.sync()

    assert stats["reclassified"] == 1
    assert load_council(council_path("council-010")).platform is Platform.blackpug  # upgraded
    assert load_council(council_path("council-697")).platform is Platform.other  # demo untouched
    assert (
        load_council(council_path("council-085")).platform is Platform.tentaroo
    )  # tentaroo skipped
    assert (
        load_council(council_path("council-999")).platform is Platform.unknown
    )  # national skipped
