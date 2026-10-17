import { useEffect, useState } from "react"
import { toast } from "sonner"

import { getInventorySnapshot, replaceInventory } from "@/lib/firestore/inventory"
import { useAuth } from "@/hooks/use-auth"
import { canAccessSection } from "@/lib/permissions"
import type { InventoryItem, InventoryItemInput, InventoryMeta } from "@/types/inventory"

export function useInventory() {
  const { role, permissions } = useAuth()
  const canUpload = canAccessSection(role, "inventory", permissions)

  const [items, setItems] = useState<InventoryItem[]>([])
  const [meta, setMeta] = useState<InventoryMeta | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function refresh() {
    setIsLoading(true)
    setError(null)
    try {
      const snapshot = await getInventorySnapshot()
      setMeta(snapshot.meta)
      setItems(snapshot.items)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load inventory.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  async function uploadInventory(next: InventoryItemInput[]) {
    if (!canUpload) {
      toast.error("You don't have permission to upload inventory.")
      return false
    }
    try {
      const { cleanupFailed } = await replaceInventory(next)
      toast.success(`Inventory updated — ${next.length} item${next.length === 1 ? "" : "s"}.`)
      if (cleanupFailed) {
        toast.warning("Old inventory records couldn't be removed; they'll be cleared on the next upload.")
      }
      await refresh()
      return true
    } catch (err) {
      toast.error(
        err instanceof Error
          ? `Upload failed — the previous inventory is unchanged. ${err.message}`
          : "Upload failed — the previous inventory is unchanged."
      )
      return false
    }
  }

  return { items, meta, isLoading, error, canUpload, uploadInventory }
}
