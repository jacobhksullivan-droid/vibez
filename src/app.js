// App shell: Home, Map, Outlook and List views, plus the spot sheet.
import { SPOTS, REGIONS } from "../data/spots.js";
import { loadForecast, forecastDays } from "./data.js";
import { scoreSpotDay, bestTime, setSharks, sharksNear, WINDOWS, fmtTime, card, ft } from "./score.js";
import { correct, zoneOf } from "./correct.js";
import { loadLive, cachedLive, bomText } from "./live.js";
import { windGraph, bindWindScrub } from "./charts.js";
import { savedOrigin, saveOrigin, driveTimes, fmtDrive } from "./location.js";
import { loadBuoys, cachedBuoys } from "./buoys.js";
import { renderHome } from "./home.js";
import { rankCamps, campsNear, KIND, facilities, CAMPS, DUMPS } from "./camps.js";
import { makePlan, TRIP as PLAN_TRIP } from "./plan.js";
import { renderOutlook, regionBounds } from "./outlook.js";

const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const todayStr = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney" }).format(new Date());
const TRIP = Array.from({ length: 11 }, (_, k) => `2026-10-${String(21 + k).padStart(2, "0")}`);
const PREF_KEY = "cc-prefs-v1";

let prefs = {};
try { prefs = JSON.parse(localStorage.getItem(PREF_KEY)) || {}; } catch (e) {}
const savePrefs = () => { try { localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); } catch (e) {} };

const state = {
  data: null, days: [], day: null, win: "best", mode: "both", view: "homeView",
  open: null, openWin: null, zones: null,
  origin: savedOrigin(), drive: null, maxDrive: null, // no manual limit: Home shows what's near you automatically
  buoys: cachedBuoys(), live: cachedLive(), raw: null,
};
setSharks(state.live?.sharks);
const cache = new Map(); // day -> { id: dayResult }

// ---------- colours ----------
function colour(score, no) {
  if (no) return "var(--sno)";
  if (score == null) return "var(--sna)";
  return score < 2 ? "var(--s1)" : score < 4 ? "var(--s3)" : score < 6 ? "var(--s5)" : score < 8 ? "var(--s7)" : "var(--s9)";
}
// surf + spear at the same place: spots of the other type within 2 km
const kmApart = (a, b) => Math.hypot((a.lat - b.lat) * 111, (a.lon - b.lon) * 111 * Math.cos((a.lat * Math.PI) / 180));
const PARTNER = Object.fromEntries(SPOTS.map(s => [s.id, SPOTS.filter(o => o.type !== s.type && kmApart(s, o) <= 2)]));
const TYPE_ICON = { surf: "🏄", spear: "🐟" };
const fmtScore = (s, no) => (no ? "✕" : s == null ? "–" : Math.round(s));
const hr = h => (h === 0 || h === 24 ? "12am" : h === 12 ? "12pm" : h < 12 ? h + "am" : h - 12 + "pm");

// best 2–3 h block per spot per day (cached with the day's results)
const bestCache = new Map();
function bestOf(id, day) {
  const k = day + "|" + id;
  if (bestCache.has(k)) return bestCache.get(k);
  const s = SPOTS.find(x => x.id === id), r = dayResults(day)[id], fc = state.data?.spots[id];
  // today: only hours still to come
  const from = day === todayStr() ? +new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Sydney", hour: "numeric", hour12: false }).format(new Date()) : 0;
  const b = r && fc ? bestTime(s, fc, day, r.lead, r.firstLight, r.sunset, from) : null;
  bestCache.set(k, b);
  return b;
}
const bestLabel = b => (b ? `Best ${hr(b.a).replace(/(am|pm)$/, b.a < 12 === b.b < 12 ? "" : "$1")}–${hr(b.b)}` : "");
// shark activity within 5 km in the last 48 h
const sharkIcon = s => (sharksNear(s.lat, s.lon, 5, Date.now() - 48 * 36e5).length ? `<span class="shark" title="Shark activity nearby in the last 48 h">🦈</span>` : "");

// ---------- scoring ----------
function dayResults(day) {
  if (cache.has(day)) return cache.get(day);
  const out = {};
  for (const s of SPOTS) {
    const fc = state.data.spots[s.id];
    out[s.id] = fc ? scoreSpotDay(s, fc, day, todayStr()) : null;
  }
  cache.set(day, out);
  return out;
}
function pick(res) {
  if (!res) return { score: null };
  if (state.win === "best") return { score: res.best.score, no: res.best.no, w: res.best };
  const w = res.windows.find(x => x.label === state.win);
  return w && w.score != null ? { score: w.score, no: w.no, w } : { score: null };
}
const withinDrive = s => state.maxDrive == null || state.drive?.minutes?.[s.id] == null || state.drive.minutes[s.id] <= state.maxDrive;
const driveOf = id => (state.drive?.minutes?.[id] != null ? fmtDrive(state.drive.minutes[id], state.drive.estimated) : "");

// ---------- legal: inside a no-take zone? ----------
function inRing(x, y, ring) {
  let c = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
function noTakeZoneAt(lat, lon) {
  if (!state.zones) return null;
  for (const f of state.zones.features) {
    if (f.properties.spear !== "no") continue;
    const polys = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
    for (const p of polys) if (inRing(lon, lat, p[0]) && !p.slice(1).some(h => inRing(lon, lat, h))) return f.properties.name;
  }
  return null;
}

// ---------- map ----------
let map, layersCtl, markers = {}, meMarker, sharkLayer, campLayer, parkLayer, dumpLayer, fitted = false;
function initMap() {
  map = L.map("map", { zoomControl: false, attributionControl: true }).setView([-33.6, 151.4], 6);
  L.control.zoom({ position: "topright" }).addTo(map);
  const sat = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", { maxZoom: 19, maxNativeZoom: 18, attribution: "Imagery © Esri, Maxar, Earthstar Geographics" });
  const labels = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}", { maxZoom: 19, maxNativeZoom: 18, opacity: 0.8 });
  const street = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" });
  const satellite = L.layerGroup([sat, labels]).addTo(map);
  sharkLayer = L.layerGroup().addTo(map);
  campLayer = L.layerGroup().addTo(map); parkLayer = L.layerGroup(); dumpLayer = L.layerGroup();
  drawCamps();
  // camp icons only once zoomed in (they'd bury the spot pins on the whole-coast view)
  const zoomCls = () => $("#map").classList.toggle("far", map.getZoom() < 10);
  map.on("zoomend", zoomCls); zoomCls();
  layersCtl = L.control.layers({ Satellite: satellite, Map: street }, { "Sharks (48 h)": sharkLayer, "Free / cheap camps": campLayer, "Caravan parks": parkLayer, "Dump points": dumpLayer }, { position: "topright" }).addTo(map);
  for (const s of SPOTS) {
    const m = L.marker([s.lat, s.lon], { icon: pinIcon(s, null), riseOnHover: true, title: s.name, keyboard: true });
    m.on("click", () => openSheet(s.id));
    markers[s.id] = m;
  }
  new LocateCtl().addTo(map);
  new ResizeObserver(() => { map.invalidateSize(); if (!fitted) fitAll(); }).observe($("#map"));
}
// ---------- camps ----------
// driving directions in Apple Maps (opens the Maps app on iPhone)
const dirUrl = (lat, lon) => `https://maps.apple.com/?daddr=${lat},${lon}&dirflg=d`;
function campPopup(c) {
  const k = KIND[c.kind], fac = facilities(c);
  const near = c.near.slice(0, 4).map(([id, m]) => { const s = SPOTS.find(x => x.id === id); return s ? `${s.type === "surf" ? "🏄" : "🐟"} ${esc(s.name)} · ${m} min` : ""; }).join("<br>");
  return `<b>${esc(c.name)}</b><br><small>${k.icon} ${k.label} · ${esc(k.cost)}</small>${c.dirt ? `<br><small>⚠ dirt access road — only if under 10 km & well kept (Apollo rules)</small>` : ""}${fac.length ? `<br><small>${esc(fac.join(" · "))}</small>` : ""}<br>${near}<br><a href="${dirUrl(c.lat, c.lon)}" target="_blank" rel="noopener">Directions</a>${c.web ? ` · <a href="${esc(c.web)}" target="_blank" rel="noopener">Website</a>` : ""}`;
}
function drawCamps() {
  for (const c of CAMPS) {
    const icon = L.divIcon({ className: "cc", html: `<div class="camppin ${c.kind}${c.dirt ? " dirt" : ""}">${KIND[c.kind].icon}</div>`, iconSize: [20, 20], iconAnchor: [10, 10] });
    L.marker([c.lat, c.lon], { icon, title: c.name, zIndexOffset: -800 }).bindPopup(campPopup(c)).addTo(c.kind === "park" ? parkLayer : campLayer);
  }
  for (const d of DUMPS) L.circleMarker([d.lat, d.lon], { radius: 5, color: "#6b4f2a", fillColor: "#c89b5a", fillOpacity: 0.9, weight: 1.5 }).bindPopup(`<b>Dump point</b>${d.name ? "<br>" + esc(d.name) : ""}<br><a href="${dirUrl(d.lat, d.lon)}" target="_blank" rel="noopener">Directions</a>`).addTo(dumpLayer);
}
// best camps for the night before `day` (default tomorrow), within the drive limit from where you are
function campsFor(day) {
  return rankCamps(day, dayResults, { originDrive: id => state.drive?.minutes?.[id] ?? null, maxDrive: state.drive ? 180 : null });
}

function drawSharks() {
  if (!map || !sharkLayer) return;
  sharkLayer.clearLayers();
  const seen = new Set();
  for (const x of state.live?.sharks || []) {
    if (Date.now() - x.t > 48 * 36e5) continue;
    const k = x.lat.toFixed(3) + x.lon.toFixed(3); if (seen.has(k)) continue; seen.add(k); // newest per location
    const icon = L.divIcon({ className: "cc", html: `<div class="sharkpin">🦈</div>`, iconSize: [22, 22], iconAnchor: [11, 11] });
    L.marker([x.lat, x.lon], { icon, title: x.beach, zIndexOffset: -500 }).bindPopup(`<b>${esc(x.beach)}</b><br>${esc(x.msg)}`).addTo(sharkLayer);
  }
}
function fitAll() {
  if (!$("#map").clientHeight) return;
  if (state.origin) { map.setView([state.origin.lat, state.origin.lon], 9); fitted = true; return; } // start around you
  map.fitBounds(L.latLngBounds(SPOTS.map(s => [s.lat, s.lon])).pad(0.05));
  fitted = true;
}
function pinIcon(s, r, dim) {
  const both = PARTNER[s.id]?.length;
  const html = `<div class="pinwrap"><div class="pin ${s.type}${dim ? " dim" : ""}" style="--c:${colour(r?.score, r?.no)}"><span>${fmtScore(r?.score, r?.no)}</span></div><i class="ptype${dim ? " dim" : ""}" title="${both ? "surf + spear" : s.type}">${both ? "🏄🐟" : TYPE_ICON[s.type]}</i></div>`;
  return L.divIcon({ className: "cc", html, iconSize: [30, 30], iconAnchor: [15, 15] });
}
function drawZones() {
  if (!state.zones || !map) return;
  L.geoJSON(state.zones, {
    filter: f => f.properties.spear === "no" && f.properties.water !== "estuary", // ocean / marine-bay no-take zones only
    style: { color: "#c0392b", weight: 1, fillColor: "#c0392b", fillOpacity: 0.25 },
    onEachFeature: (f, l) => l.bindPopup(`<b>${esc(f.properties.name)}</b><br>No-take zone: no spearfishing.<br><a href="https://www.dpi.nsw.gov.au/fishing/marine-protected-areas" target="_blank" rel="noopener">Official maps</a>`),
  }).addTo(map);
}
function drawMe() {
  if (!map) return;
  if (meMarker) meMarker.remove();
  if (state.origin) meMarker = L.marker([state.origin.lat, state.origin.lon], { icon: L.divIcon({ className: "cc", html: `<div class="me"></div>`, iconSize: [18, 18], iconAnchor: [9, 9] }), title: "You", interactive: false, zIndexOffset: 1000 }).addTo(map);
}
// "◎" button on the map: jump to where you are
const LocateCtl = L.Control.extend({
  options: { position: "topright" },
  onAdd() {
    const b = L.DomUtil.create("button", "locate"); b.type = "button"; b.title = "Go to my location"; b.textContent = "◎";
    L.DomEvent.on(b, "click", e => { L.DomEvent.stop(e); if (state.origin) map.setView([state.origin.lat, state.origin.lon], 11); else startGPS(true); });
    return b;
  },
});
function renderMap() {
  const res = dayResults(state.day);
  for (const s of SPOTS) {
    const show = state.mode === "both" || state.mode === s.type;
    const m = markers[s.id];
    if (!show) { m.remove(); continue; }
    const p = pick(res[s.id]);
    m.setIcon(pinIcon(s, p, !withinDrive(s)));
    m.setZIndexOffset(Math.round((p.score ?? 0) * 100) - (withinDrive(s) ? 0 : 2000));
    if (!map.hasLayer(m)) m.addTo(map);
  }
}

// ---------- list ----------
function renderList() {
  const res = dayResults(state.day);
  const rows = SPOTS.filter(s => (state.mode === "both" || state.mode === s.type) && withinDrive(s))
    .map(s => ({ s, p: pick(res[s.id]) }))
    .sort((a, b) => (b.p.score ?? -1) - (a.p.score ?? -1));
  const block = type => {
    const items = rows.filter(x => x.s.type === type);
    if (!items.length) return "";
    return `<h2>${type === "surf" ? "Surf" : "Spear"}</h2>` + items.map(({ s, p }) => {
      const w = p.w, line = p.no ? p.no : w?.rep ? w.rep.reason : "No forecast for this time.";
      const d = driveOf(s.id);
      return `<button class="hcard" type="button" data-open="${s.id}">
        <span class="badge" style="--c:${colour(p.score, p.no)}">${fmtScore(p.score, p.no)}</span>
        <span class="hc-main"><b>${esc(s.name)} ${sharkIcon(s)}</b><small>${state.win === "best" && !p.no && bestOf(s.id, state.day) ? `${bestLabel(bestOf(s.id, state.day))} · ` : w && state.win === "best" ? `${w.label} · ` : ""}${esc(line)}</small></span>
        ${d ? `<span class="hc-drive">${d}</span>` : ""}
      </button>`;
    }).join("");
  };
  $("#list").innerHTML = (state.mode !== "spear" ? block("surf") : "") + (state.mode !== "surf" ? block("spear") : "") || `<p class="note">Nothing within your drive limit.</p>`;
}

// ---------- home & outlook ----------
// Light and water temperature for today at the spot nearest you (Bankstown if no location set).
function todayInfo() {
  const o = state.origin || { lat: -33.918, lon: 151.035 };
  const near = SPOTS.filter(x => state.data.spots[x.id]).sort((a, b) => Math.hypot(a.lat - o.lat, a.lon - o.lon) - Math.hypot(b.lat - o.lat, b.lon - o.lon))[0];
  if (!near) return null;
  const fc = state.data.spots[near.id], r = dayResults(todayStr())[near.id];
  const nowKey = new Date(Date.now() + 11 * 36e5).toISOString().slice(0, 13);
  const i = fc.time.findIndex(t => t.slice(0, 13) === nowKey);
  const ssts = SPOTS.map(x => state.data.spots[x.id]?.sst?.[i]).filter(v => v != null);
  return {
    where: near.region,
    light: r?.sunrise ? `${fmtTime(r.firstLight)} – ${fmtTime(new Date(r.sunset + fc.tz))}` : null,
    water: i >= 0 && fc.sst[i] != null ? `${Math.round(fc.sst[i])}°` : null,
    coast: ssts.length ? `${Math.round(Math.min(...ssts))}–${Math.round(Math.max(...ssts))}° along the coast` : "",
  };
}
// BOM marine warnings for today/tomorrow, by zone name
function warnings() {
  const z = state.live?.bom?.zones; if (!z) return [];
  const out = [];
  for (const [aac, zone] of Object.entries(z)) if (aac !== "NSW_MW008") for (const p of zone.periods.slice(0, 2)) if (p.marine_forecast && /warning/i.test(p.marine_forecast)) out.push({ aac, text: p.marine_forecast });
  return out;
}
const ctx = () => ({ today: todayStr(), days: state.days, dayResults, drive: state.drive, maxDrive: state.maxDrive, colour, fmtScore, esc, todayInfo: todayInfo(), locOff: state.locOff && !state.origin, bestOf, bestLabel, sharkIcon, warnings: warnings(), campsFor, KIND, facilities, dirUrl, rainByArea: rainByArea(), rainTint });
function renderHomeView() { $("#home").innerHTML = state.data ? renderHome(ctx()) : `<p class="note">Loading forecast…</p>`; }
function renderOutlookView() { $("#outlook").innerHTML = state.data ? renderOutlook(ctx()) : `<p class="note">Loading forecast…</p>`; }


// ---------- rain ----------
// daily rain (mm) for a spot: the forecast series plus the 4 days of history kept in rainPre
function dailyRain(fc) {
  const out = new Map();
  fc.time.forEach((t, i) => { const d = t.slice(0, 10); out.set(d, (out.get(d) || 0) + (fc.rain[i] || 0)); });
  const pre = fc.rainPre || [], t0 = Date.parse(fc.time[0] + fc.tz);
  pre.forEach((r, k) => { const d = new Date(t0 - (pre.length - k) * 36e5 + 11 * 36e5).toISOString().slice(0, 10); out.set(d, (out.get(d) || 0) + (r || 0)); });
  return out;
}
const shiftDay = (d, n) => new Date(Date.parse(d + "T12:00:00Z") + n * 864e5).toISOString().slice(0, 10);
const rainTint = mm => (mm < 2 ? "var(--s9)" : mm < 10 ? "var(--s5)" : mm < 25 ? "var(--s3)" : "var(--s1)");
// rain by area for Home: last 3 days, today, next 3 days (average of the spots in each region)
function rainByArea() {
  if (!state.data) return [];
  const today = todayStr();
  return REGIONS.map(reg => {
    const ds = SPOTS.filter(s => s.region === reg && state.data.spots[s.id]).map(s => dailyRain(state.data.spots[s.id]));
    if (!ds.length) return null;
    const avg = d => ds.reduce((a, m) => a + (m.get(d) || 0), 0) / ds.length;
    const sum = (a, b) => { let x = 0; for (let n = a; n <= b; n++) x += avg(shiftDay(today, n)); return x; };
    return { region: reg, past: sum(-3, -1), today: avg(today), next: sum(1, 3) };
  }).filter(Boolean);
}

// 7-day rain strip on a spot page: 3 days before the chosen day → 3 days after
function rainStrip(fc, day) {
  const m = dailyRain(fc), today = todayStr();
  const cells = [-3, -2, -1, 0, 1, 2, 3].map(n => {
    const d = shiftDay(day, n), mm = m.get(d);
    if (mm == null) return "";
    const lbl = d === today ? "Today" : new Date(d + "T12:00:00").toLocaleDateString("en-AU", { weekday: "short" });
    return `<span class="rday${d === day ? " on" : ""}"><small>${lbl}</small><b style="--c:${rainTint(mm)}">${mm < 0.5 ? 0 : Math.round(mm)}</b></span>`;
  }).join("");
  return `<div class="rainbox"><small>Rain (mm)</small><div class="rstrip">${cells}</div></div>`;
}

// ---------- trip plan ----------
// the plan is worked out once per forecast refresh (it takes a couple of seconds) and shared by the Plan tab and the map
let planCache = { data: null, plan: null };
function getPlan() {
  if (planCache.data !== state.data || !planCache.plan) planCache = { data: state.data, plan: makePlan(dayResults) };
  return planCache.plan;
}
const spotIcon = s => (s.snorkelOnly ? "🤿" : TYPE_ICON[s.type]);
function renderPlan() {
  if (!state.data) { $("#plan").innerHTML = `<p class="note">Loading forecast…</p>`; return; }
  // first time after a refresh: show a holding line, then work the plan out once the screen has painted
  if (planCache.data !== state.data || !planCache.plan) {
    $("#plan").innerHTML = `<p class="note">Working out the plan…</p>`;
    setTimeout(() => { getPlan(); if (state.view === "planView") renderPlan(); }, 30);
    return;
  }
  const P = getPlan();
  const dname = d => new Date(d + "T12:00:00").toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" });
  const mins = m => (m < 60 ? `${m} min` : `${Math.floor(m / 60)}h${m % 60 ? " " + String(m % 60).padStart(2, "0") : ""}`);
  // north / south of Sydney tag
  const nsTag = lat => (lat > -33.6 ? `<span class="nstag n">N</span>` : lat < -34.0 ? `<span class="nstag s">S</span>` : "");
  const leg = (m, from) => (m == null ? "" : m < 3 ? `right at ${esc(from)}` : `${mins(m)} drive from ${esc(from)}`);
  const sess = (x, day) => {
    const s = SPOTS.find(sp => sp.id === x.id), v = x.vd;
    return `<button class="psess" type="button" data-open="${x.id}" data-day="${day}"><span class="pwhen">${x.when}</span>
      ${x.forecast ? `<span class="badge sm" style="--c:${colour(x.score, x.no)}">${fmtScore(x.score, x.no)}</span>` : ""}
      <span>${spotIcon(s)} <b>${esc(x.name)}</b> ${nsTag(s.lat)}${s.snorkelOnly ? ` <span class="tierchip t1">snorkel only · no-take</span>` : ""}<small>${leg(x.drive ?? x.min, x.driveFrom || "camp")}</small>
      ${v ? `<small class="praw">${esc(v.raw)}</small><small class="pverd">${esc(v.line.replace(/^faces \w+ · /, ""))}${v.why && x.tier < 2 ? ` — <em>${esc(v.why)}</em>` : ""}</small>` : ""}</span></button>`;
  };
  const cand = (o, day) => `<button class="psess cand" type="button" data-open="${o.id}" data-day="${day}"><span>${spotIcon(SPOTS.find(sp => sp.id === o.id))} <b>${esc(o.name)}</b><small>faces ${esc(o.facing)}</small></span></button>`;
  const firmsUp = d => dname(new Date(Date.parse(d + "T12:00:00") - 9 * 864e5).toISOString().slice(0, 10));
  const days = P.days.map((e, k) => {
    const am = e.sessions.filter(x => x.when !== "Arvo"), pm = e.sessions.filter(x => x.when === "Arvo");
    const note = n => `<p class="pnote">${esc(n)}</p>`, pre = e.notes.filter(n => n.startsWith("Pick up")), post = e.notes.filter(n => !n.startsWith("Pick up"));
    const body = e.forecast ? `${pre.map(note).join("")}${am.map(x => sess(x, e.day)).join("")}${pm.map(x => sess(x, e.day)).join("")}${post.map(note).join("")}`
      : `${e.notes.map(n => `<p class="pnote">${esc(n)}</p>`).join("")}
        <p class="pnote prov">Somewhere around <b>${esc(e.region)}</b>. Typical late Oct: S–SE swell, light westerly mornings, NE sea breeze most arvos → surf at dawn before the NE gets up; dive in the arvo — the north-facing side of a headland on a S swell, the south side once the NE is blowing.</p>
        <div class="cands">${(e.cands || []).map(o => cand(o, e.day)).join("")}</div>`;
    const why = e.forecast
      ? `${e.brief ? `<p>${esc(e.brief)}</p>` : ""}
         ${e.sessions.filter(x => x.vd).map(x => `<p><b>${esc(x.name.split(/[(—,]/)[0].trim())}</b>: ${esc(x.vd.line)}.</p>`).join("")}
         ${(e.alts || []).length ? `<p><b>Lost out:</b> ${e.alts.map(a => `${esc(a.name.split(/[(—,]/)[0].trim())} (${fmtScore(a.score)}) — ${esc(a.why)}`).join("; ")}.</p>` : ""}
         ${e.fallback ? `<p><b>If it's worse than forecast:</b> ${esc(e.fallback.name)} faces ${esc(e.fallback.facing)} — a different aspect for the dive${e.fallback.snorkelOnly ? " (snorkel only)" : ""}.</p>` : ""}`
      : `<p><b>Provisional</b> — no forecast for this day yet; it firms up around ${firmsUp(e.day)}. The candidates face different ways so one should suit whatever turns up; a southerly change, an E–NE swell or a lot of rain would move the plan.</p>`;
    return `<article class="pday${e.back ? " backday" : ""}" id="pd-${e.day}">
      <header><b>${dname(e.day)}</b>${e.forecast ? "" : `<em>provisional</em>`}<button class="mapbtn" type="button" data-planmap="${e.day}">Map ›</button></header>
      ${e.back ? `<p class="pback">↩ ${esc(e.back.text)}</p>` : ""}
      ${body}
      ${e.camp ? `<a class="pcamp" href="${dirUrl(e.camp.lat, e.camp.lon)}" target="_blank" rel="noopener"><span>🌙 <b>${esc(e.camp.name)}</b> ${nsTag(e.camp.lat)}</span><small>${KIND[e.camp.kind].icon} ${esc(KIND[e.camp.kind].cost.split(" · ")[0])} · ${e.toCamp != null ? leg(e.toCamp, e.toCampFrom) : e.drive ? `${mins(e.drive)} drive from ${esc(e.from || "last camp")}` : "same camp"}${e.camp.dirt ? " · ⚠ dirt access" : ""}</small>${e.power ? `<small>🔌 Powered site — charge the van. Book ahead.</small>` : ""}</a>` : ""}
      <details class="pwhy"><summary>Why this day</summary>${why}</details>
    </article>`;
  }).join("");
  $("#plan").innerHTML = `<section class="hsec"><h2>Why this plan</h2>
    <div class="hcard whycard"><ul>${(P.why || []).map(w => `<li>${esc(w)}</li>`).join("")}</ul>
    <button class="mapbtn" type="button" data-planmap="all">Whole route on the map ›</button></div></section>${days}`;
}
// the plan drawn on the map: Bankstown → each day's spots → camp … → Bankstown, numbered by night; backtracks dashed
let planLayer = null;
function drawPlanRoute(focusDay) {
  if (!map) return;
  const P = getPlan(); if (!P?.days?.length) return;
  if (!planLayer) { planLayer = L.layerGroup(); layersCtl.addOverlay(planLayer, "Trip plan route"); }
  planLayer.clearLayers(); if (!map.hasLayer(planLayer)) planLayer.addTo(map);
  const H = [PLAN_TRIP.home.lat, PLAN_TRIP.home.lon];
  let at = H; const focus = [];
  P.days.forEach((e, k) => {
    const pts = [at, ...e.sessions.map(x => { const s = SPOTS.find(sp => sp.id === x.id); return [s.lat, s.lon]; })];
    if (e.camp) pts.push([e.camp.lat, e.camp.lon]); else pts.push(H);
    const on = focusDay === "all" || focusDay === e.day;
    L.polyline(pts, { color: e.back ? "#ff9f43" : k % 2 ? "#5fd3ff" : "#ffd166", weight: on ? 4 : 2, opacity: on ? 0.95 : 0.4, dashArray: e.back ? "6 6" : null }).addTo(planLayer);
    if (e.camp) L.marker([e.camp.lat, e.camp.lon], { icon: L.divIcon({ className: "cc", html: `<div class="daypin${on ? " on" : ""}">${+e.day.slice(8)}</div>`, iconSize: [24, 24], iconAnchor: [12, 12] }), title: `Night of ${e.day.slice(8)} Oct: ${e.camp.name}`, zIndexOffset: on ? 4000 : 3000 })
      .bindPopup(`<b>Night ${k + 1} · ${+e.day.slice(8)} Oct</b><br>${esc(e.camp.name)}<br>${e.sessions.map(x => `${x.when}: ${esc(x.name)}`).join("<br>")}`).addTo(planLayer);
    if (focusDay === e.day) focus.push(...pts.slice(1));
    at = e.camp ? [e.camp.lat, e.camp.lon] : H;
  });
  if (focusDay === "all") map.fitBounds(L.latLngBounds(P.days.flatMap(e => (e.camp ? [[e.camp.lat, e.camp.lon]] : [])).concat([H])).pad(0.1));
  else if (focus.length) map.fitBounds(L.latLngBounds(focus).pad(0.35), { maxZoom: 12 });
}

// ---------- spot sheet ----------
function openSheet(id, winLabel) {
  state.open = id;
  const s = SPOTS.find(x => x.id === id), r = dayResults(state.day)[id];
  if (!r) { $("#sheetBody").innerHTML = `<p>No forecast for ${esc(s.name)} on this day.</p>`; $("#sheet").hidden = false; return; }
  const win = r.windows.find(w => w.label === (winLabel || (state.win !== "best" ? state.win : r.best.label))) || r.best;
  state.openWin = win.label;
  const rep = win.rep;
  const legal = s.type === "spear" ? noTakeZoneAt(s.lat, s.lon) : null;
  const dayName = new Date(state.day + "T12:00:00").toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "short" });
  const fcs = state.data.spots[id];
  const side = s.type === "spear" ? (s.sides.find(sd => sd.name === rep?.side) || s.sides[0]) : null;

  const wins = r.windows.map(w => `<button class="win" type="button" data-win="${w.label}" aria-pressed="${w.label === win.label}">
      <b style="--c:${colour(w.score, w.no)}">${fmtScore(w.score, w.no)}</b><small>${w.label}</small></button>`).join("");

  const c = rep?.ctx, facts = [];
  if (c) {
  }

  const parts = rep ? rep.parts.map(p => {
    const pts = p.cap != null ? `max ${p.cap}` : p.max != null ? `${p.pts.toFixed(1)}/${p.max}` : `${p.pts > 0 ? "+" : ""}${p.pts.toFixed(1)}`;
    return `<div class="part"><span><span class="tag ${p.tag === "local rule" ? "local" : ""}">${esc(p.tag)}</span>${esc(p.text)}</span><span class="pts">${pts}</span></div>`;
  }).join("") : "";
  const table = windGraph(s, fcs, state.day, side);
  const bt = bestOf(id, state.day);
  const best = bt ? `<p class="best"><b>${bestLabel(bt)}</b></p>` : "";
  // group repeats (same beach, species and type), newest first
  const groups = new Map();
  for (const x of sharksNear(s.lat, s.lon, 10, Date.now() - 72 * 36e5)) {
    const k = `${x.beach}|${x.species}|${x.kind}`;
    if (groups.has(k)) groups.get(k).n++; else groups.set(k, { ...x, n: 1 });
  }
  const near = [...groups.values()].slice(0, 4);
  const ago = t => { const h = Math.round((Date.now() - t) / 36e5); return h < 1 ? "just now" : h < 48 ? `${h} h ago` : `${Math.round(h / 24)} days ago`; };
  // collapsed to one line; tap to see the detail
  const sharks = near.length ? `<details class="sharkbox${near.some(x => x.km <= 5 && Date.now() - x.t < 24 * 36e5) ? " hot" : ""}"><summary>🦈 Shark activity nearby · ${near.reduce((a, x) => a + x.n, 0)} in 3 days</summary><ul>${near.map(x =>
    `<li>${esc(x.species ? x.species + " shark" : "Shark")} ${x.kind === "tagged" ? "detected (tagged)" : x.kind === "drumline" ? "tagged on a drumline" : "sighted"} · ${esc(x.beach)} · ${x.km.toFixed(1)} km · ${ago(x.t)}${x.n > 1 ? ` (×${x.n} in 3 days)` : ""}</li>`).join("")}</ul><small>SharkSmart NSW (DPIRD / SLS)</small></details>` : "";
  const zone = state.live?.bom?.zones?.[zoneOf(s.lat)];
  const bp = zone?.periods.find(p => (p.start || "").startsWith(state.day));
  const bom = bp ? `<details class="more"${bp.marine_forecast ? " open" : ""}><summary>BOM forecast · ${esc(zone.name.split(":")[0])}</summary>${bp.marine_forecast ? `<p class="warn">${esc(bp.marine_forecast)}</p>` : ""}<dl class="kv">
      ${bp.forecast_winds ? `<dt>Wind</dt><dd>${esc(bomText(bp.forecast_winds))}</dd>` : ""}${bp.forecast_swell1 ? `<dt>Swell</dt><dd>${esc(bomText(bp.forecast_swell1))}${bp.forecast_swell2 ? "; " + esc(bomText(bp.forecast_swell2)) : ""}</dd>` : ""}
      ${bp.forecast_seas ? `<dt>Sea</dt><dd>${esc(bomText(bp.forecast_seas))}</dd>` : ""}${bp.forecast_weather ? `<dt>Weather</dt><dd>${esc(bp.forecast_weather)}</dd>` : ""}</dl></details>` : "";
  const dm = `BOM ${state.day.slice(8)}/${state.day.slice(5, 7)}`;
  const nc = campsNear(id, 30), cheap = nc.filter(x => x.c.kind !== "park").slice(0, 3), park = nc.find(x => x.c.kind === "park");
  const campList = [...cheap, ...(park ? [park] : [])];
  const camps = campList.length ? `<details class="more"><summary>Camp nearby</summary><ul class="camplist">${campList.map(({ c, min }) =>
    `<li><a href="${dirUrl(c.lat, c.lon)}" target="_blank" rel="noopener"><b>${KIND[c.kind].icon} ${esc(c.name)}</b></a> · ${min} min<br><small>${esc(KIND[c.kind].label)} · ${esc(KIND[c.kind].cost)}${c.dirt ? " · ⚠ dirt access" : ""}${facilities(c).length ? " · " + esc(facilities(c).join(", ")) : ""}</small></li>`).join("")}</ul></details>` : "";
  const notes = (state.data.notes?.[id] || []).filter(n => !n.startsWith("BOM ") || n.startsWith(dm));
  const src = notes.filter(n => !n.startsWith("⚠")).map(n => n.split(/ (?:buoy|wind now|wind timing)/)[0]);
  const checked = `<p class="sub small">8 models blended${src.length ? " · checked vs " + esc([...new Set(src)].join(", ")) : ""}${r.agree?.bad ? " · models disagree, low confidence" : ""}</p>`;

  // Spot info: the key facts and the handful of local tips that matter, short and always visible
  const short = t => { const x = String(t || "").replace(/^(Local( rule)?|Generic rule)\s*:\s*/i, "").trim(); const m = x.match(/^.{20,140}?[.;!](\s|$)/); return (m ? m[0] : x.length > 140 ? x.slice(0, 137) + "…" : x).trim().replace(/[;,]$/, ""); };
  const keyFacts = s.type === "spear"
    ? [["Entry", s.spear.entry], ["Depth", `${s.depth[0]}–${s.depth[1]} m`], ...(s.snorkelOnly ? [] : [["Kingfish", "●".repeat(s.spear.kingfish) + "○".repeat(3 - s.spear.kingfish)]]), ["Fish", s.spear.species.slice(0, 5).join(", ")], ["Watch", s.hazards]]
    : [["Break", s.terrain], ["Watch", s.hazards]];
  const tips = [...new Set([...(s.rules || []).map(r => short(r.why)), ...(s.intel || []).map(i => short(i.text))])].filter(Boolean).slice(0, 4);
  const infoCard = `<section class="infocard"><dl class="kv">${keyFacts.map(([k, v]) => `<dt>${k}</dt><dd>${esc(short(v))}</dd>`).join("")}</dl>${tips.length ? `<ul class="tips">${tips.map(t => `<li>${esc(t)}</li>`).join("")}</ul>` : ""}</section>`;

  $("#sheetBody").innerHTML = `
    <div class="sh-head"><span class="badge" style="--c:${colour(win.score, win.no)}">${fmtScore(win.score, win.no)}</span>
      <div><h2>${esc(s.name)}</h2><small><span class="typechip ${s.type}">${spotIcon(s)} ${s.type === "surf" ? "Surf" : s.snorkelOnly ? "Snorkel" : "Spear"}</span>${PARTNER[id].length ? `<span class="typechip both">+ ${PARTNER[id][0].type === "surf" ? "surf" : "spear"} here too</span>` : ""} ${dayName}${r.conf !== "high" ? ` · ${r.conf} confidence` : ""}</small></div></div>
    ${infoCard}
    ${PARTNER[id].map(o => `<button class="partner" type="button" data-open="${o.id}">${TYPE_ICON[o.type]} ${o.type === "surf" ? "Surf" : "Spear"} here too: <b>${esc(o.name)}</b> <span class="badge" style="--c:${colour(dayResults(state.day)[o.id]?.best?.score, dayResults(state.day)[o.id]?.best?.no)}">${fmtScore(dayResults(state.day)[o.id]?.best?.score, dayResults(state.day)[o.id]?.best?.no)}</span> ›</button>`).join("")}
    ${s.snorkelOnly ? `<p class="warn">🤿 Snorkel / freedive only — no-take aquatic reserve, no spearing.</p>` : legal ? `<p class="warn">No spearing: inside ${esc(legal)}</p>` : ""}
    ${win.no ? `<p class="no">${esc(win.no)}</p>` : ""}
    ${best}${sharks}
    ${facts.length ? `<div class="facts">${facts.map(([k, v]) => `<span><small>${k}</small>${esc(v)}</span>`).join("")}</div>` : ""}
    ${table}
    ${rainStrip(fcs, state.day)}
    <div class="gorow"><a class="go" href="${dirUrl(s.access?.lat ?? s.lat, s.access?.lon ?? s.lon)}" target="_blank" rel="noopener">Directions</a>${s.surfline ? `<a class="go sl" href="${s.surfline.url}#sl_universal_link" target="_blank" rel="noopener">Surfline<small>${esc(s.surfline.name)}</small></a>` : ""}</div>
    ${bom}${camps}
    <details class="more"><summary>Why ${fmtScore(win.score, win.no)}?</summary><div class="parts">${parts}</div></details>
    ${checked}`;
  const nowH = (Date.now() - Date.parse(state.day + "T00:00:00+11:00")) / 36e5;
  bindWindScrub($("#sheetBody .windbox"), s, fcs, state.day, side, nowH > 0 && nowH < 24 ? nowH : bt ? bt.a : 7);
  $("#sheet").hidden = false;
}

// ---------- location (automatic) ----------
// Asks for GPS when the app opens and keeps following you; drive times are re-done once you've moved ~3 km.
let gpsWatch = null, lastDriveAt = null;
async function setOrigin(o) {
  const moved = !lastDriveAt || Math.hypot((o.lat - lastDriveAt.lat) * 111, (o.lon - lastDriveAt.lon) * 93) > 3;
  state.origin = o; saveOrigin(o); drawMe();
  if (!moved && state.drive) return;
  lastDriveAt = o;
  state.drive = await driveTimes(o);
  cache.clear(); bestCache.clear();
  renderAll();
}
function startGPS(jump) {
  if (!navigator.geolocation) return;
  if (gpsWatch != null) navigator.geolocation.clearWatch(gpsWatch);
  gpsWatch = navigator.geolocation.watchPosition(
    p => { const o = { lat: p.coords.latitude, lon: p.coords.longitude, label: "You", gps: true, at: Date.now() }; setOrigin(o); if (jump && map) { map.setView([o.lat, o.lon], 11); jump = false; } },
    e => { if (e.code === 1 && !state.locOff) { state.locOff = true; renderAll(); } },
    { enableHighAccuracy: false, timeout: 20000, maximumAge: 2 * 60e3 });
}

// ---------- controls ----------
function renderDays() {
  const today = todayStr();
  const avail = new Set(state.days);
  const tom = state.days[state.days.indexOf(today) + 1];
  const all = [...new Set([...state.days.filter(d => d >= today), ...TRIP])].sort();
  $("#daySel").innerHTML = all.map(d => {
    const dt = new Date(d + "T12:00:00"), ok = avail.has(d);
    const lbl = d === today ? "Today" : d === tom ? "Tomorrow" : dt.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" });
    return `<option value="${d}" ${d === state.day ? "selected" : ""} ${ok ? "" : "disabled"}>${lbl}${TRIP.includes(d) ? " · trip" : ""}${ok ? "" : " (no forecast yet)"}</option>`;
  }).join("");
}
function renderAll() {
  if (!state.data) return;
  renderDays();
  if (state.view === "homeView") renderHomeView();
  else if (state.view === "outlookView") renderOutlookView();
  else if (state.view === "planView") renderPlan();
  else if (state.view === "mapView") renderMap();
  else renderList();
  if (state.open) openSheet(state.open, state.openWin);
}
function showView(v) {
  state.view = v;
  document.querySelectorAll(".tabbar button").forEach(x => x.setAttribute("aria-pressed", x.dataset.view === v));
  document.querySelectorAll(".view").forEach(el => (el.hidden = el.id !== v));
  $("#controls").hidden = !(v === "mapView" || v === "listView");
  if (v === "mapView") setTimeout(() => { map.invalidateSize(); if (!fitted) fitAll(); }, 0);
  renderAll();
}
function setStatus(txt) { $("#status").textContent = txt; }
// rebuild the corrected forecast from the cached blend + latest live data, then redraw
function recompute(redraw) {
  if (!state.raw) return;
  setSharks(state.live?.sharks);
  state.data = correct(state.raw, state.buoys, state.live);
  cache.clear(); bestCache.clear();
  if (redraw) { renderAll(); if (state.open && !$("#sheet").hidden) openSheet(state.open, state.openWin); drawSharks(); }
}

async function load(force) {
  setStatus(force ? "Refreshing…" : "Loading forecast…");
  try {
    const { data, fromCache, error } = await loadForecast({ force });
    state.raw = data; recompute(false);
    state.days = forecastDays(data);
    const today = todayStr();
    if (!state.day || !state.days.includes(state.day)) state.day = state.days.find(d => d >= today) || state.days[0];
    const when = new Date(data.fetchedAt).toLocaleString("en-AU", { weekday: "short", hour: "numeric", minute: "2-digit" });
    setStatus(error || `Updated ${when}${fromCache ? " (cached)" : ""}`);
    renderAll();
  } catch (e) {
    setStatus(`Couldn't load forecast: ${e.message}. Check your connection and tap ↻.`);
  }
  // live data: buoys correct the swell, BOM obs/forecast correct the wind, SharkSmart feeds the shark alerts
  loadBuoys().then(b => { if (b) { state.buoys = b; recompute(true); } }).catch(() => {});
  loadLive().then(d => { if (d) { state.live = d; recompute(true); } }).catch(() => {});
}

document.addEventListener("click", async e => {
  const b = e.target.closest("button, [data-open]"); if (!b) return;
  if (b.dataset.open) {
    if (b.dataset.day) state.day = b.dataset.day;
    openSheet(b.dataset.open, b.dataset.openwin);
  }
  else if (b.dataset.goday) {
    state.day = b.dataset.goday;
    showView("mapView");
    setTimeout(() => map.fitBounds(L.latLngBounds(regionBounds(b.dataset.goregion)).pad(0.4)), 50);
  }
  else if (b.dataset.planmap) {
    const d = b.dataset.planmap;
    if (d !== "all" && state.days.includes(d)) state.day = d;
    fitted = true; showView("mapView");
    setTimeout(() => drawPlanRoute(d), 60);
  }
  else if (b.dataset.day) { state.day = b.dataset.day; renderAll(); }
  else if (b.dataset.mode) { state.mode = b.dataset.mode; b.parentNode.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", x === b)); renderAll(); }
  else if (b.dataset.view) showView(b.dataset.view);
  else if (b.dataset.win) openSheet(state.open, b.dataset.win);
});
$("#sheetClose").addEventListener("click", () => { $("#sheet").hidden = true; state.open = null; state.openWin = null; });
$("#refreshBtn").addEventListener("click", () => { load(true); startGPS(); });
$("#winSel").addEventListener("change", e => { state.win = e.target.value; renderAll(); });
WINDOWS.forEach(([a, b, label]) => { const o = document.createElement("option"); o.value = label; o.textContent = label; $("#winSel").append(o); });
$("#daySel").addEventListener("change", e => { state.day = e.target.value; renderAll(); });

// ---------- start ----------
initMap();
drawSharks();
drawMe();
fetch("data/zones.geojson").then(r => r.json()).then(z => { state.zones = z; drawZones(); }).catch(() => {});
if (state.origin) driveTimes(state.origin).then(d => { state.drive = d; renderAll(); });
startGPS();
renderHomeView();
load(false);
setInterval(() => load(false), 15 * 60e3); // picks up the hourly refresh while the app is open
