# Camp Finder — Design Brief (for the Claude designer)

> **Purpose of this document.** You are designing the UX/UI for *Camp Finder*. Read this
> brief, then produce a **design handoff package** (spec'd in §10) that an implementing
> engineer will build against directly. The engineering stack, component names, data
> shapes, and behaviors are already fixed in `IMPLEMENTATION.md`; **design to those names
> so your handoff maps 1:1 to the code.** You own look, layout, interaction, hierarchy,
> content design, states, and accessibility. You do **not** need to change the data model
> or tech stack.

---

## 1. Product in one line
A free, **static** website where a Scout troop discovers Scouts BSA **resident summer
camps** nationwide — filtering by distance, available weeks, cost, and features — and
clicks through to each camp's **official council page**. It aggregates and points; it is
never the authority.

## 2. Who uses it (design for these people)
- **Primary: the Scoutmaster / troop camping coordinator.** Volunteer, often 40s–60s,
  time-poor, frequently on a **phone**, sometimes not highly technical. Planning next
  summer for 10–30 scouts + adult leaders. Cares about: is it close enough, can we go the
  weeks we're free, can our families afford it, what can the scouts do there, and *is this
  information I can trust / where's the official page.*
- **Secondary: a parent** sanity-checking cost and dates.
- **Tertiary: a camp director** verifying their own listing (later phase).

### Jobs to be done (design must make each fast)
1. "Show me camps within *N* miles of our ZIP that run the weeks we can go."
2. "Which of those fit our budget?"
3. "Which have the program my older scouts want (climbing, ATV, high-adventure track)?"
4. "Take me to the official page so I can actually register / confirm."
5. "Can I trust this? When was it last checked?"

## 3. Tone & brand guardrails
- **Trustworthy, outdoorsy, plainspoken, uncluttered.** Think "well-run park map,"
  not "travel-deals marketing site." No hype, no dark patterns, no fake urgency.
- **Unofficial community tool.** MUST be visually clear it is **not affiliated with or
  endorsed by Scouting America**. Do **not** use the Scouting America / BSA logos,
  fleur-de-lis trademark, or official color/wordmark lockups. Create an independent,
  original identity (a neutral outdoors motif is fine — pine, topo lines, trail markers).
- Accessible, legible, high-contrast; readable outdoors on a phone in sunlight.
- No emoji as UI chrome; use a clean line-icon set.

## 4. Screens to design (these are the exact pages/components in the build)
Design every screen at **mobile (375px)**, **tablet (768px)**, and **desktop (1280px)**.
Mobile-first: the phone layout is the primary artifact, not an afterthought.

### 4.1 Home / Search (`/`) — the core screen, spend the most effort here
A combined **filter + results list + map** experience.
- **Filter bar / panel** (`Filters`): ZIP + radius, week/date-range, cost, features
  (multi-select), state, text search. Design its **collapsed mobile form** (a sticky
  "Filters" button opening a sheet, with active-filter chips shown) and its **desktop
  form** (persistent left rail or top bar). Show active filters as removable chips and a
  result count ("48 camps").
- **Results list** (`ResultsList` of `CampCard`): each card shows camp name, council,
  **distance**, **next available week**, **fee-from**, **feature chips**, and a
  **"verified <date>" badge**. Design the card, its hover/active state, and its
  relationship to the map (hovering a card highlights its map marker).
- **Map** (`MapView`): markers, **clustering** at low zoom, a marker popup (mini card).
  Specify how list and map share the viewport, and the **mobile list⇄map toggle**.
- **Empty state** (`EmptyState`): no results — friendly, with "clear/loosen filters"
  guidance. Also design the "no ZIP entered yet" first-run state.
- **Sort control**: distance / cost / name.

### 4.2 Camp detail (`/camps/[id]`)
The trust-and-convert page (also the Google landing page, so it must stand alone).
- Header: camp name, council, location, **mini-map**.
- **Sessions table**: week label, dates, youth fee, adult fee, per-session "Register"
  link. Design for 1–8 rows; handle "fee unknown" and "dates TBD" gracefully.
- Feature chips, short description.
- **Primary CTA: "Visit official council page."** This is the most important button on
  the site — make it unmistakable and repeated appropriately.
- **Provenance footer**: "Source: <council page> · Last verified <date>", and a
  **stale badge** when data is > 12 months old.
- A subtle "See a problem? Suggest a correction" link.

### 4.3 About (`/about`)
Methodology, the unofficial-tool disclaimer, and how to submit a correction. Simple
long-form content — design the type system and a clean prose layout here.

### 4.4 404 + global chrome
`Header` (logo/wordmark, nav: Search / About) and `Footer` (disclaimer, correction link,
data-freshness summary). Design both.

## 5. Key interaction states to specify (don't skip these)
For the search experience and cards, define: **default, hover, focus (keyboard),
active/selected, loading (data fetch), empty (no results / no ZIP), error (data failed to
load), and stale (data > 12 months).** Also: a **"fee unknown"** treatment and a
**"registration not yet open"** treatment on sessions.

## 6. Data you're designing around (so labels/space are realistic)
Each camp card/detail is driven by this shape (from `IMPLEMENTATION.md`; use realistic
sample values in mockups):
- Camp: name, council name, city/state, distance (mi), features[] (up to ~13 chips),
  short description, `verified_at` date, official `website_url`.
- Session (1–8 per camp): week/date range (e.g. "Jun 14–20"), youth fee (e.g. $415) or
  unknown, adult fee, availability (open/waitlist/full/unknown), register link.
- Feature vocabulary (design chips/icons for these): dining hall, waterfront, pool,
  shooting sports, climbing, horseback, ATV, COPE, older-scout program, high-adventure
  option, STEM, scuba, mountain biking.
Use **plausible real numbers**: fees ~$300–$650, camps 5–150 miles away, weeks in
mid-June through early August.

## 7. Constraints that shape the design
- **Static site, client-side filtering** — no server round-trips; instant filter
  response. Design for immediacy (no spinners between filter changes).
- **Map basemap is MapLibre GL** with a free tile source — provide a **map style
  direction** (muted, low-saturation base so markers pop) but keep it achievable with
  standard vector styling; don't design a bespoke cartography that can't be rendered.
- **Mobile-first & one-hand use** — primary actions reachable with a thumb; sticky filter
  entry + sticky primary CTA on detail.
- **WCAG 2.1 AA**: contrast ≥ 4.5:1 for text, visible focus, all controls keyboard- and
  screen-reader-operable, map has an accessible list equivalent. Your color tokens MUST
  pass contrast — include the checks.
- **Performance budget**: keep the aesthetic lightweight (system/variable font or one
  webfont; SVG line icons; no heavy imagery required). Hero imagery optional and must be
  optional-to-load.

## 8. Deliver design tokens the engineer can drop in
The build consumes tokens as a **Tailwind theme + CSS variables** (`tokens.css`). Provide
tokens in a form that maps cleanly to that: color scale (with semantic roles: bg,
surface, text, muted, primary/CTA, accent, success/open, warning/waitlist, danger/full,
border), type scale + font stack, spacing scale, radii, shadows, and breakpoints
(mobile 375 / tablet 768 / desktop 1280 to match §4).

## 9. What NOT to do
- Don't redesign the data model, add features requiring a backend (accounts, saved
  searches server-side, live availability guarantees, payments), or invent data fields
  not in §6.
- Don't use official Scouting America branding or imply endorsement.
- Don't rely on hover-only interactions (must work on touch) or color-only signaling
  (pair color with text/icon for open/waitlist/full and for stale).

---

## 10. Handoff package to return (this is your deliverable)
Return a package the implementer can build from **without a live design-tool license**.
Prefer text/markdown + inline SVG/PNG so it lands in the repo. Include:

1. **Screen designs** for all §4 screens at all three breakpoints (375 / 768 / 1280),
   with the interaction states in §5 shown.
2. **Annotated redlines**: spacing, sizes, type, and token references on each key screen —
   enough that layout is unambiguous.
3. **Component specs**, one per component named in `IMPLEMENTATION.md` §8.2 —
   `Filters`, `ResultsList`, `CampCard`, `MapView`, `ProvenanceBadge`, `FeatureChip`,
   `EmptyState`, `StaleBadge`, `Header`, `Footer`, plus the camp-detail sessions table.
   For each: anatomy, all states, responsive behavior, and content/overflow rules.
4. **Design tokens** (§8) as a JSON or CSS-variables block **plus** a ready-to-paste
   `tailwind.config` theme fragment, with documented WCAG contrast results.
5. **Iconography**: the feature-icon set (§6 vocabulary) as SVGs or a named set + sizes.
6. **Map style direction**: palette + marker/cluster/popup design and states.
7. **Content/microcopy**: labels, empty/error/stale strings, the disclaimer wording, CTA
   text, and the correction-link copy.
8. **Accessibility notes**: focus order, aria labels (esp. map + markers + filter
   controls), the list-equivalent for the map, and contrast confirmations.
9. **A short "how this maps to the build" note**: which frame → which component/page, so
   the engineer can go frame-by-frame.

**Definition of done for the handoff:** an engineer following `IMPLEMENTATION.md` §8 can
build every screen and state from your package alone — no missing tokens, states,
breakpoints, or copy, and every artifact ties to a named component or page.
