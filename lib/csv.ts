/** Minimal RFC-4180-ish CSV serializer — good enough for an admin export. */
export function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return ''

  const headers = Object.keys(rows[0])
  const escape = (value: unknown): string => {
    if (value === null || value === undefined) return ''
    const str =
      value instanceof Date
        ? value.toISOString()
        : typeof value === 'object'
          ? JSON.stringify(value)
          : String(value)
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str
  }

  const lines = [headers.join(',')]
  for (const row of rows) {
    lines.push(headers.map((h) => escape(row[h])).join(','))
  }
  return lines.join('\n')
}
