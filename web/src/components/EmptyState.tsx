import { Compass, SearchX } from "lucide-react";
import { Button, Card, Heading } from "@opensourcescouting/design-system";

// Two first-run/empty variants (design §4.1): no ZIP yet vs. no results.
// `flat` is the only Card variant whose fill differs from the page tan at all;
// the dashed edge has to be spelled out in full because `flat` ships no border.
const PANEL = "border border-dashed border-border p-8 text-center";

export default function EmptyState({
  variant,
  onClear,
}: {
  variant: "no-results" | "no-query";
  onClear?: () => void;
}) {
  if (variant === "no-query") {
    return (
      <Card variant="flat" className={PANEL}>
        <Compass size={32} className="mx-auto text-primary" aria-hidden="true" />
        <Heading level={2} size={4} className="mt-3">
          Find a summer camp
        </Heading>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter your ZIP code to sort camps by distance. Results update instantly.
        </p>
      </Card>
    );
  }
  return (
    <Card variant="flat" className={PANEL}>
      <SearchX size={32} className="mx-auto text-muted-foreground" aria-hidden="true" />
      <Heading level={2} size={4} className="mt-3">
        No camps match those filters
      </Heading>
      <p className="mt-1 text-sm text-muted-foreground">
        Try widening the distance or the July temperature cap, or clearing the state, program, and
        feature filters.
      </p>
      {onClear && (
        <Button variant="primary" size="md" onClick={onClear} className="mt-4">
          Clear all filters
        </Button>
      )}
    </Card>
  );
}
