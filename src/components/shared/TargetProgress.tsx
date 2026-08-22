import { formatProgressPercent, formatTargetValue } from "@/lib/format"
import type { TargetUnit } from "@/lib/constants"
import { cn } from "@/lib/utils"

export function TargetProgress({
  achieved,
  target,
  unit,
  className,
}: {
  achieved: number
  target: number
  unit: TargetUnit
  className?: string
}) {
  const percent = formatProgressPercent(achieved, target)
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {formatTargetValue(achieved, unit)} / {formatTargetValue(target, unit)}
        </span>
        <span>{percent}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}
