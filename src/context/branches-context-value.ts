import { createContext } from "react"

import type { Branch } from "@/types/branch"

export interface BranchesContextValue {
  branches: Branch[]
  isLoading: boolean
  error: string | null
  addBranch: (values: {
    id: string
    address: string
    latitude?: number
    longitude?: number
  }) => Promise<boolean>
  editBranch: (
    id: string,
    values: { address: string; latitude?: number; longitude?: number }
  ) => Promise<boolean>
  removeBranch: (id: string) => Promise<boolean>
  seedBranches: () => Promise<boolean>
}

export const BranchesContext = createContext<BranchesContextValue | null>(null)
