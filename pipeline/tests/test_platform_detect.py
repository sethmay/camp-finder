"""Platform detection — offline tests for the pure signature + link-extraction helpers."""

from campfinder.models import Platform
from campfinder.platform_detect import (
    _registrable,
    detect_from_html,
    extract_candidate_links,
)


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


def test_extract_dedupes_and_caps():
    html = "".join(f'<a href="/camp?p={i}">Camp {i}</a>' for i in range(10))
    html += '<a href="/camp?p=0">Camp dup</a>'
    links = extract_candidate_links(html, BASE)
    assert len(links) == 5  # config.PLATFORM_MAX_CRAWL_LINKS
    assert len(set(links)) == len(links)
