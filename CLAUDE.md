# Seb & Jacob's Epic Camper Adventure — project instructions

**Read `docs/HANDOFF.md` first** — it has the full history of the first build session (decisions, user preferences, what's done, what's next). The original brief is `docs/original-brief.md`. How the code works for humans: `README.md`.

## Who you're working with
- Jacob (the user) and his mate Seb. Jacob is **not a developer**: keep steps simple, tell him exactly what to click/paste, do the technical work yourself.
- He's blunt and short on time. Act, don't over-explain. Keep replies short and plain.
- Use they/them for anyone whose pronouns aren't stated.

## Hard rules from Jacob (do not break)
- **Legal zones: inside-only.** A spear spot is only flagged if its pin is INSIDE a no-take zone (sanctuary zone / sanctuary aquatic reserve). Never mention distances to nearby zones, "stay west of X", "don't drift", or other restriction caveats, and never drop a spot for being close to a zone. He knows the zones and checks the NSW FishSmart app.
- Swell heights shown in **feet** (scoring stays in metres). Tide heights stay in metres.
- Map is **satellite** by default. Keep info simple/uncluttered.
- Everything must be **free** (zero budget).

## Key dates
- Today when this was written: 8 Oct 2026. Core due live on both iPhones by **15 Oct**. Seb arrives **16 Oct** (little time for fixes after). Trip **21–31 Oct 2026** (pick-up Bankstown 9am 21 Oct, drop-off Bankstown 2pm 31 Oct).

## Hosting / deploy (Vercel via GitHub — Netlify is out of free deploy credits)
- Live: **https://jacob-camping-trip.vercel.app** — Vercel project connected by Jacob to GitHub repo `jacobhksullivan-droid/vibez` (PUBLIC repo; branch `main`). Every push to `main` auto-deploys.
- Vercel serves `deploy/epic-camper` (see `vercel.json`, `outputDirectory`), which is COMMITTED. `/api/live` = `api/live.mjs` (re-exports `netlify/functions/live.mjs`).
- Deploy after every change:
  ```bash
  python3 tools/build_site.py
  git add -A && git commit -m "…" && git push
  ```
  Then verify with curl on the Vercel URL: pages 200, `data/spots.js` and `data/tides.js` must 404, `/api/live` 200, and decrypt `data/secure.bin` with `openssl enc -d -aes-256-cbc -pbkdf2 -iter 150000 -md sha256 -pass file:tools/passcode.txt`.
- git push auth: GitHub CLI at `~/.local/gh/gh` (logged in as jacobhksullivan-droid, set up as git credential helper).
- Old Netlify site https://seb-jacob-epic-camper.netlify.app (site id `6cfacfc8-e847-4e55-8528-64e5068519a4`) is frozen: "Account credit usage exceeded – new deploys are blocked". Don't deploy there.
- Passcode gate: client-side AES. Passcode is in `tools/passcode.txt` (git-ignored — never commit it). Never type it into the live site yourself.
- Never change hosting security/account settings yourself — ask Jacob to click them.

## Local preview
- `.claude/launch.json` config `coast-call` runs `tools/devserver.py` (no-cache) on port 8765; `deploy-test` serves the built folder on 8767 (`?gate` shows the passcode screen locally).
- The desktop app kills idle preview servers — if "Dev servers are not available", just call preview_start `coast-call` again.
- Since the project moved into ~/Documents, macOS blocks the preview runner from reading it ("Operation not permitted"). Workaround: start `python3 tools/devserver.py` yourself via Bash in the background, then preview_start `coast-call-attach` (url-only config on 8765).

## Code map
- `data/spots.js` — all spots + local rules (the heart of the app). `data/tides.js` — Jacob's hardcoded BOM tide tables (21–31 Oct only). `data/zones.geojson` — official no-take zones + grey nurse sites.
- `src/score.js` (scoring, WEIGHTS/LIMITS at top), `src/data.js` (Open-Meteo fetch + cache), `src/app.js` (shell, map, list, spot sheet), `src/home.js`, `src/outlook.js`, `src/charts.js`, `src/location.js` (GPS, search, OSRM drive times), `src/buoys.js` (MHL live buoys), `src/gate.js` (passcode), `sw.js` (offline).
- `src/correct.js` (live corrections: buoys, BOM obs, BOM forecast), `src/live.js` + `netlify/functions/live.mjs` (`/api/live`: SharkSmart feeds, BOM coastal waters forecast/warnings, BOM wind obs — always deploy with `--functions netlify/functions`).
- `tools/build_site.py` (build+encrypt), `tools/build_review.py` (spot review page → artifact https://claude.ai/artifact/76gz9T8aLVjS57zosyWnr3), `tools/zonecheck.py` (pin-in-zone check).
- `research/` — saved research data (Wannasurf parsed guides for 439 breaks, McFadyen dive-site texts, USFA submission).
