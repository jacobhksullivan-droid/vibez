// App shell: Home, Map, Outlook and List views, plus the spot sheet.
import { SPOTS } from "../data/spots.js";
import { loadForecast, forecastDays } from "./data.js";
import { scoreSpotDay, scoreHourAt, bestTime, setSharks, sharksNear, WINDOWS, fmtTime, card, ft } from "./score.js";
import { correct, zoneOf } from "./correct.js";
import { loadLive, cachedLive, bomText } from "./live.js";
import { tideGraph, bindTideScrub, windRel, surfTable, mph } from "./charts.js";
import { savedOrigin, saveOrigin, driveTimes, fmtDrive } from "./location.js";
import { loadBuoys, cachedBuoys } from "./buoys.js";
import { renderHome } from "./home.js";
import { rankCamps, campsNear, KIND, facilities, CAMPS, DUMPS } from "./camps.js";
import { makePlan } from "./plan.js";
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
let map, markers = {}, meMarker, sharkLayer, campLayer, parkLayer, dumpLayer, fitted = false;
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
  L.control.layers({ Satellite: satellite, Map: street }, { "Sharks (48 h)": sharkLayer, "Free / cheap camps": campLayer, "Caravan parks": parkLayer, "Dump points": dumpLayer }, { position: "topright" }).addTo(map);
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
    filter: f => f.properties.spear === "no",
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
const ctx = () => ({ today: todayStr(), days: state.days, dayResults, drive: state.drive, maxDrive: state.maxDrive, colour, fmtScore, esc, todayInfo: todayInfo(), locOff: state.locOff && !state.origin, bestOf, bestLabel, sharkIcon, warnings: warnings(), campsFor, KIND, facilities, dirUrl });
function renderHomeView() { $("#home").innerHTML = state.data ? renderHome(ctx()) : `<p class="note">Loading forecast…</p>`; }
function renderOutlookView() { $("#outlook").innerHTML = state.data ? renderOutlook(ctx()) : `<p class="note">Loading forecast…</p>`; }

// ---------- trip plan ----------
const SIDE_NAME = { south: "South coast", north: "North coast" };
function renderPlan() {
  if (!state.data) { $("#plan").innerHTML = `<p class="note">Loading forecast…</p>`; return; }
  const forced = prefs.planOrder && prefs.planOrder !== "auto" ? prefs.planOrder : null;
  const P = makePlan(dayResults, forced);
  const [s1, s2] = P.order;
  const dname = d => new Date(d + "T12:00:00").toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" });
  const mins = m => (m < 60 ? `${m} min` : `${Math.floor(m / 60)}h${m % 60 ? " " + String(m % 60).padStart(2, "0") : ""}`);
  const sess = x => `<button class="psess" type="button" data-open="${x.id}" data-day="${x.day}"><span class="pwhen">${x.when}</span>
      ${x.forecast ? `<span class="badge sm" style="--c:${colour(x.score, x.no)}">${fmtScore(x.score, x.no)}</span>` : ""}
      <span>${x.type === "surf" ? "🏄" : "🐟"} <b>${esc(x.name)}</b>${x.easy === "learn" && x.mode === "social" ? " · beginner-friendly" : x.easy === "snorkel" && x.mode === "social" ? " · easy snorkel" : ""}<small>${x.label ? x.label + " · " : ""}${x.from ? "from " + x.from : (x.min ?? 0) + " min drive"}</small></span></button>`;
  const days = P.plan.map(e => `<article class="pday ${e.mode}">
      <header><b>${dname(e.day)}</b><span>${esc(e.who)} · ${SIDE_NAME[e.side]}</span>${e.forecast ? "" : `<em>rough plan · forecast not out yet</em>`}</header>
      ${e.sessions.map(x => sess({ ...x, day: e.day, mode: e.mode })).join("")}
      ${e.notes.map(n => `<p class="pnote">${esc(n)}</p>`).join("")}
      ${e.camp ? `<a class="pcamp" href="${dirUrl(e.camp.c.lat, e.camp.c.lon)}" target="_blank" rel="noopener"><small>${e.area ? "Tonight: " + esc(e.area) : "Tonight"}</small><span>🌙 <b>${esc(e.camp.c.name)}</b></span><small>${KIND[e.camp.c.kind].icon} ${esc(KIND[e.camp.c.kind].label)} · ${esc(KIND[e.camp.c.kind].cost.split(" · ")[0])} · ${mins(e.campDrive)} drive${e.camp.c.dirt ? " · ⚠ dirt access" : ""}${facilities(e.camp.c).length ? " · " + esc(facilities(e.camp.c).join(", ")) : ""}</small></a>` : ""}
    </article>`).join("");
  const opt = (v, t) => `<button type="button" data-planorder="${v}" aria-pressed="${(prefs.planOrder || "auto") === v}">${t}</button>`;
  $("#plan").innerHTML = `<section class="hsec"><h2>Trip plan · 21–31 Oct</h2>
    <div class="legs">
      <div class="leg core"><small>Leg 1 · 21–25 Oct · you + Seb</small><b>${SIDE_NAME[s1]}</b><span>Best surf + spearing</span></div>
      <div class="leg social"><small>Leg 2 · 26–30 Oct · all four</small><b>${SIDE_NAME[s2]}</b><span>Beginner waves + easy snorkelling</span></div>
    </div>
    <ul class="why">${P.why.map(w => `<li>${esc(w)}</li>`).join("")}</ul>
    <div class="seg planorder">${opt("auto", "Auto")}${opt("south", "South first")}${opt("north", "North first")}</div>
    <small class="hint">About ${mins(Math.round(P.totalDrive / 5) * 5)} of driving in total (rough). Re-plans every time the forecast updates.</small>
  </section>${days}`;
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
  const table = surfTable(s, fcs, state.day, side, i => scoreHourAt(s, fcs, i, r.lead), colour);
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

  const info = s.type === "spear"
    ? `<dl class="kv"><dt>Entry</dt><dd>${esc(s.spear.entry)}</dd><dt>Depth</dt><dd>${s.depth[0]}–${s.depth[1]} m</dd><dt>Kingfish</dt><dd>${"●".repeat(s.spear.kingfish)}${"○".repeat(3 - s.spear.kingfish)}</dd><dt>Species</dt><dd>${esc(s.spear.species.join(", "))}</dd><dt>Hazards</dt><dd>${esc(s.hazards)}</dd></dl>`
    : `<dl class="kv"><dt>Break</dt><dd>${esc(s.terrain)}</dd><dt>Hazards</dt><dd>${esc(s.hazards)}</dd></dl>`;
  const rules = (s.rules || []).map(x => `<li>${esc(x.why)}</li>`).join("");
  const intel = (s.intel || []).map(i => `<li>${esc(i.text)}${i.url ? ` <a href="${esc(i.url)}" target="_blank" rel="noopener">source</a>` : ""}</li>`).join("");

  $("#sheetBody").innerHTML = `
    <div class="sh-head"><span class="badge" style="--c:${colour(win.score, win.no)}">${fmtScore(win.score, win.no)}</span>
      <div><h2>${esc(s.name)}</h2><small><span class="typechip ${s.type}">${TYPE_ICON[s.type]} ${s.type === "surf" ? "Surf" : "Spear"}</span>${PARTNER[id].length ? `<span class="typechip both">+ ${PARTNER[id][0].type === "surf" ? "surf" : "spear"} here too</span>` : ""} ${dayName}${r.conf !== "high" ? ` · ${r.conf} confidence` : ""}</small></div></div>
    ${PARTNER[id].map(o => `<button class="partner" type="button" data-open="${o.id}">${TYPE_ICON[o.type]} ${o.type === "surf" ? "Surf" : "Spear"} here too: <b>${esc(o.name)}</b> <span class="badge" style="--c:${colour(dayResults(state.day)[o.id]?.best?.score, dayResults(state.day)[o.id]?.best?.no)}">${fmtScore(dayResults(state.day)[o.id]?.best?.score, dayResults(state.day)[o.id]?.best?.no)}</span> ›</button>`).join("")}
    ${legal ? `<p class="warn">No spearing: inside ${esc(legal)}</p>` : ""}
    ${win.no ? `<p class="no">${esc(win.no)}</p>` : ""}
    ${best}${sharks}
    <div class="wins" role="group" aria-label="Time of day">${wins}</div>
    ${facts.length ? `<div class="facts">${facts.map(([k, v]) => `<span><small>${k}</small>${esc(v)}</span>`).join("")}</div>` : ""}
    ${table}
    <div class="tidebox"><small>Tide</small>${tideGraph(s, fcs, state.day, win)}</div>
    <a class="go" href="${dirUrl(s.access?.lat ?? s.lat, s.access?.lon ?? s.lon)}" target="_blank" rel="noopener">Directions</a>
    <details class="more"><summary>Spot info</summary>${info}${rules ? `<p class="sub">Local rules</p><ul>${rules}</ul>` : ""}${intel ? `<p class="sub">Local intel</p><ul>${intel}</ul>` : ""}</details>
    ${bom}${camps}
    <details class="more"><summary>Why ${fmtScore(win.score, win.no)}?</summary><div class="parts">${parts}</div></details>
    ${checked}`;
  bindTideScrub($("#sheetBody svg.tide"), s, fcs, state.day);
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
  else if (b.dataset.planorder) { prefs.planOrder = b.dataset.planorder; savePrefs(); renderPlan(); }
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
