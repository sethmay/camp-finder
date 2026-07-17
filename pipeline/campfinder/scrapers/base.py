"""Scraper ABC + shared HTTP hygiene (IMPLEMENTATION.md §6).

Every scraper identifies itself (User-Agent), honors robots.txt, rate-limits to
>=1 request/sec per host, and retries transient failures with backoff. Subclasses
implement :meth:`scrape`, returning ``Camp`` candidates (with nested ``Session``s) —
they never write to ``data/``.
"""

from __future__ import annotations

import abc
import time
from urllib.parse import urlsplit
from urllib.robotparser import RobotFileParser

import httpx

from .. import config
from ..models import Camp, Method


class Scraper(abc.ABC):
    """Base class for platform scrapers. Use as a context manager or call :meth:`close`."""

    method: Method

    def __init__(self, client: httpx.Client | None = None) -> None:
        self._owns = client is None
        self._client = client or httpx.Client(
            follow_redirects=True,
            headers={"User-Agent": config.USER_AGENT},
            timeout=config.HTTP_TIMEOUT_S,
        )
        self._last_fetch: dict[str, float] = {}
        self._robots: dict[str, RobotFileParser | None] = {}

    def __enter__(self) -> Scraper:
        return self

    def __exit__(self, *exc: object) -> None:
        self.close()

    def close(self) -> None:
        if self._owns:
            self._client.close()

    # --- HTTP hygiene -------------------------------------------------------
    def _robots_for(self, host: str, scheme: str) -> RobotFileParser | None:
        if host in self._robots:
            return self._robots[host]
        rp: RobotFileParser | None = RobotFileParser()
        try:
            self._rate_limit(host)
            resp = self._client.get(f"{scheme}://{host}/robots.txt")
            if resp.status_code >= 400 or "<html" in resp.text[:200].lower():
                rp = None  # no usable robots.txt -> unrestricted
            else:
                rp.parse(resp.text.splitlines())
        except httpx.HTTPError:
            rp = None
        self._robots[host] = rp
        return rp

    def allowed(self, url: str) -> bool:
        """True if robots.txt permits our User-Agent to fetch ``url``."""
        parts = urlsplit(url)
        rp = self._robots_for(parts.netloc, parts.scheme or "https")
        return rp is None or rp.can_fetch(config.USER_AGENT, url)

    def _rate_limit(self, host: str) -> None:
        last = self._last_fetch.get(host)
        if last is not None:
            wait = config.MIN_REQUEST_INTERVAL_S - (time.monotonic() - last)
            if wait > 0:
                time.sleep(wait)
        self._last_fetch[host] = time.monotonic()

    def get(self, url: str) -> httpx.Response:
        """Rate-limited, retrying GET that respects robots.txt.

        Raises ``PermissionError`` if robots.txt disallows the URL, or the last
        ``httpx.HTTPError`` after exhausting retries.
        """
        if not self.allowed(url):
            raise PermissionError(f"robots.txt disallows {url}")
        host = urlsplit(url).netloc
        last_exc: httpx.HTTPError | None = None
        for attempt in range(config.HTTP_RETRIES):
            self._rate_limit(host)
            try:
                resp = self._client.get(url)
                resp.raise_for_status()
                return resp
            except httpx.HTTPError as exc:
                last_exc = exc
                status = getattr(getattr(exc, "response", None), "status_code", None)
                if status is not None and 400 <= status < 500:
                    raise  # permanent client error -> don't retry
                if attempt < config.HTTP_RETRIES - 1:
                    time.sleep(config.MIN_REQUEST_INTERVAL_S * (attempt + 1))
        assert last_exc is not None
        raise last_exc

    # --- contract -----------------------------------------------------------
    @abc.abstractmethod
    def scrape(self, council: object) -> list[Camp]:
        """Return candidate ``Camp``s (with nested ``Session``s) for one council."""
