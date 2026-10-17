import { useMemo, useRef, useState } from "react"

import {
  parseInventoryImport,
  readInventoryFile,
  type ParsedInventoryImport,
} from "@/features/inventory/inventory-import"
import type { InventoryItemInput } from "@/types/inventory"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Spinner } from "@/components/ui/spinner"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldDescription } from "@/components/ui/field"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const collator = new Intl.Collator(undefined, { numeric: true })

interface ImportInventoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  branchCodes: string[]
  hasExistingInventory: boolean
  onImport: (items: InventoryItemInput[]) => Promise<boolean>
}

export function ImportInventoryDialog({
  open,
  onOpenChange,
  branchCodes,
  hasExistingInventory,
  onImport,
}: ImportInventoryDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [parsed, setParsed] = useState<ParsedInventoryImport | null>(null)
  const [isParsing, setIsParsing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function resetState() {
    setFileName(null)
    setFileError(null)
    setParsed(null)
    setIsParsing(false)
    setIsSubmitting(false)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  function handleOpenChange(next: boolean) {
    if (!next) resetState()
    onOpenChange(next)
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setFileError(null)
    setParsed(null)

    const name = file.name.toLowerCase()
    if (!name.endsWith(".csv") && !name.endsWith(".xlsx")) {
      setFileError("Please select a .csv or .xlsx file.")
      setFileName(null)
      if (fileInputRef.current) fileInputRef.current.value = ""
      return
    }

    setFileName(file.name)
    setIsParsing(true)
    try {
      const grid = await readInventoryFile(file)
      setParsed(parseInventoryImport(grid, branchCodes))
    } catch {
      setFileError("Couldn't read that file.")
    } finally {
      setIsParsing(false)
    }
  }

  async function handleSubmit() {
    if (!parsed || parsed.items.length === 0) return
    setIsSubmitting(true)
    const ok = await onImport(parsed.items)
    setIsSubmitting(false)
    if (ok) handleOpenChange(false)
  }

  const previewBranches = useMemo(() => {
    if (!parsed) return []
    const codes = new Set<string>()
    for (const item of parsed.items) {
      for (const code of Object.keys(item.branches)) codes.add(code)
    }
    return [...codes].sort(collator.compare)
  }, [parsed])

  const counts = parsed?.counts
  const canSubmit =
    !!parsed && !parsed.headerError && counts!.errors === 0 && counts!.units > 0

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-4xl grid-rows-[auto_minmax(0,1fr)_auto] overflow-y-hidden">
        <DialogHeader>
          <DialogTitle>Upload inventory</DialogTitle>
        </DialogHeader>

        <div className="flex min-h-0 flex-col gap-4">
          <Field>
            <Input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={handleFileChange}
            />
            <FieldDescription>
              {fileName ? (
                <>Selected: {fileName}</>
              ) : (
                <>
                  .csv or .xlsx with columns DESCRIPTION and LOCATION (branch code). Each
                  row is one unit.
                </>
              )}
            </FieldDescription>
            {fileError && <p className="text-sm text-destructive">{fileError}</p>}
          </Field>

          {isParsing && (
            <Button variant="secondary" disabled size="sm" className="w-fit">
              <Spinner data-icon="inline-start" />
              Processing
            </Button>
          )}

          {parsed?.headerError && (
            <p className="text-sm text-destructive">{parsed.headerError}</p>
          )}

          {parsed && !parsed.headerError && (
            <div className="flex min-h-0 flex-1 flex-col gap-2">
              <p className="text-sm text-muted-foreground">
                {counts!.units} unit{counts!.units === 1 ? "" : "s"} · {counts!.items} unique item
                {counts!.items === 1 ? "" : "s"}
                {counts!.errors > 0
                  ? ` · ${counts!.errors} row${counts!.errors === 1 ? "" : "s"} with errors — fix the file to continue`
                  : ""}
              </p>
              {hasExistingInventory && counts!.errors === 0 && counts!.units > 0 && (
                <p className="text-sm text-muted-foreground">
                  Confirming replaces the current inventory entirely.
                </p>
              )}
              <ScrollArea className="max-h-[50vh] rounded-lg border">
                {counts!.errors > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Line</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Error</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsed.errorRows.map((row) => (
                        <TableRow key={row.lineNumber} className="bg-destructive/5">
                          <TableCell>{row.lineNumber}</TableCell>
                          <TableCell>{row.description || "—"}</TableCell>
                          <TableCell>{row.location || "—"}</TableCell>
                          <TableCell>
                            <Badge variant="destructive">{row.errors.join("; ")}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        {previewBranches.map((code) => (
                          <TableHead key={code} className="text-right">
                            {code}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsed.items.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={previewBranches.length + 2}
                            className="h-24 text-center text-muted-foreground"
                          >
                            No rows found in this file.
                          </TableCell>
                        </TableRow>
                      ) : (
                        parsed.items.map((item) => (
                          <TableRow key={item.description}>
                            <TableCell>{item.description}</TableCell>
                            <TableCell className="text-right font-medium">
                              {item.totalCount}
                            </TableCell>
                            {previewBranches.map((code) => (
                              <TableCell key={code} className="text-right">
                                {item.branches[code] ?? "—"}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          {isSubmitting ? (
            <Button variant="secondary" disabled size="sm">
              <Spinner data-icon="inline-start" />
              Uploading…
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={!canSubmit}>
              {canSubmit
                ? `${hasExistingInventory ? "Replace" : "Upload"} inventory (${counts!.items} item${counts!.items === 1 ? "" : "s"})`
                : "Confirm upload"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
