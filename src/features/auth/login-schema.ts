import { z } from "zod"

export const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email({ message: "Enter a valid email" }),
  password: z.string().min(1, "Password is required"),
})

export type LoginValues = z.infer<typeof loginSchema>
