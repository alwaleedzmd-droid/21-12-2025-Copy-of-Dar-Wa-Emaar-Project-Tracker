/**
 * خدمة حالة الوحدات - محرك الألوان التشغيلي
 * يحدد حالة كل وحدة/مبنى بناءً على البيانات الفعلية من:
 * 1. أعمال المشاريع (project_works)
 * 2. الطلبات الفنية (technical_requests)
 * 3. طلبات الإفراغ (deeds_requests / clearance_requests)
 */

import { TechnicalRequest } from '../types';

export type UnitStatusColor = 'blue' | 'yellow' | 'green' | 'red-pulse' | 'gray';

/** تفاصيل نوع عمل واحد */
export interface WorkTypeBreakdown {
  type: 'project_work' | 'technical' | 'clearance';
  typeAr: string;
  total: number;
  completed: number;
  active: number;
  items: Array<{
    id: number;
    name: string;
    status: string;
    assignedTo?: string;
    updatedAt?: string;
    authority?: string;
  }>;
}

export interface UnitStatus {
  color: UnitStatusColor;
  label: string;
  labelAr: string;
  assignedTo: string | null;
  requestId: number | null;
  requestType: 'technical' | 'clearance' | null;
  isDelayed: boolean;
  lastUpdated: string | null;
  delayHours: number;
  checklist?: { total: number; completed: number };
  /** تفصيل أنواع الأعمال المفتوحة فعلياً */
  workBreakdown: WorkTypeBreakdown[];
  /** إحصائيات إجمالية */
  totalWorks: number;
  totalCompleted: number;
  totalActive: number;
}

// أسماء الموظفين المعروفين للربط
const SALEH_NAMES = ['صالح', 'saleh', 'ssalyahya', 'صالح اليحيى'];
const NOURA_ALWALEED_NAMES = ['نورة', 'الوليد', 'noura', 'alwaleed', 'nalmalki', 'adaldawsari', 'نورة المالكي', 'الوليد الدوسري'];

const COMPLETED_STATUSES = ['completed', 'منجز', 'مكتمل', 'تم الإفراغ', 'done', 'approved'];

/**
 * تطبيع النصوص للمقارنة
 */
function normalize(text: string | null | undefined): string {
  if (!text) return '';
  return text.toLowerCase().trim()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/\s+/g, ' ');
}

function isCompleted(status: string | null | undefined): boolean {
  return COMPLETED_STATUSES.includes((status || '').toLowerCase().trim());
}

function isSaleh(name: string | null | undefined): boolean {
  if (!name) return false;
  const n = name.toLowerCase().trim();
  return SALEH_NAMES.some(s => n.includes(s));
}

function isNouraOrAlwaleed(name: string | null | undefined): boolean {
  if (!name) return false;
  const n = name.toLowerCase().trim();
  return NOURA_ALWALEED_NAMES.some(s => n.includes(s));
}

function getDelayHours(updatedAt: string | null | undefined): number {
  if (!updatedAt) return 0;
  const now = new Date();
  const updated = new Date(updatedAt);
  const diffMs = now.getTime() - updated.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60));
}

export function isChecklistComplete(checklist: any): { complete: boolean; total: number; completed: number } {
  if (!checklist) return { complete: false, total: 0, completed: 0 };
  if (Array.isArray(checklist)) {
    const total = checklist.length;
    const completed = checklist.filter((item: any) =>
      item?.status === 'completed' || item?.done === true || item?.completed === true
    ).length;
    return { complete: total > 0 && completed === total, total, completed };
  }
  if (typeof checklist === 'object') {
    const items = Object.values(checklist);
    const total = items.length;
    const completed = items.filter((item: any) =>
      item === true || item?.status === 'completed' || item?.done === true
    ).length;
    return { complete: total > 0 && completed === total, total, completed };
  }
  return { complete: false, total: 0, completed: 0 };
}

/**
 * ربط الإفراغات بالمشروع عبر اسم المشروع (fuzzy match)
 */
function matchClearanceToProject(clearance: any, project: any): boolean {
  const pNames = [project.name, project.title, project.client]
    .map((n: string | undefined) => normalize(n))
    .filter(Boolean);
  const dName = normalize(clearance.project_name);
  if (!dName) return false;
  return pNames.some(pn => dName.includes(pn) || pn.includes(dName));
}

/**
 * الدالة الرئيسية: تحديد حالة مشروع بناءً على كل الأعمال المرتبطة فعلياً
 */
export function getUnitStatus(
  projectId: number,
  technicalRequests: TechnicalRequest[],
  clearanceRequests: any[],
  projectWorks?: any[],
  project?: any
): UnitStatus {
  const DELAY_THRESHOLD_HOURS = 48;
  const workBreakdown: WorkTypeBreakdown[] = [];

  // ====== 1. أعمال المشاريع (project_works) ======
  const relatedWorks = (projectWorks || []).filter((w: any) => {
    const wId = Number(w.projectId ?? w.projectid ?? w.project_id ?? -1);
    if (wId === projectId) return true;
    // fallback: مطابقة بالاسم
    if (project && w.project_name) {
      const wName = normalize(w.project_name);
      const pNames = [project.name, project.title].map((n: string | undefined) => normalize(n)).filter(Boolean);
      return pNames.some(pn => wName.includes(pn) || pn.includes(wName));
    }
    return false;
  });

  if (relatedWorks.length > 0) {
    const completed = relatedWorks.filter(w => isCompleted(w.status));
    const active = relatedWorks.filter(w => !isCompleted(w.status));
    workBreakdown.push({
      type: 'project_work',
      typeAr: 'أعمال المشاريع',
      total: relatedWorks.length,
      completed: completed.length,
      active: active.length,
      items: relatedWorks.map(w => ({
        id: w.id,
        name: w.task_name || 'عمل غير مسمى',
        status: w.status || 'غير محدد',
        authority: w.authority,
        updatedAt: w.created_at
      }))
    });
  }

  // ====== 2. الطلبات الفنية (technical_requests) ======
  const relatedTech = technicalRequests.filter(r => {
    const projId = Number(r.project_id ?? r.projectId ?? -1);
    if (projId === projectId) return true;
    // fallback: مطابقة بالاسم
    if (project && r.project_name) {
      const rName = normalize(r.project_name);
      const pNames = [project.name, project.title].map((n: string | undefined) => normalize(n)).filter(Boolean);
      return pNames.some(pn => rName.includes(pn) || pn.includes(rName));
    }
    return false;
  });

  if (relatedTech.length > 0) {
    const completed = relatedTech.filter(r => isCompleted(r.status));
    const active = relatedTech.filter(r => !isCompleted(r.status));
    workBreakdown.push({
      type: 'technical',
      typeAr: 'الطلبات الفنية',
      total: relatedTech.length,
      completed: completed.length,
      active: active.length,
      items: relatedTech.map(r => ({
        id: r.id,
        name: r.service_type || r.scope || 'طلب فني',
        status: r.status || 'غير محدد',
        assignedTo: r.assigned_to,
        authority: r.reviewing_entity,
        updatedAt: r.updated_at || r.created_at
      }))
    });
  }

  // ====== 3. طلبات الإفراغ (clearance / deeds) ======
  const relatedDeeds = clearanceRequests.filter((d: any) => {
    if (project) return matchClearanceToProject(d, project);
    return false;
  });

  if (relatedDeeds.length > 0) {
    const completed = relatedDeeds.filter((d: any) => isCompleted(d.status));
    const active = relatedDeeds.filter((d: any) => !isCompleted(d.status));
    workBreakdown.push({
      type: 'clearance',
      typeAr: 'الإفراغات',
      total: relatedDeeds.length,
      completed: completed.length,
      active: active.length,
      items: relatedDeeds.map((d: any) => ({
        id: d.id,
        name: `إفراغ ${d.client_name || ''} - وحدة ${d.unit_number || '-'}`,
        status: d.status || 'غير محدد',
        assignedTo: d.assigned_to,
        updatedAt: d.updated_at || d.created_at
      }))
    });
  }

  // ====== إحصائيات إجمالية ======
  const totalWorks = workBreakdown.reduce((s, b) => s + b.total, 0);
  const totalCompleted = workBreakdown.reduce((s, b) => s + b.completed, 0);
  const totalActive = workBreakdown.reduce((s, b) => s + b.active, 0);

  // ====== تحديد اللون بناءً على البيانات الفعلية ======
  const activeTechItems = relatedTech.filter(r => !isCompleted(r.status));
  const activeDeedItems = relatedDeeds.filter((d: any) => !isCompleted(d.status));
  const activeWorkItems = relatedWorks.filter(w => !isCompleted(w.status));

  // افتراضيات مشتركة
  const baseResult = { workBreakdown, totalWorks, totalCompleted, totalActive };

  // === قاعدة 1: وميض أحمر - تأخير 48+ ساعة على أي طلب نشط ===
  const allActiveItems = [
    ...activeTechItems.map(r => ({ type: 'technical' as const, id: r.id, assignedTo: r.assigned_to, updated: r.updated_at || r.created_at })),
    ...activeDeedItems.map((d: any) => ({ type: 'clearance' as const, id: d.id, assignedTo: d.assigned_to, updated: d.updated_at || d.created_at })),
    ...activeWorkItems.map(w => ({ type: 'technical' as const, id: w.id, assignedTo: null, updated: w.created_at })),
  ];

  const mostDelayed = allActiveItems
    .map(item => ({ ...item, hours: getDelayHours(item.updated) }))
    .filter(item => item.hours >= DELAY_THRESHOLD_HOURS)
    .sort((a, b) => b.hours - a.hours)[0];

  if (mostDelayed) {
    return {
      ...baseResult,
      color: 'red-pulse',
      label: 'Delayed',
      labelAr: 'متأخر',
      assignedTo: mostDelayed.assignedTo || null,
      requestId: mostDelayed.id,
      requestType: mostDelayed.type,
      isDelayed: true,
      lastUpdated: null,
      delayHours: mostDelayed.hours
    };
  }

  // === قاعدة 2: أزرق - طلب فني نشط (مسند لصالح أو غيره) ===
  if (activeTechItems.length > 0) {
    const salehReq = activeTechItems.find(r => isSaleh(r.assigned_to));
    const mainReq = salehReq || activeTechItems[0];
    return {
      ...baseResult,
      color: 'blue',
      label: salehReq ? 'Technical - Saleh' : 'Technical Active',
      labelAr: salehReq ? `فني - ${mainReq.assigned_to}` : `طلب فني (${activeTechItems.length})`,
      assignedTo: mainReq.assigned_to || null,
      requestId: mainReq.id,
      requestType: 'technical',
      isDelayed: false,
      lastUpdated: mainReq.updated_at || mainReq.created_at,
      delayHours: getDelayHours(mainReq.updated_at || mainReq.created_at)
    };
  }

  // === قاعدة 3: أصفر - إفراغ نشط ===
  if (activeDeedItems.length > 0) {
    const nouraReq = activeDeedItems.find((d: any) => isNouraOrAlwaleed(d.assigned_to));
    const mainDeed = nouraReq || activeDeedItems[0];
    return {
      ...baseResult,
      color: 'yellow',
      label: nouraReq ? 'Clearance - Noura/Alwaleed' : 'Clearance Active',
      labelAr: nouraReq ? `إفراغ - ${mainDeed.assigned_to}` : `إفراغ (${activeDeedItems.length})`,
      assignedTo: mainDeed.assigned_to || null,
      requestId: mainDeed.id,
      requestType: 'clearance',
      isDelayed: false,
      lastUpdated: mainDeed.updated_at || mainDeed.created_at,
      delayHours: getDelayHours(mainDeed.updated_at || mainDeed.created_at)
    };
  }

  // === قاعدة 4: أخضر - كل الأعمال مكتملة ===
  if (totalWorks > 0 && totalActive === 0) {
    return {
      ...baseResult,
      color: 'green',
      label: 'All Completed',
      labelAr: 'مكتمل بالكامل',
      assignedTo: null,
      requestId: null,
      requestType: null,
      isDelayed: false,
      lastUpdated: null,
      delayHours: 0,
      checklist: { total: totalWorks, completed: totalCompleted }
    };
  }

  // === قاعدة 5: أعمال مشاريع فقط (بدون طلبات فنية أو إفراغ) ===
  if (activeWorkItems.length > 0) {
    return {
      ...baseResult,
      color: 'blue',
      label: 'Works Active',
      labelAr: `أعمال نشطة (${activeWorkItems.length})`,
      assignedTo: null,
      requestId: null,
      requestType: null,
      isDelayed: false,
      lastUpdated: activeWorkItems[0]?.created_at || null,
      delayHours: 0
    };
  }

  // === الحالة الافتراضية: رمادي - لا يوجد أي عمل ===
  return {
    ...baseResult,
    color: 'gray',
    label: 'No Active Request',
    labelAr: 'لا يوجد طلب نشط',
    assignedTo: null,
    requestId: null,
    requestType: null,
    isDelayed: false,
    lastUpdated: null,
    delayHours: 0
  };
}

/**
 * الحصول على حالات جميع المشاريع مع ربط فعلي بالبيانات
 */
export function getAllUnitStatuses(
  projects: any[],
  technicalRequests: TechnicalRequest[],
  clearanceRequests: any[],
  projectWorks?: any[]
): Map<number, UnitStatus> {
  const statusMap = new Map<number, UnitStatus>();

  for (const project of projects) {
    const projectId = Number(project.id);
    const status = getUnitStatus(projectId, technicalRequests, clearanceRequests, projectWorks, project);
    statusMap.set(projectId, status);
  }

  return statusMap;
}

/**
 * ألوان CSS المقابلة لكل حالة
 */
export const STATUS_COLORS: Record<UnitStatusColor, { bg: string; border: string; text: string; fill: string; glow: string }> = {
  blue: {
    bg: 'bg-blue-100',
    border: 'border-blue-400',
    text: 'text-blue-700',
    fill: '#3B82F6',
    glow: 'shadow-blue-400/50'
  },
  yellow: {
    bg: 'bg-yellow-100',
    border: 'border-yellow-400',
    text: 'text-yellow-700',
    fill: '#EAB308',
    glow: 'shadow-yellow-400/50'
  },
  green: {
    bg: 'bg-green-100',
    border: 'border-green-400',
    text: 'text-green-700',
    fill: '#22C55E',
    glow: 'shadow-green-400/50'
  },
  'red-pulse': {
    bg: 'bg-red-100',
    border: 'border-red-500',
    text: 'text-red-700',
    fill: '#EF4444',
    glow: 'shadow-red-500/50'
  },
  gray: {
    bg: 'bg-gray-100',
    border: 'border-gray-300',
    text: 'text-gray-500',
    fill: '#9CA3AF',
    glow: 'shadow-gray-300/30'
  }
};
