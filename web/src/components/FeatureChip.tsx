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
 * A camp feature, as an outlined pill on the raised (white) surface.
 *
 * History worth keeping, because the middle step was wrong twice: this began as a DS
 * `Badge` (`subtle` = `bg-secondary`), which put a TAN fill on a tan page -- 20 of
 * them read as a wall of blobs. Stripping the container entirely fixed the weight
 * but lost the pill shape that made each feature a discrete unit. The actual problem
 * was only ever the fill: an outline pill on white is light AND still bounded.
 *
 * Border choice is deliberate. `--border` (2.66:1 on white), not `--input` (3.87:1):
 * these are NOT interactive, so WCAG 1.4.11's 3:1 does not apply -- the label carries
 * the meaning, the outline is decoration. The filter chips look superficially similar
 * but use the heavier `--input` edge plus hover and focus states, so the two are
 * distinguishable and a feature pill does not invite a click it cannot answer.
 *
 * Signature features stay distinguishable by three things, not colour alone
 * (WCAG 1.4.1): a star, the primary border + icon, and a heavier label. Emphasis is
 * right here in a way it was not for filter chips -- one or two of ~20 are signature,
 * where 20 of 23 filter chips are unselected at rest.
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
        "inline-flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-1 text-xs",
        signature
          ? "border-primary font-semibold text-foreground"
          : "border-border text-foreground",
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
