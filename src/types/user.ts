import type { Role } from "@/lib/constants"

export interface AdminUser {
  id: string
  email: string
  role: Role
  /** Branch codes this user may see, or `null` for unrestricted (admin). */
  managedBranches: string[] | null
}
