import type { DocumentData, QueryDocumentSnapshot } from "firebase/firestore"

export function docToObject<T>(
  snapshot: QueryDocumentSnapshot<DocumentData>
): T {
  return { id: snapshot.id, ...snapshot.data() } as T
}

export function requireDb<T>(db: T | null): T {
  if (!db) {
    throw new Error(
      "Firebase is not configured — set VITE_FIREBASE_* in your .env file."
    )
  }
  return db
}
