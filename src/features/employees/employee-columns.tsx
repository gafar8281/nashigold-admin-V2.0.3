import type { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontalIcon } from "lucide-react"

import type { Employee } from "@/types/employee"
import { BranchBadge } from "@/components/shared/BranchBadge"
import { TargetProgress } from "@/components/shared/TargetProgress"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function buildEmployeeColumns(options: {
  onEdit: (employee: Employee) => void
  onDelete: (employee: Employee) => void
  canManage: boolean
}): ColumnDef<Employee>[] {
  const columns: ColumnDef<Employee>[] = [
    {
      accessorKey: "id",
      header: "ID",
    },
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.name}</div>
          <div className="text-xs text-muted-foreground">{row.original.job_title}</div>
        </div>
      ),
    },
    {
      accessorKey: "branch",
      header: "Branch",
      cell: ({ row }) => <BranchBadge branch={row.original.branch} />,
    },
    {
      id: "progress",
      header: "Target progress",
      cell: ({ row }) => (
        <TargetProgress
          achieved={row.original.target_achieved}
          target={row.original.monthly_target}
          unit={row.original.target_unit}
          className="min-w-40"
        />
      ),
    },
    {
      accessorKey: "email",
      header: "Contact",
      cell: ({ row }) => (
        <div>
          <div>{row.original.email || "—"}</div>
          <div className="text-xs text-muted-foreground">{row.original.contact || "—"}</div>
        </div>
      ),
    },
  ]

  if (!options.canManage) return columns

  columns.push({
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
  })

  return columns
}
