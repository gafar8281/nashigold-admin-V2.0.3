import type { InventoryItem } from "@/types/inventory"

const collator = new Intl.Collator(undefined, { numeric: true })

export interface BranchTotal {
  branch: string
  units: number
}

/** Units per branch across `items`, largest first (ties by branch code). */
export function branchTotals(items: InventoryItem[]): BranchTotal[] {
  const totals = new Map<string, number>()
  for (const item of items) {
    for (const [branch, count] of Object.entries(item.branches)) {
      totals.set(branch, (totals.get(branch) ?? 0) + count)
    }
  }
  return [...totals.entries()]
    .map(([branch, units]) => ({ branch, units }))
    .sort((a, b) => b.units - a.units || collator.compare(a.branch, b.branch))
}

export interface InventorySummary {
  totalUnits: number
  uniqueItems: number
  branchesWithStock: number
  topBranch: BranchTotal | null
}

/**
 * Headline numbers for the KPI row. With a branch selected, units are that
 * branch's units only — not the full totals of the items it happens to hold.
 */
export function summarize(items: InventoryItem[], branch: string | null): InventorySummary {
  const totals = branchTotals(items).filter((t) => branch === null || t.branch === branch)
  return {
    totalUnits: totals.reduce((sum, t) => sum + t.units, 0),
    uniqueItems: items.length,
    branchesWithStock: totals.length,
    topBranch: totals[0] ?? null,
  }
}
