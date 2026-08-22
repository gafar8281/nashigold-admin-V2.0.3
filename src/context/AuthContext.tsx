import { useEffect, useState, type ReactNode } from "react"

import { ensureAnonymousSession } from "@/lib/firebase"
import { verifyUserCredentials } from "@/lib/firestore/users"
import { AuthContext, type AuthContextValue } from "@/context/auth-context-value"
import { ROLES, type Role } from "@/lib/constants"
import type { AdminUser } from "@/types/user"

const SESSION_KEY = "nashigold-admin-session"

interface Session {
  email: string
  role: Role
  managedBranches: string[] | null
}

function readSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (typeof parsed?.email !== "string") return null
    if (!ROLES.includes(parsed.role)) return null

    // Sessions written before secondary_admin existed are { email,
    // role: "admin" } with no managedBranches. Admin is unrestricted
    // regardless of what's stored, so these stay valid — no forced logout
    // for existing admins.
    if (parsed.role === "admin") {
      return { email: parsed.email, role: "admin", managedBranches: null }
    }

    const branches = Array.isArray(parsed.managedBranches)
      ? parsed.managedBranches.filter(
          (b: unknown): b is string => typeof b === "string" && b.length > 0
        )
      : []
    // Fail closed: a scoped session with no scope is unusable and dangerous.
    if (branches.length === 0) return null
    return { email: parsed.email, role: "secondary_admin", managedBranches: branches }
  } catch {
    return null
  }
}

/**
 * Credentials are validated against the nashigold_users Firestore
 * collection (see src/lib/firestore/users.ts). This is a client-side gate
 * only — it does not by itself protect Firestore data. See
 * ensureAnonymousSession in src/lib/firebase.ts for the (limited) baseline
 * this pairs with.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    void ensureAnonymousSession()
    const existing = readSession()
    if (existing) setSession(existing)
    setIsReady(true)
  }, [])

  async function login(emailInput: string, password: string) {
    const normalizedEmail = emailInput.trim().toLowerCase()

    await ensureAnonymousSession()

    let user: AdminUser | null
    try {
      user = await verifyUserCredentials(normalizedEmail, password)
    } catch (error) {
      console.error("Login lookup failed:", error)
      return { ok: false, error: "Unable to sign in right now. Please try again." }
    }

    if (!user) {
      return { ok: false, error: "Invalid email or password." }
    }

    const nextSession: Session = {
      email: user.email,
      role: user.role,
      managedBranches: user.managedBranches,
    }
    localStorage.setItem(SESSION_KEY, JSON.stringify(nextSession))
    setSession(nextSession)
    return { ok: true }
  }

  function logout() {
    localStorage.removeItem(SESSION_KEY)
    setSession(null)
  }

  const value: AuthContextValue = {
    isAuthenticated: session !== null,
    email: session?.email ?? null,
    role: session?.role ?? null,
    managedBranches: session?.managedBranches ?? null,
    isReady,
    login,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
