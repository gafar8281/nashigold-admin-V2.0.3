import type { TargetUnit } from "@/lib/constants"

export interface BranchSales {
  branch: string // branch code, == doc id
  monthly_target: number
  achieved_target: number
  target_unit: TargetUnit
  updatedAtMs?: number
}

export type BranchSalesWriteValues = Omit<BranchSales, "updatedAtMs">
