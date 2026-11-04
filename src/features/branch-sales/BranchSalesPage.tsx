import { useMemo, useState } from "react"
import { flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table"
import { PlusIcon } from "lucide-react"

import { useBranches } from "@/hooks/use-branches"
import { useBranchSales } from "@/features/branch-sales/use-branch-sales"
import { buildBranchSalesColumns } from "@/features/branch-sales/branch-sales-columns"
import { BranchSalesFormDialog } from "@/features/branch-sales/BranchSalesFormDialog"
import { TARGET_UNITS } from "@/lib/constants"
import type { BranchSales } from "@/types/branch-sales"
import { PageHeader } from "@/components/layout/PageHeader"
import { ConfirmDeleteDialog } from "@/components/shared/ConfirmDeleteDialog"
import { TargetProgress } from "@/components/shared/TargetProgress"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export function BranchSalesPage() {
  const { records, isLoading, error, addRecord, editRecord, removeRecord } = useBranchSales()
  const { branches } = useBranches()

  const [formOpen, setFormOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<BranchSales | undefined>()
  const [deletingRecord, setDeletingRecord] = useState<BranchSales | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const usedBranches = useMemo(() => records.map((r) => r.branch), [records])
  const allBranchesUsed =
    branches.length > 0 && branches.every((b) => usedBranches.includes(b.id))

  // SAR and Grams are summed separately — never mixed into one total.
  const totals = useMemo(
    () =>
      TARGET_UNITS.map((unit) => {
        const inUnit = records.filter((r) => r.target_unit === unit)
        return {
          unit,
          count: inUnit.length,
          target: inUnit.reduce((sum, r) => sum + r.monthly_target, 0),
          achieved: inUnit.reduce((sum, r) => sum + r.achieved_target, 0),
        }
      }).filter((t) => t.count > 0),
    [records]
  )

  const columns = useMemo(
    () =>
      buildBranchSalesColumns({
        onEdit: (record) => {
          setEditingRecord(record)
          setFormOpen(true)
        },
        onDelete: (record) => setDeletingRecord(record),
      }),
    []
  )

  const table = useReactTable({
    data: records,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  async function handleConfirmDelete() {
    if (!deletingRecord) return
    setIsDeleting(true)
    const ok = await removeRecord(deletingRecord.branch)
    setIsDeleting(false)
    if (ok) setDeletingRecord(null)
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Online Branch Sales"
        description="Track online sales targets and progress per branch."
        action={
          <Button
            disabled={allBranchesUsed}
            onClick={() => {
              setEditingRecord(undefined)
              setFormOpen(true)
            }}
          >
            <PlusIcon /> Add record
          </Button>
        }
      />

      {error && (
        <p className="text-sm text-destructive">Couldn't load online branch sales: {error}</p>
      )}

      {!isLoading && totals.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {totals.map((t) => (
            <div key={t.unit} className="flex flex-col gap-2 rounded-xl border p-4">
              <p className="text-sm font-medium">
                Total ({t.unit}) · {t.count} branch{t.count === 1 ? "" : "es"}
              </p>
              <TargetProgress achieved={t.achieved} target={t.target} unit={t.unit} />
            </div>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : records.length === 0 ? (
        <div className="rounded-xl border p-6">
          <p className="text-sm text-muted-foreground">No online sales records yet.</p>
        </div>
      ) : (
        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <BranchSalesFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        record={editingRecord}
        usedBranches={usedBranches}
        onCreate={addRecord}
        onUpdate={editRecord}
      />

      <ConfirmDeleteDialog
        open={!!deletingRecord}
        onOpenChange={(open) => !open && setDeletingRecord(null)}
        title="Delete online sales record"
        description={`This will permanently remove the online sales record for branch "${deletingRecord?.branch ?? ""}".`}
        onConfirm={handleConfirmDelete}
        isConfirming={isDeleting}
      />
    </div>
  )
}
