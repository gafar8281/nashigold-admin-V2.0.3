import { useEffect, useState } from "react"
import { toast } from "sonner"

import {
  createSecondaryAdmin,
  deleteSecondaryAdmin,
  listSecondaryAdmins,
  updateSecondaryAdmin,
  type SecondaryAdminWriteValues,
} from "@/lib/firestore/users"
import type { AdminUser } from "@/types/user"

export function useUsers() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function refresh() {
    setIsLoading(true)
    setError(null)
    try {
      setUsers(await listSecondaryAdmins())
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  async function addUser(values: SecondaryAdminWriteValues) {
    try {
      await createSecondaryAdmin(values)
      toast.success("User created.")
      await refresh()
      return true
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create user.")
      return false
    }
  }

  async function editUser(id: string, values: Partial<SecondaryAdminWriteValues>) {
    try {
      await updateSecondaryAdmin(id, values)
      toast.success("User updated.")
      await refresh()
      return true
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update user.")
      return false
    }
  }

  async function removeUser(id: string) {
    try {
      await deleteSecondaryAdmin(id)
      toast.success("User deleted.")
      await refresh()
      return true
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete user.")
      return false
    }
  }

  return { users, isLoading, error, addUser, editUser, removeUser }
}
