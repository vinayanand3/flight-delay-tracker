import test from "node:test";
import assert from "node:assert/strict";
import {
  stats,
  dateRange,
  filterRows,
  calendar,
  group,
  csvCell,
} from "../docs/assets/metrics.js";
test("weighted rates exclude unknown values and average only delayed records", () => {
  const s = stats([
    { delay: 20 },
    { delay: 40 },
    { delay: 0 },
    { delay: null, delay_known: false },
  ]);
  assert.equal(s.total, 4);
  assert.equal(s.known, 3);
  assert.ok(Math.abs(s.rate - 200 / 3) < 1e-10);
  assert.equal(s.avg, 30);
});
test("no sample and no delayed observations are not a zero-minute average", () => {
  assert.equal(stats([]).rate, null);
  assert.equal(stats([{ delay: 0 }]).avg, null);
});
test("15 minute boundary preserves legacy metric", () => {
  assert.equal(stats([{ delay: 15 }, { delay: 16 }]).delayed, 1);
});
test("calendar days include missing observations and month boundaries", () => {
  assert.equal(dateRange("2026-09-03", 7), "2026-08-28");
  assert.equal(calendar("2026-08-30", "2026-09-02").length, 4);
});
test("airport and airline cross filters intersect", () => {
  const rows = [
    { date: "2026-09-01", origin: "ATL", airline: "AA" },
    { date: "2026-09-02", origin: "ORD", airline: "AA" },
    { date: "2026-09-01", origin: "ATL", airline: "DL" },
  ];
  assert.equal(
    filterRows(rows, {
      start: "2026-09-01",
      end: "2026-09-02",
      airport: "ATL",
      airline: "AA",
    }).length,
    1,
  );
});
test("CSV escapes quotes and spreadsheet formula cells", () => {
  assert.equal(csvCell("=SUM(A1)"), '"\'=SUM(A1)"');
  assert.equal(csvCell('Air "One"'), '"Air ""One"""');
});
