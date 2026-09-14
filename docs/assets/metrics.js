export const DAY = 86400000;
export function dateRange(end, days) {
  return new Date(Date.parse(end + "T00:00:00Z") - (days - 1) * DAY)
    .toISOString()
    .slice(0, 10);
}
export function stats(rows) {
  const known = rows.filter(
    (r) => r.delay_known !== false && Number.isFinite(r.delay),
  );
  const delayed = known.filter(
    (r) => r.delay > 15 && !["cancelled", "diverted"].includes(r.status),
  );
  return {
    total: rows.length,
    known: known.length,
    delayed: delayed.length,
    rate: known.length ? (delayed.length / known.length) * 100 : null,
    avg: delayed.length
      ? delayed.reduce((s, r) => s + r.delay, 0) / delayed.length
      : null,
    severe: delayed.filter((r) => r.delay > 120).length,
  };
}
export function group(rows, key) {
  const m = new Map();
  for (const row of rows) {
    const k = typeof key === "function" ? key(row) : row[key];
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(row);
  }
  return [...m].map(([name, rows]) => ({ name, ...stats(rows) }));
}
export function filterRows(rows, { start, end, airport = "", airline = "" }) {
  return rows.filter(
    (r) =>
      r.date >= start &&
      r.date <= end &&
      (!airport || r.origin === airport) &&
      (!airline || r.airline === airline),
  );
}
export function calendar(start, end) {
  const result = [];
  for (
    let t = Date.parse(start + "T00:00:00Z");
    t <= Date.parse(end + "T00:00:00Z");
    t += DAY
  )
    result.push(new Date(t).toISOString().slice(0, 10));
  return result;
}
export function csvCell(value) {
  let s = String(value ?? "");
  if (/^[=+@\-\t\r]/.test(s)) s = "'" + s;
  return '"' + s.replaceAll('"', '""') + '"';
}
