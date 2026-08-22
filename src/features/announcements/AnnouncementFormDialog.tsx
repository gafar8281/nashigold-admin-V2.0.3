import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { getRiyadhTodayISO } from "@/lib/datetime"
import type { Announcement } from "@/types/announcement"
import {
  announcementSchema,
  type AnnouncementFormValues,
} from "@/features/announcements/announcement-schema"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"

export function AnnouncementFormDialog({
  open,
  onOpenChange,
  announcement,
  onCreate,
  onUpdate,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  announcement?: Announcement
  onCreate: (values: Omit<Announcement, "id">) => Promise<boolean>
  onUpdate: (id: string, values: Partial<Omit<Announcement, "id">>) => Promise<boolean>
}) {
  const isEdit = !!announcement

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AnnouncementFormValues>({
    resolver: zodResolver(announcementSchema),
    defaultValues: {
      heading: announcement?.heading ?? "",
      date: announcement?.date ?? getRiyadhTodayISO(),
      content: announcement?.content ?? "",
    },
  })

  useEffect(() => {
    if (open) {
      reset({
        heading: announcement?.heading ?? "",
        date: announcement?.date ?? getRiyadhTodayISO(),
        content: announcement?.content ?? "",
      })
    }
  }, [open, announcement, reset])

  async function onSubmit(values: AnnouncementFormValues) {
    const ok = isEdit
      ? await onUpdate(announcement.id, values)
      : await onCreate(values)
    if (ok) onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit announcement" : "New announcement"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <FieldGroup>
            <Field data-invalid={!!errors.heading}>
              <FieldLabel htmlFor="heading">Heading</FieldLabel>
              <Input id="heading" {...register("heading")} />
              <FieldError>{errors.heading?.message}</FieldError>
            </Field>
            <Field data-invalid={!!errors.date}>
              <FieldLabel htmlFor="date">Date</FieldLabel>
              <Input id="date" type="date" {...register("date")} />
              <FieldError>{errors.date?.message}</FieldError>
            </Field>
            <Field data-invalid={!!errors.content}>
              <FieldLabel htmlFor="content">Content</FieldLabel>
              <Textarea id="content" rows={5} {...register("content")} />
              <FieldError>{errors.content?.message}</FieldError>
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
