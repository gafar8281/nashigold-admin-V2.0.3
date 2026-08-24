import { useEffect } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { useBranches } from "@/hooks/use-branches"
import { DEFAULT_SECONDARY_ADMIN_PERMISSIONS } from "@/lib/permissions"
import type { SecondaryAdminWriteValues } from "@/lib/firestore/users"
import {
  userSchema,
  type UserFormInput,
  type UserFormValues,
} from "@/features/users/user-schema"
import { PermissionToggles } from "@/features/users/PermissionToggles"
import type { AdminUser } from "@/types/user"
import { BranchBadge } from "@/components/shared/BranchBadge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"

interface UserFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user?: AdminUser
  onCreate: (values: SecondaryAdminWriteValues) => Promise<boolean>
  onUpdate: (id: string, values: Partial<SecondaryAdminWriteValues>) => Promise<boolean>
}

function buildDefaultValues(user: AdminUser | undefined): UserFormInput {
  if (user) {
    return {
      email: user.email,
      password: "",
      managedBranches: user.managedBranches ?? [],
      permissions: user.permissions ?? DEFAULT_SECONDARY_ADMIN_PERMISSIONS,
    }
  }
  return {
    email: "",
    password: "",
    managedBranches: [],
    permissions: DEFAULT_SECONDARY_ADMIN_PERMISSIONS,
  }
}

export function UserFormDialog({
  open,
  onOpenChange,
  user,
  onCreate,
  onUpdate,
}: UserFormDialogProps) {
  const isEdit = !!user
  const { branches, isLoading: branchesLoading } = useBranches()

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<UserFormInput, unknown, UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: buildDefaultValues(user),
  })

  useEffect(() => {
    if (open) {
      reset(buildDefaultValues(user))
    }
  }, [open, user, reset])

  async function onSubmit(values: UserFormValues) {
    if (!isEdit && !values.password) {
      setError("password", { message: "Password is required for new users." })
      return
    }

    const payload: SecondaryAdminWriteValues = {
      email: values.email,
      managedBranches: values.managedBranches,
      permissions: {
        dashboard: { scopeToManagedBranches: true },
        employees: values.permissions.employees,
        branches: { enabled: false },
        attendance: { scopeToManagedBranches: true },
        leaveRequests: { ...values.permissions.leaveRequests, scopeToManagedBranches: true },
        complaints: { enabled: false },
        announcements: values.permissions.announcements,
      },
      ...(values.password ? { password: values.password } : {}),
    }

    const ok = isEdit ? await onUpdate(user.id, payload) : await onCreate(payload)
    if (ok) onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg grid-rows-[auto_minmax(0,1fr)] overflow-y-hidden">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit user" : "Add user"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex min-h-0 flex-col">
          <FieldGroup className="-mx-4 min-h-0 flex-1 overflow-y-auto overscroll-contain px-4">
            <Field data-invalid={!!errors.email}>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input id="email" type="email" {...register("email")} />
              <FieldError>{errors.email?.message}</FieldError>
            </Field>

            <Field data-invalid={!!errors.password}>
              <FieldLabel htmlFor="password">
                {isEdit ? "New password" : "Password"}
              </FieldLabel>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                placeholder={isEdit ? "Leave blank to keep unchanged" : undefined}
                {...register("password")}
              />
              <FieldError>{errors.password?.message}</FieldError>
            </Field>

            <Field data-invalid={!!errors.managedBranches}>
              <FieldLabel>Managed branches</FieldLabel>
              <Controller
                control={control}
                name="managedBranches"
                render={({ field }) => (
                  <>
                    <ScrollArea className="h-40 rounded-lg border">
                      <div className="flex flex-col gap-2 p-3">
                        {branchesLoading ? (
                          <p className="text-sm text-muted-foreground">Loading branches…</p>
                        ) : branches.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No branches yet.</p>
                        ) : (
                          branches.map((branch) => {
                            const checked = field.value.includes(branch.id)
                            return (
                              <label
                                key={branch.id}
                                className="flex items-center gap-2 text-sm"
                              >
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={(next) => {
                                    field.onChange(
                                      next
                                        ? [...field.value, branch.id]
                                        : field.value.filter((b: string) => b !== branch.id)
                                    )
                                  }}
                                />
                                {branch.id}
                              </label>
                            )
                          })
                        )}
                      </div>
                    </ScrollArea>
                    {field.value.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {field.value.map((branch: string) => (
                          <BranchBadge key={branch} branch={branch} />
                        ))}
                      </div>
                    )}
                  </>
                )}
              />
              <FieldError>{errors.managedBranches?.message}</FieldError>
              <FieldDescription>Branches this admin will oversee.</FieldDescription>
            </Field>

            <Field>
              <FieldLabel>Access control rules</FieldLabel>
              <PermissionToggles control={control} />
            </Field>
          </FieldGroup>

          <DialogFooter className="shrink-0">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
