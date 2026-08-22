import type { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontalIcon } from "lucide-react"

import type { Branch } from "@/types/branch"
import { formatRiyadhDateTime } from "@/lib/datetime"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function buildBranchColumns(options: {
  onEdit: (branch: Branch) => void
  onDelete: (branch: Branch) => void
}): ColumnDef<Branch>[] {
  return [
    {
      accessorKey: "id",
      header: "Code",
    },
    {
      accessorKey: "address",
      header: "Address",
      cell: ({ row }) => row.original.address || "—",
    },
    {
      accessorKey: "latitude",
      header: "Latitude",
      cell: ({ row }) => row.original.latitude ?? "—",
    },
    {
      accessorKey: "longitude",
      header: "Longitude",
      cell: ({ row }) => row.original.longitude ?? "—",
    },
    {
      id: "createdDate",
      header: "Created",
      cell: ({ row }) =>
        row.original.createdDateMs ? formatRiyadhDateTime(row.original.createdDateMs) : "—",
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
