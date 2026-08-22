import { useEffect, useMemo, useState } from "react"

import { listAttendanceForDate } from "@/lib/firestore/attendance"
import { getRiyadhTodayISO } from "@/lib/datetime"
import { ALL_BRANCHES } from "@/lib/constants"
import type { Employee } from "@/types/employee"
import type { AttendanceRecord } from "@/types/attendance"

const PAGE_SIZE = 25

function isVisible(
  employee: Employee | undefined,
  isScoped: boolean,
  branchFilter: string
): boolean {
  // Orphan record (deleted employee, or out of a scoped user's branches):
  // a scoped user can't prove it's theirs, so fail closed. Admins keep
  // seeing it, matching today's behavior.
  if (isScoped && !employee) return false
  if (branchFilter === ALL_BRANCHES) return true
  return employee?.branch === branchFilter
}

export function useAttendance(options: {
  employeesById: Map<string, Employee>
  isScoped: boolean
  branchFilter: string
}) {
  const { employeesById, isScoped, branchFilter } = options

  const [date, setDate] = useState(getRiyadhTodayISO())
  const [allRecords, setAllRecords] = useState<AttendanceRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pageIndex, setPageIndex] = useState(0)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(null)
    setPageIndex(0)
    listAttendanceForDate(date)
      .then((records) => {
        if (!cancelled) setAllRecords(records)
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load attendance.")
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [date])

  const visibleRecords = useMemo(
    () =>
      allRecords.filter((record) =>
        isVisible(employeesById.get(record.employeeId), isScoped, branchFilter)
      ),
    [allRecords, employeesById, isScoped, branchFilter]
  )

  useEffect(() => {
    setPageIndex(0)
  }, [branchFilter])

  const records = useMemo(
    () => visibleRecords.slice(pageIndex * PAGE_SIZE, (pageIndex + 1) * PAGE_SIZE),
    [visibleRecords, pageIndex]
  )

  return {
    date,
    setDate,
    records,
    isLoading,
    error,
    canPreviousPage: pageIndex > 0,
    canNextPage: (pageIndex + 1) * PAGE_SIZE < visibleRecords.length,
    previousPage: () => setPageIndex((i) => Math.max(0, i - 1)),
    nextPage: () => setPageIndex((i) => i + 1),
  }
}
