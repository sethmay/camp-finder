# Camp Finder — Design Handoff (v1)

Everything an engineer needs to build every screen and state in `IMPLEMENTATION.md §8`
without a design-tool license. Original, trademark-safe identity — **not affiliated with
or endorsed by Scouting America**; no BSA logos, fleur-de-lis, or official lockups are used.

## Contents
| File | What it is |
|---|---|
| `Camp-Finder-Design-Spec.html` | The full visual spec. Open in any browser, offline. Every screen at mobile 375 + desktop 1280, all interaction states, component anatomy, map direction, microcopy, and a11y notes. This is the source of truth for layout. |
| `tokens.css` | Design tokens as CSS custom properties. Drop into the app. |
| `tailwind.theme.js` | Same tokens as a `theme.extend` fragment for `tailwind.config.js`. |
| `README.md` | This file. |

## How to read the spec
The HTML is organized in nine numbered sections (nav bar sticks to the top):
1. **Identity** — three wordmark directions. Recommended: **A · Trailhead** (tent glyph).
2. **Tokens** — color roles with measured WCAG ratios, type/space/radii/shadow scales,
   plus the exact `tokens.css` + Tailwind blocks reproduced in this folder.
3. **Icons** — Lucide (MIT) glyph per feature in §6. `horseback` needs a custom 1-glyph
   addition (flagged in the set).
4. **Home / Search** (`/`) — the core screen. Desktop split (264px filter rail · fluid
   results · 470px sticky map) and five mobile states.
5. **Camp detail** (`/camps/[id]`) — sessions table, repeated primary CTA, provenance
   footer, stale banner; desktop + mobile.
6. **About** (`/about`) + **404** + global Header/Footer.
7. **States** — CampCard (default/hover/focus/selected/loading/stale) and every session
   treatment (open/waitlist/full/unknown/reg-not-open/fee-TBD/dates-TBD) + error.
8. **Components** — one spec (anatomy · states · responsive · overflow) per named
   component: Filters, ResultsList, CampCard, MapView, ProvenanceBadge, FeatureChip,
   EmptyState, StaleBadge, Header, Footer, and the sessions table.
9. **Map direction · microcopy · accessibility · build-mapping.**

## Fonts
Load these three (Google Fonts): **Libre Franklin** (display), **Public Sans** (UI/body),
**IBM Plex Mono** (labels). One-line import:
`https://fonts.googleapis.com/css2?family=Libre+Franklin:wght@400..900&family=Public+Sans:wght@400..700&family=IBM+Plex+Mono:wght@400..600&display=swap`

## Non-negotiables baked into the design
- **Instant, client-side filtering** — no spinner on filter change; skeleton only on first
  data load.
- **Status is never color-only** — always color + icon + text (color-blind + SR safe).
- **WCAG 2.1 AA** — contrast ratios documented in §2; 2px accent focus ring at 2px offset;
  ResultsList is the accessible equivalent of MapView; hit targets ≥ 44px.
- **The disclaimer** ("Not affiliated with or endorsed by Scouting America") ships in the
  footer on every page.
- **Primary CTA** — "Visit official council page" is the highest-emphasis element on the
  detail page and is repeated (header block, above sessions, sticky bottom on mobile).

## Map (MapLibre GL)
Muted low-saturation basemap so markers pop: land `#E6E2D6`, water `#CBD9DE`, park
`#D3DBCB`, roads `#EFEDE6`, labels `#B8BEB0`. Price-pill markers (white/ink default,
primary-green on hover/select), primary-green count clusters, mini-CampCard popup.
See §9 of the spec for full marker/cluster/popup states.

## Open questions for the team
- Lock the wordmark (recommend **A · Trailhead**).
- Sample data in the mocks is Oregon-region (Cascade Pacific / Oregon Trail councils) —
  swap for your launch region if needed.
- `horseback` icon needs a custom glyph.
