import { useEffect, useState } from "react"
import { toast } from "sonner"

import {
  createEmployee,
  deleteEmployee,
  subscribeEmployees,
  updateEmployee,
  type EmployeeUpdateValues,
} from "@/lib/firestore/employees"
import { useAuth } from "@/hooks/use-auth"
import { canManageEmployees, scopeByBranch } from "@/lib/permissions"
import type { Employee, EmployeeWritePayload } from "@/types/employee"

export function useEmployees() {
  const { role, managedBranches } = useAuth()
  const canManage = canManageEmployees(role)

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
    if (!canManage) {
      toast.error("You don't have permission to modify employees.")
      return false
    }
    try {
      await createEmployee(payload)
      toast.success("Employee created.")
      return true
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create employee.")
      return false
    }
  }

  async function editEmployee(id: string, values: EmployeeUpdateValues) {
    if (!canManage) {
      toast.error("You don't have permission to modify employees.")
      return false
    }
    try {
      await updateEmployee(id, values)
      toast.success("Employee updated.")
      return true
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update employee.")
      return false
    }
  }

  async function removeEmployee(id: string) {
    if (!canManage) {
      toast.error("You don't have permission to modify employees.")
      return false
    }
    try {
      const { attendanceDeleted } = await deleteEmployee(id)
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

  return { employees, isLoading, error, canManage, addEmployee, editEmployee, removeEmployee }
}
