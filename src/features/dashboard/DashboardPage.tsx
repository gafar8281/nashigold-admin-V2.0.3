import { useMemo, useState } from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent"

import { useDashboardData } from "@/features/dashboard/use-dashboard-data"
import { computeBranchPerformance, toChartData } from "@/features/dashboard/branch-performance"
import { useBranchScope } from "@/hooks/use-branch-scope"
import { formatCalendarDate } from "@/lib/datetime"
import { formatTargetAxisValue, formatTargetValue } from "@/lib/format"
import { TARGET_UNITS, type TargetUnit } from "@/lib/constants"
import { PageHeader } from "@/components/layout/PageHeader"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"

const chartConfig = {
  target: {
    label: "Target",
    theme: { light: "#2563eb", dark: "#60a5fa" },
  },
  achieved: {
    label: "Achieved",
    theme: { light: "#22c55e", dark: "#4ade80" },
  },
} satisfies ChartConfig

export function DashboardPage() {
  const {
    employees,
    headcount,
    attendanceSummary,
    recentAnnouncements,
    pendingLeaveCount,
    isLoading,
    error,
  } = useDashboardData()

  const [unit, setUnit] = useState<TargetUnit>("Grams")
  const { managedBranches } = useBranchScope()

  const branchPerformance = useMemo(() => computeBranchPerformance(employees), [employees])
  const chartData = useMemo(() => toChartData(branchPerformance, unit), [branchPerformance, unit])

  const description =
    managedBranches === null
      ? "Headcount, attendance, and branch performance at a glance."
      : `Headcount, attendance, and branch performance for ${managedBranches.join(", ")}.`

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Dashboard" description={description} />

      {error && (
        <p className="text-sm text-destructive">Couldn't load dashboard data: {error}</p>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <StatCard label="Headcount" value={headcount} isLoading={isLoading} />
        <StatCard
          label="Present today"
          value={attendanceSummary?.Present}
          isLoading={isLoading}
        />
        <StatCard
          label="Absent today"
          value={attendanceSummary?.Absent}
          isLoading={isLoading}
        />
        {/* <StatCard label="Late today" value={attendanceSummary?.Late} isLoading={isLoading} /> */}
        <StatCard
          label="Pending leave"
          value={pendingLeaveCount ?? undefined}
          isLoading={isLoading}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Branch performance</CardTitle>
          <CardDescription>
            Monthly target vs. achieved, by branch. Only employees targeted in {unit} are
            counted.
          </CardDescription>
          <CardAction>
            <Select value={unit} onValueChange={(value) => setUnit((value as TargetUnit) ?? "Grams")}>
              <SelectTrigger size="sm" className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TARGET_UNITS.map((targetUnit) => (
                  <SelectItem key={targetUnit} value={targetUnit}>
                    {targetUnit}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardAction>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : employees.length === 0 ? (
            <p className="text-sm text-muted-foreground">No employee data yet.</p>
          ) : chartData.length === 0 ? (
            <p className="text-sm text-muted-foreground">No branches have targets in {unit}.</p>
          ) : (
            <ChartContainer config={chartConfig} className="aspect-auto h-64 w-full">
              <BarChart accessibilityLayer data={chartData}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="branch" tickLine={false} tickMargin={10} axisLine={false} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={48}
                  tickFormatter={(value) => formatTargetAxisValue(value, unit)}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value: ValueType | undefined, name: NameType | undefined) => (
                        <div className="flex w-full items-center justify-between gap-4">
                          <span className="text-muted-foreground">
                            {chartConfig[name as keyof typeof chartConfig]?.label ?? name}
                          </span>
                          <span className="font-mono font-medium text-foreground tabular-nums">
                            {formatTargetValue(Number(value), unit)}
                          </span>
                        </div>
                      )}
                    />
                  }
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="target" fill="var(--color-target)" radius={4} />
                <Bar dataKey="achieved" fill="var(--color-achieved)" radius={4} />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent announcements</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : recentAnnouncements.length === 0 ? (
            <p className="text-sm text-muted-foreground">No announcements yet.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {recentAnnouncements.map((announcement) => (
                <div key={announcement.id}>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-medium">{announcement.heading}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatCalendarDate(announcement.date)}
                    </span>
                  </div>
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {announcement.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({
  label,
  value,
  isLoading,
}: {
  label: string
  value: number | undefined
  isLoading: boolean
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <span className="text-2xl font-semibold">{value ?? "—"}</span>
        )}
      </CardContent>
    </Card>
  )
}
