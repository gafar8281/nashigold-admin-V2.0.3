import { useState } from "react"

import type { InventoryItem } from "@/types/inventory"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const COLLAPSED_ROWS = 5
const collator = new Intl.Collator(undefined, { numeric: true })

export function InventoryItemCard({
  item,
  highlightBranch,
}: {
  item: InventoryItem
  /** Branch to pin to the top and emphasise, or `null` for none. */
  highlightBranch: string | null
}) {
  const [expanded, setExpanded] = useState(false)

  const rows = Object.entries(item.branches)
    .map(([branch, count]) => ({ branch, count }))
    .sort((a, b) => {
      if (a.branch === highlightBranch) return -1
      if (b.branch === highlightBranch) return 1
      return b.count - a.count || collator.compare(a.branch, b.branch)
    })
  const shown = expanded ? rows : rows.slice(0, COLLAPSED_ROWS)
  const hiddenCount = rows.length - shown.length

  return (
    <Card size="sm">
      <CardHeader className="grid-cols-[1fr_auto] items-baseline gap-x-3">
        <CardTitle className="leading-snug">{item.description}</CardTitle>
        <div className="text-right">
          <div className="text-2xl font-semibold leading-none">{item.totalCount}</div>
          <div className="text-xs text-muted-foreground">
            unit{item.totalCount === 1 ? "" : "s"} · {rows.length} branch
            {rows.length === 1 ? "" : "es"}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-1.5">
        {shown.map(({ branch, count }) => {
          const isHighlighted = branch === highlightBranch
          const share = item.totalCount > 0 ? (count / item.totalCount) * 100 : 0
          return (
            <div
              key={branch}
              className={cn(
                "grid grid-cols-[2.5rem_1fr_2.5rem] items-center gap-2 rounded-md px-1 py-0.5",
                isHighlighted && "bg-muted"
              )}
            >
              <span className={cn("text-xs", isHighlighted ? "font-semibold" : "text-muted-foreground")}>
                {branch}
              </span>
              <div className="h-1.5 rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full rounded-full",
                    highlightBranch === null || isHighlighted
                      ? "bg-[#2563eb] dark:bg-[#60a5fa]"
                      : "bg-muted-foreground/40"
                  )}
                  style={{ width: `${share}%` }}
                />
              </div>
              <span className="text-right text-xs tabular-nums">{count}</span>
            </div>
          )
        })}
        {(hiddenCount > 0 || expanded) && rows.length > COLLAPSED_ROWS && (
          <Button
            variant="ghost"
            size="xs"
            className="w-fit text-muted-foreground"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? "Show less" : `+${hiddenCount} more`}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
