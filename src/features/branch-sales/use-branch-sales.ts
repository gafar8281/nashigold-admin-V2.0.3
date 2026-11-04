import { useEffect, useState } from "react"
import { toast } from "sonner"

import {
  createBranchSales,
  deleteBranchSales,
  listBranchSales,
  updateBranchSales,
} from "@/lib/firestore/branch-sales"
import type { BranchSales, BranchSalesWriteValues } from "@/types/branch-sales"

// Admin-only section (see canAccessSection), so no per-action permission checks.
export function useBranchSales() {
  const [records, setRecords] = useState<BranchSales[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function refresh() {
    setIsLoading(true)
    setError(null)
    try {
      setRecords(await listBranchSales())
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load online branch sales.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  async function addRecord(values: BranchSalesWriteValues) {
    try {
      await createBranchSales(values)
      toast.success("Online sales record added.")
      await refresh()
      return true
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add online sales record.")
      return false
    }
  }

  async function editRecord(branch: string, values: Omit<BranchSalesWriteValues, "branch">) {
    try {
      await updateBranchSales(branch, values)
      toast.success("Online sales record updated.")
      await refresh()
      return true
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update online sales record.")
      return false
    }
  }

  async function removeRecord(branch: string) {
    try {
      await deleteBranchSales(branch)
      toast.success("Online sales record deleted.")
      await refresh()
      return true
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete online sales record.")
      return false
    }
  }

  return { records, isLoading, error, addRecord, editRecord, removeRecord }
}
