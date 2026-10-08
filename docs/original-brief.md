Build a simple mobile-first web app that tells two of us where and when to SURF and SPEARFISH on the NSW coast between 21–31 October 2026. It must be hosted so we can both use it on our iPhones (installable to the home screen). The CORE (see Priority order) must be live on our phones by 15 October, before my mate arrives on the 16th. After that I'll have very little time to fix things.

## Priority order
Build and deploy the CORE first. Only start the extras once the core is live and working on my phone.
CORE:
- spot database (start with ~15 surf + ~15 spear spots spread along the route, add more later)
- weather + swell forecast + hardcoded tides
- surf and spear scoring with reasons
- Home screen ("Best right now", "Best next 24 hrs"), map, spot page
- GPS location + drive times
- REGION OUTLOOK: for the next 7 days, best surf and spear score per region (Far South Coast, South Coast, Shoalhaven/Illawarra, Central Coast/Newcastle, Port Stephens/Great Lakes, Mid North Coast, Coffs Coast), so we can decide south-first or north-first at a glance
- hosted on Vercel with passcode, works offline from the last fetch
EXTRAS (in this order):
1. field reports
2. full trip planner
3. expand the spot database to ~30 + ~30
4. MHL buoy cross-check
5. scoring backtest against past days
6. Surfline public cross-check

## Context
- Two of us in a campervan (Apollo Euro Deluxe). Pick up Bankstown 9am 21 Oct, drop off Bankstown 2pm 31 Oct.
- Coverage: Merimbula (south) to Coffs Harbour (north). EXCLUDE Sydney metro: this is a road trip, not local sessions. Shellharbour/Bass Point and further south counts; Central Coast/Newcastle and further north counts.
- We don't want to lose loads of time driving. Most likely we'll do a south leg and a north leg (either order) from Sydney, rather than zig-zagging.
- Surfing: both early-intermediate to intermediate. Boards: 6'10 midlength and 6'2 groveller. Ideal 2–4ft clean, up to ~5ft at forgiving breaks. Avoid heavy reefs and slabs.
- Spearfishing: SHORE ENTRY OR ROCK JUMP ONLY, never from a boat. Max depth 20m; we want spots with good water shallower than that. Main target: KINGFISH. Secondary: reef species.

## ZERO BUDGET
Everything must be free: Open-Meteo (no key), MHL buoys, BOM public observations, OSRM public server or OpenRouteService free key for drive times, Leaflet + OpenStreetMap for maps, Vercel and Supabase free tiers. If something needs payment, find a free alternative or drop it, and tell me what you dropped.

## Data sources (test each one first and report which work)
- Wind, rain, air temp: Open-Meteo forecast API (BOM ACCESS model where available), plus BOM observations from the nearest weather station.
- Swell (height, period, direction, separate swell partitions): Open-Meteo Marine API. Cross-check against live Manly Hydraulics Laboratory (MHL) NSW wave buoys (Eden, Batemans Bay, Port Kembla, Crowdy Head, Coffs Harbour, etc.).
- Rainfall over the past 72 hrs near each spot, and nearby river/lagoon mouths (runoff kills visibility).
- Sea surface temperature, plus warm-current/temperature-break info if freely available (relevant for kingfish).
- Surfline: do NOT use my login or scrape logged-in pages. Use public, unauthenticated spot forecast data only if it exists, as an optional cross-check, and fail gracefully.
- Tides: use the hardcoded tables in the TIDES section at the bottom. Do not fetch tides from anywhere.

## Spot database (the most important part)
Research and build a curated spot file for Merimbula → Coffs Harbour (start with ~15 surf + ~15 spear for the core, growing to ~30 + ~30). Spread spots along the coast so every region has options. Flag any spot where you're unsure of the coordinates, access or legality so I can check it. For each spot store:
- name, coordinates, car park/access point, campervan overnight options nearby
- which way it faces (compass degrees), break or terrain type, depth range (spear spots ≤20m)
- which swell AND wind directions it is sheltered from
- ideal swell direction, size and period for surf; offshore wind directions relative to its facing; tide preference
- rock-jump entry/exit description and the swell size at which it becomes unsafe
- kingfish suitability: headland/point with current, washes, bait, ledges or drop-offs into 10–20m
- hazards, typical visibility, typical species
- paraphrased local intel (dive club sites, spearfishing forums, spot guides, blogs, YouTube), with source links and a confidence rating per field
- tide table to use (one of the tables in the TIDES section)
- LOCAL RULES: specific conditions that make the spot fire, written as machine-readable rules that override the generic scoring. Hunt for rules like this for every spot from local intel, and let me add or edit them easily.

GENERIC SHELTER RULES (from my own diving in Sydney; I haven't dived anywhere on this route, so apply these to every similar spot):
- Example 1: a north-facing headland spot (east of a protected zone on the same headland) goes clean and calm with a SOUTH swell + SOUTH wind, because it's in the lee of both.
- Example 2: Freshwater headland and North Curl Curl are good on a NE swell, for the same reason in reverse: the south-facing side is in the lee of NE swell and NE wind.
- General rule: the side of a headland, point or bay facing AWAY from both the incoming swell direction and the wind direction gets clean, calm water. That should be the biggest positive factor in the spear score. The more completely a spot is sheltered from both, the higher it scores. Sheltered from swell but not wind (or the reverse) is only partial credit.
- Apply it both ways: S swell/wind → favour north-facing sides; NE swell/wind → favour south-facing sides; E swell → favour bays tucked behind north-south running headlands; and so on.
- Account for the daily wind cycle: on this coast in spring the afternoon NE sea breeze is common, so a spot that's clean in a calm morning may chop up after lunch. Score each 3-hour window separately.
- Account for swell wrapping: long-period swell (12s+) wraps into partly sheltered corners more than short-period wind swell, so reduce the shelter credit as the period goes up.
- For each spot, store which swell and wind directions it is sheltered from (compass ranges), so these rules can be computed automatically.
- Mark these as "generic rule" in the scoring reasons, and "local rule" where it's spot-specific intel, so I can tell which is which.

Legal layer:
- Use the OFFICIAL boundary polygons for NSW marine park sanctuary zones, aquatic reserves and grey nurse shark critical habitat (spearfishing banned or restricted).
- Only the exact protected area is excluded. Spots right next to them stay in, e.g. Bass Point next to Bushrangers Bay. Never write off a whole headland or area because of one small no-take zone.
- Show the boundary on the map and a clear "no spearing" warning only when a spot or pin falls inside it. Link the official maps.

Show me the spot list for review before building the scoring.

## Scoring
- For each spot, score 3-hour daylight windows for the next 5–7 days. Give separate SURF and SPEAR scores (0–10), each with a one-line plain-English reason, e.g. "S swell + S wind: fully sheltered north face, expect clean water. 0.4m in the bay, high tide 9:40am."
- Spear (weight heavily, in this order):
  1. shelter: is the spot in the lee of BOTH the current swell and the wind? This is the biggest factor.
  2. the spot's local rules
  3. swell energy actually reaching the spot
  4. 72-hr rainfall and nearby river/lagoon mouths
  5. trend over the last 2–3 days (visibility takes time to settle after swell or rain)
  6. tide (incoming/high usually cleaner)
  7. kingfish suitability
  Automatic NO if the rock-jump safety threshold is exceeded.
- Visibility can't be forecast directly. Output an estimated band (poor / OK / good) with a confidence label and the reason.
- Surf: swell actually reaching the spot (adjusted for facing and exposure), period, wind relative to its facing, tide preference, local rules.
- Show that forecast confidence drops the further out the day is.

## Trip planner (EXTRA — after core)
- Forecasts are only reasonably reliable ~7 days out, so show low confidence beyond that.
- Using the longest-range forecasts, suggest whether to go SOUTH first or NORTH first and roughly which days to be where. Aim for the best combined surf + spear days with the least total driving, finishing back at Bankstown by 2pm on 31 Oct.
- Re-run the plan daily as the forecast updates, and flag when it says we should change direction or move on.

## Location and driving
- Use the phone's GPS, with a manual "I'm at…" override and a search box for any town or spot.
- Drive times via OSRM public server or OpenRouteService free key, with ~15% added for a campervan.
- Rank spots by score against drive time, with a "within X hours" filter.
- Show first light, sunrise and sunset.

## Shared live features
- Host free on Vercel; shared database on Supabase free tier. One shared passcode, no individual accounts. Keep the app private (the tide data is BOM copyright).
- Hourly data refresh, manual refresh button and a "last updated" time.
- FIELD REPORTS: either of us can quickly log a report for a spot (visibility in metres, surf size and quality, fish seen, crowd, note). For 24 hrs, reports adjust scores for that spot and nearby spots. Option to turn a report into a new local rule.
- Offline mode: cache the last data fetch and all tide tables, since reception is patchy on parts of this coast.

## Screens
- Home: "Best right now" and "Best next 24 hrs", each for surf and spear, with drive times.
- Trip plan view.
- Map with spots coloured by score, plus no-take zone boundaries.
- Spot page: hourly wind, swell and tide chart; scoring reasons; local rules; hazards; legal notes; local intel; recent field reports.
- Fast and simple.
- A small permanent note: "Decision support only. Check conditions yourself. Always dive one-up-one-down."

## How to work
1. Start with a short plan and the data source test results.
2. Build the CORE in stages: data layer → spot database (I review it) → scoring → screens → deploy. Get a working version deployed to my phone as early as possible, even if rough, then improve it. Then add the EXTRAS in priority order.
3. I'm not a developer. Keep my steps simple, tell me exactly what to click or paste, and keep the codebase small and boring (no unnecessary frameworks).
4. Never use anything that costs money. I've already created GitHub, Vercel and Supabase accounts (Vercel and Supabase are signed in with GitHub). Walk me through connecting them step by step when we get to it.
5. For each spot's score, show me why it scored what it did so I can sanity-check it.
6. Write a README covering how to add spots and local rules, and how to adjust the scoring weights.

---

## TIDES (hardcoded, official BOM predictions)
Source: Transport for NSW "NSW Tides 2026–2027" booklet. Fort Denison predictions with each port's published time offset already applied. Times are AEDT (daylight saving is in effect for the whole trip). H = high, L = low, heights in metres.

Rules:
- Each spot uses the table for its nearest port. Open-coast spots (beaches, headlands, points) use TABLE A. Only use another table if the spot is inside that estuary, inlet, river mouth or harbour.
- Heights are Fort Denison heights; the booklet only gives time offsets, not height corrections. Use them for timing and relative state (rising/falling, spring/neap), not exact depth.
- Interpolate between turning points with a cosine curve to get height and rising/falling at any time.
- Full moon Mon 26 Oct: spring tides 26–30 Oct with big mid-morning highs (~1.8–1.9m). Note this in scoring reasons where relevant.
- Where the booklet gives a range (e.g. 0–15 min), the midpoint was used.

### TABLE A — Open coast / NIL offset (also within 15 min of: Forster, Swansea, Coffs Harbour)
Ports: Eden/Twofold Bay, Merimbula & Narooma & Bermagui open coast, Batemans Bay, Ulladulla, Jervis Bay, Kiama, Port Kembla, Wollongong, Newcastle, Broughton Island, Crowdy Head, Trial Bay/South West Rocks, N.W. Solitary Island, Iluka.
Wed 21 Oct: 0531 H 1.25 | 1106 L 0.72 | 1728 H 1.49
Thu 22 Oct: 0006 L 0.49 | 0615 H 1.35 | 1203 L 0.64 | 1815 H 1.53
Fri 23 Oct: 0043 L 0.43 | 0654 H 1.47 | 1252 L 0.55 | 1900 H 1.57
Sat 24 Oct: 0117 L 0.38 | 0731 H 1.59 | 1338 L 0.45 | 1943 H 1.59
Sun 25 Oct: 0151 L 0.35 | 0809 H 1.71 | 1425 L 0.36 | 2026 H 1.59
Mon 26 Oct: 0228 L 0.34 | 0848 H 1.82 | 1512 L 0.29 | 2113 H 1.55
Tue 27 Oct: 0306 L 0.36 | 0931 H 1.90 | 1600 L 0.25 | 2202 H 1.50
Wed 28 Oct: 0347 L 0.40 | 1016 H 1.94 | 1653 L 0.25 | 2255 H 1.43
Thu 29 Oct: 0433 L 0.46 | 1105 H 1.93 | 1749 L 0.28 | 2351 H 1.35
Fri 30 Oct: 0524 L 0.53 | 1158 H 1.89 | 1850 L 0.33
Sat 31 Oct: 0053 H 1.28 | 0622 L 0.60 | 1256 H 1.81 | 1957 L 0.38

### TABLE B — HW +15, LW +15: Clyde River (Batemans Bay bridge), Crookhaven River (jetty)
Wed 21 Oct: 0546 H 1.25 | 1121 L 0.72 | 1743 H 1.49
Thu 22 Oct: 0021 L 0.49 | 0630 H 1.35 | 1218 L 0.64 | 1830 H 1.53
Fri 23 Oct: 0058 L 0.43 | 0709 H 1.47 | 1307 L 0.55 | 1915 H 1.57
Sat 24 Oct: 0132 L 0.38 | 0746 H 1.59 | 1353 L 0.45 | 1958 H 1.59
Sun 25 Oct: 0206 L 0.35 | 0824 H 1.71 | 1440 L 0.36 | 2041 H 1.59
Mon 26 Oct: 0243 L 0.34 | 0903 H 1.82 | 1527 L 0.29 | 2128 H 1.55
Tue 27 Oct: 0321 L 0.36 | 0946 H 1.90 | 1615 L 0.25 | 2217 H 1.50
Wed 28 Oct: 0402 L 0.40 | 1031 H 1.94 | 1708 L 0.25 | 2310 H 1.43
Thu 29 Oct: 0448 L 0.46 | 1120 H 1.93 | 1804 L 0.28
Fri 30 Oct: 0006 H 1.35 | 0539 L 0.53 | 1213 H 1.89 | 1905 L 0.33
Sat 31 Oct: 0108 H 1.28 | 0637 L 0.60 | 1311 H 1.81 | 2012 L 0.38

### TABLE C — HW +45, LW +45: Bermagui River (bridge), Moruya River
Wed 21 Oct: 0008 L 0.56 | 0616 H 1.25 | 1151 L 0.72 | 1813 H 1.49
Thu 22 Oct: 0051 L 0.49 | 0700 H 1.35 | 1248 L 0.64 | 1900 H 1.53
Fri 23 Oct: 0128 L 0.43 | 0739 H 1.47 | 1337 L 0.55 | 1945 H 1.57
Sat 24 Oct: 0202 L 0.38 | 0816 H 1.59 | 1423 L 0.45 | 2028 H 1.59
Sun 25 Oct: 0236 L 0.35 | 0854 H 1.71 | 1510 L 0.36 | 2111 H 1.59
Mon 26 Oct: 0313 L 0.34 | 0933 H 1.82 | 1557 L 0.29 | 2158 H 1.55
Tue 27 Oct: 0351 L 0.36 | 1016 H 1.90 | 1645 L 0.25 | 2247 H 1.50
Wed 28 Oct: 0432 L 0.40 | 1101 H 1.94 | 1738 L 0.25 | 2340 H 1.43
Thu 29 Oct: 0518 L 0.46 | 1150 H 1.93 | 1834 L 0.28
Fri 30 Oct: 0036 H 1.35 | 0609 L 0.53 | 1243 H 1.89 | 1935 L 0.33
Sat 31 Oct: 0138 H 1.28 | 0707 L 0.60 | 1341 H 1.81 | 2042 L 0.38

### TABLE D — HW +45, LW +30: Narooma (Wagonga Inlet)
Wed 21 Oct: 0616 H 1.25 | 1136 L 0.72 | 1813 H 1.49
Thu 22 Oct: 0036 L 0.49 | 0700 H 1.35 | 1233 L 0.64 | 1900 H 1.53
Fri 23 Oct: 0113 L 0.43 | 0739 H 1.47 | 1322 L 0.55 | 1945 H 1.57
Sat 24 Oct: 0147 L 0.38 | 0816 H 1.59 | 1408 L 0.45 | 2028 H 1.59
Sun 25 Oct: 0221 L 0.35 | 0854 H 1.71 | 1455 L 0.36 | 2111 H 1.59
Mon 26 Oct: 0258 L 0.34 | 0933 H 1.82 | 1542 L 0.29 | 2158 H 1.55
Tue 27 Oct: 0336 L 0.36 | 1016 H 1.90 | 1630 L 0.25 | 2247 H 1.50
Wed 28 Oct: 0417 L 0.40 | 1101 H 1.94 | 1723 L 0.25 | 2340 H 1.43
Thu 29 Oct: 0503 L 0.46 | 1150 H 1.93 | 1819 L 0.28
Fri 30 Oct: 0036 H 1.35 | 0554 L 0.53 | 1243 H 1.89 | 1920 L 0.33
Sat 31 Oct: 0138 H 1.28 | 0652 L 0.60 | 1341 H 1.81 | 2027 L 0.38

### TABLE E — HW +90, LW +90: Merimbula Lake (bridge)
Wed 21 Oct: 0053 L 0.56 | 0701 H 1.25 | 1236 L 0.72 | 1858 H 1.49
Thu 22 Oct: 0136 L 0.49 | 0745 H 1.35 | 1333 L 0.64 | 1945 H 1.53
Fri 23 Oct: 0213 L 0.43 | 0824 H 1.47 | 1422 L 0.55 | 2030 H 1.57
Sat 24 Oct: 0247 L 0.38 | 0901 H 1.59 | 1508 L 0.45 | 2113 H 1.59
Sun 25 Oct: 0321 L 0.35 | 0939 H 1.71 | 1555 L 0.36 | 2156 H 1.59
Mon 26 Oct: 0358 L 0.34 | 1018 H 1.82 | 1642 L 0.29 | 2243 H 1.55
Tue 27 Oct: 0436 L 0.36 | 1101 H 1.90 | 1730 L 0.25 | 2332 H 1.50
Wed 28 Oct: 0517 L 0.40 | 1146 H 1.94 | 1823 L 0.25
Thu 29 Oct: 0025 H 1.43 | 0603 L 0.46 | 1235 H 1.93 | 1919 L 0.28
Fri 30 Oct: 0121 H 1.35 | 0654 L 0.53 | 1328 H 1.89 | 2020 L 0.33
Sat 31 Oct: 0223 H 1.28 | 0752 L 0.60 | 1426 H 1.81 | 2127 L 0.38

### TABLE F — HW +15, LW +105: Lake Illawarra (bridge)
Wed 21 Oct: 0108 L 0.56 | 0546 H 1.25 | 1251 L 0.72 | 1743 H 1.49
Thu 22 Oct: 0151 L 0.49 | 0630 H 1.35 | 1348 L 0.64 | 1830 H 1.53
Fri 23 Oct: 0228 L 0.43 | 0709 H 1.47 | 1437 L 0.55 | 1915 H 1.57
Sat 24 Oct: 0302 L 0.38 | 0746 H 1.59 | 1523 L 0.45 | 1958 H 1.59
Sun 25 Oct: 0336 L 0.35 | 0824 H 1.71 | 1610 L 0.36 | 2041 H 1.59
Mon 26 Oct: 0413 L 0.34 | 0903 H 1.82 | 1657 L 0.29 | 2128 H 1.55
Tue 27 Oct: 0451 L 0.36 | 0946 H 1.90 | 1745 L 0.25 | 2217 H 1.50
Wed 28 Oct: 0532 L 0.40 | 1031 H 1.94 | 1838 L 0.25 | 2310 H 1.43
Thu 29 Oct: 0618 L 0.46 | 1120 H 1.93 | 1934 L 0.28
Fri 30 Oct: 0006 H 1.35 | 0709 L 0.53 | 1213 H 1.89 | 2035 L 0.33
Sat 31 Oct: 0108 H 1.28 | 0807 L 0.60 | 1311 H 1.81 | 2142 L 0.38

### TABLE G — HW +30, LW +40: Ettalong (Brisbane Water)
Wed 21 Oct: 0003 L 0.56 | 0601 H 1.25 | 1146 L 0.72 | 1758 H 1.49
Thu 22 Oct: 0046 L 0.49 | 0645 H 1.35 | 1243 L 0.64 | 1845 H 1.53
Fri 23 Oct: 0123 L 0.43 | 0724 H 1.47 | 1332 L 0.55 | 1930 H 1.57
Sat 24 Oct: 0157 L 0.38 | 0801 H 1.59 | 1418 L 0.45 | 2013 H 1.59
Sun 25 Oct: 0231 L 0.35 | 0839 H 1.71 | 1505 L 0.36 | 2056 H 1.59
Mon 26 Oct: 0308 L 0.34 | 0918 H 1.82 | 1552 L 0.29 | 2143 H 1.55
Tue 27 Oct: 0346 L 0.36 | 1001 H 1.90 | 1640 L 0.25 | 2232 H 1.50
Wed 28 Oct: 0427 L 0.40 | 1046 H 1.94 | 1733 L 0.25 | 2325 H 1.43
Thu 29 Oct: 0513 L 0.46 | 1135 H 1.93 | 1829 L 0.28
Fri 30 Oct: 0021 H 1.35 | 0604 L 0.53 | 1228 H 1.89 | 1930 L 0.33
Sat 31 Oct: 0123 H 1.28 | 0702 L 0.60 | 1326 H 1.81 | 2037 L 0.38

### TABLE H — HW +30, LW +15: Nelson Bay (Port Stephens)
Wed 21 Oct: 0601 H 1.25 | 1121 L 0.72 | 1758 H 1.49
Thu 22 Oct: 0021 L 0.49 | 0645 H 1.35 | 1218 L 0.64 | 1845 H 1.53
Fri 23 Oct: 0058 L 0.43 | 0724 H 1.47 | 1307 L 0.55 | 1930 H 1.57
Sat 24 Oct: 0132 L 0.38 | 0801 H 1.59 | 1353 L 0.45 | 2013 H 1.59
Sun 25 Oct: 0206 L 0.35 | 0839 H 1.71 | 1440 L 0.36 | 2056 H 1.59
Mon 26 Oct: 0243 L 0.34 | 0918 H 1.82 | 1527 L 0.29 | 2143 H 1.55
Tue 27 Oct: 0321 L 0.36 | 1001 H 1.90 | 1615 L 0.25 | 2232 H 1.50
Wed 28 Oct: 0402 L 0.40 | 1046 H 1.94 | 1708 L 0.25 | 2325 H 1.43
Thu 29 Oct: 0448 L 0.46 | 1135 H 1.93 | 1804 L 0.28
Fri 30 Oct: 0021 H 1.35 | 0539 L 0.53 | 1228 H 1.89 | 1905 L 0.33
Sat 31 Oct: 0123 H 1.28 | 0637 L 0.60 | 1326 H 1.81 | 2012 L 0.38

### TABLE I — HW +0, LW +22: Harrington (Manning River bar)
Wed 21 Oct: 0531 H 1.25 | 1128 L 0.72 | 1728 H 1.49
Thu 22 Oct: 0028 L 0.49 | 0615 H 1.35 | 1225 L 0.64 | 1815 H 1.53
Fri 23 Oct: 0105 L 0.43 | 0654 H 1.47 | 1314 L 0.55 | 1900 H 1.57
Sat 24 Oct: 0139 L 0.38 | 0731 H 1.59 | 1400 L 0.45 | 1943 H 1.59
Sun 25 Oct: 0213 L 0.35 | 0809 H 1.71 | 1447 L 0.36 | 2026 H 1.59
Mon 26 Oct: 0250 L 0.34 | 0848 H 1.82 | 1534 L 0.29 | 2113 H 1.55
Tue 27 Oct: 0328 L 0.36 | 0931 H 1.90 | 1622 L 0.25 | 2202 H 1.50
Wed 28 Oct: 0409 L 0.40 | 1016 H 1.94 | 1715 L 0.25 | 2255 H 1.43
Thu 29 Oct: 0455 L 0.46 | 1105 H 1.93 | 1811 L 0.28 | 2351 H 1.35
Fri 30 Oct: 0546 L 0.53 | 1158 H 1.89 | 1912 L 0.33
Sat 31 Oct: 0053 H 1.28 | 0644 L 0.60 | 1256 H 1.81 | 2019 L 0.38

### TABLE J — HW +30, LW +60: Laurieton (Camden Haven), Mylestom (Bellinger River)
Wed 21 Oct: 0023 L 0.56 | 0601 H 1.25 | 1206 L 0.72 | 1758 H 1.49
Thu 22 Oct: 0106 L 0.49 | 0645 H 1.35 | 1303 L 0.64 | 1845 H 1.53
Fri 23 Oct: 0143 L 0.43 | 0724 H 1.47 | 1352 L 0.55 | 1930 H 1.57
Sat 24 Oct: 0217 L 0.38 | 0801 H 1.59 | 1438 L 0.45 | 2013 H 1.59
Sun 25 Oct: 0251 L 0.35 | 0839 H 1.71 | 1525 L 0.36 | 2056 H 1.59
Mon 26 Oct: 0328 L 0.34 | 0918 H 1.82 | 1612 L 0.29 | 2143 H 1.55
Tue 27 Oct: 0406 L 0.36 | 1001 H 1.90 | 1700 L 0.25 | 2232 H 1.50
Wed 28 Oct: 0447 L 0.40 | 1046 H 1.94 | 1753 L 0.25 | 2325 H 1.43
Thu 29 Oct: 0533 L 0.46 | 1135 H 1.93 | 1849 L 0.28
Fri 30 Oct: 0021 H 1.35 | 0624 L 0.53 | 1228 H 1.89 | 1950 L 0.33
Sat 31 Oct: 0123 H 1.28 | 0722 L 0.60 | 1326 H 1.81 | 2057 L 0.38

### TABLE K — HW +22, LW +22: Port Macquarie (wharf)
Wed 21 Oct: 0553 H 1.25 | 1128 L 0.72 | 1750 H 1.49
Thu 22 Oct: 0028 L 0.49 | 0637 H 1.35 | 1225 L 0.64 | 1837 H 1.53
Fri 23 Oct: 0105 L 0.43 | 0716 H 1.47 | 1314 L 0.55 | 1922 H 1.57
Sat 24 Oct: 0139 L 0.38 | 0753 H 1.59 | 1400 L 0.45 | 2005 H 1.59
Sun 25 Oct: 0213 L 0.35 | 0831 H 1.71 | 1447 L 0.36 | 2048 H 1.59
Mon 26 Oct: 0250 L 0.34 | 0910 H 1.82 | 1534 L 0.29 | 2135 H 1.55
Tue 27 Oct: 0328 L 0.36 | 0953 H 1.90 | 1622 L 0.25 | 2224 H 1.50
Wed 28 Oct: 0409 L 0.40 | 1038 H 1.94 | 1715 L 0.25 | 2317 H 1.43
Thu 29 Oct: 0455 L 0.46 | 1127 H 1.93 | 1811 L 0.28
Fri 30 Oct: 0013 H 1.35 | 0546 L 0.53 | 1220 H 1.89 | 1912 L 0.33
Sat 31 Oct: 0115 H 1.28 | 0644 L 0.60 | 1318 H 1.81 | 2019 L 0.38

### TABLE L — HW +80, LW +100: Urunga (Kalang River bridge)
Wed 21 Oct: 0103 L 0.56 | 0651 H 1.25 | 1246 L 0.72 | 1848 H 1.49
Thu 22 Oct: 0146 L 0.49 | 0735 H 1.35 | 1343 L 0.64 | 1935 H 1.53
Fri 23 Oct: 0223 L 0.43 | 0814 H 1.47 | 1432 L 0.55 | 2020 H 1.57
Sat 24 Oct: 0257 L 0.38 | 0851 H 1.59 | 1518 L 0.45 | 2103 H 1.59
Sun 25 Oct: 0331 L 0.35 | 0929 H 1.71 | 1605 L 0.36 | 2146 H 1.59
Mon 26 Oct: 0408 L 0.34 | 1008 H 1.82 | 1652 L 0.29 | 2233 H 1.55
Tue 27 Oct: 0446 L 0.36 | 1051 H 1.90 | 1740 L 0.25 | 2322 H 1.50
Wed 28 Oct: 0527 L 0.40 | 1136 H 1.94 | 1833 L 0.25
Thu 29 Oct: 0015 H 1.43 | 0613 L 0.46 | 1225 H 1.93 | 1929 L 0.28
Fri 30 Oct: 0111 H 1.35 | 0704 L 0.53 | 1318 H 1.89 | 2030 L 0.33
Sat 31 Oct: 0213 H 1.28 | 0802 L 0.60 | 1416 H 1.81 | 2137 L 0.38
