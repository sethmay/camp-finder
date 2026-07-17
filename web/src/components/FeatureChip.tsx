import {
  Anchor,
  Award,
  Bike,
  Compass,
  FlaskConical,
  Mountain,
  Droplets,
  Target,
  Truck,
  Users,
  Utensils,
  Waves,
  type LucideIcon,
} from "lucide-react";
import type { Feature } from "@lib/types";
import { FEATURE_LABEL } from "@lib/format";

// Lucide (MIT) glyph per feature. `horseback` gets a custom inline glyph (handoff §3).
const ICON: Record<Exclude<Feature, "horseback">, LucideIcon> = {
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

function FeatureIcon({ feature }: { feature: Feature }) {
  if (feature === "horseback") {
    return (
      <svg width={14} height={14} viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
        <path d="M4 20v-3l4-2 1-4-2-2 1-3 3 2h4l3 3v3l-2 1v7h-2v-6H8v6H4Z" />
      </svg>
    );
  }
  const Icon = ICON[feature];
  return <Icon size={14} aria-hidden="true" />;
}

export default function FeatureChip({ feature }: { feature: Feature }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-pill border border-border bg-bg px-2 py-1 text-xs font-medium text-ink">
      <FeatureIcon feature={feature} />
      {FEATURE_LABEL[feature]}
    </span>
  );
}
