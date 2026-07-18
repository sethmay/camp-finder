"""Merge scraper candidates into ``data/councils/*.json`` (IMPLEMENTATION.md §7.2).

Candidates are matched into the canonical tree by ``camp.id`` then ``session.id``:

* new camp / session -> added;
* existing -> updated field-by-field ONLY when the candidate's provenance is at least as
  confident AND strictly newer (``verified_at``), and never overwriting an existing value
  with ``None`` (curated fields survive a thinner scrape);
* a camp already in ``data/`` that a scrape didn't return is never dropped.

All writes go through :func:`io.save_council` for deterministic, review-friendly diffs.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

from . import config
from .io import council_path, load_council, save_council
from .models import Availability, Camp, Council, Provenance, Session

# Camp fields the scrapers may supply; None from a candidate never clobbers an existing value.
_CAMP_FIELDS = ("name", "lat", "lon", "address", "city", "website_url", "description")


@dataclass
class MergeStats:
    councils_written: int = 0
    camps_added: int = 0
    camps_updated: int = 0
    sessions_added: int = 0
    sessions_updated: int = 0
    demo_skipped: int = 0

    def total_changes(self) -> int:
        return self.camps_added + self.camps_updated + self.sessions_added + self.sessions_updated


def _supersedes(new: Provenance, old: Provenance) -> bool:
    """True if ``new`` should overwrite ``old``: >= confidence and strictly newer."""
    return new.confidence >= old.confidence and new.verified_at > old.verified_at


# Session fields a scrape may refresh; None never clobbers a curated value.
_SESSION_FIELDS = (
    "end_date",
    "fee_youth",
    "fee_adult",
    "fee_notes",
    "registration_url",
    "program_type",
)


def _update_session(existing: Session, cand: Session, supersedes: bool) -> bool:
    """Merge a matched session field-by-field. Returns True if changed.

    Fill an empty field from a non-null candidate ALWAYS (e.g. a later fee scrape filling
    a previously-unknown fee); overwrite an existing non-null value only when the candidate
    supersedes it (>= confidence and strictly newer). Never write None over a value.
    """
    changed = False
    for field in _SESSION_FIELDS:
        value = getattr(cand, field)
        if value is None:
            continue
        current = getattr(existing, field)
        if value != current and (current is None or supersedes):
            setattr(existing, field, value)
            changed = True
    avail = cand.availability
    if (
        avail is not Availability.unknown
        and avail != existing.availability
        and (existing.availability is Availability.unknown or supersedes)
    ):
        existing.availability = avail
        changed = True
    # Adopt candidate provenance only when it is not a downgrade — a fill-only change from an
    # older/less-confident source must not weaken the record's supersedes guard.
    if changed and (
        cand.provenance.verified_at >= existing.provenance.verified_at
        and cand.provenance.confidence >= existing.provenance.confidence
    ):
        existing.provenance = cand.provenance
    return changed


def _merge_sessions(existing: Camp, cand: Camp, stats: MergeStats) -> bool:
    changed = False
    by_id = {s.id: i for i, s in enumerate(existing.sessions)}
    for cs in cand.sessions:
        idx = by_id.get(cs.id)
        if idx is None:
            existing.sessions.append(cs)
            stats.sessions_added += 1
            changed = True
        elif _update_session(
            existing.sessions[idx],
            cs,
            _supersedes(cs.provenance, existing.sessions[idx].provenance),
        ):
            stats.sessions_updated += 1
            changed = True
    if changed:
        existing.sessions.sort(key=lambda s: s.start_date)
    return changed


def _merge_camp(council: Council, cand: Camp, stats: MergeStats) -> None:
    by_id = {c.id: i for i, c in enumerate(council.camps)}
    idx = by_id.get(cand.id)
    if idx is None:
        cand.sessions.sort(key=lambda s: s.start_date)
        council.camps.append(cand)
        stats.camps_added += 1
        stats.sessions_added += len(cand.sessions)
        return

    existing = council.camps[idx]
    changed = _merge_sessions(existing, cand, stats)
    if _supersedes(cand.provenance, existing.provenance):
        for field in _CAMP_FIELDS:
            value = getattr(cand, field)
            if value is not None:
                setattr(existing, field, value)
        if cand.features:
            existing.features = cand.features
        existing.provenance = cand.provenance
        changed = True
    if changed:
        stats.camps_updated += 1


def merge(candidates: list[Camp]) -> MergeStats:
    """Merge candidate camps into the canonical tree. Returns change counts."""
    stats = MergeStats()
    by_council: dict[str, list[Camp]] = {}
    for camp in candidates:
        by_council.setdefault(camp.council_id, []).append(camp)

    for council_id, camps in by_council.items():
        path = council_path(council_id)
        if council_id in config.DEMO_COUNCILS:
            stats.demo_skipped += len(camps)  # protect hand-authored fixtures
            continue
        if not path.exists():
            continue  # candidate references an unknown council -> skip (registry owns councils)
        council = load_council(path)
        for cand in camps:
            _merge_camp(council, cand, stats)
        council.camps.sort(key=lambda c: c.id)
        save_council(council)
        stats.councils_written += 1
    return stats


def merge_file(path: str | Path) -> MergeStats:
    """Load a candidates JSON file (list of Camp objects) and merge it."""
    raw = json.loads(Path(path).read_text(encoding="utf-8"))
    return merge([Camp.model_validate(c) for c in raw])
