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
  type DocumentData,
  type QueryDocumentSnapshot,
  type Unsubscribe,
} from "firebase/firestore"

import { db } from "@/lib/firebase"
import { requireDb } from "@/lib/firestore/converters"
import { deleteAttendanceForEmployee } from "@/lib/firestore/attendance"
import { JOB_TITLES } from "@/lib/constants"
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

/** Suggests the next numeric id from already-loaded employees; admin can override it. */
export function suggestNextEmployeeId(employees: Employee[]): string {
  const numericIds = employees
    .map((employee) => Number(employee.id))
    .filter((n) => Number.isFinite(n))
  if (numericIds.length === 0) return "1000"
  return String(Math.max(...numericIds) + 1)
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
