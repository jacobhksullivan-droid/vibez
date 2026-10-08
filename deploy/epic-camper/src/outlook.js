// Region outlook: best surf and spear score per region per day, plus a south-vs-north call.
import { SPOTS, REGIONS } from "../data/spots.js";

const SOUTH = ["Far South Coast", "South Coast", "Shoalhaven/Illawarra"];
const NORTH = ["Central Coast/Newcastle", "Port Stephens/Great Lakes", "Mid North Coast", "Coffs Coast"];

export function renderOutlook(ctx) {
  const { today, days, dayResults, colour, fmtScore, esc } = ctx;
  const cols = days.filter(d => d >= today).slice(0, 10);
  const grid = {}; // region -> day -> {surf, spear}
  for (const reg of REGIONS) {
    grid[reg] = {};
    for (const d of cols) {
      const res = dayResults(d);
      const best = type => {
        let m = null;
        for (const s of SPOTS) if (s.region === reg && s.type === type) { const r = res[s.id]; if (r && (m == null || r.score > m)) m = r.score; }
        return m;
      };
      grid[reg][d] = { surf: best("surf"), spear: best("spear") };
    }
  }
  const groupAvg = (regs, ds) => {
    const v = [];
    for (const r of regs) for (const d of ds) { const g = grid[r][d]; if (g.surf != null && g.spear != null) v.push((g.surf + g.spear) / 2); }
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
  };
  const call = (label, ds) => {
    const s = groupAvg(SOUTH, ds), n = groupAvg(NORTH, ds);
    if (s == null || n == null) return "";
    const diff = s - n;
    const verdict = Math.abs(diff) < 0.4 ? "about even" : diff > 0 ? "south looks better" : "north looks better";
    return `<div class="call"><small>${label}</small><b>${verdict}</b><span>South ${s.toFixed(1)} · North ${n.toFixed(1)}</span></div>`;
  };
  const head = cols.map((d, i) => {
    const dt = new Date(d + "T12:00:00");
    return `<th class="${i >= 6 ? "lowc" : ""}"><span>${d === today ? "Today" : dt.toLocaleDateString("en-AU", { weekday: "short" })}</span><small>${dt.getDate()}</small></th>`;
  }).join("");
  const rows = REGIONS.map(reg => `<tr><th scope="row">${esc(reg.replace("/", "/\u200b"))}</th>${cols.map((d, i) => {
    const g = grid[reg][d];
    return `<td class="${i >= 6 ? "lowc" : ""}"><button type="button" class="ocell" data-goday="${d}" data-goregion="${esc(reg)}" aria-label="${esc(reg)} ${d}: surf ${g.surf == null ? "none" : Math.round(g.surf)}, spear ${g.spear == null ? "none" : Math.round(g.spear)}">
      <span class="pin surf" style="--c:${colour(g.surf)}"><span>${fmtScore(g.surf)}</span></span>
      <span class="pin spear" style="--c:${colour(g.spear)}"><span>${fmtScore(g.spear)}</span></span></button></td>`;
  }).join("")}</tr>`).join("");

  return `
    <section class="hsec"><h2>South first or north first?</h2>
      <div class="calls">${call("Next 3 days", cols.slice(0, 3))}${call("Days 4–7", cols.slice(3, 7))}</div>
      <p class="note">Average of the best surf and spear score per region. Forecasts beyond about 5 days are low confidence (faded).</p>
    </section>
    <section class="hsec"><h2>Best score per region</h2>
      <div class="otable"><table><thead><tr><th></th>${head}</tr></thead><tbody>${rows}</tbody></table></div>
      <p class="note">Circle = best surf, diamond = best spear. Tap a cell to see that day on the map.</p>
    </section>`;
}

export function regionBounds(reg) {
  const pts = SPOTS.filter(s => s.region === reg).map(s => [s.lat, s.lon]);
  return pts;
}
