import { TARGET_UNITS, type TargetUnit } from "@/lib/constants"
import { getRiyadhTodayISO } from "@/lib/datetime"
import { parseCsv } from "@/lib/csv"
import type { Employee } from "@/types/employee"

export const HEADER = [
  "Branch",
  "ID",
  "Name",
  "Job Title",
  "Monthly Target",
  "Unit",
  "Target Achieved",
]

/** Employees whose branch reference is missing — Firestore enforces no integrity. */
const UNASSIGNED = "Unassigned"

const collator = new Intl.Collator(undefined, { numeric: true })

/** Firestore values are untyped; a non-numeric target must not poison a total. */
function toNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0
}

/**
 * Builds the CSV grid: employees grouped by branch, each group followed by one
 * total row per target unit present in it. SAR and Grams are never summed
 * together — a mixed branch gets two total rows.
 */
export function buildEmployeeCsvRows(employees: Employee[]): (string | number)[][] {
  const groups = new Map<string, Employee[]>()
  for (const employee of employees) {
    const branch = employee.branch?.trim() || UNASSIGNED
    const group = groups.get(branch)
    if (group) group.push(employee)
    else groups.set(branch, [employee])
  }

  const branches = [...groups.keys()].sort((a, b) => {
    if (a === UNASSIGNED) return 1
    if (b === UNASSIGNED) return -1
    return collator.compare(a, b)
  })

  const rows: (string | number)[][] = [HEADER]

  branches.forEach((branch, index) => {
    if (index > 0) rows.push([])

    const members = [...groups.get(branch)!].sort((a, b) => collator.compare(a.id, b.id))
    const totals = new Map<TargetUnit, { target: number; achieved: number }>()

    for (const employee of members) {
      const target = toNumber(employee.monthly_target)
      const achieved = toNumber(employee.target_achieved)
      rows.push([
        branch,
        employee.id,
        employee.name,
        employee.job_title,
        target,
        employee.target_unit,
        achieved,
      ])

      const total = totals.get(employee.target_unit) ?? { target: 0, achieved: 0 }
      total.target += target
      total.achieved += achieved
      totals.set(employee.target_unit, total)
    }

    // TARGET_UNITS order keeps the total rows deterministic across exports.
    for (const unit of TARGET_UNITS) {
      const total = totals.get(unit)
      if (!total) continue
      rows.push([branch, "", `Total (${unit})`, "", total.target, unit, total.achieved])
    }
  })

  return rows
}

export function employeeCsvFilename(): string {
  return `employees-${getRiyadhTodayISO()}.csv`
}

export type ImportRowStatus = "ok" | "unchanged" | "error"

export interface ParsedImportRow {
  lineNumber: number
  branch: string
  id: string
  /** Reference/matching only — never written. */
  name: string
  /** Reference/matching only — never written. */
  jobTitle: string
  monthlyTarget: number | null
  targetUnit: TargetUnit | null
  targetAchieved: number | null
  status: ImportRowStatus
  errors: string[]
  employee?: Employee
}

export interface ParsedImport {
  rows: ParsedImportRow[]
  headerError: string | null
  counts: { ok: number; unchanged: number; error: number }
}

const ARABIC_INDIC_DIGITS = "٠١٢٣٤٥٦٧٨٩"

/** Accepts thousands separators and Arabic-Indic digits, since exported
 * files are commonly hand-edited in Excel before being re-imported. */
function parseNumericField(raw: string): number | null {
  const normalized = raw.replace(/[٠-٩]/g, (d) => String(ARABIC_INDIC_DIGITS.indexOf(d)))
  const cleaned = normalized.replace(/[,\s]/g, "")
  if (cleaned === "") return null
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

function normalizeUnit(raw: string): TargetUnit | null {
  const trimmed = raw.trim().toLowerCase()
  return TARGET_UNITS.find((unit) => unit.toLowerCase() === trimmed) ?? null
}

/**
 * Parses an import file against the current (already branch-scoped)
 * employee list. Pure — no Firestore access. Blank lines and the export's
 * own per-branch "Total (...)" rows are dropped silently so the app's own
 * Export CSV output is directly re-importable.
 */
export function parseEmployeeImport(text: string, employees: Employee[]): ParsedImport {
  const emptyCounts = { ok: 0, unchanged: 0, error: 0 }
  const grid = parseCsv(text)
  if (grid.length === 0) {
    return { rows: [], headerError: "File is empty.", counts: emptyCounts }
  }

  const columnIndex = new Map<string, number>()
  grid[0].forEach((label, index) => {
    columnIndex.set(label.trim().toLowerCase(), index)
  })

  const requiredKeys = HEADER.map((h) => h.toLowerCase())
  const missing = requiredKeys.filter((key) => !columnIndex.has(key))
  if (missing.length > 0) {
    return {
      rows: [],
      headerError: `Missing required column(s): ${missing
        .map((key) => HEADER[requiredKeys.indexOf(key)])
        .join(", ")}`,
      counts: emptyCounts,
    }
  }

  const cellFor = (row: string[], key: string): string => {
    const index = columnIndex.get(key)!
    return (row[index] ?? "").trim()
  }

  const employeesById = new Map(employees.map((e) => [e.id, e]))
  const rows: ParsedImportRow[] = []
  const lastSeenAt = new Map<string, number>()

  for (let i = 1; i < grid.length; i++) {
    const row = grid[i]
    if (row.every((c) => c.trim() === "")) continue

    const branch = cellFor(row, "branch")
    const id = cellFor(row, "id")
    const name = cellFor(row, "name")
    const jobTitle = cellFor(row, "job title")
    const monthlyTargetRaw = cellFor(row, "monthly target")
    const unitRaw = cellFor(row, "unit")
    const targetAchievedRaw = cellFor(row, "target achieved")

    // The export's own per-branch total row: no ID, name "Total (Unit)".
    if (id === "" && /^total\s*\(/i.test(name)) continue

    const errors: string[] = []
    let employee: Employee | undefined

    if (id === "") {
      errors.push("Missing ID")
    } else {
      employee = employeesById.get(id)
      if (!employee) {
        errors.push("No employee with this ID")
      } else if (branch !== "" && branch !== employee.branch) {
        errors.push(`Branch mismatch — stored branch is ${employee.branch}`)
      }
    }

    const monthlyTarget = monthlyTargetRaw === "" ? null : parseNumericField(monthlyTargetRaw)
    if (monthlyTarget === null) errors.push("Monthly target must be a number")
    else if (monthlyTarget < 0) errors.push("Monthly target must be 0 or more")

    const targetAchieved = targetAchievedRaw === "" ? null : parseNumericField(targetAchievedRaw)
    if (targetAchieved === null) errors.push("Target achieved must be a number")
    else if (targetAchieved < 0) errors.push("Target achieved must be 0 or more")

    const targetUnit = unitRaw === "" ? null : normalizeUnit(unitRaw)
    if (targetUnit === null) errors.push(`Unit must be one of ${TARGET_UNITS.join(", ")}`)

    if (id !== "" && employee) {
      const previousIndex = lastSeenAt.get(id)
      if (previousIndex !== undefined) {
        const previous = rows[previousIndex]
        previous.status = "error"
        if (!previous.errors.includes("Duplicate ID — a later row overrides this one")) {
          previous.errors.push("Duplicate ID — a later row overrides this one")
        }
      }
      lastSeenAt.set(id, rows.length)
    }

    const status: ImportRowStatus =
      errors.length > 0
        ? "error"
        : employee &&
            monthlyTarget === employee.monthly_target &&
            targetUnit === employee.target_unit &&
            targetAchieved === employee.target_achieved
          ? "unchanged"
          : "ok"

    rows.push({
      lineNumber: i + 1,
      branch,
      id,
      name,
      jobTitle,
      monthlyTarget,
      targetUnit,
      targetAchieved,
      status,
      errors,
      employee,
    })
  }

  const counts = rows.reduce(
    (acc, row) => {
      acc[row.status]++
      return acc
    },
    { ok: 0, unchanged: 0, error: 0 }
  )

  return { rows, headerError: null, counts }
}
