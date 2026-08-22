import { useEffect, useState, type ReactNode } from "react"
import { toast } from "sonner"

import {
  createBranch,
  deleteBranch,
  listBranches,
  seedBranches as seedBranchesRequest,
  updateBranch,
} from "@/lib/firestore/branches"
import { BranchesContext } from "@/context/branches-context-value"
import type { Branch } from "@/types/branch"

export function BranchesProvider({ children }: { children: ReactNode }) {
  const [branches, setBranches] = useState<Branch[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function refresh() {
    setIsLoading(true)
    setError(null)
    try {
      setBranches(await listBranches())
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load branches.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  async function addBranch(values: { id: string; address: string }) {
    try {
      await createBranch(values)
      toast.success("Branch created.")
      await refresh()
      return true
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create branch.")
      return false
    }
  }

  async function editBranch(id: string, values: { address: string }) {
    try {
      await updateBranch(id, values)
      toast.success("Branch updated.")
      await refresh()
      return true
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update branch.")
      return false
    }
  }

  async function removeBranch(id: string) {
    try {
      await deleteBranch(id)
      toast.success("Branch deleted.")
      await refresh()
      return true
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete branch.")
      return false
    }
  }

  async function seedBranches() {
    try {
      const count = await seedBranchesRequest()
      toast.success(`${count} branches seeded.`)
      await refresh()
      return true
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to seed branches.")
      return false
    }
  }

  return (
    <BranchesContext.Provider
      value={{ branches, isLoading, error, addBranch, editBranch, removeBranch, seedBranches }}
    >
      {children}
    </BranchesContext.Provider>
  )
}
