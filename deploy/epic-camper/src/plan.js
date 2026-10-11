// Trip plan, 21–31 Oct. One plan, no options; anywhere on the coast.
//  21–25: Jacob + Seb — best surf + spearing (spearing counts a bit more). Night 1 is always a powered site (charge the van).
//  26–30: the other two join (meet them wherever suits) — same goal: the best surf + spearing for Jacob + Seb.
//  31: morning session, back at Bankstown by 2pm.
// Both coasts (2+ nights each) unless one is terrible for the whole forecast. 1–2 nights per area (30 km; a 3rd only if
// the forecast there is insane, a 9+ session) and never back to an area once you've left it.
// Every night's camp is picked together (beam search over routes) so the sessions around it score as high
// as possible, minus the cost of driving. Every day = one surf + one dive: morning near last night's camp → drive → arvo near tonight's.
// Uses the forecast where it reaches; days it doesn't reach yet use each spot's base quality. Re-plans on every refresh.
import { SPOTS } from "../data/spots.js";
import { CAMPS, KIND } from "./camps.js";

export const TRIP = { start: "2026-10-21", meet: "2026-10-26", end: "2026-10-31", home: { lat: -33.918, lon: 151.035, name: "Bankstown" }, dropOff: 14 };
const NIGHTS = Array.from({ length: 10 }, (_, k) => `2026-10-${21 + k}`); // nights of 21 … 30 Oct
const SPOT = Object.fromEntries(SPOTS.map(s => [s.id, s]));
const km = (a, b) => Math.hypot((a.lat - b.lat) * 111, (a.lon - b.lon) * 111 * Math.cos((a.lat * Math.PI) / 180));
// rough camper drive time: short hops wind along coast roads (1.35× straight line at ~50 km/h);
// longer legs use the highway (1.25× at ~80 km/h); +15% for the van
export const driveMin = (a, b) => { const d = km(a, b); return Math.round((d < 40 ? (d * 1.35) / 50 : (d * 1.25) / 80) * 60 * 1.15); };

const SPEAR_BONUS = 0.6;   // lean towards spearing (on the 0–10 scale)
const DRIVE_COST = 0.7;    // points per hour of driving between camps
const MAX_MOVE = 240;                             // minutes of driving between camps
const FIRST_MAX = 240, LAST_MAX = 150; // Bankstown → night 1; night 30 → Bankstown
const KBONUS = { free: 0.5, rest: 0.5, npws: 0.3, camp: 0.3, park: 0 };
const MORNING = ["Dawn", "Morning"], ARVO = ["Midday", "Arvo", "Evening"];

const dayHas = (dayResults, day) => { try { const r = dayResults(day); return r && Object.values(r).some(Boolean); } catch (e) { return false; } };

function win(r, labels) {
  const ws = r?.windows.filter(w => labels.includes(w.label) && w.score != null) || [];
  if (!ws.length) return null;
  const best = ws.reduce((a, b) => ((a.no ? -1 : a.score) >= (b.no ? -1 : b.score) ? a : b));
  return { score: best.no ? 0 : best.score, no: best.no, label: best.label, ft: best.rep?.ft };
}
// base quality, used before the forecast reaches a day
const usual = s => (s.type === "spear" ? 5 + (s.spear?.kingfish ?? 0) : 6 + 2 * (s.surf?.quality ?? 0));

// sessions near a camp for a day, best first: { id, name, type, easy, min, score, no, label, forecast, v }
function sessions(near, res, labels, max) {
  const out = [];
  for (const [id, m] of near) {
    const s = SPOT[id]; if (!s || m > max) continue;
    const w = res ? win(res[id], labels) : null;
    if (res && !w) continue;
    const score = w ? w.score : usual(s);
    const v = (w?.no ? -5 : score) - m / 30 + (s.type === "spear" ? SPEAR_BONUS : 0);
    out.push({ id, name: s.name, type: s.type, easy: s.easy, min: m, score, no: w?.no, label: w?.label, forecast: !!res, v });
  }
  return out.sort((a, b) => b.v - a.v);
}
// how good a block of sessions is: we want to surf AND spear every day, so a camp is worth the average of its best
// surf and best dive (a missing one costs 3 points)
function blockValue(list) {
  const surf = list.find(x => x.type === "surf"), spear = list.find(x => x.type === "spear");
  if (!surf && !spear) return 0;
  return ((surf ? surf.v : (spear.v - 3)) + (spear ? spear.v : (surf.v - 3))) / 2;
}
// one surf + one dive a day: whichever order (morning/arvo) scores better
function pickDay(amList, pmList) {
  const top = (l, t, not) => l.find(x => x.type === t && x.id !== not);
  let best = null;
  for (const [a, b] of [["surf", "spear"], ["spear", "surf"]]) {
    const am = top(amList, a), pm = top(pmList, b, am?.id);
    if (am && pm && (!best || am.v + pm.v > best.v)) best = { am, pm, v: am.v + pm.v };
  }
  if (best) return best;
  const am = amList[0]; return { am, pm: pmList.find(x => x.id !== am?.id) };
}
const nextDay = d => (d === NIGHTS[NIGHTS.length - 1] ? TRIP.end : NIGHTS[NIGHTS.indexOf(d) + 1]);

export function makePlan(dayResults) {
  const resFor = {};
  for (const d of [...NIGHTS, TRIP.end]) resFor[d] = dayHas(dayResults, d) ? dayResults(d) : null;
  const camps = CAMPS.filter(c => c.near.some(([, m]) => m <= 35));
  const n = camps.length, K = NIGHTS.length;

  // value of sleeping at camp i on night k = arvo session that day near it + next morning's session near it (+ camp comfort)
  const val = NIGHTS.map(d => camps.map(c => {
    const nd = nextDay(d);
    return blockValue(sessions(c.near, resFor[d], ARVO, 45)) + blockValue(sessions(c.near, resFor[nd], MORNING, 35))
      + KBONUS[c.kind] - (c.dirt ? 0.8 : 0);
  }));
  // a 3rd night in one area is only allowed when the forecast there is insane
  const INSANE = 9;
  const insane = NIGHTS.map(d => camps.map(c => {
    const nd = nextDay(d), top = l => Math.max(0, ...l.filter(x => x.forecast && !x.no).map(x => x.score));
    return top(sessions(c.near, resFor[d], ARVO, 45)) >= INSANE || top(sessions(c.near, resFor[nd], MORNING, 35)) >= INSANE;
  }));
  const home = camps.map(c => driveMin(TRIP.home, c));
  const D = camps.map(a => camps.map(b => driveMin(a, b)));

  // night 1 = a powered site (caravan park or a camp with power) so the van's batteries start the trip full
  const powered = c => c.kind === "park" || !!c.f?.power;
  // Do both coasts: at least 2 nights north of Sydney and 2 south — unless the forecast says one side is terrible the
  // whole time (it covers 6+ trip days and that side's best session never reaches 4/10, surf or dive).
  const sideOf = c => (c.lat > -33.6 ? "N" : c.lat < -34.0 ? "S" : null);
  const fcDays = [...NIGHTS, TRIP.end].filter(d => resFor[d]);
  const terrible = side => fcDays.length >= 6 && fcDays.every(d => {
    const res = resFor[d];
    return !SPOTS.some(sp => sideOf(sp) === side && res[sp.id] && !res[sp.id].best?.no && (res[sp.id].best?.score ?? 0) >= 4);
  });
  const need = { N: terrible("N") ? 0 : 2, S: terrible("S") ? 0 : 2 };
  if (!need.N && !need.S) { need.N = 2; need.S = 2; } // both bad: still split it
  const short = (nN, nS) => Math.max(0, need.N - nN) + Math.max(0, need.S - nS);

  // Beam search over routes (keeps the best few hundred part-routes each night). Stay 1 or 2 nights in an area (camps
  // within 30 km) — a 3rd only when the forecast there is insane — and never go back to an area you've already left.
  const AREA_KM = 30, BEAM = 400, PER_CAMP = 3;
  const near = camps.map(a => camps.map(b => km(a, b) < AREA_KM));
  const side = camps.map(sideOf);
  let beam = [];
  camps.forEach((c, i) => {
    if (home[i] > FIRST_MAX || !powered(c)) return;
    const nN = side[i] === "N" ? 1 : 0, nS = side[i] === "S" ? 1 : 0;
    if (short(nN, nS) <= K - 1) beam.push({ r: [i], v: val[0][i] - DRIVE_COST * home[i] / 60, nN, nS });
  });
  for (let k = 1; k < K; k++) {
    const next = [];
    for (const p of beam) {
      const i = p.r[p.r.length - 1];
      for (let j = 0; j < n; j++) {
        if (k === K - 1 && home[j] > LAST_MAX) continue;
        const drive = D[i][j]; if (drive > MAX_MOVE) continue;
        if (camps[j].kind === "rest" && km(camps[i], camps[j]) < 3) continue; // rest areas: one night only (incl. the other side of the road)
        // stay 1 or 2 nights in an area (3rd only if insane), and never come back to an area once you've left it
        let t = p.r.length - 1, streak = 0;
        while (t >= 0 && near[p.r[t]][j]) { streak++; t--; }
        if (streak >= 2 && !insane[k][j]) continue;
        let back = false; for (let x = 0; x <= t; x++) if (near[p.r[x]][j]) { back = true; break; }
        if (back) continue;
        const nN = p.nN + (side[j] === "N" ? 1 : 0), nS = p.nS + (side[j] === "S" ? 1 : 0);
        if (short(nN, nS) > K - 1 - k) continue; // can't fit both coasts in any more
        next.push({ p, j, nN, nS, v: p.v - DRIVE_COST * drive / 60 + val[k][j] });
      }
    }
    next.sort((a, b) => b.v - a.v);
    const per = new Map(); beam = [];
    for (const x of next) {
      const key = `${x.j}|${Math.min(x.nN, 2)}|${Math.min(x.nS, 2)}`;
      const c = per.get(key) || 0; if (c >= PER_CAMP) continue;
      per.set(key, c + 1); beam.push({ r: [...x.p.r, x.j], v: x.v, nN: x.nN, nS: x.nS });
      if (beam.length >= BEAM) break;
    }
    if (!beam.length) return { days: [], covered: 0 };
  }
  const route = beam[0].r;
  const skipped = !need.N ? "north" : !need.S ? "south" : null;

  // spell the days out
  const days = [];
  let covered = 0;
  // a spot already used at an earlier stop isn't used again (same stop, next day is fine)
  const usedAt = new Map(), stopOf = route.map((r, k) => { let t = k; while (t > 0 && near[route[t - 1]][r]) t--; return t; });
  const fresh = (list, k) => list.filter(x => !usedAt.has(x.id) || usedAt.get(x.id) === stopOf[k]);
  const use = (x, k) => { if (x && !usedAt.has(x.id)) usedAt.set(x.id, stopOf[k]); return x; };
  NIGHTS.forEach((d, k) => {
    const c = camps[route[k]], prev = k ? camps[route[k - 1]] : null;
    if (resFor[d]) covered++;
    const out = [], notes = [];
    const pick = pickDay(prev ? fresh(sessions(prev.near, resFor[d], MORNING, 35), k - 1) : [], fresh(sessions(c.near, resFor[d], ARVO, 45), k));
    const am = prev && use(pick.am, k - 1);
    if (am) out.push({ when: "Morning", ...am });
    if (k === 0) notes.push("Pick up the van in Bankstown at 9am.");
    const pm = use(pick.pm, k);
    if (pm) out.push({ when: "Arvo", ...pm });
    days.push({ day: d, who: d < TRIP.meet ? "You + Seb" : "All four", forecast: !!resFor[d], sessions: out, notes, camp: c, power: k === 0,
      drive: k === 0 ? home[route[k]] : D[route[k - 1]][route[k]], from: k === 0 ? TRIP.home.name : null });
  });
  // last day: morning session, then the van back by 2pm
  const last = camps[route[K - 1]], backMin = home[route[K - 1]];
  const am = fresh(sessions(last.near, resFor[TRIP.end], MORNING, 35), K - 1)[0];
  const leaveMin = Math.floor((TRIP.dropOff * 60 - backMin - 20) / 15) * 15, lh = Math.floor(leaveMin / 60), lm = leaveMin % 60;
  const leave = `${lh % 12 || 12}${lm ? ":" + String(lm).padStart(2, "0") : ""}${lh >= 12 ? "pm" : "am"}`;
  days.push({ day: TRIP.end, who: "All four", forecast: !!resFor[TRIP.end], sessions: am ? [{ when: "Morning", ...am }] : [],
    notes: [`Leave by ${leave} — van back in Bankstown at 2pm (~${Math.round(backMin / 6) / 10} h).`] });
  return { days, covered, skipped };
}

export { KIND };
