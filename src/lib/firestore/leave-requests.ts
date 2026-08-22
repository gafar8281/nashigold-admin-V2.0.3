// Created by the separate employee-facing app — do NOT add addDoc/setDoc/
// deleteDoc here. This console is review-only: it reads requests and
// updates only status/reviewedBy/reviewedAt/adminComment.
import {
  collection,
  doc,
  getCountFromServer,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  startAfter,
  where,
  type DocumentData,
  type QueryConstraint,
  type QueryDocumentSnapshot,
} from "firebase/firestore"

import { db } from "@/lib/firebase"
import { requireDb } from "@/lib/firestore/converters"
import { toEpochMs, toRiyadhDateISO } from "@/lib/datetime"
import { LEAVE_STATUSES, LEAVE_TYPES, type LeaveStatus } from "@/lib/constants"
import { MAX_BRANCH_IN_VALUES } from "@/lib/permissions"
import type { LeaveRequest } from "@/types/leave-request"

const COLLECTION = "nashigold_leave_request"
const DEFAULT_PAGE_SIZE = 25

/** `null`/undefined means "no branch constraint" — the admin path. */
function branchConstraint(branches: string[] | null | undefined): QueryConstraint[] {
  if (!branches) return []
  if (branches.length > MAX_BRANCH_IN_VALUES) {
    throw new Error(
      `Cannot scope to ${branches.length} branches — Firestore caps "in" at ${MAX_BRANCH_IN_VALUES}.`
    )
  }
  return [where("branch", "in", branches)]
}

function toLeaveRequest(snapshot: QueryDocumentSnapshot<DocumentData>): LeaveRequest {
  const data = snapshot.data()
  const leaveType = LEAVE_TYPES.includes(data.leaveType) ? data.leaveType : LEAVE_TYPES[0]
  const status = LEAVE_STATUSES.includes(data.status) ? data.status : LEAVE_STATUSES[0]
  return {
    id: snapshot.id,
    employeeId: data.employeeId ?? "",
    employeeName: data.employeeName ?? "",
    branch: data.branch ?? "",
    jobTitle: data.jobTitle ?? "",
    leaveType,
    startDateISO: toRiyadhDateISO(data.startDate),
    endDateISO: toRiyadhDateISO(data.endDate),
    reason: data.reason ?? "",
    status,
    appliedAtMs: toEpochMs(data.appliedAt) ?? 0,
    reviewedBy: data.reviewedBy || undefined,
    reviewedAtMs: toEpochMs(data.reviewedAt),
    adminComment: data.adminComment || undefined,
  }
}

export async function listPendingLeaveRequests(
  options: { branches?: string[] | null } = {}
): Promise<LeaveRequest[]> {
  const snapshot = await getDocs(
    query(
      collection(requireDb(db), COLLECTION),
      where("status", "==", "pending"),
      ...branchConstraint(options.branches),
      orderBy("appliedAt", "desc")
    )
  )
  return snapshot.docs.map(toLeaveRequest)
}

export interface LeaveRequestPage {
  records: LeaveRequest[]
  cursor: QueryDocumentSnapshot<DocumentData> | null
  hasMore: boolean
}

export async function listLeaveRequests(options: {
  status?: LeaveStatus
  branches?: string[] | null
  cursor?: QueryDocumentSnapshot<DocumentData> | null
  pageSize?: number
} = {}): Promise<LeaveRequestPage> {
  const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE
  const constraints = [
    ...(options.status ? [where("status", "==", options.status)] : []),
    ...branchConstraint(options.branches),
    orderBy("appliedAt", "desc"),
    ...(options.cursor ? [startAfter(options.cursor)] : []),
    limit(pageSize + 1),
  ]
  const snapshot = await getDocs(
    query(collection(requireDb(db), COLLECTION), ...constraints)
  )
  const docs = snapshot.docs.slice(0, pageSize)
  return {
    records: docs.map(toLeaveRequest),
    cursor: docs.length > 0 ? docs[docs.length - 1] : null,
    hasMore: snapshot.docs.length > pageSize,
  }
}

export async function getPendingLeaveCount(
  options: { branches?: string[] | null } = {}
): Promise<number> {
  const snapshot = await getCountFromServer(
    query(
      collection(requireDb(db), COLLECTION),
      where("status", "==", "pending"),
      ...branchConstraint(options.branches)
    )
  )
  return snapshot.data().count
}

export async function reviewLeaveRequest(
  id: string,
  values: {
    status: "approved" | "rejected"
    reviewedBy: string
    adminComment?: string
    /** `null` = unrestricted (admin). Non-null scopes which branch's requests may be reviewed. */
    allowedBranches?: string[] | null
  }
): Promise<void> {
  const ref = doc(requireDb(db), COLLECTION, id)
  await runTransaction(requireDb(db), async (transaction) => {
    const snapshot = await transaction.get(ref)
    if (!snapshot.exists() || snapshot.data().status !== "pending") {
      throw new Error("This request has already been reviewed.")
    }
    const branch = snapshot.data().branch ?? ""
    if (values.allowedBranches && !values.allowedBranches.includes(branch)) {
      throw new Error("You can only review leave requests from your branches.")
    }
    const comment = values.adminComment?.trim()
    transaction.update(ref, {
      status: values.status,
      reviewedBy: values.reviewedBy,
      reviewedAt: serverTimestamp(),
      ...(comment ? { adminComment: comment } : {}),
    })
  })
}
