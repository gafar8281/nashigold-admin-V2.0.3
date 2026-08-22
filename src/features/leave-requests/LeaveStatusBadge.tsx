import { CheckCircle2Icon, ClockIcon, XCircleIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { LEAVE_STATUS_LABELS, type LeaveStatus } from "@/lib/constants"

export function LeaveStatusBadge({ status }: { status: LeaveStatus }) {
  const variant =
    status === "approved" ? "default" : status === "rejected" ? "destructive" : "secondary"
  const Icon = status === "approved" ? CheckCircle2Icon : status === "rejected" ? XCircleIcon : ClockIcon

  return (
    <Badge variant={variant}>
      <Icon data-icon="inline-start" />
      {LEAVE_STATUS_LABELS[status]}
    </Badge>
  )
}
