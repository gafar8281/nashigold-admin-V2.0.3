// Created by the separate employee-facing app — do NOT add addDoc/setDoc
// here. This console only reads and deletes complaints.
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore"

import { db } from "@/lib/firebase"
import { requireDb } from "@/lib/firestore/converters"
import { toEpochMs } from "@/lib/datetime"
import type { Complaint } from "@/types/complaint"

const COLLECTION = "nashigold_complaints"
const DEFAULT_PAGE_SIZE = 25

function toComplaint(snapshot: QueryDocumentSnapshot<DocumentData>): Complaint {
  const data = snapshot.data()
  return {
    id: snapshot.id,
    employeeId: data.id ?? "",
    name: data.name ?? "",
    branch: data.branch ?? "",
    jobTitle: data.job_title ?? "",
    issue: data.issue ?? "",
    createdDateMs: toEpochMs(data.createdDate),
  }
}

export interface ComplaintPage {
  records: Complaint[]
  cursor: QueryDocumentSnapshot<DocumentData> | null
  hasMore: boolean
}

// Firestore's orderBy silently drops documents missing `createdDate` — if
// the employee app ever writes a complaint without it, it won't appear here.
export async function listComplaints(options: {
  cursor?: QueryDocumentSnapshot<DocumentData> | null
  pageSize?: number
} = {}): Promise<ComplaintPage> {
  const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE
  const constraints = [
    orderBy("createdDate", "desc"),
    ...(options.cursor ? [startAfter(options.cursor)] : []),
    limit(pageSize + 1),
  ]
  const snapshot = await getDocs(
    query(collection(requireDb(db), COLLECTION), ...constraints)
  )
  const docs = snapshot.docs.slice(0, pageSize)
  return {
    records: docs.map(toComplaint),
    cursor: docs.length > 0 ? docs[docs.length - 1] : null,
    hasMore: snapshot.docs.length > pageSize,
  }
}

export async function deleteComplaint(id: string): Promise<void> {
  await deleteDoc(doc(requireDb(db), COLLECTION, id))
}
