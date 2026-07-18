export function toCsv(
  rows: Record<string, unknown>[],
  columns: { key: string; label: string }[]
): string {
  const escape = (value: unknown) => {
    const str =
      value === null || value === undefined
        ? ""
        : value instanceof Date
          ? value.toISOString()
          : String(value);
    if (/[",\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const header = columns.map((c) => escape(c.label)).join(",");
  const body = rows
    .map((row) => columns.map((c) => escape(row[c.key])).join(","))
    .join("\n");

  return `${header}\n${body}`;
}

export function csvResponse(filename: string, csv: string) {
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
