import type { InventoryItem } from "@/types/inventory"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

/** Plain-table view of the same filtered/sorted items the cards show. */
export function InventoryTable({
  items,
  branchColumns,
}: {
  items: InventoryItem[]
  branchColumns: string[]
}) {
  return (
    <div className="rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Description</TableHead>
            <TableHead className="text-right">Total Count</TableHead>
            {branchColumns.map((code) => (
              <TableHead key={code} className="text-right">
                {code}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{item.description}</TableCell>
              <TableCell className="text-right font-medium">{item.totalCount}</TableCell>
              {branchColumns.map((code) => (
                <TableCell key={code} className="text-right">
                  {item.branches[code] ?? "—"}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
