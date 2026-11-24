import assert from "node:assert/strict";
import { test } from "node:test";
import { assignNumber, formatNumber, upsertEntry, type LedgerEntry } from "./ledger";

const entry = (number: number, billingMonth: string): LedgerEntry => ({
  number,
  billingMonth,
  issueDate: "2026-11-27",
  dueDate: "2026-12-27",
  billableDays: 5,
  amountCents: 672645,
  file: `invoices/2026/INV-${number}_${billingMonth}.pdf`,
});

test("first invoice uses firstInvoiceNumber", () => {
  assert.equal(assignNumber([], "2026-12", 64), 64);
});

test("next invoice is max + 1", () => {
  const ledger = [entry(64, "2026-12"), entry(65, "2027-01")];
  assert.equal(assignNumber(ledger, "2027-02", 64), 66);
});

test("re-running a billed month reuses its number", () => {
  const ledger = [entry(64, "2026-12"), entry(65, "2027-01")];
  assert.equal(assignNumber(ledger, "2026-12", 1), 64);
});

test("upsert replaces the month instead of duplicating it", () => {
  const ledger = [entry(64, "2026-12"), entry(65, "2027-01")];
  const updated = upsertEntry(ledger, { ...entry(64, "2026-12"), sentAt: "2026-11-27T13:00:00Z" });
  assert.equal(updated.length, 2);
  assert.deepEqual(
    updated.map((e) => e.number),
    [64, 65],
  );
  assert.equal(updated[0]?.sentAt, "2026-11-27T13:00:00Z");
  assert.equal(ledger.length, 2, "input is not mutated");
});

test("formats invoice numbers with prefix and padding", () => {
  assert.equal(formatNumber(64, "INV-", 4), "INV-0064");
  assert.equal(formatNumber(12345, "INV-", 4), "INV-12345");
  assert.equal(formatNumber(7, "", 0), "7");
});
