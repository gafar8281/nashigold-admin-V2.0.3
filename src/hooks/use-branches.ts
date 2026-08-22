import { useContext } from "react"

import { BranchesContext, type BranchesContextValue } from "@/context/branches-context-value"

export function useBranches(): BranchesContextValue {
  const context = useContext(BranchesContext)
  if (!context) {
    throw new Error("useBranches must be used within a BranchesProvider")
  }
  return context
}
