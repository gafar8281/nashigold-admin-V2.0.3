export interface InventoryItem {
  id: string
  description: string
  totalCount: number
  /** Branch code → unit count. Only branches holding at least one unit are present. */
  branches: Record<string, number>
  updatedAtMs?: number
}

/** The `inventory_meta/current` pointer — names the snapshot readers should see. */
export interface InventoryMeta {
  snapshotId: string
  updatedAtMs?: number
  itemCount: number
  unitCount: number
}

/** An aggregated item as produced by the upload parser, before it's written. */
export type InventoryItemInput = Omit<InventoryItem, "id" | "updatedAtMs">
