import type { Config } from "./config";
import {
  addDays,
  datesOfWeekday,
  firstDayOf,
  formatDateRange,
  formatLongDate,
  formatMonth,
  formatShortDate,
  lastDayOf,
  nextMonth,
  toYearMonthISO,
  type PlainDate,
  type YearMonth,
} from "./dates";
import { formatMoney } from "./money";
import { fillPlaceholders } from "./placeholders";

/** Shape of the JSON handed to the Typst template. All values are display-ready. */
export interface TemplateData {
  number: string;
  issueDate: string;
  dueDate: string;
  servicePeriod: string;
  terms: string;
  currency: string;
  from: { name: string; address: string[]; email: string };
  billTo: { name: string; address: string[]; emails: string[] };
  items: { description: string; detail: string | null; amount: string }[];
  subtotal: string;
  total: string;
  notes: string[];
}

export interface Invoice {
  number: number;
  issueDate: PlainDate;
  dueDate: PlainDate;
  billingMonth: YearMonth;
  billingMonthISO: string;
  monthLabel: string;
  servicePeriod: string;
  billableDates: PlainDate[];
  amountCents: number;
  breakdown: string;
  emailSubject: string;
  template: TemplateData;
}

/** Billing month defaults to the month after the issue date. */
export const defaultBillingMonth = (issueDate: PlainDate): YearMonth =>
  nextMonth({ year: issueDate.year, month: issueDate.month });

/** Service period: first to last day of the billing month. */
export const formatServicePeriod = (ym: YearMonth, locale: string): string =>
  formatDateRange(firstDayOf(ym), lastDayOf(ym), locale);

export function buildInvoice(
  config: Config,
  issueDate: PlainDate,
  billingMonth: YearMonth,
  number: number,
): Invoice {
  const money = (cents: number): string => formatMoney(cents, config.locale, config.currency);
  const billableDates = datesOfWeekday(billingMonth, config.billableWeekday);
  const amountCents = billableDates.length * config.ratePerWeekCents;
  const dueDate = addDays(issueDate, config.paymentTermsDays);
  const monthLabel = formatMonth(billingMonth, config.locale);
  const servicePeriod = formatServicePeriod(billingMonth, config.locale);
  const breakdown = `${billableDates.length} weeks × ${money(config.ratePerWeekCents)} · ${billableDates
    .map((d) => formatShortDate(d, config.locale))
    .join(", ")}`;

  const notes = config.notes.map((note, i) =>
    fillPlaceholders(
      note,
      { number, period: servicePeriod, paymentTermsDays: config.paymentTermsDays },
      `notes[${i}]`,
    ),
  );
  const emailSubject = fillPlaceholders(
    config.email.subject,
    { number, month: monthLabel, period: servicePeriod },
    "email.subject",
  );

  return {
    number,
    issueDate,
    dueDate,
    billingMonth,
    billingMonthISO: toYearMonthISO(billingMonth),
    monthLabel,
    servicePeriod,
    billableDates,
    amountCents,
    breakdown,
    emailSubject,
    template: {
      number: String(number),
      issueDate: formatLongDate(issueDate, config.locale),
      dueDate: formatLongDate(dueDate, config.locale),
      servicePeriod,
      terms: `Net ${config.paymentTermsDays}`,
      currency: config.currency,
      from: config.from,
      billTo: config.billTo,
      items: [
        {
          description: `${config.description} · ${monthLabel}`,
          detail: config.showBreakdown ? breakdown : null,
          amount: money(amountCents),
        },
      ],
      subtotal: money(amountCents),
      total: money(amountCents),
      notes,
    },
  };
}
