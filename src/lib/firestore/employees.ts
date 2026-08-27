import {
  collection,
  deleteDoc,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type QueryDocumentSnapshot,
  type Unsubscribe,
} from "firebase/firestore"

import { db } from "@/lib/firebase"
import { requireDb } from "@/lib/firestore/converters"
import { deleteAttendanceForEmployee } from "@/lib/firestore/attendance"
import { JOB_TITLES, type TargetUnit } from "@/lib/constants"
import { isBranchInScope, MAX_BRANCH_IN_VALUES, scopeByBranch } from "@/lib/permissions"
import type { Employee, EmployeeWritePayload } from "@/types/employee"

/** `null` = unrestricted (admin). Defence-in-depth mirroring
 * reviewLeaveRequest's server-side re-check — the UI already hides these
 * actions for out-of-scope branches, but this guards direct calls too. */
function assertBranchAllowed(allowedBranches: string[] | null | undefined, branch: string) {
  if (allowedBranches && !isBranchInScope(allowedBranches, branch)) {
    throw new Error("You can only manage employees in your branches.")
  }
}

const COLLECTION = "nashigold-employee-data"

// Deliberately does not spread raw Firestore data — the `password` field
// must never reach a UI-bound Employee object. Only EmployeeWritePayload
// (the form's own submit values) ever carries a raw password, and only
// on write.
function toEmployee(snapshot: QueryDocumentSnapshot<DocumentData>): Employee {
  const data = snapshot.data()
  return {
    id: snapshot.id,
    name: data.name ?? "",
    job_title: data.job_title ?? JOB_TITLES[0],
    branch: data.branch ?? "",
    monthly_target: data.monthly_target ?? 0,
    target_unit: data.target_unit,
    target_achieved: data.target_achieved ?? 0,
    email: data.email ?? "",
    contact: data.contact ?? "",
  }
}

export async function listEmployees(): Promise<Employee[]> {
  const snapshot = await getDocs(collection(requireDb(db), COLLECTION))
  return snapshot.docs.map(toEmployee)
}

/**
 * `branchCodes === null` subscribes unscoped (admin). A non-null array
 * scopes server-side via `where("branch","in",...)` when it fits under
 * Firestore's 30-value cap; beyond that, falls back to an unfiltered
 * subscription filtered client-side, since `in` can't express it.
 */
export function subscribeEmployees(
  branchCodes: string[] | null,
  onChange: (employees: Employee[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const useServerFilter =
    branchCodes !== null && branchCodes.length > 0 && branchCodes.length <= MAX_BRANCH_IN_VALUES

  const employeesQuery = useServerFilter
    ? query(collection(requireDb(db), COLLECTION), where("branch", "in", branchCodes))
    : collection(requireDb(db), COLLECTION)

  return onSnapshot(
    employeesQuery,
    (snapshot) => {
      const employees = snapshot.docs.map(toEmployee)
      onChange(useServerFilter ? employees : scopeByBranch(employees, branchCodes, (e) => e.branch))
    },
    (error) => onError?.(error)
  )
}

export async function getEmployee(id: string): Promise<Employee | null> {
  const snapshot = await getDoc(doc(requireDb(db), COLLECTION, id))
  if (!snapshot.exists()) return null
  return toEmployee(snapshot as QueryDocumentSnapshot<DocumentData>)
}

export async function getEmployeeHeadcount(): Promise<number> {
  const snapshot = await getCountFromServer(collection(requireDb(db), COLLECTION))
  return snapshot.data().count
}

export async function getEmployeeCountByBranch(branchCode: string): Promise<number> {
  const snapshot = await getCountFromServer(
    query(collection(requireDb(db), COLLECTION), where("branch", "==", branchCode))
  )
  return snapshot.data().count
}

/** Pure id-math helper: highest numeric id + 1, or "1000" if none are numeric. */
export function nextEmployeeIdFrom(ids: string[]): string {
  const numericIds = ids.map((id) => Number(id)).filter((n) => Number.isFinite(n))
  if (numericIds.length === 0) return "1000"
  return String(Math.max(...numericIds) + 1)
}

/**
 * Deliberately unscoped — employee ids are document ids of the whole
 * collection, so a branch-scoped max would collide with ids the caller
 * cannot see. Never apply managedBranches here.
 *
 * Fetches every document id in the collection (one full-collection read
 * per Add-dialog open; the web SDK has no field projection, so mapping
 * only `.id` — never `.data()` — is the available mitigation, keeping
 * plaintext password/PII for out-of-scope branches out of the client).
 */
export async function fetchNextEmployeeId(): Promise<string> {
  const snapshot = await getDocs(collection(requireDb(db), COLLECTION))
  const ids = snapshot.docs.map((d) => d.id)
  return nextEmployeeIdFrom(ids)
}

export async function createEmployee(
  payload: EmployeeWritePayload,
  allowedBranches?: string[] | null
): Promise<void> {
  assertBranchAllowed(allowedBranches, payload.branch)
  const ref = doc(requireDb(db), COLLECTION, payload.id)
  const existing = await getDoc(ref)
  if (existing.exists()) {
    throw new Error(`Employee id "${payload.id}" already exists.`)
  }
  // Ids are recycled, and a delete whose attendance sweep failed part-way
  // leaves records behind. Sweep again so a new hire never inherits the
  // previous holder's history. Normally matches nothing.
  await deleteAttendanceForEmployee(payload.id)
  await setDoc(ref, payload)
}

export interface EmployeeUpdateValues
  extends Partial<Omit<Employee, "id">> {
  /** Only included in the write when non-empty — omit to leave the stored password unchanged. */
  password?: string
}

export async function updateEmployee(
  id: string,
  values: EmployeeUpdateValues,
  allowedBranches?: string[] | null
): Promise<void> {
  const ref = doc(requireDb(db), COLLECTION, id)
  if (allowedBranches) {
    const existing = await getEmployee(id)
    if (existing) assertBranchAllowed(allowedBranches, existing.branch)
    if (values.branch !== undefined) assertBranchAllowed(allowedBranches, values.branch)
  }
  const { password, ...rest } = values
  const update: Record<string, unknown> = { ...rest }
  if (password) update.password = password
  await updateDoc(ref, update)
}

/**
 * Deletes an employee and cascades to their attendance history.
 *
 * Attendance goes first on purpose: if the sweep fails part-way the employee
 * document still exists, so the admin can just retry the delete. The reverse
 * order would strand orphaned records with no roster row to retry from —
 * which is the reuse bug this cascade exists to prevent.
 */
export async function deleteEmployee(
  id: string,
  allowedBranches?: string[] | null
): Promise<{ attendanceDeleted: number }> {
  if (allowedBranches) {
    const existing = await getEmployee(id)
    if (existing) assertBranchAllowed(allowedBranches, existing.branch)
  }
  const attendanceDeleted = await deleteAttendanceForEmployee(id)
  await deleteDoc(doc(requireDb(db), COLLECTION, id))
  return { attendanceDeleted }
}

export interface EmployeeTargetUpdate {
  id: string
  /** The employee's STORED branch (not the CSV cell) — used for the scope re-check. */
  branch: string
  monthly_target: number
  target_unit: TargetUnit
  target_achieved: number
}

/** Firestore caps a single writeBatch at 500 operations. */
const BATCH_CHUNK_SIZE = 450

/**
 * Bulk-applies CSV-imported target updates. Only used by the Import CSV
 * flow — every other write path here is one document at a time, but a
 * roster-wide import needs writeBatch to avoid hundreds of round-trips.
 * Writes only the three target fields; name/job_title/branch are untouched.
 */
export async function bulkUpdateEmployeeTargets(
  updates: EmployeeTargetUpdate[],
  allowedBranches?: string[] | null
): Promise<{ updated: number; failedIds: string[] }> {
  if (allowedBranches) {
    for (const update of updates) {
      assertBranchAllowed(allowedBranches, update.branch)
    }
  }

  const database = requireDb(db)
  const failedIds: string[] = []
  let updated = 0

  for (let start = 0; start < updates.length; start += BATCH_CHUNK_SIZE) {
    const chunk = updates.slice(start, start + BATCH_CHUNK_SIZE)
    const batch = writeBatch(database)
    for (const update of chunk) {
      batch.update(doc(database, COLLECTION, update.id), {
        monthly_target: update.monthly_target,
        target_unit: update.target_unit,
        target_achieved: update.target_achieved,
      })
    }
    try {
      await batch.commit()
      updated += chunk.length
    } catch {
      failedIds.push(...chunk.map((u) => u.id))
    }
  }

  return { updated, failedIds }
}
