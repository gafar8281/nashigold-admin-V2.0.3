import { useEffect } from "react"
import { Link } from "react-router-dom"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { JOB_TITLES, TARGET_UNITS } from "@/lib/constants"
import { suggestNextEmployeeId } from "@/lib/firestore/employees"
import type { EmployeeUpdateValues } from "@/lib/firestore/employees"
import type { Employee, EmployeeWritePayload } from "@/types/employee"
import { useBranches } from "@/hooks/use-branches"
import {
  employeeSchema,
  type EmployeeFormInput,
  type EmployeeFormValues,
} from "@/features/employees/employee-schema"
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

interface EmployeeFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  employee?: Employee
  existingEmployees: Employee[]
  onCreate: (payload: EmployeeWritePayload) => Promise<boolean>
  onUpdate: (id: string, values: EmployeeUpdateValues) => Promise<boolean>
}

function buildDefaultValues(
  employee: Employee | undefined,
  existingEmployees: Employee[]
): EmployeeFormInput {
  if (employee) {
    return { ...employee, password: "" }
  }
  return {
    id: suggestNextEmployeeId(existingEmployees),
    name: "",
    job_title: "Branch Manager",
    branch: "",
    monthly_target: 0,
    target_unit: "SAR",
    target_achieved: 0,
    email: "",
    contact: "",
    password: "",
  }
}

export function EmployeeFormDialog({
  open,
  onOpenChange,
  employee,
  existingEmployees,
  onCreate,
  onUpdate,
}: EmployeeFormDialogProps) {
  const isEdit = !!employee
  const { branches, isLoading: branchesLoading } = useBranches()

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<EmployeeFormInput, unknown, EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
    defaultValues: buildDefaultValues(employee, existingEmployees),
  })

  useEffect(() => {
    if (open) {
      reset(buildDefaultValues(employee, existingEmployees))
    }
    // existingEmployees intentionally omitted — only used to seed a
    // suggested id when the dialog opens, not on every list update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, employee, reset])

  const watchedBranch = watch("branch")

  async function onSubmit(values: EmployeeFormValues) {
    if (!isEdit && !values.password) {
      setError("password", { message: "Password is required for new employees." })
      return
    }

    if (branches.length > 0 && !branches.some((b) => b.id === values.branch)) {
      setError("branch", {
        message: `Branch "${values.branch}" no longer exists — pick a current branch.`,
      })
      return
    }

    const ok = isEdit
      ? await onUpdate(values.id, {
          name: values.name,
          job_title: values.job_title,
          branch: values.branch,
          monthly_target: values.monthly_target,
          target_unit: values.target_unit,
          target_achieved: values.target_achieved,
          email: values.email,
          contact: values.contact,
          ...(values.password ? { password: values.password } : {}),
        })
      : await onCreate(values as EmployeeWritePayload)

    if (ok) onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit employee" : "Add employee"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <FieldGroup>
            <div className="grid grid-cols-2 gap-3">
              <Field data-invalid={!!errors.id}>
                <FieldLabel htmlFor="id">Employee id</FieldLabel>
                <Input id="id" disabled={isEdit} {...register("id")} />
                <FieldError>{errors.id?.message}</FieldError>
              </Field>
              <Field data-invalid={!!errors.branch}>
                <FieldLabel htmlFor="branch">Branch</FieldLabel>
                <Controller
                  control={control}
                  name="branch"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(value) => field.onChange(value ?? "")}
                      disabled={branchesLoading}
                    >
                      <SelectTrigger id="branch" className="w-full">
                        <SelectValue
                          placeholder={
                            branchesLoading ? "Loading branches…" : "Select a branch"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {branchesLoading ? (
                          <SelectItem value="" disabled>
                            Loading branches…
                          </SelectItem>
                        ) : branches.length === 0 ? (
                          <SelectItem value="" disabled>
                            No branches yet
                          </SelectItem>
                        ) : (
                          branches.map((branch) => (
                            <SelectItem key={branch.id} value={branch.id}>
                              {branch.id}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldError>{errors.branch?.message}</FieldError>
                {!branchesLoading && branches.length === 0 && (
                  <FieldDescription>
                    No branches yet — add one on the{" "}
                    <Link to="/branches">Branches page</Link>.
                  </FieldDescription>
                )}
                {!branchesLoading &&
                  branches.length > 0 &&
                  watchedBranch &&
                  !branches.some((b) => b.id === watchedBranch) && (
                    <FieldDescription>
                      This branch no longer exists. Choose a current one.
                    </FieldDescription>
                  )}
              </Field>
            </div>

            <Field data-invalid={!!errors.name}>
              <FieldLabel htmlFor="name">Name</FieldLabel>
              <Input id="name" {...register("name")} />
              <FieldError>{errors.name?.message}</FieldError>
            </Field>

            <Field data-invalid={!!errors.job_title}>
              <FieldLabel htmlFor="job_title">Job title</FieldLabel>
              <Controller
                control={control}
                name="job_title"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="job_title" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {JOB_TITLES.map((title) => (
                        <SelectItem key={title} value={title}>
                          {title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError>{errors.job_title?.message}</FieldError>
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

            <Field data-invalid={!!errors.target_achieved}>
              <FieldLabel htmlFor="target_achieved">Target achieved</FieldLabel>
              <Input id="target_achieved" type="number" step="any" {...register("target_achieved")} />
              <FieldError>{errors.target_achieved?.message}</FieldError>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field data-invalid={!!errors.email}>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input id="email" type="email" {...register("email")} />
                <FieldError>{errors.email?.message}</FieldError>
              </Field>
              <Field data-invalid={!!errors.contact}>
                <FieldLabel htmlFor="contact">Contact</FieldLabel>
                <Input id="contact" {...register("contact")} />
                <FieldError>{errors.contact?.message}</FieldError>
              </Field>
            </div>

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
