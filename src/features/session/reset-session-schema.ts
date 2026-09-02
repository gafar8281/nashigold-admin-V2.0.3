import { z } from "zod"

export const resetSessionSchema = z.object({
  employeeId: z
    .string()
    .trim()
    .min(1, "Employee ID is required")
    .max(50, "Employee ID is too long")
    .regex(/^[A-Za-z0-9_-]+$/, "Use letters, numbers, hyphens and underscores only"),
})

export type ResetSessionFormInput = z.input<typeof resetSessionSchema>
export type ResetSessionFormValues = z.output<typeof resetSessionSchema>
