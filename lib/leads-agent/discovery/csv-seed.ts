import { toRegistrableDomain } from "@/lib/leads-agent/domain";
import type { DiscoveredCandidate, DiscoverySource } from "./types";

/** Minimal RFC4180-ish CSV line parser — handles quoted fields with commas, no external dependency. */
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      fields.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields.map((f) => f.trim());
}

/**
 * Parses an uploaded CSV seed into candidates. Not wired to the
 * DiscoverySource.discover(city, sector) shape below — a CSV upload is raw
 * content the run UI (Phase 6) hands directly to this function, not a
 * city/sector search — so this is the real entry point future callers use.
 */
export function parseCsvSeedRows(csvText: string, sector: string): DiscoveredCandidate[] {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];

  const header = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
  const nameIdx = header.indexOf("name") !== -1 ? header.indexOf("name") : header.indexOf("naam");
  const websiteIdx = header.indexOf("website");
  const cityIdx = header.indexOf("city") !== -1 ? header.indexOf("city") : header.indexOf("plaats");
  const phoneIdx = header.indexOf("phone") !== -1 ? header.indexOf("phone") : header.indexOf("telefoon");

  if (nameIdx === -1 && websiteIdx === -1) {
    throw new Error("CSV mist een verplichte 'name'/'naam' of 'website' kolom.");
  }

  const capturedAt = new Date().toISOString();
  const candidates: DiscoveredCandidate[] = [];

  for (const line of lines.slice(1)) {
    const cols = parseCsvLine(line);
    const name = nameIdx !== -1 ? cols[nameIdx] : undefined;
    const website = websiteIdx !== -1 ? cols[websiteIdx] : undefined;
    if (!name && !website) continue; // spec minimum: name OR website

    candidates.push({
      companyName: name || toRegistrableDomain(website!) || website!,
      website,
      registrableDomain: website ? (toRegistrableDomain(website) ?? undefined) : undefined,
      city: cityIdx !== -1 ? cols[cityIdx] : undefined,
      phone: phoneIdx !== -1 ? cols[phoneIdx] : undefined,
      sector,
      sourceUrl: "csv-upload",
      sourceMethod: "csv_seed",
      capturedAt,
      raw: { csvRow: cols },
    });
  }
  return candidates;
}

export const csvSeedSource: DiscoverySource = {
  key: "csv_seed",
  label: "CSV upload",
  isEnabled: () => true,
  // No-op here — CSV seeding is driven by an upload, not a city/sector
  // query, so there's nothing for the standard discover() shape to do.
  // Real entry point is parseCsvSeedRows() above.
  async discover(): Promise<DiscoveredCandidate[]> {
    return [];
  },
};
