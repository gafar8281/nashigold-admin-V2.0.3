import { useState } from "react"

import { useComplaints } from "@/features/complaints/use-complaints"
import { formatRiyadhDateTime } from "@/lib/datetime"
import type { Complaint } from "@/types/complaint"
import { PageHeader } from "@/components/layout/PageHeader"
import { BranchBadge } from "@/components/shared/BranchBadge"
import { ConfirmDeleteDialog } from "@/components/shared/ConfirmDeleteDialog"
import { DataTablePagination } from "@/components/shared/DataTablePagination"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function ComplaintsPage() {
  const {
    complaints,
    isLoading,
    error,
    canPreviousPage,
    canNextPage,
    previousPage,
    nextPage,
    removeComplaint,
  } = useComplaints()

  const [deleting, setDeleting] = useState<Complaint | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleConfirmDelete() {
    if (!deleting) return
    setIsDeleting(true)
    const ok = await removeComplaint(deleting.id)
    setIsDeleting(false)
    if (ok) setDeleting(null)
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Complaints"
        description="Complaints raised by staff from the employee app."
      />

      {error && (
        <p className="text-sm text-destructive">Couldn't load complaints: {error}</p>
      )}

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : complaints.length === 0 ? (
        <p className="text-sm text-muted-foreground">No complaints yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {complaints.map((complaint) => (
            <Card key={complaint.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle>{complaint.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {complaint.employeeId} · {complaint.jobTitle}
                    </p>
                  </div>
                  <BranchBadge branch={complaint.branch} />
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-1 text-sm">
                <p className="whitespace-pre-wrap">{complaint.issue}</p>
                {complaint.createdDateMs && (
                  <p className="text-xs text-muted-foreground">
                    Submitted {formatRiyadhDateTime(complaint.createdDateMs)}
                  </p>
                )}
              </CardContent>
              <CardFooter className="justify-end">
                <Button variant="destructive" onClick={() => setDeleting(complaint)}>
                  Delete
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <DataTablePagination
        canPreviousPage={canPreviousPage}
        canNextPage={canNextPage}
        onPrevious={previousPage}
        onNext={nextPage}
      />

      <ConfirmDeleteDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete complaint"
        description={`This will permanently remove the complaint from ${deleting?.name ?? ""}.`}
        onConfirm={handleConfirmDelete}
        isConfirming={isDeleting}
      />
    </div>
  )
}
