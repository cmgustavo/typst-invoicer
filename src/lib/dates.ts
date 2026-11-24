/** Calendar date without time or timezone. `month` is 1-12. */
export interface PlainDate {
  year: number;
  month: number;
  day: number;
}

export interface YearMonth {
  year: number;
  month: number;
}

const toUTC = (d: PlainDate): Date => new Date(Date.UTC(d.year, d.month - 1, d.day));

const fromUTC = (dt: Date): PlainDate => ({
  year: dt.getUTCFullYear(),
  month: dt.getUTCMonth() + 1,
  day: dt.getUTCDate(),
});

/** Today's date as seen in the given IANA time zone. */
export function todayIn(timeZone: string, now: Date = new Date()): PlainDate {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((p) => p.type === type)?.value);
  return { year: get("year"), month: get("month"), day: get("day") };
}

export function parseDate(value: string): PlainDate {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) throw new Error(`Invalid date "${value}", expected YYYY-MM-DD`);
  const d = { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
  const roundTrip = fromUTC(toUTC(d));
  if (roundTrip.month !== d.month || roundTrip.day !== d.day) {
    throw new Error(`Invalid date "${value}"`);
  }
  return d;
}

export function parseYearMonth(value: string): YearMonth {
  const m = /^(\d{4})-(\d{2})$/.exec(value);
  if (!m || Number(m[2]) < 1 || Number(m[2]) > 12) {
    throw new Error(`Invalid month "${value}", expected YYYY-MM`);
  }
  return { year: Number(m[1]), month: Number(m[2]) };
}

export const addDays = (d: PlainDate, days: number): PlainDate =>
  fromUTC(new Date(Date.UTC(d.year, d.month - 1, d.day + days)));

export const nextMonth = ({ year, month }: YearMonth): YearMonth =>
  month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };

export const daysInMonth = ({ year, month }: YearMonth): number =>
  new Date(Date.UTC(year, month, 0)).getUTCDate();

/** 0 = Sunday ... 6 = Saturday */
export const weekdayOf = (d: PlainDate): number => toUTC(d).getUTCDay();

/** Every date in the month that falls on `weekday` (0 = Sunday ... 6 = Saturday). */
export function datesOfWeekday(ym: YearMonth, weekday: number): PlainDate[] {
  const firstDow = weekdayOf({ ...ym, day: 1 });
  const dates: PlainDate[] = [];
  for (let day = 1 + ((weekday - firstDow + 7) % 7); day <= daysInMonth(ym); day += 7) {
    dates.push({ ...ym, day });
  }
  return dates;
}

/** True when no later date in the same month shares this weekday. */
export const isLastOfItsWeekdayInMonth = (d: PlainDate): boolean =>
  addDays(d, 7).month !== d.month;

export const toISO = (d: PlainDate): string =>
  `${d.year}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`;

export const toYearMonthISO = (ym: YearMonth): string =>
  `${ym.year}-${String(ym.month).padStart(2, "0")}`;

export const formatLongDate = (d: PlainDate, locale: string): string =>
  new Intl.DateTimeFormat(locale, { timeZone: "UTC", dateStyle: "long" }).format(toUTC(d));

export const formatShortDate = (d: PlainDate, locale: string): string =>
  new Intl.DateTimeFormat(locale, { timeZone: "UTC", month: "short", day: "numeric" }).format(
    toUTC(d),
  );

export const formatMonth = (ym: YearMonth, locale: string): string =>
  new Intl.DateTimeFormat(locale, { timeZone: "UTC", month: "long", year: "numeric" }).format(
    toUTC({ ...ym, day: 1 }),
  );

export const firstDayOf = (ym: YearMonth): PlainDate => ({ ...ym, day: 1 });
export const lastDayOf = (ym: YearMonth): PlainDate => ({ ...ym, day: daysInMonth(ym) });

const monthName = (d: PlainDate, locale: string): string =>
  new Intl.DateTimeFormat(locale, { timeZone: "UTC", month: "long" }).format(toUTC(d));

/**
 * Formats an inclusive date range: "December 1–31, 2026" within a month,
 * "December 15 – January 14, 2027" across months, and both years when they differ.
 */
export function formatDateRange(start: PlainDate, end: PlainDate, locale: string): string {
  const [m1, m2] = [monthName(start, locale), monthName(end, locale)];
  if (start.year !== end.year) {
    return `${m1} ${start.day}, ${start.year} – ${m2} ${end.day}, ${end.year}`;
  }
  if (start.month !== end.month) {
    return `${m1} ${start.day} – ${m2} ${end.day}, ${end.year}`;
  }
  return `${m1} ${start.day}–${end.day}, ${end.year}`;
}
