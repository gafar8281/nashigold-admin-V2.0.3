import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  updateDoc,
} from "firebase/firestore"

import { db } from "@/lib/firebase"
import { docToObject, requireDb } from "@/lib/firestore/converters"
import type { Announcement } from "@/types/announcement"

const COLLECTION = "nashigold-announcements"

export async function listAnnouncements(): Promise<Announcement[]> {
  const snapshot = await getDocs(
    query(collection(requireDb(db), COLLECTION), orderBy("date", "desc"))
  )
  return snapshot.docs.map((d) => docToObject<Announcement>(d))
}

export async function getRecentAnnouncements(n: number): Promise<Announcement[]> {
  const snapshot = await getDocs(
    query(collection(requireDb(db), COLLECTION), orderBy("date", "desc"), limit(n))
  )
  return snapshot.docs.map((d) => docToObject<Announcement>(d))
}

export async function createAnnouncement(
  values: Omit<Announcement, "id">
): Promise<void> {
  await addDoc(collection(requireDb(db), COLLECTION), values)
}

export async function updateAnnouncement(
  id: string,
  values: Partial<Omit<Announcement, "id">>
): Promise<void> {
  await updateDoc(doc(requireDb(db), COLLECTION, id), values)
}

export async function deleteAnnouncement(id: string): Promise<void> {
  await deleteDoc(doc(requireDb(db), COLLECTION, id))
}
