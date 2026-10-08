// Turns BOM coastal-waters wind text into an hourly wind (speed kn, direction °) for that forecast day, e.g.
// "Southwesterly 10 to 15 knots becoming variable about 10 knots in the early morning then becoming
//  northeasterly 15 to 20 knots in the middle of the day."
const BASE = { north: 0, northeast: 45, east: 90, southeast: 135, south: 180, southwest: 225, west: 270, northwest: 315 };
const WHEN = [
  [/before dawn/, 4], [/early morning/, 6], [/late morning/, 11], [/(?:during|in) the morning|morning/, 9],
  [/middle of the day|around midday|midday/, 12], [/early afternoon/, 13], [/late afternoon/, 17], [/(?:during|in) the afternoon|afternoon/, 15],
  [/early evening/, 18], [/late evening/, 21], [/(?:during|in) the evening|evening/, 19], [/around midnight|overnight/, 23], [/during the day/, 12],
];
const circMean = (a, b) => { const x = Math.sin(a * Math.PI / 180) + Math.sin(b * Math.PI / 180), y = Math.cos(a * Math.PI / 180) + Math.cos(b * Math.PI / 180); return (Math.atan2(x, y) * 180 / Math.PI + 360) % 360; };

function dirOf(t) {
  if (/variable/.test(t)) return null;
  const m = t.match(/\b(north|south|east|west|northeast|northwest|southeast|southwest)\s+to\s+(north|south|east|west|northeast|northwest|southeast|southwest)erly/)
    || t.match(/\b(north|south|east|west|northeast|northwest|southeast|southwest)erly/);
  if (!m) return undefined;
  return m[2] ? circMean(BASE[m[1]], BASE[m[2]]) : BASE[m[1]];
}
function speedOf(t) {
  let m = t.match(/(\d+)\s*to\s*(\d+)\s*knots/); if (m) return (+m[1] + +m[2]) / 2;
  m = t.match(/below\s*(\d+)\s*knots/); if (m) return +m[1] * 0.7;
  m = t.match(/(?:about|around)\s*(\d+)\s*knots/); if (m) return +m[1];
  m = t.match(/(\d+)\s*knots/); if (m) return +m[1];
  return undefined;
}

// returns [{ h, spd, dir }] change points (h = local hour the state starts), or [] if unparseable
export function parseBomWind(text) {
  if (!text) return [];
  const t = text.toLowerCase().replace(/\s+/g, " ");
  const segs = t.split(/,?\s*(?:then becoming|then tending|then shifting|then decreasing|then increasing|becoming|tending|shifting|decreasing|increasing|easing|then)\s+|\.\s+(?=winds?\s)/);
  const out = []; let last = { spd: undefined, dir: undefined };
  segs.forEach((seg, k) => {
    if (/offshore/.test(seg) && /reaching|up to/.test(seg)) return; // "reaching 25 knots offshore" = out at sea, not at the beach
    let h = 0;
    if (k > 0) { const w = WHEN.find(([re]) => re.test(seg)); h = w ? w[1] : out.length ? out[out.length - 1].h + 3 : 0; }
    let spd = speedOf(seg), dir = dirOf(seg);
    if (/reaching|up to/.test(seg) && spd != null && last.spd != null) spd = Math.max(last.spd, spd * 0.85); // gusty inshore peak
    if (spd === undefined) spd = last.spd;
    if (dir === undefined) dir = last.dir;
    if (spd === undefined) return;
    out.push({ h, spd, dir }); last = { spd, dir };
  });
  return out.sort((a, b) => a.h - b.h);
}

// hourly value for hour 0–23 from change points, blending over ~2 h around each change
export function bomWindAt(points, hour) {
  if (!points.length) return null;
  let i = points.findIndex(p => p.h > hour); if (i < 0) i = points.length;
  const cur = points[Math.max(0, i - 1)], nxt = points[i];
  if (nxt && nxt.h - hour <= 1) {
    const f = (1 - (nxt.h - hour)) / 2 + 0.25; // ramp into the change
    const dir = cur.dir == null ? nxt.dir : nxt.dir == null ? cur.dir : circMean(cur.dir, nxt.dir) ; // midpoint during the swap
    return { spd: cur.spd * (1 - f) + nxt.spd * f, dir: f > 0.5 ? (nxt.dir ?? dir) : dir };
  }
  return { spd: cur.spd, dir: cur.dir };
}
