import type { JobTitle, TargetUnit } from "@/lib/constants"

export interface Employee {
  id: string
  name: string
  job_title: JobTitle
  branch: string
  monthly_target: number
  target_unit: TargetUnit
  target_achieved: number
  email: string
  contact: string
}

// Only ever populated on the create/edit form's own submit payload —
// never present on objects read back from Firestore for display.
export interface EmployeeWritePayload extends Employee {
  password: string
}
