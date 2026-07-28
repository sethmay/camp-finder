# Proposed changes to `@opensourcescouting/design-system`

Design feedback from porting a real, data-dense app onto the system
(`feature/design-system-spike`; method and engineering findings in
[`DESIGN_SYSTEM_SPIKE.md`](./DESIGN_SYSTEM_SPIKE.md)). Every number below is measured against
`src/styles/tokens.css` @ `0.2.0-alpha.0` or read off the rendered page in Chromium.

Ordered by impact. Items 1-5 are the ones we hit hardest; 6-8 are structural suggestions that
would prevent the next consumer from hitting them.

**One theme runs through 1-5:** the system encodes brand personality in the tokens that carry
*depth and scale* — surface, radius, type size — and pushes each of them to an extreme that reads
as "unfinished" rather than "traditional" once you put a real UI on it. The per-program
differentiation the system actually pulls off well is `--os-rule-weight`, `--os-shadow`,
`--os-motion-*` and the display voice. Those are perceivable and they don't fight the app.

---

## 1. All three surface tokens are bound to the same value, in all five programs

**Problem.** `--background`, `--card` and `--popover` are identical in `:root` and in every
`[data-program]` block. There is no raised surface anywhere in the system, so nothing groups or
separates. The whole page is one flat plane.

**Evidence.** `tokens.css` lines 25/27/29, 94/96/98, 145/147/149, 189/191/193, 233/235/237:

| program | `--background` | `--card` | separation |
|---|---|---|---|
| parent | `#FFFFFF` | `#FFFFFF` | **1.00:1** |
| cub | `#FFFCF4` | `#FFFCF4` | **1.00:1** |
| scoutsbsa | `#F5F1E6` | `#F5F1E6` | **1.00:1** |
| venturing | `#F4F1E8` | `#F4F1E8` | **1.00:1** |
| seascouts | `#F0F4F8` | `#F0F4F8` | **1.00:1** |

Because all depth then has to come from `--os-shadow`, and the `forced-colors` block at line 300
sets `--os-shadow: none`, **every panel boundary in the system disappears entirely in Windows High
Contrast.** All that's left is `--border`, which in scoutsbsa is 2.36:1 against the page.

**Why this survived review:** in the parent brand it's white-on-white, which looks deliberate and
clean. The bug is only *visible* in the four tinted programs, so Storybook's default view hides it.

**Proposal.** Give `--card` (and `--popover`) a value distinct from `--background` in every
program. Two directions, both measured for scoutsbsa:

- **A — raise the card, keep the tan page.** `--card: 255 255 255` → **1.13:1** against the page.
- **B — keep tan paper as the card, drop the page.** `--background: 233 227 211` (`#E9E3D3`) →
  **1.14:1**.

For reference, the design this app shipped before the port used white cards on `#EDEAE1` at
**1.20:1**, and reads as properly layered. **A separation of ~1.1-1.2:1 is all a large-area fill
needs**; the goal is not a contrast threshold, it's to not be exactly zero.

We lean **B** for scoutsbsa — the tan *paper* is the brand idea, and white cards on tan is a
different (more generic) look. But either beats 1.00:1, and this is the single highest-value change
in this document.

> **Correction to our earlier writeup:** we initially framed this as a WCAG 1.4.11 failure. That
> was overstated for cards. 1.4.11's 3:1 applies to *UI component* boundaries and states, not to
> decorative surface-vs-surface fills — and our own preferred design is only 1.20:1. For cards this
> is a hierarchy and forced-colors-robustness problem, not a conformance one. Item 5 *is* a real
> 1.4.11 problem.

---

## 2. Form controls are painted with the page background

**Problem.** `controlClasses` (`src/components/Field.tsx:39`) is
`... border border-input bg-background px-3 py-2 ...`. So a text input's fill is the *page* colour,
and its only boundary is `--input`. In scoutsbsa that boundary is `#AD9D7B` at **2.36:1** against
the page it sits on. An input with no fill difference and a 2.36:1 outline does not read as an
enterable field — it reads as a caption with a line around it.

**This one is a genuine WCAG 1.4.11 failure**, unlike item 1: identifying the boundary of a form
control is exactly what that criterion covers, and 3:1 is the floor.

**Proposal**, two parts:

1. Change `controlClasses` from `bg-background` to `bg-card` — free once item 1 lands, and it makes
   controls sit on the raised surface the way every other design system does.
2. Raise `--input` to clear 3:1 against whatever surface controls sit on. For scoutsbsa,
   `#9A8862` = **3.06:1** vs the tan page and **3.46:1** vs a white card (today's `#AD9D7B` is
   2.36 / 2.66). Worth auditing `--input` per program against the same floor, and adding it to
   `tests/contrast.test.ts`, which currently covers text pairs but not control boundaries.

Keeping `--input` and `--border` as separate tokens matters here: `--border` can stay soft and
decorative for keylines and card edges, while `--input` gets held to the interactive floor. Right
now they're set to the same value in all five programs, which is what let this slip.

---

## 3. Radius is too tight, and the derived scale is invalid in two programs

**Problem A — the values.** `--radius` is `4px` in scoutsbsa (line 164), `2px` in venturing,
**`1px`** in seascouts. A 1px or 2px radius on a 500px-wide card is perceptually identical to a
square; it is not a brand signal, it's just an unrounded box. `Button` uses `rounded-lg` = the
program radius, so the primary CTA is a 44px-tall rectangle with a 4px corner.

The comments state the intent — "tight radii, traditional", "hairline", "near-sharp" — and we
understand the print/uniform derivation. Our observation is that below roughly 6px the signal
stops being legible as *intentional restraint* and starts reading as unstyled. The programs
already differ perceivably via `--os-rule-weight` (3/2/2/1px), `--os-shadow` (Cub's soft 14px
bloom vs Sea Scouts' 1px hairline) and `--os-motion-*` (bounce vs 90ms snap). Those carry the
personality without costing polish.

**Proposal A.** Raise the floor to ~6px and compress the spread:

| program | now | proposed |
|---|---|---|
| cub | 14px | 14px (unchanged — it works) |
| parent | 6px | 8px |
| scoutsbsa | 4px | **10px** (`0.625rem`) |
| venturing | 2px | 6px |
| seascouts | 1px | 6px |

10px for scoutsbsa is what this app used pre-port, and it's what the side-by-side button
comparison that prompted this document is showing.

**Problem B — an actual bug.** `theme.css:79-82` derives the scale as
`--radius-sm: calc(var(--radius) - 4px)` / `--radius-md: calc(var(--radius) - 2px)`:

| program | `--radius` | `--radius-sm` | `--radius-md` |
|---|---|---|---|
| parent | 6px | 2px | 4px |
| cub | 14px | 10px | 12px |
| scoutsbsa | 4px | **0px** | 2px |
| venturing | 2px | **-2px** | 0px |
| seascouts | 1px | **-3px** | -1px |

Negative `border-radius` is invalid, so `rounded-sm` / `rounded-md` silently do nothing in
Venturing and Sea Scouts. This is latent today because the primitives use `rounded-lg` — but
`TabsTrigger` already ships `rounded-md` (see item 8), so it's live.

**Proposal B.** Derive the scale multiplicatively, or clamp:
`--radius-sm: max(2px, calc(var(--radius) - 4px))`. Multiplicative is cleaner and keeps the ratio
meaningful across a 6px→14px spread:

```css
--radius-sm: calc(var(--radius) * 0.5);
--radius-md: calc(var(--radius) * 0.75);
--radius-lg: var(--radius);
--radius-xl: calc(var(--radius) * 1.5);
```

**Proposal C — radius should scale with element size.** One value for a 44px button and a 500px
card is the deeper issue; a 10px corner reads generous on the button and stingy on the card. If
you'd rather not add an axis to every component, at minimum let `Card` use `rounded-xl` and
controls use `rounded-lg`, so the ratio does the work.

---

## 4. The type scale starts too large, and it isn't a token

**Problem.** `Heading`'s scale is hardcoded in the component (`Heading.tsx:14-21`), not exposed as
tokens:

| `size` | rendered | | `size` | rendered |
|---|---|---|---|---|
| 1 | 36 / 48 / **60**px | | 4 | 20 / 24px |
| 2 | 30 / 36 / 48px | | 5 | 18 / 20px |
| 3 | 24 / 30px | | 6 | 16 / 18px |

A 60px `h1` consumes the top third of the viewport before any content. Measured in the app: "Find a
Scouts BSA summer camp" still wraps onto two lines at a 1125px viewport. There's also no rung
between size 1 and size 2 — the gap from 48px to 60px at `md` is the largest step in the scale.

The structural issue is that this is the **only** part of the visual language a consumer can't
retune. Colour, radius, shadow, rule weight, motion and the display voice are all tokens; type
size is baked into a component. Every other axis follows the system's own stated model
("per-program differentiation lives in CSS-var overrides only") and this one doesn't.

**Proposal.** Move the scale into tokens so it's overridable per program *and* per consumer, the
same way `--os-display-weight` / `--os-display-tracking` already are:

```css
--os-text-h1: 2.25rem;  --os-text-h1-md: 3rem;
--os-text-h2: 1.875rem; --os-text-h2-md: 2.25rem;
/* ... */
```

Then add a **`scale` axis on `Heading`**: `"editorial"` (today's values — `ProgramHero`, marketing,
landing pages) and `"ui"` (compressed — app chrome, dense pages), defaulting to `editorial` so
nothing breaks. A UI scale in the neighbourhood of 30/24/20/18/16/14px would suit an app; for
reference this app used 40/28/22/18/16 pre-port and never felt cramped.

That framing lets you keep the current look where it's right without forcing app consumers to
hand-roll size recipes — which is what we ended up doing (the 404 numeral is the one place we had
to write a size recipe by hand, because `Heading` also hardcodes `text-foreground`; a `tone` prop
would close that).

---

## 5. Net effect: the system has no way to express depth

Items 1-4 compound. With `--card == --background`, `--radius` at 4px, `--input` on the page fill
and a 60px `h1`, the result is a single flat plane with oversized type — visible in the
before/after screenshots that prompted this document. Individually each is a defensible restraint
call; together they remove every tool for visual hierarchy at once.

**Proposal.** Add one token and one recipe:

- **`--os-surface-sunken`** — for wells, table stripes, skeleton loaders, disabled tracks. Today
  the only option is `bg-muted/40`, which is 1.13:1 in scoutsbsa. Our loading skeletons were
  visible only because `animate-pulse` moved them.
- **A documented panel/band recipe**, so a page section that needs to read as a distinct band
  (a hero, a toolbar, a sidebar) has a token-legal answer. Right now `bg-card` on a page section
  is a no-op and consumers will reach for arbitrary values.

Then re-run `tests/contrast.test.ts` with **surface-vs-surface pairs added**, not just text pairs.
The existing text coverage is genuinely good — we verified `--os-on-surface-faint` at 3.07:1
against the scoutsbsa page, exactly as documented. The gap is that nothing tests whether two
surfaces differ at all, which is why 1.00:1 shipped in five palettes.

---

## 6. `Badge` is an eyebrow recipe, so it can't be a data chip

`badgeVariants` base is
`display inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] uppercase tracking-wider`.
For editorial kickers that's right. For *data values* it isn't: our feature labels are human Title
Case strings, so `Badge` rendered "Adirondack Shelters" as "ADIRONDACK SHELTERS" — ~15-20% wider at
`tracking-wider`, wrapping a 4-chip row onto a third line in a ~360px card.

We had to apply `normal-case tracking-normal text-xs` at **every** badge site. Defeating three of
the recipe's five base utilities everywhere is the signal.

**Proposal.** Either a `case` / `emphasis` axis on `Badge`, or a separate `Chip` primitive for data
values. Also worth adding: **a `warning` tone**. Status colour currently lives only in `Alert`,
which is a block-level banner with `role="status"` — unusable for a 12px inline "may be outdated"
badge beside a card title. We ended up carrying that warning with a glyph and words only, which
across 50 list rows means the eye no longer catches it.

## 7. `badgeVariants` has no focus treatment, which makes borrowed chips keyboard-invisible

`Badge` is a `<span>`, so it legitimately has no `focus-visible` styling. But it's the only
chip-shaped recipe in the package, so anyone building a toggle chip borrows it — and silently ships
a control with no visible focus state. We had to re-paste the DS's own
`focus-visible:outline-2 outline-offset-2 outline-ring`.

**Proposal.** Ship the missing primitive (`ToggleGroup` or an interactive `Chip`), or export the
focus recipe as a documented utility so borrowing it is a one-liner instead of a rediscovery.
This is the sharpest edge we hit, because the failure is invisible to anyone testing with a mouse.

## 8. Two places where the system breaks its own rules

Small, but they mean the rules can't be enforced by auditing consumer code alone:

- **`TabsTrigger` ships `rounded-md`**, which isn't in the documented two-value radius vocabulary
  (`rounded-lg` / `rounded-full`) — and per item 3B that value is invalid in two programs.
- **`TabsList` is `h-10`** (40px), under the 44px hit-target floor. We forced `h-auto` on the list
  and a min-height on the triggers. More generally, nothing in the public types guarantees any
  control clears 44px: `TextInput` and `NativeSelect` are `h-11` today — exactly 44px with zero
  margin — but that's an implementation detail in the bundle, so a future bump to `h-10` would drop
  consumers below WCAG 2.5.8 with no type error and no visual regression a reviewer would notice.

Also worth surfacing while we're here: **`Tabs`' active state is ~1.36:1** in scoutsbsa (track
`--muted` `#D6CEBD`, active trigger `--background` `#F5F1E6`). The shadcn "lift out of the muted
track" idiom assumes white-on-grey; on two tans the only reliable cue for the selected view is text
colour. This is item 1 reappearing one token over, and it's why we'd rather see the surface
hierarchy fixed in the palette than patched per component.

---

## What we are *not* asking for

The multi-program architecture is the right call and it works. `data-program` on `<html>` themed
every plain Astro file with zero JS; portal re-stamping worked exactly as documented; theme nesting
worked. Our fixes above are all token *values* and one component axis — none of them require
touching the mechanism. Likewise the display-voice differentiation (weight / tracking / style /
transform per program) is a genuinely nice idea that costs nothing at the call site.

Engineering-side items — the package being uninstallable from npm, the Windows build failure, the
`Dialog` / `aria-hidden` interaction, the missing Sheet / Slider / ToggleGroup / Link primitives,
and the Astro integration traps — are in
[`DESIGN_SYSTEM_SPIKE.md`](./DESIGN_SYSTEM_SPIKE.md) §A, §B, §D and §F, with a ready-to-apply patch
for the first two at `.workbench/design-system-upstream-fixes.patch`.
