import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { parseConfig } from "./config";
import { parseDate } from "./dates";
import { buildInvoice, defaultBillingMonth, formatServicePeriod } from "./invoice";

const example = JSON.parse(
  readFileSync(path.resolve(import.meta.dirname, "../../examples/data/config.json"), "utf8"),
) as unknown;
const config = parseConfig(example);

test("billing month defaults to the month after the issue date", () => {
  assert.deepEqual(defaultBillingMonth(parseDate("2026-11-27")), { year: 2026, month: 12 });
  assert.deepEqual(defaultBillingMonth(parseDate("2026-12-25")), { year: 2027, month: 1 });
});

test("a 5-Wednesday month bills 5 weeks", () => {
  const inv = buildInvoice(config, parseDate("2026-11-27"), { year: 2026, month: 12 }, 64);
  assert.equal(inv.billableDates.length, 5);
  assert.equal(inv.amountCents, 672645);
  assert.equal(inv.template.total, "$6,726.45");
  assert.equal(inv.template.dueDate, "December 27, 2026");
  assert.equal(inv.template.terms, "Net 30");
});

test("a 4-Wednesday month bills 4 weeks", () => {
  const inv = buildInvoice(config, parseDate("2026-10-30"), { year: 2026, month: 11 }, 64);
  assert.equal(inv.billableDates.length, 4);
  assert.equal(inv.template.total, "$5,381.16");
});

test("service period spans the whole billing month", () => {
  assert.equal(formatServicePeriod({ year: 2026, month: 11 }, "en-US"), "November 1–30, 2026");
  assert.equal(formatServicePeriod({ year: 2026, month: 12 }, "en-US"), "December 1–31, 2026");
  assert.equal(formatServicePeriod({ year: 2028, month: 2 }, "en-US"), "February 1–29, 2028");
  assert.equal(formatServicePeriod({ year: 2027, month: 2 }, "en-US"), "February 1–28, 2027");
});

test("uses the plain number in template, notes and subject", () => {
  const inv = buildInvoice(config, parseDate("2026-11-27"), { year: 2026, month: 12 }, 64);
  assert.equal(inv.template.number, "64");
  assert.equal(inv.template.servicePeriod, "December 1–31, 2026");
  assert.equal(inv.emailSubject, "Invoice 64 · December 2026");
  assert.ok(inv.template.notes.includes("Service period: December 1–31, 2026."));
  assert.ok(inv.template.notes.includes("Please reference invoice 64 with your payment."));
  assert.ok(inv.template.notes.some((n) => n.startsWith("Payment terms: Net 30 ")));
  assert.ok(inv.template.notes.every((n) => !/[{}]/.test(n)), "no placeholders left");
});

test("unknown placeholders fail the build", () => {
  const bad = { ...config, notes: ["Due {dueDate}"] };
  assert.throws(
    () => buildInvoice(bad, parseDate("2026-11-27"), { year: 2026, month: 12 }, 64),
    /Unknown placeholder \{dueDate\} in notes\[0\]/,
  );
  const badSubject = { ...config, email: { ...config.email, subject: "Inv {num}" } };
  assert.throws(
    () => buildInvoice(badSubject, parseDate("2026-11-27"), { year: 2026, month: 12 }, 64),
    /in email\.subject/,
  );
});
