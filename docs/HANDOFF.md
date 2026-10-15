# Handoff — first build session (7–8 Oct 2026)

Everything a new session needs to continue where we left off. Read with `CLAUDE.md` (rules) and `docs/original-brief.md` (Jacob's full brief).

## 1. Where we are right now (8 Oct 2026, ~1pm)

- **Core app is LIVE** at https://seb-jacob-epic-camper.netlify.app (passcode in tools/passcode.txt, not in git), verified working (all files 200, encrypted data decrypts, passcode screen shows).
- Jacob has NOT yet confirmed he's installed it on his iPhone (Safari → passcode → Share → Add to Home Screen, shows as "Epic Camper"). Ask him if it works on the phone, and whether GPS location works.
- **Spot list v2** (after big research round): 23 surf + 24 spear, 40 local rules. Review page artifact: https://claude.ai/artifact/76gz9T8aLVjS57zosyWnr3 (Jacob can mark spots OK/needs-fix and paste notes back — he has NOT sent any review notes yet).
- Last thing done: research round 2 deployed; then this handoff was written and the project moved out of the temporary session folder.

## 2. Timeline / brief recap
- Two of them in an Apollo Euro Deluxe campervan. Pick up Bankstown 9am 21 Oct, drop off Bankstown 2pm 31 Oct 2026. Coverage Merimbula → Coffs Harbour, **excluding Sydney metro** (Shellharbour/Bass Point and south counts; Central Coast/Newcastle and north counts). Likely a south leg and a north leg.
- Surf: early-intermediate→intermediate; boards 6'10 midlength + 6'2 groveller; ideal 2–4 ft clean, up to ~5 ft at forgiving breaks; avoid heavy reefs/slabs.
- Spear: shore entry / rock jump only, max 20 m, target kingfish, secondary reef fish. Generic shelter rule (biggest factor): the side of a headland facing away from BOTH swell and wind is clean; partial credit for one only; long-period swell wraps more; NE sea breeze in arvos; score each 3-hour window.
- Priority: CORE first (spot DB, weather+swell+hardcoded tides, scoring with reasons, Home/map/spot page, GPS+drive times, region outlook, hosted with passcode + offline). EXTRAS in order: 1 field reports, 2 full trip planner, 3 expand to ~30+30 spots, 4 MHL buoy cross-check, 5 scoring backtest, 6 Surfline cross-check.
- Core deadline 15 Oct (Seb arrives 16 Oct).

## 3. Jacob's preferences & feedback (chronological)
1. Data-source test + plan first → done.
2. Sent grey nurse KMZ → converted into zones.
3. **Angry about legal caution** ("if it's 80 m away I can spear it"): flag ONLY if pin is inside a banned zone; no proximity warnings ever. (Also saved as a rule in CLAUDE.md.)
4. Asked for an interactive **map tab** with day picker, spots coloured by score → built.
5. "Simplify info, too hectic" + **satellite map** (to see reef) → done: spot sheet = score, one-line reason, 5 time windows, quick facts, Directions; breakdown and spot info folded under "Why X?" / "Spot info".
6. Wind: show **offshore/onshore/cross-shore** relative to the spot; **tides as a graph** → done.
7. **Swell in feet**, not metres → done (internal scoring still metres).
8. App name: **"Seb & Jacob's Epic Camper Adventure"**; home-screen label "Epic Camper".
9. Switched hosting **Vercel → Netlify** (he made a Netlify account via GitHub). Asked "why can't you do it yourself" → installed Node + netlify-cli locally, he clicked Authorize; Claude deploys now. He switched off Netlify "Visitor access" himself.
10. Asked what else to add → he chose **all core items**, loved the **Home screen** idea.
11. Swell/wind charts: smaller, **wind direction under each arrow**, **detailed swell heights** (not a dotted line) → hourly bars with an at-spot/ocean feet table, direction+period row.
12. Asked to **scour Reddit, Deckee and similar sites in great detail** for real people's spot knowledge, add praised spots and drop weak ones → research round 2 (see §6).
13. Context filling → asked for a full handoff (this file).

## 4. Data sources (tested 7 Oct)
| Source | Status |
|---|---|
| Open-Meteo BOM ACCESS model | **Dead** (all nulls) → using **ECMWF IFS 0.25** (`models=ecmwf_ifs025`), 10 days, past_days=3 for rain |
| Open-Meteo Marine | Works; `cell_selection=sea`; grid is coarse — a pin in a "land" cell returns all-null swell (Pambula Beach did; fixed by moving the pin offshore). If a spot shows no data, nudge its pin seaward. |
| MHL buoys | Public API `https://api.manly.hydraulics.works/api.php?page=latest-readings&username=publicwww&sitecode=…` (CORS ok). Sites: EDENOW, BATBOW, PTKMOW, SYDDOW, CRHDOW, COFHOW (+BYRBOW). Times are AEST (UTC+10). Shown live on Home/map/spot sheet. |
| BOM station obs | Works server-side only (no CORS) — **not implemented** (would need a Netlify function). Optional. Station ids listed in spots.js. |
| OSRM drive times | Public server, table API, CORS ok, +15% campervan. |
| Photon geocoder | Works (CORS ok). |
| NSW marine park zones | Official ArcGIS `Fisheries_Portal/NSW_Marine_Protected_Areas/MapServer/0` → saved to `data/zones.geojson` (sanctuary + aquatic reserve sanctuary = "no"; other zone types "check" = no warning). |
| Grey nurse sites | From Jacob's KMZ. DPI rules: critical habitat does NOT ban spearing by itself; Fish Rock = pelagics only within 200 m (kingfish OK). |
| Surfline | 403 → **dropped** (was last extra anyway). |
| surf-forecast.com | robots.txt disallows AI on /breaks/* → not used. |
| Tides | Jacob's hardcoded tables (A–L) in `data/tides.js`, cosine interpolation, only 21–31 Oct. All spots use table A (open coast). |
| NSW spearfishing closures | Ocean beaches banned except 20 m each end; estuary closures listed on DPIRD page. Terrigal Haven closure (Aug 2026) bans wire traces only. |

## 5. App design (what's built)
- Tabs: **Home** (Right now / next session; Best in next 24 h; Buoys now), **Map** (satellite, day chips incl. trip days greyed until forecast reaches them, Both/Surf/Spear, time-window select, red no-take zones, gold buoy pins, blue "me" dot), **Outlook** (south vs north call for next 3 days and days 4–7, region×day grid of best surf/spear, tap → map), **List** (ranked).
- Location bar: From (GPS / search / Bankstown preset) + Within (any/1/2/3/4/6 h); filters Home & List, dims map pins.
- Spot sheet: score, one-line reason, 5 windows (Dawn 5–8, Morning 8–11, Midday 11–14, Arvo 14–17, Evening 17–20), quick facts (ocean swell ft, wind + offshore/onshore label, vis, water temp, light, drive, nearest buoy), swell chart, wind chart, tide graph, Directions, "Why X?" breakdown, Spot info (entry, depth, kingfish, species, hazards, local rules, intel+sources).
- Scoring (`src/score.js`): spear = shelter 4.5 + energy 2 + rain 1.5 + trend 1 + tide 0.5 + kingfish 0.5, then local rules, gust cap, automatic NO if swell at the spot > `unsafeAt`; vis band poor/OK/good with confidence. Surf = size 3.5 + period 2 + wind 3 + direction 1 + tide 0.5, short-period (<7 s) capped at 6, too big capped at 3. Refraction floor so sheltered sides never read ~0 ft. Confidence by lead day (high ≤2, med ≤5, low).
- Offline: service worker caches app + viewed map tiles; forecast cached in localStorage (refetched hourly, or when spots added/moved via a signature).

## 6. Research round 2 (8 Oct) — sources & findings
- **Could not access:** Reddit (site, browser pane, fetch tool and Pullpush archive all block agents — do NOT use mirrors), Deckee map/spot reviews (login), DeeperBlue spearfishing forum (guest page limit → register wall). Jacob can paste threads/screenshots to add.
- **Used:** Wannasurf (all 439 route breaks; parsed in `research/wannasurf_parsed.json`), Michael McFadyen's Scuba site (`research/mcfadyen/*.txt`), Dive Swansea local shore dives, Fish Rock/SWR dive centres, Dive Forster, USFA submission (`research/usfa_hawkesbury_recommendations.txt`), ultimatespearfishing Seal Rocks report, Deckee/Fishraider forum threads (Ulladulla land-based; Currarong/Jervis Bay rocks), Currarong Community Assoc, Fishing World, DPI Go Fishing guides, local fishing reports, Adreno.
- Key spear findings now in spots/rules: Gravel Loader totally protected from S (enter east side by old ramp); Skillion entry wrecked by any E/NE swell; Terrigal Haven best in southerlies; Norah Head protected from S swell, rough in N/NE; Merimbula Wharf bad in S, best in NE; Tathra Wharf superb; Kiama Blowhole→harbour shore dive; Penguin Head south side kings, protected from NE; Crampton Island east side kings (low-tide walk); Swansea Flagstaff protected by Moon Island except SE; Boat Harbour is Port Stephens' only decent open-coast shore dive; Ladies Reef & Trial Bay Gaol great in southerlies; North Coast shore reef drops to sand fast (penalised); Coffs shore spearing "cold, dirty, rough"; Seal Rocks Saw Tooth kings with strong N current.
- Key surf findings: Durras (intermediate peaks, N vs S ends by wind), Potato Point, McKenzies (mals), Pambula Beach (learn-friendly), Inyadda (NE-wind option), Werri ends by swell direction, The Farm soft, Soldiers spillers, Merewether easy/NE-protected, Crescent point etiquette, Lake Cathie, Diamond Head (mellow), Sandy Beach big-S-swell point. Dropped: Broulee, Short Point, Avoca, Flynns, Snapper Point (spear).
- Seal Rocks Sugarloaf pin sits inside "Sawtooth Rocks HPZ (restrictions apply)" — not a no-take zone, so no warning (per Jacob's rule).

## 7. To-do / next steps (suggested order)
1. Confirm the app works on Jacob's (and Seb's) iPhone; fix anything he reports.
2. Get Jacob's spot review notes (review artifact) and apply.
3. Before 15 Oct: polish/bug-fix core; optional BOM obs via Netlify function.
4. EXTRAS in his order: **field reports** (needs free Supabase project — walk him through; shared between both phones, adjust scores 24 h nearby, turn report into a local rule), **trip planner** (south-first vs north-first, days where, least driving, back at Bankstown 2pm 31 Oct, re-plan daily), expand spots to ~30+30, buoy cross-check vs forecast, backtest, (Surfline dropped).
5. Other ideas offered (not yet requested): BOM marine wind warnings, water-temperature/current map for kings, "tomorrow dawn patrol" button, catch log.

## 8. Gotchas
- Preview server gets killed when idle → re-run preview_start `coast-call`.
- Browser module caching: dev server sends no-store; if stale, fetch files with `{cache:'reload'}` once.
- Tide tables only cover 21–31 Oct; before that the tide box says so.
- Python's urllib has an SSL handshake problem with router.project-osrm.org on this Mac — use curl.
- Opening the DPI spearfishing PDF in the browser pane triggers a download dialog — avoid.
- Never type passwords/passcodes into live sites; never change account/security settings; ask Jacob.

## 9. Session 2 (8 Oct 2026, afternoon)
- Local preview: macOS blocks the preview runner from ~/Documents → run `python3 tools/devserver.py` via Bash, then preview_start `coast-call-attach` (see CLAUDE.md).
- Jacob installed **Claude in Chrome**. reddit.com is blocked by the extension itself ("safety restrictions"), but Google works: `site:reddit.com … &udm=18` (Forums tab) shows Reddit/Facebook-group snippets. Google AI Overview/AI Mode is mostly generic and sometimes invents details — use only as a lead. AI Mode also shows Jacob's own history, so avoid it. beginnerspearfishing.com.au guides read as AI-written — not used.
- **Research round 3** (notes in `research/google_reddit_round3.md`): +6 surf (Cuttagee, Seven Mile/Gerroa, Blacksmiths, Boomerang, Scotts Head, Arrawarra) and +3 spear (Maloneys Bay, Redhead Point, Hat Head) → **29 surf + 27 spear**; Reddit tips added to 12 existing spots. Deployed + verified; review artifact republished (v2 text).
- Skipped for thin evidence: Morna Point/One Mile rocks, Fingal Bay, Storm Bay (part of Kiama Blowhole exit), Gerroa Black Head (rock-fishing deaths, no spearo reports), Toowoon Bay (folded into Shelly intel), Zenith (shorebreak).

## 10. Session 2 — UI + accuracy build (8 Oct 2026)
- Spot sheet: Surfline-style 3-hourly table (rating bar in Jacob's 5-colour code, surf ft range, primary swell ft/s/arrow+degrees, wind arrow coloured offshore→onshore + mph). Wind graph, light, water temp and buoys removed from spot pages; light + water temp live on Home ("Today near you"). Wind shown in mph everywhere (scoring still kn).
- Score colours (app-wide): --s1 #e0566e, --s3 #ef9a33, --s5 #f2cc3d, --s7 #5fd27c, --s9 #3a9b7c (Surfline-like very poor → fair-to-good).
- **Forecast blend** (`src/data.js`): waves = median of MFWAM / ECMWF WAM / GFS-Wave (MFWAM swell trains rescaled; GFS period/dir averaged only when it matches — GFS gives zeros at some nearshore cells); wind/rain = weighted ECMWF, UKMO 10 km, ICON, GFS, GEM. Also currents, SST, model sea level (tide fallback outside Jacob's tables). Refresh every 2 h (Open-Meteo free limit ~10k/day per device), manual refresh throttled 10 min. Cache key `cc-forecast-v2` (~1.9 MB).
- **Live corrections** (`src/correct.js`): MHL buoy ratio (fades over 24 h), BOM station wind obs (fades over 6 h), BOM coastal waters forecast nudges daily max wind/swell half-way. Notes shown under the tide graph.
- **Netlify function** `/api/live` (`netlify/functions/live.mjs`): SharkSmart map feeds (map-v2.pivotanalytics.com.au/api/geojson/{VR4G2,SLSNSW2,DPINSW,SSPRO2,TRAUMA,EVENTS}?days=7 — the public feeds behind sharksmart.nsw.gov.au/shark-activity), BOM IDN11001 coastal waters forecast + warnings, BOM IDN60801 station obs. Deploy needs `--functions netlify/functions`. Local devserver proxies /api/* to the live site (LIVE_PROXY env to override).
- **Scoring**: tide weight 1.5 (spear best ±2 h of high; surf by spot tide pref), kingfish uses SST 19–23° + current, strong current (>3 km/h) caps spear at 4, shark within 5 km in previous 24 h = −1.5 spear / −1 surf, model disagreement lowers confidence. `bestTime()` gives best 2–3 h block (today: future hours only) shown on Home, List and spot sheet.
- Sharks: 🦈 on cards (within 5 km, 48 h), spot-sheet box (10 km, 72 h, grouped), map layer "Sharks (48 h)". BOM warnings banner on Home (route zones MW001–MW007).

## 11. Accuracy round 2 (8 Oct 2026)
- **Spot geometry check** (`tools/facingcheck.py` + Esri satellite review): fixed The Farm (faces S, not E — offshore N/NW/NE per Wannasurf; old "S wind lee of Bass Point" rule was backwards), Seven Mile/Gerroa (faces SSE), Durras S, Mollymook, Shelly, Soldiers, Merewether, Sawtell (25–35° off). Moved pins that sat on land into the water: Crescent Head (was in the town car park), Norah Head, Trial Bay Gaol, Bermagui. Pambula Beach and Scotts Head pins sit offshore on purpose (marine grid needs a sea cell).
- **BOM wind timing** (`src/bomwind.js`): the coastal-waters wind text is parsed into hourly speed/direction ("becoming NE 15–20 kn in the early afternoon") and the forecast wind is pulled 50% towards it (less near "now", where the live station obs wins). Replaces the daily-max nudge.
- **Model skill weights** (`src/data.js`): weather models scored by vector wind error vs the last 48 h of BOM station obs (`/api/live?only=obs` returns hourly history); wave models scored against buoys via a rolling 72 h log in localStorage (`cc-waveskill-v1`), switching from median to skill-weighted mean once ≥12 samples. Weights shown in `data.skill`.
- **Buoy period**: buoy Tp vs blended period at the buoy shifts swell period (±2 s, fades over 24 h).
- Tried and dropped: satellite water clarity (gap-free product is 9 km / 2-day lag; 2 km version ~12 days behind) and GloFAS river discharge (can't resolve small coastal rivers; its "median" is an ensemble median, not climatology).

## 12. Camps (8 Oct 2026)
- Jacob: camps should be within driving distance of several breaks; happy to sleep at rest areas, roadside (where legal) or National Parks — cheapest legal first.
- Apollo Euro Deluxe: ~7.55–7.9 m long, 3.35–3.6 m high (watch height barriers); 2WD = sealed roads only except a well-maintained access road <10 km to a recognised campground (Apollo FAQ). NSW rest areas: generally up to ~24 h unless signed; councils set street/car-park rules (some ban sleeping in vehicles).
- `data/camps.js` (plain, not encrypted): 425 places from OSM within 60 min of a spot — 251 caravan parks, 102 campgrounds, 62 rest areas, 10 NPWS/free — with OSRM drive minutes to each spot (+15%), facilities, nearest dump point, and a `dirt` flag (nearest road unsealed in OSM). 91 dump points. OSM is thin on free camps; WikiCamps/CamperMate have more if Jacob wants to add favourites.
- `src/camps.js`: `rankCamps(day)` scores camps by the best Dawn/Morning surf + spear scores within 35 min (−1 point per 30 min driving), +bonus for free/rest, −0.5 for dirt access, filtered by the drive limit from the user's location. Home shows "Camp tonight" (top 3 + best free option); spot sheets list cheap camps within 30 min + nearest caravan park; map layers "Free / cheap camps" (on, only shown at zoom ≥10), "Caravan parks", "Dump points".
- Next: full trip planner (south vs north first, day-by-day spots + camps, back at Bankstown 2pm 31 Oct).

## 13. Trip plan (8 Oct 2026)
- Plan tab (`src/plan.js`): leg 1 21–25 Oct Jacob+Seb (best surf+spear), 26 dawn session then Sydney pick-up of 2 mates (non-surfers who want to try), leg 2 26–30 all four (spots tagged `easy: "learn"`/`"snorkel"` in spots.js, comfier camps), 31 back to Bankstown by 2pm. North/south chosen from forecast once ≥2 leg-1 days are forecast (default south first, see DEFAULT_WHY); Auto/South first/North first toggle. Before the forecast reaches a day it follows ANCHORS route; rest areas never two nights running. Drive times are straight-line estimates (driveMin), not OSRM.
- Not yet confirmed with Jacob: where/when the mates join (assumed Sydney ~lunchtime 26 Oct).

## 14. Rain + tabs (9 Oct 2026)
- Jacob: rain makes a HUGE difference to diving. Spear rain weight 1.3 → 2.5 (of 10); weather fetch now has 7 days of history (`rainPre` = 96 h before the marine series); runoff = rain decayed by river size (half-life none 30 h / small 48 / med 72 / large 120 h) × river proximity; caps: runoff ≥10 mm → max 6, ≥20 → 4, ≥35 → 2 (`LIMITS.rainCaps`). Vis estimate now 60% rain. Cache signature bumped to v3.
- Outlook tab removed from the tab bar (code left in place, unreachable).

## 15. Visual refresh (9 Oct 2026)
- Jacob wanted it "less AI-ish", like an iOS weather widget: one dark look (ignores phone light/dark), deep ocean gradient background, frosted-glass cards (backdrop blur), Geist (text) + Geist Mono (numbers/labels), lime accent #d5f26b. Theme lives in the THEME block at the end of style.css (overrides earlier rules). Home "Today" = 3 widgets (first light / sunset / water). Spear one-liners shortened ("Sheltered, clean · 0.6 ft · vis good"). BOM warnings grouped per coast.

## 16. Location + map controls (9 Oct 2026)
- Location bar (From/Within, search, presets) removed. App watches GPS on open (`startGPS`, watchPosition); drive times redone after ~3 km moved. Home picks the best spots within 2 h of you (widens to 4 h, then anywhere, if <2 found). Camp tonight limited to 3 h. If location is denied, Home shows a "turn on location" card with the iPhone settings path. Map: blue dot + ◎ locate button; map opens zoomed (9) around you.
- Map/List controls are one row: day dropdown (trip days marked, no-forecast days disabled) · All/🏄/🐟 · time dropdown. Legend = score scale only. Type badges hidden when zoomed out.
- 9 Oct: tab bar moved to the TOP (under the header) — Jacob said the bottom tabs were covered on his phone ("powered by Netlify" bar). Spot sheet: Ocean swell / Wind / Drive boxes removed (only Vis remains for spear); shark activity is a collapsed one-liner (<details>).
- 9 Oct: spot sheet header trimmed — no reason line under the name (only the red "Unsafe" line when it applies), Best line shows just the time block, Vis box removed.
- 9 Oct: all Directions links use Apple Maps (`dirUrl` → maps.apple.com ?daddr=…&dirflg=d). Tide scrub label fixed for the dark theme (lime box, dark text) — it was white-on-white.

## 17. Hosting moved to Vercel (9 Oct 2026)
- Netlify blocked deploys (free credits used up). Jacob pushed the project to GitHub (public repo jacobhksullivan-droid/vibez) and connected Vercel → https://jacob-camping-trip.vercel.app. Built folder deploy/epic-camper is committed; vercel.json points Vercel at it; api/live.mjs serves /api/live. passcode.txt is git-ignored and was scrubbed from docs.

## 18. Session 3 (11 Oct 2026) — research round 4 + UI
- Plan tab now = one auto 5-day plan for Jacob + Seb (21–25 Oct, + dawn session 26th), DP over camps, surf and spear weighted equally (`src/plan.js`).
- UI: liquid-glass dark-ocean theme, floating bottom icon tab bar (Home/Map/Plan/List), system font; BOM warnings collapsed; header one line. Ask-Claude tab tried and removed.
- Scoring: `surf.bestSwell` (locals' best swell direction, full marks; rest of window 0.6), surf dir weight 1.3; rule conditions `sstMin` and `months`.
- Research round 4 (notes: `research/round4_notes.md`): +9 spear, +3 surf → 32 surf + 36 spear. Facebook groups readable via Jacob's Chrome (Spearfishing the Illawarra 351452488781913, Mid North Coast Diving Spearing & Fishing `midcoastdivenspear`, Nearshore conditions 656334855332716, Beginners Sydney Spearfishing).
- Camp `near` lists extended with OSRM for new spots (scratch script; same method as the original build).
- Surf retuned for Jacob + Seb (confident to ~6 ft): every break size [2,5] (2 ft scores as well as 5 ft), maxSize 7 (Wannasurf hold limits), `surf.quality` (+0.8 world class / +0.4 regional classic / −0.6 sloppy) added to the score. +11 quality breaks: Sandon Point, Minnamurra, North Bendalong, Merimbula Bar, Moruya rivermouth, North Avoca, Bar Beach, Tuncurry breakwall, North Haven, Horseshoe Bay SWR, Delicate Nobby → 43 surf + 36 spear.
- Forecast refresh now every 3 h (79 spots ≈ 450 Open-Meteo calls a fetch).
- Plan: whole trip 21–31 Oct, best surf + spearing for Jacob + Seb every day (mates just tag along from 26th, no pick-up constraint, no 'social' mode). Night 1 always a powered site. Stops of 1–2 nights anchored on the stop's first camp (camps within 5 km = same place; 3rd only if a 9+ forecast session), never back to an earlier stop, spots done at an earlier stop are excluded from later stops (tracked per route in the beam). Every day = one surf + one dive (pickDay picks the better morning/arvo order); camp value = average of its best surf and best dive. Both coasts (≥2 nights north of -33.6 and south of -34.0) unless one side's best session stays under 4/10 on every forecast day (needs 6+ trip days covered). Beam search (300 routes, 3 per camp). Forecast drives every day it reaches; beyond it, base quality (`usual`).
- Rain (12 Oct): smooth model, no thresholds (Jacob: don't turn examples into rules). Rain during a session doesn't count. wet = Σ hourly rain × (1 + r/6.7) (bursts count extra) × 0.5^(age/half-life: open coast 30 h, small creek 48, med 72, big river 120) × exposure (0.65 open coast → 1.0 big river close by). Dive: rain points × e^(−wet/10) and best-possible score 10 − 8(1 − e^(−wet/14)). Surf: up to −1.5 for short-term runoff (12 h half-life). The plan follows it automatically.
- Rain reports: Home "Rain by area (mm)" (per region: last 3 days / today / next 3 days, averaged over the region's spots) and a 7-day rain strip on every spot page (3 days either side of the chosen day). Data = Open-Meteo blend incl. rainPre history (`dailyRain()` in app.js).
- Swell fallback (12 Oct): MFWAM's last forecast day stops part-way (nulls), which showed as "0 s / 0°, 0–1 ft". `waveBlend` now falls back to GFS-Wave's swell when it's the main train (≥40 % of Hs), else the total sea (blend Hs, ECMWF/GFS mean period ×1.15 + direction). WAVE_VARS now includes wave_period/direction. Surf table shows "– no data" instead of zeros. Cache signature bumped to |v5.
- Plan: one sweep in a single direction (north or south) — after the first stop the route never moves back the other way (>~9 km of latitude); routes that can no longer reach the other coast are dropped. Spots within 3 km count as one place (e.g. Maloneys + Gravel Loader = Bass Point) so doing one uses up the other. Last night may be up to 5 h from Bankstown (dawn session, then drive; "Leave by …" shown).
- Surfline links (12 Oct): every spot has `surfline: { url, name }` = its nearest Surfline report (from Surfline's mapview spot list, fetched via Jacob's Chrome; a few overridden by name). Spot page shows "Directions | Surfline (name)" buttons. URL format https://www.surfline.com/surf-report/<slug>/<id>.
- Spot table (12 Oct): swell columns removed (Jacob uses the Surfline button for swell). Table = time + rating bar + wind (arrow coloured offshore→onshore, mph, direction). Swell still drives the scores.
- Spot page (12 Oct): "Spot info" is its own card right under the name (break/entry/depth/hazards; local rules + intel in a "Local knowledge" dropdown). Wind table simplified to one coloured word per 3 h (Glassy <5 kn / Offshore / Cross-off / Cross-shore / Cross-on / Onshore) + mph + direction (`windKind()` in charts.js). Surfline links carry `#sl_universal_link` (Surfline's apple-app-site-association covers /surf-report/*) so iPhone hands them to the Surfline app when installed.
- Spot page (12 Oct, later): tide chart removed (Jacob uses Surfline; tide still drives scores) and the wind table replaced by an Apple-Weather-style wind chart (`windGraph`/`bindWindScrub` in charts.js): speed area + gust line (mph), arrows every 2 h coloured offshore→onshore, past hours dashed, drag to read time · speed + direction · offshore/onshore · gusts. Opens on "now" (today) or the start of the best window.
- Spot info card sits right under the spot name, always open: key facts (surf: Break, Watch; spear: Entry, Depth, Kingfish, Fish, Watch — first sentence each) + up to 4 short local tips (rules first, then intel). No dropdown.
- Plan tab header = "North or south first?" — `explain()` in plan.js: where it starts (far south / south coast / Illawarra / Central Coast-Newcastle / mid north / far north, + nearest spot) and why, only stating what's true for the first forecast days: escaping rain (rain72), cleaner winds (% of top spots light/offshore/cross-off), higher ratings; else 'both coasts about the same'. Before the forecast reaches the trip: 'going on usual quality for now'.
- Plan cards: N / S tag (north of -33.6 / south of -34.0) on every spot and camp; each session shows the drive leg from the previous stop (camp/Bankstown → morning spot → arvo spot), camp row shows the drive from the arvo spot. Spot→spot legs use the rough `driveMin` estimate; camp↔spot legs use OSRM times.
- Plan weighting (12 Oct night): on forecast days a session's value = ½ rating + `conditions()` (wind: light/offshore +2, cross-off +1.2, cross/onshore up to −3.2 by strength; rain: decayed runoff ×river factor + last-24 h rain, full for dives, half for surf) + 2.5. Past the forecast, reputations are squashed (6.5 + 0.35×(usual−6.5)) and the last forecast day's runoff is carried forward, fading at each spot's half-life — so known rain still counts and reputations can't pick north vs south.

## 19. Plan tab rework (14 Oct 2026) — conditions first
- **Conditions gate** (`verdict()` in plan.js): every forecast session is pass / marginal / fail from the spot's aspect vs that window's swell + wind (+ vis for dives).
  - Spear pass = swell at the entry ≤ ½·unsafeAt, wind sheltered (windShelter ≥ 0.6) or < 8 kn, vis good.
  - Spear fail = unsafe, > 0.8·unsafeAt, exposed wind > 15 kn, or vis poor.
  - Surf pass = 2 ft–maxSize at the spot, swell inside swellDir, offshore / < 6 kn / sheltered cross < 15 kn.
  - Surf fail = < 1 ft, > maxSize+1, or onshore > 10 kn.
  - `conf.shelter: "low"` = "aspect needs check": capped at marginal.
  - Value = 6·tier + ½·score + wind/rain extra. Failing sessions are never picked; a day with no safe dive or surf says so. Tiers are internal only (no pass/marginal labels in the UI — Jacob, 14 Oct).
  - A surf only goes in the plan when it would pass AND rates SURF_MIN (6.5)+ — Jacob: no 5–6/10 surfs (Surfline yellow/red). No surf worth it → a dive day (two good dives if they fit), with a note naming the best surf and why it misses.
  - Surf only counts real swell (8 s+; pass needs the spot's periodMin, usually 8 s — 3–4 ft E at 8–9 s with light wind is a fun NSW surf). pickDay tries a day with no repeated spots first. Short-period NE wind chop is called out as "only wind chop" and never rates well. Surf is nudged to dawn/morning and dives to midday/arvo (WHEN = 1.5); dives never use the Dawn or Evening windows.
- **Routing:**
  - Knobs in `CFG` at the top of plan.js: firstMax 300, lastMax 180, maxMove 240, backtrackMax 45, dayDetour 30, driveCost 1.5, bothSides 4.
  - A leg = nights on one side of Sydney; at most 2. Each leg gets one free turnaround.
  - Any other reversal is a backtrack: only when nothing ahead passes that night, the target passes, and it's ≤ backtrackMax. It's listed in the explainer.
  - The search runs once heading south first and once north first; the better route wins. The explainer says if the other way was close.
  - No Sydney/26th constraint (Jacob: go purely on conditions; north is a soft bonus).
  - Within a day, morning + arvo spots can add at most dayDetour minutes over the camp→camp drive (no zigzags).
  - Repeating a spot costs REPEAT = 8.
- **Precision:** days the forecast covers get exact spots with raw inputs + verdict. Later days are provisional: region + the typical late-Oct pattern + 2–3 candidates facing different ways. They fill in as the forecast arrives.
- **Explainers:** trip card (which way first and why, each leg's furthest point and why it stops there, driving hours per leg, last-night drive, backtracks). Each day has a "Why this day" section: swell/wind, verdicts, 2 alternatives that lost and why, a dive fallback facing another way.
- **Map:**
  - "Map ›" on each day (and "Whole route") draws the plan: numbered night pins, day segments, backtracks dashed. "Trip plan route" overlay in the layers control.
  - No-take zones on the map are ocean/marine-bay only (`water: "estuary"` tagged in zones.geojson and hidden). Spot legal tags are unchanged (inside-only).
- **New spot `bushrangers-bay`** (snorkelOnly, inside Bushrangers Bay Aquatic Reserve): shown as 🤿 "snorkel only · no-take", never in spear rankings (home/outlook/camps). It's offered as a day-1 on-the-way stop (+0.5) unless the later Bass Point day is better; same place as Bass Point (3 km rule).
- The plan is computed once per forecast refresh (`getPlan()` cache in app.js, ~1–2.5 s), shared by Plan and Map.

## 20. Plan tab scrapped → Coast tab (15 Oct 2026)
- Jacob: "scrap the plan page, it's not working, replace it with conditions for each section of the coast". src/plan.js deleted (history in git, commits e75089f…).
- New tab "Coast" (`src/coast.js`, `renderCoastView` in app.js): day chips (forecast days from today; trip days outlined; defaults to the first trip day the forecast reaches), the day's best surf + best dive on the whole coast, then one card per region (north at the top):
  - swell at 7am for the spot nearest the middle of the region — the real swell (8 s+, ≥ ~1 ft) and the biggest wind chop, or "no real swell",
  - wind at 7am and 2pm (mph),
  - rain: the region's average over the 3 days before + on the day,
  - the region's best surf and best dive (score, best window, short reason) — tap to open the spot.
- Kept from the plan work: Bushrangers Bay snorkel spot, ocean-only zones on the map, surf chop cap (shortPeriod 8 s → max 5/10).
