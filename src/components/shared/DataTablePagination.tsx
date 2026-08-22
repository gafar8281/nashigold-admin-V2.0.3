import { Button } from "@/components/ui/button"

export function DataTablePagination({
  canPreviousPage,
  canNextPage,
  onPrevious,
  onNext,
  label,
}: {
  canPreviousPage: boolean
  canNextPage: boolean
  onPrevious: () => void
  onNext: () => void
  label?: string
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      {label && <p className="text-sm text-muted-foreground">{label}</p>}
      <div className="ml-auto flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={!canPreviousPage}
          onClick={onPrevious}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!canNextPage}
          onClick={onNext}
        >
          Next
        </Button>
      </div>
    </div>
  )
}
