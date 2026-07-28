# Design System Spike — `@opensourcescouting/design-system`

**Branch `feature/design-system-spike`. Do not merge without explicit approval.**

Retheme of the whole Camp Finder UI onto the Open Source Scouting design system
(`.claude/design_system` @ `0.2.0-alpha.0`, storybook at
<https://opensourcescouting.github.io/design-system>), run as a throwaway to find out what
adoption actually costs. It works end to end; the findings below are the deliverable.

## Verified state

| Check | Result |
|---|---|
| `npm run check` (astro type-check, 32 files) | 0 errors, 0 warnings, 0 hints |
| `npm run test` (vitest, pure lib logic) | 35/35 pass |
| `npm run build` | 451 pages, 8.0s |
| Browser smoke (Chromium, 1280x900 + 414x896) | `/`, `/about`, `/404`, and camp detail in three data states (stale, geo, no-geo). **0 console errors, 0 warnings** |
| Filter/URL behaviour | 448 -> chip/state/temp/search filters -> `?prog=`/`?feat=`/`?state=`/`?maxtemp=`/`?q=` sync intact; Clear all restores 448 |
| MapLibre instance across view toggle | canvas element identity preserved — map is never re-initialised |
| `--cf-*` legacy tokens remaining | zero, in any rendered page |

## What the migration actually took

**Toolchain (unavoidable, do this first).** The design system is Tailwind **v4**, configured in
CSS with `@theme inline` + `@utility`. Camp Finder was Tailwind **v3.4** via `@astrojs/tailwind`.
Astro 4.16 ships Vite 5.4, which satisfies `@tailwindcss/vite`'s `vite: ^5.2` peer — **no Astro
upgrade needed.**

- `@astrojs/tailwind` -> `@tailwindcss/vite` in `astro.config.mjs` `vite.plugins`.
- Deleted `web/tailwind.config.mjs` and `web/src/styles/tokens.css`. The palette, type, radius,
  shadow and motion scales now come entirely from the DS.
- `web/src/styles/global.css` is 3 imports + one `@utility cf-tap`. **The `@source` line is
  load-bearing and undocumented** — see finding B3.
- `data-program="scoutsbsa"` on `<html>` in `Base.astro`. That one attribute themes every plain
  `.astro` file with zero JS; `ScoutThemeProvider` is only needed at the two hydrated island roots.
- `lucide-react` 0.446 -> 1.27 (the DS depends on `^1.17`; sharing one copy beats bundling two).
  Renames required: `AlertTriangle`->`TriangleAlert`, `Home`->`House`, `Waves`->`WavesHorizontal`.
- Fonts: Libre Franklin / Public Sans / IBM Plex Mono -> Montserrat + Source Serif 4. **App body
  copy is now a serif.**

**Class rename (mechanical, 189 substitutions across 16 files).** 1:1 map, no judgement:
`bg-bg`->`bg-background`, `bg-surface`->`bg-card`, `text-surface`->`text-primary-foreground`,
`text-ink`->`text-foreground`, `text-muted`->`text-muted-foreground`,
`hover:bg-primary-700`->`hover:bg-primary/90`, `shadow-sh-1`->`shadow-program`,
`rounded-pill`->`rounded-full`, `rounded-sm|md`->`rounded-lg`, `font-display`->`display`, and the
`text-display|h1|h2|h3|body` scale -> the DS `Heading` size recipes.

**Structural port (21 files).** Every hand-rolled primitive replaced: `Heading`, `Button` /
`buttonVariants`, `Badge` / `badgeVariants`, `Card` / `cardVariants`, `Alert`, `Field` +
`TextInput` / `NativeSelect`, Radix `Dialog`, Radix `Tabs`. MapLibre paint colours now derive
from the exported `TOKENS` object.

### Genuine wins

- The mobile filter sheet was a `fixed inset-0` div with **no `role="dialog"`, no focus trap, no
  Escape, no scroll lock**. It is now a Radix `Dialog` that has all four (verified live).
- The list/map toggle was two `aria-pressed` buttons; it is now real `tablist`/`tab`/`tabpanel`
  with arrow-key navigation, *and* the map still survives toggling.
- `Field` gave the sort and state selects real `<label for>`/`id` pairing they never had.
- Empty states became real `<h2>`s instead of `<p>`s styled to look like headings.
- **DS React components render in `.astro` with no `client:*` directive** — static HTML, zero JS
  shipped, and `Heading` emits a real `h1`..`h6`. Better ergonomics than expected.

---

## Findings

### A. Blockers in the design system (fix upstream before anyone adopts it)

**A1. The published package is uninstallable. Reproduced against the registry.**
`package.json` has `"preinstall": "node scripts/check-npm-version.mjs"`, but `files` is
`["dist", "NOTICE.md"]` — `scripts/` is never shipped. npm runs a dependency's `preinstall`, so
every consumer install dies:

```
npm error command failed
npm error command ... node scripts/check-npm-version.mjs
npm error Cannot find module '.../node_modules/@opensourcescouting/design-system/scripts/check-npm-version.mjs'
```

Confirmed on `@opensourcescouting/design-system@0.1.1` from npm, in a clean throwaway project —
so the currently-published version cannot be installed by anybody. Fixed locally by adding
`scripts/check-npm-version.mjs` to `files` and early-exiting the guard when it detects it is
running from inside a `node_modules` tree (the lockfile concern it guards is about developing
*that* repo, and is irrelevant to consumers).

**A2. `npm run build` cannot complete on Windows.** `scripts/build-css.mjs` invoked
`node_modules/.bin/tailwindcss` through `execFileSync`. On Windows the extensionless npm shim is
not executable (`ENOENT`), and switching to `tailwindcss.cmd` hits Node >=20's refusal to spawn
`.cmd` without a shell (`EINVAL`). Fixed locally by resolving `@tailwindcss/cli/dist/index.mjs`
and running it with `process.execPath`. **`dist/` is a build artifact, so this blocks any Windows
contributor from producing the package at all.**

**A3. README "Path B" is incomplete, and the failure mode is silent.** Path B tells you to
`@import` the `tokens` and `theme` exports and says "your build regenerates the program and shadcn
utilities". It omits that **Tailwind never scans `node_modules`**, so the utilities baked into the
DS's own components (`shadow-program`, `border-b-rule`, `duration-program`, `ease-program`, the
`Button`/`Card` recipes) are never emitted. Components render structurally correct and completely
unstyled. The fix belongs in the README:

```css
@source "../../node_modules/@opensourcescouting/design-system/dist";
```

### B. Accessibility bugs in the design system

**B1. `Dialog` can leave the page behind it exposed to screen readers, and ships no `aria-modal`.**
Measured with the filter dialog open: every `document.body` child received
`aria-hidden="true"` **except `<main>`**. Root cause is `aria-hidden/dist/es2015/index.js:131-133`,
which deliberately keeps every `[aria-live]` element visible (its issue #10) — the result counter
is `role="status" aria-live="polite"` inside `<main>`, so the entire results list, including both
`role="tab"`s, stayed in the AT tree behind the modal. Focus trap and pointer blocking work; only
the virtual cursor leaks. Worked around at the call site with `aria-modal="true"`. **Any consumer
with a live region anywhere on the page has this bug and will never notice it.** The DS should set
`aria-modal` on `DialogContent` or expose Radix's `shards`.

**B2. `badgeVariants` has no `focus-visible` treatment, so using it as a control skin silently
produces a keyboard-inaccessible control.** `Badge` is a `<span>` and never needed one. It is
nonetheless the only chip-shaped recipe in the package, so every consumer building a toggle chip
has to re-paste the DS's own `focus-visible:outline-2 outline-offset-2 outline-ring`. Sharpest edge
in the package.

**B3. `TabsList` is `h-10` (40px), below the 44px hit-target floor.** Needed `h-auto` on the list
plus `cf-tap` on the triggers. Relatedly, **nothing in the public types guarantees any DS control
clears 44px** — `TextInput`/`NativeSelect` are `h-11` today, exactly 44px with zero margin, but
that is an implementation detail in the bundle. A minor bump to `h-10` would drop this app below
WCAG 2.5.8 with no type error and no visual regression a reviewer would catch.

**B4. `DialogContent` has no height cap and no overflow.** It is `grid gap-4 ... p-6` and nothing
else, so any form taller than the viewport runs off the bottom unreachable. Needed
`max-h-[85vh] overflow-y-auto` by hand (verified load-bearing: `scrollHeight > clientHeight`).
There is no sticky-footer scaffold either — the DS's own `EventDialog` reimplements one internally
— so the whole dialog scrolls and the "Show N camps" CTA sits below the fold.

**B5. `TabsTrigger` ships `rounded-md`, which is not in the DS's own two-value radius vocabulary**
(`rounded-lg` / `rounded-full`). The DS breaks its own rule internally, so the rule cannot be
enforced by auditing consumer code alone.

**B6. `DialogContent` trips Radix's missing-description warning by default.** It does not pass
`aria-describedby={undefined}`; `EventDialog` does it internally, so the knowledge is in the
package but plain `DialogContent` users must rediscover it.

### C. The palette does not work for a data-dense app

**C1. `--card` and `--background` are the same colour — and not just in `scoutsbsa`.** Measured
live: page and card are both `rgb(245, 241, 230)`. So `Card variant="outlined"` is a 1.00:1 fill and
`elevated` separates by **drop shadow only**. The borders do not rescue it either:

| boundary | contrast vs page |
|---|---|
| `border-border/30` (what `cardVariants elevated` ships) | 1.26:1 |
| `border-border/60` (`outlined`) | 1.62:1 |
| `border-border` at full strength | 2.36:1 |
| `bg-muted/40` (`flat`) | 1.13:1 |

Checking `tokens.css` afterwards, **`--background`, `--card` and `--popover` are bound to one value
in all five programs**, so this is systemic, not a `scoutsbsa` quirk. It is only *visible* in the
four tinted programs — the parent brand is white-on-white, which reads as deliberate, so Storybook's
default view hides it. Concretely here: the index hero's `bg-card` band is an invisible section
marked only by a 1px border, and the loading skeleton is visible only because `animate-pulse` moves
it. Worse, the `forced-colors` block sets `--os-shadow: none`, so in Windows High Contrast every
panel boundary in the system disappears outright.

⚠ **Correction to an earlier draft of this section:** we first called this a WCAG 1.4.11 failure.
That is overstated for cards — 1.4.11's 3:1 applies to *UI component* boundaries and states, not
decorative surface-vs-surface fills, and the design this app shipped pre-port is itself only 1.20:1
(white `#FFFFFF` on `#EDEAE1`) and reads as properly layered. **~1.1-1.2:1 is all a large-area fill
needs**; the problem is that 1.00:1 is exactly zero. Where 1.4.11 *is* genuinely violated is form
controls — see C5.

**C2. The same collision reappears in `Tabs`.** Track is `--muted` `rgb(214,206,189)`, active
trigger is `--background` `rgb(245,241,230)` — a ~1.36:1 step. The shadcn "lift out of the muted
track" idiom assumes white-on-grey; on two tans the only reliable cue for the selected view is text
colour. The control it replaced used a filled `bg-primary` state and was unmistakable.

**C3. No `primary` ramp, and `primary` is already near-black.** `#243E2C`, relative luminance
~0.04. The DS's answer for interactive primary states is the opacity idiom (`hover:bg-primary/90`),
which cannot work in a MapLibre paint expression — you cannot composite alpha against "whatever
basemap pixel is underneath" and get a predictable colour. So the one place that genuinely needs a
discrete darker primary is the one place the DS's mechanism cannot reach, and "darker on select" is
effectively dead as a map affordance. The selected-reservation cue on the map is materially worse
than before and no token in the palette fixes it.

**C4. `--os-accent` for `scoutsbsa` is Scouting America Blue `rgb(0,63,135)`.** Doing the
token-correct thing turned the header's warm rust accent (`#B5551F`) into cold navy against a green
tent on tan paper. There is no warm accent anywhere in the palette to substitute. Defensible as
"the DS is the source of truth now", but it is an identity change — **someone should eyeball the
header and confirm they want it.**

**C5. Form controls are painted with the page background — a real WCAG 1.4.11 failure.**
`controlClasses` (`Field.tsx:39`) is `... border border-input bg-background ...`, so a text input's
fill is the *page* colour and its only boundary is `--input`. In `scoutsbsa` that is `#AD9D7B` at
**2.36:1** against the surface it sits on — under the 3:1 floor, and here the criterion genuinely
applies, because identifying the boundary of a form control is exactly what it covers. `--input` and
`--border` are set to the same value in all five programs, which is what let a decorative keyline
colour end up carrying an interactive boundary. `#9A8862` would clear it at 3.06:1.

**C6. The derived radius scale computes to negative values in two programs.** `theme.css:79-82`
defines `--radius-sm: calc(var(--radius) - 4px)` and `--radius-md: calc(var(--radius) - 2px)`.
Against the per-program `--radius` that yields `sm: -2px / md: 0px` for Venturing and
`sm: -3px / md: -1px` for Sea Scouts. Negative `border-radius` is invalid, so `rounded-sm` and
`rounded-md` silently do nothing there. Latent for our primitives, which use `rounded-lg` — but
`TabsTrigger` already ships `rounded-md` (B5), so it is live today.

### D. Missing primitives — each one forced a hand-roll back to raw utilities

| Missing | Consequence here |
|---|---|
| **Sheet / Drawer** | `DialogContent` hardcodes `fixed left-1/2 top-1/2 -translate-*  max-w-lg`. A left-edge drawer means overriding all four positioning utilities plus the transform, i.e. reimplementing it. Mobile filters went from an 85%-width thumb-reachable drawer to a 332px centred card. **Biggest layout regression of the swap.** |
| **Slider** | Native `<input type="range">` kept — fine. But `Field` supplies its `id` only through React context, which only the DS's own controls consume, so a foreign control gets a `<label for>` pointing at nothing: **a silently broken label, not an error.** Had to thread `useId()` through `Field htmlFor` + the input by hand. |
| **ToggleGroup / Chip** | 23 filter chips borrow `badgeVariants` plus four overrides (`normal-case`, `tracking-normal`, `rounded-full`, and a hand-written focus ring per B2). After all that, only the colour pair actually comes from the DS. |
| **Link / `linkVariants`** | For a directory site whose entire value proposition is outbound links to council pages, there is no link recipe at all. The convention I applied (`text-primary underline underline-offset-2 hover:text-primary/90`) is now an undocumented local one that will drift. |
| **Fieldset / legend** | `RadioGroup` renders a fieldset+legend internally, but the styling is not exposed. To stop the form showing two different label styles I copied `Field`'s label recipe (`display text-sm font-medium text-foreground`) out of the DS's *compiled* internals. It will drift the next time the DS changes it. |
| **Compact density** | Nothing anywhere has a size/density option. `CardBody` is fixed `p-5 sm:p-6`; the 3-up stat row on `/about` had to skip `CardBody` entirely (at 375px, `p-5` leaves 69px of content width per cell). `Field` is stacked-only with no `orientation` and no sr-only-label option, so the compact inline "Sort [v]" control became a 44px stacked block caged in an arbitrary `w-44`. |
| **Quiet / tertiary Button** | All four variants are emphatic. `ghost` is `bg-transparent text-primary`, so "Clear all" went from deliberately tertiary `text-muted-foreground` to olive `text-primary` that competes with the filters it clears. |
| **Warning Badge** | `Badge` is `primary \| accent \| subtle \| outline` only; status colour lives exclusively in the block-level `Alert`. The stale-listing badge is genuinely a warning and genuinely inline next to a card title, so it is now a neutral outline badge — across 50 cards the eye no longer catches amber, it has to read. |

### E. Component API friction

**E1. `Badge` is an eyebrow recipe masquerading as a chip.** Base is
`display inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] uppercase tracking-wider`.
Feature labels are human Title Case strings from `vocab.json`, so it rendered "Adirondack Shelters"
as "ADIRONDACK SHELTERS" — roughly 15-20% wider at `tracking-wider`, wrapping a 4-chip row onto a
third line in a ~360px card. `normal-case tracking-normal text-xs` had to be applied at **every**
badge site, including `+N more`. Defeating three of the recipe's five base utilities everywhere
means `Badge` has no data-chip mode; a `case` axis or a separate `Chip` primitive is missing, and
until then every data-dense consumer forks the class string.

**E2. `buttonVariants` pins `whitespace-nowrap` and a fixed `h-11`, and `Card` bakes
`overflow-hidden`.** "Dates & registration on the council site" at `text-sm` is ~300px; inside a
`p-5` card on a 360px viewport it clips rather than wraps. Making a DS button behave like a normal
inline CTA took four overrides (`h-auto min-h-11 whitespace-normal py-2`) plus `cn` so
tailwind-merge wins the `h-11` conflict, plus `-ml-5` to cancel `px-5` for alignment. Also `md` is
`text-sm`, so a page's primary CTA is visually **smaller** than its 16px body copy, and the only
larger rung is `lg` (`h-14`, 56px).

**E3. `.display` is deliberately unlayered, so it outranks every Tailwind utility.** Verified in
browser: `class="display font-medium"` computes `font-weight: 700`; only
`font-weight: 500 !important` wins. Upside — deleting the app's old `font-extrabold`/`font-semibold`
beside `display` was a true no-op. Downside — you can never lighten a display-family element with a
utility, and the next person will spend an hour finding out why.

**E4. Element-locked components.** `Card` is div-only with no `as`/`asChild`, so a `<section>`
panel gets demoted to a `<div>` and a card whose root must be an `<a>` (the entire camp card is one
link target) has to use `cardVariants` and reimplement `CardBody`'s padding. `Heading` always
appends `text-foreground`, so any heading on a coloured surface fights tailwind-merge. `Card`'s
unconditional `overflow-hidden` will silently clip any popover/tooltip/negative-offset focus ring a
card-hosted control renders. `Card`'s three-value `variant` enum conflates fill, border-width,
border-colour and shadow, so a dashed placeholder re-hand-rolls all three border utilities —
`border-dashed` alone renders nothing.

**E5. `ScoutThemeProvider` forces an inline `background-color` and `color` on its wrapper div**
(`dist/index.js:87-90`). It cannot be a layout-neutral wrapper, so it cannot theme a subtree
sitting on a different surface — it repaints it. Harmless here only because the island spans the
page. Related: this page now has three sources of truth for one program value (the `<html>` stamp
plus two island providers) with no compile-time link between them.

**E6. `TOKENS` freezes the program at build time.** `data-program` theming is the DS's headline
mechanism, but the map cannot participate: `TOKENS.scoutsbsa` is a static import, so a runtime
program swap would re-theme the page and leave the map on Scouts BSA green. A `useProgramTokens()`
hook returning the live palette would close it. `TOKENS` is also only exported from the React
entry, so `lib/map.ts` — a module with no React in it — now imports the barrel and trusts
tree-shaking. A data-only JS subpath would fix that.

### F. Astro-specific traps worth documenting

**F1. A DS component whose `className` is a flex/grid container is unsafe when its children come
from `.astro` markup.** `@astrojs/react` wraps slotted children in `<astro-static-slot>`, and Astro
only injects the `astro-island, astro-slot, astro-static-slot { display: contents }` rule when a
page needs a hydration script — emitted with the *first* `client:*` island. Camp pages with no
lat/lon render no island, so on **those pages only**, `astro-static-slot` is an unstyled inline
element and `<CardBody className="flex flex-col gap-4">` silently collapses to one flex child. Had
to move the flex onto a plain inner div. Landmine for the whole approach.

**F2. You cannot pass a React element to a DS component prop from `.astro`.** Astro converts
slotted *children* into React children but emits prop values as raw compiled JSX, so
`<Alert icon={<TriangleAlert />} />` hands the React component an Astro vnode. Only `children`
crosses the boundary. Used `Alert`'s default `!` chip instead.

**F3. A Radix dialog cannot be breakpoint-scoped.** The old sheet was `lg:hidden`, so widening the
viewport self-dismissed it for free. You cannot `lg:hidden` a Radix dialog — the focus trap and
scroll lock survive `display: none`, stranding the user in an invisible modal. Mobile-only modals
now need a JS media query. Harmless here because the trigger is `lg:hidden`, but the DS docs should
say so.

**F4. Map labels can never use the DS type pair.** `"text-font"` names an SDF glyph set the vector
tile server must serve; OpenFreeMap and MapTiler ship Noto / Open Sans / Roboto and neither serves
Montserrat or Source Serif 4. Changing it renders **no map labels at all** (silent glyph 404).
Matching map typography would mean self-hosting an SDF glyph pipeline — real infrastructure for a
$0 static deploy. So the app's primary surface permanently mixes Noto Sans labels with
Montserrat/Source Serif chrome. Every DS consumer with a map hits this.

**F5. Stock MapLibre chrome now clashes.** `.maplibregl-popup-content` hardcodes
`background:#fff; border-radius:3px` with a white tip; `NavigationControl` and the attribution bar
are likewise stock white/grey with their own radii and shadow. Our popup *content* is themed
correctly, but it sits in a bright white 3px-radius box on a `#F5F1E6` page whose radius vocabulary
is 4px / pill. It is the same six selectors for every consumer, so the DS could ship an optional
`maplibre.css`.

---

## Installation, and why `web/vendor/`

`0.2.0-alpha.0` is not published (npm has only the broken `0.1.1`, per A1). The branch therefore
vendors a locally built tarball at `web/vendor/opensourcescouting-design-system-0.2.0-alpha.0.tgz`
(114 KB) and depends on it by `file:` path, so a clean checkout and CI both build with no network
and no registry dependency. **This is spike scaffolding.** If the spike graduates, the tarball and
the `file:` reference get replaced by a real registry version — that swap is the first task of any
real adoption, and it depends on A1 being fixed upstream.

Three fixes were made in the design system clone at `.claude/design_system` to get this far (A1 x2,
A2). They are uncommitted in that repo's working tree and **should go upstream as PRs** — they are
not Camp Finder concerns.

## Decisions this spike does not make

1. **Body serif.** Source Serif 4 reads genuinely well in `/about`'s prose and acceptably in card
   metadata, but the DS sets `--font-body` on `html` and nothing else, so **any element without
   `.display` renders serif** — the header nav labels were semibold *serif* next to a Montserrat
   wordmark until fixed. Every small UI label in the app has that trap waiting. The DS's own chrome
   uses `display text-xs uppercase tracking-[0.18em]` for labels but exposes no utility, class or
   component for it; you have to read the minified dist to find it.
2. **Hero scale.** `Heading size={1}` is 36/48/60px. At 375px it is fine; at desktop the 60px hero
   still wraps "Find a Scouts BSA summer camp" onto two lines at 1125px. There is no rung between
   size 1 (36/48/60) and size 2 (30/36/48). For a search utility, 60px is magazine scale.
3. **Whether C1/C2/C4 are ours to fix or theirs.** Overriding `--card` in our own stylesheet is one
   documented line and would fix the biggest visual problem immediately. Doing so also hides a real
   palette bug from the people who own the palette. Recommend raising it upstream first.
