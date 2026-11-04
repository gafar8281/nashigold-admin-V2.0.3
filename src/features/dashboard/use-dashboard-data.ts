import { useEffect, useMemo, useState } from "react"

import { useEmployees } from "@/features/employees/use-employees"
import { tallyAttendanceByStatus } from "@/features/dashboard/attendance-summary"
import { useBranchScope } from "@/hooks/use-branch-scope"
import { listAttendanceForDate } from "@/lib/firestore/attendance"
import { getRecentAnnouncements } from "@/lib/firestore/announcements"
import { getPendingLeaveCount } from "@/lib/firestore/leave-requests"
import { listBranchSales } from "@/lib/firestore/branch-sales"
import { scopeByBranch } from "@/lib/permissions"
import { getRiyadhTodayISO } from "@/lib/datetime"
import type { ATTENDANCE_STATUSES } from "@/lib/constants"
import type { Announcement } from "@/types/announcement"
import type { AttendanceRecord } from "@/types/attendance"
import type { BranchSales } from "@/types/branch-sales"

type AttendanceSummary = Record<(typeof ATTENDANCE_STATUSES)[number], number>

export function useDashboardData() {
  const {
    employees,
    isLoading: employeesLoading,
    error: employeesError,
  } = useEmployees()
  const { managedBranches } = useBranchScope()

  const [todayRecords, setTodayRecords] = useState<AttendanceRecord[]>([])
  const [onlineSales, setOnlineSales] = useState<BranchSales[]>([])
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
        const [records, announcements, leaveCount, branchSales] = await Promise.all([
          listAttendanceForDate(getRiyadhTodayISO()),
          getRecentAnnouncements(5),
          getPendingLeaveCount({ branches: managedBranches }),
          // Non-fatal: a failure here shouldn't take down attendance/announcements.
          listBranchSales().catch(() => null),
        ])
        if (!cancelled) {
          setTodayRecords(records)
          // The Online Branch Sales page is admin-only, but its figures feed
          // the chart for a branch admin's own managedBranches.
          setOnlineSales(
            branchSales ? scopeByBranch(branchSales, managedBranches, (r) => r.branch) : []
          )
          if (!branchSales) {
            setError("Online branch sales couldn't be loaded — the chart shows employee figures only.")
          }
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
    onlineSales,
    recentAnnouncements,
    pendingLeaveCount,
    isLoading: isLoading || employeesLoading,
    error: error ?? employeesError,
  }
}
