import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addDays,
  datesOfWeekday,
  formatDateRange,
  isLastOfItsWeekdayInMonth,
  nextMonth,
  parseDate,
  parseYearMonth,
  todayIn,
  weekdayOf,
} from "./dates";

const WEDNESDAY = 3;
const FRIDAY = 5;

test("counts Wednesdays per month", () => {
  assert.equal(datesOfWeekday({ year: 2026, month: 11 }, WEDNESDAY).length, 4);
  assert.equal(datesOfWeekday({ year: 2026, month: 12 }, WEDNESDAY).length, 5);
  assert.equal(datesOfWeekday({ year: 2027, month: 2 }, WEDNESDAY).length, 4);
  assert.equal(datesOfWeekday({ year: 2023, month: 10 }, WEDNESDAY).length, 4);
});

test("lists the actual dates", () => {
  const days = datesOfWeekday({ year: 2026, month: 12 }, WEDNESDAY).map((d) => d.day);
  assert.deepEqual(days, [2, 9, 16, 23, 30]);
});

test("handles a weekday that is the 1st of the month", () => {
  // 2026-07-01 is a Wednesday
  const days = datesOfWeekday({ year: 2026, month: 7 }, WEDNESDAY).map((d) => d.day);
  assert.deepEqual(days, [1, 8, 15, 22, 29]);
});

test("detects the last Friday of the month", () => {
  assert.equal(weekdayOf(parseDate("2026-11-27")), FRIDAY);
  assert.equal(isLastOfItsWeekdayInMonth(parseDate("2026-11-27")), true);
  assert.equal(isLastOfItsWeekdayInMonth(parseDate("2026-11-20")), false);
  assert.equal(isLastOfItsWeekdayInMonth(parseDate("2026-12-25")), true);
});

test("rolls over the year", () => {
  assert.deepEqual(nextMonth({ year: 2026, month: 12 }), { year: 2027, month: 1 });
  assert.deepEqual(addDays(parseDate("2026-12-25"), 30), { year: 2027, month: 1, day: 24 });
});

test("rejects impossible dates and months", () => {
  assert.throws(() => parseDate("2026-02-30"));
  assert.throws(() => parseDate("2026-13-01"));
  assert.throws(() => parseDate("26-1-1"));
  assert.throws(() => parseYearMonth("2026-13"));
  assert.throws(() => parseYearMonth("2026-00"));
  assert.deepEqual(parseDate("2028-02-29"), { year: 2028, month: 2, day: 29 });
});

test("resolves today in the configured time zone", () => {
  // 02:00 UTC on Nov 28 is still Nov 27 in Argentina (UTC-3)
  const now = new Date("2026-11-28T02:00:00Z");
  assert.deepEqual(todayIn("America/Argentina/Buenos_Aires", now), { year: 2026, month: 11, day: 27 });
  assert.deepEqual(todayIn("UTC", now), { year: 2026, month: 11, day: 28 });
});

test("formats date ranges, spelling out both months when they differ", () => {
  const d = parseDate;
  assert.equal(formatDateRange(d("2026-12-01"), d("2026-12-31"), "en-US"), "December 1–31, 2026");
  assert.equal(
    formatDateRange(d("2026-11-15"), d("2026-12-14"), "en-US"),
    "November 15 – December 14, 2026",
  );
  assert.equal(
    formatDateRange(d("2026-12-15"), d("2027-01-14"), "en-US"),
    "December 15, 2026 – January 14, 2027",
  );
});
