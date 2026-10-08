// Where to sleep: ranks camps by how good the surf/spear is within a short drive the next morning,
// preferring free / cheap legal spots and avoiding dirt access roads (Apollo: sealed roads only, <10 km to a campground).
import { CAMPS, DUMPS } from "../data/camps.js";
import { SPOTS } from "../data/spots.js";

export { CAMPS, DUMPS };
export const KIND = {
  free: { label: "Free camp", icon: "⛺", cost: "Free", bonus: 0.8 },
  rest: { label: "Rest area", icon: "🅿️", cost: "Free · usually OK overnight up to ~24 h unless signed", bonus: 0.8 },
  npws: { label: "National Park / State Forest camp", icon: "🏕️", cost: "~$15–30/night, book online", bonus: 0.4 },
  camp: { label: "Campground", icon: "🏕️", cost: "Fee varies (often NPWS, ~$15–30)", bonus: 0.4 },
  park: { label: "Caravan park", icon: "🚐", cost: "~$45–90/night, showers + power", bonus: 0 },
};
const SPOT = Object.fromEntries(SPOTS.map(s => [s.id, s]));

export function facilities(c) {
  const f = c.f || {}, out = [];
  if (f.toilets) out.push("toilets"); if (f.shower) out.push("showers"); if (f.water) out.push("water");
  if (f.power) out.push("power"); if (f.dump) out.push("dump point");
  else if (c.dumpKm != null) out.push(`dump point ${c.dumpKm} km`);
  return out;
}

// morning (dawn + morning windows) score for a spot on a day
function morning(r) {
  if (!r) return null;
  const ws = r.windows.filter(w => (w.label === "Dawn" || w.label === "Morning") && w.score != null && !w.no);
  return ws.length ? Math.max(...ws.map(w => w.score)) : null;
}

// rank camps for the night before `day`. opts: { originDrive(spotId) -> minutes|null, maxDrive (min|null), kinds }
export function rankCamps(day, dayResults, opts = {}) {
  const res = dayResults(day);
  const out = [];
  for (const c of CAMPS) {
    if (opts.kinds && !opts.kinds.includes(c.kind)) continue;
    let bestSurf = null, bestSpear = null, good = 0, reach = null;
    for (const [id, m] of c.near) {
      const s = SPOT[id]; if (!s) continue;
      const o = opts.originDrive?.(id);
      if (o != null) reach = reach == null ? o + m : Math.min(reach, o + m);
      if (m > 45) continue;
      const sc = morning(res[id]); if (sc == null) continue;
      if (sc >= 7) good++;
      if (m > 35) continue;
      const v = sc - m / 30; // 30 min of driving costs a point
      const cur = { id, name: s.name, score: sc, min: m, v };
      if (s.type === "surf") { if (!bestSurf || v > bestSurf.v) bestSurf = cur; }
      else if (!bestSpear || v > bestSpear.v) bestSpear = cur;
    }
    if (!bestSurf && !bestSpear) continue;
    if (opts.maxDrive != null && reach != null && reach > opts.maxDrive) continue;
    const a = bestSurf?.v ?? 0, b = bestSpear?.v ?? 0;
    const value = Math.max(a, b) + 0.35 * Math.min(a, b) + 0.15 * Math.min(good, 4) + KIND[c.kind].bonus - (c.dirt ? 0.5 : 0);
    out.push({ c, value, bestSurf, bestSpear, reach });
  }
  return out.sort((x, y) => y.value - x.value);
}

// camps within `max` minutes of a spot, cheapest kinds first
export function campsNear(spotId, max = 30) {
  const order = { free: 0, rest: 1, npws: 2, camp: 2, park: 3 };
  return CAMPS.map(c => ({ c, min: c.near.find(n => n[0] === spotId)?.[1] })).filter(x => x.min != null && x.min <= max)
    .sort((a, b) => order[a.c.kind] - order[b.c.kind] || (a.c.dirt ? 1 : 0) - (b.c.dirt ? 1 : 0) || a.min - b.min);
}
