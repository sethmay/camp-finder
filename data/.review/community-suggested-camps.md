# Community-suggested camps & feedback — Reddit r/BSA

Source: r/BSA thread "I'm building a tool to find BSA summer camps" (`1v0tqo9`).
Full-comment pass on 2026-07-19, cross-checked against **160 camps** in `web/public/data/camps.json` (v0.16.0).

Status legend: **MISSING** (not in dataset, council exists) · **NEW-COUNCIL** (council also absent) ·
**HAVE** (present) · **VERIFY** (ambiguous match) · **CORRECTION** (data fix) · **OUT?** (beyond v1 scope).

---

## 1. Missing camps to add (actionable — council already in registry)

| Camp | State | Council (id · #camps) | Source | Notes |
|---|---|---|---|---|
| Camp Gorsuch | AK | Great Alaska (610 · 1) | 358STA | Anchorage |
| Lost Lake | AK | Great Alaska (610 · 1) | 358STA | Fairbanks |
| Camp Easton | ID | Inland Northwest (611 · 0) | TheseusOPL | nwscouts.org |
| Camp Grizzly | ID | Inland Northwest (611 · 0) | TheseusOPL | distinct from MO "Grizzly Day Camp" |
| Camp Bud Schiele | NC | Piedmont NC (420 · 0) | elephagreen | Rutherfordton |
| Camp Davy Crockett | TN | Sequoyah (713 · 0) | elephagreen | |
| H. Roe Bartle | MO | Heart of America (307 · 0) | elephagreen | Osceola |
| Camp La-No-Che | FL | Central Florida (083 · 0) | fla_john | camplanoche.com |
| Longhorn Council camps | TX | Longhorn (662 · 0) | bonniebelle29 | whole TX council empty — Worth Ranch, Sid Richardson SR, etc. (longhorncouncil.org/camp-properties) |
| Camp Arrowhead | MO | Ozark Trails (306 · 0) | Lakota_Six | Marshfield; oldest continuously-run camp W of the Mississippi (100 yrs) |
| Camp Three Falls | CA | Ventura County (057 · 0) | HockeyPhoenician | |
| Camp Liberty | PA | Laurel Highlands (527 · 2) | Here_Lah | Heritage Reservation (heritagereservation.org/camp-liberty) |
| Goose Pond Scout Reservation | PA | Northeastern PA (501 · 0) | Here_Lah | gpsr.nepabsa.org |
| Akridge Scout Reservation | DE | Del-Mar-Va (081 · 2) | pgm928 | Dover; Cub in summer, year-round for Scouts |
| Camp Catoctin | MD | Baltimore Area (220 · 1) | Here_Lah | weownadventure.com/camp-catoctin-2026 |

## 2. Missing — council also absent (needs council add first)

| Camp | State | Council | Source | Notes |
|---|---|---|---|---|
| Camp Sinoquipe | PA | Mason-Dixon (NOT in registry) | DrFiveLittleMonkeys | "between Tuckahoe and Heritage, mid/southern PA" |

## 3. VERIFY — ambiguous / possible duplicate

| Camp | Source | Notes |
|---|---|---|
| "Summit" (summitbsa.org/scout-camp) | Here_Lah | council unclear; not the national Summit Bechtel — confirm which council |
| Tuscarora (bpcouncil.org) | Here_Lah | we already have Camp Tuscarora (NC, Tuscarora Council) + Tuscarora SR (NY, Baden-Powell); confirm bpcouncil.org isn't a 3rd |
| Camp Pioneer (Ohio) | errol_timo_malcom | our only "Camp Pioneer" is NY (Massawepie). errol's OH one is likely Erie Shores' Pioneer Scout Reservation (where we already have Camp Frontier) — confirm/don't dup |

## 4. Corrections flagged by the community

| Item | Source | Action |
|---|---|---|
| **D-bar-A Scout Ranch (272)** no longer runs a traditional summer resident camp — only scouting events; it is MCC's only horseback-riding MB site | CrayonsShallBeEaten | We added it in 0.16.0 **with 2 summer sessions** — reclassify `status: not_operating`, drop those sessions, note horseback MB. **Fix before next ship.** |
| Activity/feature filter has visible errors; hard to find where to submit corrections | TheseusOPL | QA the `features` data; prioritize the crowdsource correction path |

---

## 5. Already resolved (added in v0.16.0 / prior) — for OP's reference

All of these were requested in-thread and are now in the dataset:
Camp Emerald Bay, Mataguay Scout Ranch, Camp Whitsett, Camp Fiesta Island (CA) · Camp Geronimo, R-C Scout
Ranch, Camp Lawton (AZ) · Camp Wehinahpay (NM) · Camp Alexander (CO) · D-bar-A*, Cole Canoe Base, Camp
Hiawatha, Gerber Scout Reservation, Camp Teetonkah (MCC 272) · Camp Lakota (OH, Black Swamp) · Camp Cutler
+ Massawepie (Seneca Waterways) · Goshen Scout Reservation camps — Bowman/Marriott/Lenhok'sin/PMI + prior
Olmsted/Ross (NCAC) · Camp William B. Snyder (NCAC) · Camp T. Brady Saunders (Heart of Virginia) · Greater
St. Louis camps (312) · Camp Big Horn (GLAAC) · Philmont, Florida Sea Base, Long Beach Sea Base ·
Daniel Boone, Rodney SR, Raven Knob, Cherokee SR, Camp Boddie, Ockanickon (NC/DE/PA).
(*D-bar-A needs the status correction in §4.)

## 6. Feature requests

- **Program-type labels** — High Adventure / Cub / NYLT / special programs (errol_timo_malcom).
  HA + Cub **shipped** in 0.16.0 (program-category filter + badges). **NYLT** not yet a category — candidate tag.
- **Specialty-program filters** (catdogfido): Horses, Whitewater, ATV, Scuba, Open Rock Climbing, Sporting
  Arrows. Coverage today via `Feature` enum: horseback ✓, atv ✓, scuba ✓, climbing ✓, shooting_sports (~archery) ✓;
  **whitewater is missing** — candidate feature. (Distance search already exists.)
- **Make filters more visible** (Capable_Function5498; OP agreed).
- **Crowdsource correction/submission** (multiple + OP) — already parked in TODO; thread shows real demand.
- **Pin/FAQ the tool in r/BSA** (HockeyPhoenician).
- **OUT? (park — beyond v1 "council resident summer camp" scope):** off-season facility rental / lodging
  info (elephagreen); former/defunct camps sold to orgs that still allow scout camping + local/state/fed
  camping lands e.g. Current River/Elephant Rocks MO, Wolf River WI (Breitsol_Victor).

## 7. Data sources mentioned

- **scoutingevent.com/Global** (looktowindward) — integrated in 0.15.0.
- **Google Maps custom "BSA Camps" maps** ×2 (Sinister-Aglets; Joetoise `mid=1DI12Q2fJ4JKEs0pw9PaZ9QnMC_dOuvj7`) — new leads, community-maintained.
- **campreservation.com** (TheseusOPL) — Black Pug map; overlaps our Global-index integration.
- **usscouts.org Online Camp Database** (random8765309) — assessed; robots-blocked, humans-only reference.
- **Wikipedia "List of council camps (BSA)"** (HockeyPhoenician) — stale/dead links, seed-only.
- **OA forms / Black Pug control boxes** for full council lists (princeofwanders).
- **Reddit API** (S_Alaska) — MCP now installed (this pass).

## 8. Contributor offers (community help)

- **dmurawsky** — devops/devex/platform/architecture; building an open-source scouting design system.
- **S_Alaska** — nosql + debug; wrote a Python per-camp sentiment scraper; building a JOTA/JOTI tool.
- **CallingDrPug** — 20+ yrs in the space; DM offered.
- **coel03** — offered to do camp reviews/data QA.
- **joshf81 / elephagreen / catdogfido** — general help + testing.

---

## 9. Update — shipped in v0.17.0 (2026-07-19)

**Added (agent-extracted, conf 0.6, per-council official pages) — 15 camps / 51 sessions across 12 councils:**
Camp Gorsuch (Scouts BSA + Cub, AK/610) · Lost Lake Scout Camp (AK/610, no published dates) ·
Camp Easton, Camp Grizzly (Scouts BSA + Cub) (ID/611) · Camp Bud Schiele (Scouts BSA + Cub, NC/420) ·
Camp Davy Crockett (TN/713) · H. Roe Bartle Scout Reservation (10-day sessions) + Theodore Naish Scout
Reservation (Scouts BSA + Webelos) (MO/KS, HoAC/307) · Camp Arrowhead (Scouts BSA + Cub, MO/306) ·
Camp La-No-Che (FL/083) · Worth Ranch (TX/662) · Camp Liberty (PA/527) · Goose Pond Scout Reservation
(PA/501) · Akridge Scout Reservation day camp (DE/081) · Ventura County Cub Scout Day Camp (CA/057).

**Corrections applied:**
- **D-bar-A Scout Ranch (272)** → `not_operating`, sessions removed (no longer a summer resident camp; noted horseback-MB).
- **Camp Three Falls (Ventura, 057)** — sold Nov 2024; NOT added. Added VCC's current Cub day camp instead.
- **Camp Catoctin** — not a Baltimore Area Council summer camp on verification; excluded.
- **Akridge (081)** — is a Cub *day* camp; the council's Cub *resident* camp is at Henson SR (already in data).
- **Camp Liberty (527)** — superseded the generic Black-Pug entry `pa-heritage-reservation-sbsa-camp` (Heritage's two named Scouts BSA camps are now Independence + Liberty).

**Still open (deferred):**
- Camp Sinoquipe — **Mason-Dixon Council not in registry** (needs council add first).
- VERIFY items unresolved: "Summit" (summitbsa.org, council?), Tuscarora (bpcouncil.org) vs our 2 Tuscaroras, Camp Pioneer (Ohio) vs Erie Shores' Pioneer Scout Reservation.
- Sid Richardson Scout Ranch (Longhorn) — not confirmed as a summer *resident* camp; only Worth Ranch added.
- Fees null for many new camps (posted only behind registration portals) — enrich later.
