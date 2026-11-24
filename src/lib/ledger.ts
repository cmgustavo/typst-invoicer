import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { z } from "zod";

const entrySchema = z.object({
  number: z.number().int().positive(),
  billingMonth: z.string().regex(/^\d{4}-\d{2}$/),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  billableDays: z.number().int().min(0),
  amountCents: z.number().int().min(0),
  file: z.string(),
  sentAt: z.string().optional(),
});

export type LedgerEntry = z.infer<typeof entrySchema>;
export type Ledger = readonly LedgerEntry[];

export function loadLedger(file: string): LedgerEntry[] {
  if (!existsSync(file)) return [];
  const result = z.array(entrySchema).safeParse(JSON.parse(readFileSync(file, "utf8")));
  if (!result.success) {
    const first = result.error.issues[0];
    throw new Error(`Invalid ledger ${file}: ${first?.path.join(".")}: ${first?.message}`);
  }
  return result.data;
}

export function saveLedger(file: string, ledger: Ledger): void {
  writeFileSync(file, `${JSON.stringify(ledger, null, 2)}\n`);
}

/**
 * Invoice number for a billing month: the existing one if the month was already
 * billed, otherwise max(number) + 1, or `first` for an empty ledger.
 */
export function assignNumber(ledger: Ledger, billingMonth: string, first: number): number {
  const existing = ledger.find((e) => e.billingMonth === billingMonth);
  if (existing) return existing.number;
  return ledger.length > 0 ? Math.max(...ledger.map((e) => e.number)) + 1 : first;
}

/** Inserts or replaces the entry for its billing month, sorted by number. */
export const upsertEntry = (ledger: Ledger, entry: LedgerEntry): LedgerEntry[] =>
  [...ledger.filter((e) => e.billingMonth !== entry.billingMonth), entry].sort(
    (a, b) => a.number - b.number,
  );

export const formatNumber = (n: number, prefix: string, padding: number): string =>
  `${prefix}${String(n).padStart(padding, "0")}`;
