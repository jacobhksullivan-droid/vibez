// Small SVG charts for the spot sheet: tide curve, and swell + wind through the day.
import { fmtTime, angDiff, card, tideFor, tideEventsFor } from "./score.js";

const W = 320;
const hourLabel = h => (h === 12 ? "12pm" : h < 12 ? h + "am" : h - 12 + "pm");

export const mph = kn => Math.round(kn * 1.151);
// plain-English wind for the spot table: one coloured word (light wind = glassy, whatever the direction)
export function windKind(facing, dir, spd) {
  if (spd < 5) return { label: "Glassy", c: "var(--s9)" };
  const off = angDiff(dir, facing + 180);
  return off <= 45 ? { label: "Offshore", c: "var(--s9)" } : off <= 70 ? { label: "Cross-off", c: "var(--s7)" }
    : off <= 110 ? { label: "Cross-shore", c: "var(--s5)" } : off <= 135 ? { label: "Cross-on", c: "var(--s3)" } : { label: "Onshore", c: "var(--s1)" };
}

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

// Wind chart for the day (Apple Weather style): wind speed area + gust line in mph, direction arrows along the top
// (pointing the way the wind blows, coloured offshore → onshore for this spot), hours before now dashed.
// Drag along it to read any hour (bindWindScrub). Readout above: time · speed + direction · offshore/onshore · gusts.
const WH = 170, WT = 34, WB = 18, WR = 22; // height, top band (arrows), bottom axis, right axis
function windSeries(fc, day) {
  const idx = fc.time.findIndex(t => t.startsWith(day)); if (idx < 0) return null;
  const out = [];
  for (let h = 0; h <= 24; h++) { const i = idx + h; if (fc.wspd[i] == null) continue; out.push({ h, i, spd: mph(fc.wspd[i]), gust: fc.gust?.[i] != null ? mph(fc.gust[i]) : null, dir: fc.wdir[i] }); }
  return out.length > 4 ? out : null;
}
export function windGraph(spot, fc, day, side) {
  const ser = windSeries(fc, day); if (!ser) return `<p class="sub">No wind forecast for this day.</p>`;
  const facing = side ? side.facing : spot.facing;
  const top = Math.max(15, Math.ceil(Math.max(...ser.map(p => p.gust ?? p.spd)) / 5) * 5 + 5);
  const PW = W - WR, x = h => (h / 24) * PW, y = v => WT + (1 - v / top) * (WH - WT - WB);
  const nowH = (Date.now() - Date.parse(day + "T00:00:00+11:00")) / 36e5;
  const path = (key, from, to) => ser.filter(p => p[key] != null && p.h >= from && p.h <= to).map((p, k) => `${k ? "L" : "M"}${x(p.h).toFixed(1)},${y(p[key]).toFixed(1)}`).join("");
  const cut = Math.max(0, Math.min(24, Math.ceil(nowH)));
  let s = `<svg class="chart wind" viewBox="0 0 ${W} ${WH}" role="img" aria-label="Wind through the day — touch and drag to read any hour">`;
  for (let v = 0; v <= top; v += 5) if (v % (top > 30 ? 10 : 5) === 0) s += `<line x1="0" x2="${PW}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)"/><text x="${W - 2}" y="${y(v) + 3}" text-anchor="end" class="tl">${v}</text>`;
  [6, 12, 18].forEach(h => (s += `<line x1="${x(h)}" x2="${x(h)}" y1="${WT}" y2="${WH - WB}" stroke="var(--line)" stroke-dasharray="2 3"/><text x="${x(h)}" y="${WH - 4}" text-anchor="middle" class="tl">${String(h).padStart(2, "0")}</text>`));
  const area = path("spd", 0, 24), first = ser[0], last = ser[ser.length - 1];
  s += `<path d="${area}L${x(last.h)},${y(0)}L${x(first.h)},${y(0)}Z" fill="var(--swell)" opacity=".22"/>`;
  // past (dashed, dim) and future (solid) parts of the gust and wind lines
  for (const [key, col, w] of [["gust", "var(--s9)", 2.2], ["spd", "var(--swell)", 2.6]]) {
    if (cut > 0) s += `<path d="${path(key, 0, cut)}" fill="none" stroke="${col}" stroke-width="${w}" stroke-dasharray="4 4" opacity="${key === "gust" ? 0.35 : 0.6}"/>`;
    if (cut < 24) s += `<path d="${path(key, cut, 24)}" fill="none" stroke="${col}" stroke-width="${w}" opacity="${key === "gust" ? 0.55 : 1}"/>`;
  }
  // direction arrows every 2 h, coloured for this spot
  ser.filter(p => p.h % 2 === 0 && p.h < 24).forEach(p => {
    const k = windKind(facing, p.dir, p.spd / 1.151);
    s += `<g transform="translate(${x(p.h) + PW / 24},${WT / 2}) rotate(${(p.dir + 180) % 360})"><path d="M0,-7 L4.5,4.5 L0,2 L-4.5,4.5 Z" fill="${k.c}"/></g>`;
  });
  s += `<g class="wcur" style="display:none"><line y1="${WT - 4}" y2="${WH - WB}" stroke="var(--ink)" stroke-width="1.5"/><circle r="6" fill="#fff" stroke="var(--card)" stroke-width="2"/></g>`;
  return `<div class="windbox"><div class="wread"></div>${s}</svg></div>`;
}
// readout + drag: defaults to now (today) or the start of the day's best window
export function bindWindScrub(box, spot, fc, day, side, startH) {
  if (!box) return;
  const svg = box.querySelector("svg.wind"), read = box.querySelector(".wread"); if (!svg) return;
  const ser = windSeries(fc, day), facing = side ? side.facing : spot.facing;
  const top = Math.max(15, Math.ceil(Math.max(...ser.map(p => p.gust ?? p.spd)) / 5) * 5 + 5);
  const PW = W - WR, y = v => WT + (1 - v / top) * (WH - WT - WB);
  const g = svg.querySelector(".wcur"), line = g.querySelector("line"), dot = g.querySelector("circle");
  const show = h => {
    h = Math.max(0, Math.min(24, h));
    const a = ser.filter(p => p.h <= h).pop() || ser[0], b = ser.find(p => p.h > h) || a, f = b.h > a.h ? (h - a.h) / (b.h - a.h) : 0;
    const spd = a.spd + (b.spd - a.spd) * f, gust = a.gust != null && b.gust != null ? a.gust + (b.gust - a.gust) * f : null;
    const p = f < 0.5 ? a : b, k = windKind(facing, p.dir, spd / 1.151), x = (h / 24) * PW;
    line.setAttribute("x1", x); line.setAttribute("x2", x); dot.setAttribute("cx", x); dot.setAttribute("cy", y(spd)); g.style.display = "";
    const hh = Math.floor(h), mm = Math.round((h - hh) * 60 / 5) * 5;
    read.innerHTML = `<small>${String(hh % 24).padStart(2, "0")}:${String(mm % 60).padStart(2, "0")}</small><b>${Math.round(spd)} <span>${card(p.dir)}</span></b>`
      + `<em style="--wc:${k.c}">${k.label}</em>${gust != null ? `<small>Gusts: ${Math.round(gust)} mph</small>` : ""}`;
  };
  const fromEvent = e => { const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; return (pt.matrixTransform(svg.getScreenCTM().inverse()).x / PW) * 24; };
  svg.addEventListener("pointerdown", e => show(fromEvent(e)));
  svg.addEventListener("pointermove", e => show(fromEvent(e)));
  show(startH);
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
