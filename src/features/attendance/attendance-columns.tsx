import { Badge } from "@/components/ui/badge"
import type { AttendanceStatus } from "@/lib/constants"

export function StatusBadge({ status }: { status: AttendanceStatus }) {
  const variant =
    status === "Present"
      ? "default"
      : status === "Late"
        ? "secondary"
        : status === "In progress"
          ? "outline"
          : "destructive"
  return <Badge variant={variant}>{status}</Badge>
}
