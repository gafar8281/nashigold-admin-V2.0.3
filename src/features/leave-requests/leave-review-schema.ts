import { z } from "zod"

export const leaveReviewSchema = z.object({
  adminComment: z.string().trim().max(500, "Comment is too long").optional(),
})

export type LeaveReviewFormValues = z.infer<typeof leaveReviewSchema>
