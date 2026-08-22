export interface Complaint {
  id: string // Firestore document ID — the delete key
  employeeId: string
  name: string
  branch: string
  jobTitle: string
  issue: string
  createdDateMs?: number
}
