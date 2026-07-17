"""Validation gate (IMPLEMENTATION.md §7.1).

Runs on the whole ``data/`` tree. Produces a report of hard **errors** (schema /
referential integrity) and soft **warnings** (sanity heuristics). The CLI exits nonzero
on any error, or on warnings too under ``--strict``.

Link-liveness checks are intentionally NOT run here (they need network + caching); a
separate command handles them so ``validate`` stays offline and deterministic.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field

from pydantic import ValidationError

from . import config
from .models import Council


@dataclass
class Report:
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    council_count: int = 0
    camp_count: int = 0
    session_count: int = 0

    @property
    def ok(self) -> bool:
        return not self.errors

    def to_dict(self) -> dict:
        return {
            "ok": self.ok,
            "council_count": self.council_count,
            "camp_count": self.camp_count,
            "session_count": self.session_count,
            "errors": self.errors,
            "warnings": self.warnings,
        }


def _sanity_check_camp(council: Council, camp, report: Report) -> None:
    where = f"{council.id}/{camp.id}"
    if camp.lat is not None and camp.lon is not None:
        if not config.in_us_bounds(camp.lat, camp.lon):
            report.warnings.append(f"{where}: lat/lon ({camp.lat},{camp.lon}) outside US bounds")
    elif camp.status.value == "active":
        report.warnings.append(f"{where}: active camp missing lat/lon")

    for s in camp.sessions:
        sw = f"{where}/{s.id}"
        if s.fee_youth is not None and not (config.FEE_YOUTH_MIN <= s.fee_youth <= config.FEE_YOUTH_MAX):
            report.warnings.append(f"{sw}: fee_youth ${s.fee_youth} outside "
                                   f"${config.FEE_YOUTH_MIN}-${config.FEE_YOUTH_MAX}")
        if not (config.SESSION_MONTH_MIN <= s.start_date.month <= config.SESSION_MONTH_MAX):
            report.warnings.append(f"{sw}: start month {s.start_date.month} outside May-Sep")


def validate_tree() -> Report:
    report = Report()
    if not config.COUNCILS_DIR.exists():
        report.errors.append(f"missing councils dir: {config.COUNCILS_DIR}")
        return report

    seen_camp_ids: dict[str, str] = {}
    for path in sorted(config.COUNCILS_DIR.glob("*.json")):
        try:
            raw = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as e:
            report.errors.append(f"{path.name}: invalid JSON: {e}")
            continue
        try:
            council = Council.model_validate(raw)
        except ValidationError as e:
            report.errors.append(f"{path.name}: schema: {e.error_count()} error(s): {e}")
            continue

        if path.stem != council.id:
            report.errors.append(f"{path.name}: filename must equal council id {council.id!r}")

        report.council_count += 1
        for camp in council.camps:
            report.camp_count += 1
            report.session_count += len(camp.sessions)
            if camp.council_id != council.id:
                report.errors.append(f"{council.id}/{camp.id}: council_id mismatch")
            if camp.id in seen_camp_ids:
                report.errors.append(
                    f"{council.id}/{camp.id}: duplicate camp id (also in {seen_camp_ids[camp.id]})"
                )
            else:
                seen_camp_ids[camp.id] = council.id
            _sanity_check_camp(council, camp, report)

    return report
