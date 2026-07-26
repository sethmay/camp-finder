import {
  Anchor,
  Award,
  Bike,
  Compass,
  FlaskConical,
  Mountain,
  Droplets,
  Target,
  Tent,
  Truck,
  Users,
  Utensils,
  Waves,
  type LucideIcon,
} from "lucide-react";
import { featureLabel } from "@lib/format";

// Lucide (MIT) glyph per known feature code; `horseback` gets a custom inline glyph
// (handoff §3). Unknown codes (open vocab) fall back to a generic tent.
const ICON: Record<string, LucideIcon> = {
  dining_hall: Utensils,
  waterfront: Waves,
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
  const tone = signature
    ? "border-primary bg-surface text-primary"
    : "border-border bg-bg text-ink";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-pill border px-2 py-1 text-xs font-medium ${tone}`}
    >
      {signature && <span aria-hidden="true">★</span>}
      <FeatureIcon feature={feature} />
      {featureLabel(feature)}
      {signature && <span className="sr-only"> (signature feature)</span>}
    </span>
  );
}
