import { useEffect, useState } from "react"
import { toast } from "sonner"

import {
  createAnnouncement,
  deleteAnnouncement,
  listAnnouncements,
  updateAnnouncement,
} from "@/lib/firestore/announcements"
import type { Announcement } from "@/types/announcement"

export function useAnnouncements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function refresh() {
    setIsLoading(true)
    setError(null)
    try {
      setAnnouncements(await listAnnouncements())
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load announcements.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  async function addAnnouncement(values: Omit<Announcement, "id">) {
    try {
      await createAnnouncement(values)
      toast.success("Announcement posted.")
      await refresh()
      return true
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to post announcement.")
      return false
    }
  }

  async function editAnnouncement(id: string, values: Partial<Omit<Announcement, "id">>) {
    try {
      await updateAnnouncement(id, values)
      toast.success("Announcement updated.")
      await refresh()
      return true
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update announcement.")
      return false
    }
  }

  async function removeAnnouncement(id: string) {
    try {
      await deleteAnnouncement(id)
      toast.success("Announcement deleted.")
      await refresh()
      return true
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete announcement.")
      return false
    }
  }

  return {
    announcements,
    isLoading,
    error,
    addAnnouncement,
    editAnnouncement,
    removeAnnouncement,
  }
}
