
export interface Comment {
  id: string;
  text: string;
  author: string;
  authorRole: string;
  timestamp: string;
}

export interface Task {
  id: string;
  project: string;
  description: string;
  reviewer: string;
  requester: string;
  notes: string;
  location: string;
  status: 'منجز' | 'متابعة' | string;
  date: string;
  comments?: Comment[];
}

export interface ProjectSummary {
  id: string;
  name: string;
  location: string;
  totalTasks: number;
  completedTasks: number;
  progress: number;
  tasks: Task[];
  image_url?: string; // التوافق مع اسم العمود في قاعدة البيانات
  isPinned?: boolean;
  allIds?: string[];
  details?: {
    unitsCount?: number;
    electricityMetersCount?: number;
    waterMetersCount?: number;
    buildingPermitsCount?: number;
    occupancyCertificatesCount?: number;
  };
}

export type ViewState = 
  | 'LOGIN' 
  | 'DASHBOARD' 
  | 'PROJECT_DETAIL' 
  | 'USERS' 
  | 'TECHNICAL_SERVICES' 
  | 'CONVEYANCE_SERVICES' 
  | 'FINANCE_APPROVALS' 
  | 'STATISTICS';

export type UserRole = 'ADMIN' | 'PR_MANAGER' | 'PR_OFFICER' | 'FINANCE' | 'TECHNICAL' | 'CONVEYANCE';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface MaintenanceRequest {
  id: string;
  project_name: string;
  client_name: string;
  mobile: string;
  details: string;
  status: 'new' | 'pending' | 'completed' | 'rejected';
  submitted_by: string;
  created_at: string;
}

export interface ClearanceRequest {
  id: string;
  project_name: string;
  client_name: string;
  deed_number: string;
  id_number: string;
  property_value: string;
  // حقول سير العمل الجديدة
  status: 'new' | 'finance_approved' | 'finance_rejected' | 'manager_approved' | 'completed' | 'rejected';
  finance_note?: string;
  manager_note?: string;
  bulk_data?: any; // لتخزين بيانات الإكسل المرفوع
  submitted_by: string;
  created_at: string;
}
