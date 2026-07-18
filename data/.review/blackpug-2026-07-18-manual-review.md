# Black Pug scrape — manual review queue (2026-07-18)

Camps EXCLUDED from the 0.11.0 merge as out-of-scope (not Scouts BSA resident summer camps).
Research later; if any is a real resident camp, add it (or tighten the scraper filter).

| Council | State | Excluded event | Sessions | Reason | Source |
|---|---|---|---|---|---|
| council-023 Golden Gate Area Council | CA | Royaneh - Family Vacation Camp | 1 | Family vacation camp, not a Scouts BSA resident camp session | https://scoutingevent.com/023-crfamilycamp2026 |
| council-039 Orange County Council | CA | Big Boat Sailing: Level 1 -Beginner (Ages 11-17) [M-Fri Summer Camp] | 1 | Day/specialty summer programs (M-Fri day camp: sailing, maker labs), not a Scouts BSA resident camp | https://scoutingevent.com/039-111776 |
| council-039 Orange County Council | CA | Upcycle Creation Lab (Ages 8-12) [M-Fri Summer Camp] | 1 | Day/specialty summer programs (M-Fri day camp: sailing, maker labs), not a Scouts BSA resident camp | https://scoutingevent.com/039-111762 |
| council-039 Orange County Council | CA | Big Boat Sailing: Level 2 - Intermediate/Advanced (Ages 11-17) [M-Fri Summer Camp] | 1 | Day/specialty summer programs (M-Fri day camp: sailing, maker labs), not a Scouts BSA resident camp | https://scoutingevent.com/039-111777 |
| council-039 Orange County Council | CA | Maker's Workshop (Ages 8-12) [M-Fri Summer Camp] | 2 | Day/specialty summer programs (M-Fri day camp: sailing, maker labs), not a Scouts BSA resident camp | https://scoutingevent.com/039-111754 |
| council-178 Northeast Iowa Council | IA | Camp C.S. Klaus Merit Badge Sign-up | 2 | Merit-badge sign-up event, not a resident camp session | https://scoutingevent.com/178-mbsignup |
| council-220 Baltimore Area Council | MD | Summer Camp Care Package | 3 | Care-package merchandise product, not a camp | https://scoutingevent.com/220-26sccarepack |
| council-283 Twin Valley Council | MN | Arrow of Light Camp | 7 | Cub Scout (Arrow of Light) program, out of Scouts BSA scope | https://scoutingevent.com/283-AOLCamp |
| council-440 Lake Erie Council | OH | STEM Summer | 2 | STEM/NOVA day program, not a resident camp | https://scoutingevent.com/440-STEMNovaCamp |
| council-553 Indian Waters Council | SC | Muscogee Lodge - 2026 Summer SUPER Fellowship | 1 | Order of the Arrow (Muscogee Lodge) fellowship event, not a resident camp | https://scoutingevent.com/553-2026summersuperfellowship |
| council-585 East Texas Area Council | TX | INVEST in G.W. Pirtle Scout Camp | 2 | Capital campaign / donation page (year-long 'sessions', no fees); real camp is G.W. Pirtle but this scoutingevent page is not a camp registration | https://scoutingevent.com/585-investinGWPirtle |
| council-637 Chippewa Valley Council | WI | Camp Phillips Day of Service | 2 | Volunteer service day, not a camp session | https://scoutingevent.com/637-DOS25 |
| council-763 Virginia Headwaters Council | VA | Camper Development League - Camp Shenandoah Minor League | 3 | Camper-development 'minor league' program, not a resident summer camp | https://scoutingevent.com/763-minorleague |

## Councils left with NO camp after exclusion (research their real resident camp):

- council-039 Orange County Council (CA) — http://www.ocscoutingamerica.org/
- council-178 Northeast Iowa Council (IA) — https://scoutsiowa.org/
- council-553 Indian Waters Council (SC) — https://indianwaters.org/
- council-585 East Texas Area Council (TX) — https://etacbsa.org/

## Name fixes applied during merge (verify accuracy):

- `ny-rsr` -> **Rotary Scout Reservation**
- `il-rsr` -> **Rainbow Scout Reservation**
- `sc-coi` -> **Camp Old Indian**
- `oh-scouts` -> **Beaumont Scout Reservation**

## Deferred cleanup:

- council-539 Camp Horseshoe: existing camp id `md-camp-horseshoe-long-term-camp` keeps the
  "Long-term Camp" suffix; rename in-place later (changing it here would duplicate).

