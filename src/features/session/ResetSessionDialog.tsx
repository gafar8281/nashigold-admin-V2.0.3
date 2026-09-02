import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import {
  resetSessionSchema,
  type ResetSessionFormInput,
  type ResetSessionFormValues,
} from "@/features/session/reset-session-schema"
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

interface ResetSessionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onReset: (employeeId: string) => Promise<boolean>
}

export function ResetSessionDialog({ open, onOpenChange, onReset }: ResetSessionDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ResetSessionFormInput, unknown, ResetSessionFormValues>({
    resolver: zodResolver(resetSessionSchema),
    defaultValues: { employeeId: "" },
  })

  useEffect(() => {
    if (open) {
      reset({ employeeId: "" })
    }
  }, [open, reset])

  async function onSubmit(values: ResetSessionFormValues) {
    const ok = await onReset(values.employeeId)
    if (ok) onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Reset employee session</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <FieldGroup>
            <Field data-invalid={!!errors.employeeId}>
              <FieldLabel htmlFor="employeeId">Employee ID</FieldLabel>
              <Input id="employeeId" autoFocus {...register("employeeId")} />
              <FieldError>{errors.employeeId?.message}</FieldError>
              <FieldDescription>
                Clears the employee's active device session so they can sign in on a new
                device.
              </FieldDescription>
            </Field>
          </FieldGroup>

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Clearing…" : "OK"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
