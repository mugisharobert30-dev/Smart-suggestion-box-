export type SuggestionCategory =
  | 'workplace_improvement'
  | 'employee_welfare'
  | 'technology'
  | 'safety'
  | 'customer_service'
  | 'cost_reduction'
  | 'other'

export type SuggestionStatus =
  | 'submitted'
  | 'under_review'
  | 'accepted'
  | 'in_progress'
  | 'rejected'

export type UserRole = 'employee' | 'admin'

export interface Suggestion {
  id: string
  reference_number: string
  title: string
  description: string
  category: SuggestionCategory
  anonymous: boolean
  submitter_id: string | null
  status: SuggestionStatus
  priority: boolean
  attachment_path: string | null
  created_at: string
  updated_at: string
}

export interface Response {
  id: string
  suggestion_id: string
  admin_id: string
  response_text: string
  created_at: string
}

export interface Profile {
  id: string
  user_id: string
  display_name: string | null
  role: UserRole
  created_at: string
}

export const CATEGORY_LABELS: Record<SuggestionCategory, string> = {
  workplace_improvement: 'Workplace Improvement',
  employee_welfare: 'Employee Welfare',
  technology: 'Technology',
  safety: 'Safety',
  customer_service: 'Customer Service',
  cost_reduction: 'Cost Reduction',
  other: 'Other'
}

export const STATUS_LABELS: Record<SuggestionStatus, string> = {
  submitted: 'Submitted',
  under_review: 'Under Review',
  accepted: 'Accepted',
  in_progress: 'In Progress',
  rejected: 'Rejected'
}

export const STATUS_COLORS: Record<SuggestionStatus, string> = {
  submitted: 'bg-gray-100 text-gray-800',
  under_review: 'bg-yellow-100 text-yellow-800',
  accepted: 'bg-green-100 text-green-800',
  in_progress: 'bg-blue-100 text-blue-800',
  rejected: 'bg-red-100 text-red-800'
}
