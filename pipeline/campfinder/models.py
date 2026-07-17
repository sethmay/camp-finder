"""Canonical data schema (pydantic v2) — the single source of truth for data shape.

Mirror any change here in ``web/src/lib/types.ts`` and regenerate ``data/schema/*.json``
(``campfinder schema``). Identity rules (IMPLEMENTATION.md §3):

* ``council.id``  = ``council-<3-digit BSA number>``           e.g. ``council-609``
* ``camp.id``     = ``<state-lower>-<kebab-camp-name>``         e.g. ``or-camp-baldwin``
* ``session.id``  = ``<camp.id>-<year>-<start_date iso>``       e.g. ``or-camp-baldwin-2026-06-21``
"""

from __future__ import annotations

import re
from datetime import date
from enum import Enum

from pydantic import BaseModel, Field, HttpUrl, field_validator, model_validator

CAMP_ID_RE = re.compile(r"^[a-z]{2}-[a-z0-9-]+$")
STATE_RE = re.compile(r"^[A-Z]{2}$")


class Platform(str, Enum):
    blackpug = "blackpug"  # 247scouting.com
    doubleknot = "doubleknot"
    tentaroo = "tentaroo"  # shutting down Oct 2026; kept for detection
    other = "other"
    unknown = "unknown"


class ProgramType(str, Enum):
    scouts_bsa_resident = "scouts_bsa_resident"  # v1 focus
    cub_resident = "cub_resident"  # schema-ready, not populated in v1
    cub_day = "cub_day"
    high_adventure = "high_adventure"
    webelos = "webelos"


class Feature(str, Enum):
    dining_hall = "dining_hall"
    waterfront = "waterfront"
    pool = "pool"
    shooting_sports = "shooting_sports"
    climbing = "climbing"
    horseback = "horseback"
    atv = "atv"
    cope = "cope"
    older_scout_program = "older_scout_program"
    high_adventure_option = "high_adventure_option"
    stem = "stem"
    scuba = "scuba"
    mountain_biking = "mountain_biking"


class CampStatus(str, Enum):
    active = "active"
    not_operating = "not_operating"  # property exists, no resident camp this year
    closed = "closed"


class Method(str, Enum):
    manual = "manual"
    blackpug = "blackpug"
    doubleknot = "doubleknot"
    llm_extraction = "llm_extraction"
    community = "community"


class Availability(str, Enum):
    open = "open"
    waitlist = "waitlist"
    full = "full"
    unknown = "unknown"


class Provenance(BaseModel):
    source_url: HttpUrl
    method: Method
    verified_at: date  # last date a human/scraper confirmed this record
    confidence: float = Field(1.0, ge=0.0, le=1.0)  # < 1.0 for LLM-extracted fields
    notes: str | None = None

    @model_validator(mode="after")
    def _llm_needs_confidence(self) -> "Provenance":
        # LLM extraction must carry an explicit, non-perfect confidence.
        if self.method is Method.llm_extraction and self.confidence >= 1.0:
            raise ValueError("llm_extraction provenance must set confidence < 1.0")
        return self


class Session(BaseModel):
    id: str
    camp_id: str
    year: int = Field(ge=2024, le=2100)
    start_date: date
    end_date: date
    program_type: ProgramType = ProgramType.scouts_bsa_resident
    fee_youth: int | None = Field(default=None, ge=0)  # USD whole dollars; None = unknown
    fee_adult: int | None = Field(default=None, ge=0)
    fee_notes: str | None = None
    registration_url: HttpUrl | None = None
    availability: Availability = Availability.unknown
    provenance: Provenance

    @model_validator(mode="after")
    def _check(self) -> "Session":
        if self.end_date < self.start_date:
            raise ValueError(f"session {self.id}: end_date {self.end_date} before start_date")
        if self.year != self.start_date.year:
            raise ValueError(f"session {self.id}: year {self.year} != start_date year")
        expected = f"{self.camp_id}-{self.start_date.isoformat()}"
        if self.id != expected:
            raise ValueError(f"session id {self.id!r} must equal {expected!r}")
        return self


class Camp(BaseModel):
    id: str
    name: str
    council_id: str
    status: CampStatus = CampStatus.active
    address: str | None = None
    city: str | None = None
    state: str  # 2-letter USPS
    lat: float | None = Field(default=None, ge=-90, le=90)
    lon: float | None = Field(default=None, ge=-180, le=180)
    website_url: HttpUrl  # authoritative council/camp page — REQUIRED
    program_types: list[ProgramType] = Field(default_factory=lambda: [ProgramType.scouts_bsa_resident])
    features: list[Feature] = Field(default_factory=list)
    description: str | None = None
    sessions: list[Session] = Field(default_factory=list)
    provenance: Provenance

    @field_validator("id")
    @classmethod
    def _id_shape(cls, v: str) -> str:
        if not CAMP_ID_RE.match(v):
            raise ValueError(f"camp id {v!r} must match {CAMP_ID_RE.pattern}")
        return v

    @field_validator("state")
    @classmethod
    def _state_shape(cls, v: str) -> str:
        if not STATE_RE.match(v):
            raise ValueError(f"state {v!r} must be a 2-letter USPS code")
        return v

    @model_validator(mode="after")
    def _sessions_belong(self) -> "Camp":
        for s in self.sessions:
            if s.camp_id != self.id:
                raise ValueError(f"session {s.id} camp_id {s.camp_id} != camp {self.id}")
        return self


class Council(BaseModel):
    id: str
    name: str
    number: int | None = None  # BSA council number
    state: str  # HQ state, 2-letter
    hq_city: str | None = None
    website: HttpUrl | None = None  # official council site; may be unknown at registry stub time
    platform: Platform = Platform.unknown
    camps: list[Camp] = Field(default_factory=list)

    @field_validator("state")
    @classmethod
    def _state_shape(cls, v: str) -> str:
        if not STATE_RE.match(v):
            raise ValueError(f"state {v!r} must be a 2-letter USPS code")
        return v

    @model_validator(mode="after")
    def _camps_belong(self) -> "Council":
        for c in self.camps:
            if c.council_id != self.id:
                raise ValueError(f"camp {c.id} council_id {c.council_id} != council {self.id}")
        return self


def make_session_id(camp_id: str, start: date) -> str:
    return f"{camp_id}-{start.isoformat()}"


ALL_MODELS = (Council, Camp, Session, Provenance)
