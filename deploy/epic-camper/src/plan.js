// Trip planner: 21–31 Oct, two legs.
//  Leg 1 (21–25, Jacob + Seb): the best surf + spearing on one side of Sydney.
//  26: dawn session, then back through Sydney to pick up the mates.
//  Leg 2 (26–30, all four): the other side, beginner-friendly waves + calm snorkelling, comfier camps.
//  31: optional easy session, back at Bankstown by 2pm.
// North vs south is chosen from the forecast once it reaches the trip; until then south-first (see DEFAULT_WHY).
// Re-plans every time the forecast refreshes.
import { SPOTS } from "../data/spots.js";
import { CAMPS, KIND } from "./camps.js";

export const TRIP = { start: "2026-10-21", meet: "2026-10-26", end: "2026-10-31", home: { lat: -33.918, lon: 151.035, name: "Bankstown" }, dropOff: 14 };
const DAYS = Array.from({ length: 11 }, (_, k) => `2026-10-${21 + k}`);
const SIDE = { south: lat => lat < -34.0, north: lat => lat > -33.6 };
const SPOT = Object.fromEntries(SPOTS.map(s => [s.id, s]));
const km = (a, b) => Math.hypot((a.lat - b.lat) * 111, (a.lon - b.lon) * 111 * Math.cos((a.lat * Math.PI) / 180));
// rough camper drive time: short hops wind along coast roads (1.35× straight line at ~50 km/h);
// longer legs use the highway (1.25× at ~80 km/h); +15% for the van
export const driveMin = (a, b) => { const d = km(a, b); return Math.round((d < 40 ? (d * 1.35) / 50 : (d * 1.25) / 80) * 60 * 1.15); };
const KBONUS = { free: 0.8, rest: 0.8, npws: 0.4, camp: 0.4, park: 0 };

// Route used before the forecast reaches a day: where to sleep each night (index 0 = night of 21 Oct).
// Leg 1 explores the best water; the night of the 25th is ≤3 h from Sydney; leg 2 stays in easy, social areas.
const ANCHORS = {
  south: {
    core: [{ lat: -34.66, lon: 150.85, area: "Kiama / Bass Point" }, { lat: -35.03, lon: 150.75, area: "Jervis Bay & Currarong" }, { lat: -35.40, lon: 150.45, area: "Ulladulla & Murramarang" },
           { lat: -36.25, lon: 150.12, area: "Narooma – Potato Point" }, { lat: -35.05, lon: 150.70, area: "back to Jervis Bay" }],
    social: [{ lat: -34.76, lon: 150.82, area: "Gerroa / Kiama" }, { lat: -35.07, lon: 150.69, area: "Jervis Bay" }, { lat: -35.33, lon: 150.47, area: "Mollymook" },
             { lat: -35.07, lon: 150.69, area: "Jervis Bay" }, { lat: -34.60, lon: 150.87, area: "Killalea / Shellharbour" }],
  },
  north: {
    core: [{ lat: -32.78, lon: 152.10, area: "Port Stephens" }, { lat: -32.43, lon: 152.52, area: "Seal Rocks" }, { lat: -31.19, lon: 152.97, area: "Crescent Head" },
           { lat: -30.88, lon: 153.04, area: "South West Rocks" }, { lat: -32.78, lon: 152.10, area: "back to Port Stephens" }],
    social: [{ lat: -33.37, lon: 151.49, area: "Central Coast (Shelly / Toowoon)" }, { lat: -32.77, lon: 152.11, area: "Port Stephens (Anna Bay)" }, { lat: -32.40, lon: 152.52, area: "Seal Rocks / Pacific Palms" },
             { lat: -32.20, lon: 152.52, area: "Forster" }, { lat: -32.93, lon: 151.76, area: "Newcastle" }],
  },
};

export const DEFAULT_WHY = [
  "South first for the two of you: clearest water of the trip in late October and the most shore-dive kingfish spots in reach (Beecroft/Currarong, Jervis Bay, Bass Point, Tathra).",
  "North for the group: water's 3–4° warmer (19–22° vs 17–18°), so it's nicer for first-timers, there are gentle beginner beaches with surf schools (Anna Bay, One Mile, Nobbys, Shelly), and calm snorkelling (Boat Harbour, Fingal, Cabbage Tree Bay). Port Stephens is only ~2.5 h from Sydney.",
  "This flips automatically if the forecast makes north the better coast for leg 1 — it starts using real forecasts for the trip from ~12 Oct.",
];

// ---- per-spot session scores for a day ----
function win(r, labels) {
  if (!r) return null;
  const ws = r.windows.filter(w => labels.includes(w.label) && w.score != null);
  if (!ws.length) return null;
  const best = ws.reduce((a, b) => (a.no ? -1 : a.score) >= (b.no ? -1 : b.score) ? a : b);
  return best.no ? { score: 0, no: best.no, label: best.label, rep: best.rep } : { score: best.score, label: best.label, rep: best.rep };
}
const MORNING = ["Dawn", "Morning"], ARVO = ["Midday", "Arvo", "Evening"];
// social leg: big surf is no good for first-timers
function socialAdj(s, w) {
  if (!w || w.no) return w;
  if (s.type === "surf") { const f = w.rep?.ft ?? 3; return { ...w, score: w.score - Math.max(0, f - 4) * 1.5 - (f < 1 ? 2 : 0) }; }
  return w;
}
// static fallback (no forecast yet): how good a spot usually is for this kind of leg
function staticScore(s, mode) {
  if (mode === "social") return s.easy ? 6 : null;
  return s.type === "spear" ? 5 + s.spear.kingfish : 6 + (s.rules?.length ? 0.5 : 0);
}

// best spots near a camp (or point) for a window. `near` = [[id, min], …]
function pick(near, res, labels, mode, max, typeFilter) {
  const out = [];
  for (const [id, m] of near) {
    if (m > max) continue;
    const s = SPOT[id]; if (!s || (typeFilter && s.type !== typeFilter)) continue;
    if (mode === "social" && !s.easy) continue;
    let w = res ? win(res[id], labels) : null;
    if (mode === "social") w = socialAdj(s, w);
    const score = res ? (w ? w.score : null) : staticScore(s, mode);
    if (score == null) continue;
    out.push({ id, name: s.name, type: s.type, easy: s.easy, min: m, score, label: w?.label, no: w?.no, v: (w?.no ? -5 : score) - m / 30, forecast: !!res });
  }
  return out.sort((a, b) => b.v - a.v);
}

function campValue(c, res, mode) {
  const surf = pick(c.near, res, MORNING, mode, mode === "social" ? 30 : 35, "surf")[0];
  const spear = pick(c.near, res, mode === "social" ? [...MORNING, ...ARVO] : MORNING, mode, mode === "social" ? 30 : 35, "spear")[0];
  if (!surf && !spear) return null;
  const a = surf?.v ?? 0, b = spear?.v ?? 0;
  let v = Math.max(a, b) + (mode === "social" ? 0.5 : 0.35) * Math.min(a, b);
  if (mode === "social") v += (c.f?.shower || c.kind === "park" ? 0.6 : 0) + (c.f?.toilets ? 0.2 : 0) - (c.dirt ? 1 : 0) + (KBONUS[c.kind] ? 0.3 : 0);
  else v += KBONUS[c.kind] - (c.dirt ? 0.5 : 0);
  return { v, surf, spear };
}

// choose the best camp for the night before `day`
// with a forecast: best value within reach; without: best camp near that night's route anchor.
// A rest area is never used two nights running (≈24 h limit).
function chooseCamp(side, day, dayResults, mode, from, maxMove, homeMax, anchor, prevCamp) {
  const res = day && dayHas(dayResults, day) ? dayResults(day) : null;
  let best = null;
  for (const c of CAMPS) {
    if (!SIDE[side](c.lat)) continue;
    if (prevCamp && c.id === prevCamp.id && c.kind === "rest") continue;
    if (!res && anchor) { if (km(anchor, c) > 30) continue; }
    else if (from && driveMin(from, c) > maxMove) continue;
    if (homeMax != null && driveMin(c, TRIP.home) > homeMax) continue;
    const cv = campValue(c, res, mode); if (!cv) continue;
    if (!best || cv.v > best.cv.v) best = { c, cv, res };
  }
  return best;
}
const dayHas = (dayResults, day) => { try { const r = dayResults(day); return r && Object.values(r).some(Boolean); } catch (e) { return false; } };

// build the whole plan for one order (leg1 side, leg2 side)
function build(order, dayResults) {
  const [s1, s2] = order, plan = [];
  let pos = TRIP.home, total = 0, quality = 0, social = 0, covered = 0;
  const forecastFor = d => (dayHas(dayResults, d) ? dayResults(d) : null);

  DAYS.forEach((day, k) => {
    const res = forecastFor(day); if (res) covered++;
    const core = day < TRIP.meet, isMeet = day === TRIP.meet, last = day === TRIP.end;
    const mode = core || isMeet ? "core" : "social";
    const side = core || isMeet ? s1 : s2;
    const entry = { day, who: core ? "You + Seb" : isMeet ? "You + Seb → all four" : "All four", side, mode, sessions: [], notes: [], forecast: !!res };

    if (day === TRIP.start) {
      // pick-up 9am → drive straight to the first arvo session (≤ 3.5 h; near the first night's area if no forecast yet)
      const a0 = ANCHORS[s1].core[0];
      const near = SPOTS.filter(s => SIDE[s1](s.lat) && (res || km(a0, s) < 35)).map(s => [s.id, driveMin(TRIP.home, s)]).filter(x => x[1] <= 210);
      const p = pick(near, res, ARVO, "core", 210)[0];
      entry.notes.push("Pick up the camper in Bankstown at 9am.");
      if (p) { entry.sessions.push({ when: "Arvo", ...p, from: "Bankstown" }); pos = SPOT[p.id]; total += p.min; }
    }

    // morning + arvo sessions from last night's camp
    const prev = plan[k - 1]?.camp?.c;
    if (prev) {
      if (last) {
        const p = pick(prev.near, res, MORNING, "social", 40)[0];
        if (p) entry.sessions.push({ when: "Morning", ...p });
        const back = driveMin(prev, TRIP.home);
        const leaveMin = Math.floor((TRIP.dropOff * 60 - back - 20) / 15) * 15, lh = Math.floor(leaveMin / 60), lm = leaveMin % 60;
        const leave = `${lh % 12 || 12}${lm ? ":" + String(lm).padStart(2, "0") : ""}${lh >= 12 ? "pm" : "am"}`;
        entry.notes.push(`Drive back to Bankstown (~${Math.round(back / 60 * 10) / 10} h) — leave by ${leave} for the 2pm drop-off.`);
        total += back;
      } else {
        const m = pick(prev.near, res, MORNING, mode, mode === "social" ? 30 : 35);
        const first = m[0];
        if (first) entry.sessions.push({ when: "Morning", ...first });
        if (isMeet) {
          const toSyd = driveMin(prev, TRIP.home);
          entry.notes.push(`After the morning session, drive to Sydney (~${Math.round(toSyd / 60 * 10) / 10} h) and pick up the others around lunchtime.`);
          total += toSyd; pos = TRIP.home;
        } else {
          // arvo: the other activity if it's good, within 45 min
          const other = pick(prev.near, res, ARVO, mode, 45, first ? (first.type === "surf" ? "spear" : "surf") : null)[0]
            || pick(prev.near, res, ARVO, mode, 45).find(x => x.id !== first?.id);
          if (other) entry.sessions.push({ when: "Arvo", ...other });
          pos = prev;
        }
        if (first) quality += mode === "core" ? first.score : 0;
        if (first && mode === "social") social += first.score;
      }
    }

    // tonight's camp (not on the last day)
    if (!last) {
      const next = DAYS[k + 1];
      const nmode = next < TRIP.meet || next === TRIP.meet ? "core" : "social";
      const nside = nmode === "core" ? s1 : s2;
      const homeMax = next === TRIP.meet ? 180 : next === TRIP.end ? 150 : isMeet ? 180 : null;
      const from = isMeet ? TRIP.home : pos;
      const maxMove = isMeet ? 180 : day === TRIP.start ? 120 : nmode === "social" ? 120 : 150;
      const ai = nmode === "core" ? k : k - DAYS.indexOf(TRIP.meet);
      const anchor = ANCHORS[nside][nmode][Math.min(ai, 4)];
      const pickC = chooseCamp(nside, next, dayResults, nmode, from, maxMove, homeMax, anchor, plan[k - 1]?.camp?.c);
      if (pickC && !pickC.res) entry.area = anchor.area;
      if (pickC) { entry.camp = pickC; entry.campDrive = driveMin(from, pickC.c); total += entry.campDrive; }
    }
    plan.push(entry);
  });
  return { order, plan, quality, social, covered, totalDrive: total };
}

export function makePlan(dayResults, forced) {
  const south = build(["south", "north"], dayResults), north = build(["north", "south"], dayResults);
  const coreCovered = DAYS.filter(d => d < TRIP.meet && dayHas(dayResults, d)).length;
  let chosen, why;
  if (forced) { chosen = forced === "north" ? north : south; why = [`You picked ${forced} first.`]; }
  else if (coreCovered >= 2) {
    const sv = south.quality + 0.5 * south.social, nv = north.quality + 0.5 * north.social;
    chosen = nv > sv ? north : south;
    why = [`Forecast-based: leg 1 ${chosen === north ? "north" : "south"} scores ${Math.round(chosen.quality)} vs ${Math.round((chosen === north ? south : north).quality)} for the best morning sessions (${coreCovered} of 5 days forecast so far).`];
  } else { chosen = south; why = DEFAULT_WHY; }
  return { ...chosen, why, alt: chosen === south ? north : south, coreCovered };
}

export { KIND };
