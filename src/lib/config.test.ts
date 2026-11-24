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
  billTo: { name: "ACME Corp", address: ["Elsewhere"], email: "billing@acme.example" },
  email: { to: "jane@example.com" },
};

test("applies defaults", () => {
  const config = parseConfig(valid);
  assert.equal(config.locale, "en-US");
  assert.equal(config.numberPrefix, "INV-");
  assert.equal(config.numberPadding, 4);
  assert.deepEqual(config.notes, []);
});

test("reports every problem with its path", () => {
  const bad = {
    ...valid,
    ratePerWeekCents: 1345.29,
    billableWeekday: 7,
    timeZone: "Mars/Olympus",
    billTo: { ...valid.billTo, email: "nope" },
  };
  assert.throws(
    () => parseConfig(bad),
    (error: unknown) => {
      assert.ok(error instanceof ConfigError);
      for (const field of ["ratePerWeekCents", "billableWeekday", "timeZone", "billTo.email"]) {
        assert.match(error.message, new RegExp(`- ${field.replace(".", "\\.")}:`));
      }
      return true;
    },
  );
});
