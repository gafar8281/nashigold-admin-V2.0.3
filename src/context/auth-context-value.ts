import { createContext } from "react"

import type { Role } from "@/lib/constants"
import type { SecondaryAdminPermissions } from "@/types/permissions"

export interface AuthContextValue {
  isAuthenticated: boolean
  email: string | null
  role: Role | null
  /** Branch codes the current user may see, or `null` for unrestricted/logged out. */
  managedBranches: string[] | null
  /** Per-module toggles for the current user, or `null` for unrestricted/logged out. */
  permissions: SecondaryAdminPermissions | null
  isReady: boolean
  login: (
    email: string,
    password: string
  ) => Promise<{ ok: boolean; error?: string }>
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
