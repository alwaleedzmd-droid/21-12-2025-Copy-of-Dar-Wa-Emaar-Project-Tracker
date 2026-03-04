/**
 * خدمة ترميز المسؤول (Project Lead) - نظام التوجيه الديناميكي
 * ============================================================================
 * عند وجود "موظف مرمّز" لمشروع معين، يتم توجيه جميع الطلبات إليه مباشرة
 * متجاوزاً مصفوفة الصلاحيات العامة (workflow_routes).
 * ============================================================================
 */

import { supabase } from '../supabaseClient';
import { ProjectSummary, User } from '../types';

// ============================================================================
//  1. جلب المسؤول المرمّز لمشروع
// ============================================================================

export interface ProjectLead {
  id: string;       // user UUID
  name: string;     // اسم الموظف
  email: string;    // إيميل الموظف
}

/**
 * جلب المسؤول المرمّز لمشروع معين.
 * يرجع null إذا لم يكن هناك ترميز (يُستخدم التوجيه العادي).
 */
export const getProjectLead = (project: ProjectSummary): ProjectLead | null => {
  if (!project.project_lead_id || !project.project_lead_name) {
    return null;
  }
  return {
    id: project.project_lead_id,
    name: project.project_lead_name,
    email: project.project_lead_email || ''
  };
};

/**
 * جلب المسؤول المرمّز بمعرفة project_id مباشرة من Supabase.
 * يُستخدم عند عدم وجود بيانات المشروع محلياً.
 */
export const getProjectLeadById = async (projectId: number): Promise<ProjectLead | null> => {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('project_lead_id, project_lead_name, project_lead_email')
      .eq('id', projectId)
      .maybeSingle();

    if (error || !data?.project_lead_id || !data?.project_lead_name) {
      return null;
    }

    return {
      id: data.project_lead_id,
      name: data.project_lead_name,
      email: data.project_lead_email || ''
    };
  } catch {
    return null;
  }
};

// ============================================================================
//  2. تعيين/تغيير المسؤول المرمّز
// ============================================================================

export interface AssignLeadResult {
  success: boolean;
  error?: string;
  transferredCount?: number;  // عدد الطلبات المنقولة
}

/**
 * تعيين موظف كمسؤول مرمّز على مشروع.
 * يقوم بـ:
 *  1. تحديث project_lead_id/name/email في المشروع
 *  2. نقل جميع الطلبات المعلقة للمسؤول الجديد
 */
export const assignProjectLead = async (
  projectId: number,
  newLead: User
): Promise<AssignLeadResult> => {
  try {
    // 1. تحديث بيانات المسؤول في المشروع
    const { error: updateError } = await supabase
      .from('projects')
      .update({
        project_lead_id: newLead.id,
        project_lead_name: newLead.name,
        project_lead_email: newLead.email
      })
      .eq('id', projectId);

    if (updateError) {
      console.error('❌ خطأ تعيين المسؤول:', updateError.message);
      return { success: false, error: updateError.message };
    }

    // 2. نقل الطلبات المعلقة للمسؤول الجديد
    const transferredCount = await transferPendingRequests(projectId, newLead.name);

    console.log(`✅ تم ترميز "${newLead.name}" على المشروع ${projectId} | طلبات مُنقولة: ${transferredCount}`);
    return { success: true, transferredCount };
  } catch (err: any) {
    console.error('❌ خطأ غير متوقع في ترميز المسؤول:', err);
    return { success: false, error: err?.message || 'خطأ غير متوقع' };
  }
};

/**
 * إزالة ترميز المسؤول عن مشروع (يعود التوجيه العادي عبر workflow_routes).
 */
export const removeProjectLead = async (projectId: number): Promise<AssignLeadResult> => {
  try {
    const { error } = await supabase
      .from('projects')
      .update({
        project_lead_id: null,
        project_lead_name: null,
        project_lead_email: null
      })
      .eq('id', projectId);

    if (error) {
      return { success: false, error: error.message };
    }

    console.log(`✅ تم إزالة ترميز المسؤول عن المشروع ${projectId}`);
    return { success: true, transferredCount: 0 };
  } catch (err: any) {
    return { success: false, error: err?.message || 'خطأ غير متوقع' };
  }
};

// ============================================================================
//  3. نقل الطلبات المعلقة
// ============================================================================

/**
 * الحالات التي تُعتبر "معلّقة" (يتم نقلها للمسؤول الجديد)
 */
const PENDING_STATUSES = [
  'pending', 'جديد', 'قيد العمل', 'قيد المراجعة',
  'in_progress', 'under_review', 'معلق'
];

/**
 * نقل جميع الطلبات المعلقة لمشروع معين إلى المسؤول الجديد.
 * يشمل: الطلبات الفنية + طلبات الإفراغ/نقل الملكية
 */
const transferPendingRequests = async (
  projectId: number,
  newLeadName: string
): Promise<number> => {
  let totalTransferred = 0;

  // أ. نقل الطلبات الفنية (technical_requests)
  try {
    const { data: techRequests } = await supabase
      .from('technical_requests')
      .select('id, status')
      .eq('project_id', projectId)
      .in('status', PENDING_STATUSES);

    if (techRequests && techRequests.length > 0) {
      const ids = techRequests.map(r => r.id);
      const { error } = await supabase
        .from('technical_requests')
        .update({ assigned_to: newLeadName })
        .in('id', ids);

      if (!error) {
        totalTransferred += ids.length;
        console.log(`📋 نُقلت ${ids.length} طلبات فنية للمسؤول الجديد`);
      }
    }
  } catch (err) {
    console.warn('⚠️ تعذّر نقل الطلبات الفنية:', err);
  }

  // ب. نقل طلبات الإفراغ/نقل ملكية (deeds_requests) 
  // ربط الإفراغات بالمشروع عبر project_name
  try {
    // جلب اسم المشروع أولاً
    const { data: projData } = await supabase
      .from('projects')
      .select('name, title')
      .eq('id', projectId)
      .maybeSingle();

    const projectName = projData?.name || projData?.title;
    if (projectName) {
      const { data: deedRequests } = await supabase
        .from('deeds_requests')
        .select('id, status')
        .eq('project_name', projectName)
        .in('status', PENDING_STATUSES);

      if (deedRequests && deedRequests.length > 0) {
        const ids = deedRequests.map(r => r.id);
        const { error } = await supabase
          .from('deeds_requests')
          .update({ assigned_to: newLeadName })
          .in('id', ids);

        if (!error) {
          totalTransferred += ids.length;
          console.log(`📋 نُقلت ${ids.length} طلبات إفراغ للمسؤول الجديد`);
        }
      }
    }
  } catch (err) {
    console.warn('⚠️ تعذّر نقل طلبات الإفراغ:', err);
  }

  return totalTransferred;
};

// ============================================================================
//  4. Logic Override - تجاوز التوجيه العادي
// ============================================================================

/**
 * يُستدعى قبل إنشاء أي طلب - يتحقق إذا كان هناك مسؤول مرمّز.
 * إذا نعم → يُرجع اسم المسؤول المرمّز (يتجاوز workflow_routes)
 * إذا لا → يُرجع null (يتابع التوجيه العادي)
 * 
 * @param projectId معرّف المشروع
 * @param projects قائمة المشاريع المحلية (من DataContext) - بحث أسرع
 */
export const getLeadOverride = (
  projectId: number | string,
  projects: ProjectSummary[]
): string | null => {
  const pid = typeof projectId === 'string' ? parseInt(projectId) : projectId;
  const project = projects.find(p => p.id === pid);
  
  if (!project) return null;
  
  const lead = getProjectLead(project);
  return lead ? lead.name : null;
};

/**
 * نسخة async - تجلب من Supabase مباشرة (عند عدم توفر المشاريع محلياً)
 */
export const getLeadOverrideAsync = async (
  projectId: number | string
): Promise<string | null> => {
  const pid = typeof projectId === 'string' ? parseInt(projectId) : projectId;
  const lead = await getProjectLeadById(pid);
  return lead ? lead.name : null;
};
