import { parseCsv } from "@/lib/csv"
import type { InventoryItemInput } from "@/types/inventory"

export const REQUIRED_COLUMNS = ["DESCRIPTION", "LOCATION"] as const

export interface InventoryRowError {
  lineNumber: number
  description: string
  location: string
  errors: string[]
}

export interface ParsedInventoryImport {
  items: InventoryItemInput[]
  errorRows: InventoryRowError[]
  headerError: string | null
  counts: { units: number; items: number; errors: number }
}

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" })

/** Trims and collapses internal whitespace so "Gold  Ring " groups with "Gold Ring". */
function normalizeCell(value: string): string {
  return value.replace(/\s+/g, " ").trim()
}

/** Reads an uploaded .csv or .xlsx into a grid of string cells. */
export async function readInventoryFile(file: File): Promise<string[][]> {
  const name = file.name.toLowerCase()
  if (name.endsWith(".csv")) {
    return parseCsv(await file.text())
  }
  if (name.endsWith(".xlsx")) {
    // Loaded on demand so the spreadsheet parser stays out of the main bundle.
    const { readSheet } = await import("read-excel-file/browser")
    const sheet = await readSheet(file)
    return sheet.map((row) =>
      row.map((cell) => {
        if (cell === null || cell === undefined) return ""
        if (cell instanceof Date) return cell.toISOString()
        return String(cell)
      })
    )
  }
  throw new Error("Please select a .csv or .xlsx file.")
}

/**
 * Validates and aggregates an inventory grid. Pure — no Firestore access.
 * Each data row is one unit. DESCRIPTION is grouped case-insensitively (the
 * first casing seen is kept for display); LOCATION must match a known
 * branch code case-insensitively and is stored under its canonical code.
 */
export function parseInventoryImport(
  grid: string[][],
  branchCodes: string[]
): ParsedInventoryImport {
  const emptyCounts = { units: 0, items: 0, errors: 0 }
  const empty = { items: [], errorRows: [], counts: emptyCounts }

  const headerIndex = grid.findIndex((row) => row.some((cell) => cell.trim() !== ""))
  if (headerIndex === -1) {
    return { ...empty, headerError: "File is empty." }
  }

  const columnIndex = new Map<string, number>()
  grid[headerIndex].forEach((label, index) => {
    const key = normalizeCell(label).toUpperCase()
    if (key !== "" && !columnIndex.has(key)) columnIndex.set(key, index)
  })
  const missing = REQUIRED_COLUMNS.filter((column) => !columnIndex.has(column))
  if (missing.length > 0) {
    return { ...empty, headerError: `Missing required column(s): ${missing.join(", ")}` }
  }

  const descriptionIndex = columnIndex.get("DESCRIPTION")!
  const locationIndex = columnIndex.get("LOCATION")!
  const branchByKey = new Map(branchCodes.map((code) => [code.toLowerCase(), code]))

  const groups = new Map<string, InventoryItemInput>()
  const errorRows: InventoryRowError[] = []
  let units = 0

  for (let i = headerIndex + 1; i < grid.length; i++) {
    const row = grid[i]
    const description = normalizeCell(row[descriptionIndex] ?? "")
    const location = normalizeCell(row[locationIndex] ?? "")
    if (description === "" && location === "") continue

    const errors: string[] = []
    if (description === "") errors.push("Missing description")
    let branch: string | undefined
    if (location === "") {
      errors.push("Missing location")
    } else {
      branch = branchByKey.get(location.toLowerCase())
      if (!branch) errors.push(`Unknown branch "${location}"`)
    }

    if (errors.length > 0 || !branch) {
      errorRows.push({ lineNumber: i + 1, description, location, errors })
      continue
    }

    const key = description.toLowerCase()
    let item = groups.get(key)
    if (!item) {
      item = { description, totalCount: 0, branches: {} }
      groups.set(key, item)
    }
    item.totalCount++
    item.branches[branch] = (item.branches[branch] ?? 0) + 1
    units++
  }

  const items = [...groups.values()].sort((a, b) => collator.compare(a.description, b.description))

  return {
    items,
    errorRows,
    headerError: null,
    counts: { units, items: items.length, errors: errorRows.length },
  }
}
