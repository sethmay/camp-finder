# Tentaroo councils — DEFERRED (not publicly scrapable) — 2026-07-18

These 34 councils register via **Tentaroo**. A polite HTTP scraper cannot pull their
camp data — three independent blockers, each fatal:

1. **Auth-gated.** Public event URLs (`https://<slug>.tentaroo.com/admin2/events/<grp>/<id>/<slug>`)
   redirect to `/admin2/login` even in a full JS browser. No unauthenticated event view.
2. **robots.txt disallows** `/admin2/` and `/calendar/` on every tentaroo subdomain
   (`padutch.`, `users.`, `www.`); `forms.tentaroo.com` disallows `/`. Our scrapers honor robots.
3. **JS-rendered SPA.** Pages are client-rendered shells; the one allowed public page
   (`/calendar`) is an empty month grid with no event/price data.

Even a headless browser wouldn't help — the wall is **login**, not rendering, and we have
no credentials (nor should we use any). Camp data for these councils is instead extracted
from each council's OWN public website (see the agent-assisted extraction pass, 0.12.0).

**URL pattern** (for manual investigation): `https://<council-slug>.tentaroo.com/` → redirects
to `/admin2/`; the slug is council-specific (not derivable from the council number).
Confirmed examples: `gac` (001), `prairielands` (117), `lh` (205), `ecc` (426), `padutch` (524), `nbf` (544).

| Council | State | Council website | Tentaroo link (best-effort) |
|---|---|---|---|
| council-001 Greater Alabama Council | AL | https://1bsa.org/ | gac.tentaroo.com |
| council-018 Natural State Council | AR | https://www.naturalstatecouncil.org/ | www.tentaroo.com (subdomain not on public pages) |
| council-058 Verdugo Hills Council | CA | https://www.vhscouting.org/ | www.tentaroo.com (subdomain not on public pages) |
| council-067 Greenwich Council | CT | https://www.greenwichscouting.org/ | www.tentaroo.com (subdomain not on public pages) |
| council-085 Gulf Stream Council | FL | http://www.gulfstreamcouncil.org/ | www.tentaroo.com (subdomain not on public pages) |
| council-087 North Florida Council | FL | http://www.nfcscouting.org/ | www.tentaroo.com (subdomain not on public pages) |
| council-092 Atlanta Area Council | GA | https://www.scoutingatl.org/ | www.tentaroo.com (subdomain not on public pages) |
| council-096 Central Georgia Council | GA | http://www.centralgeorgiacouncil.org/ | www.tentaroo.com (subdomain not on public pages) |
| council-098 South Georgia Council | GA | https://www.sgcbsa.org/ | www.tentaroo.com (subdomain not on public pages) |
| council-100 Northwest Georgia Council | GA | https://www.nwgascouting.org/ | www.tentaroo.com (subdomain not on public pages) |
| council-101 Northeast Georgia Council | GA | http://nega-bsa.org/ | www.tentaroo.com (subdomain not on public pages) |
| council-106 Mountain West Council | ID | https://www.mountainwestcouncil.org/ | www.tentaroo.com (subdomain not on public pages) |
| council-117 Prairielands Council | IL | http://www.prairielandsbsa.org/ | prairielands.tentaroo.com |
| council-205 Lincoln Heritage Council | KY | http://www.lhcbsa.org/ | lh.tentaroo.com |
| council-211 Istrouma Area Council | LA | http://www.istroumascouting.org/ | www.tentaroo.com (subdomain not on public pages) |
| council-212 Evangeline Area Council | LA | https://www.eacscouting.org/ | www.tentaroo.com (subdomain not on public pages) |
| council-213 Louisiana Purchase Council | LA | https://www.louisianapurchasecouncil.org/ | www.tentaroo.com (subdomain not on public pages) |
| council-234 Western Massachusetts Council | MA | https://www.wmascouting.org/ | www.tentaroo.com (subdomain not on public pages) |
| council-341 Jersey Shore Council | NJ | http://www.jerseyshorescouts.org/ | www.tentaroo.com (subdomain not on public pages) |
| council-347 Monmouth Council | NJ | https://www.monmouthcouncilscouting.org/ | www.tentaroo.com (subdomain not on public pages) |
| council-414 Daniel Boone Council | NC | https://www.danielboonecouncil.org/ | www.tentaroo.com (subdomain not on public pages) |
| council-415 Mecklenburg County Council | NC | http://www.mccscouting.org/ | www.tentaroo.com (subdomain not on public pages) |
| council-416 Central North Carolina Council | NC | https://www.centralncscouting.org/ | www.tentaroo.com (subdomain not on public pages) |
| council-424 Tuscarora Council | NC | https://www.tuscarorabsa.org/ | www.tentaroo.com (subdomain not on public pages) |
| council-425 Cape Fear Council | NC | https://www.capefearscouting.org/ | www.tentaroo.com (subdomain not on public pages) |
| council-426 East Carolina Council | NC | https://www.scoutingecc.org/ | ecc.tentaroo.com |
| council-427 Old Hickory Council | NC | https://www.oldhickorycouncil.org/ | www.tentaroo.com (subdomain not on public pages) |
| council-460 Erie Shores Council | OH | https://www.erieshorescouncil.org/ | www.tentaroo.com (subdomain not on public pages) |
| council-524 Pennsylvania Dutch Council | PA | https://padutchbsa.org/ | padutch.tentaroo.com |
| council-544 New Birth of Freedom Council | PA | http://www.newbirthoffreedom.org/ | nbf.tentaroo.com |
| council-567 Buffalo Trail Council | TX | https://www.buffalotrailbsa.org/ | www.tentaroo.com (subdomain not on public pages) |
| council-624 Gateway Area Council | WI | https://www.gatewayscouting.org/ | www.tentaroo.com (subdomain not on public pages) |
| council-748 Natchez Trace Council | MS | https://www.natcheztracecouncil.org/ | www.tentaroo.com (subdomain not on public pages) |
| council-777 Washington Crossing Council | PA | http://www.wccscouting.org/ | www.tentaroo.com (subdomain not on public pages) |

_Subdomains marked "not on public pages" are hidden behind a JS/button one or more clicks
deep; follow the council's "Camps / Register" links in a browser to find the `<slug>.tentaroo.com`._

---

## Agent-assisted extraction results (0.12.0)

Camp data for these councils was extracted from each council's OWN public website by a
7-subagent swarm (method `llm_extraction`, confidence 0.6 — **verify before trusting**).
Merged **35 camps / 116 sessions across 29 councils**. Spot-checked fees against source
(Bashore $480/$200, Sidney Dew $360/$145 exact; Raven Knob dates confirmed).

**Needs manual follow-up:**

- **No resident camp found (3 councils):** council-058 Verdugo Hills (Camp Verdugo Oaks is
  weekend/rental only), council-067 Greenwich (Seton = day camp / weekend only), council-096
  Central Georgia (Camp Benjamin Hawkins sold 2024; site shows only Cub/day camp).
- **Excluded as uncertain (2):** council-098 Camp Osborn and council-212 Mountain Bayou Scout
  Camp — council camp properties with no published resident Scouts BSA summer sessions.
- **Geocoded to precise coords (13 camps, RESOLVED):** al-camp-comer, al-camp-sequoyah,
  ar-camp-de-soto, ar-camp-orr, ga-woodruff-scout-camp, ga-camp-rainey-mountain,
  id-bradley-scout-reservation, il-camp-robert-drake, la-camp-avondale, oh-camp-frontier,
  tx-buffalo-trail-scout-ranch, wi-camp-decorah, ms-camp-yocona — coordinates researched from
  TopoZone/USGS + official council GPS listings and applied; all 35 camps now map (0 warnings).
- **No sessions (dates not posted):** la-camp-avondale, ms-camp-yocona (real camps, listed w/o dates).
- **Prior-year dates:** council-205 Pfeffer Scout Reservation lists only 2027 dates; council-211
  Camp Avondale had only 2022 (dropped).
