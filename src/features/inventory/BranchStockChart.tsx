import { Bar, BarChart, CartesianGrid, Cell, LabelList, XAxis, YAxis } from "recharts"

import type { BranchTotal } from "@/features/inventory/inventory-summary"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"

// Same blue as the dashboard's "Target" series, so one hue means "units" app-wide.
const chartConfig = {
  units: {
    label: "Units",
    theme: { light: "#2563eb", dark: "#60a5fa" },
  },
} satisfies ChartConfig

const ROW_HEIGHT = 32
const AXIS_PADDING = 16

export function BranchStockChart({
  totals,
  selectedBranch,
  onSelectBranch,
}: {
  totals: BranchTotal[]
  /** `null` = no branch filter. */
  selectedBranch: string | null
  /** Called with the clicked branch, or `null` when the selected bar is clicked again. */
  onSelectBranch: (branch: string | null) => void
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Units by branch</CardTitle>
        <CardDescription>
          {selectedBranch
            ? `Showing ${selectedBranch}. Click the bar again to show all branches.`
            : "Click a bar to filter the page to that branch."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {totals.length === 0 ? (
          <p className="text-sm text-muted-foreground">No stock in the current selection.</p>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="aspect-auto w-full"
            style={{ height: totals.length * ROW_HEIGHT + AXIS_PADDING }}
          >
            <BarChart
              accessibilityLayer
              data={totals}
              layout="vertical"
              margin={{ left: 0, right: 40, top: 0, bottom: 0 }}
              barCategoryGap={4}
            >
              <CartesianGrid horizontal={false} />
              <XAxis type="number" hide allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="branch"
                tickLine={false}
                axisLine={false}
                width={44}
              />
              <ChartTooltip
                cursor={{ fill: "var(--muted)", opacity: 0.5 }}
                content={<ChartTooltipContent hideIndicator />}
              />
              <Bar
                dataKey="units"
                radius={[0, 4, 4, 0]}
                className="cursor-pointer"
                onClick={(_, index) => {
                  const branch = totals[index]?.branch
                  if (!branch) return
                  onSelectBranch(branch === selectedBranch ? null : branch)
                }}
              >
                {totals.map((total) => (
                  <Cell
                    key={total.branch}
                    fill={
                      selectedBranch === null || total.branch === selectedBranch
                        ? "var(--color-units)"
                        : "var(--muted-foreground)"
                    }
                    fillOpacity={
                      selectedBranch === null || total.branch === selectedBranch ? 1 : 0.3
                    }
                  />
                ))}
                <LabelList
                  dataKey="units"
                  position="right"
                  offset={8}
                  className="fill-foreground tabular-nums"
                  fontSize={12}
                />
              </Bar>
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
