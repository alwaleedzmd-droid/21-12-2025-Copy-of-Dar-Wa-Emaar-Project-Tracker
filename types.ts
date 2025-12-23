
export type UserRole = 'ADMIN' | 'PR_MANAGER' | 'PR_OFFICER' | 'FINANCE' | 'TECHNICAL' | 'CONVEYANCE';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  created_at?: string;
}

export interface Comment {
  id: string;
  request_id: string;
  text: string;
  author: string;
  author_role: string;
  created_at: string;
}

export interface Task {
  id: string;
  description: string;
  status: string;
  reviewer?: string;
  requester?: string;
  notes?: string;
  date: string;
  comments?: Comment[];
}

export interface ContractorInfo {
  companyName: string;
  mobile: string;
  engineerName: string;
}

export interface ProjectSummary {
  id: string;
  name: string;
  location: string;
  totalTasks: number;
  completedTasks: number;
  progress: number;
  image_url?: string;
  isPinned?: boolean;
  details?: {
    unitsCount?: number;
    electricityMetersCount?: number;
    waterMetersCount?: number;
    buildingPermitsCount?: number;
    occupancyCertificatesCount?: number;
    surveyDecisionsCount?: number;
    electricityContractor?: ContractorInfo;
    waterContractor?: ContractorInfo;
    consultantOffice?: ContractorInfo;
  };
}

export interface TechnicalRequest {
  id: string;
  project_name: string;
  entity: string;
  service_type: string;
  requesting_entity: string;
  assigned_to: string;
  details: string;
  status: 'new' | 'pending' | 'completed' | 'rejected' | 'منجز' | 'مرفوض' | 'pending_modification' | 'تعديل';
  submitted_by: string;
  created_at: string;
  scope: string; // 'INTERNAL_WORK' or External Entity Name
  deadline?: string;
}

export interface ClearanceRequest {
  id: string;
  client_name: string;
  mobile: string;
  id_number: string;
  project_name: string;
  plot_number: string;
  deal_value: string; 
  bank_name: string;
  deed_number: string;
  status: 'new' | 'finance_approved' | 'finance_rejected' | 'completed' | 'rejected' | 'pending' | 'منجز' | 'مرفوض' | 'pending_modification' | 'تعديل';
  submitted_by: string;
  created_at: string;
  assigned_to?: string;
  property_value?: string;
}

export interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export type ViewState = 
  | 'LOGIN' 
  | 'DASHBOARD' 
  | 'PROJECT_DETAIL' 
  | 'USERS' 
  | 'TECHNICAL_SERVICES' 
  | 'CONVEYANCE_SERVICES' 
  | 'STATISTICS';
