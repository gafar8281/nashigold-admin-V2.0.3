import type { AttendanceStatus } from "@/lib/constants"

export interface AttendanceRecord {
  id: string
  employeeId: string
  date: string // pre-formatted display string from the source app, e.g. "05 May 2026"
  dateISO: string // YYYY-MM-DD, Saudi Arabia local calendar day — query/sort on this field
  checkIn: string // local time string, empty if absent
  checkOut: string // local time string, empty if absent
  status: AttendanceStatus
}
