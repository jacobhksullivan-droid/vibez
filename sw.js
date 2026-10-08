// Offline support: keeps the app, its data and any map tiles you've looked at.
const VERSION = "__VERSION__";
const SHELL = `shell-${VERSION}`;
const TILES = "tiles-v1";
const MAX_TILES = 3000;
const FILES = [
  "./", "index.html", "style.css", "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png",
  "src/gate.js", "src/app.js", "src/data.js", "src/score.js", "src/charts.js", "src/home.js", "src/outlook.js", "src/location.js", "src/buoys.js",
  "data/secure.bin", "data/zones.geojson", "data/camps.js", "src/camps.js", "src/correct.js", "src/live.js", "src/bomwind.js", "src/plan.js", "src/camps.js",
];
const CDN = [
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js",
];

self.addEventListener("install", e => {
  e.waitUntil((async () => {
    const c = await caches.open(SHELL);
    await c.addAll(FILES);
    await Promise.all(CDN.map(u => fetch(u, { mode: "no-cors" }).then(r => c.put(u, r)).catch(() => {})));
    self.skipWaiting();
  })());
});
self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith("shell-") && k !== SHELL) await caches.delete(k);
    await self.clients.claim();
  })());
});

async function trimTiles() {
  const c = await caches.open(TILES), keys = await c.keys();
  for (let i = 0; i < keys.length - MAX_TILES; i++) await c.delete(keys[i]);
}

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;
  // Live data (forecast, buoys, drive times, place search): never cache here; the app keeps its own copies
  if (/open-meteo\.com$|hydraulics\.works$|project-osrm\.org$|komoot\.io$/.test(url.host)) return;
  // Map tiles: cache first, keep what you've viewed
  if (url.host === "server.arcgisonline.com" || url.host.endsWith("tile.openstreetmap.org")) {
    e.respondWith((async () => {
      const c = await caches.open(TILES);
      const hit = await c.match(e.request);
      if (hit) return hit;
      try { const r = await fetch(e.request); if (r.ok || r.type === "opaque") { c.put(e.request, r.clone()); trimTiles(); } return r; }
      catch (err) { return new Response("", { status: 504 }); }
    })());
    return;
  }
  // App files: network first (so updates show), cache when offline
  if (url.origin === location.origin) {
    e.respondWith((async () => {
      const c = await caches.open(SHELL);
      try { const r = await fetch(e.request, { cache: "no-cache" }); if (r.ok) c.put(e.request, r.clone()); return r; }
      catch (err) { return (await c.match(e.request, { ignoreSearch: true })) || (await c.match("index.html")); }
    })());
    return;
  }
  // CDN libraries and fonts: cache first
  e.respondWith((async () => {
    const c = await caches.open(SHELL);
    const hit = await c.match(e.request);
    if (hit) return hit;
    try { const r = await fetch(e.request); c.put(e.request, r.clone()); return r; } catch (err) { return new Response("", { status: 504 }); }
  })());
});
