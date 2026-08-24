import { useEffect, useState } from "react"
import { toast } from "sonner"

import {
  createAnnouncement,
  deleteAnnouncement,
  listAnnouncements,
  updateAnnouncement,
} from "@/lib/firestore/announcements"
import { useAuth } from "@/hooks/use-auth"
import { canAnnouncementAction } from "@/lib/permissions"
import type { Announcement } from "@/types/announcement"

export function useAnnouncements() {
  const { role, permissions } = useAuth()
  const canAdd = canAnnouncementAction(role, permissions, "add")
  const canEdit = canAnnouncementAction(role, permissions, "edit")
  const canDelete = canAnnouncementAction(role, permissions, "delete")

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
    if (!canAdd) {
      toast.error("You don't have permission to post announcements.")
      return false
    }
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
    if (!canEdit) {
      toast.error("You don't have permission to edit announcements.")
      return false
    }
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
    if (!canDelete) {
      toast.error("You don't have permission to delete announcements.")
      return false
    }
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
    canAdd,
    canEdit,
    canDelete,
    addAnnouncement,
    editAnnouncement,
    removeAnnouncement,
  }
}
