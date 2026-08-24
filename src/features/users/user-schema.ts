import { z } from "zod"

import { MAX_BRANCH_IN_VALUES } from "@/lib/permissions"

export const userSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Enter a valid email")
    .transform((val) => val.toLowerCase()),
  // Empty on edit means leave unchanged — required-on-create is enforced
  // in the dialog's onSubmit, same as EmployeeFormDialog.
  password: z.string(),
  managedBranches: z
    .array(z.string())
    .min(1, "Select at least one branch.")
    .max(MAX_BRANCH_IN_VALUES, `Cannot select more than ${MAX_BRANCH_IN_VALUES} branches.`),
  permissions: z.object({
    employees: z.object({
      add: z.boolean(),
      edit: z.boolean(),
      delete: z.boolean(),
    }),
    leaveRequests: z.object({
      enabled: z.boolean(),
    }),
    announcements: z.object({
      add: z.boolean(),
      edit: z.boolean(),
      delete: z.boolean(),
    }),
  }),
})

export type UserFormInput = z.input<typeof userSchema>
export type UserFormValues = z.output<typeof userSchema>
