# Black Pug Global index sync (scoutingevent.com/indexMap.php)

Reclassified **29** unknown/other councils -> `blackpug` (managed on Black Pug):

- council-003 Alabama-Florida Council
- council-006 Black Warrior Council
- council-010 Grand Canyon Council
- council-030 Southern Sierra Council
- council-032 Long Beach Area Council
- council-033 Greater Los Angeles Area Council
- council-061 Greater Colorado Council
- council-082 National Capital Area Council
- council-129 Northeast Illinois Council
- council-133 Illowa Council
- council-160 Crossroads of America Council
- council-216 Katahdin Area Council
- council-250 Northern Star Council
- council-299 Gamehaven Council
- council-304 Pine Burr Area Council
- council-306 Ozark Trails Council
- council-311 Pony Express Council
- council-315 Montana Council
- council-333 Northern New Jersey Council
- council-382 Allegheny Highlands Council
- council-386 Theodore Roosevelt Council
- council-397 Seneca Waterways Council
- council-560 Middle Tennessee Council
- council-564 Capitol Area Council
- council-571 Circle Ten Council
- council-576 Sam Houston Area Council
- council-661 Puerto Rico Council
- council-697 Pacific Crest Council
- council-713 Sequoyah Council

## Deferred: tentaroo councils that are managed on Black Pug

These register on Black Pug but already carry agent-extracted camps. Re-scrape via Black
Pug and let it supersede the `llm_extraction` camps once a precedence reconciliation exists.

- council-085 Gulf Stream Council
- council-092 Atlanta Area Council
- council-098 South Georgia Council
- council-106 Mountain West Council
- council-205 Lincoln Heritage Council
- council-211 Istrouma Area Council
- council-234 Western Massachusetts Council
- council-424 Tuscarora Council
- council-425 Cape Fear Council
- council-426 East Carolina Council
- council-460 Erie Shores Council

## Website discrepancies vs the index (49) - NOT auto-applied

The index URL is sometimes older than our curated seed (e.g. a pre-merger council name),
so these need per-case judgment. `ours` = current data, `index` = scoutingevent.com.

| Council | ours | index |
|---|---|---|
| council-004 Mobile Area Council | https://scoutingmac.org/ | https://www.bsamac.org |
| council-018 Natural State Council | https://www.naturalstatecouncil.org/ | https://www.quapawbsa.org/ |
| council-023 Golden Gate Area Council | https://ggacbsa.org/ | https://goldengatescouting.org |
| council-030 Southern Sierra Council | https://www.sscbsa.org/ | https://www.sscscouts.org |
| council-033 Greater Los Angeles Area Council | https://www.glaacbsa.org/ | https://greaterlascouting.org/ |
| council-039 Orange County Council | http://www.ocscoutingamerica.org/ | https://www.ocbsa.org/ |
| council-041 Redwood Empire Council | https://campingonthenoyo.com/ | https://www.redwoodbsa.org |
| council-042 Piedmont Council | https://piedmontscouting.org/ | https://www.piedmontbsa.org |
| council-045 California Inland Empire Council | https://iescouts.org/ | https://www.ciecbsa.org |
| council-047 Golden Empire Council | http://www.gec-bsa.org/ | https://gcc-scouting.org/ |
| council-049 San Diego-Imperial Council | https://www.sdicscouting.org/ | https://www.sdicbsa.org/ |
| council-058 Verdugo Hills Council | https://www.vhscouting.org/ | https://www.vhcbsa.org |
| council-070 Old North State Council | http://www.lodge70.org/ | https://www.bsaonsc.org/ |
| council-091 Chattahoochee Council | https://chattahoocheecouncilsa.org/ | https://www.91bsa.org |
| council-100 Northwest Georgia Council | https://www.nwgascouting.org/ | https://www.nwgabsa.org/ |
| council-145 Hoosier Trails Council | https://hoosiertrails.org/ | https://www.hoosiertrailsbsa.org/ |
| council-162 Sagamore Council | https://sagamorebsa.org/ | https://www.sagamoresignals.com/ |
| council-172 Hawkeye Area Council | https://hawkeyescouting.org/ | https://www.hawkeyebsa.org/ |
| council-204 Blue Grass Council | https://bgcscouting.org/ | https://www.bgbsa.org |
| council-205 Lincoln Heritage Council | http://www.lhcbsa.org/ | https://www.scoutinglhc.org/ |
| council-212 Evangeline Area Council | https://www.eacscouting.org/ | https://www.eacbsa.org/ |
| council-283 Twin Valley Council | https://www.scoutingtwinvalley.org/ | https://www.twinvalleybsa.org/ |
| council-296 Central Minnesota Council | https://www.scoutingcmc.org/ | https://www.bsacmc.org |
| council-299 Gamehaven Council | https://gamehaven.org/ | https://www.gamehavenbsa.org/ |
| council-328 Las Vegas Area Council | https://www.scoutinglvac.org/ | https://www.lvacbsa.org |
| council-333 Northern New Jersey Council | http://nobebosco.org/ | https://www.nnjbsa.org |
| council-347 Monmouth Council | https://www.monmouthcouncilscouting.org/ | https://www.monmouthbsa.org |
| council-358 Patriots' Path Council | http://www.ppcbsa.org/ | https://ppcscouting.org |
| council-386 Theodore Roosevelt Council | http://www.trcbsa.org/Schiff | https://ScoutingLI.org |
| council-388 Greater Hudson Valley Council | https://www.ghvscouting.org/ | https://www.ghvbsa.org/ |
| council-404 Suffolk County Council | https://www.suffolk.gov.uk/ | https://www.sccbsa.org/ |
| council-424 Tuscarora Council | https://www.tuscarorabsa.org/ | https://www.bsanc.org/ |
| council-425 Cape Fear Council | https://www.capefearscouting.org/ | https://www.capefearcouncilbsa.org |
| council-429 Northern Lights Council | https://scoutingnlc.org/ | https://www.nlcbsa.org/ |
| council-439 Tecumseh Council | https://tecumsehcouncil.org/ | https://www.tecumsehcouncilbsa.org/ |
| council-492 Cascade Pacific Council | https://cpcbsa.org/ | https://cpcscouting.org |
| council-501 Northeastern Pennsylvania Council | http://gpsr.nepabsa.org/ | https://www.nepabsa.org/ |
| council-528 Hawk Mountain Council | http://www.hmc-bsa.org/ | https://www.hmcscouting.org/ |
| council-533 Susquehanna Council | https://susquehannascouting.org/ | https://susquehannabsa.org/ |
| council-550 Coastal Carolina Council | http://www.coastalcarolinabsa.org/ | https://www.coastalcarolinacouncil.org |
| council-576 Sam Houston Area Council | https://samhoustonbsa.org/ | https://shacbsa.org/ |
| council-577 South Texas Council | https://www.southtexasscouting.org/ | https://southtexasbsa.org/ |
| council-578 Three Rivers Council | https://threerivers.gov.uk/ | https://www.3riversbsa.org/ |
| council-583 Alamo Area Council | https://www.alamoareascouting.org/ | https://www.alamoareabsa.org/ |
| council-584 Caddo Area Council | https://caddobsa.org/ | https://caddo.ihubapp.org/ |
| council-606 Mount Baker Council | https://www.mountbakerbsa.org/ | https://www.mountbakerscouting.org/ |
| council-640 Greater New York Councils | http://www.tenmileriver.org/ | https://nycscouting.org/ |
| council-697 Pacific Crest Council | https://www.otcbsa.org/ | https://pccscouting.org/ |
| council-777 Washington Crossing Council | http://www.wccscouting.org/ | https://www.washingtoncrossingbsa.org/ |
