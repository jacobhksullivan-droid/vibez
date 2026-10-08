// Live corrections on top of the blended forecast (data.js):
//  1. MHL wave buoys: if the nearest buoy is reading bigger/smaller than the blend says right now, scale the
//     swell by that ratio, fading out over ~a day; same for the swell period (it decides how much wraps into the lee).
//  2. BOM wind observations: shift the forecast wind towards what the nearest station is measuring, fading over ~6 h.
//  3. BOM coastal waters forecast (human forecasters): their wind text is read hour by hour ("becoming NE 15–20 knots
//     in the early afternoon") and the forecast wind is pulled half-way towards it, so sea breezes land at the right
//     time; their swell height nudges ours, more so further out (where the buoy correction has faded).
// Returns a new data object; the cached blend is never modified.
import { SPOTS, BUOYS, BOM_STATIONS } from "../data/spots.js";
import { parseBomWind, bomWindAt } from "./bomwind.js";

const COMPASS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
const dirDeg = t => { const i = COMPASS.indexOf(t); return i < 0 ? null : i * 22.5; };
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const km = (a, b, c, d) => Math.hypot((a - c) * 111, (b - d) * 111 * Math.cos((a * Math.PI) / 180));
const hourKey = ms => new Date(ms + 11 * 36e5).toISOString().slice(0, 13) + ":00"; // AEDT local hour key

// BOM coastal waters zones by latitude (northern boundary of each zone, going north)
const ZONES = [
  ["NSW_MW001", -36.25], ["NSW_MW002", -35.36], ["NSW_MW003", -34.08], ["NSW_MW004", -33.57],
  ["NSW_MW005", -32.44], ["NSW_MW006", -30.92], ["NSW_MW007", -29.88], ["NSW_MW008", -28],
];
export const zoneOf = lat => (ZONES.find(([, n]) => lat <= n) || ZONES[ZONES.length - 1])[0];

const maxKnots = txt => { if (!txt) return null; const n = [...txt.matchAll(/(\d+)\s*(?:to\s*(\d+)\s*)?knots/g)].map(m => +(m[2] || m[1])); return n.length ? Math.max(...n) : null; };
const swellM = txt => {
  if (!txt) return null;
  const m = [...txt.matchAll(/(?:(\d+(?:\.\d+)?)\s*to\s*)?(\d+(?:\.\d+)?)\s*metres?/g)].map(x => (x[1] ? (+x[1] + +x[2]) / 2 : +x[2]));
  if (/below 1 metre/i.test(txt) && !m.length) return 0.6;
  return m.length ? m[0] : null;
};

export function correct(data, buoys, live) {
  if (!data) return data;
  const spots = {}, notes = {};
  const now = Date.now();

  // buoy ratios (obs / blend at the buoy, at the obs hour)
  const ratios = [];
  for (const b of buoys?.list || []) {
    if (!(now - b.time < 4 * 36e5) || !(b.hs > 0.2)) continue;
    const fc = data.buoyFc?.[b.id]; if (!fc) continue;
    const i = fc.time.indexOf(hourKey(b.time)); const f = fc.hs[i];
    if (!(f > 0.3)) continue;
    const fT = fc.T?.[i];
    ratios.push({ ...b, ratio: clamp(b.hs / f, 0.7, 1.4), dT: b.tp > 3 && fT > 3 ? clamp(b.tp - fT, -2, 2) : 0 });
  }
  const obs = live?.obs || {};

  for (const s of SPOTS) {
    const raw = data.spots[s.id]; if (!raw) continue;
    const fc = { ...raw }, n = raw.time.length, note = [];
    const tms = raw.time.map(t => Date.parse(t + raw.tz));
    const periodAdd = new Array(n).fill(0);
    const swellK = new Array(n).fill(1), windAdd = new Array(n).fill(0), obsW = new Array(n).fill(0);
    const bomSpd = new Array(n).fill(null), bomDir = new Array(n).fill(null);

    // 1. nearest buoy within 250 km
    const nb = ratios.map(r => ({ r, d: km(s.lat, s.lon, r.lat, r.lon) })).filter(x => x.d < 250).sort((a, b) => a.d - b.d)[0];
    if (nb && Math.abs(nb.r.ratio - 1) > 0.05) {
      for (let i = 0; i < n; i++) swellK[i] = 1 + (nb.r.ratio - 1) * Math.exp(-Math.abs(tms[i] - nb.r.time) / (24 * 36e5));
      note.push(`${nb.r.name} buoy reading ${Math.round((nb.r.ratio - 1) * 100) > 0 ? "+" : ""}${Math.round((nb.r.ratio - 1) * 100)}% vs forecast`);
    }
    if (nb && Math.abs(nb.r.dT) >= 1) {
      for (let i = 0; i < n; i++) periodAdd[i] = nb.r.dT * Math.exp(-Math.abs(tms[i] - nb.r.time) / (24 * 36e5));
      note.push(`${nb.r.name} buoy period ${nb.r.dT > 0 ? "+" : ""}${Math.round(nb.r.dT)} s vs forecast`);
    }

    // 2. nearest BOM wind station within 60 km
    const st = BOM_STATIONS.map(x => ({ x, o: obs[x.id], d: km(s.lat, s.lon, x.lat, x.lon) })).filter(y => y.o && y.d < 60 && now - y.o.t < 3 * 36e5).sort((a, b) => a.d - b.d)[0];
    if (st) {
      const i0 = raw.time.indexOf(hourKey(st.o.t));
      const f = raw.wspd[i0];
      if (f != null && st.o.wspd != null) {
        const delta = clamp(st.o.wspd - f, -8, 8);
        if (Math.abs(delta) >= 2) {
          for (let i = 0; i < n; i++) if (tms[i] >= st.o.t - 36e5) windAdd[i] = delta * Math.exp(-(tms[i] - st.o.t) / (6 * 36e5));
          note.push(`${st.x.name} wind now ${Math.round(st.o.wspd * 1.151)} mph (forecast ${Math.round(f * 1.151)})`);
        }
        const od = dirDeg(st.o.wdir);
        if (od != null && st.o.wspd >= 6) {
          fc.wdir = raw.wdir.map((d, i) => {
            if (d == null || tms[i] < st.o.t - 36e5) return d;
            const w = Math.exp(-(tms[i] - st.o.t) / (3 * 36e5)), diff = ((od - d + 540) % 360) - 180;
            return Math.round((d + diff * w + 360) % 360);
          });
        }
        for (let i = 0; i < n; i++) if (tms[i] >= st.o.t - 36e5) obsW[i] = Math.exp(-(tms[i] - st.o.t) / (6 * 36e5));
      }
    }

    // 3. BOM coastal waters forecast for this zone
    const zone = live?.bom?.zones?.[zoneOf(s.lat)];
    if (zone) {
      for (const p of zone.periods) {
        const day = (p.start || "").slice(0, 10); if (!day) continue;
        const idx = raw.time.map((t, i) => (t.startsWith(day) && +t.slice(11, 13) >= 6 && +t.slice(11, 13) <= 18 ? i : -1)).filter(i => i >= 0);
        if (!idx.length) continue;
        const pts = parseBomWind(p.forecast_winds);
        if (pts.length) {
          raw.time.forEach((t, i) => { if (!t.startsWith(day)) return; const b = bomWindAt(pts, +t.slice(11, 13)); if (b) { bomSpd[i] = b.spd; bomDir[i] = b.dir; } });
          const bw = maxKnots(p.forecast_winds);
          if (bw != null) note.push(`BOM ${day.slice(8)}/${day.slice(5, 7)} wind timing`);
        }
        const bs = swellM(p.forecast_swell1), ms = idx.reduce((a, i) => a + (raw.p1h[i] ?? 0) * swellK[i], 0) / idx.length;
        if (bs != null && ms > 0.2) {
          const lead = (Date.parse(day) - now) / 864e5;
          const w = clamp(lead, 0, 1); // today the buoy rules, from tomorrow BOM gets full say
          const k = 1 + w * clamp(0.5 * (bs / ms - 1), -0.2, 0.25);
          if (Math.abs(k - 1) > 0.05) idx.forEach(i => (swellK[i] *= k));
        }
        if (p.marine_forecast && /warning/i.test(p.marine_forecast)) note.push(`⚠ ${p.marine_forecast}`);
      }
    }

    const mul = (arr, k) => arr.map((v, i) => (v == null ? null : Math.round(v * k[i] * 100) / 100));
    fc.p1T = raw.p1T.map((T, i) => (T == null ? null : Math.round((T + periodAdd[i]) * 10) / 10));
    fc.hs = mul(raw.hs, swellK); fc.p1h = mul(raw.p1h, swellK); fc.p2h = mul(raw.p2h, swellK); fc.wwh = mul(raw.wwh, swellK);
    // wind = models (+ obs shift), pulled half-way to BOM's hourly reading of their text; the live obs wins near "now"
    const BOM_W = 0.5;
    fc.wspd = raw.wspd.map((v, i) => {
      if (v == null) return null;
      let x = v + windAdd[i];
      if (bomSpd[i] != null) x += BOM_W * (1 - obsW[i]) * (bomSpd[i] - x);
      return Math.max(0, Math.round(x * 10) / 10);
    });
    // gusts scale with the corrected mean wind
    fc.gust = raw.gust.map((g, i) => (g == null || raw.wspd[i] == null ? null : Math.round(g * (fc.wspd[i] + 2) / (raw.wspd[i] + 2) * 10) / 10));
    const wd = fc.wdir || raw.wdir;
    fc.wdir = wd.map((d, i) => {
      if (d == null || bomDir[i] == null || (bomSpd[i] ?? 0) < 7) return d;
      const w = BOM_W * (1 - obsW[i]), diff = ((bomDir[i] - d + 540) % 360) - 180;
      return Math.round((d + diff * w + 360) % 360);
    });
    spots[s.id] = fc; notes[s.id] = note;
  }
  return { ...data, spots, notes };
}
