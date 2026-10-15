// Coast tab: conditions for each section of the coast on a chosen day — swell (real swell vs wind chop), morning and
// arvo wind, rain, and the best surf + dive in that section. Replaced the trip planner (Jacob, 15 Oct: "scrap the plan").
import { SPOTS, REGIONS } from "../data/spots.js";
import { card } from "./score.js";

const mph = kn => Math.round(kn * 1.151), ftR = m => Math.round(m * 3.28);
const km = (a, b) => Math.hypot((a.lat - b.lat) * 111, (a.lon - b.lon) * 93);

// a spot near the middle of the section stands in for its swell + wind
function repSpot(reg, spots) {
  const list = SPOTS.filter(s => s.region === reg && spots[s.id]);
  if (!list.length) return null;
  const mid = { lat: list.reduce((a, s) => a + s.lat, 0) / list.length, lon: list.reduce((a, s) => a + s.lon, 0) / list.length };
  return list.sort((a, b) => km(a, mid) - km(b, mid))[0];
}
// swell trains at one hour: the real swell (8 s+) and the biggest wind chop
function seaAt(fc, i) {
  const t = [["p1h", "p1d", "p1T"], ["p2h", "p2d", "p2T"], ["wwh", "wwd", "wwT"]]
    .map(([h, d, T]) => ({ h: fc[h]?.[i], d: fc[d]?.[i], T: fc[T]?.[i] })).filter(p => p.h != null && p.d != null && p.T != null && p.h >= 0.1);
  const swell = t.filter(p => p.T >= 8 && p.h >= 0.25).sort((a, b) => b.h * b.T * b.T - a.h * a.T * a.T)[0] || null;
  const chop = t.filter(p => p.T < 8).sort((a, b) => b.h - a.h)[0] || null;
  return { swell, chop };
}
const hourIdx = (fc, day, h) => fc.time.indexOf(`${day}T${String(h).padStart(2, "0")}:00`);

export function renderCoast(ctx) {
  const { today, days, dayResults, colour, fmtScore, esc, spots, dailyRain, shiftDay, rainTint, day, tripDays } = ctx;
  const avail = days.filter(d => d >= today);
  const chips = avail.map(d => {
    const dt = new Date(d + "T12:00:00");
    return `<button type="button" class="cday${d === day ? " on" : ""}${tripDays.includes(d) ? " trip" : ""}" data-coastday="${d}">
      <small>${d === today ? "Today" : dt.toLocaleDateString("en-AU", { weekday: "short" })}</small><b>${dt.getDate()}</b></button>`;
  }).join("");
  const res = dayResults(day);
  const best = (reg, type) => SPOTS.filter(s => s.region === reg && s.type === type && !s.snorkelOnly && res[s.id])
    .map(s => ({ s, r: res[s.id] })).sort((a, b) => (b.r.best.no ? -1 : b.r.score) - (a.r.best.no ? -1 : a.r.score))[0] || null;
  const line = (x, icon) => {
    if (!x) return "";
    const b = x.r.best, why = b.no ? b.no : b.rep?.reason || "";
    return `<button type="button" class="cspot" data-open="${x.s.id}" data-day="${day}"><span class="badge sm" style="--c:${colour(b.score, b.no)}">${fmtScore(b.score, b.no)}</span>
      <span>${icon} <b>${esc(x.s.name)}</b><small>${esc(b.label)} · ${esc(why)}</small></span></button>`;
  };
  const tops = { surf: null, spear: null };
  const cards = [...REGIONS].reverse().map(reg => {
    const rs = repSpot(reg, spots); if (!rs) return "";
    const fc = spots[rs.id];
    const am = hourIdx(fc, day, 7), pm = hourIdx(fc, day, 14);
    const sea = am >= 0 ? seaAt(fc, am) : { swell: null, chop: null };
    const swellTxt = sea.swell ? `${card(sea.swell.d)} ${ftR(sea.swell.h)} ft · ${Math.round(sea.swell.T)} s` : "no real swell";
    const chopTxt = sea.chop && (!sea.swell || sea.chop.h > sea.swell.h * 0.6) ? `${sea.swell ? " + " : " — "}${card(sea.chop.d)} chop ${ftR(sea.chop.h)} ft` : "";
    const wind = i => (i >= 0 && fc.wspd[i] != null ? `${card(fc.wdir[i])} ${mph(fc.wspd[i])} mph` : "–");
    // rain: average of the section's spots, the 3 days before + the day itself
    const rains = SPOTS.filter(s => s.region === reg && spots[s.id]).map(s => dailyRain(spots[s.id]));
    const avg = d => rains.reduce((a, m) => a + (m.get(d) || 0), 0) / rains.length;
    const before = avg(shiftDay(day, -3)) + avg(shiftDay(day, -2)) + avg(shiftDay(day, -1)), on = avg(day);
    const su = best(reg, "surf"), sp = best(reg, "spear");
    if (su && !su.r.best.no && (!tops.surf || su.r.score > tops.surf.r.score)) tops.surf = { ...su, reg };
    if (sp && !sp.r.best.no && (!tops.spear || sp.r.score > tops.spear.r.score)) tops.spear = { ...sp, reg };
    return `<article class="ccard">
      <header><b>${esc(reg)}</b>
        <span class="cpins">🏄 <span class="badge sm" style="--c:${colour(su?.r.score, su?.r.best.no)}">${fmtScore(su?.r.score, su?.r.best.no)}</span> 🐟 <span class="badge sm" style="--c:${colour(sp?.r.score, sp?.r.best.no)}">${fmtScore(sp?.r.score, sp?.r.best.no)}</span></span></header>
      <dl class="cfacts">
        <dt>Swell</dt><dd>${swellTxt}${chopTxt}</dd>
        <dt>Wind</dt><dd>7am ${wind(am)} · 2pm ${wind(pm)}</dd>
        <dt>Rain</dt><dd><b style="color:${rainTint(before)}">${Math.round(before)} mm</b> last 3 days · <b style="color:${rainTint(on)}">${Math.round(on)} mm</b> on the day</dd>
      </dl>
      ${line(su, "🏄")}${line(sp, "🐟")}
    </article>`;
  }).join("");
  const dname = new Date(day + "T12:00:00").toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "short" });
  const top = (x, what) => (x ? `<button type="button" class="cspot" data-open="${x.s.id}" data-day="${day}"><span class="badge sm" style="--c:${colour(x.r.score)}">${fmtScore(x.r.score)}</span><span>Best ${what}: <b>${esc(x.s.name)}</b><small>${esc(x.reg)}</small></span></button>` : "");
  return `<div class="cdays">${chips}</div>
    <section class="hsec"><h2>${esc(dname)}</h2>
      <div class="ctop">${top(tops.surf, "surf")}${top(tops.spear, "dive")}</div></section>
    <section class="hsec ccards">${cards}</section>
    <p class="note">North at the top, south at the bottom. Swell and wind are for the middle of each section; tap a spot for the full forecast.</p>`;
}
