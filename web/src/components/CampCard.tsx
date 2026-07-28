import { MapPin } from "lucide-react";
import { Badge, Heading, cardVariants, cn } from "@opensourcescouting/design-system";
import type { RankedCamp } from "@lib/types";
import { withBase } from "@lib/paths";
import { orderFeatures, programCategories, PROGRAM_CATEGORY_LABEL } from "@lib/format";
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
  const { camp, distanceMiles } = ranked;
  const sig = new Set(camp.features_signature);
  const orderedFeatures = orderFeatures(camp.features, camp.features_signature);
  const extraChips = camp.features.length - MAX_CHIPS;
  const badgeCats = programCategories(camp.program_types).filter((c) => c !== "scouts_bsa");
  const operator =
    camp.council_name ?? (camp.operator === "national" ? "National high-adventure base" : null);

  return (
    <a
      href={withBase(`/camps/${camp.id}`)}
      onMouseEnter={() => onHover?.(camp.id)}
      onMouseLeave={onLeave}
      onFocus={() => onHover?.(camp.id)}
      onBlur={onLeave}
      className={cn(
        cardVariants({ variant: "elevated" }),
        "block p-4 hover:shadow-md",
        selected && "border-primary ring-1 ring-inset ring-primary",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Heading level={3} size={4} className="truncate">
            {camp.name}
          </Heading>
          {operator && <p className="mt-0.5 truncate text-sm text-muted-foreground">{operator}</p>}
          {badgeCats.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {badgeCats.map((c) => (
                <Badge key={c} variant="outline">
                  {PROGRAM_CATEGORY_LABEL[c]}
                </Badge>
              ))}
            </div>
          )}
        </div>
        <StaleBadge verifiedAt={camp.verified_at} />
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <MapPin size={14} aria-hidden="true" />
          {camp.city ? `${camp.city}, ${camp.state}` : camp.state}
        </span>
        {distanceMiles !== null && <span>{Math.round(distanceMiles)} mi away</span>}
        {camp.july_high_f !== null && <span>July avg ~{camp.july_high_f}°F</span>}
      </div>

      {camp.features.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
          {orderedFeatures.slice(0, MAX_CHIPS).map((f) => (
            <FeatureChip key={f} feature={f} signature={sig.has(f)} />
          ))}
          {/* Plain text, matching the containerless features beside it -- a filled Badge
            * here would be the only pill left in the row and read as the loudest thing. */}
          {extraChips > 0 && (
            <span className="text-xs text-muted-foreground">+{extraChips} more</span>
          )}
        </div>
      )}
    </a>
  );
}
