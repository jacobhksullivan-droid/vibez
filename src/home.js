// Home: today's light + water near you, best right now, best in the next 24 hours.
import { SPOTS } from "../data/spots.js";
import { WINDOWS } from "./score.js";
import { fmtDrive } from "./location.js";

const TOP = 3;
const dayLabel = (day, today) => {
  if (day === today) return "Today";
  const t = new Date(today + "T12:00:00"); t.setDate(t.getDate() + 1);
  const tom = t.toLocaleDateString("en-CA");
  return day === tom ? "Tomorrow" : new Date(day + "T12:00:00").toLocaleDateString("en-AU", { weekday: "short" });
};

// ctx: { today, days, dayResults(day), drive: {minutes, estimated}, maxDrive (min|null), colour, fmtScore, esc, todayInfo }
export function renderHome(ctx) {
  const { today, days, dayResults, drive, maxDrive, colour, fmtScore, esc, bestOf, bestLabel, sharkIcon } = ctx;
  const nowH = new Date().getHours() + new Date().getMinutes() / 60;
  const tomorrow = days[days.indexOf(today) + 1];
  const okDrive = s => maxDrive == null || drive?.minutes?.[s.id] == null || drive.minutes[s.id] <= maxDrive;

  // all upcoming windows in the next 24 h, per spot
  const slots = [];
  [today, tomorrow].forEach(day => {
    if (!day || !days.includes(day)) return;
    const res = dayResults(day);
    for (const s of SPOTS) {
      const r = res[s.id]; if (!r) continue;
      for (const w of r.windows) {
        if (w.score == null) continue;
        const startsIn = (day === today ? w.a : w.a + 24) - nowH;
        const endsIn = (day === today ? w.b : w.b + 24) - nowH;
        if (endsIn <= 0 || startsIn > 24) continue;
        slots.push({ s, day, w, startsIn });
      }
    }
  });

  // "right now" = the window we're in, or the next one to start
  const upcoming = slots.filter(x => x.startsIn > -3).sort((a, b) => a.startsIn - b.startsIn);
  const first = upcoming[0];
  const nowSlots = first ? slots.filter(x => x.day === first.day && x.w.label === first.w.label) : [];
  const nowTitle = first ? (first.startsIn <= 0 ? `Right now · ${first.w.label} ${first.w.a}–${first.w.b}` : `Next session · ${dayLabel(first.day, today)} ${first.w.label.toLowerCase()} ${first.w.a}–${first.w.b}`) : "Right now";

  const best24 = new Map();
  for (const x of slots) { const k = x.s.id, cur = best24.get(k); if (!cur || x.w.score > cur.w.score) best24.set(k, x); }

  // "Tomorrow · Best 6–9am · " — the best 2–3 h block of that day
  const when = (x, showWhen) => {
    const b = !x.w.no && bestOf(x.s.id, x.day);
    return `${showWhen ? dayLabel(x.day, today) + " " : ""}${b ? bestLabel(b) : showWhen ? x.w.label.toLowerCase() : ""}${showWhen || b ? " · " : ""}`;
  };
  const card_ = (x, showWhen) => {
    const { s, w, day } = x, rep = w.rep;
    const line = w.no || rep?.reason || "";
    const d = drive?.minutes?.[s.id];
    return `<button class="hcard" type="button" data-open="${s.id}" data-day="${day}" data-openwin="${w.label}">
      <span class="badge" style="--c:${colour(w.score, w.no)}">${fmtScore(w.score, w.no)}</span>
      <span class="hc-main"><b>${esc(s.name)} ${sharkIcon(s)}</b><small>${when(x, showWhen)}${esc(line)}</small></span>
      ${d != null ? `<span class="hc-drive">${fmtDrive(d, drive.estimated)}</span>` : ""}
    </button>`;
  };
  // near you first: within 2 h; widen to 4 h, then anywhere, if there aren't enough
  const within = (x, lim) => !drive?.minutes || drive.minutes[x.s.id] == null || drive.minutes[x.s.id] <= lim;
  const top = (list, type) => {
    const all = list.filter(x => x.s.type === type).sort((a, b) => (b.w.no ? -1 : b.w.score) - (a.w.no ? -1 : a.w.score));
    for (const lim of [120, 240, Infinity]) { const l = all.filter(x => within(x, lim)); if (l.length >= 2 || lim === Infinity) return l.slice(0, TOP); }
  };
  const block = (title, list, showWhen) => `
    <section class="hsec two"><h2>${title}</h2>
      <div class="hcol"><h3><i class="pin surf mini" style="--c:var(--s9)"></i>Surf</h3>${top(list, "surf").map(x => card_(x, showWhen)).join("") || `<p class="empty">Nothing within your drive limit.</p>`}</div>
      <div class="hcol"><h3><i class="pin spear mini" style="--c:var(--s9)"></i>Spear</h3>${top(list, "spear").map(x => card_(x, showWhen)).join("") || `<p class="empty">Nothing within your drive limit.</p>`}</div>
    </section>`;

  const t = ctx.todayInfo;
  // three small widgets: big lime number, small label, tiny caption
  const [fl, ss] = (t?.light || "").split(" – ");
  const tile = (label, val, cap) => (val ? `<div><small>${label}</small><b>${esc(val.replace(/(am|pm)$/, "<i>$1</i>")).replace(/&lt;(\/?)i&gt;/g, "<$1i>")}</b><span>${esc(cap || "")}</span></div>` : "");
  const today_ = t ? `<section class="hsec"><h2>Today · ${esc(t.where)}</h2><div class="tinfo three">
    ${tile("First light", fl)}${tile("Sunset", ss)}${tile("Water", t.water, t.coast.replace(" along the coast", " coast"))}
  </div></section>` : "";

  // BOM warnings, one line per warning type + coast: "Strong wind · Coffs Coast · Fri, Sat"
  const wg = new Map();
  for (const w of ctx.warnings || []) {
    const m = w.text.match(/^(.*?) Warning for (\w+) for (.*)$/i); if (!m) continue;
    const k = `${m[1]}|${m[3]}`; if (!wg.has(k)) wg.set(k, new Set()); wg.get(k).add(m[2].slice(0, 3));
  }
  const warn = wg.size ? `<section class="hsec"><div class="warnbox">${[...wg].map(([k, d]) => { const [type, coast] = k.split("|"); return `<p>⚠ ${esc(type)} · ${esc(coast.replace(/ Coast$/, ""))} · ${[...d].join(", ")}</p>`; }).join("")}<small>BOM marine warnings</small></div></section>` : "";
  // where to sleep tonight: camps ranked by tomorrow morning's surf/spear within ~35 min
  let camp = "";
  if (tomorrow && ctx.campsFor) {
    const ranked = ctx.campsFor(tomorrow);
    const top = ranked.slice(0, 3);
    const cheap = ranked.find(x => x.c.kind === "free" || x.c.kind === "rest");
    if (cheap && !top.includes(cheap)) top.push(cheap);
    const pick = x => x ? `${x.name} ${Math.round(x.score)} · ${x.min} min` : "";
    camp = top.length ? `<section class="hsec"><h2>Camp tonight</h2><small class="hint">Best spots within ~35 min tomorrow morning${drive ? ", within 3 h of you" : ""}</small>${top.map(x => {
      const k = ctx.KIND[x.c.kind], fac = ctx.facilities(x.c);
      return `<a class="hcard camp" href="${ctx.dirUrl(x.c.lat, x.c.lon)}" target="_blank" rel="noopener">
        <span class="campicon ${x.c.kind}">${k.icon}</span>
        <span class="hc-main"><b>${esc(x.c.name)}</b><small>${esc(k.label)} · ${esc(k.cost.split(" · ")[0])}${x.c.dirt ? " · ⚠ dirt road" : ""}</small>
        <small>${x.bestSurf ? "🏄 " + esc(pick(x.bestSurf)) : ""}${x.bestSurf && x.bestSpear ? " · " : ""}${x.bestSpear ? "🐟 " + esc(pick(x.bestSpear)) : ""}</small>
        ${fac.length ? `<small>${esc(fac.join(" · "))}</small>` : ""}</span>
        ${x.reach != null ? `<span class="hc-drive">${fmtDrive(x.reach, drive?.estimated)}</span>` : ""}
      </a>`;
    }).join("")}</section>` : "";
  }
  const loc = ctx.locOff ? `<section class="hsec"><div class="warnbox locoff"><p>📍 Turn on location to see spots near you</p><small>iPhone: Settings → Privacy & Security → Location Services → Safari Websites → While Using the App. Then reopen the app.</small></div></section>` : "";
  return loc + warn + today_ + block(nowTitle, nowSlots, false) + camp + block("Best in the next 24 hours", [...best24.values()], true);
}
