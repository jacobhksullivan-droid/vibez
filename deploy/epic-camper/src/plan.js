// Trip plan, 21–31 Oct. One plan, no options; anywhere on the coast, purely on conditions.
//  Every day = one surf + one dive. Night 1 is a powered site (charge the van). 31st: morning session, van back in Bankstown by 2pm.
// CONDITIONS FIRST: every session gets a verdict from the spot's aspect vs the day's swell + wind (+ rain for dives):
//  pass / marginal / fail. The tier decides; the 0–10 score only ranks spots inside a tier. Spots whose aspect data is
//  unverified ("needs check") can't pass, so they never outrank a spot that does.
// ROUTE: beam search over the night camps. A "leg" = a run of nights on one side of Sydney (at most 2 legs). Each leg
//  goes one way with one free turnaround; any other backtrack is only allowed when everything ahead is poor that night,
//  the place we go back to passes, and it's a short hop (CFG.backtrackMax) — and it's listed in the explainer.
//  1–2 nights per place (camps within 5 km; a 3rd only if insane), never back to a place, never a spot twice (3 km).
//  Doing both sides of Sydney earns a bonus, not a rule — a side that's clearly worse gets skipped.
// Days the forecast covers get exact spots; later days are provisional (region + what to look for + candidates) and
// fill in automatically as the forecast reaches them (re-plans on every refresh).
import { SPOTS } from "../data/spots.js";
import { CAMPS, KIND } from "./camps.js";
import { windShelter, inArc, angDiff, card } from "./score.js";

export const TRIP = { start: "2026-10-21", meet: "2026-10-26", end: "2026-10-31", home: { lat: -33.918, lon: 151.035, name: "Bankstown" }, dropOff: 14 };
// All the planner's knobs (minutes unless noted)
export const CFG = {
  firstMax: 300,     // Bankstown → night 1 (lets day 1 reach Narooma if it's clearly better)
  lastMax: 180,      // last night → Bankstown: ≤3 h keeps a buffer for the 2pm drop-off
  maxMove: 240,      // camp → camp in one day
  backtrackMax: 45,  // longest allowed backtrack (only when everything ahead is poor that night)
  dayDetour: 30,     // extra minutes the morning + arvo spots may add to a day's drive
  driveCost: 1.5,    // points per hour of driving between camps
  bothSides: 4,      // bonus for 2+ nights each side of Sydney (less than one session dropping a tier)
  tierGap: 6,        // points per conditions tier
  startSide: null,   // "N" / "S" forces which way the trip heads first (null = let the conditions decide)
};
const NIGHTS = Array.from({ length: 10 }, (_, k) => `2026-10-${21 + k}`); // nights of 21 … 30 Oct
const SPOT = Object.fromEntries(SPOTS.map(s => [s.id, s]));
const km = (a, b) => Math.hypot((a.lat - b.lat) * 111, (a.lon - b.lon) * 111 * Math.cos((a.lat * Math.PI) / 180));
// rough camper drive time: short hops wind along coast roads (1.35× straight line at ~50 km/h);
// longer legs use the highway (1.25× at ~80 km/h); +15% for the van
export const driveMin = (a, b) => { const d = km(a, b); return Math.round((d < 40 ? (d * 1.35) / 50 : (d * 1.25) / 80) * 60 * 1.15); };

const KBONUS = { free: 0.5, rest: 0.5, npws: 0.3, camp: 0.3, park: 0 };
const MORNING = ["Dawn", "Morning"], ARVO = ["Midday", "Arvo", "Evening"], ARVO_LATE = ["Arvo", "Evening"];
const mph = kn => Math.round(kn * 1.151), ftR = m => Math.round(m * 3.28);
const short = n => n.split(/[(—,]/)[0].trim();
const dshort = d => new Date(d + "T12:00:00").toLocaleDateString("en-AU", { weekday: "short", day: "numeric" });
const mins = m => (m < 60 ? `${m} min` : `${Math.floor(m / 60)}h${m % 60 ? " " + String(m % 60).padStart(2, "0") : ""}`);
export const sideOf = c => (c.lat > -33.6 ? "N" : c.lat < -34.0 ? "S" : null);
const SIDE = { N: "north", S: "south" };

const dayHas = (dayResults, day) => { try { const r = dayResults(day); return r && Object.values(r).some(Boolean); } catch (e) { return false; } };

// ---------- conditions test ----------
const facingOf = (s, rep) => (s.type === "spear" ? s.sides?.find(x => x.name === rep?.side) || s.sides?.[0] || { facing: 90 } : s);
function windWord(facing, dir, kn) {
  if (kn < 5) return "light";
  const off = angDiff(dir, facing + 180);
  return off <= 45 ? "offshore" : off <= 70 ? "cross-offshore" : off <= 110 ? "cross-shore" : off <= 135 ? "cross-onshore" : "onshore";
}
// Does this spot's aspect suit this window's swell and wind? → { tier 2 pass | 1 marginal | 0 fail, line, raw, why }
export function verdict(s, w) {
  const rep = w?.rep, c = rep?.ctx; if (!c) return null;
  const f = facingOf(s, rep), facing = f.facing ?? 90, dom = c.dom || { h: c.hs, d: 0, T: 0 };
  // the real swell (8 s+) first if there is one, then the biggest wind chop
  const grd = (c.parts || []).filter(p => p.T >= 8 && p.h > 0.15).sort((a, b) => b.h * b.T * b.T - a.h * a.T * a.T)[0];
  const trains = [grd, (c.parts || []).filter(p => p !== grd && p.h * 3.28 >= 0.8).sort((a, b) => b.h - a.h)[0]].filter(Boolean);
  const sw = (trains.length ? trains : [dom]).map(p => `${card(p.d)} ${ftR(p.h)} ft ${Math.round(p.T)} s${p.T < 8 ? " (chop)" : ""}`).join(" + "), wind = `${card(c.wdir)} ${mph(c.wspd)} mph`;
  const ww = windWord(facing, c.wdir, c.wspd), bits = [], why = [];
  let tier;
  if (s.type === "spear") {
    const U = s.spear?.unsafeAt ?? 1.2, h = rep.hSpot ?? 0, ratio = h / Math.max(0.1, dom.h || c.hs || 0.1);
    const ws = windShelter(facing, f.shelterWind, c.wdir), vis = rep.vis || "OK";
    const swellOk = h <= 0.5 * U, swellBad = !!w.no || h > 0.8 * U;
    const windOk = c.wspd < 8 || ws >= 0.6, windBad = ws < 0.4 && c.wspd > 15;
    const hTxt = ftR(h) < 1 ? "under 1 ft" : `${ftR(h)} ft`;
    bits.push(`${ratio < 0.4 ? "sheltered from" : ratio < 0.7 ? "partly sheltered from" : "open to"} the ${card(dom.d)} swell (${hTxt} at the entry)`);
    bits.push(`${wind} ${ws >= 0.6 && ww !== "offshore" && ww !== "light" ? "blocked by the land" : ww}`);
    bits.push(`vis ${vis}`);
    if (swellBad) why.push(w.no ? `unsafe entry (${hTxt})` : `${hTxt} surging at the entry`); else if (!swellOk) why.push(`some surge (${hTxt} at the entry)`);
    if (windBad) why.push(`${wind} blowing in`); else if (!windOk) why.push(`${wind} ${ww}`);
    if (vis === "poor") why.push("dirty water after rain"); else if (vis !== "good") why.push("vis only OK");
    tier = swellBad || windBad || vis === "poor" ? 0 : swellOk && windOk && vis === "good" ? 2 : 1;
  } else {
    // what's surfable is real swell (8 s+). Short-period wind chop (the NE sea-breeze slop) never makes a good surf.
    const S = s.surf, ftAt = rep.ft ?? 0, lo = S.size[0], max = S.maxSize ?? 7;
    const ground = (c.parts || []).filter(p => p.T >= 8 && p.h > 0.15).sort((a, b) => b.h * b.T * b.T - a.h * a.T * a.T)[0];
    const sw0 = ground || dom, chop = !ground;
    const off = inArc(c.wdir, S.offshore[0], S.offshore[1]), ws = off ? 1 : windShelter(facing, s.shelterWind, c.wdir);
    const dirIn = inArc(sw0.d, S.swellDir[0], S.swellDir[1]);
    const windOk = c.wspd < 6 || (off && c.wspd <= 22) || (ws >= 0.6 && c.wspd < 12), windBad = !off && ws <= 0.3 && c.wspd > 8;
    const sizeOk = ftAt >= lo && ftAt <= max, sizeBad = ftAt < 1 || ftAt > max + 1;
    const periodOk = sw0.T >= (S.periodMin ?? 8); // 8–9 s E swell at 3–4 ft with light wind is a fun surf here
    bits.push(chop ? `only wind chop (${card(dom.d)} ${Math.floor(dom.T)} s, ~${Math.round(ftAt)} ft here)`
      : `${dirIn ? "open to" : "out of the window for"} the ${card(sw0.d)} ${Math.round(sw0.T)} s swell (~${Math.round(ftAt)} ft here)`);
    bits.push(`${wind} ${off ? "offshore" : ww}`);
    if (sizeBad) why.push(ftAt < 1 ? "flat" : `too big (~${Math.round(ftAt)} ft)`); else if (!sizeOk) why.push(ftAt < lo ? `small (~${Math.round(ftAt)} ft)` : `big (~${Math.round(ftAt)} ft)`);
    if (chop) why.push(`no real swell, just ${Math.floor(dom.T)} s wind chop`);
    else { if (!dirIn) why.push(`${card(sw0.d)} swell misses it`); if (!periodOk) why.push(`weak ${Math.round(sw0.T)} s period`); }
    if (windBad) why.push(`${wind} onshore`); else if (!windOk) why.push(`${wind} ${ww}`);
    tier = sizeBad || windBad || (chop && dom.T < 7) ? 0 : sizeOk && dirIn && windOk && periodOk ? 2 : 1;
  }
  const needsCheck = s.conf?.shelter === "low";
  if (needsCheck && tier > 1) { tier = 1; why.push("aspect needs checking"); }
  return { tier, line: `faces ${card(facing)} · ${bits.join(" · ")}`, raw: `Swell ${sw} · Wind ${wind} · faces ${card(facing)}`, why: why.join(", "), needsCheck, swell: sw, wind };
}

// a smooth extra for wind + rain (the tier already did the yes/no): light/offshore wind good, onshore bad; runoff costs dives fully, surf half
function conditions(s, rep) {
  const c = rep?.ctx; if (!c) return 0;
  const facing = facingOf(s, rep).facing ?? 90;
  const off = angDiff(c.wdir, facing + 180), kn = c.wspd;
  const wind = kn < 5 ? 2 : off <= 45 ? 2 : off <= 70 ? 1.2 : off <= 110 ? -0.3 * Math.min(2, kn / 8) : off <= 135 ? -1 * Math.min(2, kn / 8) : -1.6 * Math.min(2, kn / 8);
  const river = s.spear?.river, half = !river ? 1 : { large: 1.6, med: 1.3, small: 1.1 }[river.size] ?? 1.2;
  const rain = -(Math.min(4.5, (c.runoff || 0) * half / 5) + Math.min(2, (c.rain24 || 0) / 8)) * (s.type === "spear" ? 1 : 0.5);
  return wind + rain;
}
// best window for a spot among these labels (memoised per day)
const MEMO = new WeakMap();
function win(r, labels, s) {
  if (!r) return null;
  let m = MEMO.get(r); if (!m) MEMO.set(r, (m = new Map()));
  const key = labels.join();
  if (m.has(key)) return m.get(key);
  // dives in daylight proper: no dawn or dusk (low light, poor vis, sharks feeding)
  const ws = r.windows.filter(w => labels.includes(w.label) && w.score != null && !(s.type === "spear" && (w.label === "Dawn" || w.label === "Evening")));
  let best = null;
  for (const w of ws) {
    const vd = verdict(s, w), val = (w.no ? -99 : 0) + CFG.tierGap * (vd?.tier ?? 0) + 0.5 * w.score + conditions(s, w.rep);
    if (!best || val > best.val) best = { w, vd, val };
  }
  const out = best && { score: best.w.no ? 0 : best.w.score, no: best.w.no, label: best.w.label, ft: best.w.rep?.ft, cond: best.w.no ? 0 : conditions(s, best.w.rep), vd: best.vd };
  m.set(key, out);
  return out;
}
// base quality, used before the forecast reaches a day
const usual = s => (s.type === "spear" ? 5 + (s.spear?.kingfish ?? 0) : 6 + 2 * (s.surf?.quality ?? 0));
const WHEN = 1.5;      // surf at dawn/morning before the sea breeze, dive in the arvo — a nudge, the forecast can override it
const SURF_MIN = 6.5;  // /10 — below this a surf isn't worth planning (that's Surfline yellow/red)
const REPEAT = 8;      // redoing a spot (same stop, next day): worse than a tier drop, so only when nothing else is near
const PROV_TIER = 1.2; // past the forecast: assume a typical day (a bit better than marginal)
// sessions within reach, best first. Forecast days: tier first, then half the rating + the wind/rain extra.
// Past the forecast: squashed reputations (they mustn't decide the route) + the rain already fallen, carried forward.
function sessions(near, res, labels, max, carry) {
  const out = [];
  for (const [id, m] of near) {
    const s = SPOT[id]; if (!s || m > max) continue;
    const w = res ? win(res[id], labels, s) : null;
    if (res && !w) continue;
    const score = w ? w.score : usual(s);
    const base = w ? (w.no ? -5 : CFG.tierGap * (w.vd?.tier ?? 0) + 0.5 * score + w.cond + 2.5)
      : CFG.tierGap * PROV_TIER + 0.5 * (6.5 + 0.35 * (score - 6.5)) + 2.5 + (carry?.[id] || 0);
    const when = (s.type === "surf") === (labels === MORNING) ? WHEN : 0; // surf in the morning, dive in the arvo
    // a surf only makes the plan when it's actually good (Surfline green, not yellow/red): real swell, wind OK, rating SURF_MIN+
    const tier = !w ? null : s.type === "surf" && ((w.vd?.tier ?? 0) < 2 || score < SURF_MIN) ? 0 : w.vd?.tier ?? 0;
    out.push({ id, name: s.name, type: s.type, snorkelOnly: !!s.snorkelOnly, easy: s.easy, min: m, score, no: w?.no, label: w?.label, forecast: !!res,
      tier, vd: w?.vd || null, v: base - m / 30 + when });
  }
  return out.sort((a, b) => b.v - a.v);
}
const nextDay = d => (d === NIGHTS[NIGHTS.length - 1] ? TRIP.end : NIGHTS[NIGHTS.indexOf(d) + 1]);
// spots within 3 km are the same place (Maloneys, the Gravel Loader and Bushrangers are all Bass Point)
const NB = Object.fromEntries(SPOTS.map(a => [a.id, SPOTS.filter(b => km(a, b) < 3).map(b => b.id)]));
const samePlace = (a, b) => a === b || (NB[a] || []).includes(b);
const spDrive = (a, b) => driveMin(SPOT[a.id], SPOT[b.id]);
// one surf + one dive (either order) whose detour off the day's drive fits the cap; if nothing fits, the smallest detour
function pickDay(amList, pmList, detour, cap, noRepeat = true) {
  amList = amList.filter(x => x.tier !== 0); pmList = pmList.filter(x => x.tier !== 0); // never a session that fails the conditions test
  // somewhere new first; a spot already done here only if nothing else fits
  if (noRepeat && (amList.some(x => x.repeat) || pmList.some(x => x.repeat))) {
    const fresh = pickDay(amList.filter(x => !x.repeat), pmList.filter(x => !x.repeat), detour, cap, false);
    if (fresh.am || fresh.pm) return fresh;
  }
  let best = null, fb = null;
  for (const [a, b] of [["surf", "spear"], ["spear", "surf"]]) {
    for (const am of amList.filter(x => x.type === a).slice(0, 8)) {
      for (const pm of pmList.filter(x => x.type === b && !samePlace(x.id, am.id)).slice(0, 8)) {
        const ex = detour(am, pm), v = am.v + pm.v;
        if (ex <= cap) { if (!best || v > best.v) best = { am, pm, v, ex }; }
        else if (!fb || ex < fb.ex || (ex === fb.ex && v > fb.v)) fb = { am, pm, v, ex };
      }
    }
  }
  if (best || fb) return best || fb;
  // no surf worth it: two dives at different places if both are good, else the best single session
  let two = null;
  for (const am of amList.filter(x => x.type === "spear" && x.tier === 2 && !x.repeat).slice(0, 6))
    for (const pm of pmList.filter(x => x.type === "spear" && x.tier === 2 && !x.repeat && !samePlace(x.id, am.id)).slice(0, 6)) {
      const ex = detour(am, pm);
      if (ex <= cap && (!two || am.v + pm.v > two.v)) two = { am, pm, v: am.v + pm.v };
    }
  if (two) return two;
  return pmList[0] ? { pm: pmList[0] } : { am: amList[0] };
}
function nearestSpot(p) { return SPOTS.map(sp => [sp, km(sp, p)]).sort((a, b) => a[1] - b[1])[0][0]; }

export function makePlan(dayResults) {
  const resFor = {};
  for (const d of [...NIGHTS, TRIP.end]) resFor[d] = dayHas(dayResults, d) ? dayResults(d) : null;
  // the latest forecast day we have (often before the trip starts): its runoff, faded forward, for the days beyond it
  let lastDay = null;
  for (let t = Date.parse(TRIP.end + "T12:00:00Z"); t > Date.parse(TRIP.start + "T12:00:00Z") - 14 * 864e5; t -= 864e5) {
    const d = new Date(t).toISOString().slice(0, 10); if (dayHas(dayResults, d)) { lastDay = d; break; }
  }
  const lastRes = lastDay ? dayResults(lastDay) : null;
  const carryFor = {};
  for (const d of [...NIGHTS, TRIP.end]) {
    if (resFor[d] || !lastRes) continue;
    const gapH = (Date.parse(d) - Date.parse(lastDay)) / 36e5, map = {};
    for (const sp of SPOTS) {
      const c = lastRes[sp.id]?.best?.rep?.ctx; if (!c) continue;
      const rv = sp.spear?.river, halfH = !rv ? 30 : { large: 120, med: 72, small: 48 }[rv.size] ?? 60;
      const left = (c.runoff || 0) * 0.5 ** (gapH / halfH), k = !rv ? 1 : { large: 1.6, med: 1.3, small: 1.1 }[rv.size] ?? 1.2;
      map[sp.id] = -Math.min(4.5, left * k / 5) * (sp.type === "spear" ? 1 : 0.5);
    }
    carryFor[d] = map;
  }
  const camps = CAMPS.filter(c => c.near.some(([, m]) => m <= 35));
  const n = camps.length, K = NIGHTS.length;

  // sessions around each camp each night: the arvo near it, and the next morning near it (surf / dive lists, best first)
  const split = l => ({ surf: l.filter(x => x.type === "surf"), spear: l.filter(x => x.type === "spear") });
  const AR = NIGHTS.map(d => camps.map(c => split(sessions(c.near, resFor[d], ARVO, 45, carryFor[d]))));
  const MO = NIGHTS.map(d => camps.map(c => split(sessions(c.near, resFor[nextDay(d)], MORNING, 35, carryFor[nextDay(d)]))));
  const bonus = camps.map(c => KBONUS[c.kind] - (c.dirt ? 0.8 : 0));
  // value of a block (surf + dive average; a missing one costs 3) skipping spots already done at earlier stops
  // P = spots already done at this stop: redoing one costs REPEAT, so stops with a few good spots win
  // X = used at earlier stops (a Set, or two Sets [used, cur]); P = done at this stop; also = done earlier tonight
  const has = (X, id) => (Array.isArray(X) ? X[0].has(id) || X[1].has(id) : X.has(id));
  // failing sessions don't count; a missing surf or dive counts as −2; redoing a spot at the same stop costs REPEAT
  const firstFree = (l, X, P, also) => { let b = null, bv = -Infinity; for (const x of l) { if (x.tier === 0 || has(X, x.id)) continue; const v = x.v - (P.has(x.id) || (also && also.includes(x.id)) ? REPEAT : 0); if (v > bv) { bv = v; b = x; } } return b && { id: b.id, v: bv }; };
  function blockFree(b, X, P, also) {
    const su = firstFree(b.surf, X, P, also), sp = firstFree(b.spear, X, P, also);
    return { v: ((su ? su.v : -2) + (sp ? sp.v : -2)) / 2, ids: [su?.id, sp?.id].filter(Boolean) };
  }
  const nightVal = (k, j, X, P) => { const a = blockFree(AR[k][j], X, P), m = blockFree(MO[k][j], X, P, a.ids); return { v: a.v + m.v + bonus[j], ids: [...a.ids, ...m.ids] }; };
  const EMPTY = new Set();
  // best a night at camp j could possibly be (nothing used yet) — lets the search skip hopeless moves without scoring them
  const ub = NIGHTS.map((d, k) => camps.map((c, j) => nightVal(k, j, EMPTY, EMPTY).v));
  // a 3rd night in one area is only allowed when the forecast there is insane
  const INSANE = 9;
  const insane = NIGHTS.map((d, k) => camps.map((c, j) => {
    const top = l => Math.max(0, ...l.filter(x => x.forecast && !x.no).map(x => x.score));
    return top([...AR[k][j].surf, ...AR[k][j].spear]) >= INSANE || top([...MO[k][j].surf, ...MO[k][j].spear]) >= INSANE;
  }));
  const home = camps.map(c => driveMin(TRIP.home, c));
  const D = camps.map(a => camps.map(b => driveMin(a, b)));
  const side = camps.map(sideOf);
  const TOL = 0.08; // ° latitude (~9 km) of wiggle that doesn't count as a direction
  // does a camp have a session that passes the conditions test (that arvo or the next morning)?
  const passes = b => b.surf.some(x => x.tier === 2) || b.spear.some(x => x.tier === 2);
  const passNight = NIGHTS.map((d, k) => camps.map((c, j) => passes(AR[k][j]) || passes(MO[k][j])));
  // is everything ahead (one way along the coast) poor tonight? [k][i][0 = heading south, 1 = north]
  const fwdPoor = NIGHTS.map((d, k) => camps.map((c, i) => [-1, 1].map(dir => {
    if (!resFor[d]) return false; // no forecast → never a reason to backtrack
    for (let j = 0; j < n; j++) if ((camps[j].lat - c.lat) * dir > TOL && D[i][j] <= CFG.maxMove && passNight[k][j]) return false;
    return true;
  })));
  const dirIx = dir => (dir > 0 ? 1 : 0);

  // night 1 = a powered site (caravan park or a camp with power) so the van's batteries start the trip full
  const powered = c => c.kind === "park" || !!c.f?.power;
  const AREA_KM = 5, BEAM = 200, PER_CAMP = 3;
  const band = camps.map(c => Math.round(c.lat * 10)); // "same place" = camps within 5 km (e.g. two Seal Rocks camps)
  const near = camps.map(a => camps.map(b => km(a, b) < AREA_KM));
  const expand = ids => ids.flatMap(id => NB[id] || [id]);
  // the search is run once heading south first and once heading north first; the better route wins
  // (the two are often close, and one wide search can drop the other way early)
  function search(start) {
  let beam = [];
  camps.forEach((c, i) => {
    if (home[i] > CFG.firstMax || !powered(c) || Math.sign(c.lat - TRIP.home.lat) !== (start === "N" ? 1 : -1)) return;
    const nv = nightVal(0, i, EMPTY, EMPTY);
    beam.push({ r: [i], v: nv.v - CFG.driveCost * home[i] / 60, nN: side[i] === "N" ? 1 : 0, nS: side[i] === "S" ? 1 : 0, used: new Set(), cur: new Set(expand(nv.ids)),
      anchor: i, streak: 1, past: [], leg: side[i], legs: side[i] ? 1 : 0, dir: Math.sign(c.lat - TRIP.home.lat) || 1, turned: false, backs: [] });
  });
  for (let k = 1; k < K; k++) {
    // keep the best PER_CAMP part-routes for each (camp, state) key as we go
    const buckets = new Map();
    // key = ~11 km stretch of coast + route state, so near-identical routes don't crowd out the rest
    const keyOf = (j, nN, nS, dir, turned, legs) => `${band[j]}|${Math.min(nN, 2)}|${Math.min(nS, 2)}|${dir}|${turned}|${legs}`;
    const floor = key => { const b = buckets.get(key); return b && b.length >= PER_CAMP ? b[b.length - 1].v : -Infinity; };
    for (const p of beam) {
      const i = p.r[p.r.length - 1];
      const Xmove = [p.used, p.cur];
      for (let j = 0; j < n; j++) {
        if (k === K - 1 && home[j] > CFG.lastMax) continue;
        if (home[j] > CFG.lastMax + (K - 1 - k) * 200) continue; // must still be able to get home
        const drive = D[i][j]; if (drive > CFG.maxMove) continue;
        if (camps[j].kind === "rest" && km(camps[i], camps[j]) < 3) continue; // rest areas: one night only (incl. the other side of the road)
        // a stop = camps within 5 km of where it started. Stay 1 or 2 nights (3rd only if insane); never return to an earlier stop
        const stay = near[p.anchor][j];
        if (stay && p.streak >= 2 && !insane[k][j]) continue;
        if (!stay && p.past.some(a => near[a][j])) continue;
        let { dir, turned, leg, legs } = p, back = null;
        if (!stay) {
          if (side[j] && side[j] !== leg) {
            // over to the other side of Sydney: a new leg (at most 2), with its own turnaround
            if (legs >= 2) continue;
            leg = side[j]; legs++; turned = false; dir = Math.sign(camps[j].lat - camps[i].lat) || dir;
          } else {
            const dLat = camps[j].lat - camps[p.anchor].lat;
            if (Math.abs(dLat) > TOL && Math.sign(dLat) !== dir) {
              if (!turned) { turned = true; dir = -dir; } // the leg's one turnaround
              else {
                // a backtrack: only if everything ahead is poor tonight, this place passes, and it's a short hop
                if (!(fwdPoor[k][i][dirIx(dir)] && passNight[k][j] && drive <= CFG.backtrackMax)) continue;
                back = { k, from: i, to: j, mins: drive, dir };
              }
            }
          }
        }
        const nN = p.nN + (side[j] === "N" ? 1 : 0), nS = p.nS + (side[j] === "S" ? 1 : 0);
        const both = !(p.nN >= 2 && p.nS >= 2) && nN >= 2 && nS >= 2 ? CFG.bothSides : 0;
        const base = p.v - CFG.driveCost * drive / 60 + both, key = keyOf(j, nN, nS, dir, turned, legs);
        if (base + ub[k][j] <= floor(key)) continue;
        // spots done at earlier stops are off the list; staying put you can redo this stop's spots
        const nv = nightVal(k, j, stay ? p.used : Xmove, stay ? p.cur : EMPTY);
        const x = { p, j, nN, nS, stay, dir, turned, leg, legs, back, ids: nv.ids, v: base + nv.v };
        let b = buckets.get(key); if (!b) buckets.set(key, (b = []));
        if (b.length < PER_CAMP || x.v > b[b.length - 1].v) { b.push(x); b.sort((a, c) => c.v - a.v); if (b.length > PER_CAMP) b.pop(); }
      }
    }
    const next = [...buckets.values()].flat().sort((a, b) => b.v - a.v).slice(0, BEAM);
    beam = next.map(x => ({ r: [...x.p.r, x.j], v: x.v, nN: x.nN, nS: x.nS, used: x.stay ? x.p.used : new Set([...x.p.used, ...x.p.cur]),
      cur: x.stay ? new Set([...x.p.cur, ...expand(x.ids)]) : new Set(expand(x.ids)),
      anchor: x.stay ? x.p.anchor : x.j, streak: x.stay ? x.p.streak + 1 : 1, past: x.stay ? x.p.past : [...x.p.past, x.p.anchor],
      dir: x.dir, turned: x.turned, leg: x.leg, legs: x.legs, backs: x.back ? [...x.p.backs, x.back] : x.p.backs }));
    if (!beam.length) return null;
  }
  return beam[0] || null;
  }
  const tries = (CFG.startSide ? [CFG.startSide] : ["S", "N"]).map(sd => ({ sd, b: search(sd) })).filter(x => x.b);
  if (!tries.length) return { days: [], covered: 0, why: ["Couldn't fit a route with these rules — loosen CFG in src/plan.js."] };
  tries.sort((a, b) => b.b.v - a.b.v);
  const best = tries[0].b, route = best.r, score = best.v;
  const otherWay = tries[1] ? { side: tries[1].sd, gap: best.v - tries[1].b.v } : null;

  // ---------- spell the days out ----------
  const days = [];
  let covered = 0;
  // a spot already used at an earlier stop isn't used again (same stop, next day only if nothing else is near — each repeat costs REPEAT)
  const stopOf = []; route.forEach((r, k) => { stopOf.push(k && near[route[stopOf[k - 1]]][r] ? stopOf[k - 1] : k); });
  const usedAt = new Map(), timesUsed = new Map();
  const fresh = (list, k) => list.filter(x => !usedAt.has(x.id) || usedAt.get(x.id) === stopOf[k])
    .map(x => (usedAt.has(x.id) ? { ...x, v: x.v - REPEAT * (timesUsed.get(x.id) || 1), repeat: true } : x)).sort((a, b) => b.v - a.v);
  const use = (x, k) => { if (x) { for (const id of NB[x.id] || [x.id]) if (!usedAt.has(id)) usedAt.set(id, stopOf[k]); timesUsed.set(x.id, (timesUsed.get(x.id) || 0) + 1); } return x; };
  const backAt = new Map(best.backs.map(b => [b.k, b]));
  const facings = id => (SPOT[id].type === "spear" ? SPOT[id].sides.map(x => x.facing) : [SPOT[id].facing]);
  const facingTxt = id => [...new Set(facings(id).map(card))].join(" & ");
  const diffFacing = (a, b) => facings(a).every(f => facings(b).every(g => angDiff(f, g) >= 60));

  // Bushrangers Bay (snorkel only) goes on day 1, on the way south — unless the Bass Point day later in the plan looks better
  const BR = "bushrangers-bay";
  const bpLater = Math.max(-Infinity, ...route.slice(1).map((j, kk) => {
    const k = kk + 1, l = [...sessions(camps[j].near, resFor[NIGHTS[k]], ARVO, 45, carryFor[NIGHTS[k]]), ...sessions(camps[route[k - 1]].near, resFor[NIGHTS[k]], MORNING, 35, carryFor[NIGHTS[k]])];
    return Math.max(-Infinity, ...l.filter(x => samePlace(x.id, BR)).map(x => x.v));
  }));

  NIGHTS.forEach((d, k) => {
    const j = route[k], c = camps[j], prev = k ? camps[route[k - 1]] : null;
    if (resFor[d]) covered++;
    const out = [], notes = [];
    let amList, pmList, detour;
    if (k === 0) {
      // day 1: pick up at 9am, one session on the way (if the drive leaves time), then the arvo near camp
      notes.push("Pick up the van in Bankstown at 9am.");
      pmList = fresh(sessions(c.near, resFor[d], ARVO_LATE, 45, carryFor[d]), k);
      amList = home[j] > 210 ? [] : fresh(sessions(SPOTS.map(sp => [sp.id, driveMin(TRIP.home, sp)]), resFor[d], ["Morning", "Midday"], CFG.firstMax, carryFor[d]), k)
        .map(x => (x.id === BR ? { ...x, v: x.v + 0.5 } : x))
        .filter(x => x.id !== BR || x.v >= bpLater)
        .filter(x => x.min + driveMin(SPOT[x.id], c) - home[j] <= CFG.dayDetour + 15) // actually on the way
        .sort((a, b) => b.v - a.v);
      detour = (am, pm) => am.min + spDrive(am, pm) + pm.min - home[j];
    } else {
      amList = fresh(sessions(prev.near, resFor[d], MORNING, 35, carryFor[d]), k - 1);
      pmList = fresh(sessions(c.near, resFor[d], ARVO, 45, carryFor[d]), k);
      const stay = stopOf[k] === stopOf[k - 1];
      detour = stay ? (am, pm) => spDrive(am, pm) - 15 : (am, pm) => am.min + spDrive(am, pm) + pm.min - D[route[k - 1]][j];
    }
    const pick = pickDay(amList, pmList, detour, CFG.dayDetour);
    const am = use(pick.am, Math.max(0, k - 1));
    if (am) out.push({ when: k === 0 ? "On the way" : "Morning", ...am });
    const pm = use(pick.pm, k);
    if (pm) out.push({ when: "Arvo", ...pm });
    if (resFor[d]) for (const t of ["spear", "surf"]) {
      if (out.some(x => x.type === t)) continue;
      const near1 = [...amList, ...pmList].filter(x => x.type === t && x.vd).sort((a, b) => b.score - a.score)[0];
      notes.push(`No ${t === "spear" ? "dive" : "surf"} worth it near here today${near1 ? ` — best is ${short(near1.name)} at ${Math.round(near1.score)}/10${near1.vd.why ? ` (${near1.vd.why})` : ""}` : ""}.${t === "surf" ? (out.filter(x => x.type === "spear").length > 1 ? " Two dives instead." : " Dive day.") : ""}`);
    }
    // drive legs: last night's camp (or Bankstown) → morning spot → arvo spot → tonight's camp
    let at = prev ? { name: "camp", pt: prev, isCamp: true } : { name: TRIP.home.name, pt: TRIP.home };
    for (const x of out) {
      const sp = SPOT[x.id];
      x.drive = at.isCamp ? x.min : driveMin(at.pt, sp); x.driveFrom = at.name;
      at = { name: short(sp.name), pt: sp };
    }
    const toCamp = out.length ? (pm ? pm.min : driveMin(at.pt, c)) : null, toCampFrom = out.length ? at.name : null;
    // for the explainer: 2 alternatives that lost (and why), and a dive fallback facing another way
    const picked = out.map(x => x.id);
    const pool = [...amList, ...pmList].filter((x, i, a) => a.findIndex(y => y.id === x.id) === i && !picked.some(p => samePlace(p, x.id)));
    const alts = pool.filter(x => x.forecast).sort((a, b) => b.score - a.score).slice(0, 2).map(x => {
      const mine = out.find(o => o.type === x.type);
      const why = x.repeat ? "already done here — something new instead" : x.vd?.why && mine && x.tier <= mine.tier && x.tier < 2 ? x.vd.why
        : mine && x.min > mine.min + 15 ? `further away (${mins(x.min)})` : "close — the pick edged it on wind, rain or driving";
      return { id: x.id, name: x.name, type: x.type, score: x.score, why };
    });
    const dive = out.find(x => x.type === "spear");
    const fbx = dive ? pool.filter(x => x.type === "spear" && (x.tier ?? 1) >= 1 && diffFacing(x.id, dive.id)).sort((a, b) => b.v - a.v)[0] : null;
    const fallback = fbx ? { id: fbx.id, name: fbx.name, facing: facingTxt(fbx.id), snorkelOnly: fbx.snorkelOnly } : null;
    // provisional days: 2–3 candidates near tonight's camp facing different ways
    let cands = null;
    if (!resFor[d]) {
      cands = out.map(x => ({ id: x.id, name: x.name, type: x.type, snorkelOnly: x.snorkelOnly }));
      for (const x of pool.filter(x => x.min <= 45).sort((a, b) => b.v - a.v)) {
        if (cands.length >= 3) break;
        if (cands.every(o => diffFacing(o.id, x.id))) cands.push({ id: x.id, name: x.name, type: x.type, snorkelOnly: x.snorkelOnly });
      }
      cands = cands.map(o => ({ ...o, facing: facingTxt(o.id) }));
    }
    const vs = out.filter(x => x.vd);
    const brief = vs.length ? `Swell ${[...new Set(vs.map(x => x.vd.swell))].join(" → ")}. Wind ${vs.map(x => `${x.when.toLowerCase()} ${x.vd.wind}`).join(", ")}.` : null;
    const b = backAt.get(k);
    days.push({ day: d, forecast: !!resFor[d], sessions: out, notes, camp: c, power: k === 0, toCamp, toCampFrom,
      drive: k === 0 ? home[j] : D[route[k - 1]][j], from: k === 0 ? TRIP.home.name : null, side: side[j],
      region: nearestSpot(c).region, alts, fallback, cands, brief, back: b ? backText(b) : null,
      total: out.reduce((s, x) => s + (x.drive || 0), 0) + (toCamp || 0) });
  });
  function backText(b) {
    const i = b.from, ahead = camps.map((c, j) => j).filter(j => (camps[j].lat - camps[i].lat) * b.dir > TOL && D[i][j] <= CFG.maxMove).sort((x, y) => D[i][x] - D[i][y]);
    const f = ahead[0];
    const top = f != null ? [...AR[b.k][f].surf, ...AR[b.k][f].spear].sort((x, y) => y.score - x.score)[0] : null;
    return { mins: b.mins, text: `${dshort(NIGHTS[b.k])}: backtracks ${mins(b.mins)} ${b.dir > 0 ? "south" : "north"} to ${camps[b.to].name} — nothing ahead is working${f != null ? ` (nearest ahead, around ${short(nearestSpot(camps[f]).name)}: ${top?.vd?.why || "no good sessions"})` : ""}.` };
  }
  // last day: morning session, then the van back by 2pm
  const lastJ = route[K - 1], last = camps[lastJ], backMin = home[lastJ];
  const amL = fresh(sessions(last.near, resFor[TRIP.end], MORNING, 35, carryFor[TRIP.end]), K - 1)[0];
  const leaveMin = Math.floor((TRIP.dropOff * 60 - backMin - 20) / 15) * 15, lh = Math.floor(leaveMin / 60), lm = leaveMin % 60;
  const leave = `${lh % 12 || 12}${lm ? ":" + String(lm).padStart(2, "0") : ""}${lh >= 12 ? "pm" : "am"}`;
  days.push({ day: TRIP.end, forecast: !!resFor[TRIP.end], sessions: amL ? [{ when: "Morning", ...amL, drive: amL.min, driveFrom: "camp" }] : [],
    notes: [`Leave by ${leave} — van back in Bankstown at 2pm (~${Math.round(backMin / 6) / 10} h).`], side: side[lastJ], region: nearestSpot(last).region,
    total: (amL ? amL.min * 2 : 0) + backMin, alts: [], cands: !resFor[TRIP.end] && amL ? [{ id: amL.id, name: amL.name, type: amL.type, snorkelOnly: amL.snorkelOnly, facing: facingTxt(amL.id) }] : null,
    brief: amL?.vd ? `Swell ${amL.vd.swell}. Wind morning ${amL.vd.wind}.` : null });

  const why = explain({ route, camps, days, resFor, AR, passNight, D, home, TOL, otherWay });
  return { days, covered, why, home: TRIP.home, score };
}

// ---------- plain-English "why this plan" ----------
function explain({ route, camps, days, resFor, AR, passNight, D, home, TOL, otherWay }) {
  const why = [];
  const nights = NIGHTS.map((d, k) => ({ d, k, j: route[k], c: camps[route[k]], s: sideOf(camps[route[k]]) }));
  // legs: runs of nights on one side of Sydney
  const legs = [];
  for (const x of nights) {
    const s = x.s || legs[legs.length - 1]?.s || (x.c.lat < TRIP.home.lat ? "S" : "N");
    if (!legs.length || legs[legs.length - 1].s !== s) legs.push({ s, nights: [] });
    legs[legs.length - 1].nights.push(x);
  }
  // 1. which way first, and why: compare the two coasts over the first trip days the forecast covers
  const first = legs[0].s, other = first === "N" ? "S" : "N";
  const early = NIGHTS.slice(0, 3).filter(d => resFor[d]);
  const lat0 = nights[0].c.lat;
  const where = lat0 < -36 ? "far south coast" : lat0 < -35 ? "south coast" : lat0 < -34 ? "Illawarra / Shoalhaven" : lat0 < -32.6 ? "Central Coast / Newcastle" : lat0 < -31.5 ? "mid north coast" : "far north (Port Macquarie and up)";
  const start = `Heads ${SIDE[first]} first — night 1 on the ${where} (${short(nearestSpot(nights[0].c).name)})`;
  if (!early.length) why.push(`${start}. The forecast doesn't reach ${dshort(NIGHTS[0])} yet, so for now it's going on each spot's usual quality — this will change once the real forecast is in.`);
  else {
    const stat = sd => {
      const pass = [], rain = [];
      for (const d of early) {
        const res = resFor[d];
        for (const sp of SPOTS) {
          if (sideOf(sp) !== sd || !res[sp.id]) continue;
          const vs = res[sp.id].windows.filter(w => w.score != null && w.rep).map(w => verdict(sp, w)).filter(Boolean);
          if (!vs.length) continue;
          pass.push(vs.some(v => v.tier === 2) ? 1 : 0);
          const c = res[sp.id].best?.rep?.ctx; if (c) rain.push(c.runoff || 0);
        }
      }
      const avg = a => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
      return { pass: avg(pass), rain: avg(rain) };
    };
    const a = stat(first), b = stat(other), span = early.length > 1 ? `${dshort(early[0])}–${dshort(early[early.length - 1])}` : dshort(early[0]);
    const r = [];
    if (a.pass != null && b.pass != null && a.pass > b.pass + 0.08) r.push(`more spots are working there (${Math.round(a.pass * 100)}% vs ${Math.round(b.pass * 100)}% ${SIDE[other]})`);
    if (a.rain != null && b.rain != null && a.rain < b.rain * 0.7 - 1) r.push(`to get away from the rain (runoff ${Math.round(a.rain)} vs ${Math.round(b.rain)} ${SIDE[other]})`);
    const close = otherWay && otherWay.gap < 3 ? ` Heading ${SIDE[otherWay.side]} first is almost as good — this can flip as the forecast updates.` : "";
    if (r.length) why.push(`${start}: ${r.join("; and ")} (${span}).${close}`);
    else why.push(`${start} — both coasts look about the same for ${span} (${a.pass != null ? Math.round(a.pass * 100) : "–"}% vs ${b.pass != null ? Math.round(b.pass * 100) : "–"}% of spots working), so it goes the way that works out best over the whole trip.${close}`);
  }
  // 2. where each leg turns, and why it doesn't go further
  for (const L of legs) {
    const out = L.s === "S" ? -1 : 1; // outward = away from Sydney
    const far = L.nights.reduce((m, x) => (x.c.lat * out > m.c.lat * out ? x : m), L.nights[0]);
    const dates = `${dshort(L.nights[0].d)}–${dshort(L.nights[L.nights.length - 1].d)}`;
    const i = far.j, k = far.k;
    const further = camps.map((c, j) => j).filter(j => (camps[j].lat - far.c.lat) * out > TOL && D[i][j] <= CFG.maxMove).sort((x, y) => D[i][x] - D[i][y]);
    let reason;
    if (!further.length) reason = "it's the end of our spot list that way";
    else if (!resFor[far.d]) reason = `the forecast doesn't reach ${dshort(far.d)} yet — it can still move further ${SIDE[L.s]} once it does`;
    else {
      const ok = further.filter(j => passNight[k][j] && km(camps[j], far.c) > 25);
      const fj = further[0], top = [...AR[k][fj].surf, ...AR[k][fj].spear].sort((x, y) => y.score - x.score)[0];
      reason = !ok.length ? `nothing further ${SIDE[L.s]} is working on ${dshort(far.d)}${top?.vd?.why ? ` (around ${short(nearestSpot(camps[fj]).name)}: ${top.vd.why})` : ""}`
        : `further ${SIDE[L.s]} (around ${short(nearestSpot(camps[ok[0]]).name)}) looks good too, but the extra driving there and back costs more than it gains`;
    }
    const legDays = days.filter(e => e.day >= L.nights[0].d && e.day <= L.nights[L.nights.length - 1].d);
    const hrs = Math.round(legDays.reduce((s, e) => s + (e.total || 0), 0) / 6) / 10;
    why.push(`${SIDE[L.s][0].toUpperCase() + SIDE[L.s].slice(1)} leg (${dates}, ${L.nights.length} night${L.nights.length > 1 ? "s" : ""}): furthest point ${short(nearestSpot(far.c).name)} on ${dshort(far.d)} — ${reason}. About ${hrs} h of driving.`);
  }
  if (legs.length === 1) {
    const sk = legs[0].s === "N" ? "S" : "N";
    why.push(`Skips the ${SIDE[sk]} — it doesn't beat staying ${SIDE[legs[0].s]}${resFor[NIGHTS[0]] ? "" : " (on usual quality until the forecast is in)"}.`);
  }
  const lastDay = days[days.length - 1];
  why.push(`Last night is ${Math.round(home[route[route.length - 1]] / 6) / 10} h from Bankstown — ${lastDay.notes[0].split(" — ")[0].toLowerCase()} on the 31st for the 2pm drop-off.`);
  // 3. backtracks
  const backs = days.filter(e => e.back);
  if (backs.length) for (const e of backs) why.push(`Backtrack — ${e.back.text}`);
  else why.push("No backtracking beyond each leg's one turnaround.");
  return why;
}

export { KIND };
