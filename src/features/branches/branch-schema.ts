import { z } from "zod"

function optionalCoordinate(min: number, max: number, label: string) {
  return z
    .string()
    .trim()
    .optional()
    .transform((val) => (val === undefined || val === "" ? undefined : val))
    .refine((val) => val === undefined || /^-?\d+(\.\d+)?$/.test(val), {
      message: `${label} must be a decimal number`,
    })
    .transform((val) => (val === undefined ? undefined : Number(val)))
    .refine((val) => val === undefined || (val >= min && val <= max), {
      message: `${label} must be between ${min} and ${max}`,
    })
}

export const branchSchema = z.object({
  id: z
    .string()
    .trim()
    .toUpperCase()
    .min(1, "Branch code is required")
    .max(50, "Branch code is too long")
    .regex(/^[A-Z0-9-]+$/, "Use letters, numbers, and hyphens only"),
  address: z.string().trim().optional(),
  latitude: optionalCoordinate(-90, 90, "Latitude"),
  longitude: optionalCoordinate(-180, 180, "Longitude"),
})

export type BranchFormInput = z.input<typeof branchSchema>
export type BranchFormValues = z.output<typeof branchSchema>
