import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  updateDoc,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore"

import { db } from "@/lib/firebase"
import { requireDb } from "@/lib/firestore/converters"
import { ROLES } from "@/lib/constants"
import { normalizePermissions } from "@/lib/permissions"
import type { AdminUser } from "@/types/user"
import type { SecondaryAdminPermissions } from "@/types/permissions"

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
    return { id: doc.id, email, role: "admin", managedBranches: null, permissions: null }
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

  return {
    id: doc.id,
    email,
    role: "secondary_admin",
    managedBranches,
    permissions: normalizePermissions(data.permissions),
  }
}

/**
 * Re-reads a previously authenticated user by id, so a live session can
 * pick up role/branch/permission changes an admin makes elsewhere without
 * forcing a logout. Returns null if the document is gone or no longer a
 * recognized role — callers should treat that as "log this session out".
 */
export async function getUserById(id: string): Promise<AdminUser | null> {
  const snapshot = await getDoc(doc(requireDb(db), COLLECTION, id))
  if (!snapshot.exists()) return null
  const data = snapshot.data()
  if (!ROLES.includes(data.role)) return null

  const email = typeof data.email === "string" ? data.email : ""

  if (data.role === "admin") {
    return { id: snapshot.id, email, role: "admin", managedBranches: null, permissions: null }
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
  if (managedBranches.length === 0) return null

  return {
    id: snapshot.id,
    email,
    role: "secondary_admin",
    managedBranches,
    permissions: normalizePermissions(data.permissions),
  }
}

// Deliberately does not spread raw Firestore data — the `password` field
// must never reach a UI-bound object. Mirrors toEmployee's convention.
function toSecondaryAdmin(snapshot: QueryDocumentSnapshot<DocumentData>): AdminUser {
  const data = snapshot.data()
  const managedBranches = Array.isArray(data.managedBranches)
    ? data.managedBranches.filter((b: unknown): b is string => typeof b === "string")
    : []
  return {
    id: snapshot.id,
    email: data.email ?? "",
    role: "secondary_admin",
    managedBranches,
    permissions: normalizePermissions(data.permissions),
  }
}

export async function listSecondaryAdmins(): Promise<AdminUser[]> {
  const snapshot = await getDocs(
    query(collection(requireDb(db), COLLECTION), where("role", "==", "secondary_admin"))
  )
  return snapshot.docs.map(toSecondaryAdmin).sort((a, b) => a.email.localeCompare(b.email))
}

async function findByEmail(normalizedEmail: string): Promise<QueryDocumentSnapshot<DocumentData> | null> {
  const snapshot = await getDocs(
    query(
      collection(requireDb(db), COLLECTION),
      where("email", "==", normalizedEmail),
      limit(1)
    )
  )
  return snapshot.empty ? null : snapshot.docs[0]
}

export interface SecondaryAdminWriteValues {
  email: string
  /** Required on create; omit (or leave empty) on update to keep the stored password unchanged. */
  password?: string
  managedBranches: string[]
  permissions: SecondaryAdminPermissions
}

export async function createSecondaryAdmin(values: SecondaryAdminWriteValues): Promise<void> {
  const email = values.email.trim().toLowerCase()
  const existing = await findByEmail(email)
  if (existing) {
    throw new Error(`A user with email "${email}" already exists.`)
  }
  await addDoc(collection(requireDb(db), COLLECTION), {
    email,
    password: values.password ?? "",
    role: "secondary_admin",
    managedBranches: values.managedBranches,
    permissions: values.permissions,
  })
}

export async function updateSecondaryAdmin(
  id: string,
  values: Partial<SecondaryAdminWriteValues>
): Promise<void> {
  if (values.email !== undefined) {
    const email = values.email.trim().toLowerCase()
    const existing = await findByEmail(email)
    if (existing && existing.id !== id) {
      throw new Error(`A user with email "${email}" already exists.`)
    }
  }

  const { password, email, ...rest } = values
  const update: Record<string, unknown> = { ...rest }
  if (email !== undefined) update.email = email.trim().toLowerCase()
  if (password) update.password = password

  await updateDoc(doc(requireDb(db), COLLECTION, id), update)
}

export async function deleteSecondaryAdmin(id: string): Promise<void> {
  const ref = doc(requireDb(db), COLLECTION, id)
  const snapshot = await getDoc(ref)
  if (snapshot.exists() && snapshot.data().role !== "secondary_admin") {
    throw new Error("Only secondary_admin accounts can be deleted here.")
  }
  await deleteDoc(ref)
}
