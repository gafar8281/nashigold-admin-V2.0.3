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
  /** When enabled, always read-only and scoped to managed branches. */
  dashboard: { enabled: boolean; scopeToManagedBranches: true }
  /** `add`/`edit`/`delete` are only honoured while `enabled` is true. */
  employees: { enabled: boolean; add: boolean; edit: boolean; delete: boolean }
  branches: { enabled: false }
  /** `upload` replaces the whole snapshot (all branches) and is only
   * honoured while `enabled` is true. */
  inventory: { enabled: boolean; upload: boolean }
  /** When enabled, always read-only and scoped to managed branches. */
  attendance: { enabled: boolean; scopeToManagedBranches: true }
  leaveRequests: { enabled: boolean; scopeToManagedBranches: true }
  complaints: { enabled: false }
  /** `add`/`edit`/`delete` are only honoured while `enabled` is true. */
  announcements: { enabled: boolean; add: boolean; edit: boolean; delete: boolean }
}
