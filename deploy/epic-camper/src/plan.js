// Trip plan for Jacob + Seb: 21–25 Oct, then a dawn session on the 26th before meeting the others in Sydney.
// One plan, no options. Anywhere on the coast: each night's camp is picked (over all five nights at once) so the
// sessions around it score as high as possible, minus the cost of driving. Spearing counts a bit more than surf.
// Night 1 is always a powered site (charge the van). Days: morning session near last night's camp → drive → arvo session near tonight's camp.
// Re-plans every time the forecast refreshes; days it doesn't reach yet use each spot's usual quality.
import { SPOTS } from "../data/spots.js";
import { CAMPS, KIND } from "./camps.js";

export const TRIP = { start: "2026-10-21", end: "2026-10-25", meet: "2026-10-26", home: { lat: -33.918, lon: 151.035, name: "Bankstown" } };
const NIGHTS = ["2026-10-21", "2026-10-22", "2026-10-23", "2026-10-24", "2026-10-25"];
const SPOT = Object.fromEntries(SPOTS.map(s => [s.id, s]));
const km = (a, b) => Math.hypot((a.lat - b.lat) * 111, (a.lon - b.lon) * 111 * Math.cos((a.lat * Math.PI) / 180));
// rough camper drive time: short hops wind along coast roads (1.35× straight line at ~50 km/h);
// longer legs use the highway (1.25× at ~80 km/h); +15% for the van
export const driveMin = (a, b) => { const d = km(a, b); return Math.round((d < 40 ? (d * 1.35) / 50 : (d * 1.25) / 80) * 60 * 1.15); };

const SPEAR_BONUS = 0.6;   // lean towards spearing (on the 0–10 scale)
const DRIVE_COST = 0.7;    // points per hour of driving between camps
const MAX_MOVE = 240, FIRST_MAX = 240, LAST_MAX = 180; // minutes: any day's move, Bankstown → first camp, last camp → Sydney
const KBONUS = { free: 0.5, rest: 0.5, npws: 0.3, camp: 0.3, park: 0 };
const MORNING = ["Dawn", "Morning"], ARVO = ["Midday", "Arvo", "Evening"];

const dayHas = (dayResults, day) => { try { const r = dayResults(day); return r && Object.values(r).some(Boolean); } catch (e) { return false; } };

function win(r, labels) {
  const ws = r?.windows.filter(w => labels.includes(w.label) && w.score != null) || [];
  if (!ws.length) return null;
  const best = ws.reduce((a, b) => ((a.no ? -1 : a.score) >= (b.no ? -1 : b.score) ? a : b));
  return { score: best.no ? 0 : best.score, no: best.no, label: best.label };
}
const usual = s => (s.type === "spear" ? 5 + (s.spear?.kingfish ?? 0) : 6 + (s.rules?.length ? 0.5 : 0));

// sessions near a camp for a day, best first: { id, name, type, min, score, no, label, forecast, v }
function sessions(near, res, labels, max) {
  const out = [];
  for (const [id, m] of near) {
    const s = SPOT[id]; if (!s || m > max) continue;
    const w = res ? win(res[id], labels) : null;
    if (res && !w) continue;
    const score = w ? w.score : usual(s);
    out.push({ id, name: s.name, type: s.type, min: m, score, no: w?.no, label: w?.label, forecast: !!res,
      v: (w?.no ? -5 : score) + (s.type === "spear" ? SPEAR_BONUS : 0) - m / 30 });
  }
  return out.sort((a, b) => b.v - a.v);
}
// how good a block of sessions is: the best one, plus a little for having the other activity close by too
function blockValue(list) {
  const top = list[0]; if (!top) return 0;
  const other = list.find(x => x.type !== top.type);
  return top.v + (other ? 0.3 * Math.max(0, other.v) : 0);
}

export function makePlan(dayResults) {
  const resFor = {};
  for (const d of [...NIGHTS, TRIP.meet]) resFor[d] = dayHas(dayResults, d) ? dayResults(d) : null;
  const camps = CAMPS.filter(c => c.near.some(([, m]) => m <= 35));
  const n = camps.length, K = NIGHTS.length;

  // value of sleeping at camp i on night k = arvo session that day near it + next morning's session near it
  const val = NIGHTS.map((d, k) => camps.map(c => {
    const next = k + 1 < K ? NIGHTS[k + 1] : TRIP.meet;
    return blockValue(sessions(c.near, resFor[d], ARVO, 45)) + blockValue(sessions(c.near, resFor[next], MORNING, 35))
      + KBONUS[c.kind] - (c.dirt ? 0.8 : 0);
  }));
  const home = camps.map(c => driveMin(TRIP.home, c));
  const D = camps.map(a => camps.map(b => driveMin(a, b)));

  // best route over all five nights (dynamic programming over camps)
  // night 1 = a powered site (caravan park or a camp with power) so the van's batteries start the trip full
  const powered = c => c.kind === "park" || !!c.f?.power;
  let best = camps.map((c, i) => (home[i] <= FIRST_MAX && powered(c) ? val[0][i] - DRIVE_COST * home[i] / 60 : -Infinity));
  const back = [];
  for (let k = 1; k < K; k++) {
    const cur = new Array(n).fill(-Infinity), from = new Array(n).fill(-1);
    for (let j = 0; j < n; j++) {
      if (k === K - 1 && home[j] > LAST_MAX) continue;
      for (let i = 0; i < n; i++) {
        if (best[i] === -Infinity || D[i][j] > MAX_MOVE) continue;
        if (camps[j].kind === "rest" && km(camps[i], camps[j]) < 3) continue; // rest areas: one night only (incl. the other side of the road)
        const v = best[i] - DRIVE_COST * D[i][j] / 60;
        if (v > cur[j]) { cur[j] = v; from[j] = i; }
      }
      if (cur[j] > -Infinity) cur[j] += val[k][j];
    }
    back.push(from); best = cur;
  }
  let j = best.indexOf(Math.max(...best));
  if (j < 0 || best[j] === -Infinity) return { days: [], covered: 0 };
  const route = [j];
  for (let k = K - 2; k >= 0; k--) { j = back[k][j]; route.unshift(j); }

  // spell the days out
  const days = [];
  let covered = 0;
  NIGHTS.forEach((d, k) => {
    const c = camps[route[k]], prev = k ? camps[route[k - 1]] : null;
    if (resFor[d]) covered++;
    const out = [];
    const am = prev && sessions(prev.near, resFor[d], MORNING, 35)[0];
    if (am) out.push({ when: "Morning", ...am });
    const pm = sessions(c.near, resFor[d], ARVO, 45).find(x => x.id !== am?.id);
    if (pm) out.push({ when: "Arvo", ...pm });
    days.push({ day: d, forecast: !!resFor[d], sessions: out, camp: c, power: k === 0, drive: prev ? D[route[k - 1]][route[k]] : home[route[k]], from: prev ? null : TRIP.home.name });
  });
  const last = camps[route[K - 1]];
  const am = sessions(last.near, resFor[TRIP.meet], MORNING, 35)[0];
  days.push({ day: TRIP.meet, forecast: !!resFor[TRIP.meet], sessions: am ? [{ when: "Morning", ...am }] : [], toSydney: home[route[K - 1]] });
  return { days, covered };
}

export { KIND };
