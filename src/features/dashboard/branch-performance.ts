import type { TargetUnit } from "@/lib/constants"
import type { BranchSales } from "@/types/branch-sales"
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

// Sums employee monthly_target/target_achieved plus each branch's online sales
// monthly_target/achieved_target per branch, split by target_unit, rather than
// converting between grams and SAR — there's no gold-price source in this app,
// and the two units represent different populations. Callers pick one unit via
// toChartData() rather than combining them.
export function computeBranchPerformance(
  employees: Employee[],
  onlineSales: BranchSales[]
): BranchPerformance[] {
  const byBranch = new Map<
    string,
    { targetGrams: number; achievedGrams: number; targetSAR: number; achievedSAR: number }
  >()

  function add(branch: string, unit: TargetUnit, target: number, achieved: number) {
    if (unit !== "SAR" && unit !== "Grams") return

    const entry = byBranch.get(branch) ?? {
      targetGrams: 0,
      achievedGrams: 0,
      targetSAR: 0,
      achievedSAR: 0,
    }

    if (unit === "Grams") {
      entry.targetGrams += target
      entry.achievedGrams += achieved
    } else {
      entry.targetSAR += target
      entry.achievedSAR += achieved
    }

    byBranch.set(branch, entry)
  }

  for (const employee of employees) {
    add(employee.branch, employee.target_unit, employee.monthly_target, employee.target_achieved)
  }
  for (const record of onlineSales) {
    add(record.branch, record.target_unit, record.monthly_target, record.achieved_target)
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
