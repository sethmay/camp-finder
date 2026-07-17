"""Load/save canonical council files with deterministic, review-friendly formatting.

Canonical files live at ``data/councils/<council_id>.json``. All writes go through
:func:`save_council` so diffs stay minimal (sorted keys, 2-space indent, trailing
newline).
"""

from __future__ import annotations

import json
from pathlib import Path

from . import config
from .models import Council


def council_path(council_id: str) -> Path:
    return config.COUNCILS_DIR / f"{council_id}.json"


def load_council(path: Path) -> Council:
    with path.open(encoding="utf-8") as fh:
        return Council.model_validate(json.load(fh))


def load_all_councils() -> list[Council]:
    if not config.COUNCILS_DIR.exists():
        return []
    councils = [load_council(p) for p in sorted(config.COUNCILS_DIR.glob("*.json"))]
    return councils


def dumps_canonical(obj: object) -> str:
    """Deterministic JSON string: sorted keys, 2-space indent, trailing newline."""
    return json.dumps(obj, sort_keys=True, indent=2, ensure_ascii=False) + "\n"


def save_council(council: Council) -> Path:
    config.COUNCILS_DIR.mkdir(parents=True, exist_ok=True)
    path = council_path(council.id)
    payload = council.model_dump(mode="json", exclude_none=True)
    path.write_text(dumps_canonical(payload), encoding="utf-8")
    return path
