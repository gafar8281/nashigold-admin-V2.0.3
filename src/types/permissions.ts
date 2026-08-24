/**
 * Per-user, per-module access control for `secondary_admin` accounts,
 * stored as nested data on their `nashigold_users` document.
 *
 * `scopeToManagedBranches: true` and `enabled: false` keys are not
 * configurable — they're persisted so the stored document is
 * self-documenting, but `normalizePermissions` always overwrites them
 * with these literal values. See src/lib/permissions.ts.
 */
export interface SecondaryAdminPermissions {
  dashboard: { scopeToManagedBranches: true }
  employees: { add: boolean; edit: boolean; delete: boolean }
  branches: { enabled: false }
  attendance: { scopeToManagedBranches: true }
  leaveRequests: { enabled: boolean; scopeToManagedBranches: true }
  complaints: { enabled: false }
  announcements: { add: boolean; edit: boolean; delete: boolean }
}
