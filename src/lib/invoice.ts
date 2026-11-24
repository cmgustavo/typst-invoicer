import type { Config } from "./config";
import {
  addDays,
  datesOfWeekday,
  formatLongDate,
  formatMonth,
  formatShortDate,
  nextMonth,
  toYearMonthISO,
  type PlainDate,
  type YearMonth,
} from "./dates";
import { formatMoney } from "./money";

export interface Party {
  name: string;
  address: string[];
  email: string;
}

/** Shape of the JSON handed to the Typst template. All values are display-ready. */
export interface TemplateData {
  number: string;
  issueDate: string;
  dueDate: string;
  terms: string;
  currency: string;
  from: Party;
  billTo: Party;
  items: { description: string; detail: string | null; amount: string }[];
  subtotal: string;
  total: string;
  notes: string[];
}

export interface Invoice {
  issueDate: PlainDate;
  dueDate: PlainDate;
  billingMonth: YearMonth;
  billingMonthISO: string;
  monthLabel: string;
  billableDates: PlainDate[];
  amountCents: number;
  breakdown: string;
  template: TemplateData;
}

/** Billing month defaults to the month after the issue date. */
export const defaultBillingMonth = (issueDate: PlainDate): YearMonth =>
  nextMonth({ year: issueDate.year, month: issueDate.month });

export function buildInvoice(
  config: Config,
  issueDate: PlainDate,
  billingMonth: YearMonth,
  numberLabel: string,
): Invoice {
  const money = (cents: number): string => formatMoney(cents, config.locale, config.currency);
  const billableDates = datesOfWeekday(billingMonth, config.billableWeekday);
  const amountCents = billableDates.length * config.ratePerWeekCents;
  const dueDate = addDays(issueDate, config.paymentTermsDays);
  const monthLabel = formatMonth(billingMonth, config.locale);
  const breakdown = `${billableDates.length} weeks × ${money(config.ratePerWeekCents)} · ${billableDates
    .map((d) => formatShortDate(d, config.locale))
    .join(", ")}`;

  return {
    issueDate,
    dueDate,
    billingMonth,
    billingMonthISO: toYearMonthISO(billingMonth),
    monthLabel,
    billableDates,
    amountCents,
    breakdown,
    template: {
      number: numberLabel,
      issueDate: formatLongDate(issueDate, config.locale),
      dueDate: formatLongDate(dueDate, config.locale),
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
      notes: config.notes,
    },
  };
}
