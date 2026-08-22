import { z } from "zod"

export const announcementSchema = z.object({
  heading: z.string().min(1, "Heading is required"),
  date: z.string().min(1, "Date is required"),
  content: z.string().min(1, "Content is required"),
})

export type AnnouncementFormValues = z.infer<typeof announcementSchema>
