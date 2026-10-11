// "Ask" tab: packs the app's current forecast + ratings into a question and opens Claude (claude.ai), where each
// person is logged in with their own account. Free: no API key, nothing runs on our server.
// The prompt is also copied to the clipboard in case the Claude app doesn't pick up the pre-filled text.
const MAX = 5500; // characters of prompt (claude.ai takes it in the URL)

const fmtH = h => (h === 0 || h === 24 ? "12am" : h === 12 ? "12pm" : h < 12 ? h + "am" : h - 12 + "pm");
const dname = (d, today, tom) => (d === today ? "Today" : d === tom ? "Tomorrow" : new Date(d + "T12:00:00").toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" }));
const norm = s => s.toLowerCase().replace(/[^a-z0-9 ]/g, " ");

// spots the question names ("bass point", "seal rocks", …)
function mentioned(q, spots) {
  const n = ` ${norm(q)} `;
  const generic = /^(the |north |south |east |west |n of |s of |just )|side$|end$/;
  return spots.filter(s => s.name.split(/[()—–,]/).map(f => norm(f).replace(/\s+/g, " ").trim())
    .some(f => f.length > 4 && !generic.test(f) && n.includes(` ${f} `)));
}

function line(s, r, b, drive, sharky) {
  if (!r) return null;
  const rep = r.best?.rep, c = rep?.ctx;
  const sc = r.best?.no ? `NO (${r.best.no})` : `${Math.round(r.best?.score ?? 0)}/10`;
  const when = b ? `, best ${fmtH(b.a)}–${fmtH(b.b)}` : "";
  const away = drive != null ? `, ${drive} min drive` : "";
  const rain = c && s.type === "spear" ? ` · rain ${Math.round(c.rain72)} mm last 3 days, ${Math.round(c.rain7d)} mm last 7` : "";
  return `- ${s.name} (${s.type}, ${s.region}${away}): ${sc}${when} · ${rep?.reason || ""}${rain}${sharky ? " · 🦈 shark activity nearby lately" : ""}`;
}

export function buildPrompt(q, x) {
  const { today, days, dayResults, bestOf, spots, drive, warnings, sharky, camps, plan } = x;
  const ds = days.filter(d => d >= today).slice(0, 3);
  const tom = ds[1];
  const named = mentioned(q, spots);
  const near = id => drive?.minutes?.[id];
  const out = [];
  out.push(`I'm on a campervan trip on the NSW coast (shore spearfishing + surfing; 21–31 Oct 2026). Below is live data from our trip app: it blends 8 forecast models, corrects them with wave buoys and BOM, and rates each spot 0–10 using local knowledge (shelter, swell window, tide, rain runoff). Visibility can't be forecast directly — judge it from recent rain, swell and wind. Swell in feet, wind in mph. Please answer short and practical.`);
  out.push(`\nQuestion: ${q.trim()}`);
  out.push(`\nApp data (${new Date().toLocaleString("en-AU", { timeZone: "Australia/Sydney", weekday: "short", hour: "numeric", minute: "2-digit" })} Sydney time)${drive ? " — drive times are from where we are now" : ""}:`);
  if (warnings.length) out.push(`BOM marine warnings: ${warnings.map(w => w.text).join("; ")}`);

  // named spots first, in full
  for (const s of named) {
    out.push(`\n${s.name} — ${s.type}, ${s.region}${near(s.id) != null ? `, ${near(s.id)} min drive` : ""}`);
    if (s.spear?.vis) out.push(`Local vis notes: ${s.spear.vis}`);
    for (const i of (s.intel || []).slice(0, 2)) out.push(`Local knowledge: ${i.text.slice(0, 220)}`);
    for (const r of (s.rules || []).slice(0, 4)) out.push(`Rule: ${r.why}`);
    for (const d of ds) { const l = line(s, dayResults(d)[s.id], bestOf(s.id, d), null, sharky(s)); if (l) out.push(`${dname(d, today, tom)}: ${l.slice(2)}`); }
  }
  // top spots per day (nearest first when we know where you are)
  for (const d of ds) {
    const res = dayResults(d);
    out.push(`\n${dname(d, today, tom)} — top spots:`);
    for (const type of ["spear", "surf"]) {
      const list = spots.filter(s => s.type === type && res[s.id] && !named.includes(s))
        .filter(s => !drive || near(s.id) == null || near(s.id) <= 240)
        .sort((a, b) => (res[b.id].best?.no ? -1 : res[b.id].best?.score ?? 0) - (res[a.id].best?.no ? -1 : res[a.id].best?.score ?? 0))
        .slice(0, d === today ? 6 : 5);
      for (const s of list) out.push(line(s, res[s.id], bestOf(s.id, d), near(s.id), sharky(s)));
    }
  }
  if (camps?.length) out.push(`\nBest camps tonight (for tomorrow morning): ${camps.map(c => `${c.c.name} (${c.c.kind}${c.bestSpear ? `, spear ${c.bestSpear.name} ${c.bestSpear.min} min` : ""}${c.bestSurf ? `, surf ${c.bestSurf.name} ${c.bestSurf.min} min` : ""})`).join("; ")}`);
  if (plan?.days?.length) out.push(`\nOur auto trip plan (Jacob + Seb, 21–25 Oct): ${plan.days.map(e => `${e.day.slice(8)} Oct: ${e.sessions.map(x => `${x.when} ${x.name}`).join(", ")}${e.camp ? `, sleep ${e.camp.name}` : ""}`).join(" | ")}`);
  let p = out.filter(Boolean).join("\n");
  if (p.length > MAX) p = p.slice(0, MAX - 20) + "\n…(trimmed)";
  return p;
}

export const ASK_IDEAS = [
  "Where's the best dive tomorrow morning, and what time?",
  "Best surf near us today?",
  "Is the vis likely to be any good for a dive tomorrow?",
  "Where should we camp tonight to be close to the best spots in the morning?",
];

export function renderAsk(esc) {
  return `<section class="hsec"><h2>Ask Claude</h2>
    <div class="hcard askcard">
      <textarea id="askQ" rows="3" placeholder="Ask about swell, vis, spots, tides…"></textarea>
      <div class="askideas">${ASK_IDEAS.map(t => `<button type="button" class="chip" data-ask="${esc(t)}">${esc(t)}</button>`).join("")}</div>
      <button type="button" class="go" id="askGo">Ask Claude ↗</button>
      <small class="hint" id="askMsg">Opens Claude with the app's latest forecast, ratings and local spot info attached. Log in with your own Claude account (the free one works).</small>
    </div></section>`;
}

export async function ask(prompt) {
  try { await navigator.clipboard.writeText(prompt); } catch (e) {}
  window.open(`https://claude.ai/new?q=${encodeURIComponent(prompt)}`, "_blank", "noopener");
}
