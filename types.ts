
export type UserRole = 'ADMIN' | 'PR_MANAGER' | 'CONVEYANCE' | 'TECHNICAL' | 'FINANCE' | 'PR_OFFICER' | 'DEEDS_OFFICER';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  name: string;
}

export interface UnitDetail {
  id: string;
  unit_number: string;
  floor: string;
  area: number;
  status: string;
}

export interface ProjectSummary {
  id: number;
  client: string;
  title: string;
  status: string;
  location: string;
  progress: number;
  name?: string;
  totalTasks?: number;
  completedTasks?: number;
  details?: any;
  image_url?: string;
  isPinned?: boolean;
  units_count?: number;
  electricity_meters?: number;
  water_meters?: number;
  building_permits?: number;
  occupancy_certificates?: number;
  survey_decisions_count?: number;
  consultant_name?: string;
  consultant_engineer?: string;
  consultant_mobile?: string;
  water_contractor?: string;
  water_contractor_engineer?: string;
  water_contractor_mobile?: string;
  electricity_contractor?: string;
  electricity_contractor_engineer?: string;
  electricity_contractor_mobile?: string;
}

export interface ProjectWork {
  id: number;
  task_name: string;
  status: string;
  project_name: string;
  projectId: number;
  authority?: string;
  department?: string;
  notes?: string; 
  created_at: string;
}

export interface WorkComment {
  id: number;
  content: string;
  user_name: string;
  created_at: string;
  work_id: number;
}

export interface Task {
  id: number;
  description: string;
  status: string;
  reviewer?: string;
  requester?: string;
  notes?: string;
  date: string;
  comments?: any[];
}

export interface TechnicalRequest {
  id: number;
  created_at: string;
  updated_at?: string;
  project_id: number;
  project_name?: string;
  projectId?: number; // Added to match some usages
  scope: string;       
  service_type: string; 
  details: string;
  status: string;
  progress: number;
  reviewing_entity?: string;
  requesting_entity?: string;
  assigned_to?: string;
  submitted_by?: string;
  attachment_url?: string;
}

export interface ClearanceRequest {
  id: number;
  created_at: string;
  updated_at?: string;
  project_id: number;
  project_name?: string;
  client_name: string;
  beneficiary_name?: string; // Added to match usage in Dashboard
  status: string; 
  progress: number;
  notes?: string;
  mobile?: string;
  id_number?: string;
  plot_number?: string;
  deal_value?: string;
  bank_name?: string;
  deed_number?: string;
  contract_type?: string;
  submitted_by?: string;
  assigned_to?: string;
  attachment_url?: string;
  units?: UnitDetail[];
}

export interface Comment {
  id: number;
  request_id: number;
  request_type: 'technical' | 'clearance';
  user_name: string;
  content: string;
  created_at: string;
}

export type ViewState = 
  | 'LOGIN' 
  | 'DASHBOARD' 
  | 'PROJECTS_LIST'
  | 'PROJECT_DETAIL' 
  | 'USERS' 
  | 'TECHNICAL_SERVICES' 
  | 'CONVEYANCE_SERVICES';
