"""Website enrichment — offline tests for the pure parser + chunk mapper."""

from campfinder.enrich import (
    _extract_chunk,
    normalize_url,
    parse_infobox_website,
)


def test_parse_url_template():
    wt = "{{Infobox\n| website = {{URL|https://www.example.org}}\n}}"
    assert str(parse_infobox_website(wt)) == "https://www.example.org/"


def test_parse_url_template_numbered_arg():
    wt = "| website = {{URL|1=https://example.org/path}}"
    assert str(parse_infobox_website(wt)).startswith("https://example.org")


def test_parse_bracketed_external_link():
    wt = "| website = [https://council.example.org Council site]"
    assert str(parse_infobox_website(wt)).startswith("https://council.example.org")


def test_parse_bare_url():
    wt = "| website = https://bare.example.org"
    assert str(parse_infobox_website(wt)).startswith("https://bare.example.org")


def test_parse_adds_missing_scheme():
    wt = "| website = {{URL|www.noscheme.org}}"
    assert str(parse_infobox_website(wt)) == "https://www.noscheme.org/"


def test_parse_none_when_absent():
    assert parse_infobox_website("| president = Jane Doe\n| founded = 1910") is None


def test_normalize_rejects_garbage():
    assert normalize_url("") is None
    assert normalize_url("|}") is None


def _resp(pages, normalized=None, redirects=None):
    return {"query": {"pages": pages, "normalized": normalized or [], "redirects": redirects or []}}


def test_extract_maps_direct_page():
    data = _resp(
        pages=[
            {
                "title": "Foo Council",
                "revisions": [{"slots": {"main": {"content": "| website = {{URL|foo.org}}"}}}],
            }
        ],
    )
    out = _extract_chunk(["Foo Council"], data)
    assert str(out["Foo Council"]) == "https://foo.org/"


def test_extract_follows_redirect():
    data = _resp(
        pages=[
            {
                "title": "Real Council",
                "revisions": [{"slots": {"main": {"content": "| website = {{URL|real.org}}"}}}],
            }
        ],
        redirects=[{"from": "Old Council Name", "to": "Real Council"}],
    )
    out = _extract_chunk(["Old Council Name"], data)
    assert str(out["Old Council Name"]) == "https://real.org/"


def test_extract_skips_state_overview_redirect():
    # Council name redirecting to a "Scouting in <State>" article must NOT adopt its site.
    data = _resp(
        pages=[
            {
                "title": "Scouting in Arizona",
                "revisions": [
                    {"slots": {"main": {"content": "| website = {{URL|girlscoutsaz.org}}"}}}
                ],
            }
        ],
        redirects=[{"from": "Grand Canyon Council", "to": "Scouting in Arizona"}],
    )
    assert _extract_chunk(["Grand Canyon Council"], data) == {}


def test_extract_skips_missing_page():
    data = _resp(pages=[{"title": "Nowhere Council", "missing": True}])
    assert _extract_chunk(["Nowhere Council"], data) == {}
