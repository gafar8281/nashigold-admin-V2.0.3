import type { Role } from "@/lib/constants"
import type { SecondaryAdminPermissions } from "@/types/permissions"

export interface AdminUser {
  id: string
  email: string
  role: Role
  /** Branch codes this user may see, or `null` for unrestricted (admin). */
  managedBranches: string[] | null
  /** Per-module toggles for `secondary_admin`, or `null` for unrestricted (admin). */
  permissions: SecondaryAdminPermissions | null
}
