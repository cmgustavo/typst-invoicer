import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { parseConfig } from "./config";
import { parseDate } from "./dates";
import { buildInvoice, defaultBillingMonth } from "./invoice";

const example = JSON.parse(
  readFileSync(path.resolve(import.meta.dirname, "../../examples/data/config.json"), "utf8"),
) as unknown;
const config = parseConfig(example);

test("billing month defaults to the month after the issue date", () => {
  assert.deepEqual(defaultBillingMonth(parseDate("2026-11-27")), { year: 2026, month: 12 });
  assert.deepEqual(defaultBillingMonth(parseDate("2026-12-25")), { year: 2027, month: 1 });
});

test("a 5-Wednesday month bills 5 weeks", () => {
  const inv = buildInvoice(config, parseDate("2026-11-27"), { year: 2026, month: 12 }, "INV-0001");
  assert.equal(inv.billableDates.length, 5);
  assert.equal(inv.amountCents, 672645);
  assert.equal(inv.template.total, "$6,726.45");
  assert.equal(inv.template.dueDate, "December 27, 2026");
  assert.equal(inv.template.terms, "Net 30");
});

test("a 4-Wednesday month bills 4 weeks", () => {
  const inv = buildInvoice(config, parseDate("2026-10-30"), { year: 2026, month: 11 }, "INV-0001");
  assert.equal(inv.billableDates.length, 4);
  assert.equal(inv.template.total, "$5,381.16");
});
