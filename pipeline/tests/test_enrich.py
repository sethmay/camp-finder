"""Website enrichment: curated seed loading + fill-only application."""

import json

from campfinder import enrich as enrich_mod
from campfinder.io import council_path, load_council, save_council
from campfinder.models import Council


def _council(cid: str, name: str, website: str | None = None) -> Council:
    return Council(id=cid, name=name, number=int(cid.split("-")[1]), state="OR", website=website)


def test_load_seed_validates_and_skips_bad(tmp_path):
    p = tmp_path / "seed.json"
    p.write_text(
        json.dumps(
            {
                "council-001": "https://a.org/",
                "council-002": "not a url",  # invalid -> dropped
                "council-003": "example.org",  # scheme added by normalize_url
            }
        ),
        encoding="utf-8",
    )
    seed = enrich_mod.load_seed(p)
    assert str(seed["council-001"]) == "https://a.org/"
    assert "council-003" in seed
    assert "council-002" not in seed


def test_load_seed_missing_file_is_empty(tmp_path):
    assert enrich_mod.load_seed(tmp_path / "nope.json") == {}


def test_enrich_applies_seed_fill_only(tmp_path, monkeypatch):
    councils_dir = tmp_path / "councils"
    monkeypatch.setattr(enrich_mod.config, "COUNCILS_DIR", councils_dir)
    save_council(_council("council-001", "Alpha"))  # no website -> should fill
    save_council(_council("council-002", "Beta", website="https://existing.org/"))  # keep
    seed = tmp_path / "seed.json"
    seed.write_text(
        json.dumps(
            {"council-001": "https://filled.org/", "council-002": "https://should-not.org/"}
        ),
        encoding="utf-8",
    )
    monkeypatch.setattr(enrich_mod, "SEED_PATH", seed)
    # Isolate from the network: no Wikipedia fallback in this test.
    monkeypatch.setattr(enrich_mod, "fetch_websites", lambda names, client=None: {})

    filled = enrich_mod.enrich()

    assert filled == 1
    assert str(load_council(council_path("council-001")).website) == "https://filled.org/"
    assert str(load_council(council_path("council-002")).website) == "https://existing.org/"


def test_missing_websites_lists_only_empty(tmp_path, monkeypatch):
    monkeypatch.setattr(enrich_mod.config, "COUNCILS_DIR", tmp_path)
    save_council(_council("council-001", "Alpha"))
    save_council(_council("council-002", "Beta", website="https://existing.org/"))
    missing = enrich_mod.missing_websites()
    assert [c.id for c in missing] == ["council-001"]
