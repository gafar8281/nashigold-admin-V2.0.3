import { useEffect, useMemo } from "react"
import { Link } from "react-router-dom"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { TARGET_UNITS } from "@/lib/constants"
import { useBranches } from "@/hooks/use-branches"
import {
  branchSalesSchema,
  type BranchSalesFormInput,
  type BranchSalesFormValues,
} from "@/features/branch-sales/branch-sales-schema"
import type { BranchSales, BranchSalesWriteValues } from "@/types/branch-sales"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface BranchSalesFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  record?: BranchSales
  /** Branches that already have a record — not offered when creating. */
  usedBranches: string[]
  onCreate: (values: BranchSalesWriteValues) => Promise<boolean>
  onUpdate: (branch: string, values: Omit<BranchSalesWriteValues, "branch">) => Promise<boolean>
}

function buildDefaultValues(record: BranchSales | undefined): BranchSalesFormInput {
  if (record) {
    return {
      branch: record.branch,
      monthly_target: record.monthly_target,
      achieved_target: record.achieved_target,
      target_unit: record.target_unit,
    }
  }
  return { branch: "", monthly_target: 0, achieved_target: 0, target_unit: "SAR" }
}

export function BranchSalesFormDialog({
  open,
  onOpenChange,
  record,
  usedBranches,
  onCreate,
  onUpdate,
}: BranchSalesFormDialogProps) {
  const isEdit = !!record
  const { branches: allBranches, isLoading: branchesLoading } = useBranches()

  const branchOptions = useMemo(
    () =>
      isEdit
        ? [record.branch]
        : allBranches.map((b) => b.id).filter((id) => !usedBranches.includes(id)),
    [isEdit, record, allBranches, usedBranches]
  )

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BranchSalesFormInput, unknown, BranchSalesFormValues>({
    resolver: zodResolver(branchSalesSchema),
    defaultValues: buildDefaultValues(record),
  })

  useEffect(() => {
    if (open) {
      reset(buildDefaultValues(record))
    }
  }, [open, record, reset])

  async function onSubmit(values: BranchSalesFormValues) {
    const ok = isEdit
      ? await onUpdate(record.branch, {
          monthly_target: values.monthly_target,
          achieved_target: values.achieved_target,
          target_unit: values.target_unit,
        })
      : await onCreate(values)
    if (ok) onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit online sales" : "Add online sales"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <FieldGroup>
            <Field data-invalid={!!errors.branch}>
              <FieldLabel htmlFor="branch">Branch</FieldLabel>
              <Controller
                control={control}
                name="branch"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(value) => field.onChange(value ?? "")}
                    disabled={isEdit || branchesLoading}
                  >
                    <SelectTrigger id="branch" className="w-full">
                      <SelectValue
                        placeholder={branchesLoading ? "Loading branches…" : "Select a branch"}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {branchOptions.length === 0 ? (
                        <SelectItem value="" disabled>
                          No branches available
                        </SelectItem>
                      ) : (
                        branchOptions.map((id) => (
                          <SelectItem key={id} value={id}>
                            {id}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError>{errors.branch?.message}</FieldError>
              {isEdit ? (
                <FieldDescription>Branch can't be changed after creation.</FieldDescription>
              ) : (
                !branchesLoading &&
                allBranches.length === 0 && (
                  <FieldDescription>
                    No branches yet — add one on the <Link to="/branches">Branches page</Link>.
                  </FieldDescription>
                )
              )}
            </Field>

            <div className="grid grid-cols-3 gap-3">
              <Field className="col-span-2" data-invalid={!!errors.monthly_target}>
                <FieldLabel htmlFor="monthly_target">Monthly target</FieldLabel>
                <Input id="monthly_target" type="number" step="any" {...register("monthly_target")} />
                <FieldError>{errors.monthly_target?.message}</FieldError>
              </Field>
              <Field data-invalid={!!errors.target_unit}>
                <FieldLabel htmlFor="target_unit">Unit</FieldLabel>
                <Controller
                  control={control}
                  name="target_unit"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="target_unit" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TARGET_UNITS.map((unit) => (
                          <SelectItem key={unit} value={unit}>
                            {unit}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldError>{errors.target_unit?.message}</FieldError>
              </Field>
            </div>

            <Field data-invalid={!!errors.achieved_target}>
              <FieldLabel htmlFor="achieved_target">Achieved</FieldLabel>
              <Input id="achieved_target" type="number" step="any" {...register("achieved_target")} />
              <FieldError>{errors.achieved_target?.message}</FieldError>
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
