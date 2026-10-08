// Small SVG charts for the spot sheet: tide curve, and swell + wind through the day.
import { fmtTime, hourCtx, hSpotAt, angDiff, card, tideFor, tideEventsFor } from "./score.js";

const W = 320;
const hourLabel = h => (h === 12 ? "12pm" : h < 12 ? h + "am" : h - 12 + "pm");

export function windRel(facing, dir, spd) {
  const off = angDiff(dir, facing + 180); // 0 = blowing straight off the land
  const rel = off <= 45 ? "offshore" : off <= 70 ? "cross-offshore" : off <= 110 ? "cross-shore" : off <= 135 ? "cross-onshore" : "onshore";
  return spd < 5 ? `light (${rel})` : rel;
}
export const mph = kn => Math.round(kn * 1.151);
const relColour = rel => (/offshore/.test(rel) && !/cross/.test(rel) ? "var(--s9)" : /cross-off/.test(rel) ? "var(--s7)" : /cross-shore/.test(rel) ? "var(--s5)" : "var(--s1)");

function frame(win, t0, x, top, bottom) {
  let s = "";
  if (win) s += `<rect x="${x(t0 + win.a * 36e5)}" y="${top}" width="${x(t0 + win.b * 36e5) - x(t0 + win.a * 36e5)}" height="${bottom - top}" fill="var(--line)" opacity=".6"/>`;
  return s;
}
function axis(t0, x, y0, H) {
  let s = "";
  [6, 9, 12, 15, 18].forEach(h => { const xx = x(t0 + h * 36e5); s += `<line x1="${xx}" y1="${y0}" x2="${xx}" y2="${y0 + 3}" stroke="var(--muted)"/><text x="${xx}" y="${H - 2}" text-anchor="middle" class="tl">${hourLabel(h)}</text>`; });
  return s;
}
function nowLine(t0, x, top, bottom) {
  const now = Date.now();
  return now > t0 && now < t0 + 864e5 ? `<line x1="${x(now)}" y1="${top}" x2="${x(now)}" y2="${bottom}" stroke="var(--accent)" stroke-width="1.5"/>` : "";
}

// Tide curve: Jacob's BOM tables during the trip, the model sea-level curve on other days.
export function tideGraph(spot, fc, day, win) {
  const H = 96, padT = 16, padB = 16, max = 2.1;
  const t0 = Date.parse(day + "T00:00:00+11:00");
  const x = ms => ((ms - t0) / 864e5) * W;
  const y = h => padT + (1 - h / max) * (H - padT - padB);
  const pts = [];
  for (let m = 0; m <= 1440; m += 15) { const r = tideFor(spot, fc, new Date(t0 + m * 6e4)); if (r) pts.push([x(t0 + m * 6e4), y(r.h)]); }
  if (pts.length < 10) return `<p class="sub">No tide data for this day.</p>`;
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join("");
  const area = `${line}L${pts[pts.length - 1][0].toFixed(1)},${H - padB}L${pts[0][0].toFixed(1)},${H - padB}Z`;
  let s = `<svg class="chart tide" viewBox="0 0 ${W} ${H}" role="img" aria-label="Tide height through the day — touch and drag to read any time">`;
  s += frame(win, t0, x, padT - 6, H - padB);
  s += `<path d="${area}" fill="var(--swell)" opacity=".18"/><path d="${line}" fill="none" stroke="var(--swell)" stroke-width="2"/>`;
  s += axis(t0, x, H - padB, H) + nowLine(t0, x, padT - 6, H - padB);
  tideEventsFor(spot, fc, day).forEach(e => {
    const xx = x(e.time.getTime()), yy = y(e.h), hi = e.type === "H";
    const anchor = xx < 30 ? "start" : xx > W - 30 ? "end" : "middle";
    s += `<circle cx="${xx}" cy="${yy}" r="3" fill="var(--swell)"/><text x="${xx}" y="${hi ? yy - 5 : yy + 11}" text-anchor="${anchor}" class="tl b">${hi ? "H" : "L"} ${fmtTime(e.time)} ${e.h.toFixed(1)}m</text>`;
  });
  // scrub cursor (shown while hovering / touching, see bindTideScrub)
  s += `<g class="tcur" style="display:none"><line y1="${padT - 6}" y2="${H - padB}" stroke="var(--ink)" stroke-width="1"/><circle r="4" fill="var(--card)" stroke="var(--ink)" stroke-width="2"/><rect y="0" height="15" rx="4" fill="#d5f26b"/><text y="11" text-anchor="middle" class="tl b" style="fill:#10170d"></text></g>`;
  return s + `</svg>`;
}

// Surfline-style table every 3 hours: rating bar, surf height at the spot (ft range), primary swell (ft, s, direction),
// wind (arrow coloured offshore→onshore, mph, direction).
// scoreAt(i) scores that exact forecast hour; colourOf(score, no) gives the rating colour.
export function surfTable(spot, fc, day, side, scoreAt, colourOf) {
  const facing = side ? side.facing : spot.facing;
  const shelter = side ? side.shelterSwell : spot.shelterSwell;
  const idx = fc.time.findIndex(t => t.startsWith(day));
  if (idx < 0) return "";
  const isSurf = spot.type === "surf";
  const range = v => { const lo = Math.max(0, Math.floor(v)), hi = Math.max(1, Math.ceil(v)); return lo === hi ? `${hi}` : `${lo}-${hi}`; }; // same as the headline
  const label = h => (h === 0 ? "12am" : h === 12 ? "Noon" : h < 12 ? h + "am" : h - 12 + "pm");
  const nowH = new Date(Date.now() + 11 * 36e5).toISOString().slice(0, 13); // AEDT
  let rows = "";
  for (let h = 3; h <= 21; h += 3) {
    const i = idx + h; if (fc.hs[i] == null) continue;
    const c = hourCtx(spot, fc, i);
    const at = hSpotAt(facing, shelter, c.parts) * 3.28 * (isSurf ? 0.6 + 0.04 * (c.dom.T || 8) : 1);
    const sc = scoreAt(i);
    const lit = !sc ? 0 : sc.no ? 1 : sc.score < 2 ? 1 : sc.score < 4 ? 2 : sc.score < 6 ? 3 : sc.score < 8 ? 4 : 5; // 5 levels, same bands as the badges
    const col = sc ? colourOf(sc.score, sc.no) : "var(--line)";
    const bar = [1, 2, 3, 4, 5].map(k => `<i style="background:${k <= lit ? col : "var(--line)"}"></i>`).join("");
    const wrel = windRel(facing, c.wdir, c.wspd), wc = relColour(wrel);
    const dom = c.dom, swFt = (dom.h || c.hs) * 3.28;
    const now = fc.time[i].slice(0, 13) <= nowH && nowH < (fc.time[i + 3] || "").slice(0, 13);
    rows += `<div class="st-row${now ? " now" : ""}"><span class="st-t">${label(h)}<span class="st-bar" aria-label="${sc ? (sc.no ? "unsafe" : sc.score.toFixed(1) + " out of 10") : "no data"}">${bar}</span></span>`
      + `<span class="st-surf">${range(at)}</span>`
      + `<span class="st-sw"><b>${swFt.toFixed(1)}<small>ft</small></b><b>${Math.round(dom.T)}<small>s</small></b>`
      + `<span class="st-dir"><svg viewBox="-8 -8 16 16" width="18" height="18" aria-hidden="true"><g transform="rotate(${(dom.d + 180) % 360})"><path d="M0,-6.5 L4.5,5 L0,2.5 L-4.5,5 Z" fill="var(--ink)"/></g></svg><small>${Math.round(dom.d)}°</small></span></span>`
      + `<span class="st-wind" style="--wc:${wc}" aria-label="Wind ${card(c.wdir)} ${mph(c.wspd)} mph, ${wrel}"><svg viewBox="-8 -8 16 16" width="18" height="18" aria-hidden="true"><g transform="rotate(${(c.wdir + 180) % 360})"><path d="M0,-6.5 L4.5,5 L0,2.5 L-4.5,5 Z" fill="var(--wc)"/></g></svg><b>${mph(c.wspd)}<small>mph</small></b><small class="wd">${card(c.wdir)}</small></span></div>`;
  }
  if (!rows) return "";
  return `<div class="st"><div class="st-head"><span></span><span>${isSurf ? "Surf (ft)" : "At entry (ft)"}</span><span>Primary swell</span><span>Wind</span></div>${rows}</div>`;
}

// Touch-and-drag (or hover) along the tide chart to read the time and height at that point.
export function bindTideScrub(svg, spot, fc, day) {
  if (!svg) return;
  const H = 96, padT = 16, padB = 16, max = 2.1;
  const t0 = Date.parse(day + "T00:00:00+11:00");
  const g = svg.querySelector(".tcur"), line = g.querySelector("line"), dot = g.querySelector("circle"), box = g.querySelector("rect"), txt = g.querySelector("text");
  const show = e => {
    const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
    const x = Math.max(0, Math.min(W, pt.matrixTransform(svg.getScreenCTM().inverse()).x));
    const ms = Math.round((t0 + (x / W) * 864e5) / 3e5) * 3e5; // nearest 5 min
    const r = tideFor(spot, fc, new Date(ms)); if (!r) return;
    const y = padT + (1 - r.h / max) * (H - padT - padB);
    line.setAttribute("x1", x); line.setAttribute("x2", x);
    dot.setAttribute("cx", x); dot.setAttribute("cy", y);
    txt.textContent = `${fmtTime(new Date(ms))} · ${r.h.toFixed(2)}m ${r.rising ? "↑" : "↓"}`;
    const w = txt.textContent.length * 6.5 + 12, bx = Math.max(0, Math.min(W - w, x - w / 2));
    box.setAttribute("x", bx); box.setAttribute("width", w); txt.setAttribute("x", bx + w / 2);
    g.style.display = "";
  };
  svg.addEventListener("pointerdown", show);
  svg.addEventListener("pointermove", show);
  svg.addEventListener("pointerleave", () => (g.style.display = "none"));
}
