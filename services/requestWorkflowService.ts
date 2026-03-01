import { UserRole } from '../types';
import { supabase } from '../supabaseClient';

export type WorkflowRequestType =
  | 'TECHNICAL_SECTION'
  | 'DEED_CLEARANCE'
  | 'METER_TRANSFER';

interface WorkflowRoute {
  assigneeName: string;
  ccLabel: string;
  notifyRoles: UserRole[];
  assignedToEmails?: string[]; // تسلسل الإيميلات
}

export const WORKFLOW_REQUEST_TYPE_OPTIONS: Array<{ value: WorkflowRequestType; label: string }> = [
  { value: 'TECHNICAL_SECTION', label: 'طلبات القسم الفني (رخص، كهرباء، إتمام بناء، رسوم)' },
  { value: 'DEED_CLEARANCE', label: 'طلب إفراغ صك' },
  { value: 'METER_TRANSFER', label: 'إشعار نقل ملكية عداد (مياه/كهرباء)' }
];

export const TECHNICAL_SERVICE_OPTIONS = [
  'إصدار رخصة',
  'طلب كهرباء',
  'شهادة إتمام بناء',
  'رسوم'
];

export const DEEDS_WORKFLOW_REQUEST_TYPE_OPTIONS: Array<{ value: WorkflowRequestType; label: string }> = [
  { value: 'DEED_CLEARANCE', label: 'طلب إفراغ صك' },
  { value: 'METER_TRANSFER', label: 'إشعار نقل ملكية عداد (مياه/كهرباء)' }
];

// القيم الافتراضية (Fallback) في حالة عدم توفر قاعدة البيانات
export const WORKFLOW_ROUTES: Record<WorkflowRequestType, WorkflowRoute> = {
  TECHNICAL_SECTION: {
    assigneeName: 'صالح اليحيى',
    ccLabel: 'الوليد الدوسري + مساعد العقيل + قسم PR + القسم الفني',
    notifyRoles: ['PR_MANAGER', 'TECHNICAL', 'ADMIN'],
    assignedToEmails: ['ssalyahya@darwaemaar.com']
  },
  DEED_CLEARANCE: {
    assigneeName: 'الوليد الدوسري',
    ccLabel: 'مساعد العقيل + قسم CX',
    notifyRoles: ['PR_MANAGER', 'CONVEYANCE', 'ADMIN'],
    assignedToEmails: ['adaldawsari@darwaemaar.com']
  },
  METER_TRANSFER: {
    assigneeName: 'نورة المالكي',
    ccLabel: 'مساعد العقيل + قسم CX',
    notifyRoles: ['PR_MANAGER', 'CONVEYANCE', 'ADMIN'],
    assignedToEmails: ['nalmalki@darwaemaar.com']
  }
};

/**
 * جلب سير الموافقات من قاعدة البيانات أو التخزين المحلي
 * @param requestType نوع الطلب
 * @returns تفاصيل سير الموافقة أو القيمة الافتراضية
 */
export const getWorkflowRoute = async (requestType: WorkflowRequestType): Promise<WorkflowRoute> => {
  // 1. محاولة جلب من التخزين المحلي أولاً (أحدث بيانات)
  try {
    const localData = localStorage.getItem('dar_workflow_routes');
    if (localData) {
      const localWorkflows = JSON.parse(localData);
      const localMatch = localWorkflows.find((w: any) => w.request_type === requestType && w.is_active);
      if (localMatch) {
        let assignedToEmails: string[] = [];
        try {
          assignedToEmails = JSON.parse(localMatch.assigned_to);
          if (!Array.isArray(assignedToEmails)) assignedToEmails = [localMatch.assigned_to];
        } catch { assignedToEmails = [localMatch.assigned_to]; }

        // تحويل أول إيميل إلى اسم عبر profiles
        let assigneeName = assignedToEmails[0] || '';
        if (assigneeName && assigneeName.includes('@')) {
          try {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('name')
              .eq('email', assigneeName)
              .maybeSingle();
            if (profileData?.name) {
              assigneeName = profileData.name;
            }
          } catch { /* تجاهل - نستخدم الإيميل كاسم احتياطي */ }
        }

        const ccEmails = localMatch.cc_list ? localMatch.cc_list.split(',').map((e: string) => e.trim()) : [];
        const notifyRoles = localMatch.notify_roles 
          ? localMatch.notify_roles.split(',').map((r: string) => r.trim() as UserRole)
          : ['ADMIN'];

        console.log('📦 سير الموافقة من التخزين المحلي:', requestType, '→', assigneeName);
        return {
          assigneeName,
          ccLabel: ccEmails.join(' + ') || '-',
          notifyRoles,
          assignedToEmails
        };
      }
    }
  } catch (e) { /* تجاهل */ }

  // 2. محاولة جلب من Supabase
  try {
    const { data: rows, error } = await supabase
      .from('workflow_routes')
      .select('*')
      .eq('request_type', requestType)
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1);

    const data = rows?.[0];

    if (error || !data) {
      console.warn(`لم يتم العثور على سير موافقة لـ ${requestType}، استخدام القيمة الافتراضية`);
      return WORKFLOW_ROUTES[requestType];
    }

    // تحويل البيانات من قاعدة البيانات إلى الشكل المطلوب
    let assignedToEmails: string[] = [];
    try {
      assignedToEmails = JSON.parse(data.assigned_to);
      if (!Array.isArray(assignedToEmails)) {
        assignedToEmails = [data.assigned_to];
      }
    } catch {
      assignedToEmails = [data.assigned_to];
    }

    // جلب أسماء المستخدمين من الإيميلات
    const firstAssigneeEmail = assignedToEmails[0];
    let assigneeName = firstAssigneeEmail;
    
    if (firstAssigneeEmail) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('name')
        .eq('email', firstAssigneeEmail)
        .single();
      
      if (profileData) {
        assigneeName = profileData.name;
      }
    }

    // تحويل cc_list من إيميلات إلى أسماء
    const ccEmails = data.cc_list ? data.cc_list.split(',').map((e: string) => e.trim()) : [];
    const ccNames: string[] = [];
    
    for (const email of ccEmails) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('name')
        .eq('email', email)
        .single();
      
      ccNames.push(profileData?.name || email);
    }

    const ccLabel = ccNames.join(' + ') || '-';

    // تحويل notify_roles من نص إلى مصفوفة
    const notifyRoles = data.notify_roles 
      ? data.notify_roles.split(',').map((r: string) => r.trim() as UserRole)
      : ['ADMIN'];

    return {
      assigneeName,
      ccLabel,
      notifyRoles,
      assignedToEmails
    };

  } catch (err) {
    console.error('خطأ في جلب سير الموافقة:', err);
    return WORKFLOW_ROUTES[requestType];
  }
};

/**
 * جلب جميع أسماء وإيميلات المسؤولين المباشرين من سير الموافقات المحفوظة
 * يبحث في localStorage ثم القيم الافتراضية
 */
const getAllApproverEmails = (): string[] => {
  const emails = new Set<string>();

  // 1. من التخزين المحلي (أحدث بيانات)
  try {
    const localData = localStorage.getItem('dar_workflow_routes');
    if (localData) {
      const routes = JSON.parse(localData);
      for (const route of routes) {
        if (!route.is_active) continue;
        try {
          const assignedEmails = JSON.parse(route.assigned_to);
          if (Array.isArray(assignedEmails)) {
            assignedEmails.forEach((e: string) => emails.add(e.toLowerCase().trim()));
          } else {
            emails.add(String(route.assigned_to).toLowerCase().trim());
          }
        } catch {
          emails.add(String(route.assigned_to).toLowerCase().trim());
        }
      }
    }
  } catch { /* تجاهل */ }

  // 2. من القيم الافتراضية
  for (const route of Object.values(WORKFLOW_ROUTES)) {
    if (route.assignedToEmails) {
      route.assignedToEmails.forEach(e => emails.add(e.toLowerCase().trim()));
    }
  }

  return Array.from(emails);
};

const TECHNICAL_ALIASES = [
  'إصدار رخصة',
  'طلب كهرباء',
  'شهادة إتمام بناء',
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

/**
 * التحقق من صلاحية المستخدم للموافقة/الرفض على طلب
 * المسؤول المباشر = اسم المستخدم يطابق assigned_to في الطلب
 * أي شخص مضاف في سير الموافقات يصبح مسؤول مباشر عندما يكون معين على الطلب
 */
export const canApproveWorkflowRequest = (
  currentUserName?: string, 
  assignedTo?: string,
  currentUserEmail?: string,
  currentUserRole?: string
) => {
  console.log('🔍 canApproveWorkflowRequest:', { currentUserName, assignedTo, currentUserEmail, currentUserRole });
  if (!assignedTo) return false;
  
  // المدير يقدر يوافق دائماً
  if (currentUserRole === 'ADMIN') return true;
  
  // المسؤول المباشر: اسم المستخدم يطابق المعين على الطلب
  if (currentUserName && currentUserName === assignedTo) return true;

  // مقارنة بالإيميل (احتياط: لو assigned_to مخزن كإيميل)
  if (currentUserEmail && assignedTo.includes('@')) {
    if (currentUserEmail.toLowerCase() === assignedTo.toLowerCase()) return true;
  }

  return false;
};

/**
 * التحقق المتقدم: هل المستخدم من ضمن المسؤولين في أي سير موافقة
 * (يستخدم للعرض أو التحقق الإضافي)
 */
export const isWorkflowApprover = (currentUserEmail?: string): boolean => {
  if (!currentUserEmail) return false;
  const approverEmails = getAllApproverEmails();
  return approverEmails.includes(currentUserEmail.toLowerCase().trim());
};