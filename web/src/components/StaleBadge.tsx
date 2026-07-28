import { TriangleAlert } from "lucide-react";
import { Badge } from "@opensourcescouting/design-system";
import { formatVerified, isStale } from "@lib/format";

// Renders only when the newest verification is > 12 months old (design §7 stale state).
// The DS Badge has no warning/status variant (status colour lives only in Alert, which
// is far too heavy for an inline 12px badge), so the warning is carried by the icon and
// the label rather than by colour.
export default function StaleBadge({ verifiedAt }: { verifiedAt: string }) {
  if (!isStale(verifiedAt)) return null;
  return (
    <Badge
      variant="outline"
      title={`Last verified ${formatVerified(verifiedAt)}. This data may be out of date — confirm on the council page.`}
    >
      <TriangleAlert size={13} aria-hidden="true" />
      May be outdated
    </Badge>
  );
}
