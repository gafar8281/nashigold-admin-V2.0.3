// SECURITY NOTE: everything in this module is presentational, not
// enforced. This app has no per-user Firebase identity — the only real
// Firebase Auth session is an anonymous one (see ensureAnonymousSession in
// src/lib/firebase.ts), used solely so firestore.rules can require
// `request.auth != null`. There is no server-side way to distinguish an
// admin from a secondary_admin, so nothing here narrows what a
// determined client can actually read or write in Firestore. It exists to
// shape the UI for the common case, not to secure the data. Real
// enforcement would require migrating to per-user Firebase Auth with
// custom claims and rewriting firestore.rules around them.
import { type Role } from "@/lib/constants"
import type { Branch } from "@/types/branch"

export const APP_SECTIONS = [
  "dashboard",
  "employees",
  "branches",
  "attendance",
  "leave-requests",
  "complaints",
  "announcements",
] as const
export type AppSection = (typeof APP_SECTIONS)[number]

const SECONDARY_ADMIN_SECTIONS: readonly AppSection[] = [
  "dashboard",
  "employees",
  "attendance",
  "leave-requests",
]

/** Default-deny: an unknown or null role reaches nothing. */
export function canAccessSection(role: Role | null, section: AppSection): boolean {
  if (role === "admin") return true
  if (role === "secondary_admin") return SECONDARY_ADMIN_SECTIONS.includes(section)
  return false
}

/** Create/edit/delete on the employee roster — admin only. */
export function canManageEmployees(role: Role | null): boolean {
  return role === "admin"
}

/** `null` scope = unrestricted. */
export function isBranchInScope(managedBranches: string[] | null, branch: string): boolean {
  if (managedBranches === null) return true
  return branch !== "" && managedBranches.includes(branch)
}

/**
 * Filters by branch. Returns the SAME array reference when unrestricted so
 * admin render paths and downstream useMemo identity are untouched.
 */
export function scopeByBranch<T>(
  items: T[],
  managedBranches: string[] | null,
  getBranch: (item: T) => string
): T[] {
  if (managedBranches === null) return items
  return items.filter((item) => isBranchInScope(managedBranches, getBranch(item)))
}

/** Restricts Branch objects to the scope, intersected with what actually exists. */
export function scopeBranches(branches: Branch[], managedBranches: string[] | null): Branch[] {
  return scopeByBranch(branches, managedBranches, (branch) => branch.id)
}

export function canReviewLeaveRequest(
  role: Role | null,
  managedBranches: string[] | null,
  branch: string
): boolean {
  if (role === "admin") return true
  if (role !== "secondary_admin") return false
  return isBranchInScope(managedBranches, branch)
}

/** Firestore caps `in` / `array-contains-any` at 30 values. */
export const MAX_BRANCH_IN_VALUES = 30
