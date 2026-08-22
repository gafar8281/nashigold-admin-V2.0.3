import { Navigate, Outlet, useLocation } from "react-router-dom"

import { useAuth } from "@/hooks/use-auth"
import { BranchesProvider } from "@/context/BranchesContext"
import { AppLayout } from "@/components/layout/AppLayout"

export function ProtectedRoute() {
  const { isAuthenticated, isReady } = useAuth()
  const location = useLocation()

  if (!isReady) return null

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return (
    <BranchesProvider>
      <AppLayout>
        <Outlet />
      </AppLayout>
    </BranchesProvider>
  )
}
