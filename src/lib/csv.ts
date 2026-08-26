/**
 * Minimal CSV helpers. Kept dependency-free — the only CSV need in the app is
 * exporting a table the user is already looking at.
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
