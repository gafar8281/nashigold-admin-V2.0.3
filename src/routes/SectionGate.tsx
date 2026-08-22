import type { ReactNode } from "react"
import { Navigate } from "react-router-dom"

import { useAuth } from "@/hooks/use-auth"
import { canAccessSection, type AppSection } from "@/lib/permissions"

/**
 * Only ever rendered inside ProtectedRoute, so isReady/isAuthenticated are
 * already settled here — no loading flash to account for.
 */
export function SectionGate({
  section,
  children,
}: {
  section: AppSection
  children: ReactNode
}) {
  const { role } = useAuth()
  if (!canAccessSection(role, section)) return <Navigate to="/" replace />
  return <>{children}</>
}
