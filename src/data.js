// COAST CALL — forecast data. Several models are blended so no single model's miss decides a session:
//  * waves: Météo-France MFWAM (best nearshore detail, swell partitions), ECMWF WAM and NOAA GFS-Wave;
//    height = median of the three, MFWAM's swell trains rescaled to match, period/direction averaged with GFS.
//  * wind/rain: ECMWF IFS, UK Met Office 10 km, DWD ICON, NOAA GFS and Canada GEM, weighted average.
//  * currents, sea temperature and a model tide curve (sea level) for every spot and date.
// Model weights adapt to recent skill: each weather model is scored against the last 2 days of BOM station winds, and
// each wave model against the buoys (a rolling log kept on the phone), so whichever has been closer lately counts more.
// The blend is cached for offline use; live corrections (buoys, BOM obs/forecast) are applied on top in correct.js.
import { SPOTS, BUOYS, BOM_STATIONS } from "../data/spots.js";
import { loadBuoys } from "./buoys.js";

const CACHE_KEY = "cc-forecast-v2";
const MAX_AGE = 2 * 60 * 60e3;  // refresh every 2 h (keeps us inside Open-Meteo's free daily limit on both phones)
const MIN_GAP = 10 * 60e3;      // a manual refresh within 10 min of the last fetch reuses it
const DAYS = 10;

const MF_VARS = "wave_height,swell_wave_height,swell_wave_direction,swell_wave_period,secondary_swell_wave_height,secondary_swell_wave_direction,secondary_swell_wave_period,wind_wave_height,wind_wave_direction,wind_wave_period,sea_surface_temperature,ocean_current_velocity,ocean_current_direction,sea_level_height_msl";
const WAVE_MODELS = ["ecmwf_wam025", "ncep_gfswave025"];
const WAVE_VARS = "wave_height,swell_wave_height,swell_wave_direction,swell_wave_period";
const WX_MODELS = { ecmwf_ifs025: 1.2, ukmo_global_deterministic_10km: 1.3, icon_seamless: 1, gfs_seamless: 0.8, gem_seamless: 0.8 };
const WX_VARS = "wind_speed_10m,wind_direction_10m,wind_gusts_10m,precipitation";

// changes whenever a spot is added, removed or moved, so the cached forecast is refetched
const signature = () => SPOTS.map(s => `${s.id}@${s.lat.toFixed(4)},${s.lon.toFixed(4)}`).join("|") + "|v3";

async function getJSON(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${new URL(url).host} replied ${r.status}`);
  return r.json();
}
const rnd = (v, dp) => (v == null || Number.isNaN(v) ? null : Math.round(v * 10 ** dp) / 10 ** dp);
const round = (arr, dp) => arr.map(v => rnd(v, dp));
const rad = d => (d * Math.PI) / 180, deg = r => ((r * 180) / Math.PI + 360) % 360;

function tzString(sec) {
  const s = sec >= 0 ? "+" : "-", a = Math.abs(sec);
  return `${s}${String(Math.floor(a / 3600)).padStart(2, "0")}:${String((a % 3600) / 60).padStart(2, "0")}`;
}
const median = a => { const s = a.slice().sort((x, y) => x - y), n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };
// weighted circular mean of directions (optionally weighted by magnitude too)
function dirMean(pairs) {
  let x = 0, y = 0;
  for (const [d, w] of pairs) if (d != null && w > 0) { x += Math.sin(rad(d)) * w; y += Math.cos(rad(d)) * w; }
  return x === 0 && y === 0 ? null : Math.round(deg(Math.atan2(x, y)));
}
const asList = j => (Array.isArray(j) ? j : [j]);
const COMPASS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
const localKey = (ms, off) => new Date(ms + off * 1000).toISOString().slice(0, 13) + ":00";

// weights ∝ base × (average error / this model's error)², kept within ¼–4× of base
function skillWeights(base, err) {
  const ms = Object.keys(base).filter(m => err[m]?.n >= 12);
  if (ms.length < 2) return { w: base, err: null };
  const mean = ms.reduce((a, m) => a + err[m].sum / err[m].n, 0) / ms.length;
  const w = { ...base };
  for (const m of ms) w[m] = base[m] * Math.min(4, Math.max(0.25, (mean / (err[m].sum / err[m].n)) ** 2));
  return { w, err: Object.fromEntries(ms.map(m => [m, Math.round((err[m].sum / err[m].n) * 10) / 10])) };
}

// wind: model vs BOM station obs over the last 48 h (vector error in kn)
function windSkill(X, nS, hist) {
  const err = {};
  BOM_STATIONS.forEach((st, j) => {
    const x = X[nS + j]?.hourly, h = hist?.[st.id]?.hist; if (!x || !h) return;
    const off = X[nS + j].utc_offset_seconds, idx = new Map(x.time.map((t, i) => [t, i]));
    for (const [t, spd, dtxt] of h) {
      if (Date.now() - t > 48 * 36e5) continue;
      const i = idx.get(localKey(t, off)); if (i == null) continue;
      const od = COMPASS.indexOf(dtxt) * 22.5;
      for (const m of Object.keys(WX_MODELS)) {
        const ms = x[`wind_speed_10m_${m}`]?.[i], md = x[`wind_direction_10m_${m}`]?.[i]; if (ms == null) continue;
        const e = spd < 3 || od < 0 || md == null ? Math.abs(ms - spd)
          : Math.hypot(ms * Math.sin(rad(md)) - spd * Math.sin(rad(od)), ms * Math.cos(rad(md)) - spd * Math.cos(rad(od)));
        (err[m] ||= { sum: 0, n: 0 }).sum += e; err[m].n++;
      }
    }
  });
  return skillWeights(WX_MODELS, err);
}

// waves: rolling 72 h log of each model's error at the buoys, kept in localStorage between refreshes
const WAVE_LOG = "cc-waveskill-v1";
function waveSkill(M, V, nS, buoys) {
  let log = []; try { log = JSON.parse(localStorage.getItem(WAVE_LOG)) || []; } catch (e) {}
  for (const b of buoys?.list || []) {
    const j = BUOYS.findIndex(x => x.id === b.id); if (j < 0 || !(b.hs > 0.2)) continue;
    const m = M[nS + j]?.hourly, v = V[nS + j]?.hourly; if (!m) continue;
    const i = m.time.indexOf(localKey(b.time, M[nS + j].utc_offset_seconds)); if (i < 0) continue;
    const e = { mf: m.wave_height[i] };
    for (const md of WAVE_MODELS) e[md] = v?.[`wave_height_${md}`]?.[i];
    const k = `${b.id}@${b.time}`; if (log.some(r => r.k === k)) continue;
    log.push({ k, t: b.time, obs: b.hs, e });
  }
  log = log.filter(r => Date.now() - r.t < 72 * 36e5);
  try { localStorage.setItem(WAVE_LOG, JSON.stringify(log)); } catch (e) {}
  const err = {};
  for (const r of log) for (const [m, f] of Object.entries(r.e)) if (f > 0.05) { (err[m] ||= { sum: 0, n: 0 }).sum += Math.abs(f - r.obs); err[m].n++; }
  return skillWeights({ mf: 1, [WAVE_MODELS[0]]: 1, [WAVE_MODELS[1]]: 1 }, err);
}

async function fetchAll() {
  const pts = [...SPOTS.map(s => [s.lat, s.lon]), ...BUOYS.map(b => [b.lat, b.lon])];
  const lat = pts.map(p => p[0].toFixed(4)).join(","), lon = pts.map(p => p[1].toFixed(4)).join(",");
  const nS = SPOTS.length;
  const base = `latitude=${lat}&longitude=${lon}&past_days=3&forecast_days=${DAYS}&timezone=Australia%2FSydney`;
  const wpts = [...SPOTS.map(s => [s.lat, s.lon]), ...BOM_STATIONS.map(b => [b.lat, b.lon])];
  const sLat = wpts.map(p => p[0].toFixed(4)).join(","), sLon = wpts.map(p => p[1].toFixed(4)).join(",");
  // weather goes back 7 days: rain a week ago still muddies the big rivers
  const sBase = `latitude=${sLat}&longitude=${sLon}&past_days=7&forecast_days=${DAYS}&timezone=Australia%2FSydney`;
  const histP = fetch(`/api/live?only=obs&st=${BOM_STATIONS.map(b => b.id).join(",")}`).then(r => (r.ok ? r.json() : null)).catch(() => null);
  const buoysP = loadBuoys().catch(() => null);
  const [mf, waves, wx, hist, buoys] = await Promise.all([
    getJSON(`https://marine-api.open-meteo.com/v1/marine?${base}&hourly=${MF_VARS}&cell_selection=sea`),
    getJSON(`https://marine-api.open-meteo.com/v1/marine?${base}&hourly=${WAVE_VARS}&models=${WAVE_MODELS.join(",")}&cell_selection=sea`).catch(() => null),
    getJSON(`https://api.open-meteo.com/v1/forecast?${sBase}&hourly=${WX_VARS}&daily=sunrise,sunset&models=${Object.keys(WX_MODELS).join(",")}&wind_speed_unit=kn`),
    histP, buoysP,
  ]);
  const M = asList(mf), V = waves ? asList(waves) : [], X = asList(wx);
  const windW = windSkill(X, nS, hist?.obs), waveW = waveSkill(M, V, nS, buoys);
  const WW = windW.w, VW = waveW.w;

  // wave blend for one location (spot or buoy)
  function waveBlend(k) {
    const m = M[k].hourly, v = V[k]?.hourly || {}, n = m.time.length;
    const out = { hs: [], k: [], T: [], d: [], spread: [] };
    for (let i = 0; i < n; i++) {
      const cand = [["mf", m.wave_height[i]], ...WAVE_MODELS.map(md => [md, v[`wave_height_${md}`]?.[i]])].filter(([, x]) => x != null && x > 0);
      const hsAll = cand.map(c => c[1]);
      let hs;
      if (waveW.err) { const sw = cand.reduce((a, [k]) => a + VW[k], 0); hs = sw ? cand.reduce((a, [k, x]) => a + x * VW[k], 0) / sw : null; }
      else hs = hsAll.length >= 3 ? median(hsAll) : hsAll.length ? hsAll.reduce((a, b) => a + b, 0) / hsAll.length : null;
      out.hs.push(rnd(hs, 2));
      out.spread.push(hsAll.length > 1 && hs ? rnd((Math.max(...hsAll) - Math.min(...hsAll)) / hs, 2) : null);
      const mfH = m.wave_height[i];
      out.k.push(hs != null && mfH > 0.05 ? Math.min(1.6, Math.max(0.6, hs / mfH)) : 1);
      // GFS-Wave returns zeros (not nulls) in cells it treats as land: ignore those,
      // and only average GFS's swell in when it describes the same train (similar height, a real swell period)
      const gH = v[`swell_wave_height_${WAVE_MODELS[1]}`]?.[i], mH = m.swell_wave_height[i];
      const gOk = v[`wave_height_${WAVE_MODELS[1]}`]?.[i] > 0.05 && v[`swell_wave_period_${WAVE_MODELS[1]}`]?.[i] > 5 && gH > 0.5 * (mH || 0);
      const gT = gOk ? v[`swell_wave_period_${WAVE_MODELS[1]}`][i] : null, gD = gOk ? v[`swell_wave_direction_${WAVE_MODELS[1]}`][i] : null;
      const mT = m.swell_wave_period[i], mD = m.swell_wave_direction[i];
      out.T.push(mT != null && gT != null ? rnd((mT + gT) / 2, 1) : rnd(mT ?? gT, 1));
      out.d.push(mD != null && gD != null ? dirMean([[mD, 0.6], [gD, 0.4]]) : mD ?? gD ?? null);
    }
    return out;
  }

  const spots = {};
  SPOTS.forEach((s, k) => {
    const m = M[k].hourly, x = X[k].hourly, wb = waveBlend(k);
    const xi = new Map(x.time.map((t, i) => [t, i]));
    const at = (arr, t) => (arr && xi.has(t) ? arr[xi.get(t)] : null);
    const wspd = [], wdir = [], gust = [], rain = [], wspread = [];
    for (const t of m.time) {
      let sw = 0, sp = 0, gw = 0, g = 0, rw = 0, r = 0; const dirs = [], spds = [];
      for (const [md, w] of Object.entries(WW)) {
        const s_ = at(x[`wind_speed_10m_${md}`], t), d_ = at(x[`wind_direction_10m_${md}`], t);
        if (s_ != null && d_ != null) { sp += s_ * w; sw += w; dirs.push([d_, w * Math.max(1, s_)]); spds.push(s_); }
        const g_ = at(x[`wind_gusts_10m_${md}`], t); if (g_ != null) { g += g_ * w; gw += w; }
        const r_ = at(x[`precipitation_${md}`], t); if (r_ != null) { r += r_ * w; rw += w; }
      }
      const mean = sw ? sp / sw : null;
      wspd.push(rnd(mean, 1)); wdir.push(dirMean(dirs)); gust.push(gw ? rnd(g / gw, 1) : mean != null ? rnd(mean * 1.35, 1) : null);
      rain.push(rw ? rnd(r / rw, 1) : null);
      wspread.push(spds.length > 1 ? rnd(Math.max(...spds) - Math.min(...spds), 1) : null);
    }
    // the 4 days of rain before the marine series starts (hourly, oldest first)
    const rainAt = t => { let r = 0, rw = 0; for (const [md, w] of Object.entries(WW)) { const r_ = at(x[`precipitation_${md}`], t); if (r_ != null) { r += r_ * w; rw += w; } } return rw ? rnd(r / rw, 1) : 0; };
    const i0 = xi.get(m.time[0]) ?? 0;
    const rainPre = x.time.slice(Math.max(0, i0 - 96), i0).map(rainAt);
    const scale = (arr, i) => (arr[i] == null ? null : rnd(arr[i] * wb.k[i], 2));
    const daily = X[k].daily, dk = key => daily[Object.keys(daily).find(n => n.startsWith(key))];
    spots[s.id] = {
      tz: tzString(M[k].utc_offset_seconds),
      time: m.time,
      hs: wb.hs,
      p1h: m.swell_wave_height.map((_, i) => scale(m.swell_wave_height, i)), p1d: m.swell_wave_direction.map((d, i) => wb.d[i] ?? d), p1T: m.swell_wave_period.map((T, i) => wb.T[i] ?? rnd(T, 1)),
      p2h: m.secondary_swell_wave_height.map((_, i) => scale(m.secondary_swell_wave_height, i)), p2d: m.secondary_swell_wave_direction, p2T: round(m.secondary_swell_wave_period, 1),
      wwh: m.wind_wave_height.map((_, i) => scale(m.wind_wave_height, i)), wwd: m.wind_wave_direction, wwT: round(m.wind_wave_period, 1),
      sst: round(m.sea_surface_temperature, 1), cur: round(m.ocean_current_velocity, 1), curDir: m.ocean_current_direction,
      sea: round(m.sea_level_height_msl, 2),
      wspd, wdir, gust, rain, rainPre,
      spreadW: wb.spread, spreadWind: wspread,
      daily: { time: daily.time, sunrise: dk("sunrise"), sunset: dk("sunset") },
    };
  });
  const buoyFc = {};
  BUOYS.forEach((b, j) => { const wb = waveBlend(nS + j); buoyFc[b.id] = { time: M[nS + j].hourly.time, hs: wb.hs, T: wb.T }; });
  const skill = { wind: windW.err && { err: windW.err, w: WW }, wave: waveW.err && { err: waveW.err, w: VW } };
  return { fetchedAt: Date.now(), model: "Blend: MFWAM/ECMWF/GFS waves · ECMWF/UKMO/ICON/GFS/GEM wind", sig: signature(), spots, buoyFc, skill };
}

export function cached() {
  try { const c = JSON.parse(localStorage.getItem(CACHE_KEY)); return c && c.spots ? c : null; } catch (e) { return null; }
}

// Returns { data, fromCache, error }. Uses the cache if it's fresh, or if the network fails.
export async function loadForecast({ force = false } = {}) {
  const c = cached();
  const age = c ? Date.now() - c.fetchedAt : Infinity;
  const sameSpots = c && c.sig === signature(); // ignore a cache made from a different spot list
  if (c && sameSpots && (age < MIN_GAP || (!force && age < MAX_AGE))) return { data: c, fromCache: true };
  try {
    const d = await fetchAll();
    try { localStorage.removeItem("cc-forecast-v1"); localStorage.setItem(CACHE_KEY, JSON.stringify(d)); } catch (e) { /* storage full or blocked: still works this session */ }
    return { data: d, fromCache: false };
  } catch (err) {
    if (c && SPOTS.some(s => c.spots[s.id])) return { data: c, fromCache: true, error: `Offline — showing data from the last fetch (${err.message})` };
    throw err;
  }
}

export function forecastDays(data) {
  const all = Object.values(data.spots);
  const days = [...new Set(all[0].time.map(t => t.slice(0, 10)))];
  // a day counts if most spots have swell + wind data at 10am (one bad spot can't blank the app)
  return days.filter(d => {
    const ok = all.filter(s => { const i = s.time.indexOf(d + "T10:00"); return i >= 0 && s.hs[i] != null && s.wspd[i] != null; }).length;
    return ok >= all.length / 2;
  });
}
