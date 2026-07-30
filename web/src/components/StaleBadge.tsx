import { TriangleAlert } from "lucide-react";
import { Badge } from "@opensourcescouting/design-system";
import { formatVerified, isStale } from "@lib/format";

// Renders only when the newest verification is > 12 months old (design §7 stale state).
// The DS Badge has no warning/status variant (status colour lives only in Alert, which
// is far too heavy for an inline 12px badge), so the warning is carried by the icon and
// the label rather than by colour.
// The verification date rides in an sr-only span, not a `title`: a `title` on a
// non-focusable <span> never appears on touch and is unreachable by keyboard
// (LESSONS.md §Frontend/a11y — "a text carrier, not a `title`").
export default function StaleBadge({ verifiedAt }: { verifiedAt: string }) {
  if (!isStale(verifiedAt)) return null;
  return (
    <Badge variant="outline">
      <TriangleAlert size={13} aria-hidden="true" />
      May be outdated
      <span className="sr-only">
        . Last verified {formatVerified(verifiedAt)} — confirm on the council page.
      </span>
    </Badge>
  );
}
