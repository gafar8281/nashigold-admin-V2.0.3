import { useEffect } from "react"

import { useBranchScope } from "@/hooks/use-branch-scope"
import { ALL_BRANCHES } from "@/lib/constants"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export { ALL_BRANCHES }

/**
 * Branch filter dropdown, scoped to the current user's managedBranches.
 * Also owns the stale-branch reset: if the selected code drops out of the
 * options (deleted branch, or scope narrows), the value resets to "all".
 */
export function BranchFilterSelect({
  value,
  onChange,
  className,
}: {
  value: string
  onChange: (value: string) => void
  className?: string
}) {
  const { branches, managedBranches } = useBranchScope()

  useEffect(() => {
    if (value !== ALL_BRANCHES && branches.length > 0 && !branches.some((b) => b.id === value)) {
      onChange(ALL_BRANCHES)
    }
  }, [branches, value, onChange])

  return (
    <Select value={value} onValueChange={(next) => onChange(next ?? ALL_BRANCHES)}>
      <SelectTrigger className={className ?? "w-40"}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_BRANCHES}>
          {managedBranches === null ? "All branches" : "All my branches"}
        </SelectItem>
        {branches.length === 0 ? (
          <SelectItem value="none" disabled>
            No branches configured
          </SelectItem>
        ) : (
          branches.map((branch) => (
            <SelectItem key={branch.id} value={branch.id}>
              {branch.id}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  )
}
