// All TypeScript types for Office Hub app

export type Role = 'founder' | 'head' | 'member' | 'accounts';
export type ProjectStatus = 'assigned' | 'in_progress' | 'completed' | 'billed';
export type ProjectPriority = 'low' | 'medium' | 'high';
export type AttendanceStatus = 'present' | 'absent' | 'half_day' | 'on_leave' | 'holiday';
export type LeaveType = 'casual' | 'sick' | 'annual' | 'unpaid';
export type LeaveStatus = 'pending' | 'approved' | 'rejected';
export type NotificationType = 'assignment' | 'completion' | 'billing' | 'deadline' | 'progress' | 'leave' | 'general';

export interface User {
  id: number;
  name: string;
  username: string;
  email?: string;
  role: Role;
  position?: string;
  reporting_to?: number;
  expo_push_token?: string;
  departments: Department[];
  created_at?: string;
  updated_at?: string;
}

export interface Department {
  id: number;
  slug: string;
  name: string;
  head_id?: number;
  color: string;
  head?: User;
  members?: User[];
  active_projects?: number;
  total_projects?: number;
}

export interface Project {
  id: number;
  title: string;
  description?: string;
  client?: string;
  client_id?: number;
  department_id?: number;
  assigned_to?: number;
  sub_assigned_to?: number;
  created_by: number;
  deadline?: string;
  priority: ProjectPriority;
  status: ProjectStatus;
  notes?: string;
  completed_at?: string;
  billed_at?: string | null;
  invoice_data?: any;
  server_version: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  // Relations
  department?: Department;
  assignedTo?: User;
  subAssignedTo?: User;
  createdBy?: User;
  progressUpdates?: ProgressUpdate[];
}

export interface ClientSummary {
  id: number;
  name: string;
  total_projects: number;
  active_projects: number;
  completed_projects: number;
  billed_projects: number;
  overdue_projects: number;
  last_activity?: string;
}

export interface Client {
  id: number;
  name: string;
  created_at?: string;
  updated_at?: string;
}

export interface ProgressUpdate {
  id: number;
  project_id: number;
  user_id: number;
  text: string;
  percentage: number;
  progress_date: string;
  server_version: number;
  created_at: string;
  updated_at: string;
  // Relations
  user?: User;
}

export interface AppNotification {
  id: number;
  user_id: number;
  project_id?: number;
  key?: string;
  message: string;
  type: NotificationType;
  read_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Attendance {
  id: number;
  user_id: number;
  date: string;
  status: AttendanceStatus;
  check_in?: string;
  check_out?: string;
  marked_by?: number;
  server_version: number;
  created_at: string;
  updated_at: string;
  // Relations
  user?: User;
  markedBy?: User;
}

export interface LeaveRequest {
  id: number;
  user_id: number;
  start_date: string;
  end_date: string;
  type: LeaveType;
  reason: string;
  status: LeaveStatus;
  approved_by?: number;
  applied_at: string;
  server_version: number;
  created_at: string;
  updated_at: string;
  // Relations
  user?: User;
  approvedBy?: User;
}

export interface DashboardStats {
  active_projects: number;
  completed: number;
  overdue: number;
  pending_billing?: number;
  my_pending_leaves?: number;
}

export interface DashboardData {
  stats: DashboardStats;
  department_overview?: DepartmentOverview[];
  active_projects: Project[];
  pending_leaves?: LeaveRequest[];
}

export interface DepartmentOverview {
  id: number;
  slug: string;
  name: string;
  color: string;
  head_name?: string;
  active_count: number;
  total_count: number;
}

// Sync types
export interface SyncAction {
  local_id?: string;
  entity_type: string;
  entity_id?: string;
  action: string;
  payload: Record<string, any>;
}

export interface SyncQueueItem extends SyncAction {
  id: string;
  created_at: string;
  status: 'pending' | 'syncing' | 'failed' | 'completed';
  retries: number;
}

// Auth types
export interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

// API Response types
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

// Form types
export interface CreateProjectForm {
  title: string;
  description?: string;
  client?: string;
  client_id?: number;
  department_id?: number;
  assigned_to?: number;
  deadline: string;
  priority: ProjectPriority;
  notes?: string;
}

export interface ApplyLeaveForm {
  start_date: string;
  end_date: string;
  type: LeaveType;
  reason: string;
}

export interface AttendanceForm {
  user_id: number;
  date: string;
  status: AttendanceStatus;
  check_in?: string;
  check_out?: string;
}
