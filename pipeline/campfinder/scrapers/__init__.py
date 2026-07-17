"""Registration-platform scrapers (IMPLEMENTATION.md §6).

Each scraper subclasses :class:`base.Scraper` and returns ``list[Camp]`` candidates;
writing to ``data/`` is done by ``merge.py``, never by a scraper.
"""

from .base import Scraper

__all__ = ["Scraper"]
