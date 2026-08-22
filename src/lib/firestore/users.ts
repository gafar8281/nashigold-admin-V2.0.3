import { collection, getDocs, limit, query, where } from "firebase/firestore"

import { db } from "@/lib/firebase"
import { requireDb } from "@/lib/firestore/converters"
import { ROLES } from "@/lib/constants"
import type { AdminUser } from "@/types/user"

const COLLECTION = "nashigold_users"

/**
 * Looks up nashigold_users by email and, only if the password matches and
 * role is a recognized role, returns a safe AdminUser (no password field).
 * Returns null for every failure mode (no match, wrong password, unknown
 * role, secondary_admin with no managedBranches) so callers treat them
 * identically and don't leak which part failed.
 *
 * Matching is case-sensitive (Firestore `==` doesn't fold case) — stored
 * `email` values must be lowercase/trimmed for this to match a normalized
 * input email.
 */
export async function verifyUserCredentials(
  normalizedEmail: string,
  password: string
): Promise<AdminUser | null> {
  const snapshot = await getDocs(
    query(
      collection(requireDb(db), COLLECTION),
      where("email", "==", normalizedEmail),
      limit(1)
    )
  )
  if (snapshot.empty) return null

  const doc = snapshot.docs[0]
  const data = doc.data()
  if (data.password !== password) return null
  if (!ROLES.includes(data.role)) return null

  const email = typeof data.email === "string" ? data.email : normalizedEmail

  if (data.role === "admin") {
    return { id: doc.id, email, role: "admin", managedBranches: null }
  }

  const managedBranches = Array.isArray(data.managedBranches)
    ? Array.from(
        new Set(
          data.managedBranches
            .filter((b: unknown): b is string => typeof b === "string")
            .map((b) => b.trim())
            .filter(Boolean)
        )
      )
    : []

  // A scoped account with no scope can't do anything useful, and letting it
  // through with [] would force every downstream consumer to treat "scoped
  // but empty" as a third state. Fail closed at the door instead.
  if (managedBranches.length === 0) {
    console.warn(
      `nashigold_users/${doc.id} has role "secondary_admin" but no managedBranches — login denied.`
    )
    return null
  }

  return { id: doc.id, email, role: "secondary_admin", managedBranches }
}
