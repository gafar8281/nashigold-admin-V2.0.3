import type { TargetUnit } from "@/lib/constants"
import type { Employee } from "@/types/employee"

export interface BranchPerformance {
  branch: string
  targetGrams: number
  achievedGrams: number
  targetSAR: number
  achievedSAR: number
}

export interface BranchChartDatum {
  branch: string
  target: number
  achieved: number
}

// Sums monthly_target/target_achieved per branch, split by target_unit, rather
// than converting between grams and SAR — there's no gold-price source in this
// app, and the two units represent different employee populations. Callers
// pick one unit via toChartData() rather than combining them.
export function computeBranchPerformance(employees: Employee[]): BranchPerformance[] {
  const byBranch = new Map<
    string,
    { targetGrams: number; achievedGrams: number; targetSAR: number; achievedSAR: number }
  >()

  for (const employee of employees) {
    if (employee.target_unit !== "SAR" && employee.target_unit !== "Grams") continue

    const entry = byBranch.get(employee.branch) ?? {
      targetGrams: 0,
      achievedGrams: 0,
      targetSAR: 0,
      achievedSAR: 0,
    }

    if (employee.target_unit === "Grams") {
      entry.targetGrams += employee.monthly_target
      entry.achievedGrams += employee.target_achieved
    } else {
      entry.targetSAR += employee.monthly_target
      entry.achievedSAR += employee.target_achieved
    }

    byBranch.set(employee.branch, entry)
  }

  return Array.from(byBranch.entries())
    .map(([branch, totals]) => ({ branch, ...totals }))
    .sort((a, b) => a.branch.localeCompare(b.branch))
}

// Projects the selected unit's totals into chart-ready { branch, target, achieved }
// and drops branches with nothing in that unit, rather than rendering a zero bar
// that would misleadingly read as "missed target".
export function toChartData(rows: BranchPerformance[], unit: TargetUnit): BranchChartDatum[] {
  return rows
    .map((row) =>
      unit === "Grams"
        ? { branch: row.branch, target: row.targetGrams, achieved: row.achievedGrams }
        : { branch: row.branch, target: row.targetSAR, achieved: row.achievedSAR }
    )
    .filter((row) => row.target !== 0 || row.achieved !== 0)
}
