import { useState } from "react"
import { MoreHorizontalIcon, PlusIcon } from "lucide-react"

import { useAnnouncements } from "@/features/announcements/use-announcements"
import { AnnouncementFormDialog } from "@/features/announcements/AnnouncementFormDialog"
import { formatCalendarDate } from "@/lib/datetime"
import type { Announcement } from "@/types/announcement"
import { PageHeader } from "@/components/layout/PageHeader"
import { ConfirmDeleteDialog } from "@/components/shared/ConfirmDeleteDialog"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function AnnouncementsPage() {
  const {
    announcements,
    isLoading,
    error,
    canAdd,
    canEdit,
    canDelete,
    addAnnouncement,
    editAnnouncement,
    removeAnnouncement,
  } = useAnnouncements()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Announcement | undefined>()
  const [deleting, setDeleting] = useState<Announcement | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleConfirmDelete() {
    if (!deleting) return
    setIsDeleting(true)
    const ok = await removeAnnouncement(deleting.id)
    setIsDeleting(false)
    if (ok) setDeleting(null)
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Announcements"
        description="Post broadcast notices for all staff."
        action={
          canAdd ? (
            <Button
              onClick={() => {
                setEditing(undefined)
                setFormOpen(true)
              }}
            >
              <PlusIcon /> New announcement
            </Button>
          ) : undefined
        }
      />

      {error && (
        <p className="text-sm text-destructive">
          Couldn't load announcements: {error}
        </p>
      )}

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : announcements.length === 0 ? (
        <p className="text-sm text-muted-foreground">No announcements yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {announcements.map((announcement) => (
            <Card key={announcement.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle>{announcement.heading}</CardTitle>
                    <CardDescription>{formatCalendarDate(announcement.date)}</CardDescription>
                  </div>
                  {(canEdit || canDelete) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button variant="ghost" size="icon-sm">
                            <MoreHorizontalIcon />
                          </Button>
                        }
                      />
                      <DropdownMenuContent align="end">
                        {canEdit && (
                          <DropdownMenuItem
                            onClick={() => {
                              setEditing(announcement)
                              setFormOpen(true)
                            }}
                          >
                            Edit
                          </DropdownMenuItem>
                        )}
                        {canDelete && (
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setDeleting(announcement)}
                          >
                            Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </CardHeader>
              <CardContent className="whitespace-pre-wrap text-sm">
                {announcement.content}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {(canAdd || canEdit) && (
        <AnnouncementFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          announcement={editing}
          onCreate={addAnnouncement}
          onUpdate={editAnnouncement}
        />
      )}

      {canDelete && (
        <ConfirmDeleteDialog
          open={!!deleting}
          onOpenChange={(open) => !open && setDeleting(null)}
          title="Delete announcement"
          description={`This will permanently remove "${deleting?.heading ?? ""}".`}
          onConfirm={handleConfirmDelete}
          isConfirming={isDeleting}
        />
      )}
    </div>
  )
}
