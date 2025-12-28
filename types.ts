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
  // Added fields to fix dot notation errors in ProjectsModule and support mapped data
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
  attachment_url?: string; // Added field to support attachments in TechnicalModule
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
  attachment_url?: string; // Added field to fix TypeScript errors in ClearanceModule
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
  | 'PROJECTS_LIST'      // ✅ تمت الإضافة هنا (مهم جداً)
  | 'PROJECT_DETAIL' 
  | 'USERS' 
  | 'TECHNICAL_SERVICES' 
  | 'CONVEYANCE_SERVICES' 
  | 'STATISTICS';
  // في ملف types.ts

export interface TechnicalRequest {
  id: number;
  created_at: string;
  updated_at?: string; // ✅ أضف هذا السطر
  project_id: number;
  // ... باقي الحقول كما هي
}

export interface ClearanceRequest {
  id: number;
  created_at: string;
  updated_at?: string; // ✅ أضف هذا السطر
  project_id: number;
  // ... باقي الحقول كما هي
}