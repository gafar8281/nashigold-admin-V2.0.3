import { z } from "zod"

import { TARGET_UNITS } from "@/lib/constants"

export const branchSalesSchema = z.object({
  branch: z.string().min(1, "Select a branch"),
  monthly_target: z.coerce.number().min(0, "Must be 0 or more"),
  achieved_target: z.coerce.number().min(0, "Must be 0 or more"),
  target_unit: z.enum(TARGET_UNITS, { message: "Select a unit" }),
})

// Numbers are coerced from native number inputs — see employee-schema.ts.
export type BranchSalesFormInput = z.input<typeof branchSalesSchema>
export type BranchSalesFormValues = z.output<typeof branchSalesSchema>
