import { readFileSync } from "node:fs";
import { z } from "zod";

const from = z.strictObject({
  name: z.string().min(1),
  address: z.array(z.string()).min(1),
  email: z.email(),
});

const billTo = z.strictObject({
  name: z.string().min(1),
  address: z.array(z.string()).min(1),
  emails: z.array(z.email()).min(1),
});

const isTimeZone = (tz: string): boolean => {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

const isCurrency = (code: string): boolean => {
  try {
    new Intl.NumberFormat("en-US", { style: "currency", currency: code });
    return true;
  } catch {
    return false;
  }
};

// strictObject: unknown keys (typos, removed fields) are reported instead of ignored.
export const configSchema = z.strictObject({
  locale: z.string().min(2).default("en-US"),
  currency: z.string().length(3).refine(isCurrency, "Unknown ISO 4217 currency code"),
  timeZone: z.string().refine(isTimeZone, "Unknown IANA time zone"),

  ratePerWeekCents: z.number().int().positive(),
  billableWeekday: z.number().int().min(0).max(6),
  paymentTermsDays: z.number().int().min(0),

  firstInvoiceNumber: z.number().int().positive(),

  description: z.string().min(1),
  showBreakdown: z.boolean().default(false),

  from,
  billTo,
  /** Supports {number}, {period} and {paymentTermsDays}. */
  notes: z.array(z.string()).default([]),

  email: z.strictObject({
    to: z.union([z.email(), z.array(z.email()).min(1)]),
    /** Supports {number}, {month} and {period}. */
    subject: z.string().min(1).default("Invoice {number} · {month}"),
  }),
});

export type Config = z.infer<typeof configSchema>;

export class ConfigError extends Error {}

/** Parses and validates a config object, with one readable line per problem. */
export function parseConfig(raw: unknown, source = "config.json"): Config {
  const result = configSchema.safeParse(raw);
  if (result.success) return result.data;
  const problems = result.error.issues.map((issue) => {
    const where = issue.path.length > 0 ? issue.path.join(".") : "(root)";
    const keys = issue.code === "unrecognized_keys" ? ` (${issue.keys.join(", ")})` : "";
    return `  - ${where}: ${issue.message}${keys}`;
  });
  throw new ConfigError(`Invalid ${source}:\n${problems.join("\n")}`);
}

export function loadConfig(file: string): Config {
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new ConfigError(`Cannot read ${file}: ${reason}`);
  }
  return parseConfig(raw, file);
}
