import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { JOB_TITLES, TARGET_UNITS } from "@/lib/constants"
import { fetchNextEmployeeId } from "@/lib/firestore/employees"
import type { EmployeeUpdateValues } from "@/lib/firestore/employees"
import type { Employee, EmployeeWritePayload } from "@/types/employee"
import { useBranches } from "@/hooks/use-branches"
import { useBranchScope } from "@/hooks/use-branch-scope"
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
  onCreate: (payload: EmployeeWritePayload) => Promise<boolean>
  onUpdate: (id: string, values: EmployeeUpdateValues) => Promise<boolean>
}

function buildDefaultValues(employee: Employee | undefined): EmployeeFormInput {
  if (employee) {
    return { ...employee, password: "" }
  }
  return {
    id: "",
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
  onCreate,
  onUpdate,
}: EmployeeFormDialogProps) {
  const isEdit = !!employee
  // Scoped to the current user's managedBranches so a branch admin editing
  // an employee can't move them into (or leave them assigned to) a branch
  // outside their own scope. useBranches() supplies isLoading — same
  // context, no extra Firestore read.
  const { isLoading: branchesLoading } = useBranches()
  const { branches } = useBranchScope()

  const [idStatus, setIdStatus] = useState<"idle" | "loading" | "error">("idle")

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<EmployeeFormInput, unknown, EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
    defaultValues: buildDefaultValues(employee),
  })

  useEffect(() => {
    if (!open) return
    reset(buildDefaultValues(employee))
    if (employee) return

    let cancelled = false
    setIdStatus("loading")
    fetchNextEmployeeId()
      .then((id) => {
        if (cancelled) return
        setValue("id", id)
        setIdStatus("idle")
      })
      .catch(() => {
        if (cancelled) return
        setIdStatus("error")
      })
    return () => {
      cancelled = true
    }
  }, [open, employee, reset, setValue])

  function retryFetchId() {
    setIdStatus("loading")
    fetchNextEmployeeId()
      .then((id) => {
        setValue("id", id)
        setIdStatus("idle")
      })
      .catch(() => setIdStatus("error"))
  }

  const watchedBranch = watch("branch")

  async function onSubmit(values: EmployeeFormValues) {
    if (!isEdit && !values.password) {
      setError("password", { message: "Password is required for new employees." })
      return
    }

    if (!isEdit && !values.id) {
      setError("id", { message: "Employee id is still being generated — please wait." })
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

    if (ok) {
      onOpenChange(false)
    } else if (!isEdit) {
      // Most likely cause of a failed create is an id collision (e.g. two
      // admins adding at once) — refresh so a retry gets a free id.
      retryFetchId()
    }
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
                <Input
                  id="id"
                  disabled
                  placeholder={!isEdit && idStatus === "loading" ? "Generating…" : undefined}
                  {...register("id")}
                />
                {!isEdit && idStatus === "error" && (
                  <FieldDescription className="text-destructive">
                    Couldn't generate an id.{" "}
                    <button
                      type="button"
                      className="underline underline-offset-2"
                      onClick={retryFetchId}
                    >
                      Retry
                    </button>
                  </FieldDescription>
                )}
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
            <Button
              type="submit"
              disabled={isSubmitting || (!isEdit && idStatus !== "idle")}
            >
              {isSubmitting ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
