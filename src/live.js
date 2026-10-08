// Live feed from our Netlify function (/api/live): shark activity, BOM coastal waters forecast + warnings,
// BOM wind observations. Cached so the app still has the last copy offline.
import { BOM_STATIONS } from "../data/spots.js";

const KEY = "cc-live-v1";

export function cachedLive() {
  try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch (e) { return null; }
}

export async function loadLive() {
  try {
    const r = await fetch(`/api/live?st=${BOM_STATIONS.map(s => s.id).join(",")}`);
    if (!r.ok) throw new Error(r.status);
    const d = await r.json();
    try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {}
    return d;
  } catch (e) {
    return cachedLive();
  }
}

// BOM text in our units: knots → mph, metres → feet
export const bomText = t => (t || "")
  .replace(/(\d+)\s*to\s*(\d+)\s*knots/g, (_, a, b) => `${Math.round(a * 1.151)}–${Math.round(b * 1.151)} mph`)
  .replace(/(\d+)\s*knots/g, (_, a) => `${Math.round(a * 1.151)} mph`)
  .replace(/(\d+(?:\.\d+)?)\s*to\s*(\d+(?:\.\d+)?)\s*metres?/g, (_, a, b) => `${Math.round(a * 3.28)}–${Math.round(b * 3.28)} ft`)
  .replace(/(\d+(?:\.\d+)?)\s*metres?/g, (_, a) => `${Math.round(a * 3.28)} ft`);
