import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Check, ChevronDown, ChevronRight, Minus, X } from "lucide-react";
import type { Camp } from "@lib/types";
import { isValidZip, type Centroid } from "@lib/zip";
import {
  expandFeatures,
  FEATURE_CATEGORIES,
  featureLabel,
  formatVerified,
  isStale,
} from "@lib/format";
import {
  campDistanceMiles,
  categoryCount,
  dotTrack,
  elevationNote,
  featureDiffers,
  featureMark,
  formatDistance,
  formatElevation,
  isAreaGeo,
  isSurveyed,
  nearestCampId,
  tempNote,
  type FeatureMark,
} from "@lib/compare";

// Non-token palette from the design handoff (the amber "data gap" family, inner rules, panel
// fill). None of these has a design-system token; every colour that DOES is used via its token.
const AMBER_TEXT = "#6B4708";
const AMBER_BORDER = "#8A5A0B";
const AMBER_FILL = "#FBF3E3";
const PANEL_FILL = "#FAF7F0";
const PRIMARY_FILL = "#1D5E42"; // == --primary; used where a raw hex is needed (dot track, marks)
const SERIF = "var(--os-font-body)"; // Source Serif 4 — the one editorial touch (signature)

const TERM_TOTAL = FEATURE_CATEGORIES.reduce((n, c) => n + c.members.length, 0);

export default function CompareTable({
  camps,
  origin,
  zip,
  onSetZip,
  open,
  onToggleOpen,
  onlyDiff,
  onRemove,
  verifyHref,
}: {
  camps: Camp[];
  origin: Centroid | null;
  zip: string | null;
  onSetZip: (zip: string | null) => void;
  open: Set<string>;
  onToggleOpen: (key: string) => void;
  onlyDiff: boolean;
  onRemove: (id: string) => void;
  verifyHref: string;
}) {
  const headerRef = useRef<HTMLDivElement>(null);
  const [headerH, setHeaderH] = useState(120);

  // Measure the sticky camp row so section headers pin directly beneath it — its height changes
  // with long names and badge wrapping, so a hard-coded offset would drift (handoff warns on this).
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setHeaderH(el.offsetHeight));
    ro.observe(el);
    setHeaderH(el.offsetHeight);
    return () => ro.disconnect();
  }, [camps.length]);

  const cols: CSSProperties = {
    gridTemplateColumns: `var(--compare-gutter) repeat(${camps.length}, minmax(0, 1fr))`,
  };
  const sectionTop: CSSProperties = { top: "var(--compare-header-h)" };
  const expandedById = useMemo(
    () => new Map(camps.map((c) => [c.id, expandFeatures(c.features)])),
    [camps],
  );
  const nearestId = nearestCampId(camps, origin);

  return (
    <div
      style={{ ["--compare-header-h"]: `${headerH}px` } as CSSProperties}
      className="[--compare-gutter:176px] max-lg:overflow-x-auto max-lg:[--compare-gutter:120px]"
    >
      <div className="min-w-[680px]">
        {/* Sticky camp header row */}
        <div
          ref={headerRef}
          style={cols}
          className="sticky top-0 z-20 grid gap-2 bg-background pb-3 pt-[10px] shadow-[0_8px_12px_-8px_rgba(34,39,28,0.28)]"
        >
          <div className="sticky left-0 z-[1] flex items-end bg-background pb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Camp
          </div>
          {camps.map((camp) => (
            <div
              key={camp.id}
              className="relative flex flex-col gap-2 rounded-[var(--radius)] border border-border bg-card p-3"
            >
              <div className="pr-7 text-[15px] font-semibold leading-tight tracking-[-0.01em] text-foreground">
                {camp.name}
              </div>
              <div className="text-[11px] leading-snug text-muted-foreground">
                {[camp.city, camp.state].filter(Boolean).join(", ") || "Location not listed"}
              </div>
              <div className="mt-auto flex flex-wrap gap-1">
                <VerifyBadge camp={camp} />
              </div>
              <button
                type="button"
                onClick={() => onRemove(camp.id)}
                aria-label={`Remove ${camp.name} from comparison`}
                className="absolute right-1 top-1 flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-[#F7F4EC] hover:text-foreground"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>

        {/* Card 1 — the decision */}
        <section className="overflow-clip rounded-[var(--radius)] border border-border bg-card">
          <SectionHeader style={sectionTop}>The decision</SectionHeader>

          {/* Distance */}
          <div style={cols} className="grid items-center gap-2 border-b border-[#E2DAC7] p-[14px]">
            <RowLabel>
              <div className="text-[13px] font-semibold text-foreground">
                Distance{zip ? ` from ${zip}` : ""}
              </div>
              {zip && (
                <div className="mt-0.5 text-[11px] text-muted-foreground">
                  Straight-line miles ·{" "}
                  <button type="button" onClick={() => onSetZip(null)} className="text-primary underline">
                    change
                  </button>
                </div>
              )}
            </RowLabel>
            {zip
              ? camps.map((camp) => {
                  const area = isAreaGeo(camp);
                  const text = formatDistance(campDistanceMiles(camp, origin), area);
                  return (
                    <div key={camp.id}>
                      <span className="sr-only">{camp.name}: distance </span>
                      <span className="text-[19px] font-semibold tracking-[-0.01em] text-foreground">
                        {text ?? "—"}
                      </span>
                      {camp.id === nearestId && (
                        <span className="mt-[5px] block w-fit rounded-full px-[7px] py-[3px] text-[10px] font-semibold text-white" style={{ backgroundColor: PRIMARY_FILL }}>
                          Nearest
                        </span>
                      )}
                      {area && text && (
                        <span className="mt-[5px] block text-[10px]" style={{ color: AMBER_TEXT }}>
                          ≈ camp area, not a gate
                        </span>
                      )}
                    </div>
                  );
                })
              : camps.map((camp) => (
                  <div key={camp.id} className="text-[13px] text-muted-foreground">
                    —
                  </div>
                ))}
          </div>
          {!zip && <ZipPrompt onSet={onSetZip} />}

          {/* July high/low */}
          <DecisionRow
            cols={cols}
            label="July high / low"
            sublabel="30-yr average °F"
            camps={camps}
            render={(camp) => {
              if (camp.july_high_f === null)
                return <span className="text-[13px] text-muted-foreground">Not on record</span>;
              const note = tempNote(camp.july_high_f);
              return (
                <>
                  <span className="sr-only">{camp.name}: July high/low </span>
                  <span className="text-[19px] font-semibold tracking-[-0.01em] text-foreground">
                    {camp.july_high_f}°
                  </span>
                  {camp.july_low_f !== null && (
                    <span className="text-[15px] font-medium text-muted-foreground"> / {camp.july_low_f}°</span>
                  )}
                  {note && <span className="mt-1 block text-[12px] text-muted-foreground">{note}</span>}
                </>
              );
            }}
          />

          {/* Elevation */}
          <DecisionRow
            cols={cols}
            label="Elevation"
            camps={camps}
            render={(camp) => {
              const text = formatElevation(camp.elevation_ft, isAreaGeo(camp));
              if (!text) return <span className="text-[13px] text-muted-foreground">Not on record</span>;
              const note = elevationNote(camp.elevation_ft);
              return (
                <>
                  <span className="sr-only">{camp.name}: elevation </span>
                  <span className="text-[15px] font-semibold text-foreground">{text}</span>
                  {note && <span className="mt-1 block text-[12px] text-muted-foreground">{note}</span>}
                </>
              );
            }}
          />

          {/* Operator council */}
          <DecisionRow
            cols={cols}
            label="Operator council"
            alignStart
            last
            camps={camps}
            render={(camp) => (
              <>
                <span className="text-[13px] leading-snug text-foreground">
                  {camp.council_name ??
                    (camp.operator === "national" ? "National high-adventure base" : "—")}
                </span>
                {(camp.council_website || camp.url) && (
                  <a
                    href={camp.council_website || camp.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1.5 block text-[12px] font-semibold text-primary underline"
                  >
                    Council page →
                  </a>
                )}
              </>
            )}
          />
        </section>

        {/* Card 2 — signature */}
        <section className="mt-3 overflow-clip rounded-[var(--radius)] border border-border bg-card">
          <SectionHeader style={sectionTop}>Signature — things only this camp has</SectionHeader>
          <div style={cols} className="grid items-start gap-2 p-[14px]">
            <RowLabel>
              <div className="text-[13px] font-semibold text-foreground">Why leaders pick it</div>
            </RowLabel>
            {camps.map((camp) => (
              <div key={camp.id}>
                <SignatureCell camp={camp} verifyHref={verifyHref} />
              </div>
            ))}
          </div>
        </section>

        {/* Card 3 — program features */}
        <section className="mt-3 overflow-clip rounded-[var(--radius)] border border-border bg-card">
          <div
            style={sectionTop}
            className="sticky z-10 flex flex-wrap items-center justify-between gap-2 border-b border-[#E2DAC7] bg-[#F7F4EC] px-[14px] py-[11px]"
          >
            <h3 className="display text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Program features · {TERM_TOTAL} terms in {FEATURE_CATEGORIES.length} categories
            </h3>
            <Legend />
          </div>

          {FEATURE_CATEGORIES.map((cat) => {
            const isOpen = open.has(cat.key);
            const panelId = `compare-panel-${cat.key}`;
            const memberRows = isOpen
              ? onlyDiff
                ? cat.members.filter((code) => featureDiffers(camps, code, expandedById))
                : cat.members
              : [];
            return (
              <div key={cat.key}>
                <div style={cols} className="grid items-center gap-2 border-b border-[#E2DAC7] px-[14px] py-3">
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => onToggleOpen(cat.key)}
                    style={{ scrollMarginTop: "calc(var(--compare-header-h) + 52px)" }}
                    className="sticky left-0 z-[1] flex min-h-[44px] items-center gap-1.5 bg-card text-left text-[13px] font-semibold text-foreground"
                  >
                    {isOpen ? (
                      <ChevronDown size={14} className="text-muted-foreground" aria-hidden="true" />
                    ) : (
                      <ChevronRight size={14} className="text-muted-foreground" aria-hidden="true" />
                    )}
                    {cat.label}
                  </button>
                  {camps.map((camp) => {
                    const tally = categoryCount(camp, cat.members, expandedById.get(camp.id));
                    if (!tally)
                      return (
                        <div key={camp.id}>
                          <span className="text-[13px] font-semibold" style={{ color: AMBER_TEXT }}>
                            not surveyed
                          </span>
                          <span
                            className="block font-mono text-[12px] leading-none tracking-[0.1em]"
                            style={{ color: AMBER_TEXT }}
                            aria-hidden="true"
                          >
                            {"·".repeat(cat.members.length)}
                          </span>
                        </div>
                      );
                    return (
                      <div key={camp.id}>
                        <span className="sr-only">
                          {camp.name}: {cat.label},{" "}
                        </span>
                        <span className="text-[13px] font-semibold text-foreground">
                          {tally.n} of {tally.of}
                        </span>
                        <span
                          className="block break-all font-mono text-[12px] leading-none tracking-[0.1em]"
                          style={{ color: PRIMARY_FILL }}
                          aria-hidden="true"
                        >
                          {dotTrack(tally.n, tally.of)}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {isOpen && (
                  <div id={panelId} style={{ backgroundColor: PANEL_FILL }}>
                    {memberRows.length === 0 ? (
                      <div className="px-[14px] py-2 pl-[30px] text-[12px] text-muted-foreground">
                        {onlyDiff ? "No differences in this category." : "No features listed."}
                      </div>
                    ) : (
                      memberRows.map((code) => (
                        <div
                          key={code}
                          style={cols}
                          className="grid items-center gap-2 border-b border-[#EFEADD] py-2 pl-[30px] pr-[14px]"
                        >
                          <div
                            className="sticky left-0 z-[1] text-[12px] text-muted-foreground"
                            style={{ backgroundColor: PANEL_FILL }}
                          >
                            {featureLabel(code)}
                          </div>
                          {camps.map((camp) => (
                            <div key={camp.id}>
                              <Mark
                                state={featureMark(camp, code, expandedById.get(camp.id))}
                                label={`${camp.name}: ${featureLabel(code)}`}
                              />
                            </div>
                          ))}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}

          <p className="px-[14px] py-3 text-[12px] leading-relaxed text-muted-foreground">
            A solid green <span className="font-semibold" style={{ color: PRIMARY_FILL }}>✓</span> is the
            only mark that means “offered.” A dashed <span style={{ color: "#6E6449" }}>−</span> means we
            surveyed the camp and it genuinely doesn't offer that. An amber{" "}
            <span className="font-semibold" style={{ color: AMBER_TEXT }}>?</span> means we've never
            surveyed that camp — unknown, not “no.”
          </p>
        </section>
      </div>
    </div>
  );
}

// --- pieces ------------------------------------------------------------------

function SectionHeader({ children, style }: { children: React.ReactNode; style?: CSSProperties }) {
  return (
    <h3
      style={style}
      className="display sticky z-10 border-b border-[#E2DAC7] bg-[#F7F4EC] px-[14px] py-[11px] text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
    >
      {children}
    </h3>
  );
}

function RowLabel({ children }: { children: React.ReactNode }) {
  return <div className="sticky left-0 z-[1] bg-card">{children}</div>;
}

function DecisionRow({
  cols,
  label,
  sublabel,
  camps,
  render,
  alignStart,
  last,
}: {
  cols: CSSProperties;
  label: string;
  sublabel?: string;
  camps: Camp[];
  render: (camp: Camp) => React.ReactNode;
  alignStart?: boolean;
  last?: boolean;
}) {
  return (
    <div
      style={cols}
      className={`grid gap-2 p-[14px] ${alignStart ? "items-start" : "items-center"} ${
        last ? "" : "border-b border-[#E2DAC7]"
      }`}
    >
      <RowLabel>
        <div className="text-[13px] font-semibold text-foreground">{label}</div>
        {sublabel && <div className="mt-0.5 text-[11px] text-muted-foreground">{sublabel}</div>}
      </RowLabel>
      {camps.map((camp) => (
        <div key={camp.id}>{render(camp)}</div>
      ))}
    </div>
  );
}

function VerifyBadge({ camp }: { camp: Camp }) {
  const when = camp.features_verified_at;
  if (when === null || isStale(when)) {
    return (
      <span
        className="rounded-full border px-[7px] py-[3px] text-[10px] font-semibold"
        style={{ color: AMBER_TEXT, borderColor: AMBER_BORDER, backgroundColor: AMBER_FILL }}
      >
        {when === null ? "Features not surveyed" : `▲ Checked ${formatVerified(when)}`}
      </span>
    );
  }
  return (
    <span className="rounded-full border border-primary bg-[#F1F6F2] px-[7px] py-[3px] text-[10px] font-semibold text-primary">
      ✓ Verified {formatVerified(when)}
    </span>
  );
}

function SignatureCell({ camp, verifyHref }: { camp: Camp; verifyHref: string }) {
  if (!isSurveyed(camp))
    return (
      <p className="text-[12px]" style={{ color: AMBER_TEXT }}>
        Not surveyed yet —{" "}
        <a href={verifyHref} className="underline">
          help us verify
        </a>
      </p>
    );
  if (camp.features_signature.length === 0)
    return <p className="text-[12px] text-muted-foreground">Surveyed — none flagged</p>;
  return (
    <p className="text-[14px] leading-snug text-foreground" style={{ fontFamily: SERIF }}>
      {camp.features_signature.map((c) => featureLabel(c)).join(", ")}
    </p>
  );
}

function Mark({
  state,
  label,
  decorative,
}: {
  state: FeatureMark;
  label?: string;
  decorative?: boolean; // legend glyphs are labelled by adjacent visible text
}) {
  const suffix =
    state === "offered" ? "offered" : state === "not_offered" ? "not offered" : "not surveyed";
  const sr = decorative ? null : <span className="sr-only">{`${label} — ${suffix}`}</span>;
  if (state === "offered")
    return (
      <span
        aria-hidden={decorative || undefined}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full text-white"
        style={{ backgroundColor: PRIMARY_FILL }}
      >
        <Check size={12} strokeWidth={3} aria-hidden="true" />
        {sr}
      </span>
    );
  if (state === "not_offered")
    return (
      <span
        aria-hidden={decorative || undefined}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-dashed"
        style={{ borderColor: "#A79877", color: "#6E6449" }}
      >
        <Minus size={13} aria-hidden="true" />
        {sr}
      </span>
    );
  return (
    <span
      aria-hidden={decorative || undefined}
      className="inline-flex h-5 min-w-5 items-center justify-center rounded-full border px-1.5 text-[10px] font-bold"
      style={{ backgroundColor: AMBER_FILL, borderColor: AMBER_BORDER, color: AMBER_TEXT }}
    >
      ?{sr}
    </span>
  );
}

function Legend() {
  return (
    <div className="inline-flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
        <Mark state="offered" decorative />
        offered
      </span>
      <span className="inline-flex items-center gap-1.5">
        <Mark state="not_offered" decorative />
        not offered
      </span>
      <span className="inline-flex items-center gap-1.5">
        <Mark state="not_surveyed" decorative />
        not surveyed
      </span>
    </div>
  );
}

function ZipPrompt({ onSet }: { onSet: (zip: string) => void }) {
  const [value, setValue] = useState("");
  const valid = isValidZip(value);
  const submit = () => {
    if (valid) onSet(value.trim().slice(0, 5));
  };
  return (
    <div
      className="mx-[14px] mb-[14px] rounded-[var(--radius)] border p-3"
      style={{ backgroundColor: AMBER_FILL, borderColor: AMBER_BORDER }}
    >
      <div className="text-[12px] font-semibold" style={{ color: AMBER_TEXT }}>
        Add your ZIP to see distances
      </div>
      <div className="mt-2 flex gap-2">
        <input
          type="text"
          inputMode="numeric"
          value={value}
          placeholder="ZIP code"
          aria-label="Home ZIP code"
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          className="min-h-[44px] w-32 rounded-[var(--radius)] border border-input bg-card px-3 text-[13px]"
        />
        <button
          type="button"
          onClick={submit}
          disabled={!valid}
          className="min-h-[44px] rounded-[var(--radius)] px-4 text-[13px] font-semibold text-white disabled:opacity-50"
          style={{ backgroundColor: PRIMARY_FILL }}
        >
          Go
        </button>
      </div>
    </div>
  );
}
