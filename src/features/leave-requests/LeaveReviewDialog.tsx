import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import {
  leaveReviewSchema,
  type LeaveReviewFormValues,
} from "@/features/leave-requests/leave-review-schema"
import { LEAVE_TYPE_LABELS } from "@/lib/constants"
import { countLeaveDays, formatDateRange } from "@/lib/datetime"
import type { LeaveRequest } from "@/types/leave-request"
import { BranchBadge } from "@/components/shared/BranchBadge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"

export function LeaveReviewDialog({
  open,
  onOpenChange,
  request,
  action,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  request: LeaveRequest | null
  action: "approve" | "reject" | null
  onSubmit: (id: string, adminComment?: string) => Promise<boolean>
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LeaveReviewFormValues>({
    resolver: zodResolver(leaveReviewSchema),
    defaultValues: { adminComment: "" },
  })

  useEffect(() => {
    if (open) reset({ adminComment: "" })
  }, [open, request, reset])

  if (!request || !action) {
    return <Dialog open={open} onOpenChange={onOpenChange} />
  }

  const isApprove = action === "approve"
  const requestId = request.id

  async function submit(values: LeaveReviewFormValues) {
    const ok = await onSubmit(requestId, values.adminComment)
    if (ok) onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isApprove ? "Approve leave request" : "Reject leave request"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(submit)} noValidate>
          <div className="flex flex-col gap-1 rounded-lg border p-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">{request.employeeName}</span>
              <BranchBadge branch={request.branch} />
            </div>
            <p className="text-muted-foreground">{request.jobTitle}</p>
            <p>
              {LEAVE_TYPE_LABELS[request.leaveType]} ·{" "}
              {formatDateRange(request.startDateISO, request.endDateISO)} (
              {countLeaveDays(request.startDateISO, request.endDateISO)} day
              {countLeaveDays(request.startDateISO, request.endDateISO) === 1 ? "" : "s"})
            </p>
            <p className="whitespace-pre-wrap text-muted-foreground">{request.reason}</p>
          </div>

          <FieldGroup>
            <Field data-invalid={!!errors.adminComment}>
              <FieldLabel htmlFor="adminComment">Comment (optional)</FieldLabel>
              <Textarea id="adminComment" rows={3} {...register("adminComment")} />
              <FieldError>{errors.adminComment?.message}</FieldError>
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button
              type="submit"
              variant={isApprove ? "default" : "destructive"}
              disabled={isSubmitting}
            >
              {isSubmitting
                ? "Saving…"
                : isApprove
                  ? "Approve"
                  : "Reject"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
