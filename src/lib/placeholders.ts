export type Vars = Readonly<Record<string, string | number>>;

const PLACEHOLDER = /\{([^{}]*)\}/g;

/**
 * Replaces `{name}` placeholders with `vars[name]`. Any placeholder not in `vars`
 * throws, so no raw `{...}` ever reaches the PDF or the email.
 */
export function fillPlaceholders(text: string, vars: Vars, where = "text"): string {
  return text.replace(PLACEHOLDER, (match, name: string) => {
    const value = vars[name];
    if (value === undefined) {
      const allowed = Object.keys(vars).map((k) => `{${k}}`).join(", ");
      throw new Error(`Unknown placeholder ${match} in ${where}. Allowed: ${allowed}`);
    }
    return String(value);
  });
}
