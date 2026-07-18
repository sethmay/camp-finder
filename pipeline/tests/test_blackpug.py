"""Black Pug scraper — offline tests against saved scoutingevent.com fixtures."""

import urllib.parse
from datetime import date
from pathlib import Path

import httpx

from campfinder.models import Council, Method, ProgramType
from campfinder.scrapers.blackpug import (
    BlackPugScraper,
    _address_state,
    discover_event_urls,
    kebab,
    normalize_camp_name,
    parse_event_page,
    parse_pricing,
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


def test_address_state_accepts_full_name_and_usps_code():
    assert _address_state("40800 CA-88 Pioneer, California 95666", "OR") == "CA"
    assert _address_state("1 Main St Town, CA 95666", "OR") == "CA"
    assert _address_state("no state in here", "OR") == "OR"  # falls back to council state


def _event_html(title: str, year: int, start: str = "06-21", end: str = "06-27") -> str:
    return (
        f"<html><head><title>{title}</title></head><body>"
        f"Coords: 40.0, -83.0 1 Main St, Ohio 44100 "
        f"Week 1 Camp Sunday {start}-{year} 1:00 PM to Saturday {end}-{year} 9:30 AM"
        "</body></html>"
    )


def _mock_client(routes: dict[str, str]) -> httpx.Client:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, text=routes.get(str(request.url), "<html></html>"))

    return httpx.Client(transport=httpx.MockTransport(handler), follow_redirects=True)


def test_scrape_isolates_a_bad_event_page(monkeypatch):
    # A pre-2024 session raises pydantic ValidationError; it must not abort the whole run.
    from campfinder import config

    monkeypatch.setattr(config, "MIN_REQUEST_INTERVAL_S", 0)
    routes = {
        "https://scoutingevent.com/999": (
            '<a href="/999-bad">Camp Bad</a><a href="/999-good">Camp Good</a>'
        ),
        "https://scoutingevent.com/999-bad": _event_html("Test Council - Camp Bad", 2023),
        "https://scoutingevent.com/999-good": _event_html("Test Council - Camp Good", 2026),
        "https://scoutingevent.com/robots.txt": "<html>not robots</html>",
    }
    council = Council(id="council-999", name="Test", number=999, state="OH")
    with BlackPugScraper(client=_mock_client(routes)) as scraper:
        camps = scraper.scrape(council)
    assert [c.id for c in camps] == ["oh-camp-good"]
    assert camps[0].sessions[0].start_date == date(2026, 6, 21)


def test_scrape_dedups_camps_by_id(monkeypatch):
    # Three events -> one camp: folds new sessions, drops a duplicate session id, sorts.
    from campfinder import config

    monkeypatch.setattr(config, "MIN_REQUEST_INTERVAL_S", 0)
    routes = {
        "https://scoutingevent.com/999": (
            '<a href="/999-a">Camp Good</a>'
            '<a href="/999-b">Camp Good</a>'
            '<a href="/999-c">Camp Good</a>'
        ),
        # discovered first, later week
        "https://scoutingevent.com/999-a": _event_html(
            "T Council - Camp Good", 2026, "07-05", "07-11"
        ),
        # earlier week -> must sort before the first
        "https://scoutingevent.com/999-b": _event_html(
            "T Council - Camp Good", 2026, "06-21", "06-27"
        ),
        # duplicate of 999-a's session (same start date -> same session id) -> dropped
        "https://scoutingevent.com/999-c": _event_html(
            "T Council - Camp Good", 2026, "07-05", "07-11"
        ),
        "https://scoutingevent.com/robots.txt": "<html>x</html>",
    }
    council = Council(id="council-999", name="T", number=999, state="OH")
    with BlackPugScraper(client=_mock_client(routes)) as scraper:
        camps = scraper.scrape(council)
    assert len(camps) == 1
    assert camps[0].id == "oh-camp-good"
    # duplicate dropped (2 not 3) and sorted ascending
    assert [s.start_date for s in camps[0].sessions] == [date(2026, 6, 21), date(2026, 7, 5)]


def test_parse_pricing_prefers_regular_over_discount():
    # Real captured myPricing modal: youth regular $790 (not the $760 early-bird), adult $425.
    assert parse_pricing(_fixture("gec-047-winton-pricing.html")) == (790, 425)


def test_parse_pricing_missing_or_partial():
    assert parse_pricing("<div>no prices here</div>") == (None, None)
    assert parse_pricing("<div>Scout (Youth) Regular price $300.00</div>") == (300, None)


def test_scrape_fills_session_fees(monkeypatch):
    from campfinder import config

    monkeypatch.setattr(config, "MIN_REQUEST_INTERVAL_S", 0)
    event = (
        "<html><head><title>C Council - Camp Fee</title></head><body>"
        "Coords: 40.0, -83.0 1 Main St, Ohio 44100 Phone: 555 "
        "Week 1 Camp Sunday 06-21-2026 1:00 PM to Saturday 06-27-2026 9:30 AM "
        "<span onclick=\"ses.myPricing(111, 222, 'x')\">$ View Pricing</span>"
        "</body></html>"
    )
    pricing = (
        "<div>Scouts BSA Youth (Youth) Regular price $500.00 "
        "Scouts BSA Adult (Adult) Regular price $200.00</div>"
    )

    posted: dict[str, str] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        if request.method == "POST" and "/Ajax/SES" in str(request.url):
            posted.update(dict(urllib.parse.parse_qsl(request.content.decode())))
            return httpx.Response(200, text=pricing)
        routes = {
            "https://scoutingevent.com/999": '<a href="/999-a">Camp Fee</a>',
            "https://scoutingevent.com/999-a": event,
        }
        return httpx.Response(200, text=routes.get(str(request.url), "<html>x</html>"))

    client = httpx.Client(transport=httpx.MockTransport(handler), follow_redirects=True)
    council = Council(id="council-999", name="C", number=999, state="OH")
    with BlackPugScraper(client=client) as scraper:
        camps = scraper.scrape(council)
    assert len(camps) == 1
    session = camps[0].sessions[0]
    assert (session.fee_youth, session.fee_adult) == (500, 200)
    # payload mapping: myPricing(arg1=eventInstanceID, arg2=instanceLocationID) + orgKey
    assert posted["action"] == "myPricing"
    assert posted["eventInstanceID"] == "111"
    assert posted["instanceLocationID"] == "222"
    assert posted["orgKey"] == "BSA999"
