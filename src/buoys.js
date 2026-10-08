// Live MHL wave buoys (Manly Hydraulics Laboratory public feed).
import { BUOYS } from "../data/spots.js";

const KEY = "cc-buoys-v1";
const API = "https://api.manly.hydraulics.works/api.php?page=latest-readings&username=publicwww&sitecode=";

// MHL timestamps are in standard time (AEST, UTC+10).
const parseObs = s => new Date(s.replace(" ", "T") + "+10:00");

export function cachedBuoys() {
  try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch (e) { return null; }
}

export async function loadBuoys() {
  const out = await Promise.all(BUOYS.map(async b => {
    try {
      const r = await fetch(API + b.id);
      const d = await r.json();
      const by = name => Object.values(d).find(v => v.name === name || v.unit_type === name);
      const hs = by("Hs"), tp = by("TP1"), dir = by("Wave Direction"), sst = by("Sea Temp");
      if (!hs) return null;
      return { ...b, hs: hs.value[0], tp: tp?.value[0], dir: dir?.value[0], sst: sst?.value[0], time: parseObs(hs.obsdate).getTime() };
    } catch (e) { return null; }
  }));
  const list = out.filter(Boolean);
  if (list.length) { try { localStorage.setItem(KEY, JSON.stringify({ at: Date.now(), list })); } catch (e) {} }
  return list.length ? { at: Date.now(), list } : cachedBuoys();
}

export function nearestBuoy(list, lat, lon) {
  if (!list?.length) return null;
  let best = null, bd = Infinity;
  for (const b of list) { const d = (b.lat - lat) ** 2 + ((b.lon - lon) * Math.cos(lat * Math.PI / 180)) ** 2; if (d < bd) { bd = d; best = b; } }
  return best;
}
