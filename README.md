# typst-invoicer

Monthly contractor invoices, generated from a small JSON config:

- **TypeScript** computes the amount: `(number of <weekday> in the billing month) × ratePerWeekCents`.
- **Typst** renders the PDF (Inter fonts bundled, so local and CI output match).
- **Gmail** (nodemailer + App Password) delivers it, optionally.
- A **reusable GitHub Actions workflow** runs it on the last Friday of each month and
  commits the ledger and PDF back to *your own private data repo*.

This repository contains only the tool. Your personal data (config, ledger, PDFs)
lives in a separate private repo that calls the reusable workflow.

## How it works

| Rule | Behavior |
| --- | --- |
| Amount | count of `billableWeekday` (0 = Sunday … 6 = Saturday) in the billing month × `ratePerWeekCents` |
| Billing month | the month **after** the issue date (issued Nov 27 2026 → bills December 2026), or `--month` |
| Issue date | today in `config.timeZone`, or `--date`. The workflow runs every Friday and only acts on the last one |
| Due date | issue date + `paymentTermsDays` |
| Numbering | sequential. `data/invoices.json` is the source of truth. Re-running a billed month reuses its number and overwrites the PDF |
| Money | integer cents everywhere, formatted with `Intl.NumberFormat` only at output |
| Dates | plain calendar dates, no time zone arithmetic |

## Setup (local)

Requirements: Node 22+ and [Typst](https://github.com/typst/typst#installation) 0.13+ (`brew install typst`).

```bash
npm ci
npm run invoice -- --data-dir examples/data --date 2026-11-27 --dry-run
```

```text
Invoice      INV-0001
Billing      December 2026 (5 weeks × $1,345.29 · Dec 2, Dec 9, Dec 16, Dec 23, Dec 30)
Issue date   November 27, 2026
Due date     December 27, 2026
Total        $6,726.45
Output       invoices/2026/INV-0001_2026-12.pdf
```

A data directory contains:

```text
data/
  config.json      required, see examples/data/config.json
  invoices.json    the ledger; start with []
  template.typ     optional, overrides templates/invoice.typ
```

### `config.json`

Validated with zod. An invalid file fails with one line per problem, e.g.
`- billTo.email: Invalid email address`.

| Field | Type | Notes |
| --- | --- | --- |
| `locale` | string | default `en-US`, used for money and dates |
| `currency` | ISO 4217 | e.g. `USD` |
| `timeZone` | IANA zone | resolves "today" |
| `ratePerWeekCents` | integer | rate per billable weekday, in cents |
| `billableWeekday` | 0–6 | 0 = Sunday, 3 = Wednesday |
| `paymentTermsDays` | integer | `30` → "Net 30" |
| `firstInvoiceNumber` | integer | used only while the ledger is empty |
| `numberPrefix` / `numberPadding` | string / integer | default `INV-` / `4` → `INV-0064` |
| `description` | string | line item text; the month is appended |
| `showBreakdown` | boolean | show "5 weeks × $… · Dec 2, …" under the line item |
| `from`, `billTo` | `{ name, address[], email }` | |
| `notes` | string[] | printed at the bottom (e.g. payment details) |
| `email.to` | email or email[] | recipient(s) for `--send` |
| `email.subject` | string | supports `{number}` and `{month}` |

### Email

`--send` uses Gmail SMTP with `GMAIL_USER` and `GMAIL_APP_PASSWORD` from the environment.
A `.env` file in the current directory is loaded if present (see `.env.example`).
App Passwords require 2-Step Verification: Google Account → Security → 2-Step Verification → App passwords.

## CLI reference

```text
npx tsx src/cli.ts [options]        (bin: typst-invoicer)

  --data-dir <path>       Folder with config.json and invoices.json (default: ./data)
  --out-dir <path>        Where PDFs are written (default: ./invoices)
  --month YYYY-MM         Billing month (default: the month after the issue date)
  --date YYYY-MM-DD       Issue date (default: today in config.timeZone)
  --send                  Email the PDF via Gmail
  --dry-run               Print the invoice summary; write nothing
  --only-on-last-friday   Exit without doing anything unless the issue date is the last Friday
  -h, --help              Show help
```

PDFs are written to `<out-dir>/<year>/<number>_<YYYY-MM>.pdf`.

## Use it from a private data repo

1. Create a **private** repository with this layout:

   ```text
   data/config.json        your real values (copy examples/data/config.json)
   data/invoices.json      []
   invoices/.gitkeep
   .github/workflows/invoice.yml
   ```

2. Add the repository secrets `GMAIL_USER` and `GMAIL_APP_PASSWORD`
   (Settings → Secrets and variables → Actions).

3. Add the caller workflow:

   ```yaml
   # .github/workflows/invoice.yml
   name: Monthly invoice

   on:
     schedule:
       # Every Friday 13:00 UTC; the tool only acts on the last Friday of the month.
       - cron: "0 13 * * 5"
     workflow_dispatch:
       inputs:
         month:
           description: "Billing month (YYYY-MM). Empty = next month"
           type: string
           required: false
         send:
           description: "Email the PDF"
           type: boolean
           default: true

   permissions:
     contents: read

   jobs:
     invoice:
       permissions:
         contents: write
       uses: cmgustavo/typst-invoicer/.github/workflows/generate.yml@v1.0.0
       with:
         month: ${{ inputs.month || '' }}
         send: ${{ github.event_name == 'schedule' || inputs.send }}
         only-on-last-friday: ${{ github.event_name == 'schedule' }}
       secrets: inherit
   ```

The workflow checks out your repo, checks out this tool into `.tool/` (add `.tool/`
to your `.gitignore`), installs Node 22 and the pinned Typst, runs the CLI against
`data/` and `invoices/`, uploads the PDF as a run artifact and commits
`data/invoices.json` plus the PDF with `chore(invoices): add <number>`.

### Reusable workflow reference

| Input | Type | Default | |
| --- | --- | --- | --- |
| `month` | string | `""` | billing month `YYYY-MM` |
| `send` | boolean | `false` | email the PDF |
| `only-on-last-friday` | boolean | `false` | skip unless today is the last Friday |
| `typst-version` | string | `0.13.1` | Typst release to install |
| `tool-ref` | string | this workflow's commit | typst-invoicer ref to run |

Secrets: `GMAIL_USER`, `GMAIL_APP_PASSWORD` (only needed when `send` is true).
Outputs: `generated` (`'true'`/`'false'`), `number`, `file`.

For supply-chain safety, pin `uses:` lines (both this workflow and the actions it
uses) to full commit SHAs instead of tags.

## Custom template

Copy `templates/invoice.typ` to `<data-dir>/template.typ` and edit it. The invoice
arrives as JSON via `sys.inputs.data` (shape: `TemplateData` in `src/lib/invoice.ts`).
The template's own folder is the Typst root, so it can reference images next to it.

## Development

```bash
npm run typecheck
npm test          # node:test via tsx
npm run smoke     # compiles the example invoice into build/smoke (needs typst)
```

## License

MIT. The bundled Inter fonts are under the SIL Open Font License (`fonts/OFL.txt`).
