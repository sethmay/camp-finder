# `@opensourcescouting/design-system` — review from a real consumer port

**For the design-system maintainers. Standalone; nothing else needs to be read alongside it.**

We ported an existing production app — [Camp Finder](https://sethmay.github.io/camp-finder/), an
Astro 4 + React 18 static site with ~450 camp listings, a filter rail, and a MapLibre map — onto the
design system end to end. It builds clean (451 pages, `astro check` 0 errors, 35/35 tests, 0 console
errors on every route), so everything below comes from a working integration rather than a reading
of the source.

Version reviewed: **`0.2.0-alpha.0`**, program `scoutsbsa`. Every ratio below is computed from
`src/styles/tokens.css` or measured in Chromium; the arithmetic is reproducible from the token
values quoted inline.

We then went further and **implemented every token-level proposal** as a consumer override
stylesheet, so §11 reports what each one actually cost, which recommendation we got wrong, and the
two additional bugs that only surfaced once the surface tokens were fixed. Where §11 disagrees with
an earlier section, trust §11 — it was measured in a running app rather than reasoned from source.

Thank you for building this — the multi-program architecture genuinely works, and §10 says where.
The list is long because we exercised the whole surface, not because we think it's in bad shape.
Notably, every fix below is a token value or one component axis; none of them touch the
architecture.

## Triage

| # | Item | Severity | Effort |
|---|---|---|---|
| 1 | Package is uninstallable from npm (`preinstall` script not in `files`) | **Blocker** | 2 lines |
| 2 | `npm run build` cannot complete on Windows | **Blocker** | 5 lines |
| 3 | AAA gaps in shipped tokens (`--muted-foreground` ×4, 2 accents, 1 primary) | **High** | token values |
| 4 | AAA target-size (2.5.5) failures: `Button sm`, `TabsList` | **High** | 2 values |
| 5 | `--background` == `--card` == `--popover` in all 5 programs | **High** | token values |
| 6 | Form-control fill is the page colour; `--input` at 2.36:1 fails 1.4.11 | **High** | 2 lines |
| 7 | Derived radius scale computes negative in Venturing + Sea Scouts | Medium | 4 lines |
| 8 | `--radius` too tight to read as intentional below ~6px | Medium | token values |
| 9 | Type scale is hardcoded in `Heading`, not a token; starts at 60px | Medium | small refactor |
| 10 | `Badge` is an eyebrow recipe with no data-chip mode, and no `warning` tone | Medium | new axis |
| 11 | `badgeVariants` has no focus treatment → borrowed chips are keyboard-invisible | Medium | 1 line |
| 12 | README "Path B" omits the `@source` line; DS components render unstyled | Medium | docs |
| 13 | `Dialog` can leave the page exposed to screen readers; no `aria-modal` | Medium | 1 line |
| 14 | Missing primitives: Sheet, Slider, ToggleGroup, Link | Low-Medium | new work |
| 15 | `TabsTrigger` uses `rounded-md`, outside the documented radius vocabulary | Low | 1 line |
| 16 | `DialogContent` fills with `bg-background`; `--popover` ships but nothing consumes it | Medium | 1 line |
| 17 | `Badge` has no light fill and no neutral outline, so a quiet chip is inexpressible | Medium | new axis |
| 18 | `Card variant="flat"` ships no border, so a bordered/dashed panel re-hand-rolls all three | Low | 1 line |
| 19 | No optional `maplibre.css`; every consumer with a map rewrites the same six selectors | Low | new file |

§11 records which of these we actually applied, what each cost, and the two further bugs that
only became visible once #5 was fixed.

---

## §1. Two blockers before anyone can adopt this

**1.1 — The published package cannot be installed.** `package.json` declares
`"preinstall": "node scripts/check-npm-version.mjs"`, but `files` is `["dist", "NOTICE.md"]`, so
`scripts/` is never published. npm runs a dependency's `preinstall`, so every consumer install dies:

```
npm error command failed
npm error command ... node scripts/check-npm-version.mjs
npm error Cannot find module '.../node_modules/@opensourcescouting/design-system/scripts/check-npm-version.mjs'
```

Reproduced against **`@opensourcescouting/design-system@0.1.1` from the registry** in a clean
throwaway project — the currently published version cannot be installed by anybody. We only got
going by building and vendoring a tarball locally.

Suggested fix: add the script to `files` **and** have it exit early when it detects it is running
from inside a `node_modules` tree. The lockfile hazard it guards (npm 10 / npm/cli#4828) is about
developing *this* repo; a consumer on npm 10 is unaffected, so the guard should never fire for them.

```js
import { fileURLToPath } from "node:url";
if (fileURLToPath(import.meta.url).split(/[\\/]/).includes("node_modules")) process.exit(0);
```

**1.2 — `npm run build` cannot complete on Windows.** `scripts/build-css.mjs:42` calls
`execFileSync` on `node_modules/.bin/tailwindcss`. On Windows the extensionless npm shim is not
directly executable (`ENOENT`), and switching to `tailwindcss.cmd` hits Node ≥20's refusal to spawn
`.cmd` without a shell (`EINVAL`). Since `dist/` is a build artifact, **no Windows contributor can
produce the package at all.** Resolving the CLI's ESM entry and running it with the current Node
binary is portable:

```js
const tailwindBin = path.join(root, "node_modules", "@tailwindcss", "cli", "dist", "index.mjs");
execFileSync(process.execPath, [tailwindBin, "-i", …, "-o", …, "--minify"], { stdio: "inherit" });
```

Both fixes are verified working and available as a ready-to-apply patch on request.

---

## §2. WCAG AAA: where the tokens currently stand

We understand AAA is the goal, so we audited every shipped pair against it rather than against AA.
The criteria that actually bind:

| Criterion | Level | Requirement |
|---|---|---|
| 1.4.6 Contrast (Enhanced) | **AAA** | **7:1** normal text; 4.5:1 large text |
| 1.4.3 Contrast (Minimum) | AA | 4.5:1 normal; 3:1 large |
| 1.4.11 Non-text Contrast | AA — **no AAA tier exists** | 3:1 for UI component boundaries and states |
| 2.5.5 Target Size (Enhanced) | **AAA** | **44 × 44 CSS px** |
| 2.5.8 Target Size (Minimum) | AA | 24 × 24 CSS px |

Two consequences worth stating up front, because they shape everything else:

- **"Large text" is effectively unavailable to buttons.** The exemption needs ≥24px, or ≥18.66px
  bold. `Button` is `text-xs` / `text-sm` / `text-base` (12 / 14 / 16px), so **every button label in
  the system is normal text and needs the full 7:1**, at every size. There is no size where the
  4.5:1 allowance kicks in.
- **1.4.11 has no AAA level.** Borders, focus rings and control boundaries are held to 3:1 and no
  more. So §6 below is an AA conformance gap, not an AAA stretch goal — worth separating in your own
  tracking, since it's the more urgent of the two.

### What passes today

`--foreground` clears AAA comfortably in all five programs (15.2–17.0:1), and `--os-on-primary-soft`
does too (8.1–8.3:1). The `/80` and `/85` tint policy also survives AAA when applied to
`--foreground` — e.g. `scoutsbsa` 15.48:1 → 10.11:1 at `/85`, → 8.53:1 at `/80`. That policy is
sound and we'd keep it.

### What does not

| Token / pair | Program | Ratio | AAA (7:1) |
|---|---|---|---|
| `--muted-foreground` `#46587A` on `#FFFCF4` | cub | 6.97:1 | **misses by 0.03** |
| `--muted-foreground` `#525E48` on `#F5F1E6` | scoutsbsa | 6.09:1 | **fails** |
| `--muted-foreground` `#475B4F` on `#F4F1E8` | venturing | 6.46:1 | **fails** |
| `--muted-foreground` `#475A78` on `#F0F4F8` | seascouts | 6.33:1 | **fails** |
| `--primary` `#006B3F` + white label | venturing | 6.61:1 | **fails** |
| `--os-accent` `#CE1126` + white label | parent | 5.63:1 | **fails** |
| `--os-accent` `#FDC116` + `#003F87` label | cub | 6.22:1 | **fails** |

`--muted-foreground` is the important one: it is *the* body-copy token, documented as "AA ≥4.5 muted
body text", and it is the single most-used text colour in any real app after `--foreground`. Only the
parent brand clears AAA (7.73:1). Minimal darkenings that land at ~7.05:1:

```css
[data-program="cub"]       { --muted-foreground:  70  87 121; } /* #465779  7.06:1 */
[data-program="scoutsbsa"] { --muted-foreground:  74  84  65; } /* #4A5441  7.06:1 */
[data-program="venturing"] { --muted-foreground:  67  85  74; } /* #43554A  7.05:1 */
[data-program="seascouts"] { --muted-foreground:  66  83 111; } /* #42536F  7.04:1 */
```

Two related notes:

- **`--os-on-surface-faint` is ~3.07–3.61:1.** That is correct for what it's for, but `CLAUDE.md`
  describes it as ">=3:1 inactive/dim text" — under AAA (and under AA) it cannot legally carry text
  at all. Worth renaming toward its real role, or documenting it as non-text/decorative only.
- **Don't tint `--muted-foreground`.** `text-muted-foreground/85` in `scoutsbsa` composites to
  4.35:1 — below AA. The `/80`–`/85` policy is safe over `--foreground` and unsafe over
  `--muted-foreground`; the docs currently present it as a blanket rule.

### AAA target size (2.5.5) — two control heights miss 44px

| Control | Height | 2.5.5 (44px) |
|---|---|---|
| `Button size="sm"` | `h-9` = 36px | **fails** |
| `Button size="md"` | `h-11` = 44px | passes, exactly |
| `Button size="lg"` | `h-14` = 56px | passes |
| `TabsList` / `TabsTrigger` | `h-10` = 40px | **fails** |
| `TextInput`, `NativeSelect` | `h-11` = 44px | passes, exactly |

If AAA is the target, `size="sm"` can never conform and probably shouldn't exist as a standalone
size — or should be documented as "AA only." `TabsList` at `h-10` we had to override to `h-auto`
with a min-height on the triggers.

Also worth making explicit: **the 44px clearances are implementation details, not contracts.**
`h-11` is exactly 44px with zero margin, but nothing in the public types says so, so a future minor
bump to `h-10` would silently drop every consumer out of AAA with no type error and no visual
regression a reviewer would catch. A documented invariant (or a test) would protect it.

---

## §3. Can the buttons be softened and still hit AAA?

**Yes — and there's more headroom than the current values suggest.** This was our specific question,
so here is the full working.

`scoutsbsa` today is `--primary: #243E2C` with `--primary-foreground: #F5F1E6`, giving **10.33:1**.
AAA needs 7:1, so there are 3.3 ratio points of unused headroom. The fill can be softened
substantially.

The catch is that `--primary` is doing **two jobs with different ceilings**, and only one of them is
generous:

- **As a fill** (`Button primary`, `Badge primary`) the label sits *on* it. Loosening this is easy.
- **As text on a surface** (`Button secondary` / `ghost` are `text-primary`; every primary-coloured
  link) the colour sits *on the page*. This is the tight constraint, and it gets tighter if you fix
  §5, because a darker page lowers it further.

That's a shadcn inheritance: the vocabulary has one `--primary` for both roles. At AA the conflation
is harmless. **At AAA it is the actual blocker**, and it's why the obvious softening looks like it
fails when it doesn't.

### The unlock: `--primary-foreground` is warm paper, not white

In `scoutsbsa`, `--primary-foreground` is `#F5F1E6` — the page colour. That costs real headroom:

| fill | label | ratio | AAA |
|---|---|---|---|
| `#1D5E42` | `#F5F1E6` (current token) | 6.81:1 | fails |
| `#1D5E42` | `#FFFFFF` | **7.69:1** | **passes** |

So the green we'd most like — `#1D5E42`, a noticeably softer and more saturated green — is AAA-legal
as a button fill the moment the label is pure white. With white labels, the fill can go as light as
**`#256449`** (7.01:1) before AAA breaks.

### Three concrete options, all fully AAA

Checked against three pairs simultaneously: label-on-fill (7:1), primary-as-text on the card (7:1),
and primary-as-text on a darker page (7:1), plus fill-vs-page for 1.4.11 (3:1).

**Option 1 — soften within the existing architecture. No token split, no new concepts.**

```css
[data-program="scoutsbsa"] { --primary: 44 79 53; }  /* #2C4F35 */
```

| check | ratio | |
|---|---|---|
| label `#F5F1E6` on fill | 8.17:1 | AAA |
| `text-primary` on card `#F5F1E6` | 8.17:1 | AAA |
| `text-primary` on darker page `#E9E3D3` | 7.20:1 | AAA |
| fill vs page (1.4.11) | 7.20:1 | ok |

A visibly softer, less near-black olive. Zero structural change — one number. **This is the safe
pick if you want the smallest possible diff.**

**Option 2 — split the roles, and get the green you actually want.** Add one token so the fill and
the text use can be tuned independently:

```css
[data-program="scoutsbsa"] {
  --primary:            29  94  66;  /* #1D5E42 the softer green, as a FILL */
  --primary-foreground: 255 255 255; /* white label unlocks it */
  --primary-on-surface:  23  78  55; /* #174E37 primary-COLOURED TEXT on a surface */
}
```

| check | ratio | |
|---|---|---|
| label `#FFFFFF` on fill `#1D5E42` | 7.69:1 | AAA |
| `--primary-on-surface` on card `#F5F1E6` | 8.53:1 | AAA |
| `--primary-on-surface` on page `#E9E3D3` | 7.52:1 | AAA |
| fill vs page (1.4.11) | 6.00:1 | ok |

The two greens are close enough to read as one brand colour, and the split is what makes AAA
reachable without darkening the fill back toward black. `Button secondary` / `ghost` and link
recipes would move to `--primary-on-surface`; `Button primary` keeps `--primary`.

We'd suggest **Option 2**, and suggest the split generalises: **any AAA system needs
fill-vs-text-on-surface as separate tokens for `primary`, `destructive`, and `os-accent`.** It would
also fix the two failing accents in §2 — `#CE1126` on white is 5.63:1 as text but perfectly fine as
a *fill* with white on it.

**Option 3, for the record:** `#1D5E42` fill + white label + `#1A5A3E` for text **does not work** —
the text use lands at 6.36:1 on a darker page. The text role has to be genuinely darker than the
fill role, not a token away from it. This is exactly the trap the split prevents.

### The same headroom exists in the other programs

Venturing's `#006B3F` + white is already 6.61:1 and needs to move regardless. Applying the split
there lets the fill *stay* `#006B3F` (a good brand green) with white on it once the text role gets
its own darker value — i.e. the split fixes an existing AAA failure rather than just enabling a
preference.

---

## §4. All three surface tokens share one value, in every program

`--background`, `--card` and `--popover` are identical in `:root` and in all four
`[data-program]` blocks (`tokens.css` 25/27/29, 94/96/98, 145/147/149, 189/191/193, 233/235/237):

| program | `--background` | `--card` | separation |
|---|---|---|---|
| parent | `#FFFFFF` | `#FFFFFF` | **1.00:1** |
| cub | `#FFFCF4` | `#FFFCF4` | **1.00:1** |
| scoutsbsa | `#F5F1E6` | `#F5F1E6` | **1.00:1** |
| venturing | `#F4F1E8` | `#F4F1E8` | **1.00:1** |
| seascouts | `#F0F4F8` | `#F0F4F8` | **1.00:1** |

So `Card variant="outlined"` is a zero-contrast fill, and `elevated` separates by **shadow only**.
The borders don't rescue it: `border-border/30` (what `cardVariants elevated` ships) is 1.26:1
against the page, `/60` is 1.62:1, full `--border` is 2.36:1. And because the `forced-colors` block
sets `--os-shadow: none`, **every panel boundary in the system vanishes entirely in Windows High
Contrast** — nothing is left but a sub-2.4:1 border.

In our app the visible symptoms were: a hero `<section class="bg-card">` that renders as an
invisible band, skeleton loaders detectable only because `animate-pulse` moves them, and result
cards that read as faint pencil rectangles.

**Why this likely survived review:** in the parent brand it's white-on-white, which looks
deliberate and clean. It only becomes visible in the four tinted programs, so Storybook's default
view hides it.

**To be precise about the standard:** this is *not* a WCAG failure. 1.4.11's 3:1 covers UI component
boundaries, not decorative surface-vs-surface fills — and for reference our own pre-port design was
only 1.20:1 (white on `#EDEAE1`) and reads as properly layered. **~1.1–1.2:1 is all a large-area fill
needs.** The problem is specifically that 1.00:1 is exactly zero. (We initially wrote this up as a
1.4.11 failure and were wrong; correcting it here.)

Two directions, measured for `scoutsbsa`:

- **A — raise the card, keep the tan page:** `--card: 255 255 255` → 1.13:1.
- **B — keep tan paper as the card, drop the page:** `--background: 233 227 211` (`#E9E3D3`) → 1.14:1.

We'd lean **B**: the tan *paper* is the brand idea, and white-cards-on-beige is a more generic look.
Either beats 1.00:1, and this is the highest-value visual change in this document.

Worth adding alongside it: **`--os-surface-sunken`**, for wells, table stripes, skeletons and
disabled tracks. Today the only option is `bg-muted/40` at 1.13:1.

And a suggestion for the test suite: `tests/contrast.test.ts` is genuinely good on text pairs — we
verified `--os-on-surface-faint` at 3.07:1 against the `scoutsbsa` page, exactly as documented. The
gap is that nothing asserts two *surfaces* differ at all, which is how 1.00:1 shipped in five
palettes at once. A single "every surface pair differs by ≥1.05:1" assertion would have caught it.

---

## §5. Form controls are painted with the page colour — a real 1.4.11 failure

`controlClasses` (`src/components/Field.tsx:39`) is:

```
w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground
```

So a text input's fill is the **page** colour, and its only boundary is `--input`. In `scoutsbsa`
that boundary is `#AD9D7B` at **2.36:1** against the surface it sits on — under 1.4.11's 3:1 floor,
and here the criterion squarely applies, because identifying the boundary of a form control is
exactly what it covers. An input with no fill difference and a 2.36:1 outline reads as a caption
with a line around it, not something you can type in.

`--input` and `--border` are set to the same value in all five programs, which is what let a
decorative keyline colour end up carrying an interactive boundary. Keeping them distinct is the fix
— `--border` stays soft for card edges and keylines, `--input` gets held to the interactive floor:

1. Change `controlClasses` from `bg-background` to `bg-card` (free once §4 lands).
2. Raise `--input` to clear 3:1. For `scoutsbsa`, `#9A8862` = **3.06:1** vs the tan page and
   **3.46:1** vs a white card (today: 2.36 / 2.66).
3. Add control boundaries to `contrast.test.ts` alongside the text pairs.

---

## §6. Radius: too tight to read as intentional, and the derived scale is invalid

**6.1 — The values.** `--radius` is `4px` in `scoutsbsa`, `2px` in Venturing, **`1px`** in Sea
Scouts. We follow the intent in the comments — "tight, crisp", "near-sharp", "hairline", derived
from print and uniform heritage. Our observation from putting a UI on it: below roughly 6px the
signal stops reading as *intentional restraint* and starts reading as unstyled. A 1px radius on a
500px-wide card is perceptually identical to a square, so it isn't carrying brand information.

The per-program differentiation that *does* land is `--os-rule-weight` (3/2/2/1px), `--os-shadow`
(Cub's soft 14px bloom vs Sea Scouts' 1px hairline) and `--os-motion-*` (springy overshoot vs 90ms
snap). Those are unmistakable and they cost nothing in polish. Radius could be pulled toward a
usable band without losing any of that:

| program | now | suggested |
|---|---|---|
| cub | 14px | 14px (unchanged — it works) |
| parent | 6px | 8px |
| scoutsbsa | 4px | **10px** |
| venturing | 2px | 6px |
| seascouts | 1px | 6px |

**6.2 — An actual bug.** `theme.css:79-82` derives the scale subtractively:

| program | `--radius` | `--radius-sm` | `--radius-md` |
|---|---|---|---|
| parent | 6px | 2px | 4px |
| cub | 14px | 10px | 12px |
| scoutsbsa | 4px | 0px | 2px |
| venturing | 2px | **−2px** | 0px |
| seascouts | 1px | **−3px** | −1px |

Negative `border-radius` is invalid, so `rounded-sm` and `rounded-md` silently do nothing in
Venturing and Sea Scouts. This is live today, not theoretical, because `TabsTrigger` ships
`rounded-md`. A multiplicative derivation keeps the ratios meaningful across a 6→14px spread:

```css
--radius-sm: calc(var(--radius) * 0.5);
--radius-md: calc(var(--radius) * 0.75);
--radius-lg: var(--radius);
--radius-xl: calc(var(--radius) * 1.5);
```

**6.3 — Radius arguably should scale with element size.** One value for a 44px button and a 500px
card is the deeper issue: the same corner reads generous on the button and stingy on the card. If
you'd rather not add an axis, letting `Card` use `rounded-xl` while controls use `rounded-lg` would
get most of the benefit for free.

---

## §7. The type scale is the one visual axis a consumer cannot retune

`Heading`'s scale is hardcoded in the component (`Heading.tsx:14-21`):

| `size` | rendered | | `size` | rendered |
|---|---|---|---|---|
| 1 | 36 / 48 / **60**px | | 4 | 20 / 24px |
| 2 | 30 / 36 / 48px | | 5 | 18 / 20px |
| 3 | 24 / 30px | | 6 | 16 / 18px |

Two problems. A 60px `h1` takes the top third of a viewport before any content — measured in our
app, a five-word product headline still wraps to two lines at a 1125px viewport. And the 48→60px
step at `md` is the largest in the scale with no rung between sizes 1 and 2.

The structural issue is the more interesting one: **colour, radius, shadow, rule weight, motion and
the display voice are all tokens, and type size isn't.** That breaks the system's own stated model
("per-program differentiation lives in CSS-var overrides only, never in component code") for the one
axis a consuming app is most likely to need to tune.

Suggested shape — tokens plus an axis, so the current look stays the default:

```css
--os-text-h1: 2.25rem;  --os-text-h1-md: 3rem;
--os-text-h2: 1.875rem; --os-text-h2-md: 2.25rem;
/* … */
```

…and `<Heading scale="editorial" | "ui">`, defaulting to `editorial` (today's values, right for
`ProgramHero` and landing pages). A `ui` scale in the neighbourhood of 30/24/20/18/16/14px suits app
chrome; for reference our pre-port app used 40/28/22/18/16 and never felt cramped.

While in there: `Heading` also hardcodes `text-foreground` into its class list, so a heading on a
coloured surface has to fight `tailwind-merge`. A `tone` prop — or simply inheriting — would help.

---

## §8. Component-level items

**8.1 — `Badge` is an eyebrow recipe, so it can't be a data chip.** The base is
`display inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] uppercase tracking-wider`.
For editorial kickers that's right. For *data values* it isn't: our chips carry human Title Case
labels from a vocabulary file, so `Badge` rendered "Adirondack Shelters" as "ADIRONDACK SHELTERS" —
about 15–20% wider at `tracking-wider`, which wrapped a four-chip row onto a third line in a ~360px
card. We applied `normal-case tracking-normal text-xs` at **every** badge site. Defeating three of
the recipe's five base utilities everywhere is the signal that a `case`/`emphasis` axis or a separate
`Chip` primitive is missing.

**8.2 — No `warning` tone on `Badge`.** Status colour lives only in `Alert`, which is a block-level
banner with `role="status"` — unusable for a 12px inline "may be outdated" badge next to a card
title. We ended up carrying that warning with a glyph and words only, which across 50 list rows
means the eye no longer catches it and has to read instead. Reusing `alertToneStyles` at badge scale
would be enough.

**8.3 — `badgeVariants` has no focus treatment, which makes borrowed chips keyboard-invisible.**
`Badge` is a `<span>`, so this is legitimate in isolation. But it is the only chip-shaped recipe in
the package, so anyone building a toggle chip borrows it and silently ships a control with no visible
focus state. We had to re-paste your own
`focus-visible:outline-2 outline-offset-2 outline-ring`. This is the sharpest edge we hit, because
the failure is invisible to anyone testing with a mouse. Shipping `ToggleGroup` / an interactive
`Chip`, or exporting the focus recipe as a documented utility, would close it.

**8.4 — `Dialog` can leave the page behind it exposed to screen readers.** Measured with a modal
open: every `document.body` child received `aria-hidden="true"` **except `<main>`**, and Radix sets
no `aria-modal`. The cause is `aria-hidden`'s deliberate behaviour of keeping every `[aria-live]`
element in the tree (its issue #10) — our result counter is `role="status" aria-live="polite"` inside
`<main>`, so the whole results list, including both `role="tab"`s, stayed in the AT tree behind the
modal. The focus trap and pointer blocking both work; only the virtual cursor leaks. We closed it at
the call site with `aria-modal="true"` on `DialogContent`. **Any consumer with a live region anywhere
on the page has this and will never notice.** Setting `aria-modal` on `DialogContent`, or exposing
Radix's `shards`, fixes it for everyone.

**8.5 — `DialogContent` has no height cap or overflow**, so any form taller than the viewport runs
off the bottom unreachable; we added `max-h-[85vh] overflow-y-auto` by hand. It also doesn't pass
`aria-describedby={undefined}`, so it trips Radix's missing-description warning by default —
`EventDialog` handles both internally, so the knowledge is in the package but plain `DialogContent`
users have to rediscover it.

**8.6 — `TabsTrigger` uses `rounded-md`**, which isn't in the documented two-value radius vocabulary
(`rounded-lg` / `rounded-full`), and per §6.2 that value is invalid in two programs. Worth fixing
mainly because it means the radius rule can't be enforced by auditing consumer code alone.

**8.7 — `Tabs` active state is ~1.36:1 in `scoutsbsa`** (track `--muted` `#D6CEBD`, active trigger
`--background` `#F5F1E6`). The shadcn "lift out of the muted track" idiom assumes white-on-grey; on
two tans the only reliable cue for the selected view is text colour. This is §4 reappearing one token
over, which is why we'd rather see the surface hierarchy fixed in the palette than patched per
component.

**8.8 — Missing primitives.** Each of these sent us back to raw utilities:

| Missing | What it cost |
|---|---|
| **Sheet / Drawer** | `DialogContent` hardcodes `fixed left-1/2 top-1/2 -translate-* max-w-lg`; a left-edge drawer means overriding all four positioning utilities plus the transform. Our mobile filter panel went from an 85%-width thumb-reachable drawer to a 332px centred card — the biggest layout regression of the port. |
| **Slider** | Native `<input type="range">` is fine, but `Field` passes its `id` only through React context, which only your own controls consume — so a foreign control gets a `<label for>` pointing at nothing. A silently broken label, not an error. We threaded `useId()` through `Field htmlFor` manually. |
| **ToggleGroup / Chip** | 23 filter chips borrowing `badgeVariants` + four overrides (see 8.1, 8.3). |
| **Link / `linkVariants`** | No link recipe exists. For a site whose whole value proposition is outbound links, that's a conspicuous gap; our local convention will drift from yours. |
| **Fieldset / legend** | `RadioGroup` does fieldset+legend internally but the label styling isn't exposed, so to avoid two label styles in one form we copied `Field`'s recipe out of the *compiled* bundle. |
| **Compact density** | Nothing has a size/density option. `CardBody` is fixed `p-5 sm:p-6` — on a 375px viewport that leaves 69px of content width in a 3-up stat row, so we skipped `CardBody` entirely. `Field` is stacked-only with no `orientation` and no sr-only-label option, so a compact inline "Sort ▾" became a 44px stacked block. |
| **Quiet Button variant** | All four variants are emphatic; `ghost` is `text-primary`. A deliberately tertiary "Clear all" became olive text competing with the filters it clears. |

**8.9 — `buttonVariants` pins `whitespace-nowrap` and a fixed `h-11`, and `Card` bakes
`overflow-hidden`.** A ~300px `text-sm` CTA inside a `p-5` card on a 360px viewport clips rather than
wraps. Making one DS button behave like a normal inline CTA took four overrides
(`h-auto min-h-11 whitespace-normal py-2`) plus `cn` so `tailwind-merge` wins the `h-11` conflict.
Separately, `md` is `text-sm`, so a page's primary CTA renders *smaller* than its 16px body copy, and
the only larger rung is `lg` at 56px.

---

## §9. Documentation and integration notes

**9.1 — README "Path B" is missing its most important line.** Path B says to `@import` the `tokens`
and `theme` exports and that "your build regenerates the program and shadcn utilities." It doesn't
mention that **Tailwind never scans `node_modules`**, so the utilities baked into your own components
(`shadow-program`, `border-b-rule`, `duration-program`, `ease-program`, and the `Button` / `Card`
recipes) are never emitted. Components render structurally correct and completely unstyled, with no
error. The missing line:

```css
@source "../../node_modules/@opensourcescouting/design-system/dist";
```

We'd suggest putting it directly in the Path B snippet — it took a while to work out, and the failure
mode gives no clue.

**9.2 — `.display` is unlayered, so it outranks every Tailwind utility.** We understand why (the
comment explains it must survive in the prebuilt CSS exports). The consequence is worth documenting:
verified in-browser, `class="display font-medium"` computes `font-weight: 700`, and only
`font-weight: 500 !important` wins. There's a genuine upside — deleting a stray `font-semibold` next
to `display` is a true no-op — but you can never lighten a display-family element with a utility, and
the next person will spend a while finding out why.

**9.3 — `ScoutThemeProvider` forces inline `background-color` and `color` on its wrapper**
(`dist/index.js:87-90`), so it can't be a layout-neutral wrapper and can't theme a subtree sitting on
a different surface — it repaints it.

**9.4 — `TOKENS` freezes the program at build time.** It's the right escape hatch and we used it for
MapLibre paint colours, which need concrete strings. But `TOKENS.scoutsbsa` is a static import, so a
runtime `data-program` swap would re-theme the page and leave the map on the old palette — a hole in
the multi-program story. A `useProgramTokens()` hook returning the live palette would close it. Also,
`TOKENS` is only exported from the React entry, so a module with no React in it now imports the
barrel and trusts tree-shaking; a data-only JS subpath would avoid that.

**9.5 — Astro-specific, if you want to support it explicitly.** Two traps we hit, both worth a
docs note since Astro is a natural fit for this system:

- **A DS component whose `className` is a flex/grid container is unsafe when its children come from
  `.astro` markup.** `@astrojs/react` wraps slotted children in `<astro-static-slot>`, and Astro only
  injects the `display: contents` rule for it when a page needs a hydration script. On pages with no
  interactive island, `<CardBody className="flex flex-col gap-4">` silently collapses to one flex
  child.
- **You cannot pass a React element to a DS component prop from `.astro`.** Astro converts slotted
  *children* into React children but emits prop values as raw compiled JSX, so
  `<Alert icon={<TriangleAlert />} />` hands the component an Astro vnode. Only `children` crosses
  the boundary.

**9.6 — Map labels can never use the DS type pair.** MapLibre's `"text-font"` names an SDF glyph set
the tile server must serve; OpenFreeMap and MapTiler ship Noto / Open Sans / Roboto, and neither
serves Montserrat or Source Serif 4. Setting a DS font name renders **no labels at all** (silent
glyph 404). Matching map typography would require self-hosting a glyph pipeline. Every consumer with
a map will hit this, so it's worth one line in the docs.

---

## §10. What works well

Not padding — these are the things we'd have flagged if they'd gone the other way:

- **The `data-program` mechanism is the right call and it delivers.** One attribute on `<html>`
  themed every plain Astro file with zero JavaScript. Portal re-stamping worked exactly as
  documented. Theme nesting worked. **Every fix we propose above is a token value plus one component
  axis — none of them require touching the architecture.**
- **DS React components render inside `.astro` with no `client:*` directive** — static HTML, zero JS
  shipped — and `Heading` uses `createElement(\`h${level}\`)`, so you get real heading semantics
  instead of div soup. Better ergonomics than we expected.
- **The text-contrast test suite is real.** `--os-on-surface-faint` measured 3.07:1 against the
  `scoutsbsa` page, exactly as documented. The `/80`–`/85` composites hold up under AAA over
  `--foreground`. Our §2 and §4 suggestions are about *extending* that coverage, not establishing it.
- **`Field`'s a11y wiring is a genuine upgrade.** Two of our selects had a wrapping `<label>` with no
  `htmlFor`; `Field` gave them real `for`/`id` pairing for free.
- **The Radix layer paid for itself immediately.** Our mobile filter panel was a hand-rolled
  `fixed inset-0` div with no `role="dialog"`, no focus trap, no Escape and no scroll lock.
  `Dialog` supplied all four (modulo 8.4).
- **Per-program display voice** (weight / tracking / style / transform) is a nice idea that costs
  nothing at the call site, and it differentiates the programs more effectively than the radius
  spread does.

---

## §11. We applied the proposals. Here is what each one cost, and what it exposed.

After writing §1–§10 we implemented every token-level proposal as a consumer override stylesheet
and ran the whole app on it. That changed our confidence in several items and turned up two more
bugs, so this section supersedes the guesswork in the sections above wherever they disagree.

### What it cost

| Proposal | Applied as | Cost |
|---|---|---|
| §4 surface split | `--card: 255 255 255`, `--popover` follows | **1 token**, and it deleted more code than it added (see below) |
| §2 AAA `--muted-foreground` | `#434C3B` | 1 token. 7.97:1 card / 7.02:1 page |
| §3 primary fill/text split | `--primary` `#1D5E42` + white label + new `--primary-on-surface` `#174E37` | 3 tokens + rerouting the `text-primary` utility |
| §2 AAA destructive | `--destructive` `#9E0C1C` + `--destructive-on-surface` `#940C1B` | 2 tokens, same shape as primary |
| §5 control fill + `--input` | `bg-card` fill, `--input` `#8E8065` | 1 token + 1 rule |
| §6.1 radius | `--radius: 0.625rem` | 1 token |
| §6.2 radius scale | multiplicative `calc()` | 4 lines |
| §7 type scale | overrode Tailwind's `--text-2xl`…`--text-6xl` | **the only proposal we could not apply cleanly** — see below |
| §2 target size | min-heights on `Button sm` / `TabsList` | 2 rules |

Everything except §7 was a token value. **§7 was the exception that proves the point:** because
`Heading`'s scale lives in the component, the only lever a consumer has is to redefine Tailwind's
own `--text-*` steps globally — which happens to be safe in our app only because those steps are
used exclusively by headings here. In an app that uses `text-3xl` for body copy it would be
unusable. That is the strongest argument for moving the scale into tokens: right now the consumer
workaround is "reach past the design system and edit Tailwind."

### §4 is a smaller change than we implied, and Option A won

We suggested Option B (keep tan paper as the card, darken the page). We built that first and then
abandoned it. Two warm tans plus white chrome is one tier too many: once controls and chrome were
white, the middle tone had no distinct job, and detail panels and map popups looked muddy beside
them. **Option A — `--card: white` — is both simpler and better**, and it removed a local token plus
three override rules we had needed for the header, footer and hero band, because every `bg-card`
consumer landed on white for free. That one change was **−35 lines** in our override file.

So the recommendation firms up: give `--card` a value distinct from `--background`, and in a tinted
program make it white rather than a second tint.

### Two bugs that only became visible after fixing §4

**11.1 — `DialogContent` fills with `bg-background`, and `--popover` is dead code.** Stock, this is
invisible: `--background`, `--card` and `--popover` are the same value, so a modal in the page colour
looks fine. The moment `--background` becomes the page tone, every dialog renders *in the page
colour* — a raised, focus-trapped surface that reads flat against what is behind it, separated only
by the overlay scrim. The system already ships `--popover` and `--popover-foreground` and **no
component consumes either.** The overlay recipes should use `bg-popover`.

**11.2 — `Tabs`' active state gets worse, not better.** §8.7 measured it at 1.36:1. After the surface
split the naive result is **1.06:1**, because the active trigger is `bg-background` on a `bg-muted`
track and `--background` moved further from `--muted`. This is not a value problem: the shadcn "lift
the active tab out of the muted track" idiom depends on the page being white and the track being
grey, and it has no analogue in a tinted palette. We had to fill the active tab with `--primary`
instead. **`Tabs` needs a filled/high-contrast active variant** for any program that is not the
parent brand.

Both of these are worth stating plainly: **the 1.00:1 surface binding has been masking downstream
errors, not merely looking flat.** Expect a few more when you fix it.

### §8.1 is three gaps, not one — we ended up hand-rolling the chip

We tried to build one component — a feature pill listing ~20 camp amenities — out of `Badge`, and
failed three separate times:

1. **`uppercase tracking-wider`** shouted Title Case vocabulary labels (the original §8.1).
2. **`subtle` is `bg-secondary`**, a mid-tone tan. On a tinted page that is a *filled blob*, not a
   quiet chip. There is no light fill in the variant set.
3. **`outline` is primary-tinted** — border *and* label. With 20 pills that reads as 20 emphasised
   items; there is no neutral outline.

So the final component uses no `Badge` at all: `rounded-full border bg-card px-2.5 py-1` hand-rolled.
A `Badge` that offered {fill: none | light | solid} × {tone: neutral | primary | …} would have covered
it. Worth noting we ALSO needed a neutral-vs-interactive distinction: our non-interactive feature
pills use `--border` (2.66:1, decorative, 1.4.11 does not apply) while the interactive filter chips
use `--input` (3.87:1) plus hover and focus. **Keeping `--border` and `--input` as genuinely
different values is what makes "looks like a chip" and "is a control" distinguishable** — today they
are set identically in all five programs, so that distinction is not available. That strengthens §5:
it is not only a contrast fix, it is a missing design capability.

### Target size and dense multi-select are in tension, and the system should say so

Worth documenting because it is not obvious: **a non-overlapping 44px target forces a 44px row
pitch.** For our 23-chip filter rail at a 30px visible chip, that leaves 14px of dead gap between
every row and there is no way to spend it differently — the pitch is the target, not the chip.

We ended up scoping the chips to 2.5.8 (AA, 24px) with a 36×60px target, which recovered ~112px
(~25% of the block). Everything else in the app still holds 44px.

If AAA is the system's posture, a shipped `ToggleGroup` should either take an explicit density
prop or the docs should state that 2.5.5 and dense multi-select cannot both be satisfied, so
consumers make that trade knowingly rather than discovering it in a layout review.

### Two smaller ones

**11.3 — `Card variant="flat"` ships no border at all** (`bg-muted/40` only). `border-dashed` alone
renders nothing, because it sets border-*style* with no width or colour, so a dashed placeholder
panel has to spell out `border border-dashed border-border` — exactly the hand-rolled string `Card`
exists to absorb. The three-value `variant` enum conflates fill, border-width, border-colour and
shadow; an orthogonal `bordered` axis would fix it.

**11.4 — please ship an optional `maplibre.css`.** Once a map is framed with the system's border and
radius, MapLibre's stock chrome (`background: #fff`, `border-radius: 3px`, its own shadow) sits right
at the frame and reads as a different design system. It is the same six selectors for every consumer:
`.maplibregl-popup-content`, the four per-anchor `.maplibregl-popup-tip` rules, `.maplibregl-ctrl-group`
and `.maplibregl-ctrl-attrib`. One gotcha to bake in: the tip is a CSS triangle, so **only the single
pointing border side may be coloured per anchor** — colour all four and the arrow becomes a solid
square. (Ours is written and working; happy to hand it over.)

### Confirmed by implementation

- **§9.2 is real and it bites.** We had to move two declarations out of `@layer utilities` entirely,
  because unlayered `.display` beats a layered rule *regardless of specificity* —
  `[data-program] button[aria-pressed]` at 0,2,1 still loses to `.display` at 0,1,0. The failure is
  silent: `font-medium` simply has no effect. Either document it prominently or find a way to layer
  `.display` in the source builds while keeping it unlayered in the prebuilt exports.
- **§3's headroom claim held.** `#1D5E42` with a white label measures 7.69:1 in the running app, and
  the split let `Button secondary`/`ghost` and links stay AAA at 8.53:1 on the card.
- **§4's ~1.1–1.2:1 target was right.** White on `#E9E3D3` measures 1.28:1 and reads as properly
  layered without looking like a hard edge.
