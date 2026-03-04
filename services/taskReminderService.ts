/**
 * خدمة تذكيرات المهام بالذكاء الاصطناعي
 * تقوم بفحص المهام المُسندة وتوليد تنبيهات للمهام المتأخرة أو المقتربة من حد 48 ساعة
 */

import { ProjectWork, User } from '../types';

export interface TaskReminder {
  workId: number;
  taskName: string;
  projectName: string;
  assignedToName: string;
  hoursElapsed: number;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  suggestion: string;
}

const DEADLINE_HOURS = 48;
const WARNING_THRESHOLD = 36; // ساعة — تنبيه مبكر
const CRITICAL_THRESHOLD = 48; // ساعة — تنبيه حرج

/**
 * فحص المهام وتوليد التنبيهات
 * @param works - كل أعمال المشاريع
 * @param userId - معرف المستخدم الحالي (لإظهار تنبيهاته فقط)
 * @param users - قائمة المستخدمين (للأسماء)
 * @param userName - اسم المستخدم (للمطابقة بالاسم)
 * @param userEmail - بريد المستخدم (للمطابقة بالبريد)
 */
export function checkTaskReminders(
  works: ProjectWork[],
  userId: string,
  users: User[],
  userName?: string,
  userEmail?: string
): TaskReminder[] {
  const now = Date.now();
  const reminders: TaskReminder[] = [];

  // المهام المُسندة إلى هذا المستخدم وغير مُنجزة (مطابقة بالمعرف أو الاسم أو البريد)
  const myTasks = works.filter(
    w => (w.assigned_to === userId ||
         (userName && (w.assigned_to === userName || w.assigned_to_name === userName)) ||
         (userEmail && w.assigned_to === userEmail)) &&
         w.assignment_status !== 'completed' &&
         w.status !== 'completed' &&
         w.assigned_at
  );

  for (const work of myTasks) {
    const assignedTime = new Date(work.assigned_at!).getTime();
    const hoursElapsed = (now - assignedTime) / (1000 * 60 * 60);

    if (hoursElapsed >= CRITICAL_THRESHOLD) {
      const overHours = Math.round(hoursElapsed - DEADLINE_HOURS);
      reminders.push({
        workId: work.id,
        taskName: work.task_name,
        projectName: work.project_name || '',
        assignedToName: work.assigned_to_name || '',
        hoursElapsed: Math.round(hoursElapsed),
        severity: 'critical',
        message: `⚠️ المهمة "${work.task_name}" تأخرت ${overHours} ساعة عن الموعد المطلوب (48 ساعة)`,
        suggestion: 'يُرجى إنجاز هذه المهمة فوراً أو التواصل مع المدير لتحديث الموعد',
      });
    } else if (hoursElapsed >= WARNING_THRESHOLD) {
      const remaining = Math.round(DEADLINE_HOURS - hoursElapsed);
      reminders.push({
        workId: work.id,
        taskName: work.task_name,
        projectName: work.project_name || '',
        assignedToName: work.assigned_to_name || '',
        hoursElapsed: Math.round(hoursElapsed),
        severity: 'warning',
        message: `⏰ المهمة "${work.task_name}" ستصل لنهاية المهلة خلال ${remaining} ساعة`,
        suggestion: 'حاول إنهاء المهمة قبل انتهاء المهلة — يمكنك تحديث الحالة إلى "تحت الإجراء"',
      });
    } else if (hoursElapsed >= 12) {
      if (!work.assignment_status || work.assignment_status === 'pending') {
        reminders.push({
          workId: work.id,
          taskName: work.task_name,
          projectName: work.project_name || '',
          assignedToName: work.assigned_to_name || '',
          hoursElapsed: Math.round(hoursElapsed),
          severity: 'info',
          message: `📋 المهمة "${work.task_name}" مُسندة إليك منذ ${Math.round(hoursElapsed)} ساعة ولم تُبدأ بعد`,
          suggestion: 'ابدأ العمل على المهمة لتحديث الحالة وتجنب التأخير',
        });
      }
    }
  }

  // تنبيهات تاريخ الإنجاز المتوقع لأعمال المستخدم فقط
  const myDeadlineTasks = works.filter(
    w => w.expected_completion_date && 
         w.status !== 'completed' &&
         (w.assigned_to === userId ||
          (userName && (w.assigned_to === userName || w.assigned_to_name === userName)) ||
          (userEmail && w.assigned_to === userEmail))
  );

  for (const work of myDeadlineTasks) {
    // تجنب التكرار مع تنبيهات الإسناد أعلاه
    if (reminders.some(r => r.workId === work.id)) continue;
    
    const today = new Date();
    today.setHours(0,0,0,0);
    const target = new Date(work.expected_completion_date!);
    target.setHours(0,0,0,0);
    const diffDays = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      reminders.push({
        workId: work.id,
        taskName: work.task_name,
        projectName: work.project_name || '',
        assignedToName: work.assigned_to_name || '',
        hoursElapsed: Math.abs(diffDays) * 24,
        severity: 'critical',
        message: `🚨 "${work.task_name}" تجاوز تاريخ الإنجاز المتوقع بـ ${Math.abs(diffDays)} يوم`,
        suggestion: 'يجب إنجاز هذا العمل فوراً أو تحديث تاريخ الإنجاز المتوقع',
      });
    } else if (diffDays <= 3) {
      reminders.push({
        workId: work.id,
        taskName: work.task_name,
        projectName: work.project_name || '',
        assignedToName: work.assigned_to_name || '',
        hoursElapsed: diffDays * 24,
        severity: diffDays === 0 ? 'critical' : 'warning',
        message: diffDays === 0 
          ? `⚠️ "${work.task_name}" — اليوم آخر موعد للإنجاز!`
          : `⏰ "${work.task_name}" — متبقي ${diffDays} يوم على تاريخ الإنجاز المتوقع`,
        suggestion: 'تأكد من إنهاء العمل قبل الموعد المحدد',
      });
    }
  }

  // ترتيب: الحرج أولاً ثم التحذير ثم المعلومات
  const severityOrder: Record<string, number> = { critical: 0, warning: 1, info: 2 };
  reminders.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return reminders;
}

/**
 * فحص المهام المُسندة لجميع الموظفين (للمدير)
 * يعيد تنبيهات لكل المهام المتأخرة أو المقتربة من الحد
 */
export function checkAllTaskReminders(
  works: ProjectWork[],
  users: User[]
): TaskReminder[] {
  const now = Date.now();
  const reminders: TaskReminder[] = [];

  const assignedTasks = works.filter(
    w => w.assigned_to &&
         w.assignment_status !== 'completed' &&
         w.status !== 'completed' &&
         w.assigned_at
  );

  for (const work of assignedTasks) {
    const assignedTime = new Date(work.assigned_at!).getTime();
    const hoursElapsed = (now - assignedTime) / (1000 * 60 * 60);
    const assigneeName = work.assigned_to_name || users.find(u => u.id === work.assigned_to)?.name || 'غير معروف';

    if (hoursElapsed >= CRITICAL_THRESHOLD) {
      const overHours = Math.round(hoursElapsed - DEADLINE_HOURS);
      reminders.push({
        workId: work.id,
        taskName: work.task_name,
        projectName: work.project_name || '',
        assignedToName: assigneeName,
        hoursElapsed: Math.round(hoursElapsed),
        severity: 'critical',
        message: `⚠️ "${work.task_name}" (${assigneeName}) — تأخير ${overHours} ساعة`,
        suggestion: 'تواصل مع الموظف لمعرفة سبب التأخير',
      });
    } else if (hoursElapsed >= WARNING_THRESHOLD) {
      const remaining = Math.round(DEADLINE_HOURS - hoursElapsed);
      reminders.push({
        workId: work.id,
        taskName: work.task_name,
        projectName: work.project_name || '',
        assignedToName: assigneeName,
        hoursElapsed: Math.round(hoursElapsed),
        severity: 'warning',
        message: `⏰ "${work.task_name}" (${assigneeName}) — ${remaining} ساعة متبقية`,
        suggestion: 'تابع مع الموظف لضمان الإنجاز في الوقت المحدد',
      });
    }
  }

  const severityOrder: Record<string, number> = { critical: 0, warning: 1, info: 2 };
  reminders.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return reminders;
}
