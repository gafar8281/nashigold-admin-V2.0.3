import { Badge } from "@/components/ui/badge"

export function BranchBadge({ branch }: { branch: string }) {
  return <Badge variant="secondary">{branch}</Badge>
}
