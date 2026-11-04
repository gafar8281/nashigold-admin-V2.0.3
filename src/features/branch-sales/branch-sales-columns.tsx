import type { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontalIcon } from "lucide-react"

import type { BranchSales } from "@/types/branch-sales"
import { formatRiyadhDateTime } from "@/lib/datetime"
import { formatAchievedPercent, formatTargetValue } from "@/lib/format"
import { BranchBadge } from "@/components/shared/BranchBadge"
import { TargetProgress } from "@/components/shared/TargetProgress"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function buildBranchSalesColumns(options: {
  onEdit: (record: BranchSales) => void
  onDelete: (record: BranchSales) => void
}): ColumnDef<BranchSales>[] {
  return [
    {
      accessorKey: "branch",
      header: "Branch",
      cell: ({ row }) => <BranchBadge branch={row.original.branch} />,
    },
    {
      accessorKey: "monthly_target",
      header: "Monthly target",
      cell: ({ row }) => formatTargetValue(row.original.monthly_target, row.original.target_unit),
    },
    {
      accessorKey: "achieved_target",
      header: "Achieved",
      cell: ({ row }) => formatTargetValue(row.original.achieved_target, row.original.target_unit),
    },
    {
      id: "progress",
      header: "Progress",
      cell: ({ row }) => (
        <TargetProgress
          className="min-w-40"
          achieved={row.original.achieved_target}
          target={row.original.monthly_target}
          unit={row.original.target_unit}
        />
      ),
    },
    {
      id: "achievedPercent",
      header: "Achieved %",
      cell: ({ row }) =>
        formatAchievedPercent(row.original.achieved_target, row.original.monthly_target),
    },
    {
      id: "updatedAt",
      header: "Updated",
      cell: ({ row }) =>
        row.original.updatedAtMs ? formatRiyadhDateTime(row.original.updatedAtMs) : "—",
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon-sm">
                <MoreHorizontalIcon />
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => options.onEdit(row.original)}>
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onClick={() => options.onDelete(row.original)}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]
}
