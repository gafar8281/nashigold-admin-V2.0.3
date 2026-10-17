import type { InventorySummary } from "@/features/inventory/inventory-summary"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

function StatTile({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl font-semibold">{value}</CardTitle>
        {detail && <p className="text-xs text-muted-foreground">{detail}</p>}
      </CardHeader>
    </Card>
  )
}

const numberFormatter = new Intl.NumberFormat("en-US")

export function InventoryStats({ summary }: { summary: InventorySummary }) {
  const { totalUnits, uniqueItems, branchesWithStock, topBranch } = summary
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatTile label="Total units" value={numberFormatter.format(totalUnits)} />
      <StatTile label="Unique items" value={numberFormatter.format(uniqueItems)} />
      <StatTile label="Branches with stock" value={numberFormatter.format(branchesWithStock)} />
      <StatTile
        label="Top branch"
        value={topBranch?.branch ?? "—"}
        detail={
          topBranch
            ? `${numberFormatter.format(topBranch.units)} unit${topBranch.units === 1 ? "" : "s"}`
            : undefined
        }
      />
    </div>
  )
}
