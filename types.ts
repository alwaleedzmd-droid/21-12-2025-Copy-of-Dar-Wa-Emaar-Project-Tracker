
export type UserRole = 'ADMIN' | 'PR_MANAGER' | 'CONVEYANCE' | 'TECHNICAL' | 'FINANCE' | 'PR_OFFICER';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  name: string;
}

export interface ProjectSummary {
  id: number;
  client: string;
  title: string;
  status: string;
  location: string;
  progress: number;
  name?: string; // Compatibility alias
  totalTasks?: number;
  completedTasks?: number;
  details?: any;
  image_url?: string;
  isPinned?: boolean;
}

export interface Comment {
  id: number;
  request_id: number;
  request_type: 'technical' | 'clearance';
  user_name: string;
  content: string;
  created_at: string;
}

export interface TechnicalRequest {
  id: number;
  created_at: string;
  project_id: number;
  project_name?: string; // For display
  scope: string;       
  service_type: string; 
  details: string;
  status: string;      // new, pending, completed
  progress: number;    // 0 - 100
  reviewing_entity?: string;
  requesting_entity?: string;
  assigned_to?: string;
  submitted_by?: string;
}

export interface ClearanceRequest {
  id: number;
  created_at: string;
  project_id: number;
  project_name?: string; // For display
  client_name: string;
  status: string; 
  progress: number;
  notes?: string;
  mobile?: string;
  id_number?: string;
  plot_number?: string;
  deal_value?: string;
  bank_name?: string;
  deed_number?: string;
  submitted_by?: string;
  assigned_to?: string;
}

export interface Task {
  id: string;
  description: string;
  status: string;
  reviewer?: string;
  requester?: string;
  notes?: string;
  date: string;
  comments?: any[];
}

export type ViewState = 
  | 'LOGIN' 
  | 'DASHBOARD' 
  | 'PROJECT_DETAIL' 
  | 'USERS' 
  | 'TECHNICAL_SERVICES' 
  | 'CONVEYANCE_SERVICES' 
  | 'STATISTICS';
