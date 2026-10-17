import { useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { ArrowLeftIcon, UploadIcon } from "lucide-react"

import type { InventoryItem } from "@/types/inventory"
import { useInventory } from "@/features/inventory/use-inventory"
import { ImportInventoryDialog } from "@/features/inventory/ImportInventoryDialog"
import { InventoryStats } from "@/features/inventory/InventoryStats"
import { BranchStockChart } from "@/features/inventory/BranchStockChart"
import { InventoryItemCard } from "@/features/inventory/InventoryItemCard"
import { InventoryTable } from "@/features/inventory/InventoryTable"
import { InventorySectionCard } from "@/features/inventory/InventorySectionCard"
import { branchTotals, summarize } from "@/features/inventory/inventory-summary"
import {
  INVENTORY_SECTIONS,
  OTHER_SECTION,
  sectionById,
  sectionOf,
} from "@/features/inventory/inventory-sections"
import { useBranches } from "@/hooks/use-branches"
import { formatRiyadhDateTime } from "@/lib/datetime"
import { PageHeader } from "@/components/layout/PageHeader"
import { BranchFilterSelect, ALL_BRANCHES } from "@/components/shared/BranchFilterSelect"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

const SORT_OPTIONS = {
  "name-asc": "Name A–Z",
  "name-desc": "Name Z–A",
  "count-desc": "Count high → low",
  "count-asc": "Count low → high",
} as const
type SortOption = keyof typeof SORT_OPTIONS

type ViewMode = "cards" | "table"

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" })

export function InventoryPage() {
  const { items, meta, isLoading, error, canUpload, uploadInventory } = useInventory()
  const { branches } = useBranches()

  const [search, setSearch] = useState("")
  const [branchFilter, setBranchFilter] = useState<string>(ALL_BRANCHES)
  const [sort, setSort] = useState<SortOption>("name-asc")
  const [view, setView] = useState<ViewMode>("cards")
  const [importOpen, setImportOpen] = useState(false)

  // Open section lives in the URL so the browser Back button returns to the list.
  const [searchParams, setSearchParams] = useSearchParams()
  const sectionId = searchParams.get("section")
  const openSection = sectionId === null ? null : sectionById(sectionId)
  const setSection = (id: string | null) =>
    setSearchParams(id === null ? {} : { section: id })

  const branchCodes = useMemo(() => branches.map((b) => b.id), [branches])

  /** Every configured branch, plus any code still in the data whose branch was since deleted. */
  const allColumns = useMemo(() => {
    const codes = new Set(branchCodes)
    for (const item of items) {
      for (const code of Object.keys(item.branches)) codes.add(code)
    }
    return [...codes].sort(collator.compare)
  }, [branchCodes, items])

  const branchColumns = branchFilter === ALL_BRANCHES ? allColumns : [branchFilter]

  const sectionIds = useMemo(
    () => new Map(items.map((item) => [item.id, sectionOf(item.description)])),
    [items]
  )

  const sectionItems = useMemo(
    () =>
      openSection === null
        ? items
        : items.filter((item) => sectionIds.get(item.id) === openSection.id),
    [items, sectionIds, openSection]
  )

  const matches = useMemo(() => {
    const term = search.trim().toLowerCase()
    return (item: InventoryItem) =>
      (term === "" || item.description.toLowerCase().includes(term)) &&
      (branchFilter === ALL_BRANCHES || (item.branches[branchFilter] ?? 0) > 0)
  }, [search, branchFilter])

  const countOf = useMemo(
    () => (item: InventoryItem) =>
      branchFilter === ALL_BRANCHES ? item.totalCount : (item.branches[branchFilter] ?? 0),
    [branchFilter]
  )

  /** Non-empty sections (after search/branch filter), in configured order with Other last. */
  const sectionSummaries = useMemo(() => {
    const totals = new Map<string, { itemCount: number; unitCount: number }>()
    for (const item of items) {
      if (!matches(item)) continue
      const id = sectionIds.get(item.id) ?? OTHER_SECTION.id
      const entry = totals.get(id) ?? { itemCount: 0, unitCount: 0 }
      entry.itemCount += 1
      entry.unitCount += countOf(item)
      totals.set(id, entry)
    }
    return [...INVENTORY_SECTIONS, OTHER_SECTION].flatMap((section) => {
      const entry = totals.get(section.id)
      return entry ? [{ section, ...entry }] : []
    })
  }, [items, sectionIds, matches, countOf])

  const visibleItems = useMemo(() => {
    return sectionItems.filter(matches).sort((a, b) => {
      switch (sort) {
        case "name-asc":
          return collator.compare(a.description, b.description)
        case "name-desc":
          return collator.compare(b.description, a.description)
        case "count-desc":
          return countOf(b) - countOf(a) || collator.compare(a.description, b.description)
        case "count-asc":
          return countOf(a) - countOf(b) || collator.compare(a.description, b.description)
      }
    })
  }, [sectionItems, matches, countOf, sort])

  const selectedBranch = branchFilter === ALL_BRANCHES ? null : branchFilter

  // The chart ignores the branch filter (so every bar stays clickable and the
  // selection reads as emphasis) but respects search.
  const chartTotals = useMemo(() => {
    const term = search.trim().toLowerCase()
    return branchTotals(
      term === ""
        ? sectionItems
        : sectionItems.filter((item) => item.description.toLowerCase().includes(term))
    )
  }, [sectionItems, search])

  // On the section list `visibleItems` is every matching item, so the KPIs cover all sections.
  const summary = useMemo(
    () => summarize(visibleItems, selectedBranch),
    [visibleItems, selectedBranch]
  )

  const hasInventory = meta !== null

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Inventory"
        description={
          meta?.updatedAtMs
            ? `Gold item counts by branch. Last updated ${formatRiyadhDateTime(meta.updatedAtMs)}.`
            : "Gold item counts by branch."
        }
        action={
          canUpload && (
            <Button onClick={() => setImportOpen(true)} disabled={isLoading}>
              <UploadIcon /> Upload inventory
            </Button>
          )
        }
      />

      {error && <p className="text-sm text-destructive">Couldn't load inventory: {error}</p>}

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : !hasInventory || items.length === 0 ? (
        !error && (
          <div className="flex flex-col items-start gap-3 rounded-xl border p-6">
            <p className="text-sm text-muted-foreground">
              No inventory uploaded yet. Upload a .csv or .xlsx with DESCRIPTION and LOCATION
              columns (plus an optional fallback LOCATION) to get started.
            </p>
            {canUpload && (
              <Button variant="outline" onClick={() => setImportOpen(true)}>
                <UploadIcon /> Upload inventory
              </Button>
            )}
          </div>
        )
      ) : (
        <>
          {openSection && (
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setSection(null)}>
                <ArrowLeftIcon /> All sections
              </Button>
              <h2 className="font-medium">
                {openSection.label}
                <span className="text-muted-foreground"> · {openSection.labelAr}</span>
              </h2>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="Search by description…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-64"
            />
            <BranchFilterSelect value={branchFilter} onChange={setBranchFilter} />
            {openSection === null ? (
              <p className="ml-auto text-sm text-muted-foreground">
                {sectionSummaries.length} section{sectionSummaries.length === 1 ? "" : "s"}
              </p>
            ) : (
              <>
                <Select
                  items={SORT_OPTIONS}
                  value={sort}
                  onValueChange={(value) => setSort((value as SortOption) ?? "name-asc")}
                >
                  <SelectTrigger className="w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(SORT_OPTIONS) as SortOption[]).map((option) => (
                      <SelectItem key={option} value={option}>
                        {SORT_OPTIONS[option]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="ml-auto text-sm text-muted-foreground">
                  {visibleItems.length} item{visibleItems.length === 1 ? "" : "s"}
                </p>
                <Tabs value={view} onValueChange={(value) => setView((value as ViewMode) ?? "cards")}>
                  <TabsList>
                    <TabsTrigger value="cards">Cards</TabsTrigger>
                    <TabsTrigger value="table">Table</TabsTrigger>
                  </TabsList>
                </Tabs>
              </>
            )}
          </div>

          <InventoryStats summary={summary} />

          <BranchStockChart
            totals={chartTotals}
            selectedBranch={selectedBranch}
            onSelectBranch={(branch) => setBranchFilter(branch ?? ALL_BRANCHES)}
          />

          {visibleItems.length === 0 ? (
            <div className="rounded-xl border p-6 text-center text-sm text-muted-foreground">
              No items match.
            </div>
          ) : openSection === null ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {sectionSummaries.map(({ section, itemCount, unitCount }) => (
                <InventorySectionCard
                  key={section.id}
                  section={section}
                  itemCount={itemCount}
                  unitCount={unitCount}
                  onOpen={() => setSection(section.id)}
                />
              ))}
            </div>
          ) : view === "cards" ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {visibleItems.map((item) => (
                <InventoryItemCard key={item.id} item={item} highlightBranch={selectedBranch} />
              ))}
            </div>
          ) : (
            <InventoryTable items={visibleItems} branchColumns={branchColumns} />
          )}
        </>
      )}

      <ImportInventoryDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        branchCodes={branchCodes}
        hasExistingInventory={hasInventory}
        onImport={uploadInventory}
      />
    </div>
  )
}
