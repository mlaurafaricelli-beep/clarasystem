export type Plan = 'esencial' | 'crecimiento' | 'agencia' | 'estudio'
export type ApprovalStatus = 'pending' | 'approved' | 'changes' | 'revised'
export type AlertType = 'urgent' | 'warning' | 'info'
export type TaskStatus = 'pending' | 'in_progress' | 'done' | 'cancelled'
export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  agency_name: string | null
  plan: Plan
  max_clients: number
  max_users: number
  trial_ends_at: string
  created_at: string
}

export interface Client {
  id: string
  agency_id: string
  name: string
  sector: string | null
  email: string | null
  phone: string | null
  plan: string | null
  status: 'active' | 'paused' | 'inactive'
  contract_ends_at: string | null
  avatar_color: string
  tone: string | null
  brand_colors: string[]
  brand_color_names: string[]
  likes: string | null
  dislikes: string | null
  key_dates: string | null
  contacts: ContactPerson[]
  created_at: string
}

export interface ContactPerson {
  name: string
  role: string
  email: string
  phone?: string
}

export interface TeamMember {
  id: string
  agency_id: string
  email: string
  full_name: string
  role: 'admin' | 'member'
  avatar_color: string
  created_at: string
}

export interface Approval {
  id: string
  agency_id: string
  client_id: string
  piece_name: string
  piece_type: string
  file_url: string | null
  file_name: string | null
  status: ApprovalStatus
  client_feedback: string | null
  uploaded_by: string | null
  notified_at: string | null
  client_token: string
  created_at: string
  updated_at: string
  // Joined
  client?: Client
  uploader?: TeamMember
}

export interface Agreement {
  id: string
  agency_id: string
  client_id: string
  approval_id: string | null
  piece_name: string
  action: 'approved' | 'changes_requested'
  client_name: string
  client_email: string | null
  signed_at: string
  ip_address: string | null
  metadata: Record<string, unknown>
  // Joined
  client?: Client
}

export interface Task {
  id: string
  agency_id: string
  client_id: string | null
  assigned_to: string | null
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  due_date: string | null
  created_at: string
  updated_at: string
  // Joined
  client?: Client
  assignee?: TeamMember
}

export interface Alert {
  id: string
  agency_id: string
  client_id: string | null
  type: AlertType
  message: string
  action_url: string | null
  read: boolean
  auto_generated: boolean
  created_at: string
  // Joined
  client?: Client
}

export interface DashboardStats {
  lateTasks: number
  pendingApprovals: number
  inProgressToday: number
  urgentAlerts: number
}

export const PLAN_LIMITS: Record<Plan, { clients: number; users: number; features: string[] }> = {
  esencial: {
    clients: 3, users: 3,
    features: ['dashboard','approvals','fichas','alerts','acuerdos']
  },
  crecimiento: {
    clients: 5, users: 5,
    features: ['dashboard','approvals','fichas','alerts','acuerdos','contract_alerts','file_upload','history']
  },
  agencia: {
    clients: 10, users: 8,
    features: ['dashboard','approvals','fichas','alerts','acuerdos','contract_alerts','file_upload','history','white_label','reports','team']
  },
  estudio: {
    clients: 25, users: 999,
    features: ['dashboard','approvals','fichas','alerts','acuerdos','contract_alerts','file_upload','history','white_label','reports','team','multi_brand','onboarding']
  },
}

export const AVATAR_COLORS = [
  '#E8623A','#0D9488','#D97706','#2563EB','#7C3AED',
  '#059669','#DC2626','#0891B2','#4F46E5','#D4756A'
]
