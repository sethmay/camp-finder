import { Compass, SearchX } from "lucide-react";

// Two first-run/empty variants (design §4.1): no ZIP yet vs. no results.
export default function EmptyState({
  variant,
  onClear,
}: {
  variant: "no-results" | "no-query";
  onClear?: () => void;
}) {
  if (variant === "no-query") {
    return (
      <div className="rounded-md border border-dashed border-border bg-surface p-8 text-center">
        <Compass size={32} className="mx-auto text-primary" aria-hidden="true" />
        <p className="mt-3 font-display text-h3 text-ink">Find a summer camp</p>
        <p className="mt-1 text-sm text-muted">
          Enter your ZIP code to sort camps by distance. Results update instantly.
        </p>
      </div>
    );
  }
  return (
    <div className="rounded-md border border-dashed border-border bg-surface p-8 text-center">
      <SearchX size={32} className="mx-auto text-muted" aria-hidden="true" />
      <p className="mt-3 font-display text-h3 text-ink">No camps match those filters</p>
      <p className="mt-1 text-sm text-muted">Try widening the distance, or clearing the state, program, and feature filters.</p>
      {onClear && (
        <button
          type="button"
          onClick={onClear}
          className="cf-tap mt-4 inline-flex items-center rounded-md bg-primary px-4 font-semibold text-surface hover:bg-primary-700"
        >
          Clear all filters
        </button>
      )}
    </div>
  );
}
