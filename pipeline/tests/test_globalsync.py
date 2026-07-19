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
