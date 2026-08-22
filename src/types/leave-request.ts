import type { LeaveStatus, LeaveType } from "@/lib/constants"

export interface LeaveRequest {
  id: string
  employeeId: string
  employeeName: string
  branch: string
  jobTitle: string
  leaveType: LeaveType
  startDateISO: string // YYYY-MM-DD, Riyadh calendar day
  endDateISO: string // YYYY-MM-DD, Riyadh calendar day
  reason: string
  status: LeaveStatus
  appliedAtMs: number // epoch millis
  reviewedBy?: string
  reviewedAtMs?: number
  adminComment?: string
}
