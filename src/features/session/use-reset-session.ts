import { toast } from "sonner"

import { resetEmployeeSession } from "@/lib/firestore/sessions"

export function useResetSession() {
  async function resetSession(employeeId: string) {
    try {
      await resetEmployeeSession(employeeId)
      toast.success(`Device session cleared for employee ${employeeId}.`)
      return true
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reset session.")
      return false
    }
  }

  return { resetSession }
}
