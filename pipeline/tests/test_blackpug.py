"""Black Pug scraper — offline tests against saved scoutingevent.com fixtures."""

from datetime import date
from pathlib import Path

from campfinder.models import Method, ProgramType
from campfinder.scrapers.blackpug import (
    discover_event_urls,
    kebab,
    normalize_camp_name,
    parse_event_page,
)

FIX = Path(__file__).parent / "fixtures" / "blackpug"
WINTON_URL = "https://scoutingevent.com/047-104173"
RODNEY_URL = "https://scoutingevent.com/081-RSRSummer"


def _fixture(name: str) -> str:
    return (FIX / name).read_text(encoding="utf-8")


def test_normalize_camp_name():
    assert normalize_camp_name("Golden Empire Council - CAMP WINTON 2026") == "Camp Winton"
    assert (
        normalize_camp_name("Del-Mar-Va Council - Rodney Scout Reservation Summer Camp")
        == "Rodney Scout Reservation"
    )


def test_kebab():
    assert kebab("Camp Winton") == "camp-winton"
    assert kebab("Rodney Scout Reservation") == "rodney-scout-reservation"


def test_discover_excludes_meetings_and_nonresident():
    urls = discover_event_urls(_fixture("gec-047-landing.html"), 47)
    assert WINTON_URL in urls
    # meetings / OA / committee use ?OrgKey calendar links, never /047-<id> -> excluded
    assert all(u.startswith("https://scoutingevent.com/047-") for u in urls)


def test_parse_winton_camp_and_sessions():
    camp = parse_event_page(_fixture("gec-047-camp-winton.html"), WINTON_URL, "council-047", "CA")
    assert camp is not None
    assert camp.id == "ca-camp-winton"
    assert camp.name == "Camp Winton"
    assert camp.state == "CA"
    assert camp.council_id == "council-047"
    assert (round(camp.lat, 4), round(camp.lon, 4)) == (38.5436, -120.2281)
    assert camp.address == "40800 CA-88 Pioneer, California 95666"
    assert str(camp.website_url) == WINTON_URL
    assert camp.provenance.method is Method.blackpug
    assert camp.program_types == [ProgramType.scouts_bsa_resident]
    # two Scouts BSA resident weeks (cub session + attachments excluded)
    assert [(s.start_date, s.end_date) for s in camp.sessions] == [
        (date(2026, 6, 21), date(2026, 6, 27)),
        (date(2026, 7, 5), date(2026, 7, 11)),
    ]
    s0 = camp.sessions[0]
    assert s0.id == "ca-camp-winton-2026-06-21"
    assert s0.fee_youth is None and s0.fee_adult is None  # fees not scraped (POST-gated)
    assert str(s0.registration_url) == WINTON_URL


def test_parse_rodney_rekeys_to_camp_state_and_sorts():
    # Council HQ is Delaware but the camp is in Maryland -> camp id/state follow the address.
    camp = parse_event_page(_fixture("delmarva-081-rodney.html"), RODNEY_URL, "council-081", "DE")
    assert camp is not None
    assert camp.state == "MD"
    assert camp.id == "md-rodney-scout-reservation"
    starts = [s.start_date for s in camp.sessions]
    assert starts == sorted(starts)
    assert all(s.camp_id == "md-rodney-scout-reservation" for s in camp.sessions)
    assert len(camp.sessions) == 5


def test_parse_returns_none_without_multinight_session():
    html = """
    <html><head><title>Some Council - Twilight Day Camp 2026</title></head><body>
    Coords: 40.0, -80.0 1 Main St, Ohio 44100 Week 1 Twilight
    Monday 06-01-2026 to Monday 06-01-2026
    </body></html>
    """
    assert parse_event_page(html, "https://scoutingevent.com/999-x", "council-999", "OH") is None
