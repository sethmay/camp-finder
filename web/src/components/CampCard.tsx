import { MapPin } from "lucide-react";
import type { RankedCamp } from "@lib/types";
import { withBase } from "@lib/paths";
import { formatDateRange, formatFeeFrom, programCategories, PROGRAM_CATEGORY_LABEL } from "@lib/format";
import AvailabilityBadge from "./AvailabilityBadge";
import FeatureChip from "./FeatureChip";
import StaleBadge from "./StaleBadge";

const MAX_CHIPS = 4;

export default function CampCard({
  ranked,
  selected = false,
  onHover,
  onLeave,
}: {
  ranked: RankedCamp;
  selected?: boolean;
  onHover?: (id: string) => void;
  onLeave?: () => void;
}) {
  const { camp, distanceMiles, nextSession } = ranked;
  const extraChips = camp.features.length - MAX_CHIPS;
  const badgeCats = programCategories(camp.program_types).filter((c) => c !== "scouts_bsa");

  return (
    <a
      href={withBase(`/camps/${camp.id}`)}
      onMouseEnter={() => onHover?.(camp.id)}
      onMouseLeave={onLeave}
      onFocus={() => onHover?.(camp.id)}
      onBlur={onLeave}
      className={`block rounded-md border bg-surface p-4 shadow-sh-1 transition hover:shadow-sh-2 ${
        selected ? "border-primary ring-1 ring-primary" : "border-border"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-display text-h3 text-ink">{camp.name}</h3>
          <p className="mt-0.5 truncate text-sm text-muted">{camp.council_name}</p>
          {badgeCats.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {badgeCats.map((c) => (
                <span
                  key={c}
                  className="inline-flex items-center rounded-pill border border-primary px-2 py-0.5 text-xs font-semibold text-primary"
                >
                  {PROGRAM_CATEGORY_LABEL[c]}
                </span>
              ))}
            </div>
          )}
        </div>
        <StaleBadge verifiedAt={camp.verified_at} />
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
        <span className="inline-flex items-center gap-1">
          <MapPin size={14} aria-hidden="true" />
          {camp.city ? `${camp.city}, ${camp.state}` : camp.state}
        </span>
        {distanceMiles !== null && <span>{Math.round(distanceMiles)} mi away</span>}
      </div>

      {nextSession && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="font-semibold text-ink">
            {formatDateRange(nextSession.start_date, nextSession.end_date)}
          </span>
          <AvailabilityBadge availability={nextSession.availability} />
        </div>
      )}

      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {camp.features.slice(0, MAX_CHIPS).map((f) => (
            <FeatureChip key={f} feature={f} />
          ))}
          {extraChips > 0 && (
            <span className="inline-flex items-center rounded-pill border border-border bg-bg px-2 py-1 text-xs text-muted">
              +{extraChips} more
            </span>
          )}
        </div>
        <span className="whitespace-nowrap font-mono text-sm font-semibold text-primary">
          {formatFeeFrom(camp.fee_from)}
        </span>
      </div>
    </a>
  );
}
