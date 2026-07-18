"""Shared constants and paths for the Camp Finder pipeline.

Single place for tunables referenced across modules: filesystem layout, geographic
bounds used by validation, the resident-camp keyword filters used by scrapers, and the
LLM model id used by the long-tail extractor.
"""

from __future__ import annotations

import re
from pathlib import Path

# --- Filesystem layout (repo-relative; resolved from this file) ---
REPO_ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = REPO_ROOT / "data"
COUNCILS_DIR = DATA_DIR / "councils"
SCHEMA_DIR = DATA_DIR / "schema"
REVIEW_DIR = DATA_DIR / ".review"  # LLM low-confidence queue (tracked; human-triaged)
CACHE_DIR = DATA_DIR / ".cache"  # geocode + link-liveness cache (gitignored)
CANDIDATES_DIR = DATA_DIR / "candidates"  # scraper output before merge (gitignored)
WEB_DATA_DIR = REPO_ROOT / "web" / "public" / "data"  # build output

# Hand-authored PNW demo fixtures (exercise every UI state). `merge` skips these so a
# scrape/refresh never clobbers them; replacing them with real scraped data is a
# deliberate future decision (see TODO.md). NOT a scraper allow/deny list.
DEMO_COUNCILS = frozenset({"council-492", "council-606", "council-609", "council-697"})

# --- LLM extraction ---
LLM_MODEL = "claude-3-5-sonnet-latest"
LLM_CONFIDENCE_THRESHOLD = 0.7  # below this -> review queue, never auto-published

# --- Scraper etiquette ---
USER_AGENT = "CampFinderBot/1.0 (+https://github.com/campfinder/camp-finder)"
MIN_REQUEST_INTERVAL_S = 1.0  # per-host rate limit
HTTP_TIMEOUT_S = 30.0
HTTP_RETRIES = 3

# --- Platform detection ---
# When a council homepage carries no platform signature, detect() follows up to
# PLATFORM_MAX_CRAWL_LINKS same-site links whose href/text hints at registration and
# scans those pages too. Registration widgets usually live one click off the homepage.
PLATFORM_LINK_HINTS = ("camp", "register", "event", "activit", "program", "summer", "reservation")
PLATFORM_LINK_HINTS_RE = re.compile("|".join(PLATFORM_LINK_HINTS), re.I)
PLATFORM_MAX_CRAWL_LINKS = 5

# Resident-camp event allow/deny keywords used to filter platform events down to the
# Scouts BSA resident summer-camp use case (v1 scope).
RESIDENT_CAMP_KEYWORDS = (
    "resident camp",
    "summer camp",
    "scouts bsa camp",
    "boy scout camp",
    "long term camp",
)
EXCLUDE_KEYWORDS = (
    "day camp",
    "family camp",
    "twilight",
    "cub",
    "webelos",
    "training",
    "banquet",
    "dinner",
    "golf",
    "merit badge college",
    "klondike",
    "camporee",
    "roundtable",
    "wood badge",
    "nylt",
    "order of the arrow",
)

# --- Geographic sanity bounds (validation) ---
# Continental US + Alaska + Hawaii coarse bounding boxes. A camp lat/lon must fall in one.
US_BBOXES = (
    # (min_lat, max_lat, min_lon, max_lon)
    (24.5, 49.5, -125.0, -66.9),  # CONUS
    (51.0, 71.5, -179.9, -129.0),  # Alaska
    (18.5, 22.5, -160.5, -154.5),  # Hawaii
)

# --- Session sanity bounds (validation warnings) ---
FEE_YOUTH_MIN = 100
FEE_YOUTH_MAX = 1500
SESSION_MONTH_MIN = 5  # May
SESSION_MONTH_MAX = 9  # September


def in_us_bounds(lat: float, lon: float) -> bool:
    """True if (lat, lon) falls in any recognized US bounding box."""
    return any(
        lo_lat <= lat <= hi_lat and lo_lon <= lon <= hi_lon
        for lo_lat, hi_lat, lo_lon, hi_lon in US_BBOXES
    )
