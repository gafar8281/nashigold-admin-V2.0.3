import { useCallback, useEffect, useRef, useState } from "react"
import type { DocumentData, QueryDocumentSnapshot } from "firebase/firestore"
import { toast } from "sonner"

import { deleteComplaint, listComplaints } from "@/lib/firestore/complaints"
import type { Complaint } from "@/types/complaint"

export function useComplaints() {
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [pageIndex, setPageIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const cursorsRef = useRef<Array<QueryDocumentSnapshot<DocumentData> | null>>([null])

  const loadPage = useCallback(async (targetPageIndex: number) => {
    setIsLoading(true)
    setError(null)
    try {
      const cursor = cursorsRef.current[targetPageIndex] ?? null
      const page = await listComplaints({ cursor })
      setComplaints(page.records)
      setHasMore(page.hasMore)
      cursorsRef.current[targetPageIndex + 1] = page.cursor
      setPageIndex(targetPageIndex)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load complaints.")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadPage(0)
  }, [loadPage])

  async function removeComplaint(id: string) {
    try {
      await deleteComplaint(id)
      toast.success("Complaint deleted.")
      await loadPage(pageIndex)
      return true
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete complaint.")
      return false
    }
  }

  return {
    complaints,
    isLoading,
    error,
    canPreviousPage: pageIndex > 0,
    canNextPage: hasMore,
    previousPage: () => loadPage(pageIndex - 1),
    nextPage: () => loadPage(pageIndex + 1),
    removeComplaint,
  }
}
