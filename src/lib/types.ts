export type Role = 'host' | 'cohost' | 'employee'

export type Profile = {
  id: string
  organisation_id: string
  full_name: string
  phone: string
  avatar_url: string
  role: Role
  group_name: string
  is_active: boolean
  created_at: string
}

export type Organisation = {
  id: string
  name: string
  slug: string
  logo_url: string
  theme: string
  created_at: string
}

export type Assignment = {
  id: string
  organisation_id: string
  title: string
  description: string
  assigned_to: string
  created_by: string
  status: 'pending' | 'acknowledged' | 'in_progress' | 'completed' | 'cancelled'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  due_at: string
  completed_at: string
  created_at: string
}

export type DealLog = {
  id: string
  organisation_id: string
  assignment_id: string
  logged_by: string
  outcome: 'closed' | 'lost' | 'follow_up' | 'no_contact'
  notes: string
  lat: number
  lng: number
  created_at: string
}

export type CheckIn = {
  id: string
  organisation_id: string
  assignment_id: string
  employee_id: string
  note: string | null
  lat: number | null
  lng: number | null
  created_at: string
}
