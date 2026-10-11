// Trip plan, 21–31 Oct. One plan, no options; anywhere on the coast.
//  21–25: Jacob + Seb — best surf + spearing (spearing counts a bit more). Night 1 is always a powered site (charge the van).
//  26: dawn session, then Sydney to pick up the other two (~lunch), then drive to the next camp.
//  26–30: all four — the mates don't surf/spear yet, so easy waves + calm snorkelling count extra, and comfier camps.
//  31: morning session, back at Bankstown by 2pm.
// Every night's camp is picked together (dynamic programming over all camps) so the sessions around it score as high
// as possible, minus the cost of driving. Days: morning session near last night's camp → drive → arvo session near tonight's.
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
const MAX_MOVE = 240, SOCIAL_MOVE = 180;          // minutes of driving between camps (core / with the mates)
const FIRST_MAX = 240, MEET_MAX = 180, FROM_SYD = 210, LAST_MAX = 150; // Bankstown → night 1; night 25 → Sydney; Sydney → night 26; night 30 → Bankstown
const KBONUS = { free: 0.5, rest: 0.5, npws: 0.3, camp: 0.3, park: 0 };
const MORNING = ["Dawn", "Morning"], ARVO = ["Midday", "Arvo", "Evening"];

const dayHas = (dayResults, day) => { try { const r = dayResults(day); return r && Object.values(r).some(Boolean); } catch (e) { return false; } };
const social = (day, part) => day > TRIP.meet || (day === TRIP.meet && part === "arvo");

function win(r, labels) {
  const ws = r?.windows.filter(w => labels.includes(w.label) && w.score != null) || [];
  if (!ws.length) return null;
  const best = ws.reduce((a, b) => ((a.no ? -1 : a.score) >= (b.no ? -1 : b.score) ? a : b));
  return { score: best.no ? 0 : best.score, no: best.no, label: best.label, ft: best.rep?.ft };
}
// base quality, used before the forecast reaches a day
const usual = s => (s.type === "spear" ? 5 + (s.spear?.kingfish ?? 0) : 6 + 2 * (s.surf?.quality ?? 0));

// sessions near a camp for a day, best first: { id, name, type, easy, min, score, no, label, forecast, v }
// social = the mates are along: easy waves / calm snorkelling get a bump, big surf a penalty
function sessions(near, res, labels, max, soc) {
  const out = [];
  for (const [id, m] of near) {
    const s = SPOT[id]; if (!s || m > max) continue;
    const w = res ? win(res[id], labels) : null;
    if (res && !w) continue;
    const score = w ? w.score : usual(s);
    let v = (w?.no ? -5 : score) - m / 30;
    if (soc) { v += s.easy ? 1 : 0; if (s.type === "surf" && w?.ft > 4) v -= (w.ft - 4) * 1.5; }
    else if (s.type === "spear") v += SPEAR_BONUS;
    out.push({ id, name: s.name, type: s.type, easy: s.easy, min: m, score, no: w?.no, label: w?.label, forecast: !!res, v });
  }
  return out.sort((a, b) => b.v - a.v);
}
// how good a block of sessions is: the best one, plus a little for having the other activity close by too
function blockValue(list) {
  const top = list[0]; if (!top) return 0;
  const other = list.find(x => x.type !== top.type);
  return top.v + (other ? 0.3 * Math.max(0, other.v) : 0);
}
const nextDay = d => (d === NIGHTS[NIGHTS.length - 1] ? TRIP.end : NIGHTS[NIGHTS.indexOf(d) + 1]);

export function makePlan(dayResults) {
  const resFor = {};
  for (const d of [...NIGHTS, TRIP.end]) resFor[d] = dayHas(dayResults, d) ? dayResults(d) : null;
  const camps = CAMPS.filter(c => c.near.some(([, m]) => m <= 35));
  const n = camps.length, K = NIGHTS.length, kMeet = NIGHTS.indexOf(TRIP.meet);

  // value of sleeping at camp i on night k = arvo session that day near it + next morning's session near it (+ camp comfort)
  const val = NIGHTS.map(d => camps.map(c => {
    const nd = nextDay(d), socNight = social(d, "arvo");
    let v = blockValue(sessions(c.near, resFor[d], ARVO, 45, socNight)) + blockValue(sessions(c.near, resFor[nd], MORNING, 35, social(nd, "morning")));
    v += KBONUS[c.kind] - (c.dirt ? (socNight ? 1 : 0.8) : 0);
    if (socNight) v += (c.f?.shower || c.kind === "park" ? 0.6 : 0) + (c.f?.toilets ? 0.2 : 0);
    return v;
  }));
  const home = camps.map(c => driveMin(TRIP.home, c));
  const D = camps.map(a => camps.map(b => driveMin(a, b)));

  // night 1 = a powered site (caravan park or a camp with power) so the van's batteries start the trip full
  const powered = c => c.kind === "park" || !!c.f?.power;
  // state = (camp, nights in a row in that area: 1, 2, 3+). Before the forecast reaches a night there's no weather reason
  // to sit in one area, so a 3rd night running there costs a bit and a 4th+ more — the base-quality plan tours the best areas.
  const S = 3, AREA_KM = 30, STREAK_COST = [0, 0, 1.2, 2.4];
  const near = (i, j) => km(camps[i], camps[j]) < AREA_KM;
  let best = Array.from({ length: n }, (_, i) => {
    const row = new Array(S + 1).fill(-Infinity);
    if (home[i] <= FIRST_MAX && powered(camps[i])) row[1] = val[0][i] - DRIVE_COST * home[i] / 60;
    return row;
  });
  const back = [];
  for (let k = 1; k < K; k++) {
    const cur = Array.from({ length: n }, () => new Array(S + 1).fill(-Infinity)), from = Array.from({ length: n }, () => new Array(S + 1).fill(null));
    const noFc = !resFor[NIGHTS[k]], cost = k > kMeet ? 0.5 : 1;
    for (let j = 0; j < n; j++) {
      if (k === K - 1 && home[j] > LAST_MAX) continue;
      if (k === kMeet && home[j] > FROM_SYD) continue;
      for (let i = 0; i < n; i++) {
        let drive;
        if (k === kMeet) { if (home[i] > MEET_MAX) continue; drive = home[i] + home[j]; } // via Sydney to pick up the others
        else { drive = D[i][j]; if (drive > (k > kMeet ? SOCIAL_MOVE : MAX_MOVE)) continue; }
        if (camps[j].kind === "rest" && km(camps[i], camps[j]) < 3) continue; // rest areas: one night only (incl. the other side of the road)
        const same = k !== kMeet && near(i, j);
        for (let st = 1; st <= S; st++) {
          if (best[i][st] === -Infinity) continue;
          const ns = same ? Math.min(st + 1, S) : 1;
          const streak = same ? st + 1 : 1;
          const pen = noFc ? cost * STREAK_COST[Math.min(streak, 3)] : 0;
          const v = best[i][st] - DRIVE_COST * drive / 60 - pen;
          if (v > cur[j][ns]) { cur[j][ns] = v; from[j][ns] = [i, st]; }
        }
      }
      for (let st = 1; st <= S; st++) if (cur[j][st] > -Infinity) cur[j][st] += val[k][j];
    }
    back.push(from); best = cur;
  }
  let top = null;
  best.forEach((row, i) => row.forEach((v, st) => { if (v > -Infinity && (!top || v > top.v)) top = { v, i, st }; }));
  if (!top) return { days: [], covered: 0 };
  const route = [top.i];
  let cs = [top.i, top.st];
  for (let k = K - 2; k >= 0; k--) { cs = back[k][cs[0]][cs[1]]; route.unshift(cs[0]); }

  // spell the days out
  const days = [];
  let covered = 0;
  NIGHTS.forEach((d, k) => {
    const c = camps[route[k]], prev = k ? camps[route[k - 1]] : null;
    if (resFor[d]) covered++;
    const out = [], notes = [];
    const am = prev && sessions(prev.near, resFor[d], MORNING, 35, social(d, "morning"))[0];
    if (am) out.push({ when: "Morning", ...am });
    if (k === 0) notes.push("Pick up the van in Bankstown at 9am.");
    if (k === kMeet) notes.push(`Then Sydney to pick up the others around lunch (~${Math.round(home[route[k - 1]] / 6) / 10} h).`);
    const pm = sessions(c.near, resFor[d], ARVO, 45, social(d, "arvo")).find(x => x.id !== am?.id);
    if (pm) out.push({ when: "Arvo", ...pm });
    days.push({ day: d, who: d < TRIP.meet ? "You + Seb" : "All four", forecast: !!resFor[d], sessions: out, notes, camp: c, power: k === 0,
      drive: k === 0 ? home[route[k]] : k === kMeet ? home[route[k]] : D[route[k - 1]][route[k]], from: k === 0 ? TRIP.home.name : k === kMeet ? "Sydney" : null });
  });
  // last day: morning session, then the van back by 2pm
  const last = camps[route[K - 1]], backMin = home[route[K - 1]];
  const am = sessions(last.near, resFor[TRIP.end], MORNING, 35, true)[0];
  const leaveMin = Math.floor((TRIP.dropOff * 60 - backMin - 20) / 15) * 15, lh = Math.floor(leaveMin / 60), lm = leaveMin % 60;
  const leave = `${lh % 12 || 12}${lm ? ":" + String(lm).padStart(2, "0") : ""}${lh >= 12 ? "pm" : "am"}`;
  days.push({ day: TRIP.end, who: "All four", forecast: !!resFor[TRIP.end], sessions: am ? [{ when: "Morning", ...am }] : [],
    notes: [`Leave by ${leave} — van back in Bankstown at 2pm (~${Math.round(backMin / 6) / 10} h).`] });
  return { days, covered };
}

export { KIND };
