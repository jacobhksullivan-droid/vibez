# Seb & Jacob's Epic Camper Adventure

A phone app that says where and when to **surf** and **spearfish** on the NSW coast (Merimbula → Coffs Harbour), 21–31 October 2026.

Live at **https://seb-jacob-epic-camper.netlify.app** (passcode in `tools/passcode.txt`).

## What it does

- **Home** – best surf and spear spot right now and in the next 24 hours, with drive times, plus live wave-buoy readings.
- **Map** – satellite map, every spot coloured by score for the day and time you pick. Red areas are no-take zones.
- **Outlook** – best score per region for the next ~10 days, and a "south first or north first?" call.
- **List** – every spot ranked.
- **Spot details** – one-line reason, five time windows, swell/wind/tide graphs, "Why this score?" breakdown, entry notes, local rules and sources.

Works offline from the last download. Forecasts refresh hourly.

## Where the numbers come from (all free)

| What | Source |
|---|---|
| Wind, rain, temperature | Open-Meteo, ECMWF model |
| Swell (height, period, direction, 2 swell trains), sea temperature | Open-Meteo Marine |
| Live buoys | Manly Hydraulics Laboratory (Eden, Batemans Bay, Port Kembla, Sydney, Crowdy Head, Coffs) |
| Tides | Hardcoded BOM predictions in `data/tides.js` (21–31 Oct only) |
| Drive times | OSRM public router, +15% for the campervan |
| Town search | Photon (OpenStreetMap) |
| No-take zones | Official NSW marine park + aquatic reserve boundaries, grey nurse sites (`data/zones.geojson`) |
| Map | Esri satellite imagery / OpenStreetMap |

## Adding or changing a spot

All spots live in **`data/spots.js`**. Each spot is one block `{ ... }`. Copy a similar spot and change it.

Directions are compass degrees (0 = N, 90 = E, 180 = S, 270 = W). Swell and wind directions are where they come **from**. Ranges go clockwise: `[150, 230]` = SSE round to SW. `[270, 60]` wraps past north.

Key fields:

- `type`: `"surf"` or `"spear"`.
- `lat`, `lon`: the pin, **in the water**. `access`: where you park.
- `facing`: the direction the water in front of you looks toward.
- `shelterSwell` / `shelterWind`: extra shelter from land, as `[from, to, amount]` (amount 1 = fully blocked).
- Surf: `surf.swellDir`, `surf.offshore`, `surf.size` (ft), `surf.maxSize`, `surf.tide` (`"low"`, `"mid"`, `"high"`).
- Spear: `sides` (headlands get one entry per side; the app scores each and picks the best), `depth`, `spear.unsafeAt` (metres of swell reaching the spot that makes the entry an automatic NO), `spear.kingfish` (0–3), `spear.river` (runoff source).
- `intel`: notes with a source link. `conf`: how sure we are (`high`/`med`/`low`).

## Local rules

Rules let local knowledge override the generic scoring. They sit in each spot's `rules: [ ... ]`:

```js
{ when: { swellDir: [140, 230], windDir: [140, 250] },
  then: { spear: +2 },
  why: "Local rule: totally protected from southerly winds and seas.",
  src: "https://link-to-where-you-read-it" }
```

`when` can use any of:

- `swellDir: [a, b]`, `swellMin`, `swellMax` (open-ocean wave height in **metres**), `periodMin`, `periodMax` (seconds)
- `windDir: [a, b]`, `windMax` (knots)
- `tide: "rising" | "falling" | "high" | "low" | "mid"`
- `hours: [start, end]`
- an empty `when: {}` = always applies

`then` can use `spear: +/-number`, `surf: +/-number`, `spearCap: n`, `surfCap: n` (score can't go above n).

Add `side: 0` (or 1…) to a spear rule to apply it to only one side of a headland.

If `src` is a web link or `why` starts with "Local", the app labels it **local rule**; otherwise it's a site rule.

## Adjusting the scoring

Open **`src/score.js`**. At the top:

- `WEIGHTS.spear` – points for shelter (biggest), energy at the spot, rain, recent trend, tide, kingfish. They add up to 10.
- `WEIGHTS.surf` – points for size, period, wind, swell direction, tide.
- `LIMITS` – thresholds, e.g. `rainBad` (mm in 72 h that wipes out the rain points), `calmSpot` (swell at the spot that uses up the energy points), `shortPeriod` / `shortPeriodCap` (mushy wind swell cap).

Change a number, save, reload the preview, and check the "Why X?" breakdown on a few spots.

## Publishing changes

From this folder on the Mac:

```bash
python3 tools/build_site.py
```

```bash
PATH="$HOME/.local/node/node-v24.21.0-darwin-arm64/bin:$PATH" netlify deploy --prod --no-build --dir deploy/epic-camper --site 6cfacfc8-e847-4e55-8528-64e5068519a4
```

The build encrypts the spot list and tide tables with the passcode in `tools/passcode.txt`. To change the passcode, edit that file, rebuild and deploy; each phone will ask for the new one once.

## Local preview

`python3 tools/devserver.py` then open http://localhost:8765 (no passcode locally; add `?gate` to test the passcode screen).

The spot review page is rebuilt with `python3 tools/build_review.py`.

*Decision support only. Check conditions yourself. Always dive one-up-one-down.*
