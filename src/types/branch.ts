export interface Branch {
  id: string // branch code, == doc id
  address: string
  latitude?: number
  longitude?: number
  createdDateMs?: number
}
