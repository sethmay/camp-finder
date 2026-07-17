"""Emit JSON Schema files (``data/schema/*.json``) from the pydantic models.

Run via ``campfinder schema``. Keeps the published schema in lockstep with
``models.py`` so external contributors and validators have a language-agnostic contract.
"""

from __future__ import annotations

from . import config
from .io import dumps_canonical
from .models import Camp, Council, Session

_TARGETS = {
    "council.schema.json": Council,
    "camp.schema.json": Camp,
    "session.schema.json": Session,
}


def generate() -> list[str]:
    config.SCHEMA_DIR.mkdir(parents=True, exist_ok=True)
    written: list[str] = []
    for filename, model in _TARGETS.items():
        schema = model.model_json_schema()
        (config.SCHEMA_DIR / filename).write_text(dumps_canonical(schema), encoding="utf-8")
        written.append(filename)
    return written
