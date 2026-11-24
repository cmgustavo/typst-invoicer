#!/usr/bin/env tsx
import { appendFileSync, existsSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { loadConfig } from "./lib/config";
import {
  isLastOfItsWeekdayInMonth,
  parseDate,
  parseYearMonth,
  todayIn,
  toISO,
  toYearMonthISO,
  weekdayOf,
  type PlainDate,
} from "./lib/dates";
import { sendInvoiceEmail } from "./lib/email";
import { buildInvoice, defaultBillingMonth } from "./lib/invoice";
import {
  assignNumber,
  invoiceFileName,
  loadLedger,
  saveLedger,
  upsertEntry,
  type LedgerEntry,
} from "./lib/ledger";
import { renderPdf, resolveTemplate } from "./lib/render";

const FRIDAY = 5;

const USAGE = `Usage: typst-invoicer [options]

  --data-dir <path>       Folder with config.json and invoices.json (default: ./data)
  --out-dir <path>        Where PDFs are written (default: ./invoices)
  --month YYYY-MM         Billing month (default: the month after the issue date)
  --date YYYY-MM-DD       Issue date (default: today in config.timeZone)
  --send                  Email the PDF via Gmail (GMAIL_USER / GMAIL_APP_PASSWORD)
  --dry-run               Print the invoice summary; write nothing
  --only-on-last-friday   Exit without doing anything unless the issue date is the last Friday
  -h, --help              Show this help`;

/** Exposes values to later GitHub Actions steps (no-op locally). */
function setOutput(key: string, value: string): void {
  const file = process.env.GITHUB_OUTPUT;
  if (file) appendFileSync(file, `${key}=${value}\n`);
}

const toPosix = (p: string): string => p.split(path.sep).join("/");

async function main(): Promise<void> {
  const { values: args } = parseArgs({
    options: {
      "data-dir": { type: "string", default: "./data" },
      "out-dir": { type: "string", default: "./invoices" },
      month: { type: "string" },
      date: { type: "string" },
      send: { type: "boolean", default: false },
      "dry-run": { type: "boolean", default: false },
      "only-on-last-friday": { type: "boolean", default: false },
      help: { type: "boolean", short: "h", default: false },
    },
    strict: true,
  });

  if (args.help) {
    console.log(USAGE);
    return;
  }

  const envFile = path.resolve(".env");
  if (existsSync(envFile)) process.loadEnvFile(envFile);

  const dataDir = path.resolve(args["data-dir"]);
  const outDir = path.resolve(args["out-dir"]);
  const ledgerPath = path.join(dataDir, "invoices.json");

  const config = loadConfig(path.join(dataDir, "config.json"));
  const ledger = loadLedger(ledgerPath);

  const issueDate: PlainDate = args.date ? parseDate(args.date) : todayIn(config.timeZone);

  if (args["only-on-last-friday"]) {
    if (weekdayOf(issueDate) !== FRIDAY || !isLastOfItsWeekdayInMonth(issueDate)) {
      console.log(`${toISO(issueDate)} is not the last Friday of the month. Nothing to do.`);
      setOutput("generated", "false");
      return;
    }
  }

  const billingMonth = args.month ? parseYearMonth(args.month) : defaultBillingMonth(issueDate);
  const number = assignNumber(ledger, toYearMonthISO(billingMonth), config.firstInvoiceNumber);
  const invoice = buildInvoice(config, issueDate, billingMonth, number);
  const existing = ledger.find((e) => e.billingMonth === invoice.billingMonthISO);

  const pdfPath = path.join(outDir, invoiceFileName(invoice.billingMonthISO, number));
  const relativePdf = toPosix(path.relative(process.cwd(), pdfPath));

  console.log(
    [
      `Invoice      ${number}${existing ? " (re-issue)" : ""}`,
      `Billing      ${invoice.monthLabel} (${invoice.breakdown})`,
      `Period       ${invoice.servicePeriod}`,
      `Issue date   ${invoice.template.issueDate}`,
      `Due date     ${invoice.template.dueDate}`,
      `Total        ${invoice.template.total}`,
      `Output       ${relativePdf}`,
    ].join("\n"),
  );

  if (args["dry-run"]) return;

  renderPdf(resolveTemplate(dataDir), invoice.template, pdfPath);

  const entry: LedgerEntry = {
    number,
    billingMonth: invoice.billingMonthISO,
    issueDate: toISO(invoice.issueDate),
    dueDate: toISO(invoice.dueDate),
    billableDays: invoice.billableDates.length,
    amountCents: invoice.amountCents,
    file: relativePdf,
    ...(existing?.sentAt ? { sentAt: existing.sentAt } : {}),
  };

  if (args.send) {
    await sendInvoiceEmail({
      to: config.email.to,
      subject: invoice.emailSubject,
      text: `Invoice ${number} for ${invoice.monthLabel}: ${invoice.template.total}, due ${invoice.template.dueDate}.`,
      pdfPath,
    });
    entry.sentAt = new Date().toISOString();
    console.log(`Sent to ${[config.email.to].flat().join(", ")}`);
  }

  saveLedger(ledgerPath, upsertEntry(ledger, entry));

  setOutput("generated", "true");
  setOutput("number", String(number));
  setOutput("file", relativePdf);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
