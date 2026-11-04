import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore"

import { db } from "@/lib/firebase"
import { requireDb } from "@/lib/firestore/converters"
import { toEpochMs } from "@/lib/datetime"
import { TARGET_UNITS, type TargetUnit } from "@/lib/constants"
import type { BranchSales, BranchSalesWriteValues } from "@/types/branch-sales"

// Doc id is the branch code, so each branch has at most one online sales record.
export const BRANCH_SALES_COLLECTION = "nashigold_branch_sales"

function toNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0
}

function toBranchSales(snapshot: QueryDocumentSnapshot<DocumentData>): BranchSales {
  const data = snapshot.data()
  return {
    branch: snapshot.id,
    monthly_target: toNumber(data.monthly_target),
    achieved_target: toNumber(data.achieved_target),
    target_unit: TARGET_UNITS.includes(data.target_unit) ? (data.target_unit as TargetUnit) : "SAR",
    updatedAtMs: toEpochMs(data.updatedAt),
  }
}

export async function listBranchSales(): Promise<BranchSales[]> {
  const snapshot = await getDocs(collection(requireDb(db), BRANCH_SALES_COLLECTION))
  return snapshot.docs.map(toBranchSales).sort((a, b) => a.branch.localeCompare(b.branch))
}

export async function createBranchSales(values: BranchSalesWriteValues): Promise<void> {
  const ref = doc(requireDb(db), BRANCH_SALES_COLLECTION, values.branch)
  const existing = await getDoc(ref)
  if (existing.exists()) {
    throw new Error(`Online sales record for "${values.branch}" already exists.`)
  }
  await setDoc(ref, { ...values, updatedAt: serverTimestamp() })
}

export async function updateBranchSales(
  branch: string,
  values: Omit<BranchSalesWriteValues, "branch">
): Promise<void> {
  await updateDoc(doc(requireDb(db), BRANCH_SALES_COLLECTION, branch), {
    ...values,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteBranchSales(branch: string): Promise<void> {
  await deleteDoc(doc(requireDb(db), BRANCH_SALES_COLLECTION, branch))
}
