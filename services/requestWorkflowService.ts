import { UserRole } from '../types';

export type WorkflowRequestType =
  | 'TECHNICAL_SECTION'
  | 'DEED_CLEARANCE'
  | 'METER_TRANSFER';

interface WorkflowRoute {
  assigneeName: string;
  ccLabel: string;
  notifyRoles: UserRole[];
}

export const WORKFLOW_REQUEST_TYPE_OPTIONS: Array<{ value: WorkflowRequestType; label: string }> = [
  { value: 'TECHNICAL_SECTION', label: 'طلبات القسم الفني (رخص، كهرباء، إتمام بناء، رسوم)' },
  { value: 'DEED_CLEARANCE', label: 'طلب إفراغ صك' },
  { value: 'METER_TRANSFER', label: 'إشعار نقل ملكية عداد (مياه/كهرباء)' }
];

export const WORKFLOW_ROUTES: Record<WorkflowRequestType, WorkflowRoute> = {
  TECHNICAL_SECTION: {
    assigneeName: 'صالح اليحيى',
    ccLabel: 'الوليد الدوسري + مساعد العقيل + قسم PR + القسم الفني',
    notifyRoles: ['PR_MANAGER', 'TECHNICAL', 'ADMIN']
  },
  DEED_CLEARANCE: {
    assigneeName: 'الوليد الدوسري',
    ccLabel: 'مساعد العقيل + قسم CX',
    notifyRoles: ['PR_MANAGER', 'CONVEYANCE', 'ADMIN']
  },
  METER_TRANSFER: {
    assigneeName: 'نورة المالكي',
    ccLabel: 'مساعد العقيل + قسم CX',
    notifyRoles: ['PR_MANAGER', 'CONVEYANCE', 'ADMIN']
  }
};

export const DIRECT_APPROVERS = ['صالح اليحيى', 'الوليد الدوسري', 'نورة المالكي'];

const TECHNICAL_ALIASES = [
  'إصدار رخص بناء',
  'طلب فتح خدمة الكهرباء',
  'شهادة إتمام بناء (الأشغال)',
  'كهرباء',
  'رسوم'
];

export const normalizeWorkflowType = (value?: string): WorkflowRequestType => {
  if (!value) return 'TECHNICAL_SECTION';
  if (value === 'DEED_CLEARANCE' || value.includes('إفراغ صك')) return 'DEED_CLEARANCE';
  if (value === 'METER_TRANSFER' || value.includes('نقل ملكية عداد')) return 'METER_TRANSFER';
  if (value === 'TECHNICAL_SECTION' || TECHNICAL_ALIASES.some((alias) => value.includes(alias))) return 'TECHNICAL_SECTION';
  return 'TECHNICAL_SECTION';
};

export const canApproveWorkflowRequest = (currentUserName?: string, assignedTo?: string) => {
  if (!currentUserName || !assignedTo) return false;
  return DIRECT_APPROVERS.includes(currentUserName) && currentUserName === assignedTo;
};