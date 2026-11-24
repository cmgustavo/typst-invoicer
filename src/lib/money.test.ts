import assert from "node:assert/strict";
import { test } from "node:test";
import { formatMoney } from "./money";

test("formats integer cents as currency", () => {
  assert.equal(formatMoney(4 * 134529, "en-US", "USD"), "$5,381.16");
  assert.equal(formatMoney(5 * 134529, "en-US", "USD"), "$6,726.45");
  assert.equal(formatMoney(0, "en-US", "USD"), "$0.00");
  assert.equal(formatMoney(5, "en-US", "USD"), "$0.05");
});

test("follows the locale", () => {
  // de-DE uses a narrow no-break space before the symbol
  assert.equal(formatMoney(134529, "de-DE", "EUR").replace(/\s/g, " "), "1.345,29 €");
});
