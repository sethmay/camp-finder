import {
  Anchor,
  Award,
  Bike,
  Cable,
  Compass,
  FlaskConical,
  House,
  Leaf,
  Mountain,
  Droplets,
  Palette,
  Target,
  Tent,
  Truck,
  UserPlus,
  Users,
  Utensils,
  WavesHorizontal,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@opensourcescouting/design-system";
import { featureLabel } from "@lib/format";

// Lucide (MIT) glyph per known feature code; `horseback` gets a custom inline glyph
// (handoff §3). Unknown codes (open vocab) fall back to a generic tent.
const ICON: Record<string, LucideIcon> = {
  dining_hall: Utensils,
  waterfront: WavesHorizontal,
  pool: Droplets,
  shooting_sports: Target,
  climbing: Mountain,
  atv: Truck,
  cope: Users,
  older_scout_program: Award,
  high_adventure_option: Compass,
  stem: FlaskConical,
  scuba: Anchor,
  mountain_biking: Bike,
  handicraft: Palette,
  nature_study: Leaf,
  provisional_attendance: UserPlus,
  cabins: House,
  zip_line: Cable,
};

function FeatureIcon({ feature }: { feature: string }) {
  if (feature === "horseback") {
    return (
      <svg width={14} height={14} viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
        <path d="M4 20v-3l4-2 1-4-2-2 1-3 3 2h4l3 3v3l-2 1v7h-2v-6H8v6H4Z" />
      </svg>
    );
  }
  const Icon = ICON[feature] ?? Tent;
  return <Icon size={14} aria-hidden="true" />;
}

/**
 * A camp feature, rendered as icon + label with NO container.
 *
 * This was a `Badge` (DS `subtle`/`outline`). Two problems with that: a detail page
 * lists ~20 features, and 20 filled pills read as a wall of tan blobs rather than
 * scannable facts; and these are DATA, not status or navigation, which is what a
 * badge is for. Dropping the container makes the icon the delimiter and lets the
 * labels sit on the page like a list -- denser, quieter, and it scales to 20 items.
 *
 * Signature features stay distinguishable by three things, not colour alone
 * (WCAG 1.4.1): a star, the primary-tinted icon, and a heavier label.
 */
export default function FeatureChip({
  feature,
  signature = false,
}: {
  feature: string;
  signature?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs",
        signature ? "font-semibold text-foreground" : "text-foreground",
      )}
    >
      {signature && (
        <span aria-hidden="true" className="text-primary">
          ★
        </span>
      )}
      <span className={signature ? "text-primary" : "text-muted-foreground"}>
        <FeatureIcon feature={feature} />
      </span>
      {featureLabel(feature)}
      {signature && <span className="sr-only"> (signature feature)</span>}
    </span>
  );
}
