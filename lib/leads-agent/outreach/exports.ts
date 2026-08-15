export interface PackExportRow {
  leadId: string;
  company: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  sector: string | null;
  totalScore: number | null;
  priority: string | null;
  email1: string;
  email2: string;
  email3: string;
  dmDraft: string;
}

function escapeCsvField(value: unknown): string {
  const str = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

function toCsvBody(rows: Record<string, unknown>[], columns: { key: string; label: string }[]): string {
  const header = columns.map((c) => escapeCsvField(c.label)).join(",");
  const body = rows.map((row) => columns.map((c) => escapeCsvField(row[c.key])).join(",")).join("\n");
  return `${header}\n${body}`;
}

const UTF8_BOM = "﻿";

/** §8: "CSV UTF-8 with BOM" — Excel otherwise mangles Dutch characters (Definition of Done #13). */
export function toOutreachCsv(rows: PackExportRow[]): string {
  const csv = toCsvBody(rows as unknown as Record<string, unknown>[], [
    { key: "company", label: "Bedrijf" },
    { key: "email", label: "E-mail" },
    { key: "phone", label: "Telefoon" },
    { key: "city", label: "Plaats" },
    { key: "sector", label: "Sector" },
    { key: "totalScore", label: "Score" },
    { key: "priority", label: "Prioriteit" },
    { key: "email1", label: "E-mail 1" },
    { key: "email2", label: "E-mail 2" },
    { key: "email3", label: "E-mail 3" },
    { key: "dmDraft", label: "DM-concept" },
  ]);
  return UTF8_BOM + csv;
}

export function toOutreachJson(rows: PackExportRow[]): string {
  return JSON.stringify(rows, null, 2);
}

/**
 * ASSUMPTION: an approximation of a typical Instantly/Smartlead lead-import
 * shape (email + company + a single personalization field), not verified
 * against either product's current live schema — both are third-party
 * tools outside this codebase. Reasonable starting shape; confirm against
 * the actual target tool's current CSV template before a real campaign
 * import.
 */
export function toInstantlyCsv(rows: PackExportRow[]): string {
  const mapped = rows
    .filter((r) => r.email)
    .map((r) => ({
      email: r.email,
      company_name: r.company,
      city: r.city ?? "",
      personalization: r.email1,
    }));
  const csv = toCsvBody(mapped, [
    { key: "email", label: "email" },
    { key: "company_name", label: "company_name" },
    { key: "city", label: "city" },
    { key: "personalization", label: "personalization" },
  ]);
  return UTF8_BOM + csv;
}
