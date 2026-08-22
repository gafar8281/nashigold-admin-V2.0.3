import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import {
  branchSchema,
  type BranchFormInput,
  type BranchFormValues,
} from "@/features/branches/branch-schema"
import type { Branch } from "@/types/branch"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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

interface BranchFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  branch?: Branch
  onCreate: (values: {
    id: string
    address: string
    latitude?: number
    longitude?: number
  }) => Promise<boolean>
  onUpdate: (
    id: string,
    values: { address: string; latitude?: number; longitude?: number }
  ) => Promise<boolean>
}

function buildDefaultValues(branch: Branch | undefined): BranchFormInput {
  if (branch) {
    return {
      id: branch.id,
      address: branch.address,
      latitude: branch.latitude !== undefined ? String(branch.latitude) : "",
      longitude: branch.longitude !== undefined ? String(branch.longitude) : "",
    }
  }
  return { id: "", address: "", latitude: "", longitude: "" }
}

export function BranchFormDialog({
  open,
  onOpenChange,
  branch,
  onCreate,
  onUpdate,
}: BranchFormDialogProps) {
  const isEdit = !!branch

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BranchFormInput, unknown, BranchFormValues>({
    resolver: zodResolver(branchSchema),
    defaultValues: buildDefaultValues(branch),
  })

  useEffect(() => {
    if (open) {
      reset(buildDefaultValues(branch))
    }
  }, [open, branch, reset])

  async function onSubmit(values: BranchFormValues) {
    const ok = isEdit
      ? await onUpdate(branch.id, {
          address: values.address ?? "",
          latitude: values.latitude,
          longitude: values.longitude,
        })
      : await onCreate({
          id: values.id,
          address: values.address ?? "",
          latitude: values.latitude,
          longitude: values.longitude,
        })

    if (ok) onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit branch" : "Add branch"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <FieldGroup>
            <Field data-invalid={!!errors.id}>
              <FieldLabel htmlFor="id">Branch code</FieldLabel>
              <Input id="id" disabled={isEdit} {...register("id")} />
              <FieldError>{errors.id?.message}</FieldError>
              {isEdit && (
                <FieldDescription>Branch code can't be changed after creation.</FieldDescription>
              )}
            </Field>

            <Field data-invalid={!!errors.address}>
              <FieldLabel htmlFor="address">Address</FieldLabel>
              <Input id="address" {...register("address")} />
              <FieldError>{errors.address?.message}</FieldError>
            </Field>

            <Field data-invalid={!!errors.latitude}>
              <FieldLabel htmlFor="latitude">Latitude</FieldLabel>
              <Input
                id="latitude"
                type="number"
                step="any"
                placeholder="e.g. 25.373232"
                {...register("latitude")}
              />
              <FieldError>{errors.latitude?.message}</FieldError>
            </Field>

            <Field data-invalid={!!errors.longitude}>
              <FieldLabel htmlFor="longitude">Longitude</FieldLabel>
              <Input
                id="longitude"
                type="number"
                step="any"
                placeholder="e.g. 49.588916"
                {...register("longitude")}
              />
              <FieldError>{errors.longitude?.message}</FieldError>
            </Field>
          </FieldGroup>

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
