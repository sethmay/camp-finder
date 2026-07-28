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
import { Badge } from "@opensourcescouting/design-system";
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

export default function FeatureChip({
  feature,
  signature = false,
}: {
  feature: string;
  signature?: boolean;
}) {
  // Badge's recipe forces `text-[11px] uppercase tracking-wider`, which shouts
  // Title Case vocab labels ("Adirondack Shelters" -> "ADIRONDACK SHELTERS") and
  // widens a 4-chip row past the card. Feature chips are data, not eyebrows, so
  // the casing/tracking is overridden here (see spike notes).
  return (
    <Badge
      variant={signature ? "outline" : "subtle"}
      className="normal-case tracking-normal text-xs font-medium"
    >
      {signature && <span aria-hidden="true">★</span>}
      <FeatureIcon feature={feature} />
      {featureLabel(feature)}
      {signature && <span className="sr-only"> (signature feature)</span>}
    </Badge>
  );
}
