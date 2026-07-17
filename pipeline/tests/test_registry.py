"""Registry wikitext parser — offline against a representative table snippet."""

from campfinder.registry import parse_wikitext

SAMPLE = """
{| class="wikitable sortable"
|+ Current councils
! Council number !! Council name !! Headquarters city !! Headquarters state !! Lodges !! Camps
|-
|1 || Greater Alabama Council || Birmingham || [[Scouting in Alabama|Alabama]] || Coosa Lodge || {{plainlist|
* Comer Scout Reservation
* Camp Jack Wright
}}
|-
|10 || [[Grand Canyon Council]] || Phoenix || Arizona || [[Wipala Wiki Lodge]] || [[Camp Geronimo]]
|-
|492 || Cascade Pacific Council || Portland || Oregon || Wauna La-Mon'tay || {{plainlist|
* [[Camp Meriwether]]
}}
|}
"""


def test_parses_expected_rows():
    rows = parse_wikitext(SAMPLE)
    by_num = {r["number"]: r for r in rows}
    assert set(by_num) == {1, 10, 492}


def test_strips_wikilinks_and_maps_state():
    rows = {r["number"]: r for r in parse_wikitext(SAMPLE)}
    assert rows[10]["name"] == "Grand Canyon Council"       # [[X]] -> X
    assert rows[1]["state"] == "AL"                         # [[Scouting in Alabama|Alabama]] -> AL
    assert rows[492]["name"] == "Cascade Pacific Council"
    assert rows[492]["state"] == "OR"
    assert rows[10]["hq_city"] == "Phoenix"


def test_skips_header_and_nondigit_rows():
    rows = parse_wikitext(SAMPLE)
    assert all(isinstance(r["number"], int) for r in rows)
    assert all(r["name"] for r in rows)
