import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore"

import { db } from "@/lib/firebase"
import { requireDb } from "@/lib/firestore/converters"
import { toEpochMs } from "@/lib/datetime"
import { getEmployeeCountByBranch } from "@/lib/firestore/employees"
import type { Branch } from "@/types/branch"

const COLLECTION = "nashigold_branches"

const SEED_BRANCH_CODES = [
  "H1", "H2", "H3", "H4", "H5", "H6",
  "M1", "M2", "M3", "M4",
  "D1", "D2", "D3", "D5",
] as const

function toBranch(snapshot: QueryDocumentSnapshot<DocumentData>): Branch {
  const data = snapshot.data()
  return {
    id: snapshot.id,
    address: data.address ?? "",
    latitude: typeof data.latitude === "number" ? data.latitude : undefined,
    longitude: typeof data.longitude === "number" ? data.longitude : undefined,
    createdDateMs: toEpochMs(data.createdDate),
  }
}

export async function listBranches(): Promise<Branch[]> {
  const snapshot = await getDocs(collection(requireDb(db), COLLECTION))
  return snapshot.docs.map(toBranch).sort((a, b) => a.id.localeCompare(b.id))
}

export async function createBranch(values: {
  id: string
  address: string
  latitude?: number
  longitude?: number
}): Promise<void> {
  const ref = doc(requireDb(db), COLLECTION, values.id)
  const existing = await getDoc(ref)
  if (existing.exists()) {
    throw new Error(`Branch code "${values.id}" already exists.`)
  }
  await setDoc(ref, {
    id: values.id,
    address: values.address,
    ...(values.latitude !== undefined && { latitude: values.latitude }),
    ...(values.longitude !== undefined && { longitude: values.longitude }),
    createdDate: serverTimestamp(),
  })
}

export async function updateBranch(
  id: string,
  values: { address: string; latitude?: number; longitude?: number }
): Promise<void> {
  await updateDoc(doc(requireDb(db), COLLECTION, id), {
    address: values.address,
    ...(values.latitude !== undefined && { latitude: values.latitude }),
    ...(values.longitude !== undefined && { longitude: values.longitude }),
  })
}

export async function deleteBranch(id: string): Promise<void> {
  const count = await getEmployeeCountByBranch(id)
  if (count > 0) {
    throw new Error(
      `Can't delete branch "${id}" — ${count} employee${count === 1 ? " is" : "s are"} ` +
        `still assigned to it. Reassign them first.`
    )
  }
  await deleteDoc(doc(requireDb(db), COLLECTION, id))
}

export async function seedBranches(): Promise<number> {
  const existing = await getDocs(collection(requireDb(db), COLLECTION))
  if (!existing.empty) {
    throw new Error(
      "Branches already exist — seeding is only available on an empty collection."
    )
  }
  const batch = writeBatch(requireDb(db))
  for (const id of SEED_BRANCH_CODES) {
    batch.set(doc(requireDb(db), COLLECTION, id), {
      id,
      address: "",
      createdDate: serverTimestamp(),
    })
  }
  await batch.commit()
  return SEED_BRANCH_CODES.length
}
