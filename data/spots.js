// COAST CALL — spot database
// ------------------------------------------------------------------
// How to edit (see README for more):
//  * Directions are compass degrees: 0 = N, 90 = E, 180 = S, 270 = W.
//  * Swell and wind directions are where they come FROM (like every forecast).
//  * `facing` = the direction the water in front of you looks toward.
//  * Ranges go clockwise: [150, 230] means S-SE round to SW.
//  * shelterSwell / shelterWind: extra shelter on top of what `facing` already gives,
//    as [from, to, amount] where amount 1 = fully blocked, 0.5 = half.
//  * Headlands have `sides`. Each side is scored separately and the best side wins,
//    so the app picks the lee side for you.
//  * conf = confidence per field: "high" | "med" | "low". Anything "low" is flagged
//    in the review page for you to check.
//  * easy: "learn" = good for first-timers (gentle beach/point waves); "snorkel" = calm, easy-entry snorkelling.
//    Used by the trip planner for the social leg with mates who don't surf/spear yet.
//  * rules = LOCAL RULES. They override/adjust the generic scoring. Format:
//      { when: { swellDir:[a,b], windDir:[a,b], swellMin, swellMax, periodMin,
//                periodMax, windMax, tide:"rising"|"falling"|"high"|"low"|"mid",
//                hours:[startHour,endHour] },
//        then: { spear:+2, surf:-1, spearCap:3, surfCap:3 },
//        why: "plain-English reason shown in the app", src: "link or note" }
//    swellMin/Max are offshore significant wave height in metres.
// ------------------------------------------------------------------

export const REGIONS = [
  "Far South Coast",
  "South Coast",
  "Shoalhaven/Illawarra",
  "Central Coast/Newcastle",
  "Port Stephens/Great Lakes",
  "Mid North Coast",
  "Coffs Coast",
];

export const SPOTS = [
  // =================================================================
  // SURF
  // Research round 2 (8 Oct 2026): every Wannasurf break on the route (surfer-written guides),
  // filtered to "all surfers"/beginner-friendly sand-bottom waves that suit a 6'10 mid and a 6'2 groveller.
  // =================================================================

  // ---------------- FAR SOUTH / SOUTH COAST ----------------
  {
    id: "pambula-beach", type: "surf", name: "Pambula Beach", easy: "learn",
    region: "Far South Coast", lat: -36.9360, lon: 149.9200, tide: "A",
    access: { lat: -36.9391, lon: 149.9085, note: "Pambula Beach SLSC car park (past the Big4 holiday park)." },
    overnight: "Pambula Beach / Merimbula holiday parks.",
    facing: 80, terrain: "Sand beach break between Merimbula and the Pambula River mouth.",
    shelterSwell: [], shelterWind: [],
    surf: { swellDir: [45, 160], size: [2, 4], maxSize: 5, periodMin: 8, offshore: [220, 290], tide: ["mid"] },
    hazards: "Rips. Pambula rivermouth (south end) is a heavy, hollow wave — not for us.",
    intel: [
      { text: "Very consistent, fun beach break — \"a great place to learn to surf and on the right day\" good waves. Best on SE–NE swell with W/SW wind, mid tide.", src: "Wannasurf — Pambula beach", url: "https://www.wannasurf.com/spot/Australia_Pacific/Australia/NSW/Far_South/pambula_beach/index.html" },
    ],
    conf: { coords: "med", access: "high", shelter: "med", intel: "med" },
    rules: [],
  },
  {
    id: "camel-rock", type: "surf", name: "Camel Rock (Bermagui)",
    region: "Far South Coast", lat: -36.3760, lon: 150.0830, tide: "A",
    access: { lat: -36.3786, lon: 150.0790, note: "Camel Rock top car park off Wallaga Lake Rd (drive past the first car park)." },
    overnight: "Caravan parks at Bermagui and Wallaga Lake.",
    facing: 80, terrain: "Sand bars with rock beside Camel Rock; fun lefts.",
    shelterSwell: [[200, 230, 0.3]], shelterWind: [[180, 220, 0.3]],
    surf: { swellDir: [80, 200], size: [2, 4], maxSize: 5, periodMin: 8, offshore: [220, 290], tide: ["low", "mid", "high"] },
    hazards: "Rips and rocks. Crowded on weekends.",
    intel: [
      { text: "Regional classic sand-bar, fast and fun, for all surfers; S–SE–E swell with W/SW wind, works at all tides. Doesn't always work properly.", src: "Wannasurf — Camel rock", url: "https://www.wannasurf.com/spot/Australia_Pacific/Australia/NSW/Far_South/camel_rock/index.html" },
    ],
    conf: { coords: "med", access: "high", shelter: "med", intel: "high" },
    rules: [],
  },
  {
    id: "potato-point", type: "surf", name: "Potato Point (north side)",
    region: "South Coast", lat: -36.0925, lon: 150.1385, tide: "A",
    access: { lat: -36.0935, lon: 150.1340, note: "Potato Point village, walk to the headland." },
    overnight: "Potato Point / Tuross Head holiday parks; Eurobodalla NP campgrounds.",
    facing: 45, terrain: "Headland with a longish right-hand point/beach break on the north side (left on the south side). Blackfellows Point (long fun right) two headlands north.",
    shelterSwell: [[160, 220, 0.5]], shelterWind: [[160, 240, 0.6]],
    surf: { swellDir: [10, 130], size: [2, 4], maxSize: 6, periodMin: 8, offshore: [180, 260], tide: ["low", "mid", "high"] },
    hazards: "Rips; isolated.",
    intel: [
      { text: "Very consistent semi-secret spot: headland with waves 2–7 ft either side — the better longish right on the north side, a left on the south side, long workable walls; rips can make the paddle out easy. N–E–NE swell, SW/S wind.", src: "Wannasurf — Potato Point", url: "https://www.wannasurf.com/spot/Australia_Pacific/Australia/NSW/Far_South/Potatoe_Point/index.html" },
      { text: "Blackfellows Point nearby: sandy point break, fun right for all surfers, works S to NE swell at all tides.", src: "Wannasurf — Blackfellows Point", url: "https://www.wannasurf.com/spot/Australia_Pacific/Australia/NSW/Far_South/Blackfellows_Point/index.html" },
    ],
    conf: { coords: "med", access: "med", shelter: "med", intel: "high" },
    rules: [
      { when: { swellDir: [20, 110], windDir: [180, 250] }, then: { surf: +1 }, why: "Local rule: N–E swell with S–SW wind lights up the north-side right.", src: "https://www.wannasurf.com/spot/Australia_Pacific/Australia/NSW/Far_South/Potatoe_Point/index.html" },
    ],
  },
  {
    id: "mckenzies", type: "surf", name: "McKenzies Beach (Malua Bay)", easy: "learn",
    region: "South Coast", lat: -35.8044, lon: 150.2295, tide: "A",
    access: { lat: -35.8040, lon: 150.2270, note: "George Bass Drive just past Malua Bay — very little parking in summer." },
    overnight: "Batemans Bay holiday parks; Murramarang NP campgrounds north.",
    facing: 115, terrain: "Beach break with a bit of reef on the left side.",
    shelterSwell: [], shelterWind: [],
    surf: { swellDir: [90, 200], size: [2, 4], maxSize: 5, periodMin: 8, offshore: [225, 360], tide: ["low", "mid"] },
    hazards: "Rips. Localism mentioned — be polite.",
    intel: [
      { text: "Regional-classic beach break, fun, \"best suited to stand ups / mal riders\"; S–SE–E swell with N/NW/W/SW wind, low–mid tide.", src: "Wannasurf — Mckenzies", url: "https://www.wannasurf.com/spot/Australia_Pacific/Australia/NSW/Far_South/mckenzies/index.html" },
    ],
    conf: { coords: "med", access: "med", shelter: "med", intel: "high" },
    rules: [],
  },
  {
    id: "durras-south", type: "surf", name: "South Durras", easy: "learn",
    region: "South Coast", lat: -35.6495, lon: 150.3005, tide: "A",
    access: { lat: -35.6520, lon: 150.2960, note: "South Durras village beach access." },
    overnight: "Durras holiday parks; Murramarang NP (Depot Beach, Pebbly Beach).",
    facing: 105, terrain: "Long sandy beach with many intermediate beach-break peaks; south end tucked from S wind.",
    shelterSwell: [[160, 220, 0.4]], shelterWind: [[150, 230, 0.6]],
    surf: { swellDir: [30, 150], size: [2, 4], maxSize: 5, periodMin: 8, offshore: [200, 300], tide: ["low", "mid", "high"] },
    hazards: "Rips.",
    intel: [
      { text: "Durras picks up swell from all directions: South Durras for NE/E/SE swell on W/SW and S winds; lots of intermediate beach breaks, consistent, good longboarding options, rarely crowded.", src: "Wannasurf — Durras Beach", url: "https://www.wannasurf.com/spot/Australia_Pacific/Australia/NSW/Far_South/Durras_Beach/index.html" },
    ],
    conf: { coords: "med", access: "med", shelter: "med", intel: "high" },
    rules: [
      { when: { swellDir: [30, 150], windDir: [180, 280] }, then: { surf: +1 }, why: "Local rule: South Durras for NE–SE swell on W/SW/S winds.", src: "https://www.wannasurf.com/spot/Australia_Pacific/Australia/NSW/Far_South/Durras_Beach/index.html" },
    ],
  },
  {
    id: "durras-north", type: "surf", name: "North Durras",
    region: "South Coast", lat: -35.6364, lon: 150.3125, tide: "A",
    access: { lat: -35.6266, lon: 150.3116, note: "North Durras — park on the cliff or at the caravan park." },
    overnight: "North Durras caravan park; Murramarang NP campgrounds.",
    facing: 120, terrain: "North end of Durras beach, tucked from N–NE wind.",
    shelterSwell: [[0, 60, 0.4]], shelterWind: [[0, 70, 0.6]],
    surf: { swellDir: [90, 200], size: [2, 4], maxSize: 5, periodMin: 8, offshore: [270, 60], tide: ["low", "mid", "high"] },
    hazards: "Rips. North Durras reef (helmet territory) is not for us.",
    intel: [
      { text: "North Durras for S/SE/E swell on NE/NW and W winds — intermediate beach breaks, friendly locals.", src: "Wannasurf — Durras Beach", url: "https://www.wannasurf.com/spot/Australia_Pacific/Australia/NSW/Far_South/Durras_Beach/index.html" },
    ],
    conf: { coords: "med", access: "med", shelter: "med", intel: "high" },
    rules: [
      { when: { swellDir: [100, 200], windDir: [270, 70] }, then: { surf: +1 }, why: "Local rule: North Durras for S–E swell on N/NE/NW/W winds.", src: "https://www.wannasurf.com/spot/Australia_Pacific/Australia/NSW/Far_South/Durras_Beach/index.html" },
    ],
  },
  {
    id: "mollymook", type: "surf", name: "Mollymook (north end, Bannisters)", easy: "learn",
    region: "South Coast", lat: -35.3300, lon: 150.4800, tide: "A",
    access: { lat: -35.3280, lon: 150.4770, note: "North Mollymook car park and stairs; or Beach Rd roadside." },
    overnight: "Ulladulla Headland Holiday Park; Murramarang NP campgrounds to the south.",
    facing: 105, terrain: "Sand bars at the north end by Bannisters Point; lefts off the point.",
    shelterSwell: [[0, 30, 0.3]], shelterWind: [[0, 40, 0.4]],
    surf: { swellDir: [60, 170], size: [2, 4], maxSize: 5, periodMin: 8, offshore: [230, 320], tide: ["low", "mid", "high"] },
    hazards: "Rocks about 50 m down from the point at low tide. Mollymook point (south end) is reef for experienced surfers.",
    intel: [
      { text: "Very consistent: on a good swell it peels beautiful lefts, good for shortboards and mini mals; almost no-one there outside school holidays. Watch rocks at low tide ~50 m from the point.", src: "Wannasurf — Bannisters point", url: "https://www.wannasurf.com/spot/Australia_Pacific/Australia/NSW/South_Coast/Bannisters_point/index.html" },
    ],
    conf: { coords: "med", access: "high", shelter: "med", intel: "high" },
    rules: [],
  },
  {
    id: "inyadda", type: "surf", name: "Inyadda (Manyana)",
    region: "South Coast", lat: -35.2563, lon: 150.5290, tide: "A",
    access: { lat: -35.2550, lon: 150.5262, note: "Inyadda Beach car park, Manyana." },
    overnight: "Bendalong / Manyana holiday parks.",
    facing: 125, terrain: "Sheltered beach break just south of Bendalong; smaller than Bendalong when it's big.",
    shelterSwell: [[20, 80, 0.5]], shelterWind: [[20, 80, 0.6]],
    surf: { swellDir: [100, 200], size: [2, 4], maxSize: 5, periodMin: 8, offshore: [270, 60], tide: ["low", "mid"] },
    hazards: "Rips. Don't drop in on locals.",
    intel: [
      { text: "Consistent and uncrowded; doesn't get as much swell as Bendalong, so it's the smaller option when Bendalong is too big. Best low–mid tide; offshore-ish in summer north-easters.", src: "Wannasurf — Inyadda", url: "https://www.wannasurf.com/spot/Australia_Pacific/Australia/NSW/South_Coast/Inyadda/index.html" },
      { text: "North Bendalong next door is a swell magnet for any S–E swell — punchier.", src: "Wannasurf — North bendalong", url: "https://www.wannasurf.com/spot/Australia_Pacific/Australia/NSW/South_Coast/north_bendalong/index.html" },
    ],
    conf: { coords: "med", access: "high", shelter: "med", intel: "high" },
    rules: [
      { when: { windDir: [20, 80] }, then: { surf: +1 }, why: "Local rule: Inyadda is offshore-ish in north-easters.", src: "https://www.wannasurf.com/spot/Australia_Pacific/Australia/NSW/South_Coast/Inyadda/index.html" },
    ],
  },

  // ---------------- SHOALHAVEN / ILLAWARRA ----------------
  {
    id: "culburra", type: "surf", name: "Culburra Beach", easy: "learn",
    region: "Shoalhaven/Illawarra", lat: -34.9255, lon: 150.7700, tide: "A",
    access: { lat: -34.9300, lon: 150.7790, note: "Culburra Beach SLSC car park." },
    overnight: "Holiday parks at Culburra Beach and Currarong.",
    facing: 55, terrain: "NE-facing beach break running from Penguin Head (south) up to Crookhaven Heads.",
    shelterSwell: [[150, 210, 0.5]], shelterWind: [[150, 220, 0.6]],
    surf: { swellDir: [30, 160], size: [2, 4], maxSize: 5, periodMin: 8, offshore: [200, 270], tide: ["low", "mid"] },
    hazards: "Crookhaven River mouth at the north end — strong currents.",
    intel: [
      { text: "Very consistent beach break for all surfers; best low–mid tide.", src: "Wannasurf — Culburra beach", url: "https://www.wannasurf.com/spot/Australia_Pacific/Australia/NSW/South_Coast/culburra_beach/index.html" },
    ],
    conf: { coords: "med", access: "high", shelter: "med", intel: "med" },
    rules: [],
  },
  {
    id: "werri", type: "surf", name: "Werri Beach (Gerringong)",
    region: "Shoalhaven/Illawarra", lat: -34.7316, lon: 150.8379, tide: "A",
    access: { lat: -34.7330, lon: 150.8310, note: "Pacific Ave car park near SLSC." },
    overnight: "Werri Beach Holiday Park; Killalea campground (Shell Cove).",
    facing: 100, terrain: "Beach break between two headlands; Werri Point at the south end.",
    shelterSwell: [[175, 210, 0.3]], shelterWind: [[170, 220, 0.4]],
    surf: { swellDir: [45, 170], size: [2, 4], maxSize: 5, periodMin: 8, offshore: [220, 300], tide: ["low", "mid", "high"] },
    hazards: "Rips along the rocks; can be punchy and ledgey.",
    intel: [
      { text: "On a SE swell go to the northern headland; on NE go to Werri Point at the southern headland; on E anywhere on the beach. The point can close out on a strong NE swell.", src: "Wannasurf — Werri beach", url: "https://www.wannasurf.com/spot/Australia_Pacific/Australia/NSW/South_Coast/werri_beach/index.html" },
    ],
    conf: { coords: "med", access: "high", shelter: "med", intel: "high" },
    rules: [],
  },
  {
    id: "killalea-farm", type: "surf", name: "The Farm (Killalea)", easy: "learn",
    region: "Shoalhaven/Illawarra", lat: -34.6045, lon: 150.8690, tide: "A",
    access: { lat: -34.6060, lon: 150.8620, note: "Killalea Reserve, The Farm car park (gate hours apply)." },
    overnight: "Killalea campground (paid, on site).",
    facing: 165, terrain: "South-facing bay at Killalea, sand bars with rock; Bass Point blocks E–NE swell and wind.", // facing checked against OSM coastline + satellite (8 Oct 2026)
    shelterSwell: [[20, 100, 0.6]], shelterWind: [[10, 90, 0.6]],
    surf: { swellDir: [100, 200], size: [2, 4], maxSize: 5, periodMin: 8, offshore: [270, 60], tide: ["mid", "high"] },
    hazards: "Crowded to ultra-crowded. Mystics (north end) is a reef for better surfers.",
    intel: [
      { text: "Wollongong locals' top beginner pick: protected on both sides by points so the swell stays modest; works on any tide (gets busy).", src: "Reddit r/wollongong \u2014 Beginner surfer / Learn to surf locally", url: "https://www.google.com/search?q=site%3Areddit.com+%22head+to+the+farm+in+Shellharbour%22" },
      { text: "Soft, cruisy wave that sometimes gets more power; S–SE swell, mid–high tide; great atmosphere but crowded.", src: "Wannasurf — The farm", url: "https://www.wannasurf.com/spot/Australia_Pacific/Australia/NSW/South_Coast/the_farm/index.html" },
    ],
    conf: { coords: "med", access: "high", shelter: "med", intel: "high" },
    rules: [
      { when: { windDir: [0, 70] }, then: { surf: +1 }, why: "Local rule: N–NE winds are offshore at The Farm (it faces south).", src: "https://www.wannasurf.com/spot/Australia_Pacific/Australia/NSW/South_Coast/the_farm/index.html" },
    ],
  },

  // ---------------- CENTRAL COAST / NEWCASTLE ----------------
  {
    id: "shelly-cc", type: "surf", name: "Shelly Beach (Central Coast)", easy: "learn",
    region: "Central Coast/Newcastle", lat: -33.3710, lon: 151.4935, tide: "A",
    access: { lat: -33.3712, lon: 151.4890, note: "Shelly Beach car parks off Shelly Beach Rd (golf course side)." },
    overnight: "Holiday parks at The Entrance / Toowoon Bay.",
    facing: 120, terrain: "Beach break; pick a sand bank.",
    shelterSwell: [], shelterWind: [],
    surf: { swellDir: [45, 200], size: [2, 4], maxSize: 5, periodMin: 8, offshore: [220, 320], tide: ["mid"] },
    hazards: "Crowded in school holidays (especially South Shelly). Doesn't handle 6 ft+.",
    intel: [
      { text: "Central Coast locals: North Shelly can be good for learners; Toowoon Bay (next bay south) is the mellow backup.", src: "Reddit r/centralcoastnsw \u2014 Beginner surf beaches", url: "https://www.google.com/search?q=site%3Areddit.com+%22Toowoon+bay+is+great%22" },
      { text: "Fun, easy waves; friendly locals; pick a sand bank. S–SE–E–NE swell with NW/W/SW wind, mid tide. Struggles over 6 ft.", src: "Wannasurf — Shelly Beach", url: "https://www.wannasurf.com/spot/Australia_Pacific/Australia/NSW/Central/Shelly_Beach/index.html" },
    ],
    conf: { coords: "med", access: "high", shelter: "med", intel: "high" },
    rules: [],
  },
  {
    id: "soldiers", type: "surf", name: "Soldiers Beach (Norah Head)",
    region: "Central Coast/Newcastle", lat: -33.2906, lon: 151.5690, tide: "A",
    access: { lat: -33.2905, lon: 151.5650, note: "Headland car park — check the point and the bay from the driver's seat." },
    overnight: "Norah Head Holiday Park.",
    facing: 135, terrain: "Three areas: lefts off the point at the north end, the clubhouse peaks, and the bay at the south end.",
    shelterSwell: [[0, 50, 0.5]], shelterWind: [[0, 60, 0.5]],
    surf: { swellDir: [90, 170], size: [2, 4], maxSize: 5, periodMin: 8, offshore: [220, 360], tide: ["low", "mid", "high"] },
    hazards: "Rocks at the point.",
    intel: [
      { text: "Central Coast locals warn Soldiers \"can get hectic\" \u2014 pick a small day.", src: "Reddit r/centralcoastnsw \u2014 Beginner surf beaches", url: "https://www.google.com/search?q=site%3Areddit.com+%22soldiers+beach+can+get+hectic%22" },
      { text: "Mainly spillers with workable ledges — not as sucky as other beaches nearby. Point (lefts) at the north end, clubhouse, and the bay at the south end. SE/E swell with N/NW/W/SW wind, all tides.", src: "Wannasurf — Soldiers", url: "https://www.wannasurf.com/spot/Australia_Pacific/Australia/NSW/Central/soldiers/index.html" },
    ],
    conf: { coords: "med", access: "high", shelter: "med", intel: "high" },
    rules: [],
  },
  {
    id: "merewether", type: "surf", name: "Merewether Beach (Newcastle)",
    region: "Central Coast/Newcastle", lat: -32.9493, lon: 151.7600, tide: "A",
    access: { lat: -32.9480, lon: 151.7560, note: "Merewether Beach car park, Henderson Pde." },
    overnight: "Stockton Beach Holiday Park; Newcastle holiday parks.",
    facing: 125, terrain: "Long beach break with good sand bars; easy take-offs and long walls.",
    shelterSwell: [[20, 60, 0.3]], shelterWind: [[20, 70, 0.6]],
    surf: { swellDir: [90, 190], size: [2, 4], maxSize: 5, periodMin: 8, offshore: [230, 330], tide: ["low", "mid"] },
    hazards: "Merewether's reefs (Ladies, the point) are for better surfers — stay on the beach.",
    intel: [
      { text: "Very consistent, fun, easy take-off with a nice long wall; goes well small and offshore, picks up a fair bit of swell, protected from the NE wind; good alternative when everywhere else is crowded.", src: "Wannasurf — Merewether", url: "https://www.wannasurf.com/spot/Australia_Pacific/Australia/NSW/Newcastle/merewether/index.html" },
    ],
    conf: { coords: "med", access: "high", shelter: "med", intel: "high" },
    rules: [
      { when: { windDir: [20, 70] }, then: { surf: +1 }, why: "Local rule: Merewether is protected from the NE wind.", src: "https://www.wannasurf.com/spot/Australia_Pacific/Australia/NSW/Newcastle/merewether/index.html" },
    ],
  },
  {
    id: "nobbys", type: "surf", name: "Nobbys Beach (Newcastle)", easy: "learn",
    region: "Central Coast/Newcastle", lat: -32.9235, lon: 151.7970, tide: "A",
    access: { lat: -32.9215, lon: 151.7935, note: "Nobbys Rd car park." },
    overnight: "Stockton Beach Holiday Park (ferry/drive); Newcastle holiday parks.",
    facing: 120, terrain: "Beach break tucked south of Nobbys Head and the harbour breakwall; the 'Nobbies shorey' gives fast lefts.",
    shelterSwell: [[0, 80, 0.7]], shelterWind: [[10, 80, 0.7]],
    surf: { swellDir: [100, 200], size: [2, 4], maxSize: 5, periodMin: 8, offshore: [270, 340], tide: ["low", "mid", "high"] },
    hazards: "Shipping channel/breakwall at the north end. Bluebottles in easterly winds.",
    intel: [
      { text: "Newcastle locals: Nobbys is the best beginner beach \u2014 long gentle break, not crowded, and somewhat sheltered from northerly swells. Merewether is more territorial.", src: "Reddit r/newcastle \u2014 beginner surfing threads", url: "https://www.google.com/search?q=site%3Areddit.com+%22Nobby%27s+is+nice+for+a+beginner%22" },
      { text: "Good fun, especially for beginner to intermediate surfers; the Nobbies shorey has fast lefts — good if you're not a complete beginner.", src: "Wannasurf — Nobbys beach / Nobbies", url: "https://www.wannasurf.com/spot/Australia_Pacific/Australia/NSW/Newcastle/nobbys_beach/index.html" },
    ],
    conf: { coords: "med", access: "high", shelter: "med", intel: "high" },
    rules: [
      { when: { windDir: [10, 70] }, then: { surf: +1.5 }, why: "NE wind: Nobbys is sheltered by the head and breakwall.", src: "Generic rule applied to site layout" },
    ],
  },
  {
    id: "one-mile-anna-bay", type: "surf", name: "One Mile Beach (Anna Bay)", easy: "learn",
    region: "Port Stephens/Great Lakes", lat: -32.7745, lon: 152.1255, tide: "A",
    access: { lat: -32.7770, lon: 152.1150, note: "One Mile Close car park (slide down the dune)." },
    overnight: "One Mile Beach Holiday Park (on the beach).",
    facing: 150, terrain: "Mile-long beach with a good A-frame (2–4 ft); point at the end — sets break in line with the 'three sisters' rocks.",
    shelterSwell: [[10, 70, 0.6]], shelterWind: [[0, 70, 0.6]],
    surf: { swellDir: [90, 210], size: [2, 4], maxSize: 5, periodMin: 8, offshore: [290, 360], tide: ["low", "mid", "high"] },
    hazards: "Rocks at the point end.",
    intel: [
      { text: "Regional classic, very consistent: a pretty good A-frame mostly around 2–4 ft; laid-back, no scary locals.", src: "Wannasurf — One mile beach", url: "https://www.wannasurf.com/spot/Australia_Pacific/Australia/NSW/Mid_North_Coast/one_mile_beach/index.html" },
      { text: "One Mile point: paddle out by the rocks in the rip; sets break in line with three rocks nicknamed the 3 sisters — really fun wave.", src: "Wannasurf — One mile point", url: "https://www.wannasurf.com/spot/Australia_Pacific/Australia/NSW/Newcastle/one_mile_point/index.html" },
    ],
    conf: { coords: "med", access: "high", shelter: "med", intel: "high" },
    rules: [],
  },
  {
    id: "seal-rocks-no1", type: "surf", name: "Number One Beach, Seal Rocks", easy: "learn",
    region: "Port Stephens/Great Lakes", lat: -32.4356, lon: 152.5300, tide: "A",
    access: { lat: -32.4362, lon: 152.5290, note: "Seal Rocks car park in front of the beach (you see the lines coming down the hill)." },
    overnight: "Seal Rocks Holiday Park; Treachery Camp.",
    facing: 35, terrain: "North-facing bay in the lee of Sugarloaf Point; long lines peeling across the beach.",
    shelterSwell: [[150, 230, 0.6]], shelterWind: [[150, 250, 0.8]],
    surf: { swellDir: [0, 140], size: [2, 4], maxSize: 5, periodMin: 8, offshore: [180, 260], tide: ["low", "mid", "high"] },
    hazards: "Rocks along the point; boats launch off the beach.",
    intel: [
      { text: "\"Around Seal Rocks is great beginner surf and an amazing place to stay.\"", src: "Reddit r/surfing \u2014 Surfing trip Australia (East Coast)", url: "https://www.google.com/search?q=site%3Areddit.com+%22Around+Seal+Rocks+is+great+beginner+surf%22" },
      { text: "Regional-classic point, good for all surfers: N–E–NE swell with W/SW/S wind, all tides; when it's working you see big long lines across the beach.", src: "Wannasurf — Seals rocks", url: "https://www.wannasurf.com/spot/Australia_Pacific/Australia/NSW/Mid_North_Coast/seals_rocks/index.html" },
      { text: "Lighthouse Beach (south side) usually picks up more swell: south end peak with SW wind protection, north end lefts in NE winds. Treachery further south is better but powerful and sharky.", src: "Wannasurf — Seal Rocks Lighthouse Beach", url: "https://www.wannasurf.com/spot/Australia_Pacific/Australia/NSW/Mid_North_Coast/Seal_Rocks-Lighthouse_Beach/index.html" },
    ],
    conf: { coords: "med", access: "high", shelter: "med", intel: "high" },
    rules: [
      { when: { swellDir: [150, 210], swellMin: 1.8, windDir: [150, 250] }, then: { surf: +1 }, why: "Big S swell + S wind: wraps into Number One, offshore and clean.", src: "Generic rule applied to site layout" },
    ],
  },
  {
    id: "crescent-head", type: "surf", name: "Crescent Head (the point)", easy: "learn",
    region: "Mid North Coast", lat: -31.1863, lon: 152.9814, tide: "A",
    access: { lat: -31.1900, lon: 152.9745, note: "Pacific St / Point car park beside Killick Creek." },
    overnight: "Crescent Head Holiday Park; Hat Head NP campgrounds (Delicate).",
    facing: 40, terrain: "Long right-hand point break over sand and rock into Killick Creek mouth. Perfect for the 6'10.",
    shelterSwell: [[0, 30, 0.3]], shelterWind: [[150, 250, 0.8]],
    surf: { swellDir: [60, 160], size: [2, 4], maxSize: 5, periodMin: 9, offshore: [180, 270], tide: ["low", "mid", "high"] },
    hazards: "Crowded, especially school holidays. Rocks on the inside at low tide. Back Beach: don't go right off the point (submerged rocks) — go left.",
    intel: [
      { text: "Even when small, catch them from right out on the point — they run through to the creek mouth and you have right of way all the way in. Don't go in school holidays.", src: "Wannasurf — Crescent head", url: "https://www.wannasurf.com/spot/Australia_Pacific/Australia/NSW/Mid_North_Coast/crescent_head/index.html" },
      { text: "If Crescent isn't working, check Back Beach's northern point (protected by the headland) — go left, submerged rocks to the right.", src: "Wannasurf — Back beach crescent head", url: "https://www.wannasurf.com/spot/Australia_Pacific/Australia/NSW/Mid_North_Coast/back_beach___crescent_head__/index.html" },
    ],
    conf: { coords: "med", access: "high", shelter: "med", intel: "high" },
    rules: [
      { when: { swellDir: [70, 160], periodMin: 9, windDir: [170, 270] }, then: { surf: +2 }, why: "Local rule: E–SE groundswell with S–W wind lines up the point.", src: "https://www.wannasurf.com/spot/Australia_Pacific/Australia/NSW/Mid_North_Coast/crescent_head/index.html" },
    ],
  },
  {
    id: "lake-cathie", type: "surf", name: "Lake Cathie (Middle Rock)", easy: "learn",
    region: "Mid North Coast", lat: -31.5600, lon: 152.8540, tide: "A",
    access: { lat: -31.5612, lon: 152.8494, note: "Park right by the beach on Ocean Dr; Middle Rock at the south end." },
    overnight: "Lake Cathie / Bonny Hills holiday parks.",
    facing: 85, terrain: "Great banks all along the beach; Middle Rock point-break at the south end; fun smaller shorey in close.",
    shelterSwell: [[170, 210, 0.3]], shelterWind: [[170, 220, 0.4]],
    surf: { swellDir: [45, 160], size: [2, 4], maxSize: 5, periodMin: 8, offshore: [220, 320], tide: ["low", "mid"] },
    hazards: "Rips; lake mouth.",
    intel: [
      { text: "Regional classic, very consistent: great banks all along the beach; Middle Rock at the south end is the most popular, consistent wave; nice clean wave out the back, fun shorey in close.", src: "Wannasurf — Lake cathie", url: "https://www.wannasurf.com/spot/Australia_Pacific/Australia/NSW/Mid_North_Coast/lake_cathie/index.html" },
      { text: "Flynns Beach (Port Macquarie) was dropped: \"only worth going if it is big\", lots of swimmers.", src: "Wannasurf — Flynn's beach", url: "https://www.wannasurf.com/spot/Australia_Pacific/Australia/NSW/Mid_North_Coast/flynn_s_beach/index.html" },
    ],
    conf: { coords: "med", access: "high", shelter: "low", intel: "high" },
    rules: [],
  },
  {
    id: "diamond-head", type: "surf", name: "Diamond Head (Crowdy Bay NP)", easy: "learn",
    region: "Mid North Coast", lat: -31.7166, lon: 152.7990, tide: "A",
    access: { lat: -31.7175, lon: 152.7930, note: "Diamond Head campground (NPWS, parking ticket if camping)." },
    overnight: "Diamond Head campground (on site, showers/toilets).",
    facing: 60, terrain: "Point break, sand with rock; waves not very powerful — mellow for a midlength.",
    shelterSwell: [[160, 220, 0.5]], shelterWind: [[160, 230, 0.6]],
    surf: { swellDir: [40, 160], size: [2, 4], maxSize: 5, periodMin: 8, offshore: [200, 290], tide: ["low", "mid", "high"] },
    hazards: "Occasional rocks.",
    intel: [
      { text: "Regional-classic point for all surfers; works on W winds, all tides; the waves aren't very powerful. Camping ground with showers on site.", src: "Wannasurf — Diamond head", url: "https://www.wannasurf.com/spot/Australia_Pacific/Australia/NSW/Mid_North_Coast/diamond_head/index.html" },
    ],
    conf: { coords: "med", access: "high", shelter: "low", intel: "med" },
    rules: [],
  },

  // ---------------- COFFS COAST ----------------
  {
    id: "sawtell", type: "surf", name: "Sawtell (headland)",
    region: "Coffs Coast", lat: -30.3781, lon: 153.1040, tide: "A",
    access: { lat: -30.3766, lon: 153.1038, note: "Park on the headland or in the car park — check it from the road." },
    overnight: "Sawtell Beach Holiday Park.",
    facing: 115, terrain: "Sandy point/beach break off Sawtell headland; surfers take the wider waves, bodyboarders the wedge.",
    shelterSwell: [[170, 210, 0.4]], shelterWind: [[170, 220, 0.5]],
    surf: { swellDir: [45, 170], size: [2, 4], maxSize: 5, periodMin: 8, offshore: [220, 300], tide: ["low", "mid"] },
    hazards: "Crowded to ultra-crowded. Murrays (just south) is the quieter longboard option at higher tides.",
    intel: [
      { text: "Very consistent and very easy — surfers take the wider waves while bodyboarders have the wedge; low–mid tide; crowded.", src: "Wannasurf — Sawtell", url: "https://www.wannasurf.com/spot/Australia_Pacific/Australia/NSW/Banana_Coast/sawtell/index.html" },
      { text: "Murrays: look for rips to paddle out; at higher tides it gets a bit fat but good for longboarders, with minimal crowds.", src: "Wannasurf — Murrays", url: "https://www.wannasurf.com/spot/Australia_Pacific/Australia/NSW/Banana_Coast/Murrays/index.html" },
    ],
    conf: { coords: "med", access: "high", shelter: "med", intel: "high" },
    rules: [],
  },
  {
    id: "diggers", type: "surf", name: "Diggers Beach (Coffs Harbour)", easy: "learn",
    region: "Coffs Coast", lat: -30.2750, lon: 153.1450, tide: "A",
    access: { lat: -30.2735, lon: 153.1415, note: "Diggers Beach Rd car park — lock the car, nothing on show." },
    overnight: "Park Beach Holiday Park; Coffs holiday parks.",
    facing: 75, terrain: "Small beach (a few hundred metres) between headlands; rip in the south corner takes you straight out the back.",
    shelterSwell: [[160, 200, 0.4]], shelterWind: [[160, 220, 0.4]],
    surf: { swellDir: [45, 170], size: [2, 4], maxSize: 5, periodMin: 8, offshore: [220, 300], tide: ["low", "mid", "high"] },
    hazards: "Rips. Nudist beach at the north end.",
    intel: [
      { text: "\"Diggers Beach in Coffs is an incredible beginner break.\"", src: "Reddit r/surfing \u2014 Surfing trip Australia (East Coast)", url: "https://www.google.com/search?q=site%3Areddit.com+%22Diggers+Beach+in+Coffs+is+an+incredible+beginner+break%22" },
      { text: "The southern corner has a great rip that pulls you straight out the back — no paddling through the lineup. SE–E–NE swell, offshore NW–SW, all tides.", src: "Wannasurf — Diggers beach", url: "https://www.wannasurf.com/spot/Australia_Pacific/Australia/NSW/Banana_Coast/diggers_beach/index.html" },
      { text: "Macauleys (just south) works best in a good NE–E swell when the left off the point comes into play — respect the locals.", src: "Wannasurf — Macauleys", url: "https://www.wannasurf.com/spot/Australia_Pacific/Australia/NSW/Banana_Coast/macauleys/index.html" },
    ],
    conf: { coords: "med", access: "high", shelter: "med", intel: "high" },
    rules: [],
  },
  {
    id: "sandy-beach-coffs", type: "surf", name: "Sandy Beach point (N of Coffs)",
    region: "Coffs Coast", lat: -30.1530, lon: 153.2035, tide: "A",
    access: { lat: -30.1500, lon: 153.1983, note: "Sandy Beach village; walk to the headland end." },
    overnight: "Woolgoolga / Moonee Beach holiday parks.",
    facing: 45, terrain: "Large headland; in big southerly swell the waves peel off the point 300–400 m back into the beach.",
    shelterSwell: [[150, 220, 0.6]], shelterWind: [[150, 240, 0.7]],
    surf: { swellDir: [60, 200], size: [2, 4], maxSize: 6, periodMin: 9, offshore: [180, 270], tide: ["low", "mid", "high"] },
    hazards: "Rocks off the point.",
    intel: [
      { text: "Works best in a large southerly swell when it's too big elsewhere; exceptionally long rides peeling off the point 300–400 m back to the beach. SE–E–NE swell, W/SW/S wind.", src: "Wannasurf — Sandy beach", url: "https://www.wannasurf.com/spot/Australia_Pacific/Australia/NSW/Banana_Coast/sandy_beach/index.html" },
    ],
    conf: { coords: "low", access: "med", shelter: "med", intel: "high" },
    rules: [
      { when: { swellDir: [150, 210], swellMin: 2.0 }, then: { surf: +1.5 }, why: "Local rule: comes alive in large southerly swells when everywhere else is too big.", src: "https://www.wannasurf.com/spot/Australia_Pacific/Australia/NSW/Banana_Coast/sandy_beach/index.html" },
    ],
  },

  // ---------------- Research round 3 (8 Oct 2026): Google/Reddit + Wannasurf ----------------
  {
    id: "cuttagee", type: "surf", name: "Cuttagee Beach (S of Bermagui)",
    region: "Far South Coast", lat: -36.4935, lon: 150.0640, tide: "A",
    access: { lat: -36.4960, lon: 150.0580, note: "Tathra–Bermagui Rd, ~12 km south of Bermagui; park right in front of the break." },
    overnight: "Bermagui holiday parks; Murrah/Mimosa Rocks NP camping.",
    facing: 110, terrain: "Beach break in front of a rocky headland — rights and lefts.",
    shelterSwell: [], shelterWind: [],
    surf: { swellDir: [90, 190], size: [2, 4], maxSize: 5, periodMin: 8, offshore: [250, 320], tide: ["mid"] },
    hazards: "Rips. Laid-back local crew — don't hog waves.",
    intel: [
      { text: "All-surfers beach break; sit in front of the rocky headland, rights and lefts. Best S–SE swell with NW–SW wind, mid tide; handles some E–NE swell if wind is light/offshore.", src: "Wannasurf — Cuttagee", url: "https://www.wannasurf.com/spot/Australia_Pacific/Australia/NSW/Far_South/Cuttagee/index.html" },
    ],
    conf: { coords: "low", access: "med", shelter: "med", intel: "med" },
    rules: [],
  },
  {
    id: "seven-mile-gerroa", type: "surf", name: "Seven Mile Beach (Gerroa end)", easy: "learn",
    region: "Shoalhaven/Illawarra", lat: -34.7840, lon: 150.8150, tide: "A",
    access: { lat: -34.7790, lon: 150.8110, note: "Gerroa — Seven Mile Beach car parks off Crooked River Rd / the boat ramp area." },
    overnight: "Seven Mile Beach Holiday Park (Gerroa); Gerroa Boat Fishermans park.",
    facing: 160, terrain: "Long, gentle sand beach running south from Gerroa; Black Head shelters the north end.",
    shelterSwell: [[30, 100, 0.5]], shelterWind: [[20, 90, 0.5]],
    surf: { swellDir: [100, 190], size: [1.5, 3.5], maxSize: 4, periodMin: 7, offshore: [280, 20], tide: ["low", "mid", "high"] },
    hazards: "Rips along the open beach.",
    intel: [
      { text: "Beginner wave — fast, fun, powerless; surf anywhere along the beach, all tides, plenty of space. Best SE swell with NW wind.", src: "Wannasurf — Gerroa", url: "https://www.wannasurf.com/spot/Australia_Pacific/Australia/NSW/South_Coast/gerroa/index.html" },
      { text: "\"Seven Mile Beach in Gerroa is beginner friendly\" — Gerringong Surf School runs lessons here.", src: "Reddit r/BeginnerSurfers", url: "https://www.google.com/search?q=site%3Areddit.com+%22Seven+mile+beach+in+Geroa+is+beginner+friendly%22" },
    ],
    conf: { coords: "med", access: "high", shelter: "med", intel: "high" },
    rules: [],
  },
  {
    id: "blacksmiths", type: "surf", name: "Blacksmiths Beach (Swansea)", easy: "learn",
    region: "Central Coast/Newcastle", lat: -33.0760, lon: 151.6640, tide: "A",
    access: { lat: -33.0745, lon: 151.6585, note: "Blacksmiths SLSC car park; breakwall end via the Grannys Pool car park." },
    overnight: "Swansea / Belmont holiday parks.",
    facing: 110, terrain: "Beach break north of the Swansea Channel breakwall.",
    shelterSwell: [], shelterWind: [],
    surf: { swellDir: [60, 150], size: [2, 4], maxSize: 5, periodMin: 8, offshore: [250, 320], tide: ["mid"] },
    hazards: "Sharks reported. Channel currents near the breakwall.",
    intel: [
      { text: "Newcastle locals: for beginners, Nobbys or \"further south is Blacksmiths — all other beaches are much more advanced\".", src: "Reddit r/newcastle — Surfing advice for Newcastle", url: "https://www.google.com/search?q=site%3Areddit.com+%22If+you%27re+a+beginner+Nobbys+or+further+south+Is+blacksmiths%22" },
      { text: "Mid tide, E–NE swell, NW–SW wind. Waves can lack quality; on a good 6–8 ft swell the breakwall end has two waves.", src: "Wannasurf — Blacksmiths beach", url: "https://www.wannasurf.com/spot/Australia_Pacific/Australia/NSW/Newcastle/blacksmiths_beach/index.html" },
    ],
    conf: { coords: "med", access: "high", shelter: "med", intel: "med" },
    rules: [],
  },
  {
    id: "boomerang", type: "surf", name: "Boomerang Beach (Pacific Palms)", easy: "learn",
    region: "Port Stephens/Great Lakes", lat: -32.3425, lon: 152.5470, tide: "A",
    access: { lat: -32.3400, lon: 152.5433, note: "Boomerang Beach car parks off Boomerang Dr (25 km south of Forster)." },
    overnight: "Pacific Palms / Elizabeth Beach / Seal Rocks camping.",
    facing: 95, terrain: "Consistent beach break with good banks; point-like setup over reef at the south end; big northern headland.",
    shelterSwell: [[0, 40, 0.5]], shelterWind: [[0, 60, 0.6]],
    surf: { swellDir: [70, 190], size: [2, 4], maxSize: 5, periodMin: 8, offshore: [250, 320], tide: ["low", "mid", "high"] },
    hazards: "South-end reef/rocks are for experienced surfers — stay on the beach banks. Some localism.",
    intel: [
      { text: "Very consistent; great beach-break banks along the whole beach. The northern headland protects it from summer nor'easters. South end reef only for fairly experienced surfers.", src: "Wannasurf — Boomerang beach", url: "https://www.wannasurf.com/spot/Australia_Pacific/Australia/NSW/Mid_North_Coast/boomerang_beach/index.html" },
      { text: "Named as a good beginner spot on an East Coast trip (with Seal Rocks).", src: "Reddit r/surfing — East Coast Australia Beginner Spots", url: "https://www.google.com/search?q=site%3Areddit.com+%22boomerang+beach%2C+seal+rocks+and+covent+beach%22" },
    ],
    conf: { coords: "med", access: "high", shelter: "med", intel: "high" },
    rules: [
      { when: { windDir: [20, 70] }, then: { surf: +1 }, why: "Local rule: northern headland protects it from summer nor'easters.", src: "https://www.wannasurf.com/spot/Australia_Pacific/Australia/NSW/Mid_North_Coast/boomerang_beach/index.html" },
    ],
  },
  {
    id: "scotts-head", type: "surf", name: "Scotts Head (the point)",
    region: "Mid North Coast", lat: -30.7420, lon: 153.0080, tide: "A",
    access: { lat: -30.7470, lon: 152.9960, note: "Scotts Head Reserve / holiday park car park by the point." },
    overnight: "Scotts Head Holiday Park (beachfront).",
    facing: 30, terrain: "Right-hand point break wrapping into the north-facing bay; sand and rock.",
    shelterSwell: [[0, 30, 0.3]], shelterWind: [[150, 250, 0.8]],
    surf: { swellDir: [70, 180], size: [2, 4], maxSize: 6, periodMin: 9, offshore: [180, 270], tide: ["low", "mid", "high"] },
    hazards: "Rocks off the point.",
    intel: [
      { text: "Point break for all surfers; works from under 3 ft on any tide, few surfers on weekends.", src: "Wannasurf — Scotts head", url: "https://www.wannasurf.com/spot/Australia_Pacific/Australia/NSW/Mid_North_Coast/scotts_head/index.html" },
      { text: "Travelling surfers rate Scotts Head and Crescent Head as must-stops — \"you won't regret it\".", src: "Reddit r/surfing — East Coast Australia Beginner Spots", url: "https://www.google.com/search?q=site%3Areddit.com+%22Scotts+head+and+crescent+head%2C+go+there%22" },
    ],
    conf: { coords: "low", access: "high", shelter: "med", intel: "med" },
    rules: [
      { when: { swellDir: [100, 190], windDir: [170, 260] }, then: { surf: +1.5 }, why: "Like Crescent: SE–S swell wraps the point and S–SW wind is offshore in the bay.", src: "Generic rule applied to site layout" },
    ],
  },
  {
    id: "arrawarra", type: "surf", name: "Arrawarra Point (N of Woolgoolga)", easy: "learn",
    region: "Coffs Coast", lat: -30.0570, lon: 153.2045, tide: "A",
    access: { lat: -30.0600, lon: 153.2005, note: "Arrawarra Headland car park (~2.5 km north of Woolgoolga); walk the track and jump off the rocks." },
    overnight: "Arrawarra Beach Holiday Park; Woolgoolga.",
    facing: 50, terrain: "Long, soft point wall off Arrawarra Headland.",
    shelterSwell: [[150, 210, 0.4]], shelterWind: [[160, 250, 0.7]],
    surf: { swellDir: [60, 160], size: [2, 4], maxSize: 6, periodMin: 8, offshore: [170, 270], tide: ["low", "mid"] },
    hazards: "Rocks at the jump-off; sit on the shoulder if unsure. Some localism.",
    intel: [
      { text: "All surfers — fun, fairly powerless long walls; \"a very safe place to surf\" from 2 ft (low tide) up to 8–10 ft. Jump off the rocks from the track; SE–NE swell, W/SW/S wind, low–mid tide.", src: "Wannasurf — Arrawarra point", url: "https://www.wannasurf.com/spot/Australia_Pacific/Australia/NSW/Banana_Coast/arrawarra_point/index.html" },
    ],
    conf: { coords: "med", access: "med", shelter: "med", intel: "high" },
    rules: [
      { when: { windDir: [170, 260] }, then: { surf: +1 }, why: "Local rule: S–W winds are offshore at the point.", src: "https://www.wannasurf.com/spot/Australia_Pacific/Australia/NSW/Banana_Coast/arrawarra_point/index.html" },
    ],
  },

  // =================================================================
  // SPEAR (shore entry / rock jump only, max 20 m)
  // Every spear spot is a headland, point or rocky bay (spearing is banned on ocean beaches).
  // Research round 2 (8 Oct 2026): dive-club/site guides, spearo trip reports, Deckee/Fishraider threads,
  // USFA submissions, local fishing reports. Rules marked "local rule" come from those sources.
  // =================================================================

  // ---------------- FAR SOUTH COAST ----------------
  {
    id: "merimbula-wharf", type: "spear", name: "Merimbula Wharf",
    region: "Far South Coast", lat: -36.8990, lon: 149.9270, tide: "A",
    access: { lat: -36.8985, lon: 149.9262, note: "End of Lake St at the wharf/aquarium; walk out to the point." },
    overnight: "Merimbula holiday parks.",
    terrain: "Point on the north side of Merimbula Bay, facing south into the bay. Reef walls to 7 m, then 10–15 m along a second wall past the wharf.",
    depth: [5, 15],
    sides: [
      { name: "Wharf point", facing: 170, shelterSwell: [[330, 70, 0.9]], shelterWind: [[330, 80, 0.9]] },
    ],
    spear: {
      entry: "Giant stride off the western side of the point; exit on the sloping rock on the southern side, riding an incoming wave up.",
      unsafeAt: 1.0, kingfish: 1, kingfishNote: "Mostly reef fish; pelagics pass the bay occasionally.",
      vis: "Normally quite good, but dirty after rain and on the outgoing tide (Merimbula Lake inlet next door).",
      species: ["drummer", "bream", "trevally", "leatherjacket", "snapper"],
      river: { name: "Merimbula Lake inlet", km: 0.6, size: "med" },
    },
    hazards: "Busy fishing wharf — stay well clear of lines.",
    intel: [
      { text: "Not a dive for southerly seas or winds, but especially good when north-easterlies are blowing. Water gets dirty after rain and on outgoing tides.", src: "Michael McFadyen's Scuba — Merimbula Wharf", url: "https://www.michaelmcfadyenscuba.info/viewpage.php?page_id=86" },
    ],
    conf: { coords: "med", access: "high", legal: "high", shelter: "high", intel: "high" },
    rules: [
      { when: { swellDir: [140, 220], swellMin: 1.0 }, then: { spear: -2 }, why: "Local rule: not a dive for southerly seas.", src: "https://www.michaelmcfadyenscuba.info/viewpage.php?page_id=86" },
      { when: { windDir: [20, 80] }, then: { spear: +1.5 }, why: "Local rule: especially good when north-easterlies are blowing.", src: "https://www.michaelmcfadyenscuba.info/viewpage.php?page_id=86" },
      { when: { tide: "falling" }, then: { spear: -0.5 }, why: "Local rule: outgoing tide carries dirty lake water past the wharf.", src: "https://www.michaelmcfadyenscuba.info/viewpage.php?page_id=86" },
    ],
  },
  {
    id: "haycock-point", type: "spear", name: "Haycock Point (Beowa NP, Pambula)",
    region: "Far South Coast", lat: -36.9495, lon: 149.9470, tide: "A",
    access: { lat: -36.9497, lon: 149.9424, note: "Haycock Point picnic area car park (NPWS; park entry fee may apply)." },
    overnight: "Pambula Beach / Merimbula holiday parks; Beowa NP campgrounds further south.",
    terrain: "Rocky headland with boulder reef and Haystack Rock off the point. Pambula River mouth on the north side; Hunter Rock ~1 km north (boat).",
    depth: [3, 15],
    sides: [
      { name: "North side (Pambula River side)", facing: 25, shelterSwell: [[150, 230, 0.8]], shelterWind: [[150, 250, 0.8]] },
      { name: "South side", facing: 150, shelterSwell: [[0, 60, 0.8]], shelterWind: [[0, 70, 0.8]] },
    ],
    spear: {
      entry: "Rock platform entries either side of the point; pick the lee side. Calm-day rock jump off the point.",
      unsafeAt: 1.2, kingfish: 2, kingfishNote: "Kingfish, snapper and mulloway are taken off these rocks; Hunter Rock 1 km north holds resident kings (boat).",
      vis: "Often good; north side drops after rain (Pambula River).", species: ["kingfish", "snapper", "drummer", "morwong", "salmon"],
      river: { name: "Pambula River", km: 0.8, size: "med" },
    },
    hazards: "Surge on the platform — locals say care is needed fishing here. River outflow on the north side after rain.",
    intel: [
      { text: "Popular rock-fishing spot for snapper, mulloway, kingfish, salmon and tailor, but care is required. Hunter Rock (~1 km north) is a prime kingfish spot by boat.", src: "WikiFishingSpots — Pambula", url: "https://www.wikifishingspots.com.au/pambula-fishing-spots-new-south-wales/" },
      { text: "Haystack Rock and the 1950 Empire Gladstone wreck site are nearby.", src: "Visit NSW — Haycock Point", url: "https://www.visitnsw.com/destinations/south-coast/merimbula-and-sapphire-coast/eden/attractions/haycock-point" },
    ],
    conf: { coords: "med", access: "med", legal: "high", shelter: "med", intel: "med" },
    rules: [
      { side: 0, when: { swellDir: [150, 230], windDir: [150, 250] }, then: { spear: +1 }, why: "S swell + S wind: north side in the lee (watch river runoff after rain).", src: "Generic rule applied to site layout" },
    ],
  },
  {
    id: "tathra-headland", type: "spear", name: "Tathra Headland (Wharf / Kianinny Bay)", easy: "snorkel",
    region: "Far South Coast", lat: -36.7248, lon: 149.9897, tide: "A",
    access: { lat: -36.7270, lon: 149.9879, note: "Tathra Wharf car park at the end of Wharf Rd (park on the right). Kianinny Bay boat ramp car park for the south side." },
    overnight: "Tathra Beach holiday park; Mimosa Rocks NP campgrounds north of Tathra.",
    terrain: "North side: shallow valley of white/pink rock to a reef edge at 7–8 m, then boulders and gorgonia gardens to 15 m beside the historic wharf. South side: Kianinny Bay (3–18 m).",
    depth: [3, 18],
    sides: [
      { name: "North side (Tathra Wharf)", facing: 20, shelterSwell: [[150, 230, 0.8]], shelterWind: [[150, 250, 0.8]] },
      { name: "South side (Kianinny Bay)", facing: 100, shelterSwell: [[340, 40, 0.6]], shelterWind: [[340, 50, 0.6]] },
    ],
    spear: {
      entry: "Wharf: hard climb down the rock face beside the wall (some concrete steps); exit on the sloping rock riding an incoming wave, crawl up before removing fins. Kianinny: easy entry beside the boat ramp.",
      unsafeAt: 1.2, kingfish: 1, kingfishNote: "Big schools of yellowtail and reef fish; kings occasional.",
      vis: "Usually good; Bega River (3 km north) dirties water after big rain.", species: ["drummer", "bream", "trevally", "morwong", "leatherjacket"],
      river: { name: "Bega River (Mogareeka)", km: 3, size: "large" },
    },
    hazards: "Steep climb at the wharf. Boat traffic at Kianinny ramp — float and flag.",
    intel: [
      { text: "Tathra Wharf: \"one of the best shore dives I have ever done\" — prolific fish, thousands of gorgonias, 3–15 m. Hard climb in and out.", src: "Michael McFadyen's Scuba — Tathra Wharf", url: "https://www.michaelmcfadyenscuba.info/viewpage.php?page_id=93" },
      { text: "Kianinny Bay is a 3–18 m shore dive, lovely in the right weather.", src: "Merimbula Divers Lodge shore dive list", url: "http://merimbuladiverslodge.com.au/wp/diving-trips/shore-dives/" },
    ],
    conf: { coords: "med", access: "high", legal: "high", shelter: "med", intel: "high" },
    rules: [
      { side: 0, when: { swellDir: [150, 230], windDir: [150, 250] }, then: { spear: +1 }, why: "S swell + S wind: the wharf side is in the lee of Tathra Headland.", src: "Generic rule applied to site layout" },
    ],
  },
  {
    id: "bermagui-horseshoe", type: "spear", name: "Bermagui Point (Horseshoe Bay / Blue Pool)",
    region: "Far South Coast", lat: -36.4221, lon: 150.0823, tide: "A",
    access: { lat: -36.4248, lon: 150.0775, note: "Horseshoe Bay car park / Blue Pool car park, Bermagui." },
    overnight: "Zane Grey caravan park (Bermagui); Wallaga Lake parks.",
    terrain: "Headland between Horseshoe Bay (north) and the Blue Pool (east/south); reef ledges. Camel Rock 5 km north is a listed kingfish hotspot.",
    depth: [2, 15],
    sides: [
      { name: "North side (Horseshoe Bay)", facing: 15, shelterSwell: [[150, 230, 0.8]], shelterWind: [[150, 250, 0.8]] },
      { name: "East side (Blue Pool)", facing: 110, shelterSwell: [[300, 20, 0.6]], shelterWind: [[300, 30, 0.6]] },
    ],
    spear: {
      entry: "Horseshoe Bay: snorkel straight off the beach end of the rocks (stay >20 m from the beach). Blue Pool side: rock entry, calm days only.",
      unsafeAt: 1.2, kingfish: 2, kingfishNote: "Bermagui is a kingfish town; official guide lists Camel Rock, 4 & 6 Mile reefs and Montague as kingfish hotspots.",
      vis: "Good; Bermagui River harbour mouth sits just north.", species: ["kingfish", "drummer", "snapper", "morwong", "trevally"],
      river: { name: "Bermagui River", km: 0.8, size: "small" },
    },
    hazards: "Boat channel off Bermagui harbour. Waves make the Blue Pool area hard work.",
    intel: [
      { text: "Locals' tip for visiting spearos: try outside the Blue Pool, right in the middle of town.", src: "Reddit r/FishingAustralia \u2014 spearfishing in Bermagui", url: "https://www.google.com/search?q=site%3Areddit.com+%22spearfishing+in+bermagui%22" },
      { text: "Bermagui recreational fishing guide lists Camel Rock among kingfish hotspots; kings caught year-round, best in warmer months.", src: "NSW DPI — Go Fishing Bermagui (2024)", url: "https://www.dpi.nsw.gov.au/__data/assets/pdf_file/0005/1319549/16765-GoFishingGuide_BermaguiWeb-2024.pdf" },
      { text: "Horseshoe Bay is the town's main beach; you can snorkel straight off it with rock pools on the right side. The Blue Pool can be challenging when waves are up.", src: "Visitor guides (Visit Bermagui, Tripadvisor)", url: "https://www.visitbermagui.com.au/iconic-attractions-1" },
    ],
    conf: { coords: "med", access: "med", legal: "high", shelter: "med", intel: "med" },
    rules: [],
  },
  {
    id: "narooma-glasshouse", type: "spear", name: "Glasshouse Rocks (Narooma)",
    region: "Far South Coast", lat: -36.2376, lon: 150.1480, tide: "A",
    access: { lat: -36.2340, lon: 150.1420, note: "Narooma Surf Beach car park; walk south around the rocks at low tide." },
    overnight: "Narooma holiday parks; Mystery Bay campground (south).",
    terrain: "Rocky outcrop and reef south of Narooma Surf Beach.",
    depth: [3, 15],
    sides: [
      { name: "Glasshouse Rocks", facing: 90, shelterSwell: [[180, 220, 0.4]], shelterWind: [[180, 230, 0.4]] },
    ],
    spear: {
      entry: "Rock entry off the outcrop; walk-in at low tide only.",
      unsafeAt: 1.1, kingfish: 2, kingfishNote: "Narooma is a kingfish town (Montague Island); reef with current off the rocks.",
      vis: "Often good; Wagonga Inlet outflow on the run-out tide after rain.", species: ["kingfish", "drummer", "snapper", "morwong", "trevally"],
      river: { name: "Wagonga Inlet", km: 2, size: "med" },
    },
    hazards: "Low-tide access only on foot. Fur seals haul out on the Narooma breakwall.",
    intel: [{ text: "Reached by a short low-tide walk from the Narooma Surf Beach car park. No dive or spearfishing write-ups found — check it on arrival.", src: "Eurobodalla — Narooma's many sides", url: "https://eurobodalla.com.au/naroomas-many-sides/" }],
    conf: { coords: "med", access: "med", legal: "high", shelter: "low", intel: "low" },
    rules: [
      { when: { tide: "high" }, then: { spearCap: 4 }, why: "Local rule: the walk round to Glasshouse Rocks is low-tide only.", src: "https://eurobodalla.com.au/naroomas-many-sides/" },
    ],
  },

  // ---------------- SOUTH COAST ----------------
  {
    id: "crampton-island", type: "spear", name: "Crampton (Tabourie) Island — east side",
    region: "South Coast", lat: -35.4448, lon: 150.4172, tide: "A",
    access: { lat: -35.4425, lon: 150.4085, note: "Lake Tabourie beach access; walk out to the island across the sand around low tide (the crossing changes)." },
    overnight: "Lake Tabourie holiday park; Ulladulla parks 15 min north.",
    terrain: "Small island joined to the beach at low tide; open-ocean reef on its east side.",
    depth: [3, 15],
    sides: [
      { name: "East side", facing: 100, shelterSwell: [], shelterWind: [] },
      { name: "North side", facing: 20, shelterSwell: [[150, 230, 0.7]], shelterWind: [[150, 250, 0.7]] },
    ],
    spear: {
      entry: "Walk out at low tide, enter off the rocks on the lee side. Plan the dive within ~2 hours either side of low tide so you can walk back.",
      unsafeAt: 1.0, kingfish: 2, kingfishNote: "Locals rate the east side for snapper and kingfish — better than the shallow Ulladulla rocks.",
      vis: "Generally good; Lake Tabourie mouth beside it after rain.", species: ["kingfish", "snapper", "drummer", "groper (protected)"],
      river: { name: "Lake Tabourie", km: 0.4, size: "small" },
    },
    hazards: "Tide can cut off the walk back. Open ocean on the east side.",
    intel: [
      { text: "For a snapper or king, try the east side of Tabourie (Crampton) Island; access is often low tide only — plan for 2 hours either side of low.", src: "Deckee/Fishraider — Ulladulla land-based (2021)", url: "https://community.deckee.com/topic/93950-is-there-anything-worthwhile-chasing-near-ulladulla-land-based/" },
    ],
    conf: { coords: "med", access: "low", legal: "high", shelter: "low", intel: "med" },
    rules: [
      { when: { tide: "high" }, then: { spearCap: 3 }, why: "Local rule: island walk-out is ±2 h of low tide only.", src: "https://community.deckee.com/topic/93950-is-there-anything-worthwhile-chasing-near-ulladulla-land-based/" },
    ],
  },
  {
    id: "warden-head", type: "spear", name: "Warden Head (Ulladulla)",
    region: "South Coast", lat: -35.3665, lon: 150.4925, tide: "A",
    access: { lat: -35.3663, lon: 150.4895, note: "Warden Head lighthouse car park, Deering St." },
    overnight: "Ulladulla Headland Holiday Park; Murramarang NP campgrounds.",
    terrain: "Lighthouse headland with deep ledges; north side faces the harbour approach, south/east side open.",
    depth: [3, 18],
    sides: [
      { name: "North side (harbour approach)", facing: 20, shelterSwell: [[150, 230, 0.8]], shelterWind: [[150, 250, 0.8]] },
      { name: "South-east side", facing: 130, shelterSwell: [[340, 40, 0.6]], shelterWind: [[340, 50, 0.6]] },
    ],
    spear: {
      entry: "North side: rock entry near the harbour side; low-tide walk round from the beach. SE side: calm days only.",
      unsafeAt: 1.2, kingfish: 2, kingfishNote: "Deep ledges where land-based anglers target kingfish — but locals say the Ulladulla rocks are fairly shallow and kings come close mainly after a decent blow.",
      vis: "Usually good.", species: ["kingfish", "drummer", "snapper", "morwong", "luderick"],
      river: null,
    },
    hazards: "Boat traffic in and out of Ulladulla harbour on the north side — float and flag.",
    intel: [
      { text: "Renowned rock ledge with deep-water access for kingfish and snapper; fishing relies on a low swell and an incoming tide.", src: "Fishing Australia — Ulladulla", url: "https://www.fishingaustralia.com.au/ulladulla-nsw/" },
      { text: "Water around Ulladulla's rock spots is fairly shallow — mostly bread-and-butter species unless a decent blow and swell brings bigger fish in close.", src: "Deckee/Fishraider — Ulladulla land-based (2021)", url: "https://community.deckee.com/topic/93950-is-there-anything-worthwhile-chasing-near-ulladulla-land-based/" },
    ],
    conf: { coords: "med", access: "med", legal: "high", shelter: "med", intel: "med" },
    rules: [],
  },

  // ---------------- SHOALHAVEN / ILLAWARRA ----------------
  {
    id: "currarong", type: "spear", name: "Currarong / Beecroft Peninsula rocks",
    region: "Shoalhaven/Illawarra", lat: -35.0104, lon: 150.8254, tide: "A",
    access: { lat: -35.0158, lon: 150.8254, note: "Currarong village; rock platforms east towards Wreck Point and Lobster Bay. Beecroft Weapons Range (Defence) closes parts of the peninsula on some days." },
    overnight: "Currarong holiday park; Honeymoon Bay camping (Beecroft, limited dates).",
    terrain: "North-facing rock platforms with reef ledges, in the lee of the Beecroft Peninsula. Beecroft Head is a famous kingfish ledge.",
    depth: [3, 18],
    sides: [
      { name: "North-facing platforms", facing: 10, shelterSwell: [[120, 250, 0.9]], shelterWind: [[130, 260, 0.9]] },
    ],
    spear: {
      entry: "Rock entries off the platforms between the village, Wreck Point and Lobster Bay; pick a protected gutter. Little Beecroft (south of Lobster Bay) only when the swell is down.",
      unsafeAt: 1.3, kingfish: 3, kingfishNote: "Beecroft Head has produced large numbers of kingfish from the rocks; big kings hang under the Currarong cliffs in settled weather.",
      vis: "Often excellent in southerly weather.", species: ["kingfish", "bonito", "drummer", "snapper", "luderick"],
      river: { name: "Currarong Creek", km: 0.3, size: "small" },
    },
    hazards: "Defence range closures. Mermaids Inlet (north side of Beecroft) was closed for safety in 2024 — check on arrival.",
    intel: [
      { text: "Reddit spearos: \"really nice and an easy spot to rock hop, go out to either the wreck or lobster bay\" \u2014 rockfish plus pelagics.", src: "Reddit r/Spearfishing \u2014 Australian East Coast Spearos", url: "https://www.google.com/search?q=site%3Areddit.com+%22Australian+East+Coast+Spearos%22" },
      { text: "Beecroft Head is one of the best-known rock ledges on the South Coast — large numbers of kingfish, tuna, drummer and snapper landed.", src: "Currarong Community Association — Fishing", url: "https://currarong.org.au/things-to-do/fishing/" },
      { text: "Big kings hanging around under the Currarong cliffs; favourite time to fish the ocean rocks in settled weather.", src: "Fishing World — South Coast fishing seasons", url: "https://fishingworld.com.au/how-to/south-coast-fishing-seasons/" },
      { text: "Wreck Point to Lobster Bay/Island for bonito; Little Beecroft if the swell is down. Tubes often off-limits when the Navy range is in use; Mermaids Inlet closed for safety (Jan 2024).", src: "Deckee/Fishraider — Currarong beach/Jervis Bay rocks (2024)", url: "https://community.deckee.com/topic/97580-currarong-beachjervis-bay-rocks/" },
    ],
    conf: { coords: "low", access: "med", legal: "high", shelter: "high", intel: "high" },
    rules: [
      { when: { swellDir: [140, 230], windDir: [140, 250] }, then: { spear: +1.5 }, why: "S swell + S wind: Currarong's north face is fully in the lee of Beecroft.", src: "Generic rule applied to site layout" },
      { when: { windDir: [0, 60] }, then: { spear: -1.5 }, why: "NE wind blows straight onto Currarong's north-facing platforms.", src: "Generic rule applied to site layout" },
    ],
  },
  {
    id: "penguin-head", type: "spear", name: "Penguin Head (Culburra) — south side",
    region: "Shoalhaven/Illawarra", lat: -34.9327, lon: 150.7850, tide: "A",
    access: { lat: -34.9300, lon: 150.7790, note: "Park at Culburra Beach Surf Club and walk out along the flat rock platform to the end of the head." },
    overnight: "Culburra Beach holiday parks; Currarong.",
    terrain: "Flat rock platform running out to the end of Penguin Head; fish the south side.",
    depth: [2, 12],
    sides: [
      { name: "South side", facing: 160, shelterSwell: [[340, 70, 0.85]], shelterWind: [[350, 80, 0.9]] },
    ],
    spear: {
      entry: "Off the end of the flat rock on the south side; calm days, time it with the sets.",
      unsafeAt: 1.0, kingfish: 2, kingfishNote: "A local regularly takes bonito and kingfish off the end of the flat rock.",
      vis: "Good in NE weather; Crookhaven River mouth (north) after rain.", species: ["kingfish", "bonito", "drummer", "bream"],
      river: { name: "Lake Wollumboola / Crookhaven", km: 3, size: "med" },
    },
    hazards: "Flat rock platform — washes in any real swell from the south.",
    intel: [
      { text: "Penguin Head: park at the surf club, walk to the end of the flat rock and fish the south side — bonito and kings, best early/late with a lowish tide, protected from the prevailing NE wind.", src: "Deckee/Fishraider — Currarong beach/Jervis Bay rocks (2024)", url: "https://community.deckee.com/topic/97580-currarong-beachjervis-bay-rocks/" },
    ],
    conf: { coords: "med", access: "high", legal: "high", shelter: "med", intel: "med" },
    rules: [
      { when: { windDir: [20, 80] }, then: { spear: +1 }, why: "Local rule: south side is protected from the prevailing NE wind.", src: "https://community.deckee.com/topic/97580-currarong-beachjervis-bay-rocks/" },
    ],
  },
  {
    id: "plantation-point", type: "spear", name: "Plantation Point (Jervis Bay)", easy: "snorkel",
    region: "Shoalhaven/Illawarra", lat: -35.0705, lon: 150.6965, tide: "A",
    access: { lat: -35.0728, lon: 150.6930, note: "Plantation Point Pde reserve car park, Vincentia." },
    overnight: "Booderee NP Green Patch (paid, book); Jervis Bay holiday parks.",
    terrain: "Rocky point inside Jervis Bay, reef and sand edges; bay water is often very clear.",
    depth: [2, 14],
    sides: [
      { name: "Point (inside Jervis Bay)", facing: 80, shelterSwell: [[150, 60, 0.85]], shelterWind: [[180, 330, 0.8]] },
    ],
    spear: {
      entry: "Easy entry from the rocks/small beaches either side of the point.",
      unsafeAt: 1.5, kingfish: 2, kingfishNote: "Kings and pelagics patrol the bay; less current than ocean headlands.",
      vis: "Often 10 m+. Strong NE/E wind or big E swell into the bay entrance reduces it.", species: ["kingfish", "snapper", "trevally", "squid", "flathead"],
      river: { name: "Currambene Creek (Huskisson)", km: 3, size: "small" },
    },
    hazards: "Boats.",
    intel: [
      { text: "Rocky point inside the bay, a premier land-based spot for large snapper and squid.", src: "Fishing Monthly — Beginners guide to Shoalhaven & Jervis Bay", url: "http://www.fishingmonthly.com.au/Articles/Display/17557-Beginners-Guide-to-the-Shoalhaven-River-and-Jervis-Bay" },
    ],
    conf: { coords: "med", access: "high", legal: "high", shelter: "high", intel: "low" },
    rules: [
      { when: { swellDir: [60, 130], swellMin: 2.0 }, then: { spear: -2 }, why: "Big E swell pushes through the Jervis Bay entrance and stirs up the bay.", src: "Generic rule applied to site layout" },
      { when: { windDir: [200, 300] }, then: { spear: +1 }, why: "W–SW wind is offshore on the western shore of Jervis Bay.", src: "Generic rule applied to site layout" },
    ],
  },
  {
    id: "kiama-blowhole", type: "spear", name: "Kiama Blowhole Point → Harbour",
    region: "Shoalhaven/Illawarra", lat: -34.6703, lon: 150.8657, tide: "A",
    access: { lat: -34.6712, lon: 150.8625, note: "Blowhole Point car park by the boat ramp/toilet block (cold showers)." },
    overnight: "Kiama Harbour Cabins / Kendalls Beach holiday park; Werri Beach Holiday Park.",
    terrain: "Gutters and ridges running north off Blowhole Point down to a sand edge at ~16 m, then back along the wall into Kiama Harbour. Good reef around the Blowhole (thin south of town).",
    depth: [5, 16],
    sides: [
      { name: "North side (to the harbour)", facing: 30, shelterSwell: [[140, 230, 0.8]], shelterWind: [[140, 250, 0.8]] },
    ],
    spear: {
      entry: "Enter just right of the ocean pool (ledge to sit on, deep-water drop), swim 10 m out, follow the gutter NE then the reef round into Kiama Harbour; exit at the small pebble inlet just inside the harbour wall (far end of car park).",
      unsafeAt: 1.0, kingfish: 2, kingfishNote: "Blowhole Point rocks are a known live-bait spot for kingfish, tuna and cobia in the warmer months.",
      vis: "Can be excellent (20 m on a good day).", species: ["kingfish", "drummer", "snapper", "morwong", "bonito"],
      river: { name: "Minnamurra River", km: 5, size: "small" },
    },
    hazards: "Blowhole surge in any swell. Boats at the harbour entrance.",
    intel: [
      { text: "Shore dive from beside the pool round into Kiama Harbour, 5–16.5 m, exit at the pebble inlet inside the harbour wall; reef is good around the Blowhole but not south of town; 20 m visibility on his dive.", src: "Michael McFadyen's Scuba — Kiama Point", url: "https://www.michaelmcfadyenscuba.info/viewpage.php?page_id=762" },
      { text: "Kiama Blowhole Point rocks are popular for sport fishing; warmer months suit live baiting for kingfish, tuna and cobia.", src: "Fishing Tackle Shop — Fishing Kiama", url: "https://blog.fishingtackleshop.com.au/fishing-kiama-nsw/" },
    ],
    conf: { coords: "med", access: "high", legal: "high", shelter: "med", intel: "high" },
    rules: [
      { when: { swellDir: [140, 230], windDir: [140, 250] }, then: { spear: +1 }, why: "S swell + S wind: north side of Blowhole Point into the harbour is in the lee.", src: "Generic rule applied to site layout" },
    ],
  },
  {
    id: "bass-point-gravel-loader", type: "spear", name: "Bass Point — Gravel Loader", easy: "snorkel",
    region: "Shoalhaven/Illawarra", lat: -34.5920, lon: 150.8856, tide: "A",
    access: { lat: -34.5940, lon: 150.8864, note: "Park at the old boat ramp just past the loader (reserve gate hours apply; if shut, longer walk)." },
    overnight: "Killalea campground (next door, paid).",
    terrain: "North side of Bass Point: continuous rock shelf 2–5 m out to the loader pylons (~150 m long), deeper at the seaward end. The Gutter (further along the point) drops to 20 m.",
    depth: [2, 12],
    sides: [
      { name: "North side (Gravel Loader)", facing: 0, shelterSwell: [[130, 240, 0.9]], shelterWind: [[140, 250, 0.9]] },
    ],
    spear: {
      entry: "Best from the eastern side of the loader by the old boat ramp; take a bearing on the loader and follow the shelf out.",
      unsafeAt: 1.3, kingfish: 2, kingfishNote: "Kings hang off the seaward end of the loader hunting yellowtail (mainly late summer).",
      vis: "Good in southerlies.", species: ["kingfish", "drummer", "trevally", "yellowtail", "bream"],
      river: null,
    },
    hazards: "Boats at the ramp. Grey nurse sharks have lived around the end of the loader since 2016.",
    intel: [
      { text: "Totally protected from southerly winds and seas — even in poor weather it can be dived virtually all the time. Best entry on the eastern side by the old ramp.", src: "Michael McFadyen's Scuba — Bass Point Gravel Loader", url: "https://www.michaelmcfadyenscuba.info/viewpage.php?page_id=132" },
      { text: "The Gutter is protected from southerly winds — even in gale-force southerlies you can dive in comfort (3–20 m).", src: "Michael McFadyen's Scuba — The Gutter", url: "https://www.michaelmcfadyenscuba.info/viewpage.php?page_id=139" },
      { text: "Yellowtail kingfish often hang around the seaward end in late summer.", src: "Illawarra Flame — Snorkel at the Gravel Loader", url: "https://www.theillawarraflame.com.au/sport/snorkel-at-the-gravel-loader" },
    ],
    conf: { coords: "high", access: "high", legal: "high", shelter: "high", intel: "high" },
    rules: [
      { when: { swellDir: [140, 230], windDir: [140, 250] }, then: { spear: +2 }, why: "Local rule: totally protected from southerly winds and seas.", src: "https://www.michaelmcfadyenscuba.info/viewpage.php?page_id=132" },
      { when: { windDir: [0, 60] }, then: { spear: -1.5 }, why: "NE wind blows straight into the north side of Bass Point.", src: "Generic rule applied to site layout" },
    ],
  },

  // ---------------- CENTRAL COAST / NEWCASTLE ----------------
  {
    id: "terrigal-skillion", type: "spear", name: "Terrigal Haven / Skillion", easy: "snorkel",
    region: "Central Coast/Newcastle", lat: -33.4505, lon: 151.4535, tide: "A",
    access: { lat: -33.4475, lon: 151.4500, note: "Terrigal Haven car park (busy, paid at times); steps on the right of the boat ramp." },
    overnight: "Bouddi NP Putty Beach campground; Terrigal/Wamberal holiday parks.",
    terrain: "Haven: sand and seagrass, rocks to the right, boulders to 14 m over the rock wall. Skillion Cave: rock platform north of the Skillion, wall 15–18 m with gorgonias.",
    depth: [3, 18],
    sides: [
      { name: "The Haven", facing: 0, shelterSwell: [[130, 230, 0.8]], shelterWind: [[140, 250, 0.8]] },
      { name: "Skillion Cave (north of the Skillion)", facing: 60, shelterSwell: [[160, 230, 0.6]], shelterWind: [[170, 240, 0.6]] },
    ],
    spear: {
      entry: "Haven: steps right of the boat ramp, follow the rocks out. Skillion Cave: walk the low rock platform, enter where the higher shelf meets the water, exit on the sloping rock ~10 m left; get 30 m out before descending.",
      unsafeAt: 1.0, kingfish: 2, kingfishNote: "Deep reef walls off the Skillion; schools of big kings on Foggy reef offshore (boat).",
      vis: "Moderate–good.", species: ["kingfish", "drummer", "snapper", "morwong", "bream"],
      river: { name: "Terrigal Lagoon", km: 1.2, size: "small" },
    },
    hazards: "Boat ramp traffic. Grey nurse sharks regularly in the Haven.",
    intel: [
      { text: "Terrigal Haven is normally the best place to dive on a southerly wind as it's very protected; over the rock wall, boulders to 14 m.", src: "Dive Swansea — Local shore dives", url: "https://diveswansea.com.au/pages/local-shore-dives" },
      { text: "Skillion Cave is very affected by sea conditions — any swell from the east or north-east crashes right into the entry and exit points.", src: "Michael McFadyen's Scuba — Skillion Cave", url: "https://www.michaelmcfadyenscuba.info/viewpage.php?page_id=745" },
    ],
    conf: { coords: "med", access: "high", legal: "high", shelter: "high", intel: "high" },
    rules: [
      { side: 0, when: { windDir: [150, 240] }, then: { spear: +1 }, why: "Local rule: the Haven is the best spot in a southerly — very protected.", src: "https://diveswansea.com.au/pages/local-shore-dives" },
      { side: 1, when: { swellDir: [30, 120], swellMin: 0.8 }, then: { spearCap: 1 }, why: "Local rule: any E/NE swell crashes into the Skillion entry and exit.", src: "https://www.michaelmcfadyenscuba.info/viewpage.php?page_id=745" },
    ],
  },
  {
    id: "norah-head", type: "spear", name: "Norah Head (Cabbage Tree Bay)", easy: "snorkel",
    region: "Central Coast/Newcastle", lat: -33.2799, lon: 151.5740, tide: "A",
    access: { lat: -33.2810, lon: 151.5735, note: "Cabbage Tree Harbour boat ramp car park; Lighthouse Reserve for the south side." },
    overnight: "Norah Head Holiday Park.",
    terrain: "Cabbage Tree Bay on the north side: sandy bay with a wall reef on the right, 3–9 m. Lighthouse reefs and The Bull (1 km NE, boat) hold big fish.",
    depth: [3, 12],
    sides: [
      { name: "North side (Cabbage Tree Bay)", facing: 20, shelterSwell: [[140, 230, 0.8]], shelterWind: [[140, 250, 0.8]] },
      { name: "South side", facing: 150, shelterSwell: [[0, 60, 0.7]], shelterWind: [[0, 70, 0.7]] },
    ],
    spear: {
      entry: "Cabbage Tree Bay: beach entry left of the boat ramp, follow the wall reef out and back. South side: rock platform, calm days.",
      unsafeAt: 1.2, kingfish: 2, kingfishNote: "Schools of kingfish on The Bull (boat); pelagics pass the head.",
      vis: "Moderate–good; Tuggerah Lake entrance to the south dirties water after rain.", species: ["kingfish", "drummer", "bream", "snapper", "luderick"],
      river: { name: "Tuggerah Lake entrance", km: 6, size: "large" },
    },
    hazards: "Boats launching at the ramp — flag. The ramp gets rough in N/NE winds.",
    intel: [
      { text: "Important shore dive area because it's protected from a southerly swell, with safe entry and exit out of the swell; important for novice and junior divers.", src: "USFA — recommendations, Hawkesbury bioregion", url: "https://usfa.org.au/wp-content/uploads/2018/09/USFA-recommendations-HBRMP.pdf" },
      { text: "Cabbage Tree Bay: beach entry left of the boat ramp, wall reef on the right, 3–9 m, good for beginners; watch for boats.", src: "Dive Swansea — Local shore dives", url: "https://diveswansea.com.au/pages/local-shore-dives" },
      { text: "Schools of kingfish, seapike and trevally at The Bull, ~1 km from the ramp.", src: "Michael McFadyen's Scuba — The Bull, Norah Head", url: "https://www.michaelmcfadyenscuba.info/viewpage.php?page_id=638" },
    ],
    conf: { coords: "med", access: "high", legal: "high", shelter: "high", intel: "high" },
    rules: [
      { side: 0, when: { swellDir: [140, 230] }, then: { spear: +1.5 }, why: "Local rule: protected from southerly swell with safe entry and exit.", src: "https://usfa.org.au/wp-content/uploads/2018/09/USFA-recommendations-HBRMP.pdf" },
      { side: 0, when: { windDir: [0, 70] }, then: { spear: -1 }, why: "Local rule: N/NE wind makes the Cabbage Tree Bay side rough.", src: "https://www.muddypuddlediver.com/local-diving/terrigal/terrigal-reef-dives" },
    ],
  },
  {
    id: "swansea-flagstaff", type: "spear", name: "Swansea Heads — Flagstaff (Moon Island)", easy: "snorkel",
    region: "Central Coast/Newcastle", lat: -33.0874, lon: 151.6681, tide: "A",
    access: { lat: -33.0883, lon: 151.6618, note: "Park at Reids Reserve, Swansea Heads; 20 m walk to the water." },
    overnight: "Caves Beach / Swansea holiday parks.",
    terrain: "Shallow bay (5–8 m) sheltered by Moon Island; walls, boulders and caves out around the island.",
    depth: [3, 10],
    sides: [
      { name: "Flagstaff bay (lee of Moon Island)", facing: 80, shelterSwell: [[30, 130, 0.7]], shelterWind: [[330, 100, 0.4]] },
    ],
    spear: {
      entry: "From the sandy beach in the bay or the rocks just south of it.",
      unsafeAt: 1.2, kingfish: 2, kingfishNote: "Kings and salmon pass the bay; kingfish and pelagics common around Moon Island.",
      vis: "Variable; Lake Macquarie outflow next door on the run-out tide.", species: ["kingfish", "salmon", "bream", "drummer", "rays"],
      river: { name: "Lake Macquarie entrance", km: 0.8, size: "large" },
    },
    hazards: "Swansea Channel boat traffic and tidal current next door. Grey nurse sharks in winter.",
    intel: [
      { text: "Newcastle spearos head out from Reids Reserve off Swansea Heads, and around the channel opening between Moon Island and the mainland.", src: "Reddit r/newcastle + r/Spearfishing", url: "https://www.google.com/search?q=site%3Areddit.com+%22where+can+i+spear+fish+around+newy%22" },
      { text: "Flagstaff (5–8 m) is generally protected by Moon Island unless winds are from the south-east; kingfish and salmon among the fish seen.", src: "Dive Swansea — Local shore dives", url: "https://diveswansea.com.au/pages/local-shore-dives" },
      { text: "Moon Island: kingfish and other pelagics visit; Caves Beach just south is highly popular for spearfishing.", src: "Dive Swansea / greynurse.com.au", url: "https://diveswansea.com.au/blogs/news/flag-staff-dive-site-at-swansea-heads-diving-with-the-sharks" },
    ],
    conf: { coords: "low", access: "high", legal: "high", shelter: "med", intel: "high" },
    rules: [
      { when: { windDir: [110, 160] }, then: { spear: -1.5 }, why: "Local rule: protected by Moon Island unless the wind is from the south-east.", src: "https://diveswansea.com.au/pages/local-shore-dives" },
      { when: { tide: "falling" }, then: { spear: -0.5 }, why: "Run-out tide brings Lake Macquarie water past the bay.", src: "Generic estuary rule" },
    ],
  },

  // ---------------- PORT STEPHENS / GREAT LAKES ----------------
  {
    id: "boat-harbour-ps", type: "spear", name: "Boat Harbour (Port Stephens)", easy: "snorkel",
    region: "Port Stephens/Great Lakes", lat: -32.7895, lon: 152.1158, tide: "A",
    access: { lat: -32.7880, lon: 152.1140, note: "Gan Gan Rd → Blanch St to the end (small 'Boat Harbour' sign); gully from the car park to the water." },
    overnight: "One Mile Beach Holiday Park (next bay).",
    terrain: "Small rocky bay; reef to a sand edge at ~13 m with a gully running to 15 m.",
    depth: [3, 15],
    sides: [
      { name: "Boat Harbour bay", facing: 150, shelterSwell: [[0, 70, 0.7]], shelterWind: [[340, 80, 0.8]] },
    ],
    spear: {
      entry: "Enter on the right side of the gully at the car park; come back along the north-western side of the bay.",
      unsafeAt: 1.1, kingfish: 1, kingfishNote: "Mostly reef fish; kings more likely around Broughton Island (boat).",
      vis: "Good on his dive.", species: ["luderick", "bream", "drummer", "eagle rays"],
      river: null,
    },
    hazards: "Open bay — check the gully in any swell.",
    intel: [
      { text: "Port Stephens is the pick for water clarity near Newcastle; Boat Harbour is the usual shore-dive recommendation. Kings shot in Port Stephens in spring.", src: "Reddit r/newcastle, r/FishingAustralia, r/Spearfishing", url: "https://www.google.com/search?q=site%3Areddit.com+%22where+can+i+spear+fish+around+newy%22" },
      { text: "Shore diving in the open ocean around Port Stephens is very limited — Fingal Bay is too shallow; Boat Harbour is one of the few good options (13–15 m, good vis).", src: "Michael McFadyen's Scuba — Boat Harbour", url: "https://www.michaelmcfadyenscuba.info/viewpage.php?page_id=166" },
      { text: "Boat Harbour is a local spearfishing spot for bream and lobster in winter.", src: "News of the Area — Port Stephens spearfishing", url: "https://newsofthearea.com.au/?p=16053" },
    ],
    conf: { coords: "high", access: "high", legal: "high", shelter: "low", intel: "high" },
    rules: [],
  },
  {
    id: "bennetts-head", type: "spear", name: "Bennetts Head (Forster)", easy: "snorkel",
    region: "Port Stephens/Great Lakes", lat: -32.1850, lon: 152.5400, tide: "A",
    access: { lat: -32.1842, lon: 152.5366, note: "Bennetts Head Reserve car park; Pebbly Beach car park for the north side." },
    overnight: "Forster holiday parks; Booti Booti NP — The Ruins campground.",
    terrain: "Headland between Forster main beach/Pebbly Beach (north) and One Mile Beach (south); ledges and gutters. Hayden's Rock reef (5–8 m) off Pebbly.",
    depth: [3, 18],
    sides: [
      { name: "North side (Pebbly / The Tanks)", facing: 20, shelterSwell: [[150, 230, 0.8]], shelterWind: [[150, 250, 0.8]] },
      { name: "South-east side", facing: 130, shelterSwell: [[340, 50, 0.6]], shelterWind: [[340, 50, 0.6]] },
    ],
    spear: {
      entry: "Rock entries between Pebbly Beach, The Tanks and Bennetts Head; scramble over rocks to snorkel out to Hayden's Rock at low tide.",
      unsafeAt: 1.2, kingfish: 2, kingfishNote: "Local dive shop lists yellowtail kingfish and cobia from the rocks (best Feb–Apr); bait schools off the head.",
      vis: "Often very good; Wallis Lake outflow (past the breakwall) on run-out tide.", species: ["kingfish", "snapper", "drummer", "bream", "bonito"],
      river: { name: "Wallis Lake entrance", km: 1.5, size: "large" },
    },
    hazards: "Surge on platforms. Grey nurse sharks are common here.",
    intel: [
      { text: "Snorkelling around the rocks between Main Beach and Pebbly, The Tanks and Bennetts Head; Hayden's Rock (5–8 m) lies directly north off Pebbly Beach.", src: "Dive Forster — Hayden's Rock / visitor reviews", url: "https://www.diveforster.com.au/haydens-rock62ef2946" },
      { text: "Rock species include yellowtail kingfish and cobia; kingfish season Feb–Apr.", src: "Dive Forster — Spearfishing", url: "https://www.diveforster.com.au/spearfishing-services" },
    ],
    conf: { coords: "med", access: "med", legal: "high", shelter: "med", intel: "med" },
    rules: [
      { when: { tide: "falling" }, then: { spear: -0.5 }, why: "Run-out tide can carry Wallis Lake water around to the north side.", src: "Generic estuary rule" },
    ],
  },
  {
    id: "seal-rocks-sugarloaf", type: "spear", name: "Sugarloaf Point (Seal Rocks)",
    region: "Port Stephens/Great Lakes", lat: -32.4420, lon: 152.5410, tide: "A",
    access: { lat: -32.4410, lon: 152.5391, note: "Lighthouse walk from Kinka Rd car park." },
    overnight: "Seal Rocks Holiday Park; Treachery Camp.",
    terrain: "Big exposed lighthouse point; Number One Beach bay on the north side; Saw Tooth rocks off the lighthouse.",
    depth: [3, 20],
    sides: [
      { name: "North side (Number One Beach rocks)", facing: 20, shelterSwell: [[140, 230, 0.8]], shelterWind: [[140, 250, 0.8]] },
      { name: "South side (Lighthouse Beach end)", facing: 170, shelterSwell: [[0, 70, 0.7]], shelterWind: [[0, 70, 0.7]] },
    ],
    spear: {
      entry: "North side rock entries from the Number One Beach end (stay >20 m from the beach). The point itself = serious currents.",
      unsafeAt: 1.0, kingfish: 3, kingfishNote: "Schools of 15–20 kings patrol the outside of Saw Tooth (off the lighthouse) on the 20 m sand.",
      vis: "Often excellent outside; dirty inside Saw Tooth on rough days.", species: ["kingfish", "snapper", "drummer", "bonito", "jewfish"],
      river: null,
    },
    hazards: "Strong current from the north through the Saw Tooth gaps.",
    intel: [
      { text: "A kingfish shot in close at Boat Beach, Seal Rocks (r/Spearfishing photo thread) \u2014 Boat Beach side is worth a look in southerlies.", src: "Reddit r/Spearfishing \u2014 Best fish I've ever had", url: "https://www.google.com/search?q=site%3Areddit.com+%22Boat+Beach+at+Seal+Rocks%22" },
      { text: "Saw Tooth: a row of rocks off the lighthouse with cliffs and current; kings patrol the 20 m sandy bottom and a school sat on the outside ridge. Strong current from the north through the gaps (boat-dived).", src: "Ultimate Spearfishing — I loathe getting up early", url: "https://ultimatespearfishing.com/i-loathe-getting-up-early/" },
      { text: "Lighthouse Beach's north end is the calmer part; the beach is open to the south.", src: "Seal Rocks visitor guides", url: "https://www.nsw.gov.au/visiting-and-exploring-nsw/locations-and-attractions/lighthouse-beach-seal-rocks" },
    ],
    conf: { coords: "med", access: "med", legal: "med", shelter: "med", intel: "med" },
    rules: [],
  },

  // ---------------- MID NORTH COAST ----------------
  {
    id: "crowdy-head", type: "spear", name: "Crowdy Head",
    region: "Mid North Coast", lat: -31.8395, lon: 152.7550, tide: "A",
    access: { lat: -31.8400, lon: 152.7500, note: "Crowdy Head lighthouse / harbour car parks." },
    overnight: "Crowdy Bay NP campgrounds (Diamond Head, Kylies Beach).",
    terrain: "Headland with boat harbour on the north side; reef drops to sand quickly (typical of the north coast).",
    depth: [3, 12],
    sides: [
      { name: "North side (harbour)", facing: 10, shelterSwell: [[140, 230, 0.8]], shelterWind: [[140, 250, 0.8]] },
      { name: "South-east side", facing: 140, shelterSwell: [[340, 60, 0.6]], shelterWind: [[340, 60, 0.6]] },
    ],
    spear: {
      entry: "Rock entries either side of the harbour wall area; stay clear of the harbour entrance.",
      unsafeAt: 1.2, kingfish: 1, kingfishNote: "Rock fishing here is mostly tailor and jewfish; kings are on the offshore reefs.",
      vis: "Moderate; Manning River (Harrington, 10 km south) after rain.", species: ["jewfish", "drummer", "bream", "tailor"],
      river: { name: "Manning River (Harrington)", km: 10, size: "large" },
    },
    hazards: "Harbour boat traffic.",
    intel: [
      { text: "Rock fishing is mostly tailor and mulloway; kingfish reports come from offshore reefs.", src: "Port News — What's biting, SWR to Crowdy Head", url: "https://www.portnews.com.au/story/8659858/whats-biting-fishing-action-from-south-west-rocks-to-crowdy-head/" },
      { text: "On the North Coast the reef usually drops to sand only a few metres off the rocks — few good shore dives.", src: "Michael McFadyen's Scuba — Ladies Reef / Kiama Point", url: "https://www.michaelmcfadyenscuba.info/viewpage.php?page_id=643" },
    ],
    conf: { coords: "med", access: "med", legal: "high", shelter: "med", intel: "med" },
    rules: [
      { when: {}, then: { spear: -0.5 }, why: "Local rule: little reef close to shore on this part of the coast.", src: "https://www.michaelmcfadyenscuba.info/viewpage.php?page_id=643" },
    ],
  },
  {
    id: "tacking-point", type: "spear", name: "Tacking Point (Port Macquarie)",
    region: "Mid North Coast", lat: -31.4755, lon: 152.9395, tide: "A",
    access: { lat: -31.4759, lon: 152.9370, note: "Tacking Point lighthouse car park, Lighthouse Rd." },
    overnight: "Port Macquarie holiday parks.",
    terrain: "Lighthouse headland; the good reef (2 km long) is ~500 m off the light, the Pinnacles 11–28 m — both really boat dives.",
    depth: [3, 12],
    sides: [
      { name: "North side", facing: 40, shelterSwell: [[150, 230, 0.7]], shelterWind: [[150, 250, 0.7]] },
      { name: "South side", facing: 150, shelterSwell: [[0, 60, 0.7]], shelterWind: [[0, 70, 0.7]] },
    ],
    spear: {
      entry: "Rock platform entries; steep walk down from the lighthouse.",
      unsafeAt: 1.2, kingfish: 1, kingfishNote: "Kings are on the wider grounds (60–80 m) and the reef 500 m out — rarely in range from shore.",
      vis: "Moderate; Camden Haven and Hastings rivers affect it after rain.", species: ["drummer", "bream", "snapper", "tailor"],
      river: { name: "Hastings River", km: 6, size: "large" },
    },
    hazards: "Platform surge. Steep access.",
    intel: [
      { text: "Reef directly off the Tacking Point light is ~500 m offshore and 2 km long; needs calm weather. Camden River water affects visibility after heavy rain.", src: "Marine Life Network — Port Macquarie", url: "https://marinelife.org.au/?page_id=1480" },
      { text: "Kingfish caught on the lighthouse wide grounds in 60–80 m (boat).", src: "Port News", url: "https://www.portnews.com.au/story/8285248/whats-biting-winter-snapper-season-in-full-swing-july-27/?cs=258" },
    ],
    conf: { coords: "med", access: "med", legal: "high", shelter: "med", intel: "med" },
    rules: [
      { when: {}, then: { spear: -1 }, why: "Local rule: the good reef is ~500 m out — little to spear from the rocks.", src: "https://marinelife.org.au/?page_id=1480" },
    ],
  },
  {
    id: "swr-ladies-reef", type: "spear", name: "South West Rocks — Ladies Reef", easy: "snorkel",
    region: "Mid North Coast", lat: -30.8803, lon: 153.0428, tide: "A",
    access: { lat: -30.8829, lon: 153.0441, note: "Car park next to South West Rocks Surf Club, or the headland car park east of Horseshoe Bay." },
    overnight: "Trial Bay Gaol campground (NPWS); SWR holiday parks.",
    terrain: "Small round reef (~10 m) a short swim off the main headland in front of town.",
    depth: [3, 10],
    sides: [
      { name: "Off the main headland", facing: 10, shelterSwell: [[120, 240, 0.9]], shelterWind: [[130, 250, 0.9]] },
    ],
    spear: {
      entry: "Walk to the small beach immediately east of the headland and swim out to the reef.",
      unsafeAt: 1.2, kingfish: 1, kingfishNote: "Reef fish mainly; pelagics more likely at Green Island/Fish Rock (boat).",
      vis: "Usually good in southerly weather; Macleay River after rain.", species: ["bream", "drummer", "trevally", "luderick"],
      river: { name: "Macleay River", km: 2, size: "large" },
    },
    hazards: "Busy summer beach — stay well off swimmers.",
    intel: [
      { text: "Perfect in southerly winds and seas as it is totally protected from them; one of the few decent shore dives on the North Coast.", src: "Michael McFadyen's Scuba — Ladies Reef", url: "https://www.michaelmcfadyenscuba.info/viewpage.php?page_id=643" },
      { text: "Usually sheltered from the weather and not prone to currents — a popular night dive.", src: "Fish Rock Dive Centre — dive sites", url: "https://www.fishrock.com.au/dive-sites" },
    ],
    conf: { coords: "med", access: "high", legal: "high", shelter: "high", intel: "high" },
    rules: [
      { when: { swellDir: [130, 230], windDir: [130, 250] }, then: { spear: +1.5 }, why: "Local rule: totally protected from southerly winds and seas.", src: "https://www.michaelmcfadyenscuba.info/viewpage.php?page_id=643" },
      { when: { windDir: [330, 60] }, then: { spear: -1.5 }, why: "N–NE wind blows straight in.", src: "Generic rule applied to site layout" },
    ],
  },
  {
    id: "trial-bay-gaol", type: "spear", name: "Trial Bay Gaol — Bait Reef (South West Rocks)", easy: "snorkel",
    region: "Mid North Coast", lat: -30.8753, lon: 153.0692, tide: "A",
    access: { lat: -30.8770, lon: 153.0690, note: "Drive round through the gaol camping area; park near the north-western corner (NPWS entry fee)." },
    overnight: "Trial Bay Gaol campground (NPWS, on site).",
    terrain: "North-facing shore below the gaol: Bait Reef (two tennis courts, parallel to shore), Gaol Reef 6–12 m, Turtle Wall from the caravan park.",
    depth: [3, 12],
    sides: [
      { name: "North side (Trial Bay)", facing: 0, shelterSwell: [[120, 240, 0.9]], shelterWind: [[130, 250, 0.9]] },
    ],
    spear: {
      entry: "Off the very large sloping rock in line with the western end of the gaol; Bait Reef is straight out.",
      unsafeAt: 1.3, kingfish: 2, kingfishNote: "The odd kingfish taken off the ledges from the gaol to the lighthouse; Green Island and Fish Rock nearby hold pelagics.",
      vis: "Normally quite good when the seas are from the south; Macleay River (west end of bay) after rain.", species: ["kingfish", "snapper", "drummer", "trevally", "luderick"],
      river: { name: "Macleay River", km: 5, size: "large" },
    },
    hazards: "Boats anchoring in Trial Bay.",
    intel: [
      { text: "Travelling spearos: \"South West Rocks (just off the Gaol)\" is one of the go-to NSW stops.", src: "Reddit r/Spearfishing", url: "https://www.google.com/search?q=site%3Areddit.com+%22South+West+Rocks+%28just+off+the+Gaol%29%22" },
      { text: "Shore dive from the big sloping rock at the western end of the gaol to Bait Reef; visibility is normally quite good when the seas are from the south.", src: "Michael McFadyen's Scuba — Bait Reef", url: "https://www.michaelmcfadyenscuba.info/viewpage.php?page_id=211" },
      { text: "Tailor, luderick, a few drummer and the odd kingfish off the ledges from the Gaol down to the lighthouse.", src: "Fishing Monthly — South West Rocks report", url: "https://fishingmonthly.com.au/south-west-rocks-report/" },
      { text: "If the swell is from the south you may still dive or snorkel off the boat ramp near the gaol.", src: "SWR dive operators", url: "https://swrdive.com.au/pages/dive-sites" },
    ],
    conf: { coords: "med", access: "high", legal: "high", shelter: "high", intel: "high" },
    rules: [
      { when: { swellDir: [130, 230], windDir: [130, 250] }, then: { spear: +1.5 }, why: "Local rule: Trial Bay is fully in the lee and visibility is good in southerly seas.", src: "https://www.michaelmcfadyenscuba.info/viewpage.php?page_id=211" },
      { when: { windDir: [330, 60] }, then: { spear: -1.5 }, why: "N–NE wind blows straight into Trial Bay.", src: "Generic rule applied to site layout" },
    ],
  },

  // ---------------- COFFS COAST ----------------
  {
    id: "sawtell-headland", type: "spear", name: "Sawtell Headland",
    region: "Coffs Coast", lat: -30.3770, lon: 153.1060, tide: "A",
    access: { lat: -30.3766, lon: 153.1038, note: "Sawtell Headland reserve car park, Boronia St." },
    overnight: "Sawtell Beach Holiday Park.",
    terrain: "Headland; rocky reef north and south that drops to sand quickly. Bonville Creek mouth to the south.",
    depth: [3, 10],
    sides: [
      { name: "North side", facing: 20, shelterSwell: [[150, 230, 0.7]], shelterWind: [[150, 250, 0.7]] },
      { name: "South side", facing: 150, shelterSwell: [[0, 60, 0.7]], shelterWind: [[0, 70, 0.7]] },
    ],
    spear: {
      entry: "Rock entries off the headland; stay >20 m from the beaches either side.",
      unsafeAt: 1.2, kingfish: 1, kingfishNote: "Shallow headland; kings more likely on Sawtell Shoal (boat).",
      vis: "Suffers after heavy rain (Bonville and Boambee creeks).", species: ["drummer", "bream", "luderick", "tarwhine"],
      river: { name: "Bonville Creek", km: 1, size: "small" },
    },
    hazards: "Platform surge.",
    intel: [
      { text: "Shore spearing around Coffs can be productive but also cold, dirty, rough and hard work — getting diveable visibility is the hard part.", src: "Adreno — NSW spearfishing sites", url: "https://adreno.com.au/pages/nsw_new_south_wales_spearfishing_dive_sites" },
      { text: "Reef off Sawtell headland suffers poor visibility after heavy rain.", src: "Marine Life Network — Coffs Harbour", url: "https://marinelife.org.au/?page_id=1477" },
    ],
    conf: { coords: "med", access: "med", legal: "high", shelter: "med", intel: "med" },
    rules: [
      { when: {}, then: { spear: -1 }, why: "Local rule: little shore reef and often dirty water on the Coffs coast.", src: "https://adreno.com.au/pages/nsw_new_south_wales_spearfishing_dive_sites" },
    ],
  },
  {
    id: "woolgoolga-headland", type: "spear", name: "Woolgoolga Headland (just N of Coffs)",
    region: "Coffs Coast", lat: -30.1110, lon: 153.2140, tide: "A",
    access: { lat: -30.1109, lon: 153.2112, note: "Woolgoolga Headland car park, Ocean St." },
    overnight: "Woolgoolga Beach Holiday Park.",
    terrain: "Headland in Solitary Islands Marine Park; reef both sides.",
    depth: [3, 12],
    sides: [
      { name: "North side (Back Beach end)", facing: 20, shelterSwell: [[150, 230, 0.7]], shelterWind: [[150, 250, 0.7]] },
      { name: "South side (main beach end)", facing: 140, shelterSwell: [[0, 60, 0.7]], shelterWind: [[0, 70, 0.7]] },
    ],
    spear: {
      entry: "Rock entries off the headland.",
      unsafeAt: 1.2, kingfish: 1, kingfishNote: "Subtropical/temperate mix; pelagics mainly offshore round the islands.",
      vis: "Better when the warm current pushes in; poor after rain.", species: ["snapper", "trevally", "drummer", "luderick", "tropical species"],
      river: { name: "Woolgoolga Creek", km: 1, size: "small" },
    },
    hazards: "Platform surge.",
    intel: [
      { text: "While there are shore dives on the Coffs Coast, most divers prefer to go offshore to the islands.", src: "Coffs Coast — In, on and around the water", url: "https://www.coffscoast.com.au/article/adventures-in-on-and-around-the-water/" },
      { text: "Coffs/Wooli shore spearing: productive but cold, dirty, rough and hard work.", src: "Adreno — NSW spearfishing sites", url: "https://adreno.com.au/pages/nsw_new_south_wales_spearfishing_dive_sites" },
    ],
    conf: { coords: "med", access: "med", legal: "high", shelter: "med", intel: "med" },
    rules: [
      { when: {}, then: { spear: -0.5 }, why: "Local rule: most of the good diving here is offshore.", src: "https://www.coffscoast.com.au/article/adventures-in-on-and-around-the-water/" },
    ],
  },
  // ---------------- Research round 3 (8 Oct 2026): Google/Reddit/Facebook snippets ----------------
  {
    id: "maloneys-bay", type: "spear", name: "Bass Point — Maloneys Bay (south side)",
    region: "Shoalhaven/Illawarra", lat: -34.6005, lon: 150.8885, tide: "A",
    access: { lat: -34.5972, lon: 150.8876, note: "Maloney's Bay car park, Bass Point Reserve (gate hours apply)." },
    overnight: "Killalea campground (next door, paid).",
    terrain: "Rocky bay on the southern flank of Bass Point; mixed reef, sheltered from northerlies. Complements the Gravel Loader (north side).",
    depth: [2, 12],
    sides: [
      { name: "Maloneys Bay", facing: 160, shelterSwell: [[340, 80, 0.85]], shelterWind: [[330, 80, 0.9]] },
    ],
    spear: {
      entry: "From the rocks either side of the bay; easiest a couple of hours either side of low with small swell.",
      unsafeAt: 1.0, kingfish: 1, kingfishNote: "Mainly a reef-fish spot; pelagics pass the point.",
      vis: "Rain-affected; good in NE weather.", species: ["drummer", "bream", "luderick", "trevally", "kingfish"],
      river: null,
    },
    hazards: "Exposed to S–SE swell. Boat traffic from the new Shell Cove marina.",
    intel: [
      { text: "Sits outside the Bushrangers Bay Aquatic Reserve, so spearfishing is allowed; sheltered site used by divers of all levels.", src: "Vizzbud — Maloneys, Shellharbour", url: "https://www.google.com/search?q=vizzbud+Maloneys+Shellharbour+dive+site" },
      { text: "Local spearos send newcomers to \"maloney's bay at bass point or storm bay in kiama\"; Illawarra spearo group rates it good with hand spears.", src: "Reddit r/Spearfishing — Picton based; Facebook Spearfishing the Illawarra", url: "https://www.google.com/search?q=site%3Areddit.com+%22maloney%27s+bay+at+bass+point%22" },
      { text: "Brendan Schmidt — \"Spearing around Maloneys Bay\" video.", src: "YouTube — Brendan Schmidt Spearfishing", url: "https://www.youtube.com/results?search_query=Spearing+Around+Maloneys+Bay" },
    ],
    conf: { coords: "med", access: "high", legal: "high", shelter: "med", intel: "med" },
    rules: [
      { when: { windDir: [0, 70] }, then: { spear: +1 }, why: "South side of Bass Point is in the lee of NE winds — the opposite of the Gravel Loader.", src: "Generic rule applied to site layout" },
      { when: { swellDir: [140, 220] }, then: { spear: -1.5 }, why: "Maloneys faces straight into S–SE swell.", src: "Generic rule applied to site layout" },
    ],
  },
  {
    id: "redhead-point", type: "spear", name: "Redhead Point (Newcastle)",
    region: "Central Coast/Newcastle", lat: -33.0150, lon: 151.7290, tide: "A",
    access: { lat: -33.0160, lon: 151.7240, note: "Redhead Beach SLSC car park; walk to the north end and onto the point rocks." },
    overnight: "Belmont / Swansea holiday parks.",
    terrain: "Rocky headland with sand, bommies and weed off the point; Dudley headlands to the north.",
    depth: [3, 15],
    sides: [
      { name: "North side", facing: 50, shelterSwell: [[150, 220, 0.8]], shelterWind: [[150, 240, 0.8]] },
      { name: "South side", facing: 140, shelterSwell: [[0, 60, 0.8]], shelterWind: [[350, 70, 0.8]] },
    ],
    spear: {
      entry: "Rock entry off the point; pick the side away from the swell and wind.",
      unsafeAt: 1.0, kingfish: 1, kingfishNote: "Occasional kings around the headlands; mostly reef fish.",
      vis: "Variable — Port Stephens is clearer; Lake Macquarie outflow after rain.", species: ["drummer", "luderick", "bream", "trevally", "kingfish"],
      river: { name: "Lake Macquarie (Swansea Channel)", km: 6, size: "big" },
    },
    hazards: "Open coast — washes in any real swell.",
    intel: [
      { text: "Newcastle spearos: \"Redhead headlands are good, same as Swansea heads/around Moon Island\"; \"Redhead and Dudley points are good too\"; \"seen guys doing it at Redhead\".", src: "Reddit r/newcastle + r/Spearfishing", url: "https://www.google.com/search?q=site%3Areddit.com+%22Redhead+and+Dudley+points+are+good+too%22" },
    ],
    conf: { coords: "med", access: "med", legal: "high", shelter: "med", intel: "med" },
    rules: [],
  },
  {
    id: "hat-head", type: "spear", name: "Hat Head (the point / Connors)",
    region: "Mid North Coast", lat: -31.0535, lon: 153.0650, tide: "A",
    access: { lat: -31.0545, lon: 153.0560, note: "Hat Head village; walk out to the headland, or to Connors Beach (south side)." },
    overnight: "Hat Head Holiday Park; Hat Head NP (Hungry Gate campground).",
    terrain: "Big rocky headland in Hat Head NP; north side sheltered from southerlies, Connors Beach side sheltered from nor'easters.",
    depth: [3, 15],
    sides: [
      { name: "North side", facing: 20, shelterSwell: [[140, 220, 0.85]], shelterWind: [[140, 240, 0.9]] },
      { name: "South side (Connors)", facing: 150, shelterSwell: [[0, 60, 0.85]], shelterWind: [[350, 70, 0.9]] },
    ],
    spear: {
      entry: "Rock entries off the headland; Connors Beach north end for an easier reef swim.",
      unsafeAt: 1.0, kingfish: 2, kingfishNote: "The point on a good day for pelagics.",
      vis: "Often good; Korogoro Creek (north) after rain.", species: ["kingfish", "luderick", "drummer", "snapper", "mulloway"],
      river: { name: "Korogoro Creek", km: 1, size: "small" },
    },
    hazards: "Sharks (local warning). Remote-ish national park headland.",
    intel: [
      { text: "\"Hat Head Connors Beach north for luderick and drummer. The point on a good day for pelagics. Mind the sharks.\"", src: "Facebook — NSW & QLD Spearfishing group (Port Macquarie & SWR spots thread)", url: "https://www.google.com/search?q=%22Hat+head+Connors+beach+north+for+luderick+and+drummer%22" },
      { text: "Brendan Schmidt — \"Spearfishing & camping at Hat Head\" (Sept 2024).", src: "YouTube — Brendan Schmidt Spearfishing", url: "https://www.youtube.com/results?search_query=SPEARFISHING+CAMPING+HAT+HEAD+Brendan+Schmidt" },
    ],
    conf: { coords: "med", access: "med", legal: "high", shelter: "med", intel: "med" },
    rules: [],
  },
];

// BOM observation stations (IDN60801.<id>) and MHL wave buoys used for live cross-checks.
export const BOM_STATIONS = [
  { id: "95929", name: "Merimbula", lat: -36.91, lon: 149.90 },
  { id: "95935", name: "Narooma", lat: -36.22, lon: 150.13 },
  { id: "94939", name: "Montague Island", lat: -36.25, lon: 150.23 },
  { id: "95937", name: "Moruya Airport", lat: -35.90, lon: 150.14 },
  { id: "94941", name: "Batemans Bay", lat: -35.72, lon: 150.19 },
  { id: "94938", name: "Ulladulla", lat: -35.36, lon: 150.48 },
  { id: "95940", name: "Point Perpendicular", lat: -35.09, lon: 150.80 },
  { id: "95749", name: "Kiama", lat: -34.67, lon: 150.86 },
  { id: "95748", name: "Albion Park", lat: -34.56, lon: 150.79 },
  { id: "94782", name: "Gosford", lat: -33.44, lon: 151.36 },
  { id: "95770", name: "Norah Head", lat: -33.28, lon: 151.58 },
  { id: "94774", name: "Newcastle Nobbys", lat: -32.92, lon: 151.80 },
  { id: "94776", name: "Williamtown", lat: -32.80, lon: 151.84 },
  { id: "95784", name: "Taree Airport", lat: -31.89, lon: 152.51 },
  { id: "94799", name: "Port Macquarie Airport", lat: -31.44, lon: 152.86 },
  { id: "94785", name: "Kempsey Airport", lat: -31.07, lon: 152.77 },
  { id: "95729", name: "Coffs Harbour Airport", lat: -30.32, lon: 153.12 },
];

export const BUOYS = [
  { id: "EDENOW", name: "Eden", lat: -37.358, lon: 150.198 },
  { id: "BATBOW", name: "Batemans Bay", lat: -35.703, lon: 150.344 },
  { id: "PTKMOW", name: "Port Kembla", lat: -34.472, lon: 151.022 },
  { id: "SYDDOW", name: "Sydney", lat: -33.769, lon: 151.412 },
  { id: "CRHDOW", name: "Crowdy Head", lat: -31.825, lon: 152.860 },
  { id: "COFHOW", name: "Coffs Harbour", lat: -30.373, lon: 153.259 },
];
