import { AlertTriangle } from "lucide-react";
import { formatVerified, isStale } from "@lib/format";

// Renders only when the newest verification is > 12 months old (design §7 stale state).
export default function StaleBadge({ verifiedAt }: { verifiedAt: string }) {
  if (!isStale(verifiedAt)) return null;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-pill bg-waitlist-bg px-2 py-0.5 text-xs font-semibold text-waitlist-ink"
      title={`Last verified ${formatVerified(verifiedAt)}. This data may be out of date — confirm on the council page.`}
    >
      <AlertTriangle size={13} aria-hidden="true" />
      May be outdated
    </span>
  );
}
