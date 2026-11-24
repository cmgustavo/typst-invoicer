import assert from "node:assert/strict";
import { test } from "node:test";
import { ConfigError, parseConfig } from "./config";

const valid = {
  currency: "USD",
  timeZone: "America/Argentina/Buenos_Aires",
  ratePerWeekCents: 134529,
  billableWeekday: 3,
  paymentTermsDays: 30,
  firstInvoiceNumber: 1,
  description: "Services",
  from: { name: "Jane Doe", address: ["Somewhere"], email: "jane@example.com" },
  billTo: { name: "ACME Corp", address: ["Elsewhere"], emails: ["billing@acme.example"] },
  email: { to: "jane@example.com" },
};

test("applies defaults", () => {
  const config = parseConfig(valid);
  assert.equal(config.locale, "en-US");
  assert.equal(config.email.subject, "Invoice {number} · {month}");
  assert.deepEqual(config.notes, []);
});

test("reports every problem with its path", () => {
  const bad = {
    ...valid,
    ratePerWeekCents: 1345.29,
    billableWeekday: 7,
    timeZone: "Mars/Olympus",
    billTo: { ...valid.billTo, emails: ["ok@example.com", "nope"] },
  };
  assert.throws(
    () => parseConfig(bad),
    (error: unknown) => {
      assert.ok(error instanceof ConfigError);
      for (const field of ["ratePerWeekCents", "billableWeekday", "timeZone", "billTo.emails.1"]) {
        assert.match(error.message, new RegExp(`- ${field.replaceAll(".", "\\.")}:`));
      }
      return true;
    },
  );
});

test("rejects removed or misspelled fields", () => {
  assert.throws(
    () => parseConfig({ ...valid, numberPrefix: "INV-", numberPadding: 4 }),
    /- \(root\): .*\(numberPrefix, numberPadding\)/,
  );
  assert.throws(
    () => parseConfig({ ...valid, billTo: { name: "X", address: ["Y"], email: "x@example.com" } }),
    /- billTo\.emails:/,
  );
});
