import type { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontalIcon } from "lucide-react"

import type { AdminUser } from "@/types/user"
import { BranchBadge } from "@/components/shared/BranchBadge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

function summarizeCrud(flags: { add: boolean; edit: boolean; delete: boolean }): string {
  const parts = [
    flags.add && "Add",
    flags.edit && "Edit",
    flags.delete && "Delete",
  ].filter(Boolean)
  return parts.length > 0 ? parts.join(" · ") : "—"
}

export function buildUserColumns(options: {
  onEdit: (user: AdminUser) => void
  onDelete: (user: AdminUser) => void
}): ColumnDef<AdminUser>[] {
  return [
    {
      accessorKey: "email",
      header: "Email",
    },
    {
      id: "managedBranches",
      header: "Managed branches",
      cell: ({ row }) =>
        row.original.managedBranches && row.original.managedBranches.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {row.original.managedBranches.map((branch) => (
              <BranchBadge key={branch} branch={branch} />
            ))}
          </div>
        ) : (
          "—"
        ),
    },
    {
      id: "dashboard",
      header: "Dashboard",
      cell: ({ row }) =>
        row.original.permissions?.dashboard.enabled ? "Enabled" : "—",
    },
    {
      id: "employees",
      header: "Employees",
      cell: ({ row }) => {
        const employees = row.original.permissions?.employees
        if (!employees?.enabled) return "—"
        const crud = summarizeCrud(employees)
        return crud === "—" ? "View" : `View · ${crud}`
      },
    },
    {
      id: "inventory",
      header: "Inventory",
      cell: ({ row }) => {
        const inventory = row.original.permissions?.inventory
        if (!inventory?.enabled) return "—"
        return inventory.upload ? "View · Upload" : "View"
      },
    },
    {
      id: "attendance",
      header: "Attendance",
      cell: ({ row }) =>
        row.original.permissions?.attendance.enabled ? "Enabled" : "—",
    },
    {
      id: "leaveRequests",
      header: "Leave Requests",
      cell: ({ row }) =>
        row.original.permissions?.leaveRequests.enabled ? "Enabled" : "—",
    },
    {
      id: "announcements",
      header: "Announcements",
      cell: ({ row }) => {
        const announcements = row.original.permissions?.announcements
        if (!announcements?.enabled) return "—"
        const crud = summarizeCrud(announcements)
        return crud === "—" ? "View" : `View · ${crud}`
      },
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
