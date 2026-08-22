import { useMemo } from "react"

import { useAuth } from "@/hooks/use-auth"
import { useBranches } from "@/hooks/use-branches"
import { isBranchInScope, scopeBranches } from "@/lib/permissions"
import type { Branch } from "@/types/branch"

export interface BranchScope {
  /** Branch codes the current user may see, or `null` for unrestricted (admin). */
  managedBranches: string[] | null
  /** Branch objects for Select options: scope ∩ nashigold_branches. */
  branches: Branch[]
  isInScope: (branch: string) => boolean
}

/**
 * Composes the auth session's managedBranches with the live branch list.
 * `managedBranches` here is the same array reference the auth context
 * holds — it only changes identity on login/logout, so it's safe to put
 * directly in effect/callback dependency arrays.
 */
export function useBranchScope(): BranchScope {
  const { managedBranches } = useAuth()
  const { branches: allBranches } = useBranches()

  const branches = useMemo(
    () => scopeBranches(allBranches, managedBranches),
    [allBranches, managedBranches]
  )

  return useMemo(
    () => ({
      managedBranches,
      branches,
      isInScope: (branch: string) => isBranchInScope(managedBranches, branch),
    }),
    [managedBranches, branches]
  )
}
