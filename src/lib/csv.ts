/**
 * Minimal CSV helpers. Kept dependency-free — the app's only CSV needs are
 * exporting a table the user is already looking at, and re-importing a file
 * shaped like that export.
 */

/** Wraps a field in quotes only when the value would otherwise break parsing. */
function escapeField(value: string | number): string {
  const str = String(value)
  if (/[",\r\n]/.test(str) || str !== str.trim()) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/** Serialises a grid of cells to CSV text, using CRLF line endings for Excel. */
export function toCsvContent(rows: (string | number)[][]): string {
  return rows.map((row) => row.map(escapeField).join(",")).join("\r\n")
}

/**
 * Triggers a browser download of `content` as a UTF-8 CSV file.
 * The leading BOM is what makes Excel render Arabic names correctly.
 */
export function downloadCsv(filename: string, content: string): void {
  const blob = new Blob([`\uFEFF${content}`], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  try {
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
  } finally {
    URL.revokeObjectURL(url)
  }
}

/**
 * Parses CSV/TSV text into a grid of cells. Handles a leading BOM (written by
 * downloadCsv, so a round-tripped export parses cleanly), RFC-4180 quoting
 * (`""` escapes, delimiters/newlines inside quotes), and CRLF/LF line endings.
 * Delimiter is auto-detected from the header line: tab wins if the header has
 * more tabs than commas, otherwise comma.
 */
export function parseCsv(text: string): string[][] {
  const stripped = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
  if (stripped.trim() === "") return []

  const headerLine = stripped.slice(0, stripped.search(/\r\n|\r|\n/) + 1 || stripped.length)
  const tabCount = (headerLine.match(/\t/g) ?? []).length
  const commaCount = (headerLine.match(/,/g) ?? []).length
  const delimiter = tabCount > commaCount ? "\t" : ","

  const rows: string[][] = []
  let row: string[] = []
  let field = ""
  let inQuotes = false
  let i = 0

  while (i < stripped.length) {
    const char = stripped[i]

    if (inQuotes) {
      if (char === '"') {
        if (stripped[i + 1] === '"') {
          field += '"'
          i += 2
          continue
        }
        inQuotes = false
        i++
        continue
      }
      field += char
      i++
      continue
    }

    if (char === '"') {
      inQuotes = true
      i++
      continue
    }
    if (char === delimiter) {
      row.push(field)
      field = ""
      i++
      continue
    }
    if (char === "\r" || char === "\n") {
      row.push(field)
      rows.push(row)
      field = ""
      row = []
      if (char === "\r" && stripped[i + 1] === "\n") i++
      i++
      continue
    }
    field += char
    i++
  }

  if (field !== "" || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  return rows
}
