import { useMemo, useState } from "react"
import { flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table"
import { PlusIcon } from "lucide-react"

import { useUsers } from "@/features/users/use-users"
import { buildUserColumns } from "@/features/users/user-columns"
import { UserFormDialog } from "@/features/users/UserFormDialog"
import type { AdminUser } from "@/types/user"
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

export function UsersPage() {
  const { users, isLoading, error, addUser, editUser, removeUser } = useUsers()

  const [formOpen, setFormOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<AdminUser | undefined>()
  const [deletingUser, setDeletingUser] = useState<AdminUser | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const columns = useMemo(
    () =>
      buildUserColumns({
        onEdit: (user) => {
          setEditingUser(user)
          setFormOpen(true)
        },
        onDelete: (user) => setDeletingUser(user),
      }),
    []
  )

  const table = useReactTable({ data: users, columns, getCoreRowModel: getCoreRowModel() })

  async function handleConfirmDelete() {
    if (!deletingUser) return
    setIsDeleting(true)
    const ok = await removeUser(deletingUser.id)
    setIsDeleting(false)
    if (ok) setDeletingUser(null)
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Add Users"
        description="Create and manage branch admin accounts, their managed branches, and access."
        action={
          <Button
            onClick={() => {
              setEditingUser(undefined)
              setFormOpen(true)
            }}
          >
            <PlusIcon /> Add user
          </Button>
        }
      />

      {error && <p className="text-sm text-destructive">Couldn't load users: {error}</p>}

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <div className="rounded-xl border p-6 text-center text-sm text-muted-foreground">
          No branch admins yet.
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

      <UserFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        user={editingUser}
        onCreate={addUser}
        onUpdate={editUser}
      />

      <ConfirmDeleteDialog
        open={!!deletingUser}
        onOpenChange={(open) => !open && setDeletingUser(null)}
        title="Delete user"
        description={`This will permanently remove "${deletingUser?.email ?? ""}" and revoke their access.`}
        onConfirm={handleConfirmDelete}
        isConfirming={isDeleting}
      />
    </div>
  )
}
