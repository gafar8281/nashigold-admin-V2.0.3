import { z } from "zod"

import { JOB_TITLES, TARGET_UNITS } from "@/lib/constants"

export const employeeSchema = z.object({
  id: z
    .string()
    .min(1, "Employee id is required")
    .regex(/^\d+$/, "Employee id must be numeric"),
  name: z.string().min(1, "Name is required"),
  job_title: z.enum(JOB_TITLES, { message: "Select a job title" }),
  branch: z.string().min(1, "Select a branch"),
  monthly_target: z.coerce.number().min(0, "Must be 0 or more"),
  target_unit: z.enum(TARGET_UNITS, { message: "Select a unit" }),
  target_achieved: z.coerce.number().min(0, "Must be 0 or more"),
  email: z
    .email({ message: "Enter a valid email" })
    .optional()
    .or(z.literal("")),
  contact: z.string().optional(),
  // Empty on edit means "leave unchanged"; required when creating (enforced in the form).
  password: z.string(),
})

// monthly_target/target_achieved are coerced from string input (native
// number inputs) to number output — react-hook-form's resolver needs the
// input and output shapes kept distinct so the form's field types (input)
// don't collide with the submitted values' types (output).
export type EmployeeFormInput = z.input<typeof employeeSchema>
export type EmployeeFormValues = z.output<typeof employeeSchema>
