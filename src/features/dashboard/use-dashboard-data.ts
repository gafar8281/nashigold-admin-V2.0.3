import { useEffect, useMemo, useState } from "react"

import { useEmployees } from "@/features/employees/use-employees"
import { tallyAttendanceByStatus } from "@/features/dashboard/attendance-summary"
import { useBranchScope } from "@/hooks/use-branch-scope"
import { listAttendanceForDate } from "@/lib/firestore/attendance"
import { getRecentAnnouncements } from "@/lib/firestore/announcements"
import { getPendingLeaveCount } from "@/lib/firestore/leave-requests"
import { getRiyadhTodayISO } from "@/lib/datetime"
import type { ATTENDANCE_STATUSES } from "@/lib/constants"
import type { Announcement } from "@/types/announcement"
import type { AttendanceRecord } from "@/types/attendance"

type AttendanceSummary = Record<(typeof ATTENDANCE_STATUSES)[number], number>

export function useDashboardData() {
  const {
    employees,
    isLoading: employeesLoading,
    error: employeesError,
  } = useEmployees()
  const { managedBranches } = useBranchScope()

  const [todayRecords, setTodayRecords] = useState<AttendanceRecord[]>([])
  const [recentAnnouncements, setRecentAnnouncements] = useState<Announcement[]>([])
  const [pendingLeaveCount, setPendingLeaveCount] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setIsLoading(true)
      setError(null)
      try {
        const [records, announcements, leaveCount] = await Promise.all([
          listAttendanceForDate(getRiyadhTodayISO()),
          getRecentAnnouncements(5),
          getPendingLeaveCount({ branches: managedBranches }),
        ])
        if (!cancelled) {
          setTodayRecords(records)
          setRecentAnnouncements(announcements)
          setPendingLeaveCount(leaveCount)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load dashboard data.")
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [managedBranches])

  const employeeIds = useMemo(
    () => (managedBranches === null ? null : new Set(employees.map((e) => e.id))),
    [employees, managedBranches]
  )

  // The source app only writes a record when an employee checks in, so
  // there's no "Absent" record to count — absence is derived as headcount
  // minus everyone who showed up (Present, Late, or In progress) today.
  const attendanceSummary = useMemo<AttendanceSummary | null>(() => {
    const tally = tallyAttendanceByStatus(todayRecords, employeeIds)
    const present = tally.Present + tally.Late + tally["In progress"]
    return {
      ...tally,
      Present: present,
      Absent: Math.max(0, employees.length - present),
    }
  }, [todayRecords, employeeIds, employees.length])

  return {
    employees,
    headcount: employees.length,
    attendanceSummary,
    recentAnnouncements,
    pendingLeaveCount,
    isLoading: isLoading || employeesLoading,
    error: error ?? employeesError,
  }
}
