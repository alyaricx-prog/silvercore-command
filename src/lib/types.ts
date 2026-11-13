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
  onboarded: boolean
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

// ── Phase 5 ──────────────────────────────────────────────────

export type Customer = {
  id: string
  organisation_id: string
  name: string
  phone: string | null
  email: string | null
  address: string | null
  lat: number | null
  lng: number | null
  tags: string[] | null
  status: 'active' | 'inactive' | 'prospect'
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export type CustomerEvent = {
  id: string
  organisation_id: string
  customer_id: string
  logged_by: string | null
  kind: 'call' | 'visit' | 'deal_closed' | 'deal_lost' | 'note' | 'follow_up'
  summary: string
  deal_log_id: string | null
  created_at: string
}

export type Contract = {
  id: string
  organisation_id: string
  title: string
  description: string | null
  value_estimate: number | null
  area: string | null
  term_months: number | null
  status: 'evaluating' | 'approved' | 'rejected' | 'signed'
  risk_level: 'low' | 'moderate' | 'high'
  risk_score: number | null
  risk_factors: string[]
  opportunities: string[]
  eval_notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export type Goal = {
  id: string
  organisation_id: string
  profile_id: string | null
  title: string
  metric: 'deals_closed' | 'check_ins' | 'assignments_completed'
  target: number
  current_value: number
  period: 'weekly' | 'monthly'
  period_start: string
  period_end: string
  created_by: string | null
  created_at: string
}

export type Badge = {
  id: string
  organisation_id: string
  profile_id: string
  kind: 'first_deal' | 'streak_3' | 'streak_7' | 'top_closer' | 'mvp' | 'milestone'
  label: string
  earned_at: string
}

export type CustomFieldDef = {
  id: string
  organisation_id: string
  entity: 'assignment' | 'customer' | 'deal_log'
  field_key: string
  label: string
  field_type: 'text' | 'number' | 'select' | 'boolean' | 'date'
  options: string[] | null
  required: boolean
  created_at: string
}

export type CustomFieldValue = {
  id: string
  organisation_id: string
  field_def_id: string
  entity_id: string
  value_text: string | null
  value_number: number | null
  value_boolean: boolean | null
  created_at: string
  updated_at: string
}

export type AuditEvent = {
  id: string
  organisation_id: string
  actor_id: string | null
  entity: string
  entity_id: string | null
  action: string
  detail: Record<string, unknown> | null
  created_at: string
}
