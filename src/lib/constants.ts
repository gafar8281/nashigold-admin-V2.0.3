export const ROLES = ["admin", "secondary_admin"] as const
export type Role = (typeof ROLES)[number]

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  secondary_admin: "Branch Admin",
}

/** Sentinel value for "no branch filter applied" in branch-scoped Selects. */
export const ALL_BRANCHES = "all"

export const TARGET_UNITS = ["SAR", "Grams"] as const
export type TargetUnit = (typeof TARGET_UNITS)[number]

export const JOB_TITLES = ["Branch Manager", "Salesman"] as const
export type JobTitle = (typeof JOB_TITLES)[number]

export const ATTENDANCE_STATUSES = ["Present", "Absent", "Late", "In progress"] as const
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number]

export const LEAVE_TYPES = ["annual", "sick", "vacation"] as const
export type LeaveType = (typeof LEAVE_TYPES)[number]

export const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  annual: "Annual",
  sick: "Sick",
  vacation: "Vacation",
}

export const LEAVE_STATUSES = ["pending", "approved", "rejected"] as const
export type LeaveStatus = (typeof LEAVE_STATUSES)[number]

export const LEAVE_STATUS_LABELS: Record<LeaveStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
}
