// Attendance records are owned and written by a separate employee-facing
// app. This console does NOT create or update them — do not add addDoc/
// setDoc/updateDoc here, and do not add any write UI against this
// collection.
//
// The one exception is `deleteAttendanceForEmployee` below: employee ids are
// admin-chosen and get recycled, so an employee's attendance must be purged
// when they are deleted, or the next holder of that id inherits their
// history. It is delete-only and is called solely as a cascade from
// employee deletion/creation — never expose it as a standalone action.
import {
  collection,
  getDocs,
  limit,
  query,
  where,
  writeBatch,
} from "firebase/firestore"

import { db } from "@/lib/firebase"
import { docToObject, requireDb } from "@/lib/firestore/converters"
import type { AttendanceRecord } from "@/types/attendance"

const COLLECTION = "attendance"
/** Firestore caps a write batch at 500 operations. */
const DELETE_BATCH_SIZE = 400
/** ~20k records; a guard against looping forever if a delete never lands. */
const MAX_DELETE_BATCHES = 50
/** Blow-up guard on the whole-day read — one record per employee per day. */
const MAX_DAY_RECORDS = 2000

/**
 * Fetches every attendance record for a calendar day. Branch scoping and
 * pagination both happen client-side on top of this (see use-attendance.ts)
 * because attendance records carry no branch field — only employeeId — so
 * branch attribution requires joining the employee roster in memory, which
 * can't be done inside a server-paginated query. A day's volume is bounded
 * by headcount, so an unbounded-but-capped read is safe; the dashboard
 * already performs this exact read on every load.
 */
export async function listAttendanceForDate(dateISO: string): Promise<AttendanceRecord[]> {
  const snapshot = await getDocs(
    query(
      collection(requireDb(db), COLLECTION),
      where("dateISO", "==", dateISO),
      limit(MAX_DAY_RECORDS)
    )
  )
  return snapshot.docs.map((d) => docToObject<AttendanceRecord>(d))
}

/**
 * Deletes every attendance record belonging to an employee id, and returns
 * how many were removed. See the delete-only carve-out at the top of this
 * file — call this only from the employee delete/create cascade.
 *
 * Equality on a single field, so Firestore's automatic single-field index
 * covers the query; no composite index is needed. Deleted docs drop out of
 * the next page, so the loop re-queries rather than paging with a cursor.
 */
export async function deleteAttendanceForEmployee(
  employeeId: string
): Promise<number> {
  const firestore = requireDb(db)
  let deleted = 0

  for (let i = 0; i < MAX_DELETE_BATCHES; i += 1) {
    const snapshot = await getDocs(
      query(
        collection(firestore, COLLECTION),
        where("employeeId", "==", employeeId),
        limit(DELETE_BATCH_SIZE)
      )
    )
    if (snapshot.empty) return deleted

    const batch = writeBatch(firestore)
    for (const record of snapshot.docs) batch.delete(record.ref)
    await batch.commit()
    deleted += snapshot.size
  }

  throw new Error(
    `Stopped after deleting ${deleted} attendance records for employee ${employeeId} — more remain. Retry the delete.`
  )
}
