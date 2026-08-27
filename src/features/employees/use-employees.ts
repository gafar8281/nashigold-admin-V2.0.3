import { useEffect, useState } from "react"
import { toast } from "sonner"

import {
  bulkUpdateEmployeeTargets,
  createEmployee,
  deleteEmployee,
  subscribeEmployees,
  updateEmployee,
  type EmployeeTargetUpdate,
  type EmployeeUpdateValues,
} from "@/lib/firestore/employees"
import { useAuth } from "@/hooks/use-auth"
import { canEmployeeAction, scopeByBranch } from "@/lib/permissions"
import type { Employee, EmployeeWritePayload } from "@/types/employee"

export function useEmployees() {
  const { role, managedBranches, permissions } = useAuth()
  const canAdd = canEmployeeAction(role, permissions, "add")
  const canEdit = canEmployeeAction(role, permissions, "edit")
  const canDelete = canEmployeeAction(role, permissions, "delete")

  const [employees, setEmployees] = useState<Employee[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setIsLoading(true)
    let unsubscribe: (() => void) | undefined
    try {
      unsubscribe = subscribeEmployees(
        managedBranches,
        (data) => {
          // Redundant on the server-filtered path — guarantees the
          // invariant holds on the >30-branch client-filter fallback too.
          setEmployees(scopeByBranch(data, managedBranches, (e) => e.branch))
          setIsLoading(false)
          setError(null)
        },
        (err) => {
          setError(err.message)
          setIsLoading(false)
        }
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load employees.")
      setIsLoading(false)
    }
    return () => unsubscribe?.()
  }, [managedBranches])

  async function addEmployee(payload: EmployeeWritePayload) {
    if (!canAdd) {
      toast.error("You don't have permission to add employees.")
      return false
    }
    try {
      await createEmployee(payload, managedBranches)
      toast.success("Employee created.")
      return true
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create employee.")
      return false
    }
  }

  async function editEmployee(id: string, values: EmployeeUpdateValues) {
    if (!canEdit) {
      toast.error("You don't have permission to edit employees.")
      return false
    }
    try {
      await updateEmployee(id, values, managedBranches)
      toast.success("Employee updated.")
      return true
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update employee.")
      return false
    }
  }

  async function removeEmployee(id: string) {
    if (!canDelete) {
      toast.error("You don't have permission to delete employees.")
      return false
    }
    try {
      const { attendanceDeleted } = await deleteEmployee(id, managedBranches)
      toast.success(
        attendanceDeleted === 0
          ? "Employee deleted."
          : `Employee deleted. Removed ${attendanceDeleted} attendance record${
              attendanceDeleted === 1 ? "" : "s"
            }.`
      )
      return true
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete employee.")
      return false
    }
  }

  async function importEmployeeTargets(updates: EmployeeTargetUpdate[]) {
    if (!canEdit) {
      toast.error("You don't have permission to edit employees.")
      return null
    }
    try {
      return await bulkUpdateEmployeeTargets(updates, managedBranches)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to import employees.")
      return null
    }
  }

  return {
    employees,
    isLoading,
    error,
    canAdd,
    canEdit,
    canDelete,
    addEmployee,
    editEmployee,
    removeEmployee,
    importEmployeeTargets,
  }
}
