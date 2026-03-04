/**
 * محرك تحليل الذكاء الاصطناعي - المحلل الاستباقي (Proactive Analyst Engine)
 * ============================================================================
 * يقرأ من DataContext وبيانات المشاريع لتقديم:
 *  1. تحليل المخاطر (عنق الزجاجة - تأخير >48 ساعة)
 *  2. التنبؤ بالتأخير (مقارنة وتيرة الإنجاز بالجدول الزمني)
 *  3. ملخص القيادة (3 نقاط للمدير)
 *  4. إشعارات استباقية للموظفين
 *  5. ذاكرة تحليلية لكل موضوع
 * ============================================================================
 */

import { ProjectSummary, TechnicalRequest, ProjectWork, User } from '../types';

// ============================================================================
//  أنواع البيانات
// ============================================================================

export interface BottleneckAlert {
  type: 'bottleneck';
  severity: 'critical' | 'warning' | 'info';
  requestId: number;
  requestType: 'technical' | 'clearance' | 'project_work';
  projectName: string;
  assignedTo: string;
  stuckSince: string;       // تاريخ آخر تحديث
  stuckHours: number;       // عدد الساعات منذ آخر تحديث
  stageName: string;        // اسم المرحلة العالقة
  suggestion: string;       // اقتراح الحل
}

export interface DelayPrediction {
  type: 'delay_prediction';
  projectId: number;
  projectName: string;
  currentProgress: number;
  expectedProgress: number;  // المتوقع بناء على الجدول الزمني
  completionRate: number;    // معدل الإنجاز الأسبوعي
  estimatedDelay: number;    // الأيام المتوقعة للتأخير
  riskLevel: 'high' | 'medium' | 'low';
  message: string;
}

export interface ExecutiveSummary {
  topPendingRequests: Array<{
    id: number;
    type: string;
    projectName: string;
    assignedTo: string;
    status: string;
    daysOld: number;
  }>;
  progressJumps: Array<{
    projectName: string;
    progressChange: number;
    currentProgress: number;
    completedRecently: number;
  }>;
  alerts: BottleneckAlert[];
  stats: {
    totalProjects: number;
    totalTechRequests: number;
    totalClearanceRequests: number;
    totalProjectWorks: number;
    pendingTechRequests: number;
    completedToday: number;
    activeBottlenecks: number;
  };
}

export interface EmployeeWorkload {
  name: string;
  email?: string;
  role?: string;
  assignedTech: number;
  assignedDeeds: number;
  pendingTotal: number;
  completedTotal: number;
  oldestPendingDays: number;
  items: Array<{
    id: number;
    type: string;
    projectName: string;
    status: string;
    daysSinceUpdate: number;
  }>;
}

export interface ConversationMemory {
  topic: string;
  context: any;
  timestamp: number;
  relatedProjectId?: number;
}

// ============================================================================
//  ثوابت
// ============================================================================

const BOTTLENECK_THRESHOLD_HOURS = 48;
const CRITICAL_THRESHOLD_HOURS = 96;
const COMPLETED_STATUSES = ['completed', 'منجز', 'مكتمل', 'تم الإفراغ', 'مقبول', 'approved'];
const PENDING_STATUSES = ['pending', 'جديد', 'قيد العمل', 'قيد المراجعة', 'in_progress', 'under_review', 'معلق', 'متابعة'];

// ============================================================================
//  أدوات مساعدة
// ============================================================================

const hoursSince = (dateStr: string): number => {
  if (!dateStr) return 0;
  const then = new Date(dateStr).getTime();
  const now = Date.now();
  return Math.max(0, (now - then) / (1000 * 60 * 60));
};

const daysSince = (dateStr: string): number => {
  return Math.floor(hoursSince(dateStr) / 24);
};

const isCompleted = (status: string): boolean => {
  return COMPLETED_STATUSES.includes(status?.toLowerCase?.() || '');
};

const isPending = (status: string): boolean => {
  return PENDING_STATUSES.includes(status?.toLowerCase?.() || '');
};

const normalizeText = (text: string): string => {
  if (!text) return '';
  return text.toLowerCase().trim()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/\s+/g, ' ');
};

// ============================================================================
//  1. تحليل المخاطر - عنق الزجاجة
// ============================================================================

export const analyzeBottlenecks = (
  technicalRequests: TechnicalRequest[],
  clearanceRequests: any[],
  projectWorks: ProjectWork[],
  projects: ProjectSummary[]
): BottleneckAlert[] => {
  const alerts: BottleneckAlert[] = [];

  // فحص الطلبات الفنية
  (technicalRequests || []).forEach(req => {
    if (isCompleted(req.status)) return;
    const lastUpdate = req.updated_at || req.created_at;
    const hours = hoursSince(lastUpdate);

    if (hours >= BOTTLENECK_THRESHOLD_HOURS) {
      const project = projects.find(p => p.id === req.project_id);
      alerts.push({
        type: 'bottleneck',
        severity: hours >= CRITICAL_THRESHOLD_HOURS ? 'critical' : 'warning',
        requestId: req.id,
        requestType: 'technical',
        projectName: req.project_name || project?.name || `مشروع #${req.project_id}`,
        assignedTo: req.assigned_to || 'غير معين',
        stuckSince: lastUpdate,
        stuckHours: Math.round(hours),
        stageName: req.service_type || req.status || 'مرحلة غير محددة',
        suggestion: hours >= CRITICAL_THRESHOLD_HOURS
          ? `🔴 تأخير حرج (${Math.round(hours / 24)} يوم)! يُنصح بتصعيد الطلب فوراً أو إعادة تعيينه لموظف آخر.`
          : `🟡 تجاوز الطلب ${Math.round(hours)} ساعة. يُنصح بمتابعة "${req.assigned_to || 'المسؤول'}" للحصول على تحديث.`
      });
    }
  });

  // فحص طلبات الإفراغ
  (clearanceRequests || []).forEach((req: any) => {
    if (isCompleted(req.status)) return;
    const lastUpdate = req.updated_at || req.created_at;
    const hours = hoursSince(lastUpdate);

    if (hours >= BOTTLENECK_THRESHOLD_HOURS) {
      alerts.push({
        type: 'bottleneck',
        severity: hours >= CRITICAL_THRESHOLD_HOURS ? 'critical' : 'warning',
        requestId: req.id,
        requestType: 'clearance',
        projectName: req.project_name || 'غير مرتبط بمشروع',
        assignedTo: req.assigned_to || 'غير معين',
        stuckSince: lastUpdate,
        stuckHours: Math.round(hours),
        stageName: req.request_type === 'METER_TRANSFER' ? 'نقل ملكية عداد' : 'إفراغ صك',
        suggestion: hours >= CRITICAL_THRESHOLD_HOURS
          ? `🔴 إفراغ متعطل (${Math.round(hours / 24)} يوم)! العميل "${req.client_name || ''}" ينتظر.`
          : `🟡 طلب الإفراغ متأخر ${Math.round(hours)} ساعة.`
      });
    }
  });

  // ترتيب: الأكثر تأخيراً أولاً
  return alerts.sort((a, b) => b.stuckHours - a.stuckHours);
};

// ============================================================================
//  2. التنبؤ بالتأخير
// ============================================================================

export const predictDelays = (
  projects: ProjectSummary[],
  technicalRequests: TechnicalRequest[],
  projectWorks: ProjectWork[]
): DelayPrediction[] => {
  const predictions: DelayPrediction[] = [];

  (projects || []).forEach(project => {
    const pid = project.id;
    const pName = project.name || project.title || `مشروع #${pid}`;

    // جمع كل الأعمال والطلبات المرتبطة
    const works = (projectWorks || []).filter(w =>
      Number(w.projectId ?? (w as any).projectid ?? (w as any).project_id) === pid
    );
    const techs = (technicalRequests || []).filter(t =>
      Number(t.project_id ?? t.projectId ?? (t as any).projectid) === pid
    );

    const allTasks = [...works, ...techs];
    if (allTasks.length === 0) return; // لا توجد مهام

    const completed = allTasks.filter(t => isCompleted(t.status));
    const pending = allTasks.filter(t => !isCompleted(t.status));
    const currentProgress = allTasks.length > 0 ? Math.round((completed.length / allTasks.length) * 100) : 0;

    // حساب معدل الإنجاز: كم مهمة أُنجزت في آخر 14 يوم
    const twoWeeksAgo = Date.now() - (14 * 24 * 60 * 60 * 1000);
    const recentlyCompleted = completed.filter(t => {
      const updateDate = new Date((t as any).updated_at || (t as any).created_at || '').getTime();
      return updateDate >= twoWeeksAgo;
    });

    const weeklyRate = recentlyCompleted.length / 2; // مهام/أسبوع

    // تقدير عدد الأسابيع لإنهاء المتبقي
    if (pending.length > 0 && weeklyRate > 0) {
      const weeksToComplete = pending.length / weeklyRate;
      const estimatedDays = Math.round(weeksToComplete * 7);

      let riskLevel: 'high' | 'medium' | 'low' = 'low';
      let message = '';

      if (estimatedDays > 60) {
        riskLevel = 'high';
        message = `⚠️ بالوتيرة الحالية (${weeklyRate.toFixed(1)} مهمة/أسبوع)، يحتاج المشروع ~${estimatedDays} يوم لإنهاء ${pending.length} مهمة متبقية. يُنصح بتعزيز الفريق.`;
      } else if (estimatedDays > 30) {
        riskLevel = 'medium';
        message = `📊 الوتيرة الحالية (${weeklyRate.toFixed(1)} مهمة/أسبوع) معقولة لكن قد تتأخر. المتبقي ~${estimatedDays} يوم.`;
      } else {
        message = `✅ المشروع يسير بوتيرة جيدة (${weeklyRate.toFixed(1)} مهمة/أسبوع). المتبقي ~${estimatedDays} يوم.`;
      }

      predictions.push({
        type: 'delay_prediction',
        projectId: pid,
        projectName: pName,
        currentProgress,
        expectedProgress: Math.min(100, currentProgress + Math.round(weeklyRate * 2 * 100 / allTasks.length)),
        completionRate: weeklyRate,
        estimatedDelay: estimatedDays,
        riskLevel,
        message
      });
    } else if (pending.length > 0 && weeklyRate === 0) {
      // لا يوجد إنجاز في آخر أسبوعين!
      predictions.push({
        type: 'delay_prediction',
        projectId: pid,
        projectName: pName,
        currentProgress,
        expectedProgress: currentProgress,
        completionRate: 0,
        estimatedDelay: -1, // غير قابل للتقدير
        riskLevel: 'high',
        message: `🔴 لم يتم إنجاز أي مهمة في آخر أسبوعين! يوجد ${pending.length} مهمة معلقة. المشروع بحاجة لتدخل فوري.`
      });
    }
  });

  return predictions.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.riskLevel] - order[b.riskLevel];
  });
};

// ============================================================================
//  3. ملخص القيادة (Executive Summary)
// ============================================================================

export const generateExecutiveSummary = (
  projects: ProjectSummary[],
  technicalRequests: TechnicalRequest[],
  clearanceRequests: any[],
  projectWorks: ProjectWork[]
): ExecutiveSummary => {
  // أهم الطلبات المعلقة (الأقدم أولاً)
  const allPending = [
    ...(technicalRequests || [])
      .filter(r => !isCompleted(r.status))
      .map(r => ({
        id: r.id,
        type: 'فني',
        projectName: r.project_name || `مشروع #${r.project_id}`,
        assignedTo: r.assigned_to || 'غير معين',
        status: r.status,
        daysOld: daysSince(r.updated_at || r.created_at)
      })),
    ...(clearanceRequests || [])
      .filter((r: any) => !isCompleted(r.status))
      .map((r: any) => ({
        id: r.id,
        type: r.request_type === 'METER_TRANSFER' ? 'نقل عداد' : 'إفراغ',
        projectName: r.project_name || '-',
        assignedTo: r.assigned_to || 'غير معين',
        status: r.status,
        daysOld: daysSince(r.updated_at || r.created_at)
      }))
  ].sort((a, b) => b.daysOld - a.daysOld);

  // المشاريع التي حققت قفزة في الإنجاز (أعلى progress)
  const sortedByProgress = [...(projects || [])]
    .filter(p => p.progress > 0)
    .sort((a, b) => b.progress - a.progress);

  const progressJumps = sortedByProgress.slice(0, 5).map(p => {
    const pid = p.id;
    const works = (projectWorks || []).filter(w =>
      Number(w.projectId ?? (w as any).projectid ?? (w as any).project_id) === pid
    );
    const techs = (technicalRequests || []).filter(t =>
      Number(t.project_id ?? t.projectId ?? (t as any).projectid) === pid
    );
    const allTasks = [...works, ...techs];
    const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const completedRecently = allTasks.filter(t => {
      if (!isCompleted(t.status)) return false;
      const d = new Date((t as any).updated_at || (t as any).created_at || '').getTime();
      return d >= weekAgo;
    });

    return {
      projectName: p.name || p.title || `مشروع #${pid}`,
      progressChange: completedRecently.length,
      currentProgress: p.progress,
      completedRecently: completedRecently.length
    };
  }).filter(p => p.completedRecently > 0);

  // التنبيهات (مخاطر)
  const bottlenecks = analyzeBottlenecks(technicalRequests, clearanceRequests, projectWorks, projects);

  // إحصائيات
  const today = new Date().toISOString().split('T')[0];
  const completedToday = [
    ...(technicalRequests || []).filter(r => isCompleted(r.status) && (r.updated_at || '').startsWith(today)),
    ...(clearanceRequests || []).filter((r: any) => isCompleted(r.status) && (r.updated_at || '').startsWith(today))
  ].length;

  return {
    topPendingRequests: allPending.slice(0, 10),
    progressJumps,
    alerts: bottlenecks,
    stats: {
      totalProjects: (projects || []).length,
      totalTechRequests: (technicalRequests || []).length,
      totalClearanceRequests: (clearanceRequests || []).length,
      totalProjectWorks: (projectWorks || []).length,
      pendingTechRequests: allPending.filter(r => r.type === 'فني').length,
      completedToday,
      activeBottlenecks: bottlenecks.filter(b => b.severity === 'critical').length
    }
  };
};

// ============================================================================
//  4. تحليل عبء العمل لكل موظف
// ============================================================================

export const analyzeEmployeeWorkload = (
  technicalRequests: TechnicalRequest[],
  clearanceRequests: any[],
  appUsers: User[]
): EmployeeWorkload[] => {
  const workloadMap: Record<string, EmployeeWorkload> = {};

  // تهيئة من قائمة المستخدمين
  (appUsers || []).forEach(u => {
    workloadMap[u.name] = {
      name: u.name,
      email: u.email,
      role: u.role,
      assignedTech: 0,
      assignedDeeds: 0,
      pendingTotal: 0,
      completedTotal: 0,
      oldestPendingDays: 0,
      items: []
    };
  });

  // الطلبات الفنية
  (technicalRequests || []).forEach(req => {
    const assignee = req.assigned_to;
    if (!assignee) return;
    if (!workloadMap[assignee]) {
      workloadMap[assignee] = {
        name: assignee, assignedTech: 0, assignedDeeds: 0,
        pendingTotal: 0, completedTotal: 0, oldestPendingDays: 0, items: []
      };
    }
    const w = workloadMap[assignee];
    w.assignedTech++;

    if (isCompleted(req.status)) {
      w.completedTotal++;
    } else {
      w.pendingTotal++;
      const days = daysSince(req.updated_at || req.created_at);
      if (days > w.oldestPendingDays) w.oldestPendingDays = days;
      w.items.push({
        id: req.id,
        type: 'فني',
        projectName: req.project_name || `#${req.project_id}`,
        status: req.status,
        daysSinceUpdate: days
      });
    }
  });

  // الإفراغات
  (clearanceRequests || []).forEach((req: any) => {
    const assignee = req.assigned_to;
    if (!assignee) return;
    if (!workloadMap[assignee]) {
      workloadMap[assignee] = {
        name: assignee, assignedTech: 0, assignedDeeds: 0,
        pendingTotal: 0, completedTotal: 0, oldestPendingDays: 0, items: []
      };
    }
    const w = workloadMap[assignee];
    w.assignedDeeds++;

    if (isCompleted(req.status)) {
      w.completedTotal++;
    } else {
      w.pendingTotal++;
      const days = daysSince(req.updated_at || req.created_at);
      if (days > w.oldestPendingDays) w.oldestPendingDays = days;
      w.items.push({
        id: req.id,
        type: req.request_type === 'METER_TRANSFER' ? 'نقل عداد' : 'إفراغ',
        projectName: req.project_name || '-',
        status: req.status,
        daysSinceUpdate: days
      });
    }
  });

  return Object.values(workloadMap)
    .filter(w => w.assignedTech + w.assignedDeeds > 0)
    .sort((a, b) => b.pendingTotal - a.pendingTotal);
};

// ============================================================================
//  5. ذاكرة المحادثة (Conversation Memory)
// ============================================================================

const MEMORY_KEY = 'dar_ai_memory';
const MAX_MEMORY_ITEMS = 50;

export const saveToMemory = (topic: string, context: any, projectId?: number): void => {
  try {
    const raw = localStorage.getItem(MEMORY_KEY);
    const memory: ConversationMemory[] = raw ? JSON.parse(raw) : [];

    memory.push({
      topic,
      context,
      timestamp: Date.now(),
      relatedProjectId: projectId
    });

    // الاحتفاظ بآخر 50 عنصراً فقط
    const trimmed = memory.slice(-MAX_MEMORY_ITEMS);
    localStorage.setItem(MEMORY_KEY, JSON.stringify(trimmed));
  } catch { /* تجاهل */ }
};

export const getMemory = (topic?: string, projectId?: number): ConversationMemory[] => {
  try {
    const raw = localStorage.getItem(MEMORY_KEY);
    if (!raw) return [];
    let memory: ConversationMemory[] = JSON.parse(raw);

    if (topic) {
      const norm = normalizeText(topic);
      memory = memory.filter(m => normalizeText(m.topic).includes(norm) || norm.includes(normalizeText(m.topic)));
    }
    if (projectId) {
      memory = memory.filter(m => m.relatedProjectId === projectId);
    }

    return memory.sort((a, b) => b.timestamp - a.timestamp);
  } catch {
    return [];
  }
};

export const getMemoryContext = (projectName: string): string => {
  const memories = getMemory(projectName);
  if (memories.length === 0) return '';

  const recent = memories.slice(0, 3);
  let ctx = '\n\n💾 **ذاكرة المساعد:**\n';
  recent.forEach(m => {
    const ago = Math.round((Date.now() - m.timestamp) / (1000 * 60 * 60));
    const timeLabel = ago < 1 ? 'منذ قليل' : ago < 24 ? `منذ ${ago} ساعة` : `منذ ${Math.round(ago / 24)} يوم`;
    ctx += `• ${timeLabel}: ${m.context}\n`;
  });
  return ctx;
};

// ============================================================================
//  6. تنسيق الإخراج (Formatters)
// ============================================================================

export const formatExecutiveSummary = (summary: ExecutiveSummary): string => {
  let text = `📋 **ملخص القيادة التنفيذي**\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

  // إحصائيات سريعة
  text += `📊 **الأرقام اليوم:**\n`;
  text += `• المشاريع: ${summary.stats.totalProjects} | فنية: ${summary.stats.totalTechRequests} | إفراغات: ${summary.stats.totalClearanceRequests}\n`;
  text += `• أعمال المشاريع: ${summary.stats.totalProjectWorks} | طلبات معلقة: ${summary.stats.pendingTechRequests}\n`;
  if (summary.stats.completedToday > 0) {
    text += `• ✅ أُنجز اليوم: ${summary.stats.completedToday}\n`;
  }
  text += `\n`;

  // 1. أهم الطلبات المعلقة
  text += `🔵 **أهم الطلبات المعلقة:**\n`;
  if (summary.topPendingRequests.length > 0) {
    summary.topPendingRequests.slice(0, 5).forEach((req, i) => {
      const urgency = req.daysOld > 5 ? '🔴' : req.daysOld > 2 ? '🟡' : '⚪';
      text += `${i + 1}. ${urgency} [${req.type}] ${req.projectName} → ${req.assignedTo} (${req.daysOld} يوم)\n`;
    });
  } else {
    text += `لا توجد طلبات معلقة! ✨\n`;
  }
  text += `\n`;

  // 2. قفزات الإنجاز
  text += `🟢 **مشاريع حققت إنجازاً هذا الأسبوع:**\n`;
  if (summary.progressJumps.length > 0) {
    summary.progressJumps.slice(0, 3).forEach(p => {
      text += `• ${p.projectName}: ${p.currentProgress}% (+${p.completedRecently} مهمة)\n`;
    });
  } else {
    text += `لا توجد قفزات إنجاز هذا الأسبوع.\n`;
  }
  text += `\n`;

  // 3. التنبيهات
  text += `🔴 **تنبيهات عاجلة:**\n`;
  const criticalAlerts = summary.alerts.filter(a => a.severity === 'critical');
  if (criticalAlerts.length > 0) {
    criticalAlerts.slice(0, 3).forEach(a => {
      text += `• ⚠️ ${a.projectName}: "${a.stageName}" عالق ${Math.round(a.stuckHours / 24)} يوم عند ${a.assignedTo}\n`;
    });
  } else if (summary.alerts.length > 0) {
    text += `• ${summary.alerts.length} تنبيه (غير حرج)\n`;
  } else {
    text += `لا توجد تنبيهات عاجلة ✅\n`;
  }

  return text;
};

export const formatBottleneckReport = (alerts: BottleneckAlert[]): string => {
  if (alerts.length === 0) return '✅ لا توجد اختناقات حالياً. جميع الطلبات تسير بشكل طبيعي.';

  let text = `⚠️ **تقرير عنق الزجاجة** (${alerts.length} طلب متأخر)\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

  const critical = alerts.filter(a => a.severity === 'critical');
  const warning = alerts.filter(a => a.severity === 'warning');

  if (critical.length > 0) {
    text += `🔴 **حرج (${critical.length}):**\n`;
    critical.forEach((a, i) => {
      text += `${i + 1}. ${a.projectName} → "${a.stageName}"\n`;
      text += `   📌 ${a.assignedTo} | ${Math.round(a.stuckHours / 24)} يوم\n`;
      text += `   💡 ${a.suggestion}\n\n`;
    });
  }

  if (warning.length > 0) {
    text += `🟡 **تحذير (${warning.length}):**\n`;
    warning.slice(0, 5).forEach((a, i) => {
      text += `${i + 1}. ${a.projectName} → "${a.stageName}" | ${a.assignedTo} | ${Math.round(a.stuckHours)} ساعة\n`;
    });
  }

  return text;
};

export const formatDelayPredictions = (predictions: DelayPrediction[]): string => {
  if (predictions.length === 0) return '✅ لا توجد تنبؤات بتأخيرات. المشاريع تسير بشكل جيد.';

  let text = `📈 **تنبؤات التأخير**\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

  const highRisk = predictions.filter(p => p.riskLevel === 'high');
  const medRisk = predictions.filter(p => p.riskLevel === 'medium');

  if (highRisk.length > 0) {
    text += `🔴 **مشاريع عالية الخطورة (${highRisk.length}):**\n`;
    highRisk.forEach((p, i) => {
      text += `${i + 1}. ${p.projectName} (${p.currentProgress}%)\n`;
      text += `   ${p.message}\n\n`;
    });
  }

  if (medRisk.length > 0) {
    text += `🟡 **مشاريع متوسطة الخطورة (${medRisk.length}):**\n`;
    medRisk.forEach((p, i) => {
      text += `${i + 1}. ${p.projectName} (${p.currentProgress}%) - ${p.message}\n`;
    });
  }

  const lowRisk = predictions.filter(p => p.riskLevel === 'low');
  if (lowRisk.length > 0) {
    text += `\n✅ **${lowRisk.length} مشروع يسير بوتيرة جيدة**\n`;
  }

  return text;
};

export const formatEmployeeReport = (
  employeeName: string,
  workloads: EmployeeWorkload[]
): string => {
  const norm = normalizeText(employeeName);
  const emp = workloads.find(w => normalizeText(w.name).includes(norm) || norm.includes(normalizeText(w.name)));

  if (!emp) return `لم أجد بيانات عمل للموظف "${employeeName}".`;

  let text = `👤 **تقرير أداء: ${emp.name}**\n`;
  if (emp.role) text += `📌 القسم: ${emp.role === 'TECHNICAL' ? 'فني' : emp.role === 'CONVEYANCE' ? 'إفراغات' : emp.role === 'PR_MANAGER' ? 'علاقات عامة' : 'إدارة'}\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

  text += `📊 **إحصائيات:**\n`;
  text += `• طلبات فنية: ${emp.assignedTech} | إفراغات: ${emp.assignedDeeds}\n`;
  text += `• ✅ منجز: ${emp.completedTotal} | ⏳ معلق: ${emp.pendingTotal}\n`;
  if (emp.oldestPendingDays > 0) {
    text += `• ⚠️ أقدم طلب معلق: ${emp.oldestPendingDays} يوم\n`;
  }
  text += `\n`;

  if (emp.items.length > 0) {
    text += `📝 **الطلبات المعلقة:**\n`;
    emp.items.sort((a, b) => b.daysSinceUpdate - a.daysSinceUpdate);
    emp.items.slice(0, 8).forEach((item, i) => {
      const urgency = item.daysSinceUpdate > 5 ? '🔴' : item.daysSinceUpdate > 2 ? '🟡' : '⚪';
      text += `${i + 1}. ${urgency} [${item.type}] ${item.projectName} - ${item.status} (${item.daysSinceUpdate} يوم)\n`;
    });
  }

  return text;
};

// ============================================================================
//  7. المعالج الذكي للأسئلة (Smart Query Router)
// ============================================================================

export interface AIResponse {
  text: string;
  actions: Array<{ label: string; type: string; data: any }>;
  memoryNote?: string;
}

export const processSmartQuery = (
  rawQuery: string,
  projects: ProjectSummary[],
  technicalRequests: TechnicalRequest[],
  clearanceRequests: any[],
  projectWorks: ProjectWork[],
  appUsers: User[],
  currentUser: any
): AIResponse => {
  const query = normalizeText(rawQuery);
  let actions: Array<{ label: string; type: string; data: any }> = [];

  // ============== أنماط الاستفسار ==============

  // 1. ملخص القيادة
  if (query.includes('ملخص') || query.includes('تقرير يومي') || query.includes('overview') || query.includes('الوضع العام') || query.includes('ملخص القياده') || query.includes('ملخص تنفيذي')) {
    const summary = generateExecutiveSummary(projects, technicalRequests, clearanceRequests, projectWorks);
    const text = formatExecutiveSummary(summary);
    saveToMemory('ملخص القيادة', `تم عرض ملخص: ${summary.stats.pendingTechRequests} معلق, ${summary.alerts.length} تنبيه`);
    return { text, actions };
  }

  // 2. تحليل المخاطر / عنق الزجاجة
  if (query.includes('مخاطر') || query.includes('تأخير') || query.includes('عنق') || query.includes('زجاجه') || query.includes('اختناق') || query.includes('bottleneck') || query.includes('تعطل') || query.includes('متأخر') || query.includes('عالق')) {
    const alerts = analyzeBottlenecks(technicalRequests, clearanceRequests, projectWorks, projects);
    const text = formatBottleneckReport(alerts);
    saveToMemory('تحليل المخاطر', `${alerts.length} اختناق: ${alerts.filter(a => a.severity === 'critical').length} حرج`);
    return { text, actions };
  }

  // 3. التنبؤ بالتأخير
  if (query.includes('تنبؤ') || query.includes('توقع') || query.includes('وتيره') || query.includes('سرعه') || query.includes('تسليم') || query.includes('predict') || query.includes('deadline') || query.includes('متى ينتهي')) {
    const predictions = predictDelays(projects, technicalRequests, projectWorks);
    const text = formatDelayPredictions(predictions);
    saveToMemory('تنبؤ التأخير', `${predictions.filter(p => p.riskLevel === 'high').length} خطر عالي`);
    return { text, actions };
  }

  // 4. تحليل موظف معين
  if (query.includes('موظف') || query.includes('اداء') || query.includes('عبء') || query.includes('شغل') || query.includes('عمل')) {
    // محاولة استخراج اسم الموظف من الاستعلام
    const workloads = analyzeEmployeeWorkload(technicalRequests, clearanceRequests, appUsers);
    
    // البحث عن اسم موظف في الاستعلام
    const matchedEmployee = workloads.find(w => {
      const empNorm = normalizeText(w.name);
      return query.includes(empNorm) || empNorm.split(' ').some(part => part.length > 2 && query.includes(part));
    });

    if (matchedEmployee) {
      const text = formatEmployeeReport(matchedEmployee.name, workloads);
      saveToMemory(`تحليل موظف: ${matchedEmployee.name}`, `معلق: ${matchedEmployee.pendingTotal}, منجز: ${matchedEmployee.completedTotal}`);
      return { text, actions };
    }

    // عرض ملخص جميع الموظفين
    let text = `👥 **توزيع عبء العمل**\n━━━━━━━━━━━━━━━━━━━━━\n\n`;
    workloads.slice(0, 10).forEach((w, i) => {
      const load = w.pendingTotal > 5 ? '🔴' : w.pendingTotal > 2 ? '🟡' : '🟢';
      text += `${i + 1}. ${load} ${w.name}: ${w.pendingTotal} معلق / ${w.completedTotal} منجز`;
      if (w.oldestPendingDays > 3) text += ` (⚠️ ${w.oldestPendingDays} يوم)`;
      text += `\n`;
    });
    text += `\n_اذكر اسم الموظف للحصول على تفاصيل أكثر._`;
    saveToMemory('عبء العمل', `تم عرض ملخص ${workloads.length} موظف`);
    return { text, actions };
  }

  // 5. تحليل إفراغات
  if (query.includes('افراغ') || query.includes('صك') || query.includes('افراغات') || query.includes('نقل ملكيه') || query.includes('عداد')) {
    const totalDeeds = clearanceRequests?.length || 0;
    const completedDeeds = clearanceRequests?.filter((d: any) => isCompleted(d.status)).length || 0;
    const pendingDeeds = totalDeeds - completedDeeds;
    const bottlenecks = analyzeBottlenecks([], clearanceRequests, [], projects);

    let text = `📄 **تحليل سجل الإفراغات**\n━━━━━━━━━━━━━━━━━━━━━\n\n`;
    text += `📊 الإجمالي: ${totalDeeds} | ✅ مكتمل: ${completedDeeds} | ⏳ معلق: ${pendingDeeds}\n\n`;

    if (bottlenecks.length > 0) {
      text += `⚠️ **إفراغات متأخرة (${bottlenecks.length}):**\n`;
      bottlenecks.slice(0, 5).forEach((b, i) => {
        text += `${i + 1}. ${b.projectName} | ${b.assignedTo} | ${Math.round(b.stuckHours / 24)} يوم\n`;
      });
    }

    // توزيع حسب المسؤول
    const byAssignee: Record<string, number> = {};
    clearanceRequests?.filter((d: any) => !isCompleted(d.status)).forEach((d: any) => {
      const a = d.assigned_to || 'غير معين';
      byAssignee[a] = (byAssignee[a] || 0) + 1;
    });
    if (Object.keys(byAssignee).length > 0) {
      text += `\n👥 **توزيع المعلقات:**\n`;
      Object.entries(byAssignee).sort((a, b) => b[1] - a[1]).forEach(([name, count]) => {
        text += `• ${name}: ${count} طلب\n`;
      });
    }

    actions.push({ label: 'فتح سجل الإفراغات العام', type: 'DEED', data: null });
    saveToMemory('تحليل الإفراغات', `${pendingDeeds} معلق, ${bottlenecks.length} متأخر`);
    return { text, actions };
  }

  // 6. طلبات فنية
  if (query.includes('فني') || query.includes('فنيه') || query.includes('طلب فني') || query.includes('تقني')) {
    const total = technicalRequests?.length || 0;
    const completed = technicalRequests?.filter(r => isCompleted(r.status)).length || 0;
    const pending = total - completed;
    const bottlenecks = analyzeBottlenecks(technicalRequests, [], [], projects);

    let text = `⚡ **تحليل الطلبات الفنية**\n━━━━━━━━━━━━━━━━━━━━━\n\n`;
    text += `📊 الإجمالي: ${total} | ✅ منجز: ${completed} | ⏳ معلق: ${pending}\n\n`;

    if (bottlenecks.length > 0) {
      text += `⚠️ **طلبات متأخرة (${bottlenecks.length}):**\n`;
      bottlenecks.slice(0, 5).forEach((b, i) => {
        text += `${i + 1}. ${b.projectName} → "${b.stageName}" | ${b.assignedTo} | ${Math.round(b.stuckHours / 24)} يوم\n`;
      });
    }

    // توزيع حسب نوع الخدمة
    const byService: Record<string, number> = {};
    technicalRequests?.filter(r => !isCompleted(r.status)).forEach(r => {
      const s = r.service_type || 'غير محدد';
      byService[s] = (byService[s] || 0) + 1;
    });
    if (Object.keys(byService).length > 0) {
      text += `\n📋 **حسب نوع الخدمة:**\n`;
      Object.entries(byService).sort((a, b) => b[1] - a[1]).forEach(([svc, count]) => {
        text += `• ${svc}: ${count}\n`;
      });
    }

    actions.push({ label: 'فتح الطلبات الفنية', type: 'TECHNICAL', data: null });
    saveToMemory('تحليل الطلبات الفنية', `${pending} معلق, ${bottlenecks.length} متأخر`);
    return { text, actions };
  }

  // 7. استعلام عن مشروع محدد (Enhanced)
  const matchedProject = projects?.find((p: any) => {
    const pName = normalizeText(p.name || p.title || '');
    return pName.includes(query) || query.includes(pName);
  });

  if (matchedProject) {
    const pId = Number(matchedProject.id);
    const pNameStr = matchedProject.name || matchedProject.title || 'مشروع غير مسمى';

    const relatedWorks = projectWorks?.filter((w: any) => Number(w.projectId ?? w.projectid ?? w.project_id) === pId) || [];
    const relatedTech = technicalRequests?.filter((t: any) => Number(t.project_id ?? t.projectId ?? (t as any).projectid) === pId) || [];
    const relatedDeeds = clearanceRequests?.filter((d: any) => {
      const dProjName = normalizeText(d.project_name || '');
      const pNameNorm = normalizeText(pNameStr);
      return dProjName.includes(pNameNorm) || pNameNorm.includes(dProjName);
    }) || [];

    const allTasks = [...relatedWorks, ...relatedTech];
    const completedTasks = allTasks.filter(t => isCompleted(t.status));
    const pendingTasks = allTasks.filter(t => !isCompleted(t.status));

    // تحليل المخاطر الخاصة بالمشروع
    const projectBottlenecks = analyzeBottlenecks(
      relatedTech, relatedDeeds, relatedWorks, [matchedProject]
    );

    let text = `🏗️ **تحليل مشروع: ${pNameStr}**\n`;
    text += `📍 ${matchedProject.location || 'غير محدد'} | الإنجاز: ${matchedProject.progress || 0}%\n`;

    // المسؤول المرمّز
    if (matchedProject.project_lead_name) {
      text += `👤 المسؤول المرمّز: ${matchedProject.project_lead_name}\n`;
    }
    text += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

    text += `📊 **الإحصائيات:**\n`;
    text += `• إجمالي المهام: ${allTasks.length + relatedDeeds.length}\n`;
    text += `• ✅ منجز: ${completedTasks.length} | ⏳ قيد العمل: ${pendingTasks.length} | 📄 إفراغات: ${relatedDeeds.length}\n\n`;

    // تحذيرات المخاطر
    if (projectBottlenecks.length > 0) {
      text += `⚠️ **تنبيهات المخاطر (${projectBottlenecks.length}):**\n`;
      projectBottlenecks.slice(0, 3).forEach(b => {
        text += `• ${b.severity === 'critical' ? '🔴' : '🟡'} "${b.stageName}" عالق ${Math.round(b.stuckHours / 24)} يوم عند ${b.assignedTo}\n`;
      });
      text += `\n`;
    }

    // التنبؤ بالإنجاز
    const projPredictions = predictDelays([matchedProject], relatedTech, relatedWorks);
    if (projPredictions.length > 0) {
      text += `📈 **التنبؤ:** ${projPredictions[0].message}\n\n`;
    }

    // أبرز الأعمال
    if (completedTasks.length > 0) {
      text += `✅ **أبرز المنجز:**\n`;
      completedTasks.slice(0, 3).forEach(t => {
        text += `- ${(t as any).task_name || (t as any).service_type || 'مهمة'}\n`;
      });
    }
    if (pendingTasks.length > 0) {
      text += `\n⏳ **قيد المتابعة:**\n`;
      pendingTasks.slice(0, 3).forEach(t => {
        text += `- ${(t as any).task_name || (t as any).service_type || 'مهمة'} (${(t as any).assigned_to || 'غير معين'})\n`;
      });
    }

    // الذاكرة
    const memoryCtx = getMemoryContext(pNameStr);
    if (memoryCtx) text += memoryCtx;

    actions.push({ label: `فتح ملف المشروع`, type: 'PROJECT', data: matchedProject });
    saveToMemory(pNameStr, `استُعرض: ${completedTasks.length}/${allTasks.length} منجز, ${projectBottlenecks.length} تنبيه`, pId);
    return { text, actions };
  }

  // 8. بحث عن اسم موظف مباشرة
  const matchedUser = appUsers?.find(u => {
    const uName = normalizeText(u.name || '');
    return uName.includes(query) || query.includes(uName) || uName.split(' ').some(part => part.length > 2 && query.includes(part));
  });

  if (matchedUser) {
    const workloads = analyzeEmployeeWorkload(technicalRequests, clearanceRequests, appUsers);
    const text = formatEmployeeReport(matchedUser.name, workloads);
    saveToMemory(`موظف: ${matchedUser.name}`, `تم عرض تقرير الأداء`);
    return { text, actions };
  }

  // 9. مساعدة عامة
  if (query.includes('مساعد') || query.includes('help') || query.includes('ماذا تستطيع') || query.includes('قدرات')) {
    let text = `🤖 **قدرات المساعد الذكي**\n━━━━━━━━━━━━━━━━━━━━━\n\n`;
    text += `يمكنني مساعدتك في:\n\n`;
    text += `📋 **"ملخص"** → ملخص القيادة التنفيذي (3 نقاط)\n`;
    text += `⚠️ **"مخاطر"** → تحليل عنق الزجاجة والتأخيرات\n`;
    text += `📈 **"تنبؤ"** → توقعات التأخير لكل مشروع\n`;
    text += `👥 **"موظفين"** → عبء العمل وتوزيعه\n`;
    text += `📄 **"إفراغات"** → تحليل سجل الإفراغات\n`;
    text += `⚡ **"فني"** → تحليل الطلبات الفنية\n`;
    text += `🏗️ **"اسم مشروع"** → تقرير مفصل عن المشروع\n`;
    text += `👤 **"اسم موظف"** → تقرير أداء الموظف\n\n`;
    text += `_أملك ذاكرة تراكمية - كل ما تسألني عنه أتذكره لتحليل أفضل!_`;
    return { text, actions };
  }

  // Fallback - اقتراحات
  let text = `عذراً، لم أتمكن من فهم الاستعلام بدقة.\n\n`;
  text += `💡 **جرّب:**\n`;
  text += `• "ملخص" - ملخص تنفيذي شامل\n`;
  text += `• "مخاطر" - تحليل التأخيرات\n`;
  text += `• "تنبؤ" - توقعات الإنجاز\n\n`;
  text += `🏗️ **أو اذكر اسم مشروع:**\n`;
  const suggestions = projects?.slice(0, 4).map(p => `• ${p.name || p.title}`).join('\n');
  text += suggestions || 'لا توجد مشاريع.';
  return { text, actions };
};
