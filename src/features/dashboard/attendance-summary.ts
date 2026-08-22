import { ATTENDANCE_STATUSES, type AttendanceStatus } from "@/lib/constants"
import type { AttendanceRecord } from "@/types/attendance"

/**
 * Tallies attendance records by status. `employeeIds === null` counts
 * every record (admin, unrestricted) — identical output to the old
 * server-side getTodayAttendanceSummary. A non-null set restricts the
 * tally to records belonging to those employee ids (a scoped roster).
 */
export function tallyAttendanceByStatus(
  records: AttendanceRecord[],
  employeeIds: Set<string> | null
): Record<AttendanceStatus, number> {
  const summary = Object.fromEntries(
    ATTENDANCE_STATUSES.map((status) => [status, 0])
  ) as Record<AttendanceStatus, number>

  for (const record of records) {
    if (employeeIds !== null && !employeeIds.has(record.employeeId)) continue
    const status = record.status
    if (status in summary) summary[status] += 1
  }

  return summary
}
