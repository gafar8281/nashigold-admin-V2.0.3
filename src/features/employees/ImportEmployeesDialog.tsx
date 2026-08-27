import { useRef, useState } from "react"

import {
  parseEmployeeImport,
  type ParsedImport,
} from "@/features/employees/employee-csv"
import type { EmployeeTargetUpdate } from "@/lib/firestore/employees"
import type { Employee } from "@/types/employee"
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

interface ImportEmployeesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  employees: Employee[]
  onImport: (
    updates: EmployeeTargetUpdate[]
  ) => Promise<{ updated: number; failedIds: string[] } | null>
}

export function ImportEmployeesDialog({
  open,
  onOpenChange,
  employees,
  onImport,
}: ImportEmployeesDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [parsed, setParsed] = useState<ParsedImport | null>(null)
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

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setFileError("Please select a .csv file.")
      setFileName(null)
      if (fileInputRef.current) fileInputRef.current.value = ""
      return
    }

    setFileName(file.name)
    setIsParsing(true)
    try {
      const text = await file.text()
      setParsed(parseEmployeeImport(text, employees))
    } catch {
      setFileError("Couldn't read that file.")
    } finally {
      setIsParsing(false)
    }
  }

  async function handleSubmit() {
    if (!parsed) return
    const updates: EmployeeTargetUpdate[] = parsed.rows
      .filter((row) => row.status === "ok" && row.employee)
      .map((row) => ({
        id: row.id,
        branch: row.employee!.branch,
        monthly_target: row.monthlyTarget!,
        target_unit: row.targetUnit!,
        target_achieved: row.targetAchieved!,
      }))
    if (updates.length === 0) return

    setIsSubmitting(true)
    const result = await onImport(updates)
    setIsSubmitting(false)

    if (result) {
      handleOpenChange(false)
    }
  }

  const counts = parsed?.counts
  const canSubmit = !!parsed && !parsed.headerError && (counts?.ok ?? 0) > 0

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-4xl grid-rows-[auto_minmax(0,1fr)_auto] overflow-y-hidden">
        <DialogHeader>
          <DialogTitle>Import CSV</DialogTitle>
        </DialogHeader>

        <div className="flex min-h-0 flex-col gap-4">
          <Field>
            <Input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
            />
            <FieldDescription>
              {fileName ? (
                <>Selected: {fileName}</>
              ) : (
                <>
                  Columns: Branch, ID, Name, Job Title, Monthly Target, Unit, Target Achieved.
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
                {counts!.ok} to update · {counts!.unchanged} unchanged
                {counts!.error > 0 ? ` · ${counts!.error} with errors (skipped)` : ""}
              </p>
              <ScrollArea className="max-h-[50vh] rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Branch</TableHead>
                      <TableHead>ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Job Title</TableHead>
                      <TableHead>Monthly Target</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>Target Achieved</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsed.rows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                          No rows found in this file.
                        </TableCell>
                      </TableRow>
                    ) : (
                      parsed.rows.map((row) => (
                        <TableRow
                          key={row.lineNumber}
                          className={row.status === "error" ? "bg-destructive/5" : undefined}
                        >
                          <TableCell>
                            {row.status === "error" && (
                              <Badge variant="destructive">Error</Badge>
                            )}
                            {row.status === "unchanged" && (
                              <Badge variant="outline" className="text-muted-foreground">
                                No change
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>{row.branch || "—"}</TableCell>
                          <TableCell>{row.id || "—"}</TableCell>
                          <TableCell>
                            <div>{row.name || "—"}</div>
                            {row.errors.length > 0 && (
                              <div className="text-xs text-destructive">
                                {row.errors.join("; ")}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>{row.jobTitle || "—"}</TableCell>
                          <TableCell>{row.monthlyTarget ?? "—"}</TableCell>
                          <TableCell>{row.targetUnit ?? "—"}</TableCell>
                          <TableCell>{row.targetAchieved ?? "—"}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
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
              Importing…
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={!canSubmit}>
              {canSubmit
                ? `Import ${counts!.ok} employee${counts!.ok === 1 ? "" : "s"}`
                : "Confirm import"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
