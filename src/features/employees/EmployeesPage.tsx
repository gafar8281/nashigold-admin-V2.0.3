import { useMemo, useState } from "react"
import { flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table"
import { DownloadIcon, PlusIcon } from "lucide-react"
import { toast } from "sonner"

import { useEmployees } from "@/features/employees/use-employees"
import { buildEmployeeColumns } from "@/features/employees/employee-columns"
import { EmployeeFormDialog } from "@/features/employees/EmployeeFormDialog"
import {
  buildEmployeeCsvRows,
  employeeCsvFilename,
} from "@/features/employees/employee-csv"
import type { Employee } from "@/types/employee"
import { PageHeader } from "@/components/layout/PageHeader"
import { BranchFilterSelect, ALL_BRANCHES } from "@/components/shared/BranchFilterSelect"
import { ConfirmDeleteDialog } from "@/components/shared/ConfirmDeleteDialog"
import { Button } from "@/components/ui/button"
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
import { downloadCsv, toCsvContent } from "@/lib/csv"

export function EmployeesPage() {
  const {
    employees,
    isLoading,
    error,
    canAdd,
    canEdit,
    canDelete,
    addEmployee,
    editEmployee,
    removeEmployee,
  } = useEmployees()

  const [search, setSearch] = useState("")
  const [branchFilter, setBranchFilter] = useState<string>(ALL_BRANCHES)

  const [formOpen, setFormOpen] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | undefined>()
  const [deletingEmployee, setDeletingEmployee] = useState<Employee | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const filteredEmployees = useMemo(() => {
    const term = search.trim().toLowerCase()
    return employees.filter((employee) => {
      const matchesBranch =
        branchFilter === ALL_BRANCHES || employee.branch === branchFilter
      const matchesSearch =
        term === "" ||
        employee.name.toLowerCase().includes(term) ||
        employee.id.includes(term)
      return matchesBranch && matchesSearch
    })
  }, [employees, search, branchFilter])

  const columns = useMemo(
    () =>
      buildEmployeeColumns({
        onEdit: (employee) => {
          setEditingEmployee(employee)
          setFormOpen(true)
        },
        onDelete: (employee) => setDeletingEmployee(employee),
        canEdit,
        canDelete,
      }),
    [canEdit, canDelete]
  )

  const table = useReactTable({
    data: filteredEmployees,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  function handleExport() {
    try {
      downloadCsv(employeeCsvFilename(), toCsvContent(buildEmployeeCsvRows(filteredEmployees)))
    } catch {
      toast.error("Failed to export employees.")
    }
  }

  async function handleConfirmDelete() {
    if (!deletingEmployee) return
    setIsDeleting(true)
    const ok = await removeEmployee(deletingEmployee.id)
    setIsDeleting(false)
    if (ok) setDeletingEmployee(null)
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Employees"
        description={
          canAdd || canEdit || canDelete
            ? "Manage staff roster, branches, and sales targets."
            : "Staff roster for your branches. Read-only."
        }
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleExport}
              disabled={isLoading || filteredEmployees.length === 0}
            >
              <DownloadIcon /> Export CSV
            </Button>
            {canAdd && (
              <Button
                onClick={() => {
                  setEditingEmployee(undefined)
                  setFormOpen(true)
                }}
              >
                <PlusIcon /> Add employee
              </Button>
            )}
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search by name or id…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-64"
        />
        <BranchFilterSelect value={branchFilter} onChange={setBranchFilter} />
        <p className="ml-auto text-sm text-muted-foreground">
          {filteredEmployees.length} employee{filteredEmployees.length === 1 ? "" : "s"}
        </p>
      </div>

      {error && (
        <p className="text-sm text-destructive">
          Couldn't load employees: {error}
        </p>
      )}

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                    No employees found.
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {(canAdd || canEdit) && (
        <EmployeeFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          employee={editingEmployee}
          onCreate={addEmployee}
          onUpdate={editEmployee}
        />
      )}

      {canDelete && (
        <ConfirmDeleteDialog
          open={!!deletingEmployee}
          onOpenChange={(open) => !open && setDeletingEmployee(null)}
          title="Delete employee"
          description={`This will permanently remove ${deletingEmployee?.name ?? "this employee"} from the roster and delete their entire attendance history. This cannot be undone.`}
          onConfirm={handleConfirmDelete}
          isConfirming={isDeleting}
        />
      )}
    </div>
  )
}
