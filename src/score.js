// COAST CALL — scoring
// All the knobs you might want to tune are in WEIGHTS and LIMITS at the top.
// Each score is 0–10 and comes with plain-English reasons.

import { tideAt, tideEventsOn, SPRINGS } from "../data/tides.js";

// Points available for each part of the score. Each set adds up to 10.
// Tide is a big factor: spear is best within ~2 h either side of high; surf follows each spot's preferred tide.
export const WEIGHTS = {
  spear: { shelter: 3.5, energy: 1.6, rain: 2.5, trend: 0.7, tide: 1.3, kingfish: 0.4 },
  surf: { size: 3.2, period: 1.8, wind: 2.7, dir: 0.8, tide: 1.5 },
};

export const LIMITS = {
  calmSpot: 1.2,      // m of swell reaching a spear spot that uses up all the "energy" points
  rainBad: 15,        // mm of "runoff" (decayed rain × river influence) that wipes out the rain points
  rainCaps: [[10, 6], [20, 4], [35, 2]], // runoff mm → spear score cap (dirty / very dirty / river in flood)
  trendBad: 1.2,      // m: rough water at the spot in the last 48 h above this kills the trend points
  gustDanger: 30,     // kn gusts: cap spear scores at 2
  chopWind: 12,       // kn of unsheltered wind before spear chop penalty starts
  shortPeriod: 7,     // s: surf below this period is mushy wind swell…
  shortPeriodCap: 6,  // …and can score at most this
  strongCurrent: 3,   // km/h of modelled current that makes a shore dive risky (spear capped at 4)
  sharkKm: 5,         // shark sighting/detection within this many km…
  sharkHours: 24,     // …in the previous this-many hours costs points
};

// Recent shark activity (from the live SharkSmart feeds), set by the app: [{ lat, lon, t, kind, species, beach }]
let SHARKS = [];
export const setSharks = list => { SHARKS = Array.isArray(list) ? list : []; };
const kmBetween = (a, b, c, d) => Math.hypot((a - c) * 111, (b - d) * 111 * Math.cos((a * Math.PI) / 180));
export function sharksNear(lat, lon, km, sinceMs, untilMs = Infinity) {
  return SHARKS.filter(x => x.t >= sinceMs && x.t <= untilMs && kmBetween(lat, lon, x.lat, x.lon) <= km)
    .map(x => ({ ...x, km: kmBetween(lat, lon, x.lat, x.lon) })).sort((a, b) => b.t - a.t);
}
function sharkPenalty(spot, c, kind, parts) {
  const t = c.date.getTime();
  const hit = sharksNear(spot.lat, spot.lon, LIMITS.sharkKm, t - LIMITS.sharkHours * 36e5, t)[0];
  if (!hit) return 0;
  const pen = kind === "spear" ? -1.5 : -1;
  const ago = Math.max(1, Math.round((t - hit.t) / 36e5));
  parts.push({ tag: "shark", text: `${hit.species ? hit.species + " shark" : "shark"} ${hit.kind === "tagged" ? "detected" : hit.kind === "drumline" ? "tagged on a drumline" : "sighted"} at ${hit.beach} (${hit.km.toFixed(1)} km, ${ago} h before)`, pts: pen });
  return pen;
}

// 3-hour daylight windows (start hour, end hour)
export const WINDOWS = [[5, 8, "Dawn"], [8, 11, "Morning"], [11, 14, "Midday"], [14, 17, "Arvo"], [17, 20, "Evening"]];

// ---------------- helpers ----------------
const norm = d => ((d % 360) + 360) % 360;
export const angDiff = (a, b) => { const d = Math.abs(norm(a) - norm(b)); return d > 180 ? 360 - d : d; };
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const r1 = x => Math.round(x * 10) / 10;
// swell heights are shown in feet (scoring stays in metres)
export const ft = m => { const f = m * 3.28; return `${f < 3 ? f.toFixed(1) : Math.round(f)} ft`; };
const COMPASS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
export const card = d => COMPASS[Math.round(norm(d) / 22.5) % 16];
export function inArc(d, from, to) {
  d = norm(d); from = norm(from); to = norm(to);
  return from <= to ? d >= from && d <= to : d >= from || d <= to;
}
// Shelter amount 0–1 from [from,to,amount] ranges, with a soft 12° edge.
export function shelterAt(ranges = [], dir) {
  let best = 0;
  for (const [a, b, amt = 1] of ranges) {
    let k = 0;
    if (inArc(dir, a, b)) k = 1;
    else { const e = Math.min(angDiff(dir, a), angDiff(dir, b)); k = e < 12 ? 1 - e / 12 : 0; }
    best = Math.max(best, k * amt);
  }
  return best;
}
// Fraction of one swell train that actually reaches the spot.
// Long-period swell wraps further round headlands, so shelter credit drops as period rises.
export function swellReach(facing, extra, dir, period) {
  const wrap = clamp((period - 8) * 4, 0, 25);
  const d = Math.max(0, angDiff(dir, facing) - wrap);
  // some energy always refracts into the lee: floor of ~12% exposure, and land shelter never blocks more than 85%
  const exposure = d <= 35 ? 1 : d >= 115 ? 0.12 : 1 - ((d - 35) / 80) * 0.88;
  const wrapFactor = 1 - clamp((period - 10) * 0.07, 0, 0.45);
  const sh = Math.min(0.85, shelterAt(extra, dir) * wrapFactor);
  // floor: refraction/diffraction always gets some energy in, more for long-period groundswell
  const floor = 0.08 + 0.02 * clamp(period - 8, 0, 8);
  return Math.max(exposure * (1 - sh), floor);
}
// 0 = wind blowing straight onto the spot, 1 = fully sheltered (offshore or blocked by land).
export function windShelter(facing, extra, dir) {
  const off = angDiff(dir, facing + 180);
  const geo = off <= 50 ? 1 : off >= 140 ? 0 : 1 - (off - 50) / 90;
  return Math.max(geo, shelterAt(extra, dir));
}
export function hSpotAt(facing, extra, parts) {
  let s = 0;
  for (const p of parts) if (p.h > 0) { const k = swellReach(facing, extra, p.d, p.T); s += (p.h * k) ** 2; }
  return Math.sqrt(s);
}
export const fmtTime = d => {
  let h = d.getHours(), m = d.getMinutes(); const ap = h >= 12 ? "pm" : "am"; h = h % 12 || 12;
  return `${h}${m ? ":" + String(m).padStart(2, "0") : ""}${ap}`;
};
const dominant = parts => parts.filter(p => p.h > 0).sort((a, b) => b.h - a.h)[0] || { h: 0, d: 0, T: 0 };

// ---------------- local rules ----------------
function ruleMatches(w, c, sideIdx, rule) {
  if (rule.side != null && rule.side !== sideIdx) return false;
  if (w.swellDir && !inArc(c.dom.d, w.swellDir[0], w.swellDir[1])) return false;
  if (w.swellMin != null && c.hs < w.swellMin) return false;
  if (w.swellMax != null && c.hs > w.swellMax) return false;
  if (w.periodMin != null && c.dom.T < w.periodMin) return false;
  if (w.periodMax != null && c.dom.T > w.periodMax) return false;
  if (w.windDir && !inArc(c.wdir, w.windDir[0], w.windDir[1])) return false;
  if (w.windMax != null && c.wspd > w.windMax) return false;
  if (w.tide) {
    const t = c.tide; if (!t) return false;
    if (w.tide === "rising" && !t.rising) return false;
    if (w.tide === "falling" && t.rising) return false;
    if (["high", "low", "mid"].includes(w.tide) && t.state !== w.tide) return false;
  }
  if (w.hours && (c.hour < w.hours[0] || c.hour >= w.hours[1])) return false;
  return true;
}
function applyRules(spot, kind, sideIdx, c, score, out) {
  let cap = 10;
  for (const r of spot.rules || []) {
    if (!ruleMatches(r.when || {}, c, sideIdx, r)) continue;
    const t = r.then || {};
    const isLocal = /^https?:/.test(r.src || "") || /^local/i.test(r.why);
    const tag = isLocal ? "local rule" : "site rule";
    if (t[kind]) { score += t[kind]; out.push({ tag, text: r.why, pts: t[kind] }); }
    const capK = kind + "Cap";
    if (t[capK] != null) { cap = Math.min(cap, t[capK]); out.push({ tag, text: r.why, cap: t[capK] }); }
  }
  return Math.min(score, cap);
}

// ---------------- tides ----------------
// Jacob's BOM tables cover the trip (21–31 Oct). Outside them we use the model sea-level curve for that spot
// (Open-Meteo, relative to mean sea level; +0.92 m puts it roughly on chart datum like the tables).
const DATUM = 0.92;
function modelEvents(fc) {
  if (fc._tev) return fc._tev;
  const ev = [], y = fc.sea || [];
  for (let i = 1; i < y.length - 1; i++) {
    const a = y[i - 1], b = y[i], c = y[i + 1];
    if (a == null || b == null || c == null) continue;
    const hi = b >= a && b > c, lo = b <= a && b < c;
    if (!hi && !lo) continue;
    const den = a - 2 * b + c, off = den ? clamp((a - c) / (2 * den), -0.5, 0.5) : 0;
    ev.push({ time: new Date(Date.parse(fc.time[i] + fc.tz) + off * 36e5), type: hi ? "H" : "L", h: r1(b - ((a - c) * off) / 4 + DATUM) });
  }
  return (fc._tev = ev);
}
function modelTideAt(fc, date) {
  const ev = modelEvents(fc), t = date.getTime();
  for (let i = 0; i < ev.length - 1; i++) {
    const a = ev[i], b = ev[i + 1], ta = a.time.getTime(), tb = b.time.getTime();
    if (t >= ta && t <= tb) {
      const f = (t - ta) / (tb - ta);
      const h = a.h + (b.h - a.h) * (1 - Math.cos(Math.PI * f)) / 2;
      const state = f < 0.17 ? (a.type === "H" ? "high" : "low") : f > 0.83 ? (b.type === "H" ? "high" : "low") : "mid";
      return { h, rising: b.type === "H", state, prev: a, next: b, model: true };
    }
  }
  return null;
}
export const tideFor = (spot, fc, date) => tideAt(spot.tide || "A", date) || (fc ? modelTideAt(fc, date) : null);
export function tideEventsFor(spot, fc, day) {
  const t = tideEventsOn(spot.tide || "A", day);
  return t.length ? t : fc ? modelEvents(fc).filter(e => new Date(e.time.getTime() + 11 * 36e5).toISOString().startsWith(day)) : [];
}
// hours to the nearest high / low tide
function tideGaps(t, date) {
  const now = date.getTime(), d = e => Math.abs(e.time.getTime() - now) / 36e5;
  const ev = [t.prev, t.next];
  return { hi: Math.min(...ev.filter(e => e.type === "H").map(d), 99), lo: Math.min(...ev.filter(e => e.type === "L").map(d), 99) };
}
// 0–1 fit of the tide right now to what the spot wants
function tideFit(t, date, kind, prefs) {
  if (!t) return { k: 0.5, why: "tide unknown" };
  const g = tideGaps(t, date);
  if (kind === "spear") {
    if (g.hi <= 2) return { k: 1, why: `within 2 h of high — cleaner, deeper water` };
    if (g.lo <= 1.5) return { k: 0.15, why: `around low tide — shallow, often dirtier` };
    return t.rising ? { k: 0.7, why: `incoming, ${r1(g.hi)} h to high` } : { k: 0.4, why: `outgoing, ${r1(g.lo)} h to low` };
  }
  const want = prefs.includes("all") || (prefs.includes("low") && prefs.includes("mid") && prefs.includes("high")) ? ["all"] : prefs;
  if (want.includes("all")) return { k: 1, why: "works on all tides" };
  let k = 0;
  if (want.includes("high")) k = Math.max(k, g.hi <= 2 ? 1 : g.hi <= 4 ? 1 - (g.hi - 2) * 0.35 : 0.3);
  if (want.includes("low")) k = Math.max(k, g.lo <= 2 ? 1 : g.lo <= 4 ? 1 - (g.lo - 2) * 0.35 : 0.3);
  if (want.includes("mid")) k = Math.max(k, g.hi > 1.5 && g.lo > 1.5 ? 1 : 0.5);
  return { k: Math.max(0.2, k), why: `best ${want.join("/")} tide` };
}

// ---------------- context for one hour ----------------
// fc = this spot's forecast series (see data.js), i = hour index
export function hourCtx(spot, fc, i) {
  const parts = [
    { h: fc.p1h[i], d: fc.p1d[i], T: fc.p1T[i], name: "swell" },
    { h: fc.p2h[i], d: fc.p2d[i], T: fc.p2T[i], name: "2nd swell" },
    { h: fc.wwh[i], d: fc.wwd[i], T: fc.wwT[i], name: "wind swell" },
  ].filter(p => p.h != null && p.d != null && p.T != null);
  const date = new Date(fc.time[i] + fc.tz);
  let rain72 = 0, rain7d = 0;
  const pre = fc.rainPre || [], rainH = k => (k >= 0 ? fc.rain[k] || 0 : pre[pre.length + k] || 0);
  for (let k = i - 1; k >= i - 168; k--) { const r = rainH(k); rain7d += r; if (k >= i - 72) rain72 += r; }
  // runoff memory: rain fades from the water faster near a creek than near a big river (half-life in hours)
  const rv = spot.spear?.river, half = !rv ? 30 : { large: 120, med: 72, small: 48 }[rv.size] ?? 60;
  let runoff = 0; for (let k = i - 1; k >= i - 168; k--) runoff += rainH(k) * 0.5 ** ((i - k) / half);
  return {
    i, time: fc.time[i], date, hour: +fc.time[i].slice(11, 13),
    hs: fc.hs[i] ?? 0, parts, dom: dominant(parts),
    wspd: fc.wspd[i] ?? 0, wdir: fc.wdir[i] ?? 0, gust: fc.gust[i] ?? 0,
    rain72, rain7d, runoff, sst: fc.sst[i], cur: fc.cur?.[i] ?? null, curDir: fc.curDir?.[i] ?? null, tide: tideFor(spot, fc, date),
  };
}
function tideText(t) {
  if (!t) return "tide: unknown";
  const n = t.next;
  return `${t.state === "mid" ? (t.rising ? "rising" : "falling") : t.state + " tide"}, ${n.type === "H" ? "high" : "low"} ${fmtTime(n.time)}${t.model ? " (model)" : ""}`;
}
function springNote(c) {
  const d = c.time.slice(0, 10);
  return d >= SPRINGS.from && d <= SPRINGS.to ? " Spring tides (full moon 26 Oct)." : "";
}

// ---------------- SPEAR ----------------
// Scores one side of a spear spot for one hour. maxRecent = biggest swell at this side in the previous 48 h.
function spearSide(spot, side, sideIdx, c, maxRecent, lead) {
  const W = WEIGHTS.spear, P = spot.spear, parts = [];
  const hSpot = hSpotAt(side.facing, side.shelterSwell, c.parts);
  const swellBlock = c.hs > 0.05 ? clamp(1 - hSpot / c.hs) : 1;
  const ws = windShelter(side.facing, side.shelterWind, c.wdir);
  const windCalm = c.wspd < 6 ? 1 : c.wspd < 10 ? Math.max(ws, 0.7) : ws;

  // 1. shelter (generic rule)
  const shelterPts = (W.shelter / 2) * swellBlock + (W.shelter / 2) * windCalm;
  let shelterWord;
  if (swellBlock >= 0.75 && windCalm >= 0.75) shelterWord = "in the lee of both swell and wind — expect clean water";
  else if (swellBlock >= 0.75) shelterWord = "sheltered from the swell but exposed to the wind (partial credit)";
  else if (windCalm >= 0.75) shelterWord = "sheltered from the wind but the swell gets in (partial credit)";
  else shelterWord = "exposed to both swell and wind";
  parts.push({ tag: "generic rule", text: `${side.name}: ${shelterWord}`, pts: shelterPts, max: W.shelter });

  // 3. energy reaching the spot (+ wind chop)
  let energyPts = W.energy * (1 - clamp(hSpot / LIMITS.calmSpot));
  const effWind = c.wspd * (1 - ws);
  if (effWind > LIMITS.chopWind) energyPts -= clamp((effWind - LIMITS.chopWind) / 10) * 1.5;
  parts.push({ tag: "energy", text: `~${ft(hSpot)} of swell reaching the spot${effWind > LIMITS.chopWind ? `, ${Math.round(effWind * 1.151)} mph of wind chop` : ""}`, pts: energyPts, max: W.energy });

  // 4. rain + river runoff
  const rv = P.river;
  const sizeK = rv ? { large: 1, med: 0.75, small: 0.5 }[rv.size] ?? 0.6 : 0;
  const distK = rv ? (rv.km < 1 ? 1 : rv.km < 3 ? 0.8 : rv.km < 8 ? 0.5 : 0.3) : 0;
  const riverK = 0.35 + 0.65 * sizeK * distK;
  // rain is the biggest thing for vis: decayed runoff × how close/big the river is
  const wet = c.runoff * riverK;
  const rainPts = W.rain * (1 - clamp(wet / LIMITS.rainBad));
  parts.push({ tag: "rain", text: `${Math.round(c.rain72)} mm rain in 3 days, ${Math.round(c.rain7d)} mm in 7${rv ? ` (${rv.name} ${rv.km} km${rv.size === "large" ? " — big river, runoff lasts days" : ""})` : ""}`, pts: rainPts, max: W.rain });

  // 5. trend: was it rough here in the last 48 h?
  const trendPts = W.trend * (1 - clamp((maxRecent - 0.5) / LIMITS.trendBad));
  parts.push({ tag: "trend", text: maxRecent > 0.8 ? `rough here recently (up to ${ft(maxRecent)}) — vis may still be settling` : `settled for the last 2 days (max ${ft(maxRecent)})`, pts: trendPts, max: W.trend });

  // 6. tide: ±2 h around high is best (cleaner, deeper, fish push in)
  const t = c.tide, tf = tideFit(t, c.date, "spear");
  const tidePts = W.tide * tf.k;
  parts.push({ tag: "tide", text: `${tideText(t)} — ${tf.why}${springNote(c)}`, pts: tidePts, max: W.tide });

  // 7. kingfish: the spot's reputation, warm water (19–23°) and some current running past the point
  const sstK = c.sst == null ? 0.7 : c.sst >= 19 && c.sst <= 23 ? 1 : c.sst >= 17.5 ? 0.65 : c.sst > 23 ? 0.8 : 0.35;
  const curK = c.cur == null ? 0.7 : c.cur >= 0.3 && c.cur <= 1.8 ? 1 : c.cur < 0.3 ? 0.6 : 0.75;
  const kPts = W.kingfish * (P.kingfish / 3) * (0.4 + 0.3 * sstK + 0.3 * curK);
  parts.push({ tag: "kingfish", text: `kingfish ${P.kingfish}/3 here · water ${c.sst != null ? Math.round(c.sst) + "°" : "?"}${c.cur != null ? ` · current ${r1(c.cur * 0.54)} kn` : ""}`, pts: kPts, max: W.kingfish });

  let score = shelterPts + energyPts + rainPts + trendPts + tidePts + kPts;
  score += sharkPenalty(spot, c, "spear", parts);
  const rc = LIMITS.rainCaps.filter(([mm]) => wet >= mm).pop();
  if (rc) { score = Math.min(score, rc[1]); parts.push({ tag: "rain", text: rc[1] <= 2 ? `heavy rain — ${rv ? rv.name : "runoff"} likely in flood, vis near nil` : rc[1] <= 4 ? "lots of recent rain — water likely dirty" : "recent rain — expect some dirty water", cap: rc[1] }); }
  score = applyRules(spot, "spear", sideIdx, c, score, parts);
  if (c.cur != null && c.cur > LIMITS.strongCurrent) { score = Math.min(score, 4); parts.push({ tag: "safety", text: `strong current (~${r1(c.cur * 0.54)} kn)`, cap: 4 }); }
  if (c.gust > LIMITS.gustDanger) { score = Math.min(score, 2); parts.push({ tag: "safety", text: `gusts ${Math.round(c.gust * 1.151)} mph`, cap: 2 }); }

  // automatic NO
  let no = null;
  if (hSpot > P.unsafeAt) { no = `Unsafe: ${ft(hSpot)} at the entry (limit ${ft(P.unsafeAt)})`; score = 0; }

  // visibility estimate (can't be forecast directly)
  const visK = 0.6 * (rainPts / W.rain) + 0.25 * (trendPts / W.trend) + 0.15 * clamp(1 - hSpot / LIMITS.calmSpot);
  const vis = visK >= 0.7 ? "good" : visK >= 0.45 ? "OK" : "poor";
  const visConf = lead >= 5 || (rv && rv.size === "large" && c.rain7d > 15) ? "low" : "med";
  const visWhy = wet > 8 ? `${rv ? rv.name + " runoff" : "runoff"} after ${Math.round(c.rain7d)} mm this week` : maxRecent > 1 ? "recent swell still settling" : hSpot < 0.4 ? "calm and settled" : "some surge at the spot";

  const short = swellBlock >= 0.75 && windCalm >= 0.75 ? "Sheltered, clean" : swellBlock >= 0.75 ? "Sheltered, a bit windy" : windCalm >= 0.75 ? "Out of the wind, some surge" : "Exposed";
  const reason = no ? `Unsafe: ${ft(hSpot)} at the entry` : `${short} · ${ft(hSpot)} · vis ${vis}`;
  return { score: clamp(score, 0, 10), no, hSpot, side: side.name, parts, reason, vis, visConf, visWhy };
}

export function spearHour(spot, fc, i, recentBySide, lead) {
  const c = hourCtx(spot, fc, i);
  let best = null;
  spot.sides.forEach((side, k) => {
    const r = spearSide(spot, side, k, c, recentBySide[k], lead);
    if (!best || r.score > best.score) best = r;
  });
  return { ...best, ctx: c };
}

// ---------------- SURF ----------------
export function surfHour(spot, fc, i) {
  const c = hourCtx(spot, fc, i), W = WEIGHTS.surf, S = spot.surf, parts = [];
  const hSpot = hSpotAt(spot.facing, spot.shelterSwell, c.parts);
  const dom = c.dom;
  const ft = hSpot * 3.28 * (0.6 + 0.04 * (dom.T || 8));
  const [lo, hi] = S.size;

  let sizePts;
  if (ft < lo) sizePts = W.size * clamp((ft - 0.5) / (lo - 0.5));
  else if (ft <= hi) sizePts = W.size;
  else if (ft <= S.maxSize) sizePts = W.size * 0.75;
  else sizePts = W.size * 0.75 * clamp(1 - (ft - S.maxSize) / 2);
  parts.push({ tag: "size", text: `~${r1(ft)} ft at the spot (ideal ${lo}–${hi} ft)`, pts: sizePts, max: W.size });

  const periodPts = W.period * clamp((dom.T - 6) / (S.periodMin + 2 - 6));
  parts.push({ tag: "period", text: `${Math.round(dom.T)} s period`, pts: periodPts, max: W.period });

  const offshore = inArc(c.wdir, S.offshore[0], S.offshore[1]);
  const ws = offshore ? 1 : windShelter(spot.facing, spot.shelterWind, c.wdir);
  let windPts = W.wind * (1 - (1 - ws) * clamp((c.wspd - 4) / 14));
  if (offshore && c.wspd > 22) windPts *= 0.6;
  const windWord = c.wspd < 5 ? "glassy" : offshore ? "offshore" : ws > 0.6 ? "sheltered/cross-off" : ws > 0.3 ? "cross-shore" : "onshore";
  parts.push({ tag: "wind", text: `${card(c.wdir)} ${Math.round(c.wspd * 1.151)} mph — ${windWord}`, pts: windPts, max: W.wind });

  const dirOk = inArc(dom.d, S.swellDir[0], S.swellDir[1]);
  const dirPts = dirOk ? W.dir : W.dir * 0.3;
  parts.push({ tag: "direction", text: `${card(dom.d)} swell ${dirOk ? "in" : "outside"} the spot's window`, pts: dirPts, max: W.dir });

  const t = c.tide, tf = tideFit(t, c.date, "surf", S.tide);
  const tidePts = W.tide * tf.k;
  parts.push({ tag: "tide", text: `${tideText(t)} — ${tf.why}${springNote(c)}`, pts: tidePts, max: W.tide });

  let score = sizePts + periodPts + windPts + dirPts + tidePts;
  score += sharkPenalty(spot, c, "surf", parts);
  score = applyRules(spot, "surf", 0, c, score, parts);
  if (ft > S.maxSize + 1) { score = Math.min(score, 3); parts.push({ tag: "safety", text: `too big for us (~${Math.round(ft)} ft)`, cap: 3 }); }
  if (ft < 1) { score = Math.min(score, 2); parts.push({ tag: "size", text: "basically flat", cap: 2 }); }
  if (dom.T < LIMITS.shortPeriod && ft >= 1) { score = Math.min(score, LIMITS.shortPeriodCap); parts.push({ tag: "period", text: `short-period wind swell (${Math.round(dom.T)} s) — mushy`, cap: LIMITS.shortPeriodCap }); }

  const lo2 = Math.max(0, Math.floor(ft)), hi2 = Math.max(1, Math.ceil(ft));
  const reason = `${lo2 === hi2 ? hi2 : lo2 + "–" + hi2} ft · ${Math.round(dom.T)} s · ${windWord}`;
  return { score: clamp(score, 0, 10), ft, hSpot, parts, reason, ctx: c };
}

// ---------------- windows & days ----------------
// Forecast confidence drops with lead time.
// Score for one exact forecast hour (surf or spear), used by the 3-hourly table.
export function scoreHourAt(spot, fc, i, lead) {
  if (i < 0 || i >= fc.time.length || fc.hs[i] == null || fc.wspd[i] == null) return null;
  if (spot.type !== "spear") return surfHour(spot, fc, i);
  const hSide = fc._hSide || (fc._hSide = spot.sides.map(sd => fc.time.map((_, k) => hSpotAt(sd.facing, sd.shelterSwell, hourCtx(spot, fc, k).parts))));
  const recent = hSide.map(arr => Math.max(...arr.slice(Math.max(0, i - 48), i).concat([0])));
  return spearHour(spot, fc, i, recent, lead);
}

export const leadConf = lead => (lead <= 2 ? "high" : lead <= 5 ? "med" : "low");
// Models disagreeing (wave heights >35% apart or wind >10 kn apart in daylight) knocks confidence down a level.
function agreeConf(fc, idx) {
  let w = 0, k = 0, n = 0;
  for (let h = 6; h <= 18; h++) { const i = idx + h; if (fc.spreadW?.[i] != null) { w += fc.spreadW[i]; n++; } if (fc.spreadWind?.[i] != null) k = Math.max(k, fc.spreadWind[i]); }
  const ws = n ? w / n : 0;
  return { bad: ws > 0.35 || k > 10, waveSpread: ws, windSpread: k };
}

// Best 2–3 hour block of daylight for a spot on a day, with the reasons (tide, wind, size).
export function bestTime(spot, fc, dayStr, lead, firstLight, sunset, fromHour = 0) {
  const idx = fc.time.findIndex(t => t.startsWith(dayStr)); if (idx < 0) return null;
  const hrs = [];
  for (let h = Math.max(4, fromHour); h <= 20; h++) {
    const i = idx + h, st = Date.parse(fc.time[i] + fc.tz);
    if (firstLight && st + 36e5 <= firstLight.getTime()) continue;
    if (sunset && st >= Date.parse(sunset + fc.tz)) continue;
    const r = scoreHourAt(spot, fc, i, lead); if (r) hrs.push({ h, r });
  }
  let best = null;
  for (let a = 0; a < hrs.length; a++) for (const len of [3, 2]) {
    const blk = hrs.slice(a, a + len); if (blk.length < len || blk[len - 1].h - blk[0].h !== len - 1) continue;
    if (blk.some(x => x.r.no)) continue;
    const m = blk.reduce((s, x) => s + x.r.score, 0) / len + (len === 3 ? 0.05 : 0);
    if (!best || m > best.m) best = { m, a: blk[0].h, b: blk[len - 1].h + 1, mid: blk[Math.floor(len / 2)].r };
  }
  if (!best) return null;
  const c = best.mid.ctx, why = [];
  const t = c.tide;
  if (t) { const ev = [t.prev, t.next].find(e => e.type === "H" && Math.abs(e.time - c.date) < 3 * 36e5); if (ev) why.push(`high ${fmtTime(ev.time)}`); else why.push(t.rising ? "incoming tide" : t.state === "low" ? "low tide" : "outgoing tide"); }
  const wp = best.mid.parts.find(p => p.tag === "wind");
  if (wp) why.push(wp.text.split(" — ")[1] || "");
  else if (c.wspd < 6) why.push("light wind");
  return { a: best.a, b: best.b, score: Math.min(10, best.m), why: why.filter(Boolean) };
}

export function scoreSpotDay(spot, fc, dayStr, todayStr) {
  const lead = Math.round((Date.parse(dayStr) - Date.parse(todayStr)) / 864e5);
  const di = fc.daily.time.indexOf(dayStr);
  const sunrise = di >= 0 ? fc.daily.sunrise[di] : null, sunset = di >= 0 ? fc.daily.sunset[di] : null;
  const firstLight = sunrise ? new Date(Date.parse(sunrise + fc.tz) - 25 * 60e3) : null;
  const idx = fc.time.findIndex(t => t.startsWith(dayStr));
  if (idx < 0) return null;
  const isSpear = spot.type === "spear";

  // spear: swell reaching each side for every hour (cached), used for the 48 h trend
  let hSide = null;
  if (isSpear) hSide = fc._hSide || (fc._hSide = spot.sides.map(sd => fc.time.map((_, k) => hSpotAt(sd.facing, sd.shelterSwell, hourCtx(spot, fc, k).parts))));

  const windows = WINDOWS.map(([a, b, label]) => {
    const hours = [];
    for (let h = a; h < b; h++) {
      const i = idx + h; if (i >= fc.time.length || fc.hs[i] == null || fc.wspd[i] == null) continue;
      // daylight only: the hour must end after first light and start before sunset
      const hStart = Date.parse(fc.time[i] + fc.tz);
      if (firstLight && hStart + 36e5 <= firstLight.getTime()) continue;
      if (sunset && hStart >= Date.parse(sunset + fc.tz)) continue;
      if (isSpear) {
        const recent = hSide.map(arr => Math.max(...arr.slice(Math.max(0, i - 48), i).concat([0])));
        hours.push(spearHour(spot, fc, i, recent, lead));
      } else hours.push(surfHour(spot, fc, i));
    }
    if (!hours.length) return { label, a, b, score: null };
    const anyNo = hours.find(h => h.no);
    const avg = hours.reduce((s, h) => s + h.score, 0) / hours.length;
    const mid = hours[Math.floor(hours.length / 2)];
    return { label, a, b, score: anyNo ? 0 : avg, no: anyNo ? anyNo.no : null, rep: anyNo || mid, hours };
  });
  const valid = windows.filter(w => w.score != null);
  if (!valid.length) return null;
  const best = valid.reduce((m, w) => (w.score > m.score ? w : m), valid[0]);
  const ag = agreeConf(fc, idx);
  const lc = leadConf(lead), conf = ag.bad ? (lc === "high" ? "med" : "low") : lc;
  return { spot, dayStr, lead, conf, agree: ag, windows, best, score: best.score, sunrise, sunset, firstLight };
}
