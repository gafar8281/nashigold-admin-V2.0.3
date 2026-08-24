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
//
// This includes the per-user `permissions` object below: it makes access
// *configurable* by an admin through the UI, not *enforced* against a
// determined client. `nashigold_users` documents (including `permissions`)
// are readable by anyone holding the public Firebase config, and the
// stored session (role/permissions) lives in localStorage, so a
// determined client can still grant itself anything. See firestore.rules
// for the write-side story.
import { type Role } from "@/lib/constants"
import type { Branch } from "@/types/branch"
import type { SecondaryAdminPermissions } from "@/types/permissions"

export const APP_SECTIONS = [
  "dashboard",
  "employees",
  "branches",
  "attendance",
  "leave-requests",
  "complaints",
  "announcements",
  "users",
] as const
export type AppSection = (typeof APP_SECTIONS)[number]

/** Fail-closed starting point for a new secondary_admin, and what a
 * malformed/missing `permissions` field degrades to. */
export const DEFAULT_SECONDARY_ADMIN_PERMISSIONS: SecondaryAdminPermissions = {
  dashboard: { scopeToManagedBranches: true },
  employees: { add: false, edit: false, delete: false },
  branches: { enabled: false },
  attendance: { scopeToManagedBranches: true },
  leaveRequests: { enabled: false, scopeToManagedBranches: true },
  complaints: { enabled: false },
  announcements: { add: false, edit: false, delete: false },
}

/**
 * Coerces arbitrary stored data into a well-formed permissions object.
 * The `scopeToManagedBranches`/`enabled` keys that the requirements call
 * "not a toggle" are always forced to their mandated constants here, so a
 * hand-edited Firestore document can never widen them — only the
 * configurable booleans are read from `raw`.
 */
export function normalizePermissions(raw: unknown): SecondaryAdminPermissions {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>
  const bool = (obj: unknown, key: string): boolean => {
    const o = obj && typeof obj === "object" ? (obj as Record<string, unknown>) : {}
    return typeof o[key] === "boolean" ? (o[key] as boolean) : false
  }
  return {
    dashboard: { scopeToManagedBranches: true },
    employees: {
      add: bool(r.employees, "add"),
      edit: bool(r.employees, "edit"),
      delete: bool(r.employees, "delete"),
    },
    branches: { enabled: false },
    attendance: { scopeToManagedBranches: true },
    leaveRequests: {
      enabled: bool(r.leaveRequests, "enabled"),
      scopeToManagedBranches: true,
    },
    complaints: { enabled: false },
    announcements: {
      add: bool(r.announcements, "add"),
      edit: bool(r.announcements, "edit"),
      delete: bool(r.announcements, "delete"),
    },
  }
}

/** Default-deny: an unknown or null role, or a scoped user with no
 * permissions loaded yet, reaches nothing. */
export function canAccessSection(
  role: Role | null,
  section: AppSection,
  permissions: SecondaryAdminPermissions | null
): boolean {
  if (role === "admin") return true
  if (role !== "secondary_admin" || !permissions) return false
  switch (section) {
    case "dashboard":
    case "employees":
    case "attendance":
    case "announcements":
      return true
    case "leave-requests":
      return permissions.leaveRequests.enabled
    case "branches":
    case "complaints":
    case "users":
      return false
  }
}

/** Add/edit/delete on the employee roster, gated per-user for secondary_admin. */
export function canEmployeeAction(
  role: Role | null,
  permissions: SecondaryAdminPermissions | null,
  action: "add" | "edit" | "delete"
): boolean {
  if (role === "admin") return true
  if (role !== "secondary_admin" || !permissions) return false
  return permissions.employees[action]
}

/** Add/edit/delete on announcements, gated per-user for secondary_admin. */
export function canAnnouncementAction(
  role: Role | null,
  permissions: SecondaryAdminPermissions | null,
  action: "add" | "edit" | "delete"
): boolean {
  if (role === "admin") return true
  if (role !== "secondary_admin" || !permissions) return false
  return permissions.announcements[action]
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
