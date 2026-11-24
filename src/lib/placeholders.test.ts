import assert from "node:assert/strict";
import { test } from "node:test";
import { fillPlaceholders } from "./placeholders";

const vars = { number: 64, period: "December 1–31, 2026", paymentTermsDays: 30 };

test("replaces every known placeholder, including repeats", () => {
  assert.equal(
    fillPlaceholders("Invoice {number} ({number}) · {period} · Net {paymentTermsDays}", vars),
    "Invoice 64 (64) · December 1–31, 2026 · Net 30",
  );
});

test("leaves text without placeholders untouched", () => {
  assert.equal(fillPlaceholders("Thank you.", vars), "Thank you.");
});

test("throws on unknown placeholders, naming where", () => {
  assert.throws(
    () => fillPlaceholders("Due {dueDate}", vars, "notes[2]"),
    /Unknown placeholder \{dueDate\} in notes\[2\]\. Allowed: \{number\}, \{period\}, \{paymentTermsDays\}/,
  );
  assert.throws(() => fillPlaceholders("Typo {Number}", vars), /\{Number\}/);
  assert.throws(() => fillPlaceholders("Empty {}", vars), /\{\}/);
});
