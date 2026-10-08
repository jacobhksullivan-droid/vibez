// Where you are, and drive times from there to every spot's car park.
// Drive times: OSRM public server (free), +15% for the campervan. Cached for offline use.
import { SPOTS } from "../data/spots.js";

const LOC_KEY = "cc-origin-v1";
const DRIVE_KEY = "cc-drive-v1";
export const CAMPER = 1.15;

export const PRESETS = [
  { label: "Bankstown (Apollo depot)", lat: -33.9180, lon: 150.9870 },
];

export function savedOrigin() {
  try { return JSON.parse(localStorage.getItem(LOC_KEY)); } catch (e) { return null; }
}
export function saveOrigin(o) {
  try { localStorage.setItem(LOC_KEY, JSON.stringify(o)); } catch (e) {}
}

export function gpsOrigin() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("This phone doesn't share location with the app"));
    navigator.geolocation.getCurrentPosition(
      p => resolve({ lat: p.coords.latitude, lon: p.coords.longitude, label: "My location", gps: true, at: Date.now() }),
      e => reject(new Error(e.code === 1 ? "Location permission is off for this app (Settings → Privacy → Location Services → Safari Websites)" : "Couldn't get a GPS fix")),
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 5 * 60e3 });
  });
}

export async function searchPlaces(q) {
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=6&bbox=148.5,-37.8,153.8,-28.5&lang=en`;
  const r = await fetch(url);
  if (!r.ok) throw new Error("search failed");
  const d = await r.json();
  return d.features.map(f => {
    const p = f.properties, [lon, lat] = f.geometry.coordinates;
    const sub = [p.city || p.town || p.county, p.state].filter(Boolean).filter(x => x !== p.name).join(", ");
    return { label: p.name + (sub ? `, ${sub}` : ""), lat, lon };
  });
}

// straight-line fallback when offline: ~1.35x road factor at ~70 km/h
function estimateMin(o, s) {
  const R = 6371, toR = Math.PI / 180;
  const dLat = (s.lat - o.lat) * toR, dLon = (s.lon - o.lon) * toR;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(o.lat * toR) * Math.cos(s.lat * toR) * Math.sin(dLon / 2) ** 2;
  const km = 2 * R * Math.asin(Math.sqrt(a)) * 1.35;
  return (km / 70) * 60 * CAMPER;
}

// Returns { minutes: {spotId: n}, estimated: bool }
export async function driveTimes(origin) {
  const key = `${origin.lat.toFixed(3)},${origin.lon.toFixed(3)}`;
  let store = {};
  try { store = JSON.parse(localStorage.getItem(DRIVE_KEY)) || {}; } catch (e) {}
  if (store.key === key && SPOTS.every(s => store.minutes?.[s.id] != null)) return { minutes: store.minutes, estimated: false };
  const dest = SPOTS.map(s => `${(s.access?.lon ?? s.lon).toFixed(5)},${(s.access?.lat ?? s.lat).toFixed(5)}`);
  try {
    const r = await fetch(`https://router.project-osrm.org/table/v1/driving/${origin.lon.toFixed(5)},${origin.lat.toFixed(5)};${dest.join(";")}?sources=0&annotations=duration`);
    const d = await r.json();
    if (d.code !== "Ok") throw new Error(d.code);
    const minutes = {};
    SPOTS.forEach((s, i) => { const sec = d.durations[0][i + 1]; minutes[s.id] = sec == null ? estimateMin(origin, s) : (sec / 60) * CAMPER; });
    try { localStorage.setItem(DRIVE_KEY, JSON.stringify({ key, minutes })); } catch (e) {}
    return { minutes, estimated: false };
  } catch (e) {
    const minutes = {};
    SPOTS.forEach(s => (minutes[s.id] = estimateMin(origin, { lat: s.access?.lat ?? s.lat, lon: s.access?.lon ?? s.lon })));
    return { minutes, estimated: true };
  }
}

export function fmtDrive(min, estimated) {
  if (min == null) return "";
  const m = Math.round(min / 5) * 5;
  const s = m < 60 ? `${m} min` : `${Math.floor(m / 60)}h${m % 60 ? " " + String(m % 60).padStart(2, "0") : ""}`;
  return (estimated ? "~" : "") + s;
}
