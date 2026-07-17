"""Platform detection — offline tests for the pure signature + link-extraction helpers."""

from campfinder.models import Platform
from campfinder.platform_detect import (
    _registrable,
    detect_from_html,
    extract_candidate_links,
)
import argparse

import httpx

from campfinder import cli, config, io, platform_detect
from campfinder.models import Council


def test_signature_matches():
    assert detect_from_html('<a href="https://x.247scouting.com/e/1">reg</a>') is Platform.blackpug
    assert detect_from_html("<script src=blackpug.js>") is Platform.blackpug
    assert detect_from_html('<iframe src="https://doubleknot.com/x">') is Platform.doubleknot
    assert detect_from_html("register at tentaroo.com now") is Platform.tentaroo


def test_no_signature_is_unknown():
    assert detect_from_html("<html><body>Welcome to our council</body></html>") is Platform.unknown


def test_registrable_domain():
    assert _registrable("www.council.org") == "council.org"
    assert _registrable("camps.council.org") == "council.org"
    assert _registrable("council.org") == "council.org"


BASE = "https://www.council.org/"


def test_extract_keeps_registration_hinted_same_site_links():
    html = """
    <a href="/summer-camp">Summer Camp</a>
    <a href="/about">About us</a>
    <a href="/events/register">Register</a>
    """
    links = extract_candidate_links(html, BASE)
    assert "https://www.council.org/summer-camp" in links
    assert "https://www.council.org/events/register" in links
    assert all("about" not in url for url in links)  # non-hinted link dropped


def test_extract_matches_hint_in_anchor_text():
    html = '<a href="/x123">Camp Reservations</a>'
    assert extract_candidate_links(html, BASE) == ["https://www.council.org/x123"]


def test_extract_allows_subdomain_of_same_site():
    html = '<a href="https://camps.council.org/register">Camp</a>'
    assert extract_candidate_links(html, BASE) == ["https://camps.council.org/register"]


def test_extract_excludes_external_and_junk_links():
    html = """
    <a href="https://facebook.com/campstuff">Camp on Facebook</a>
    <a href="mailto:camp@council.org">Email camp</a>
    <a href="#camp">Camp anchor</a>
    <a href="tel:5550001111">Call camp</a>
    """
    assert extract_candidate_links(html, BASE) == []


def test_extract_dedupes_within_cap():
    # Duplicate appears among the first entries, so the `seen` guard is actually hit.
    html = (
        '<a href="/camp-a">Camp A</a><a href="/camp-a">Camp A again</a><a href="/camp-b">Camp B</a>'
    )
    assert extract_candidate_links(html, BASE) == [
        "https://www.council.org/camp-a",
        "https://www.council.org/camp-b",
    ]


def test_extract_caps_at_max():
    html = "".join(f'<a href="/camp{i}">Camp {i}</a>' for i in range(10))
    assert len(extract_candidate_links(html, BASE)) == 5  # config.PLATFORM_MAX_CRAWL_LINKS


def _mock_client(routes: dict[str, object]) -> httpx.Client:
    def handler(request: httpx.Request) -> httpx.Response:
        entry = routes.get(str(request.url), "<html></html>")
        html, status = entry if isinstance(entry, tuple) else (entry, 200)
        return httpx.Response(status, text=html)

    return httpx.Client(transport=httpx.MockTransport(handler), follow_redirects=True)


def test_detect_homepage_signature_short_circuits():
    routes = {"https://c.org/": '<a href="https://x.247scouting.com/e">reg</a>'}
    with _mock_client(routes) as cl:
        assert platform_detect.detect("https://c.org/", client=cl) is Platform.blackpug


def test_detect_crawls_to_registration_subpage(monkeypatch):
    monkeypatch.setattr(config, "MIN_REQUEST_INTERVAL_S", 0)
    routes = {
        "https://c.org/": '<a href="/summer-camp">Summer Camp</a>',
        "https://c.org/summer-camp": '<iframe src="https://doubleknot.com/x"></iframe>',
    }
    with _mock_client(routes) as cl:
        assert platform_detect.detect("https://c.org/", client=cl) is Platform.doubleknot


def test_detect_skips_failing_link_then_finds_next(monkeypatch):
    monkeypatch.setattr(config, "MIN_REQUEST_INTERVAL_S", 0)
    routes = {
        "https://c.org/": '<a href="/register-bad">x</a><a href="/register-ok">y</a>',
        "https://c.org/register-bad": ("boom", 500),
        "https://c.org/register-ok": "join tentaroo.com today",
    }
    with _mock_client(routes) as cl:
        assert platform_detect.detect("https://c.org/", client=cl) is Platform.tentaroo


def test_detect_unknown_when_no_signature_anywhere(monkeypatch):
    monkeypatch.setattr(config, "MIN_REQUEST_INTERVAL_S", 0)
    routes = {
        "https://c.org/": '<a href="/camp">camp</a>',
        "https://c.org/camp": "<html>nothing to see</html>",
    }
    with _mock_client(routes) as cl:
        assert platform_detect.detect("https://c.org/", client=cl) is Platform.unknown


def _seed(tmp_path, monkeypatch, cid: str, platform: Platform) -> None:
    monkeypatch.setattr(io.config, "COUNCILS_DIR", tmp_path)
    io.save_council(
        Council(id=cid, name="T", number=1, state="OR", website="https://c.org/", platform=platform)
    )


def _run_detect(monkeypatch, detected: Platform, *, overwrite: bool) -> None:
    monkeypatch.setattr(cli, "detect_platform", lambda _url: detected)
    assert cli._cmd_detect(argparse.Namespace(council="all", overwrite=overwrite)) == 0


def test_cmd_detect_never_clobbers_known_with_unknown(tmp_path, monkeypatch):
    _seed(tmp_path, monkeypatch, "council-001", Platform.blackpug)
    _run_detect(monkeypatch, Platform.unknown, overwrite=False)
    assert io.load_council(io.council_path("council-001")).platform is Platform.blackpug


def test_cmd_detect_fills_unknown(tmp_path, monkeypatch):
    _seed(tmp_path, monkeypatch, "council-002", Platform.unknown)
    _run_detect(monkeypatch, Platform.doubleknot, overwrite=False)
    assert io.load_council(io.council_path("council-002")).platform is Platform.doubleknot


def test_cmd_detect_overwrite_never_clobbers_on_unknown(tmp_path, monkeypatch):
    _seed(tmp_path, monkeypatch, "council-003", Platform.blackpug)
    _run_detect(monkeypatch, Platform.unknown, overwrite=True)
    assert io.load_council(io.council_path("council-003")).platform is Platform.blackpug
