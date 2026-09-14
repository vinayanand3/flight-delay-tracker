import {
  DAY,
  dateRange,
  stats,
  group,
  filterRows,
  calendar,
  csvCell,
} from "./metrics.js";
const $ = (id) => document.getElementById(id),
  esc = (s) =>
    String(s ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
const num = (n) =>
  n == null ? "N/A" : n.toLocaleString("en-US", { maximumFractionDigits: 1 });
const pct = (n) => (n == null ? "N/A" : num(n) + "%");
const short = (d) =>
  new Date(d + "T12:00:00Z").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
const airports = {
  ATL: ["Atlanta", -84.43, 33.64],
  ORD: ["Chicago O’Hare", -87.9, 41.97],
  DFW: ["Dallas / Fort Worth", -97.04, 32.9],
  DEN: ["Denver", -104.67, 39.86],
  LAS: ["Las Vegas", -115.15, 36.08],
  CMH: ["Columbus", -82.89, 40.0],
  DTW: ["Detroit", -83.35, 42.21],
  LGA: ["New York LaGuardia", -73.87, 40.77],
  TPA: ["Tampa", -82.53, 27.98],
};
const views = {
  overview: [
    "Every delay tells a story.",
    "Explore the patterns behind your next departure.",
    "Overview",
  ],
  airports: [
    "A closer look at the ground.",
    "Compare delay observations across the monitored airports.",
    "Airports",
  ],
  airlines: [
    "Different airlines. Shared skies.",
    "Compare marketed flight records, including possible codeshares.",
    "Airlines",
  ],
  routes: [
    "Find the friction in your route.",
    "Explore delays between departure and destination airports.",
    "Routes",
  ],
  flights: [
    "Behind every number, a flight.",
    "Search the observations and explore recorded flight times.",
    "Flight explorer",
  ],
  coverage: [
    "Good data starts with context.",
    "See what was collected, what is missing, and what it means.",
    "Data & methodology",
  ],
};
let data,
  rows = [],
  selected = [],
  view = "overview",
  metric = "rate",
  page = 0,
  search = "",
  severity = "",
  route = "",
  sort = "total",
  loading = false;
function selection() {
  let end = $("end").value || data.days.at(-1).date;
  let start =
    $("range").value === "all"
      ? data.days[0].date
      : $("range").value === "custom"
        ? $("start").value
        : dateRange(end, Number($("range").value));
  return {
    start,
    end,
    airport: $("airport").value,
    airline: $("airline").value,
  };
}
function panel(title, sub, body, extra = "") {
  return `<section class="panel"><div class="panel-head"><div><h2>${title}</h2><div class="panel-sub">${sub}</div></div>${extra}</div>${body}</section>`;
}
function kpis() {
  const s = stats(selected),
    days = new Set(selected.map((r) => r.date)).size;
  return `<div class="kpis">${[
    [
      "Flight observations",
      num(s.total),
      "Across " + days + " collected days",
      "↗",
    ],
    [
      "Sample delay rate",
      pct(s.rate),
      "Recorded delay greater than 15 min",
      "◷",
    ],
    [
      "Average recorded delay",
      num(s.avg) + (s.avg == null ? "" : "<small>min</small>"),
      "Among delayed observations",
      "⌁",
    ],
    [
      "Severe delays",
      num(s.severe),
      "Recorded delay greater than 2 hours",
      "↗",
    ],
  ]
    .map(
      ([label, value, sub, icon]) =>
        `<article class="kpi"><div class="kpi-label">${label}<span>${icon}</span></div><div class="kpi-value">${value}</div><div class="kpi-sub">${sub}</div></article>`,
    )
    .join("")}</div>`;
}
function trend() {
  const { start, end } = selection(),
    dates = calendar(start, end),
    groups = new Map(group(selected, "date").map((g) => [g.name, g]));
  const w = 650,
    h = 230,
    left = 43,
    right = 20,
    top = 20,
    bottom = 38;
  const values = dates.map((d) => groups.get(d)?.[metric] ?? null),
    max =
      metric === "rate"
        ? 100
        : Math.max(10, ...values.filter((v) => v !== null)) * 1.12;
  const x = (i) =>
      left +
      (w - left - right) * (dates.length === 1 ? 0.5 : i / (dates.length - 1)),
    y = (v) => h - bottom - ((h - top - bottom) * v) / max;
  let segments = [],
    current = [];
  values.forEach((v, i) => {
    if (v == null) {
      if (current.length) segments.push(current);
      current = [];
    } else current.push([x(i), y(v)]);
  });
  if (current.length) segments.push(current);
  const paths = segments
    .map(
      (p) =>
        `<path d="M${p.map((v) => v.join(",")).join(" L")} L${p.at(-1)[0]},${h - bottom} L${p[0][0]},${h - bottom} Z" fill="url(#area)"/><path class="line" d="M${p.map((v) => v.join(",")).join(" L")}"/>`,
    )
    .join("");
  const ticks = [0, 0.25, 0.5, 0.75, 1]
    .map(
      (f) =>
        `<line class="grid" x1="${left}" x2="${w - right}" y1="${y(max * f)}" y2="${y(max * f)}"/><text x="${left - 9}" y="${y(max * f) + 4}" text-anchor="end">${Math.round(max * f)}${metric === "rate" ? "%" : ""}</text>`,
    )
    .join("");
  const marks = values
    .map((v, i) =>
      v == null
        ? ""
        : `<circle tabindex="0" aria-label="${dates[i]}: ${num(v)}${metric === "rate" ? " percent" : " minutes"}" cx="${x(i)}" cy="${y(v)}" r="3"><title>${dates[i]} · ${num(v)}${metric === "rate" ? "%" : " min"} · ${groups.get(dates[i]).total} observations</title></circle>`,
    )
    .join("");
  const labels = [
    ...new Set([
      0,
      Math.round((dates.length - 1) / 3),
      Math.round((2 * (dates.length - 1)) / 3),
      dates.length - 1,
    ]),
  ]
    .map(
      (i) =>
        `<text x="${x(i)}" y="${h - 10}" text-anchor="middle">${short(dates[i])}</text>`,
    )
    .join("");
  return panel(
    "The delay picture",
    "Daily observations · hover or focus a point to explore",
    `<div class="chart"><svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Daily ${metric === "rate" ? "sample delay rate" : "average delay"} trend. Missing days are gaps."><defs><linearGradient id="area" x1="0" x2="0" y1="0" y2="1"><stop stop-color="var(--accent)" stop-opacity=".18"/><stop offset="1" stop-color="var(--accent)" stop-opacity="0"/></linearGradient></defs>${ticks}${paths}${marks}${labels}</svg></div><div class="insight"><strong>${groups.size} of ${dates.length} calendar days</strong> represented in this selection. Gaps are unobserved days, not zero delays.</div>`,
    `<div class="segmented" aria-label="Chart metric"><button data-metric="rate" class="${metric === "rate" ? "active" : ""}">Delay rate</button><button data-metric="avg" class="${metric === "avg" ? "active" : ""}">Avg. delay</button></div>`,
  );
}
function ranking() {
  const gs = group(selected, "origin")
    .filter((g) => g.rate !== null)
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 4);
  return panel(
    "Where delays stand out",
    "Highest sampled delay rates",
    `<div class="ranking">${gs.map((g, i) => `<div class="rank-row"><span class="rank-number">0${i + 1}</span><button class="airport-code" data-airport="${esc(g.name)}">${esc(g.name)}</button><div class="rank-text"><strong>${esc(airports[g.name]?.[0] || g.name)}</strong><small>${num(g.total)} observations</small></div><div class="rank-value">${pct(g.rate)}<small>delayed</small></div></div>`).join("") || '<p class="empty">No matching observations</p>'}</div><div class="insight">A snapshot of sampled flights, not an operational alert.</div>`,
  );
}
function mapPanel() {
  const gs = group(selected, "origin");
  const x = (lon) => ((lon + 126) / 60) * 660 + 10,
    y = (lat) => ((50 - lat) / 26) * 295 + 12;
  const outline = [
    [-124, 48],
    [-117, 49],
    [-110, 49],
    [-103, 49],
    [-96, 49],
    [-94, 49],
    [-93, 46],
    [-89, 48],
    [-85, 46],
    [-83, 46],
    [-82, 42],
    [-79, 43],
    [-76, 44],
    [-71, 45],
    [-67, 47],
    [-67, 44],
    [-70, 42],
    [-71, 41],
    [-73, 41],
    [-74, 40],
    [-75, 38],
    [-76, 36],
    [-75, 35],
    [-79, 33],
    [-81, 31],
    [-81, 28],
    [-80, 26],
    [-81, 25],
    [-82, 27],
    [-83, 29],
    [-85, 30],
    [-89, 30],
    [-90, 29],
    [-94, 29],
    [-97, 26],
    [-100, 29],
    [-103, 29],
    [-106, 32],
    [-111, 32],
    [-114, 32],
    [-117, 33],
    [-120, 37],
    [-123, 41],
    [-124, 45],
  ];
  const line = outline.map(([a, b]) => `${x(a)},${y(b)}`).join(" ");
  return panel(
    "A view across the network",
    "Select an airport to filter every view",
    `<div class="map-container"><svg class="map" viewBox="0 0 690 325" aria-label="Schematic geographic map of nine monitored US airports"><defs><pattern id="dots" width="12" height="12" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".6" fill="var(--border)"/></pattern></defs><rect width="690" height="325" fill="url(#dots)"/><polygon class="map-land" points="${line}"/>${[-120, -110, -100, -90, -80].map((a) => `<line class="map-grid" x1="${x(a)}" x2="${x(a)}" y1="30" y2="300"/>`).join("")}${Object.entries(
      airports,
    )
      .map(([code, [name, lon, lat]]) => {
        const g = gs.find((g) => g.name === code),
          rate = g?.rate,
          c =
            rate == null
              ? "var(--muted)"
              : rate > 60
                ? "var(--danger)"
                : rate > 30
                  ? "var(--warning)"
                  : "var(--accent)";
        const radius = g ? 5 + Math.sqrt(g.total) / 6 : 4;
        const dy = code === "CMH" ? 22 : code === "DTW" ? -17 : -15;
        return `<g role="button" tabindex="0" data-airport="${code}" aria-label="Filter ${code}, ${name}, ${g ? `${pct(rate)} sampled delay rate` : "no observations"}"><title>${code} · ${name}: ${g ? `${g.total} observations, ${pct(rate)} delayed` : "No observations"}</title><circle class="halo" cx="${x(lon)}" cy="${y(lat)}" r="${radius + 7}" fill="${c}" opacity=".12"/><circle cx="${x(lon)}" cy="${y(lat)}" r="${radius}" fill="${c}" fill-opacity=".22" stroke="${c}"/><circle cx="${x(lon)}" cy="${y(lat)}" r="2" fill="${c}"/><text class="map-label" x="${x(lon)}" y="${y(lat) + dy}" text-anchor="middle">${code}</text></g>`;
      })
      .join(
        "",
      )}</svg></div><div class="map-legend"><span><i style="background:var(--accent)"></i>≤30% delayed</span><span><i style="background:var(--warning)"></i>30–60%</span><span><i style="background:var(--danger)"></i>&gt;60%</span><span>Size = observations · schematic map</span></div>`,
    `<a class="panel-link" href="#airports">Airport details ↗</a>`,
  );
}
function severityPanel() {
  const cats = [
    ["No recorded delay", (r) => r.delay === 0, "var(--accent)"],
    ["1–15 minutes", (r) => r.delay > 0 && r.delay <= 15, "var(--blue)"],
    ["16–45 minutes", (r) => r.delay > 15 && r.delay <= 45, "var(--warning)"],
    ["46–120 minutes", (r) => r.delay > 45 && r.delay <= 120, "#d99168"],
    ["Over 2 hours", (r) => r.delay > 120, "var(--danger)"],
    [
      "Unknown",
      (r) => r.delay == null || r.delay_known === false,
      "var(--muted)",
    ],
  ];
  return panel(
    "How long is the wait?",
    "Recorded delay severity · all selected observations",
    `<div class="bars">${cats
      .map(([label, test, c]) => {
        const n = selected.filter((r) =>
            label === "Unknown" ? test(r) : r.delay_known !== false && test(r),
          ).length,
          p = selected.length ? (n / selected.length) * 100 : 0;
        return `<div class="bar-row"><div class="bar-label">${label}<span>${num(n)} · ${num(p)}%</span></div><div class="bar-track"><div class="bar-fill" style="width:${p}%;background:${c}"></div></div></div>`;
      })
      .join(
        "",
      )}<p class="severity-note">The larger of departure and arrival delay is used. Legacy zero values may include unreported delays.</p></div>`,
  );
}
function airlineTable(limit) {
  let gs = group(selected, "airline").sort((a, b) =>
    sort === "rate"
      ? (b.rate ?? -1) - (a.rate ?? -1)
      : sort === "avg"
        ? (b.avg ?? -1) - (a.avg ?? -1)
        : b.total - a.total,
  );
  if (limit) gs = gs.slice(0, limit);
  return panel(
    "Airline comparison",
    "Marketed flight records · codeshares may represent the same aircraft",
    `<div class="table-scroll"><table><thead><tr><th>AIRLINE</th><th>OBSERVATIONS</th><th>DELAY RATE</th><th>AVG. DELAY</th><th>OVER 2 HR</th></tr></thead><tbody>${gs.map((g) => `<tr><td><button class="table-button" data-airline="${esc(g.name)}">${esc(g.name)}</button></td><td>${num(g.total)}</td><td><div class="rate-cell">${pct(g.rate)}<span class="mini-track"><i style="width:${g.rate || 0}%"></i></span></div></td><td>${num(g.avg)}${g.avg == null ? "" : " min"}</td><td>${g.severe}</td></tr>`).join("")}</tbody></table></div>`,
    limit
      ? '<a class="panel-link" href="#airlines">All airlines ↗</a>'
      : `<select id="sort-airlines" aria-label="Sort airlines"><option value="total" ${sort === "total" ? "selected" : ""}>Most observations</option><option value="rate" ${sort === "rate" ? "selected" : ""}>Highest delay rate</option><option value="avg" ${sort === "avg" ? "selected" : ""}>Longest delay</option></select>`,
  );
}
function airportTable() {
  return panel(
    "Airport observations",
    "Click an airport to select it",
    `<div class="table-scroll"><table><thead><tr><th>AIRPORT</th><th>OBSERVATIONS</th><th>DELAYED</th><th>DELAY RATE</th><th>AVG. DELAY</th></tr></thead><tbody>${group(
      selected,
      "origin",
    )
      .sort((a, b) => b.total - a.total)
      .map(
        (g) =>
          `<tr><td><button class="table-button" data-airport="${esc(g.name)}">${esc(g.name)} · ${esc(airports[g.name]?.[0] || "")}</button></td><td>${num(g.total)}</td><td>${num(g.delayed)}</td><td>${pct(g.rate)}</td><td>${num(g.avg)}${g.avg == null ? "" : " min"}</td></tr>`,
      )
      .join("")}</tbody></table></div>`,
  );
}
function routesPanel() {
  const origins = group(selected, "origin")
      .sort((a, b) => b.total - a.total)
      .slice(0, 9),
    dest = group(selected, "destination")
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  const gs = new Map(
    group(selected, (r) => r.origin + " → " + r.destination).map((g) => [
      g.name,
      g,
    ]),
  );
  return panel(
    "Route delay matrix",
    "Top destinations by observations · select a cell to explore its flights",
    `<div class="table-scroll"><table class="route-matrix"><thead><tr><th>FROM / TO</th>${dest.map((d) => `<th>${esc(d.name)}</th>`).join("")}</tr></thead><tbody>${origins
      .map(
        (o) =>
          `<tr><th>${esc(o.name)}</th>${dest
            .map((d) => {
              const g = gs.get(o.name + " → " + d.name);
              return `<td>${g ? `<button data-route="${esc(g.name)}" style="--rate:${g.rate || 0}" title="${g.total} observations, ${pct(g.rate)} delayed">${pct(g.rate)}</button>` : "·"}</td>`;
            })
            .join("")}</tr>`,
      )
      .join(
        "",
      )}</tbody></table></div><div class="insight">Cell value: sampled delay rate. A dot means no observations. Small samples can vary widely.</div>`,
  );
}
function flightRows() {
  return selected
    .filter(
      (r) =>
        (!search ||
          [r.flight, r.airline, r.origin, r.destination]
            .join(" ")
            .toLowerCase()
            .includes(search.toLowerCase())) &&
        (!route || r.origin + " → " + r.destination === route) &&
        (!severity ||
          (severity === "delayed"
            ? r.delay > 15
            : severity === "severe"
              ? r.delay > 120
              : r.delay == null || r.delay_known === false)),
    )
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) || (b.delay ?? -1) - (a.delay ?? -1),
    );
}
function flightsPanel() {
  const found = flightRows();
  page = Math.min(page, Math.max(0, Math.ceil(found.length / 20) - 1));
  return panel(
    "Flight explorer",
    `${num(found.length)} matching observations${route ? " · " + esc(route) : ""}`,
    `<div class="table-tools"><input type="search" id="search-flights" aria-label="Search flights, airlines, or airports" placeholder="Search flight, airline, or airport…" value="${esc(search)}"><select id="severity-filter" aria-label="Filter delay severity"><option value="">All delays</option>${[
      ["delayed", "Over 15 minutes"],
      ["severe", "Over 2 hours"],
      ["unknown", "Unknown delay"],
    ]
      .map(
        ([v, l]) =>
          `<option value="${v}" ${severity === v ? "selected" : ""}>${l}</option>`,
      )
      .join(
        "",
      )}</select>${route ? '<button id="clear-route">Clear route ×</button>' : ""}</div><div class="table-scroll"><table><thead><tr><th>SNAPSHOT DATE</th><th>FLIGHT / AIRLINE</th><th>ROUTE</th><th>RECORDED DELAY</th><th>API STATUS</th></tr></thead><tbody>${found
      .slice(page * 20, page * 20 + 20)
      .map(
        (r) =>
          `<tr><td>${short(r.date)} ${r.date.slice(0, 4)}</td><td><button class="table-button" data-flight="${r.id}">${esc(r.flight)}</button><div class="panel-sub">${esc(r.airline)}</div></td><td>${esc(r.origin)} → ${esc(r.destination)}</td><td><span class="badge ${r.delay > 120 ? "danger" : r.delay > 15 ? "warn" : ""}">${r.delay == null || r.delay_known === false ? "Unknown" : num(r.delay) + " min"}</span></td><td>${esc(r.status)}</td></tr>`,
      )
      .join(
        "",
      )}</tbody></table>${!found.length ? '<div class="empty">No flights match these filters. Try another date range or reset the filters.</div>' : ""}</div><div class="pagination"><span>Page ${page + 1} of ${Math.max(1, Math.ceil(found.length / 20))}</span><div><button data-page="-1" ${page === 0 ? "disabled" : ""}>← Previous</button> <button data-page="1" ${(page + 1) * 20 >= found.length ? "disabled" : ""}>Next →</button></div></div>`,
  );
}
function coverage() {
  const all = calendar(data.days[0].date, data.days.at(-1).date),
    have = new Map(data.days.map((d) => [d.date, d]));
  return (
    panel(
      "The collection calendar",
      `${short(all[0])} to ${short(all.at(-1))}, ${all.at(-1).slice(0, 4)} · complete archive, independent of filters`,
      `<div class="coverage-stats"><span><strong>${data.days.length}</strong> collected days</span><span><strong>${data.missing_dates.length}</strong> missing days</span><span><strong>${num(rows.length)}</strong> flight observations</span></div><div class="coverage-grid">${all.map((d) => `<span tabindex="0" class="day-square ${have.has(d) ? "" : "missing"}" title="${d}: ${have.has(d) ? have.get(d).count + " observations" : "No snapshot"}" aria-label="${d}: ${have.has(d) ? have.get(d).count + " observations" : "No snapshot"}"></span>`).join("")}</div><div class="insight">Colored blocks: a snapshot exists. Empty blocks: no snapshot. A collected day does not mean full-day flight coverage.</div>`,
    ) +
    panel(
      "What these numbers can tell you",
      "A transparent guide to this casual tracking project",
      `<div class="prose"><h3>Daily samples, not live flight status</h3><p>AviationStack is queried once per scheduled run. The collector samples active departures and caps each airport at one page of 100 API records. As of this update, three of nine airports rotate daily to fit a 100-request monthly allowance. A given airport is sampled every third day. Manual runs also consume the allowance. GitHub may delay scheduled jobs.</p><h3>How metrics are calculated</h3><p><strong>Flight observations</strong> counts archived flight records in the selected collection dates. These are not necessarily unique physical flights. Marketing codeshares can duplicate an aircraft movement, and an active flight can appear on multiple dates.</p><p><strong>Sample delay rate</strong> is observations with a recorded delay greater than 15 minutes divided by observations with a usable delay. Cancelled or diverted records are excluded from the delayed numerator. <strong>Average recorded delay</strong> averages only delayed observations. Delay is the larger of the departure and arrival delay. This is not the standard completed-arrival on-time measure.</p><p><strong>Legacy unknown values:</strong> the original collector replaced missing delays with zero. Historical zero-delay records therefore cannot prove a flight was on time. New snapshots preserve missing values. Airline and airport results use record counts as weights, not an average of daily percentages.</p><h3>Dates and missing days</h3><p>Dates identify collection snapshots in UTC, not local departure dates. Flight detail timestamps retain the API timezone offset. Missing days are not filled or treated as zero. Calendar ranges end at the latest available snapshot; custom dates let you choose a historical period. A badge warns when the last collection is over 48 hours old.</p><h3>What is not available</h3><p>The archive does not establish cancellation rates, diversions, weather impact, delay causes, boarding events, or operational alerts. The active-only query excludes cancelled flights. Crew, maintenance, and weather explanations would require additional sources. No such explanations are inferred here.</p><h3>Collection health</h3><p>The September 5, 2026 workflow returned HTTP 429 for every airport. Recurring quota pressure is consistent with the gaps, but the reason for every historical missing day has not been established. The new collector stops safely on API failures and preserves the previous dataset.</p><p><a href="https://github.com/vinayanand3/flight-delay-tracker/actions" target="_blank" rel="noopener">Inspect collection runs ↗</a> · <a href="./data/index.json">Daily summaries</a> · <a href="./data/dashboard.json">Dashboard dataset</a></p></div>`,
    )
  );
}
function render() {
  if (!data) return;
  const s = selection();
  if (!s.start || !s.end || s.start > s.end) {
    $("content").innerHTML =
      '<div class="empty">Choose a valid date range. The start date must be on or before the end date.</div>';
    $("export").disabled = true;
    return;
  }
  selected = filterRows(rows, s);
  $("export").disabled = !selected.length;
  $("selection-dates").textContent =
    short(s.start) + " – " + short(s.end) + ", " + s.end.slice(0, 4);
  const [title, desc, crumb] = views[view];
  $("page-title").textContent = title;
  $("page-description").textContent = desc;
  $("breadcrumb").textContent = crumb;
  document.querySelectorAll("[data-view]").forEach((a) => {
    a.classList.toggle("active", a.dataset.view === view);
    if (a.dataset.view === view) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
  let html = "";
  if (view === "coverage") html = coverage();
  else if (!selected.length)
    html =
      '<div class="empty"><h2>No observations in this selection</h2><p>Try a broader date range or reset the filters. Missing data is never displayed as zero activity.</p></div>';
  else {
    html = kpis();
    if (view === "overview")
      html +=
        `<div class="two-col"><div>${trend()}</div><div>${ranking()}</div></div><div class="two-col"><div>${mapPanel()}</div><div>${severityPanel()}</div></div>` +
        airlineTable(6);
    if (view === "airports") html += mapPanel() + airportTable() + trend();
    if (view === "airlines") html += airlineTable() + trend();
    if (view === "routes") html += routesPanel();
    if (view === "flights") html += flightsPanel();
  }
  $("content").innerHTML = html;
  $("content").setAttribute("aria-busy", "false");
}
function navigate() {
  view = location.hash.slice(1);
  if (!(view in views)) view = "overview";
  page = 0;
  render();
}
function detail(id) {
  const r = rows.find((r) => r.id === Number(id));
  if (!r) return;
  const time = (v) => (v ? esc(v.replace("T", " ")) : "Not reported");
  $("flight-detail").innerHTML =
    `<div class="eyebrow">FLIGHT OBSERVATION / ${esc(r.date)}</div><h2 style="margin-top:16px">${esc(r.flight)} · ${esc(r.airline)}</h2><div class="flight-route">${esc(r.origin)}<span>→</span>${esc(r.destination)}</div><p class="flight-meta">API status at collection: ${esc(r.status)}<br>Recorded maximum delay: ${r.delay == null || r.delay_known === false ? "Unknown" : num(r.delay) + " minutes"}</p>${[
      ["Departure", r.dep_scheduled, r.dep_actual, r.dep_delay],
      ["Arrival", r.arr_scheduled, r.arr_actual, r.arr_delay],
    ]
      .map(
        ([label, s, a, d]) =>
          `<div class="timeline-event"><h3>${label}</h3><p>Scheduled: ${time(s)}<br>Actual: ${time(a)}<br>Reported delay: ${d == null ? "Unknown" : num(d) + " min"}</p></div>`,
      )
      .join(
        "",
      )}<p class="flight-meta">Times show the API-provided timezone offset. These are historical observations, not current flight status. Delay causes are not supplied. Legacy zero values may mean unreported.</p>`;
  $("flight-dialog").showModal();
}
async function load() {
  if (loading) return;
  loading = true;
  $("refresh").disabled = true;
  try {
    const response = await fetch("./data/dashboard.json", {
      cache: "no-store",
    });
    if (!response.ok) throw Error("HTTP " + response.status);
    const next = await response.json();
    if (
      next.schema_version !== 1 ||
      !next.days?.length ||
      !Array.isArray(next.records)
    )
      throw Error("Invalid dataset");
    const previous = data?.days.at(-1).date;
    data = next;
    $("filters").inert = false;
    rows = data.records.map((values, id) =>
      Object.assign(
        Object.fromEntries(data.fields.map((f, i) => [f, values[i]])),
        { id },
      ),
    );
    const latest = data.days.at(-1);
    for (const [id, options] of [
      ["airport", [...new Set(rows.map((r) => r.origin))].sort()],
      ["airline", [...new Set(rows.map((r) => r.airline))].sort()],
    ]) {
      const keep = $(id).value;
      $(id).innerHTML =
        `<option value="">All ${id === "airport" ? "airports" : "airlines"}</option>` +
        options
          .map(
            (v) =>
              `<option value="${esc(v)}">${esc(v)}${id === "airport" && airports[v] ? " · " + esc(airports[v][0]) : ""}</option>`,
          )
          .join("");
      $(id).value = keep;
    }
    if (
      !previous ||
      ($("range").value !== "custom" && latest.date !== previous)
    ) {
      $("end").value = latest.date;
      $("start").value = dateRange(latest.date, 7);
    }
    $("start").min = data.days[0].date;
    $("end").min = data.days[0].date;
    const age = (Date.now() - Date.parse(latest.collected_at)) / DAY;
    $("freshness").textContent =
      (age > 2 ? "Stale snapshot · " : "Latest snapshot · ") +
      short(latest.date);
    $("freshness").title = "Collected " + latest.collected_at;
    $("notice").innerHTML =
      `${age > 2 ? "<strong>Collection is over 48 hours old.</strong> " : ""}Daily flight samples, not live status. Coverage and airports vary by day. <a href="#coverage">${data.days.length} collected days · ${data.missing_dates.length} missing days ↗</a>`;
    navigate();
  } catch (e) {
    $("notice").textContent = data
      ? "Refresh failed. Showing the previously loaded snapshot. Try Refresh again."
      : "The flight archive could not be loaded. Check your connection and try Refresh again.";
    if (!data)
      $("content").innerHTML =
        '<div class="empty"><h2>Unable to load flight observations</h2><p>Use the refresh button above to retry. No sample data is substituted.</p></div>';
    $("content").setAttribute("aria-busy", "false");
  } finally {
    loading = false;
    $("refresh").disabled = false;
  }
}
$("filters").addEventListener("submit", (e) => e.preventDefault());
$("filters").addEventListener("change", (e) => {
  if (e.target.id === "range") {
    const custom = $("range").value === "custom";
    $("start-wrap").hidden = !custom;
    $("end-wrap").hidden = !custom;
    if (!custom) $("end").value = data.days.at(-1).date;
  }
  page = 0;
  render();
});
$("reset").onclick = () => {
  $("airport").value = "";
  $("airline").value = "";
  $("range").value = "7";
  $("end").value = data.days.at(-1).date;
  $("start-wrap").hidden = true;
  $("end-wrap").hidden = true;
  search = "";
  severity = "";
  route = "";
  page = 0;
  render();
};
$("content").addEventListener("click", (e) => {
  const t = e.target.closest("button,[data-airport]");
  if (!t) return;
  if (t.dataset.airport) {
    $("airport").value =
      $("airport").value === t.dataset.airport ? "" : t.dataset.airport;
    page = 0;
    render();
  }
  if (t.dataset.airline) {
    $("airline").value = t.dataset.airline;
    render();
  }
  if (t.dataset.metric) {
    metric = t.dataset.metric;
    render();
  }
  if (t.dataset.route) {
    route = t.dataset.route;
    search = "";
    severity = "";
    page = 0;
    location.hash = "flights";
  }
  if (t.dataset.flight) detail(t.dataset.flight);
  if (t.dataset.page) {
    page += Number(t.dataset.page);
    render();
  }
  if (t.id === "clear-route") {
    route = "";
    page = 0;
    render();
  }
});
$("content").addEventListener("keydown", (e) => {
  if (
    e.target.matches("g[data-airport]") &&
    (e.key === "Enter" || e.key === " ")
  ) {
    e.preventDefault();
    $("airport").value =
      $("airport").value === e.target.dataset.airport
        ? ""
        : e.target.dataset.airport;
    render();
  }
});
$("content").addEventListener("input", (e) => {
  if (e.target.id === "search-flights") {
    const pos = e.target.selectionStart;
    search = e.target.value;
    page = 0;
    render();
    $("search-flights").focus();
    $("search-flights").setSelectionRange(pos, pos);
  }
});
$("content").addEventListener("change", (e) => {
  if (e.target.id === "severity-filter") {
    severity = e.target.value;
    page = 0;
    render();
  }
  if (e.target.id === "sort-airlines") {
    sort = e.target.value;
    render();
  }
});
function themeLabel() {
  $("theme").setAttribute(
    "aria-label",
    "Switch to " +
      (document.documentElement.dataset.theme === "dark" ? "light" : "dark") +
      " theme",
  );
}
$("theme").onclick = () => {
  const theme =
    document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem("airframe-theme", theme);
  } catch {}
  themeLabel();
};
themeLabel();
$("close-dialog").onclick = () => $("flight-dialog").close();
$("flight-dialog").addEventListener("click", (e) => {
  if (e.target === $("flight-dialog")) {
    const r = e.target.getBoundingClientRect();
    if (
      e.clientX < r.left ||
      e.clientX > r.right ||
      e.clientY < r.top ||
      e.clientY > r.bottom
    )
      e.target.close();
  }
});
$("export").onclick = () => {
  const output = view === "flights" ? flightRows() : selected,
    fields = data.fields;
  const text = [
    fields.map(csvCell).join(","),
    ...output.map((r) => fields.map((f) => csvCell(r[f])).join(",")),
  ].join("\r\n");
  const url = URL.createObjectURL(
    new Blob([text], { type: "text/csv;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = `airframe-${selection().start}-${selection().end}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
$("refresh").onclick = load;
window.addEventListener("hashchange", navigate);
setInterval(() => {
  if (!document.hidden) load();
}, 300000);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) load();
});
load();
