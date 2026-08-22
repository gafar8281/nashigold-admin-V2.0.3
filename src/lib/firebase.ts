import { initializeApp, type FirebaseApp } from "firebase/app"
import {
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
  type Auth,
} from "firebase/auth"
import { getFirestore, type Firestore } from "firebase/firestore"

import { firebaseEnv, isFirebaseConfigured } from "@/lib/env"

let app: FirebaseApp | null = null

if (isFirebaseConfigured()) {
  app = initializeApp(firebaseEnv)
}

export const db: Firestore | null = app ? getFirestore(app) : null
export const auth: Auth | null = app ? getAuth(app) : null

/**
 * Signs the client in to Firebase Anonymous Auth if it isn't already.
 *
 * This is NOT real authorization — anyone with the public Firebase web
 * config can call signInAnonymously() themselves, bypassing the app's
 * login form entirely. It exists only so Firestore rules can require
 * `request.auth != null`, which blocks bare unauthenticated access to
 * the Firestore API (scanners, crawlers, anyone who just has the
 * project id). Failure here is non-fatal: the caller should let the
 * user continue into the app, and individual Firestore calls will
 * surface their own errors if access is actually denied.
 */
export function ensureAnonymousSession(): Promise<void> {
  if (!auth) return Promise.resolve()

  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe()
      if (user) {
        resolve()
        return
      }
      signInAnonymously(auth)
        .then(() => resolve())
        .catch((error) => {
          console.warn("Firebase anonymous sign-in failed:", error)
          resolve()
        })
    })
  })
}
