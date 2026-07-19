# Community-suggested camps — to investigate individually

Source: Reddit r/BSA thread "I'm building a tool to find BSA summer camps" (2026-07-19).
Status legend: **MISSING** (not in dataset) · **HAVE** (present) · **PARTIAL** (related entry exists) ·
**OUT?** (likely out of v1 scope — high-adventure/national base or non-BSA land). Cross-checked
against the 126 camps in `web/public/data/camps.json`.

| Status | Camp | State | Council (hint) | Source | Notes |
|---|---|---|---|---|---|
| MISSING | Camp Cutler | NY | Greater Finger Lakes / Seneca Waterways (397) | joshf81 | council renamed from Seneca Waterways |
| PARTIAL | Camp Massawepie | NY | Seneca Waterways (397) | joshf81 | we have "Massawepie Scout Camps – Camp Pioneer/Adirondack Treks" |
| MISSING | Camp Geronimo | AZ | Grand Canyon (010) | HockeyPhoenician | GC on Tentaroo/custom — Black Pug scrape missed |
| MISSING | R-C Scout Reserve | AZ | Grand Canyon (010) | HockeyPhoenician | |
| MISSING | Camp Lawton | AZ | Catalina (011) | HockeyPhoenician | |
| MISSING | Camp Fiesta Island | CA | San Diego-Imperial (049) | HockeyPhoenician | likely Cub/day |
| MISSING | Camp Emerald Bay | CA | Western LA County (051) | HockeyPhoenician | Catalina Island |
| MISSING | Camp Whitsett | CA | Western LA County (051) | HockeyPhoenician | |
| MISSING | Camp Wehinahpay | NM | Conquistador (413) | HockeyPhoenician | |
| MISSING | Camp Alexander | CO | Pikes Peak / Pathway to the Rockies | HockeyPhoenician | |
| MISSING | D-A Scout Ranch (D-Bar-A) | MI | Michigan Crossroads (272) | HockeyPhoenician, errol | |
| MISSING | Cole Canoe Base | MI | Michigan Crossroads (272) | HockeyPhoenician, errol | |
| MISSING | Camp Hiawatha | MI | Michigan Crossroads (272) | errol | |
| MISSING | Gerber Scout Reservation | MI | Michigan Crossroads (272) | errol | |
| MISSING | Camp Teetonkah | MI | Michigan Crossroads (272) | errol | Cubs |
| MISSING | Camp Pioneer (Ohio) | OH | Ohio council TBD | errol | NB: our "Camp Pioneer" is the Oregon demo one — different camp |
| MISSING | Camp Lakota | OH | Ohio council TBD | errol | |
| MISSING | Goshen Scout Reservation | VA | National Capital (082) | looktowindward | reservation w/ ~6 camps; we have only Olmsted + Ross |
| PARTIAL | Camp Snyder | VA | National Capital (082) | looktowindward | we have "Camp Snyder Specialty Weeks" only |
| MISSING | Camp T. Brady Saunders | VA | Heart of Virginia (602) | looktowindward | |
| MISSING | Greater St. Louis camps (312) | MO | Greater St. Louis (312) | random8765309 | Scouts BSA/Venturing/Sea Scouts + Cub day/overnight (stlbsa.org/camps) |
| HAVE | Camp Big Horn | CA | Greater LA (033) | HockeyPhoenician | "HESR Camp Big Horn at Circle X Ranch" |
| OUT? | Philmont Scout Ranch | NM | National HA base | HockeyPhoenician | high-adventure, not a council resident camp |
| OUT? | Sea Base Florida | FL | National HA base | HockeyPhoenician | high-adventure |
| OUT? | Sea Base California | CA | Long Beach (032) | HockeyPhoenician | aquatics HA; we have "Sea Base Aquatics" specialty |

## Leads / patterns
- **Michigan Crossroads Council (272) — 5 camps, NONE in dataset.** Statewide MI council; our Black Pug
  scrape returned nothing for it. Investigate: is 272 "managed" on the Global index? Do its camps register
  on a separate system/site? High-value gap (Hiawatha, Gerber, Cole Canoe, D-Bar-A, Teetonkah).
- **Goshen Scout Reservation (National Capital 082):** a reservation hosting ~6 camps; we captured only
  Olmsted + Ross. Others (Bowman, Marriott, PMI, Lenhok'sin/HA) to add — like the sub-camp collapse question.
- **AZ/CA/NM council camps missing** (Grand Canyon, Catalina, Conquistador, Western LA, San Diego) —
  these councils are Tentaroo/custom-CMS, exactly the pool the community can help fill.

## Meta-suggestions from the thread
- **errol_timo_malcom & UI feedback:** add labels/tags for **High Adventure, Cub, and special programs
  (NYLT)**. Schema already has `ProgramType` (scouts_bsa_resident, cub_resident, cub_day, high_adventure,
  webelos) + `high_adventure_option` feature. Logged as a feature in TODO.md.
- **Breitsol_Victor:** (a) follow up on *former* camps sold to orgs that still allow scout camping;
  (b) local/state/fed camping locations (Current River/Elephant Rocks MO, Wolf River WI). Both are
  **beyond v1 scope** (v1 = BSA council resident summer camps) — park as possible future scope.
- **Data sources mentioned:** Wikipedia "List of council camps" (stale, dead links — supplementary only);
  usscouts Online Camp Database (robots-blocked, assessed); scoutingevent.com/Global (integrated 0.15.0).
