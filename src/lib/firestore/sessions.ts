import { doc, getDoc, updateDoc } from "firebase/firestore"

import { db } from "@/lib/firebase"
import { requireDb } from "@/lib/firestore/converters"
import { getEmployee } from "@/lib/firestore/employees"

const COLLECTION = "user_session_data"

/**
 * Clears the mobile app's device lock for an employee so they can sign in
 * on a different device. Owned by the separate employee-facing app — this
 * console only ever touches the single `active_device_session` field.
 */
export async function resetEmployeeSession(employeeId: string): Promise<void> {
  const employee = await getEmployee(employeeId)
  if (!employee) {
    throw new Error(`Employee id "${employeeId}" not found.`)
  }

  const ref = doc(requireDb(db), COLLECTION, employeeId)
  const snapshot = await getDoc(ref)
  if (!snapshot.exists()) {
    throw new Error(`No device session on record for employee "${employeeId}".`)
  }

  await updateDoc(ref, { active_device_session: "" })
}
