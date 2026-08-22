import { useMemo, useState } from "react"
import { flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table"
import { PlusIcon } from "lucide-react"

import { useBranches } from "@/hooks/use-branches"
import { buildBranchColumns } from "@/features/branches/branch-columns"
import { BranchFormDialog } from "@/features/branches/BranchFormDialog"
import type { Branch } from "@/types/branch"
import { PageHeader } from "@/components/layout/PageHeader"
import { ConfirmDeleteDialog } from "@/components/shared/ConfirmDeleteDialog"
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

export function BranchesPage() {
  const {
    branches,
    isLoading,
    error,
    addBranch,
    editBranch,
    removeBranch,
    seedBranches,
  } = useBranches()

  const [formOpen, setFormOpen] = useState(false)
  const [editingBranch, setEditingBranch] = useState<Branch | undefined>()
  const [deletingBranch, setDeletingBranch] = useState<Branch | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSeeding, setIsSeeding] = useState(false)

  const columns = useMemo(
    () =>
      buildBranchColumns({
        onEdit: (branch) => {
          setEditingBranch(branch)
          setFormOpen(true)
        },
        onDelete: (branch) => setDeletingBranch(branch),
      }),
    []
  )

  const table = useReactTable({
    data: branches,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  async function handleConfirmDelete() {
    if (!deletingBranch) return
    setIsDeleting(true)
    const ok = await removeBranch(deletingBranch.id)
    setIsDeleting(false)
    if (ok) setDeletingBranch(null)
  }

  async function handleSeed() {
    setIsSeeding(true)
    await seedBranches()
    setIsSeeding(false)
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Branches"
        description="Manage the branch directory used across employees and attendance."
        action={
          <Button
            onClick={() => {
              setEditingBranch(undefined)
              setFormOpen(true)
            }}
          >
            <PlusIcon /> Add branch
          </Button>
        }
      />

      {error && (
        <p className="text-sm text-destructive">Couldn't load branches: {error}</p>
      )}

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : branches.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-xl border p-6">
          <p className="text-sm text-muted-foreground">No branches yet.</p>
          <Button variant="outline" onClick={handleSeed} disabled={isSeeding}>
            {isSeeding ? "Seeding…" : "Seed default branches"}
          </Button>
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

      <BranchFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        branch={editingBranch}
        onCreate={addBranch}
        onUpdate={editBranch}
      />

      <ConfirmDeleteDialog
        open={!!deletingBranch}
        onOpenChange={(open) => !open && setDeletingBranch(null)}
        title="Delete branch"
        description={`This will permanently remove branch "${deletingBranch?.id ?? ""}".`}
        onConfirm={handleConfirmDelete}
        isConfirming={isDeleting}
      />
    </div>
  )
}
