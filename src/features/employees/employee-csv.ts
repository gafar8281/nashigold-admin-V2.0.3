import { TARGET_UNITS, type TargetUnit } from "@/lib/constants"
import { getRiyadhTodayISO } from "@/lib/datetime"
import type { Employee } from "@/types/employee"

const HEADER = [
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
