import { createContext } from "react"

import type { Role } from "@/lib/constants"

export interface AuthContextValue {
  isAuthenticated: boolean
  email: string | null
  role: Role | null
  /** Branch codes the current user may see, or `null` for unrestricted/logged out. */
  managedBranches: string[] | null
  isReady: boolean
  login: (
    email: string,
    password: string
  ) => Promise<{ ok: boolean; error?: string }>
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
