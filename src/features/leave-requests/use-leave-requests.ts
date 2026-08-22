import { useCallback, useEffect, useRef, useState } from "react"
import type { DocumentData, QueryDocumentSnapshot } from "firebase/firestore"
import { toast } from "sonner"

import {
  listLeaveRequests,
  listPendingLeaveRequests,
  reviewLeaveRequest,
} from "@/lib/firestore/leave-requests"
import { useAuth } from "@/hooks/use-auth"
import { useBranchScope } from "@/hooks/use-branch-scope"
import type { LeaveStatus } from "@/lib/constants"
import type { LeaveRequest } from "@/types/leave-request"

const ALL_STATUSES = "all"

export function useLeaveRequests() {
  const { email } = useAuth()
  const { managedBranches } = useBranchScope()

  const [pending, setPending] = useState<LeaveRequest[]>([])
  const [isPendingLoading, setIsPendingLoading] = useState(true)
  const [pendingError, setPendingError] = useState<string | null>(null)

  const [statusFilter, setStatusFilter] = useState<LeaveStatus | typeof ALL_STATUSES>(
    ALL_STATUSES
  )
  const [history, setHistory] = useState<LeaveRequest[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [pageIndex, setPageIndex] = useState(0)
  const [isHistoryLoading, setIsHistoryLoading] = useState(true)
  const [historyError, setHistoryError] = useState<string | null>(null)

  const cursorsRef = useRef<Array<QueryDocumentSnapshot<DocumentData> | null>>([null])

  const refreshPending = useCallback(async () => {
    setIsPendingLoading(true)
    setPendingError(null)
    try {
      setPending(await listPendingLeaveRequests({ branches: managedBranches }))
    } catch (err) {
      setPendingError(err instanceof Error ? err.message : "Failed to load leave requests.")
    } finally {
      setIsPendingLoading(false)
    }
  }, [managedBranches])

  const loadHistoryPage = useCallback(
    async (targetPageIndex: number) => {
      setIsHistoryLoading(true)
      setHistoryError(null)
      try {
        const cursor = cursorsRef.current[targetPageIndex] ?? null
        const status = statusFilter === ALL_STATUSES ? undefined : statusFilter
        const page = await listLeaveRequests({ status, branches: managedBranches, cursor })
        setHistory(page.records)
        setHasMore(page.hasMore)
        cursorsRef.current[targetPageIndex + 1] = page.cursor
        setPageIndex(targetPageIndex)
      } catch (err) {
        setHistoryError(err instanceof Error ? err.message : "Failed to load leave history.")
      } finally {
        setIsHistoryLoading(false)
      }
    },
    [statusFilter, managedBranches]
  )

  useEffect(() => {
    void refreshPending()
  }, [refreshPending])

  useEffect(() => {
    cursorsRef.current = [null]
    void loadHistoryPage(0)
    // loadHistoryPage already captures the current statusFilter/managedBranches.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, managedBranches])

  async function refreshAll() {
    await Promise.all([refreshPending(), loadHistoryPage(pageIndex)])
  }

  async function review(
    request: LeaveRequest,
    status: "approved" | "rejected",
    adminComment?: string
  ) {
    try {
      await reviewLeaveRequest(request.id, {
        status,
        reviewedBy: email ?? "unknown",
        adminComment,
        allowedBranches: managedBranches,
      })
      toast.success(status === "approved" ? "Leave request approved." : "Leave request rejected.")
      await refreshAll()
      return true
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to review leave request.")
      return false
    }
  }

  return {
    pending,
    isPendingLoading,
    pendingError,

    statusFilter,
    setStatusFilter,
    history,
    isHistoryLoading,
    historyError,
    canPreviousPage: pageIndex > 0,
    canNextPage: hasMore,
    previousPage: () => loadHistoryPage(pageIndex - 1),
    nextPage: () => loadHistoryPage(pageIndex + 1),

    approve: (request: LeaveRequest, adminComment?: string) =>
      review(request, "approved", adminComment),
    reject: (request: LeaveRequest, adminComment?: string) =>
      review(request, "rejected", adminComment),
  }
}

export { ALL_STATUSES }
