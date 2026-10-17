import { ChevronRightIcon } from "lucide-react"

import type { InventorySection } from "@/features/inventory/inventory-sections"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"

const numberFormatter = new Intl.NumberFormat("en-US")

export function InventorySectionCard({
  section,
  itemCount,
  unitCount,
  onOpen,
}: {
  section: InventorySection
  itemCount: number
  unitCount: number
  onOpen: () => void
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="rounded-xl text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <Card size="sm" className="transition-colors hover:bg-muted/50">
        <CardHeader className="grid-cols-[1fr_auto_auto] items-center gap-x-3">
          <div>
            <CardTitle className="leading-snug">{section.label}</CardTitle>
            <div dir="rtl" className="text-left text-sm text-muted-foreground">
              {section.labelAr}
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-semibold leading-none">
              {numberFormatter.format(unitCount)}
            </div>
            <div className="text-xs text-muted-foreground">
              unit{unitCount === 1 ? "" : "s"} · {itemCount} item{itemCount === 1 ? "" : "s"}
            </div>
          </div>
          <ChevronRightIcon className="size-4 text-muted-foreground" />
        </CardHeader>
      </Card>
    </button>
  )
}
