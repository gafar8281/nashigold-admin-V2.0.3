import { useMemo, useState } from "react"

import { useAttendance } from "@/features/attendance/use-attendance"
import { StatusBadge } from "@/features/attendance/attendance-columns"
import { useEmployees } from "@/features/employees/use-employees"
import { useBranchScope } from "@/hooks/use-branch-scope"
import { formatCalendarDate } from "@/lib/datetime"
import { ALL_BRANCHES } from "@/lib/constants"
import { PageHeader } from "@/components/layout/PageHeader"
import { BranchBadge } from "@/components/shared/BranchBadge"
import { BranchFilterSelect } from "@/components/shared/BranchFilterSelect"
import { DataTablePagination } from "@/components/shared/DataTablePagination"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export function AttendancePage() {
  const { employees, isLoading: employeesLoading } = useEmployees()
  const { managedBranches } = useBranchScope()
  const isScoped = managedBranches !== null

  const [branchFilter, setBranchFilter] = useState(ALL_BRANCHES)

  const employeesById = useMemo(
    () => new Map(employees.map((employee) => [employee.id, employee])),
    [employees]
  )

  const {
    date,
    setDate,
    records,
    isLoading,
    error,
    canPreviousPage,
    canNextPage,
    previousPage,
    nextPage,
  } = useAttendance({ employeesById, isScoped, branchFilter })

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Attendance"
        description="Read-only daily check-in/check-out records."
      />

      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-40"
        />
        <BranchFilterSelect value={branchFilter} onChange={setBranchFilter} />
      </div>

      {error && (
        <p className="text-sm text-destructive">
          Couldn't load attendance: {error}
        </p>
      )}

      {isLoading || employeesLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Check in</TableHead>
                <TableHead>Check out</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No attendance records for this date.
                  </TableCell>
                </TableRow>
              ) : (
                records.map((record) => {
                  const employee = employeesById.get(record.employeeId)
                  return (
                    <TableRow key={record.id}>
                      <TableCell>
                        <div className="font-medium">{employee?.name ?? record.employeeId}</div>
                        <div className="text-xs text-muted-foreground">{record.employeeId}</div>
                      </TableCell>
                      <TableCell>
                        {employee ? <BranchBadge branch={employee.branch} /> : "—"}
                      </TableCell>
                      <TableCell>{formatCalendarDate(record.dateISO)}</TableCell>
                      <TableCell>{record.checkIn || "—"}</TableCell>
                      <TableCell>{record.checkOut || "—"}</TableCell>
                      <TableCell>
                        <StatusBadge status={record.status} />
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <DataTablePagination
        canPreviousPage={canPreviousPage}
        canNextPage={canNextPage}
        onPrevious={previousPage}
        onNext={nextPage}
      />
    </div>
  )
}
