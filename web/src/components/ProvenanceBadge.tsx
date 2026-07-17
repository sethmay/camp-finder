import { ExternalLink } from "lucide-react";
import { formatVerified } from "@lib/format";

// "Source: <link> · Last verified <Mon Year>" — every displayed fact is traceable.
export default function ProvenanceBadge({
  sourceUrl,
  verifiedAt,
}: {
  sourceUrl: string;
  verifiedAt: string;
}) {
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
      <span>
        Source:{" "}
        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-primary underline underline-offset-2"
        >
          council page
          <ExternalLink size={11} aria-hidden="true" />
        </a>
      </span>
      <span aria-hidden="true">·</span>
      <span>Last verified {formatVerified(verifiedAt)}</span>
    </p>
  );
}
