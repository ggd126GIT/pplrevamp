/**
 * CSV export for `/admin/applications`.
 *
 * Pure, so it is testable: the route handler does the querying and signing, and
 * everything about the file's *shape* lives here.
 *
 * Deliberately excludes the internal fields — status note, blacklist and
 * duplicate flags. The export is meant to be handed to another system or another
 * person, and candid internal remarks about named individuals should not travel
 * in a file that can be forwarded.
 */
import { toDateInput } from "@/lib/dates";
import type { ApplicationStatus } from "@/lib/applicationStatus";

export type ExportRow = {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  job_title: string | null;
  created_at: string | null;
  status: string | null;
  cv_link: string | null;
};

export const EXPORT_HEADERS = [
  "First name",
  "Last name",
  "Email",
  "Phone",
  "Role",
  "Applied",
  "Status",
  "CV link",
] as const;

/**
 * Neutralise spreadsheet formula injection.
 *
 * Every name, email and phone in this file was typed by an anonymous member of
 * the public into the careers form. A value beginning `=`, `@`, or a control
 * character is executable when the CSV is opened in Excel or Sheets, so it is
 * prefixed with an apostrophe to force text.
 *
 * `+` and `-` are only dangerous when NOT followed by a digit: `+639171234567`
 * is a phone number and must survive untouched, while `+cmd|…` is an attack.
 * Guarding both unconditionally would put a visible apostrophe in front of every
 * international phone number in the file.
 */
export function neutralizeFormula(value: string): string {
  if (!value) return value;
  const first = value[0];
  if (first === "=" || first === "@" || first === "\t" || first === "\r") {
    return `'${value}`;
  }
  if ((first === "+" || first === "-") && !/^[+-][\d.]/.test(value)) {
    return `'${value}`;
  }
  return value;
}

/**
 * One CSV cell: formula-guarded, then quoted if it contains anything that would
 * otherwise break the row. Embedded quotes are doubled, per RFC 4180.
 */
export function csvCell(value: string | null | undefined): string {
  const raw = neutralizeFormula(String(value ?? ""));
  return /[",\r\n]|^\s|\s$/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw;
}

/**
 * The whole file.
 *
 * CRLF line endings and a leading UTF-8 BOM, both for Excel: without the BOM it
 * reads the file as the system codepage and mangles any non-ASCII name — the
 * same class of bug as the header mojibake fixed earlier on this project.
 */
export function toCsv(rows: ExportRow[]): string {
  const lines = [
    EXPORT_HEADERS.join(","),
    ...rows.map((r) =>
      [
        csvCell(r.first_name),
        csvCell(r.last_name),
        csvCell(r.email),
        csvCell(r.phone),
        csvCell(r.job_title),
        csvCell(toDateInput(r.created_at)),
        csvCell(r.status),
        csvCell(r.cv_link),
      ].join(","),
    ),
  ];
  return `﻿${lines.join("\r\n")}\r\n`;
}

/**
 * Filename for the download. Carries the filter so two exports taken the same
 * day for different statuses do not overwrite each other in the Downloads
 * folder.
 */
export function exportFilename(
  status: ApplicationStatus | null,
  now: Date = new Date(),
): string {
  const date = toDateInput(now.toISOString());
  return status
    ? `applications-${status}-${date}.csv`
    : `applications-${date}.csv`;
}
