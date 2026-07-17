import { CheckCircle2, Clock, HelpCircle, XCircle, type LucideIcon } from "lucide-react";
import type { Availability } from "@lib/types";
import { AVAILABILITY_CLASS, AVAILABILITY_LABEL } from "@lib/format";

// Status is never color-only: color + icon + text together (design non-negotiable).
const ICON: Record<Availability, LucideIcon> = {
  open: CheckCircle2,
  waitlist: Clock,
  full: XCircle,
  unknown: HelpCircle,
};

export default function AvailabilityBadge({ availability }: { availability: Availability }) {
  const Icon = ICON[availability];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-pill px-2 py-0.5 text-xs font-semibold ${AVAILABILITY_CLASS[availability]}`}
    >
      <Icon size={13} aria-hidden="true" />
      {AVAILABILITY_LABEL[availability]}
    </span>
  );
}
