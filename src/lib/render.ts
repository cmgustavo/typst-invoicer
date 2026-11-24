import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import type { TemplateData } from "./invoice";

/** Root of the typst-invoicer package (holds templates/ and fonts/). */
export const TOOL_ROOT = path.resolve(import.meta.dirname, "../..");
export const DEFAULT_TEMPLATE = path.join(TOOL_ROOT, "templates/invoice.typ");
export const FONTS_DIR = path.join(TOOL_ROOT, "fonts");

/** `<dataDir>/template.typ` when present, otherwise the bundled template. */
export function resolveTemplate(dataDir: string): string {
  const custom = path.join(dataDir, "template.typ");
  return existsSync(custom) ? custom : DEFAULT_TEMPLATE;
}

/**
 * Compiles the template to PDF. The data travels inline through `--input data=<json>`
 * so the template can live anywhere (its own directory is the Typst root).
 */
export function renderPdf(template: string, data: TemplateData, outFile: string): void {
  mkdirSync(path.dirname(outFile), { recursive: true });
  try {
    execFileSync(
      "typst",
      [
        "compile",
        "--root",
        path.dirname(template),
        "--font-path",
        FONTS_DIR,
        "--input",
        `data=${JSON.stringify(data)}`,
        template,
        outFile,
      ],
      { stdio: "inherit" },
    );
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      throw new Error("typst not found on PATH. Install it: https://github.com/typst/typst#installation");
    }
    throw error;
  }
}
