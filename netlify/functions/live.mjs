// Live data the phones can't fetch directly (no CORS): shark activity (NSW SharkSmart map feeds),
// BOM coastal waters forecast + warnings, and BOM wind observations. Cached at Netlify's edge for 10 min.
// GET /api/live?st=95749,95770,...   (st = BOM station ids for wind obs)

const UA = { "User-Agent": "Mozilla/5.0 (EpicCamper trip app)" };
const SHARK_FEEDS = ["VR4G2", "SLSNSW2", "DPINSW", "SSPRO2", "TRAUMA", "EVENTS"];
// notification titles that mean an actual shark (not drone status / no-drumline notices)
const SHARK_TITLE = /tagged shark detection|drone sighting|shark reported|tagging template|sighting|incident|trauma|bite/i;
const NOT_SHARK = /no drones|paused|resumed|drone location|no sightings|no drumlines|reopened/i;
const SPECIES = /(white|bull|tiger|bronze whaler|whaler|hammerhead|grey nurse|mako)\s+shark/i;

async function get(url, type = "json") {
  const r = await fetch(url, { headers: UA });
  if (!r.ok) throw new Error(`${url} ${r.status}`);
  return type === "json" ? r.json() : r.text();
}

async function sharks() {
  const since = Date.now() - 7 * 864e5, seen = new Set(), out = [];
  const feeds = await Promise.all(SHARK_FEEDS.map(f => get(`https://map-v2.pivotanalytics.com.au/api/geojson/${f}?days=7`).catch(() => null)));
  feeds.forEach((d, k) => {
    for (const ft of d?.features || []) {
      const [lon, lat] = ft.geometry?.coordinates || [];
      if (lat == null || lat < -37.8 || lat > -28) continue;
      for (const n of ft.properties?._notifications || []) {
        const title = n.title || "", msg = n.message || "";
        if (!SHARK_TITLE.test(title + " " + msg) || NOT_SHARK.test(title)) continue;
        const t = Date.parse(n.detectionDate);
        if (!(t > since) || seen.has(msg)) continue;
        seen.add(msg);
        const kind = /detection/i.test(title) ? "tagged" : /tagging template/i.test(title) ? "drumline" : "sighting";
        out.push({ lat, lon, beach: ft.properties.beachName, kind, species: (msg.match(SPECIES) || [])[1] || null, msg, t, src: SHARK_FEEDS[k] });
      }
    }
  });
  return out.sort((a, b) => b.t - a.t);
}

// BOM coastal waters forecast (IDN11001): per zone, per day: winds/seas/swell text + any warning line
async function bom() {
  const xml = await get("https://www.bom.gov.au/fwo/IDN11001.xml", "text");
  const zones = {};
  const areaRe = /<area aac="(NSW_MW\d+)" description="([^"]+)"[^>]*>([\s\S]*?)<\/area>/g;
  for (const [, aac, name, body] of xml.matchAll(areaRe)) {
    const periods = [];
    for (const [, attrs, inner] of body.matchAll(/<forecast-period([^>]*)>([\s\S]*?)<\/forecast-period>/g)) {
      const start = (attrs.match(/start-time-local="([^"]+)"/) || [])[1];
      const p = { start };
      for (const [, type, text] of inner.matchAll(/<(?:text|warning-summary) type="([^"]+)">([\s\S]*?)<\/(?:text|warning-summary)>/g)) p[type] = text.replace(/\s+/g, " ").trim();
      periods.push(p);
    }
    zones[aac] = { name, periods };
  }
  const issued = (xml.match(/<issue-time-local[^>]*>([^<]+)</) || [])[1];
  return { issued, zones };
}

const utc = u => Date.UTC(+u.slice(0, 4), +u.slice(4, 6) - 1, +u.slice(6, 8), +u.slice(8, 10), +u.slice(10, 12)); // yyyymmddhhmmss
// latest reading per station, plus (hist=1) the on-the-hour readings for the last ~3 days, used to score the models
async function obs(ids, hist) {
  const out = {};
  await Promise.all(ids.map(async id => {
    try {
      const all = (await get(`https://www.bom.gov.au/fwo/IDN60801/IDN60801.${id}.json`)).observations.data;
      const d = all[0];
      out[id] = { name: d.name, t: utc(d.aifstime_utc), wspd: d.wind_spd_kt, wdir: d.wind_dir, gust: d.gust_kt };
      if (hist) out[id].hist = all.filter(x => x.aifstime_utc.slice(10, 12) === "00" && x.wind_spd_kt != null).map(x => [utc(x.aifstime_utc), x.wind_spd_kt, x.wind_dir]);
    } catch (e) { /* station down: skip */ }
  }));
  return out;
}

export default async (req) => {
  const q = new URL(req.url).searchParams;
  const ids = (q.get("st") || "").split(",").filter(x => /^\d{4,6}$/.test(x)).slice(0, 30);
  if (q.get("only") === "obs") return new Response(JSON.stringify({ at: Date.now(), obs: await obs(ids, true) }), { headers: { "content-type": "application/json", "cache-control": "public, max-age=600", "netlify-cdn-cache-control": "public, durable, max-age=1200" } });
  const [s, b, o] = await Promise.all([sharks().catch(() => null), bom().catch(() => null), obs(ids, false).catch(() => ({}))]);
  return new Response(JSON.stringify({ at: Date.now(), sharks: s, bom: b, obs: o }), {
    headers: {
      "content-type": "application/json",
      "cache-control": "public, max-age=300",
      "netlify-cdn-cache-control": "public, durable, max-age=600, stale-while-revalidate=600",
    },
  });
};

export const config = { path: "/api/live" };
