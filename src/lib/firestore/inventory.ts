import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  where,
  writeBatch,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore"

import { db } from "@/lib/firebase"
import { requireDb } from "@/lib/firestore/converters"
import { toEpochMs } from "@/lib/datetime"
import type { InventoryItem, InventoryItemInput, InventoryMeta } from "@/types/inventory"

const COLLECTION = "inventory"
const META_COLLECTION = "inventory_meta"
const META_DOC_ID = "current"

/** Stays under Firestore's 500-operations-per-batch limit with headroom. */
const BATCH_SIZE = 450

/** Firestore values are untyped; a malformed count must not poison a total. */
function toCount(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0
}

function toBranchCounts(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object") return {}
  const counts: Record<string, number> = {}
  for (const [branch, count] of Object.entries(value as Record<string, unknown>)) {
    const n = toCount(count)
    if (n > 0) counts[branch] = n
  }
  return counts
}

function toInventoryItem(snapshot: QueryDocumentSnapshot<DocumentData>): InventoryItem {
  const data = snapshot.data()
  return {
    id: snapshot.id,
    description: typeof data.description === "string" ? data.description : "",
    totalCount: toCount(data.totalCount),
    branches: toBranchCounts(data.branches),
    updatedAtMs: toEpochMs(data.updatedAt),
  }
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size))
  return chunks
}

/**
 * Reads the current snapshot. Only docs tagged with the snapshotId the meta
 * pointer names are returned, so orphans from a failed upload (or old docs
 * awaiting cleanup) are never visible. `meta: null` = nothing uploaded yet.
 */
export async function getInventorySnapshot(): Promise<{
  meta: InventoryMeta | null
  items: InventoryItem[]
}> {
  const firestore = requireDb(db)
  const metaSnap = await getDoc(doc(firestore, META_COLLECTION, META_DOC_ID))
  if (!metaSnap.exists()) return { meta: null, items: [] }

  const data = metaSnap.data()
  if (typeof data.snapshotId !== "string" || data.snapshotId === "") {
    return { meta: null, items: [] }
  }
  const meta: InventoryMeta = {
    snapshotId: data.snapshotId,
    updatedAtMs: toEpochMs(data.updatedAt),
    itemCount: toCount(data.itemCount),
    unitCount: toCount(data.unitCount),
  }

  const snapshot = await getDocs(
    query(collection(firestore, COLLECTION), where("snapshotId", "==", meta.snapshotId))
  )
  return { meta, items: snapshot.docs.map(toInventoryItem) }
}

/**
 * Replaces the whole inventory with `items`.
 *
 * A single batch can't hold "delete every old doc + write every new one" at
 * realistic sizes, so instead: write the new docs under a fresh snapshotId
 * (invisible to readers), then flip the meta pointer in one write. If
 * anything fails before the flip, readers still see the previous snapshot
 * intact. Old docs are deleted afterwards; that cleanup is best-effort and
 * also sweeps orphans left by earlier failed uploads.
 */
export async function replaceInventory(
  items: InventoryItemInput[]
): Promise<{ cleanupFailed: boolean }> {
  const firestore = requireDb(db)
  const itemsRef = collection(firestore, COLLECTION)
  const snapshotId = doc(itemsRef).id

  for (const group of chunk(items, BATCH_SIZE)) {
    const batch = writeBatch(firestore)
    for (const item of group) {
      batch.set(doc(itemsRef), {
        description: item.description,
        totalCount: item.totalCount,
        branches: item.branches,
        updatedAt: serverTimestamp(),
        snapshotId,
      })
    }
    await batch.commit()
  }

  const pointer = writeBatch(firestore)
  pointer.set(doc(firestore, META_COLLECTION, META_DOC_ID), {
    snapshotId,
    updatedAt: serverTimestamp(),
    itemCount: items.length,
    unitCount: items.reduce((sum, item) => sum + item.totalCount, 0),
  })
  await pointer.commit()

  try {
    const stale = await getDocs(query(itemsRef, where("snapshotId", "!=", snapshotId)))
    for (const group of chunk(stale.docs, BATCH_SIZE)) {
      const batch = writeBatch(firestore)
      for (const staleDoc of group) batch.delete(staleDoc.ref)
      await batch.commit()
    }
    return { cleanupFailed: false }
  } catch {
    return { cleanupFailed: true }
  }
}
