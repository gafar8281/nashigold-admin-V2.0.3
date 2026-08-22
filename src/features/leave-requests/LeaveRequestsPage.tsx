import { useState } from "react"

import { useLeaveRequests, ALL_STATUSES } from "@/features/leave-requests/use-leave-requests"
import { LeaveStatusBadge } from "@/features/leave-requests/LeaveStatusBadge"
import { LeaveReviewDialog } from "@/features/leave-requests/LeaveReviewDialog"
import { useAuth } from "@/hooks/use-auth"
import { useBranchScope } from "@/hooks/use-branch-scope"
import { canReviewLeaveRequest } from "@/lib/permissions"
import { LEAVE_STATUSES, LEAVE_STATUS_LABELS, LEAVE_TYPE_LABELS } from "@/lib/constants"
import { countLeaveDays, formatDateRange, formatRiyadhDateTime } from "@/lib/datetime"
import type { LeaveRequest } from "@/types/leave-request"
import { PageHeader } from "@/components/layout/PageHeader"
import { BranchBadge } from "@/components/shared/BranchBadge"
import { DataTablePagination } from "@/components/shared/DataTablePagination"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export function LeaveRequestsPage() {
  const {
    pending,
    isPendingLoading,
    pendingError,
    statusFilter,
    setStatusFilter,
    history,
    isHistoryLoading,
    historyError,
    canPreviousPage,
    canNextPage,
    previousPage,
    nextPage,
    approve,
    reject,
  } = useLeaveRequests()

  const { role } = useAuth()
  const { managedBranches } = useBranchScope()

  const [reviewTarget, setReviewTarget] = useState<LeaveRequest | null>(null)
  const [reviewAction, setReviewAction] = useState<"approve" | "reject" | null>(null)

  function openReview(request: LeaveRequest, action: "approve" | "reject") {
    setReviewTarget(request)
    setReviewAction(action)
  }

  async function handleReviewSubmit(_id: string, adminComment?: string) {
    if (!reviewTarget) return false
    return reviewAction === "approve"
      ? approve(reviewTarget, adminComment)
      : reject(reviewTarget, adminComment)
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Leave Requests"
        description="Review, approve, and reject employee leave requests."
      />

      <div className="flex flex-col gap-3">
        <h2 className="font-heading text-sm font-semibold">Needs review ({pending.length})</h2>

        {pendingError && (
          <p className="text-sm text-destructive">
            Couldn't load leave requests: {pendingError}
          </p>
        )}

        {isPendingLoading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : pending.length === 0 ? (
          <p className="text-sm text-muted-foreground">No leave requests waiting for review.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {pending.map((request) => (
              <Card key={request.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle>{request.employeeName}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {request.employeeId} · {request.jobTitle}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <BranchBadge branch={request.branch} />
                      <LeaveStatusBadge status={request.status} />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-1 text-sm">
                  <p>
                    {LEAVE_TYPE_LABELS[request.leaveType]} ·{" "}
                    {formatDateRange(request.startDateISO, request.endDateISO)} (
                    {countLeaveDays(request.startDateISO, request.endDateISO)} day
                    {countLeaveDays(request.startDateISO, request.endDateISO) === 1 ? "" : "s"})
                  </p>
                  <p className="whitespace-pre-wrap text-muted-foreground">{request.reason}</p>
                  <p className="text-xs text-muted-foreground">
                    Applied {formatRiyadhDateTime(request.appliedAtMs)}
                  </p>
                </CardContent>
                {canReviewLeaveRequest(role, managedBranches, request.branch) && (
                  <CardFooter className="justify-end gap-2">
                    <Button variant="outline" onClick={() => openReview(request, "reject")}>
                      Reject
                    </Button>
                    <Button onClick={() => openReview(request, "approve")}>Approve</Button>
                  </CardFooter>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-heading text-sm font-semibold">History</h2>
          <Tabs
            value={statusFilter}
            onValueChange={(value) =>
              setStatusFilter((value as typeof statusFilter) ?? ALL_STATUSES)
            }
          >
            <TabsList>
              <TabsTrigger value={ALL_STATUSES}>All</TabsTrigger>
              {LEAVE_STATUSES.map((status) => (
                <TabsTrigger key={status} value={status}>
                  {LEAVE_STATUS_LABELS[status]}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {historyError && (
          <p className="text-sm text-destructive">
            Couldn't load leave history: {historyError}
          </p>
        )}

        {isHistoryLoading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Applied</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reviewed by</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      No leave requests found.
                    </TableCell>
                  </TableRow>
                ) : (
                  history.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>
                        <div className="font-medium">{request.employeeName}</div>
                        <div className="text-xs text-muted-foreground">{request.employeeId}</div>
                      </TableCell>
                      <TableCell>
                        <BranchBadge branch={request.branch} />
                      </TableCell>
                      <TableCell>{LEAVE_TYPE_LABELS[request.leaveType]}</TableCell>
                      <TableCell>
                        {formatDateRange(request.startDateISO, request.endDateISO)}
                      </TableCell>
                      <TableCell>{formatRiyadhDateTime(request.appliedAtMs)}</TableCell>
                      <TableCell>
                        <LeaveStatusBadge status={request.status} />
                      </TableCell>
                      <TableCell>
                        {request.reviewedBy ? (
                          <div>
                            <div>{request.reviewedBy}</div>
                            <div className="text-xs text-muted-foreground">
                              {request.reviewedAtMs
                                ? formatRiyadhDateTime(request.reviewedAtMs)
                                : ""}
                            </div>
                            {request.adminComment && (
                              <div className="text-xs text-muted-foreground italic">
                                "{request.adminComment}"
                              </div>
                            )}
                          </div>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}

        <DataTablePagination
          canPreviousPage={canPreviousPage}
          canNextPage={canNextPage}
          onPrevious={previousPage}
          onNext={nextPage}
        />
      </div>

      <LeaveReviewDialog
        open={!!reviewTarget}
        onOpenChange={(open) => {
          if (!open) {
            setReviewTarget(null)
            setReviewAction(null)
          }
        }}
        request={reviewTarget}
        action={reviewAction}
        onSubmit={handleReviewSubmit}
      />
    </div>
  )
}
