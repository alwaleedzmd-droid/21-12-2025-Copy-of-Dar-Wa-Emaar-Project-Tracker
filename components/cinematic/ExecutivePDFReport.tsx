// ExecutivePDFReport.tsx — تقرير تنفيذي شامل PDF
// يشمل جميع أقسام الواجهة السينمائية: KPIs، صحة المشاريع، SLA، المختنقات، المقارنة الشهرية، سجل النشاط
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FileDown, Loader2, FileText, AlertTriangle, CheckCircle2, BarChart3 } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { activityLogService } from '../../services/activityLogService';

const STATUS_AR: Record<string, string> = {
  active: 'نشط',
  completed: 'مكتمل',
  pending: 'قيد الانتظار',
  on_hold: 'متوقف',
  cancelled: 'ملغى',
  approved: 'مقبول',
  rejected: 'مرفوض',
  new: 'جديد',
};

const ACTION_AR: Record<string, string> = {
  create: 'إنشاء', update: 'تحديث', delete: 'حذف',
  approve: 'موافقة', reject: 'رفض', assign: 'تعيين',
  complete: 'إتمام', comment: 'تعليق', import: 'استيراد',
};

// ── حساب درجة صحة المشروع (مطابق لمنطق ProjectHealthScore) ──
function computeHealthScore(project: any, works: any[]) {
  const now = Date.now();
  const pw = works.filter(w => String(w.projectId) === String(project.id));
  const total = pw.length;
  const completed = pw.filter(w => w.status === 'completed').length;
  const progressScore = total > 0 ? (completed / total) * 35 : 0;

  let delayScore = 40;
  pw.filter(w => w.status !== 'completed').forEach(w => {
    const due = w.expected_completion_date ? new Date(w.expected_completion_date).getTime() : null;
    if (due && now > due) delayScore -= Math.min(10, ((now - due) / 86400000) * 1.5);
  });
  delayScore = Math.max(0, delayScore);

  let onTimeHit = 0;
  pw.filter(w => w.status === 'completed').forEach(w => {
    const due = w.expected_completion_date ? new Date(w.expected_completion_date).getTime() : null;
    const done = w.completed_at ? new Date(w.completed_at).getTime() : null;
    if (due && done && done <= due + 86400000) onTimeHit++;
  });
  const onTimeFinal = completed > 0 ? (onTimeHit / completed) * 25 : 0;

  const score = Math.min(100, Math.max(0, Math.round(progressScore + delayScore + onTimeFinal)));
  const grade = score >= 80 ? 'ممتاز' : score >= 60 ? 'جيد' : score >= 40 ? 'تحذير' : 'حرج';
  const gradeColor = score >= 80 ? '#22C55E' : score >= 60 ? '#3B82F6' : score >= 40 ? '#F59E0B' : '#EF4444';
  const gradeBg   = score >= 80 ? '#D1FAE5' : score >= 60 ? '#DBEAFE' : score >= 40 ? '#FEF3C7' : '#FEE2E2';
  return { score, grade, gradeColor, gradeBg };
}

const ExecutivePDFReport: React.FC = () => {
  const { projects, technicalRequests, clearanceRequests, projectWorks, currentUser } = useData();
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import('jspdf'),
        import('html2canvas'),
      ]);

      const now = Date.now();
      const today = new Date().toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });

      // ── مؤشرات أساسية (CinematicStats) ──
      const totalProjects   = projects.length;
      const completedProjects = projects.filter(p => p.status === 'completed' || p.progress >= 100).length;
      const activeProjects  = totalProjects - completedProjects;
      const avgProgress     = totalProjects > 0 ? Math.round(projects.reduce((s, p) => s + (p.progress || 0), 0) / totalProjects) : 0;
      const totalWorks      = projectWorks.length;
      const completedWorks  = projectWorks.filter(w => w.status === 'completed').length;
      const inProgressWorks = totalWorks - completedWorks;
      const completionRate  = totalWorks > 0 ? Math.round((completedWorks / totalWorks) * 100) : 0;
      const pendingTech     = technicalRequests.filter(r => !['completed', 'approved', 'rejected', 'cancelled'].includes(r.status || '')).length;

      const allBottlenecks = projectWorks.filter(w => {
        if (w.status === 'completed') return false;
        return (now - new Date(w.created_at).getTime()) > 7 * 86400000;
      });
      const slaBreaches = projectWorks.filter(w => {
        if (w.status === 'completed') return false;
        const due = w.expected_completion_date ? new Date(w.expected_completion_date).getTime() : null;
        const age = now - new Date(w.created_at).getTime();
        return (due && now > due) || age > 14 * 86400000;
      }).length;

      // ── صحة المشاريع (ProjectHealthScore) ──
      const healthScores = projects.map(p => ({ ...p, ...computeHealthScore(p, projectWorks) }))
        .sort((a, b) => a.score - b.score);
      const avgHealth = healthScores.length > 0
        ? Math.round(healthScores.reduce((s, p) => s + p.score, 0) / healthScores.length) : 0;
      const healthDist = {
        'ممتاز': healthScores.filter(p => p.score >= 80).length,
        'جيد':   healthScores.filter(p => p.score >= 60 && p.score < 80).length,
        'تحذير': healthScores.filter(p => p.score >= 40 && p.score < 60).length,
        'حرج':   healthScores.filter(p => p.score < 40).length,
      };

      // ── تجاوزات SLA (SLANotifications) ──
      const slaAlerts = projectWorks
        .filter(w => w.status !== 'completed')
        .map(w => {
          const due = w.expected_completion_date ? new Date(w.expected_completion_date).getTime() : null;
          const age = now - new Date(w.created_at).getTime();
          const daysOverdue = due ? Math.max(0, Math.floor((now - due) / 86400000)) : Math.floor(age / 86400000);
          const severity = daysOverdue >= 14 ? 'حرج' : daysOverdue >= 7 ? 'تحذير' : daysOverdue >= 4 ? 'قريب' : null;
          return severity ? { ...w, daysOverdue, severity } : null;
        })
        .filter(Boolean)
        .sort((a, b) => b!.daysOverdue - a!.daysOverdue)
        .slice(0, 12) as any[];

      // ── المقارنة الشهرية (MonthlyComparison) ──
      const months: { label: string; completed: number; created: number; delayed: number; tech: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i);
        const monthStart = d.getTime();
        const monthEnd   = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).getTime();
        const label      = d.toLocaleDateString('ar-SA', { month: 'short', year: '2-digit' });
        months.push({
          label,
          completed: projectWorks.filter(w => { const t = w.completed_at ? new Date(w.completed_at).getTime() : null; return t && t >= monthStart && t <= monthEnd; }).length,
          created:   projectWorks.filter(w => { const t = new Date(w.created_at).getTime(); return t >= monthStart && t <= monthEnd; }).length,
          delayed:   projectWorks.filter(w => { if (w.status === 'completed') return false; const t = new Date(w.created_at).getTime(); return t >= monthStart && t <= monthEnd && (now - t) > 7 * 86400000; }).length,
          tech:      technicalRequests.filter(r => { const t = new Date(r.created_at).getTime(); return t >= monthStart && t <= monthEnd; }).length,
        });
      }

      // ── سجل النشاط (ActivityTimeline) ──
      let recentActivity: any[] = [];
      try { recentActivity = await activityLogService.getRecent(10); } catch {}

      // ══════════════════════════════════════════════════
      //  بناء HTML للتقرير
      // ══════════════════════════════════════════════════
      const sec = (title: string, sub: string) =>
        `<div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;margin-top:28px;">
          <div style="width:5px;height:30px;background:#E95D22;border-radius:3px;flex-shrink:0;"></div>
          <div>
            <div style="font-size:15px;font-weight:900;color:#1B2B48;">${title}</div>
            <div style="font-size:9px;color:#9CA3AF;">${sub}</div>
          </div>
        </div>`;

      const th = (cols: string[]) =>
        `<tr style="background:#1B2B48;">${cols.map((c, i) =>
          `<th style="padding:9px 10px;text-align:${i===0?'right':'center'};font-size:10px;color:#fff;font-weight:700;">${c}</th>`).join('')}</tr>`;

      // KPI cards
      const kpiHTML = [
        ['إجمالي المشاريع',  totalProjects,                `نشط: ${activeProjects} | مكتمل: ${completedProjects}`, '#1B2B48'],
        ['متوسط التقدم',     `${avgProgress}%`,            'متوسط نسبة إنجاز المشاريع',                          '#3B82F6'],
        ['المختنقات',        allBottlenecks.length,        'مهام متأخرة أكثر من 7 أيام',                         allBottlenecks.length > 0 ? '#EF4444' : '#22C55E'],
        ['الطلبات الفنية',   technicalRequests.length,     `قيد الانتظار: ${pendingTech}`,                       '#E95D22'],
        ['سجلات الإفراغ',   clearanceRequests.length,     'إجمالي سجلات الصكوك',                                '#8B5CF6'],
        ['إجمالي المهام',    totalWorks,                   `مكتمل: ${completedWorks} | جاري: ${inProgressWorks}`, '#14B8A6'],
        ['نسبة الإنجاز',    `${completionRate}%`,          'نسبة المهام المكتملة',                               '#F59E0B'],
        ['تجاوزات SLA',     slaBreaches,                  'مهام تجاوزت الموعد المحدد',                          slaBreaches > 0 ? '#EF4444' : '#22C55E'],
      ].map(([l, v, s, c]) =>
        `<div style="background:#F8FAFC;border-radius:12px;padding:14px;text-align:center;border:1px solid #E5E7EB;">
          <div style="font-size:24px;font-weight:900;color:${c};margin-bottom:3px;">${v}</div>
          <div style="font-size:11px;font-weight:700;color:#1B2B48;margin-bottom:2px;">${l}</div>
          <div style="font-size:9px;color:#9CA3AF;">${s}</div>
        </div>`).join('');

      // Health score distribution badges
      const healthDistHTML = Object.entries(healthDist).map(([g, c]) => {
        const clr = g==='ممتاز'?'#22C55E':g==='جيد'?'#3B82F6':g==='تحذير'?'#F59E0B':'#EF4444';
        const bg  = g==='ممتاز'?'#D1FAE5':g==='جيد'?'#DBEAFE':g==='تحذير'?'#FEF3C7':'#FEE2E2';
        return `<div style="background:${bg};border-radius:10px;padding:12px;text-align:center;">
          <div style="font-size:22px;font-weight:900;color:${clr};">${c}</div>
          <div style="font-size:11px;font-weight:700;color:${clr};">${g}</div>
        </div>`;
      }).join('');

      // Health score table rows
      const healthRowsHTML = healthScores.slice(0, 20).map((p, i) => {
        const pw   = projectWorks.filter(w => String(w.projectId) === String(p.id));
        const done = pw.filter(w => w.status === 'completed').length;
        return (
          '<tr style="background:' + (i%2===0?'#fff':'#F9FAFB') + ';">' +
          '<td style="padding:7px 10px;font-size:11px;border-bottom:1px solid #F0F0F0;text-align:center;">' + (i+1) + '</td>' +
          '<td style="padding:7px 10px;font-size:11px;border-bottom:1px solid #F0F0F0;">' + (p.title||p.name||'').substring(0,32) + '</td>' +
          '<td style="padding:7px 10px;border-bottom:1px solid #F0F0F0;"><div style="display:flex;align-items:center;gap:5px;direction:ltr;"><div style="width:60px;height:6px;background:#E5E7EB;border-radius:3px;overflow:hidden;"><div style="width:' + p.score + '%;height:100%;background:' + p.gradeColor + ';border-radius:3px;"></div></div><span style="font-size:10px;font-weight:700;">' + p.score + '</span></div></td>' +
          '<td style="padding:7px 10px;border-bottom:1px solid #F0F0F0;text-align:center;"><span style="background:' + p.gradeBg + ';color:' + p.gradeColor + ';padding:2px 8px;border-radius:20px;font-size:9px;font-weight:700;">' + p.grade + '</span></td>' +
          '<td style="padding:7px 10px;font-size:11px;border-bottom:1px solid #F0F0F0;text-align:center;">' + done + '/' + pw.length + '</td>' +
          '</tr>'
        );
      }).join('');

      // SLA rows
      const slaRowsHTML = slaAlerts.length === 0
        ? `<tr><td colspan="5" style="text-align:center;padding:14px;color:#9CA3AF;font-size:11px;">لا توجد تجاوزات</td></tr>`
        : slaAlerts.map((a, i) => {
            const sevBg  = a.severity==='حرج'?'#FEE2E2':a.severity==='تحذير'?'#FEF3C7':'#DBEAFE';
            const sevClr = a.severity==='حرج'?'#991B1B':a.severity==='تحذير'?'#92400E':'#1E40AF';
            return `<tr style="background:${i%2===0?'#fff':'#F9FAFB'};">
              <td style="padding:7px 10px;font-size:10px;border-bottom:1px solid #F0F0F0;">${(a.task_name||'').substring(0,28)}</td>
              <td style="padding:7px 10px;font-size:10px;border-bottom:1px solid #F0F0F0;">${a.project_name||''}</td>
              <td style="padding:7px 10px;font-size:10px;border-bottom:1px solid #F0F0F0;">${a.current_handler||a.assigned_to_name||a.assigned_to||'—'}</td>
              <td style="padding:7px 10px;font-size:10px;border-bottom:1px solid #F0F0F0;text-align:center;">${a.daysOverdue} يوم</td>
              <td style="padding:7px 10px;border-bottom:1px solid #F0F0F0;text-align:center;">
                <span style="background:${sevBg};color:${sevClr};padding:2px 8px;border-radius:20px;font-size:9px;font-weight:700;">${a.severity}</span>
              </td>
            </tr>`;
          }).join('');

      // Bottleneck rows (ManagerialRadar)
      const bnRowsHTML = allBottlenecks.length === 0
        ? `<tr><td colspan="4" style="text-align:center;padding:14px;color:#9CA3AF;font-size:11px;">لا توجد مختنقات</td></tr>`
        : allBottlenecks.slice(0, 12).map((w, i) => {
            const days = Math.floor((now - new Date(w.created_at).getTime()) / 86400000);
            const cls  = days>=14?{bg:'#FEE2E2',clr:'#991B1B',lbl:'حرج'}:days>=7?{bg:'#FEF3C7',clr:'#92400E',lbl:'تحذير'}:{bg:'#DBEAFE',clr:'#1E40AF',lbl:'قريب'};
            return `<tr style="background:${i%2===0?'#fff':'#F9FAFB'};">
              <td style="padding:7px 10px;font-size:10px;border-bottom:1px solid #F0F0F0;">${(w.task_name||'').substring(0,28)}</td>
              <td style="padding:7px 10px;font-size:10px;border-bottom:1px solid #F0F0F0;">${w.project_name||''}</td>
              <td style="padding:7px 10px;font-size:10px;border-bottom:1px solid #F0F0F0;">${w.current_handler||w.assigned_to||'—'}</td>
              <td style="padding:7px 10px;border-bottom:1px solid #F0F0F0;text-align:center;">
                <span style="background:${cls.bg};color:${cls.clr};padding:2px 8px;border-radius:20px;font-size:9px;font-weight:700;">${days} يوم — ${cls.lbl}</span>
              </td>
            </tr>`;
          }).join('');

      // Projects full table (GanttTimeline simplified)
      const projectRowsHTML = projects.slice(0, 25).map((p, i) => {
        const pw   = projectWorks.filter(w => String(w.projectId) === String(p.id));
        const done = pw.filter(w => w.status === 'completed').length;
        const prog = p.progress || 0;
        const progColor = prog>=100?'#22C55E':prog>=50?'#E95D22':'#EF4444';
        const isComp    = p.status==='completed'||prog>=100;
        const statusAr  = STATUS_AR[p.status||''] || (isComp?'مكتمل':'نشط');
        const { score, grade, gradeColor, gradeBg } = computeHealthScore(p, projectWorks);
        return `<tr style="background:${i%2===0?'#fff':'#F9FAFB'};">
          <td style="padding:7px 8px;font-size:10px;border-bottom:1px solid #F0F0F0;text-align:center;">${i+1}</td>
          <td style="padding:7px 8px;font-size:10px;border-bottom:1px solid #F0F0F0;">${(p.title||p.name||'').substring(0,28)}</td>
          <td style="padding:7px 8px;border-bottom:1px solid #F0F0F0;">
            <div style="display:flex;align-items:center;gap:4px;direction:ltr;">
              <div style="width:50px;height:5px;background:#E5E7EB;border-radius:2px;overflow:hidden;">
                <div style="width:${prog}%;height:100%;background:${progColor};border-radius:2px;"></div>
              </div>
              <span style="font-size:9px;font-weight:700;">${prog}%</span>
            </div>
          </td>
          <td style="padding:7px 8px;border-bottom:1px solid #F0F0F0;text-align:center;">
            <span style="background:${isComp?'#D1FAE5':'#DBEAFE'};color:${isComp?'#065F46':'#1E40AF'};padding:2px 6px;border-radius:20px;font-size:9px;font-weight:700;">${statusAr}</span>
          </td>
          <td style="padding:7px 8px;font-size:10px;border-bottom:1px solid #F0F0F0;text-align:center;">${done}/${pw.length}</td>
          <td style="padding:7px 8px;border-bottom:1px solid #F0F0F0;text-align:center;">
            <span style="background:${gradeBg};color:${gradeColor};padding:2px 6px;border-radius:20px;font-size:9px;font-weight:700;">${grade} (${score})</span>
          </td>
        </tr>`;
      }).join('');

      // Monthly comparison table
      const monthlyHTML = months.map(m =>
        `<tr>
          <td style="padding:8px 12px;font-size:11px;font-weight:700;border-bottom:1px solid #F0F0F0;">${m.label}</td>
          <td style="padding:8px 12px;font-size:11px;text-align:center;border-bottom:1px solid #F0F0F0;color:#22C55E;font-weight:700;">${m.completed}</td>
          <td style="padding:8px 12px;font-size:11px;text-align:center;border-bottom:1px solid #F0F0F0;color:#3B82F6;font-weight:700;">${m.created}</td>
          <td style="padding:8px 12px;font-size:11px;text-align:center;border-bottom:1px solid #F0F0F0;color:#EF4444;font-weight:700;">${m.delayed}</td>
          <td style="padding:8px 12px;font-size:11px;text-align:center;border-bottom:1px solid #F0F0F0;color:#E95D22;font-weight:700;">${m.tech}</td>
        </tr>`).join('');

      // Activity log
      const actHTML = recentActivity.length === 0
        ? `<p style="color:#9CA3AF;font-size:11px;text-align:center;padding:12px;">لا توجد بيانات نشاط</p>`
        : recentActivity.map(a => {
            const actionAr = ACTION_AR[a.action_type] || a.action_type || '';
            const date = a.created_at ? new Date(a.created_at).toLocaleDateString('ar-SA',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}) : '';
            return `<div style="display:flex;align-items:flex-start;gap:10px;padding:7px 0;border-bottom:1px solid #F5F5F5;">
              <div style="min-width:8px;height:8px;border-radius:50%;background:#E95D22;margin-top:4px;flex-shrink:0;"></div>
              <div>
                <div style="font-size:10px;font-weight:700;color:#1B2B48;">${actionAr}: ${a.entity_name||a.description||''}</div>
                <div style="font-size:9px;color:#9CA3AF;">${a.user_name||''} | ${date}</div>
              </div>
            </div>`;
          }).join('');

      // ══════════════════════════════════════════════════
      //  HTML الكامل
      // ══════════════════════════════════════════════════
      const reportHTML = `
        <div style="font-family:'Cairo','Arial',sans-serif;background:#fff;direction:rtl;width:794px;padding:28px;color:#222;box-sizing:border-box;">

          <!-- HEADER -->
          <div style="background:linear-gradient(135deg,#1B2B48,#2d4a7a);color:white;padding:24px 32px;border-radius:14px;text-align:center;">
            <div style="font-size:24px;font-weight:900;margin-bottom:6px;">دار وعمار — التقرير التنفيذي الشامل</div>
            <div style="font-size:11px;opacity:0.85;margin-bottom:3px;">${today} | أُعِدَّ بواسطة: ${currentUser?.name||'النظام'}</div>
            <div style="font-size:9px;opacity:0.65;">يشمل: مؤشرات الأداء • صحة المشاريع • تجاوزات SLA • رادار المختنقات • الخط الزمني • المقارنة الشهرية • سجل النشاط</div>
          </div>
          <div style="height:4px;background:linear-gradient(90deg,#E95D22,#1B2B48);border-radius:2px;margin:10px 0 0;"></div>

          <!-- SECTION 1: KPIs -->
          ${sec('مؤشرات الأداء الرئيسية','نبض العمليات — الإحصائيات اللحظية')}
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:4px;">
            ${kpiHTML}
          </div>

          <!-- SECTION 2: صحة المشاريع -->
          ${sec('مؤشر صحة المشاريع','توزيع حالة المحفظة حسب درجة الصحة')}
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:14px;">
            ${healthDistHTML}
          </div>
          <table style="width:100%;border-collapse:collapse;margin-bottom:4px;">
            <thead>${th(['#','المشروع','درجة الصحة','التقييم','المهام'])}</thead>
            <tbody>${healthRowsHTML}</tbody>
          </table>

          <!-- SECTION 3: SLA -->
          ${sec('إشعارات تجاوز المواعيد','مراقبة SLA — المهام المتأخرة عن موعدها')}
          <table style="width:100%;border-collapse:collapse;margin-bottom:4px;">
            <thead>${th(['المهمة','المشروع','المسؤول','التأخير','الخطورة'])}</thead>
            <tbody>${slaRowsHTML}</tbody>
          </table>

          <!-- SECTION 4: رادار المختنقات -->
          ${sec('رادار المختنقات','الرؤية الاستراتيجية — مهام متوقفة تحتاج تدخلاً')}
          <table style="width:100%;border-collapse:collapse;margin-bottom:4px;">
            <thead>${th(['المهمة','المشروع','المسؤول','مدة التأخير'])}</thead>
            <tbody>${bnRowsHTML}</tbody>
          </table>

          <!-- SECTION 5: حالة المشاريع -->
          ${sec('حالة المشاريع','نظرة شاملة — الخط الزمني ونسب الإنجاز')}
          <table style="width:100%;border-collapse:collapse;margin-bottom:4px;">
            <thead>${th(['#','المشروع','الإنجاز','الحالة','المهام','الصحة'])}</thead>
            <tbody>${projectRowsHTML}</tbody>
          </table>

          <!-- SECTION 6: المقارنة الشهرية -->
          ${sec('المقارنة الشهرية','تحليل الأداء — آخر 6 أشهر')}
          <table style="width:100%;border-collapse:collapse;margin-bottom:4px;">
            <thead>
              <tr style="background:#1B2B48;">
                <th style="padding:9px 12px;text-align:right;font-size:10px;color:#fff;">الشهر</th>
                <th style="padding:9px 12px;text-align:center;font-size:10px;color:#86EFAC;">مكتملة</th>
                <th style="padding:9px 12px;text-align:center;font-size:10px;color:#93C5FD;">جديدة</th>
                <th style="padding:9px 12px;text-align:center;font-size:10px;color:#FCA5A5;">متأخرة</th>
                <th style="padding:9px 12px;text-align:center;font-size:10px;color:#FED7AA;">طلبات فنية</th>
              </tr>
            </thead>
            <tbody>${monthlyHTML}</tbody>
          </table>

          <!-- SECTION 7: سجل النشاط -->
          ${sec('سجل النشاط المرئي','آخر العمليات التي جرت في النظام')}
          <div style="background:#F9FAFB;border-radius:12px;padding:14px;margin-bottom:4px;">
            ${actHTML}
          </div>

          <!-- FOOTER -->
          <div style="background:#1B2B48;color:white;text-align:center;padding:14px;border-radius:10px;font-size:10px;margin-top:24px;">
            دار وعمار — نظام متابعة المشاريع | سري وخاص | جميع الحقوق محفوظة ${new Date().getFullYear()}
          </div>
        </div>`;

      // ── تصيير HTML → Canvas → PDF ──
      const container = document.createElement('div');
      container.style.cssText = 'position:fixed;top:-99999px;left:0;width:794px;z-index:-9999;pointer-events:none;';
      container.innerHTML = reportHTML;
      document.body.appendChild(container);

      await new Promise(r => setTimeout(r, 800));

      const canvas = await html2canvas(container.firstElementChild as HTMLElement, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        width: 794,
        windowWidth: 794,
        logging: false,
      });
      document.body.removeChild(container);

      const imgData = canvas.toDataURL('image/png');
      const pdf    = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW  = pdf.internal.pageSize.getWidth();
      const pageH  = pdf.internal.pageSize.getHeight();
      const imgW   = pageW;
      const imgH   = (canvas.height * imgW) / canvas.width;

      if (imgH <= pageH) {
        pdf.addImage(imgData, 'PNG', 0, 0, imgW, imgH);
      } else {
        let position = 0, pageIdx = 0;
        while (position < imgH) {
          if (pageIdx > 0) pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, -position, imgW, imgH);
          position += pageH;
          pageIdx++;
        }
      }

      pdf.save(`تقرير_دار_وعمار_الشامل_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error('PDF generation failed:', err);
      alert('فشل إنشاء التقرير');
    } finally {
      setIsGenerating(false);
    }
  };

  // معاينة سريعة
  const totalProjects = projects.length;
  const completedProjects = projects.filter(p => p.status === 'completed' || p.progress >= 100).length;
  const avgProgress = totalProjects > 0 ? Math.round(projects.reduce((s, p) => s + (p.progress || 0), 0) / totalProjects) : 0;
  const bottlenecks = projectWorks.filter(w => {
    if (w.status === 'completed') return false;
    return (Date.now() - new Date(w.created_at).getTime()) > 7 * 24 * 3600000;
  }).length;
  const slaCount = projectWorks.filter(w => {
    if (w.status === 'completed') return false;
    const due = w.expected_completion_date ? new Date(w.expected_completion_date).getTime() : null;
    return due && Date.now() > due;
  }).length;

  return (
    <div className="w-full">
      <div className="flex items-center gap-3 mb-2">
        <FileText size={20} className="text-[#E95D22]" />
        <span className="cin-subtitle">التقرير التنفيذي</span>
      </div>
      <h2 className="text-3xl font-black text-[#1B2B48] mb-6">تقرير PDF شامل</h2>

      <div className="glass-card p-6 glow-border" style={{ borderRadius: 20 }}>
        {/* معاينة المؤشرات */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {[
            { label: 'المشاريع',       value: totalProjects,      icon: <BarChart3 size={14} />,     color: '#1B2B48' },
            { label: 'مكتملة',         value: completedProjects,  icon: <CheckCircle2 size={14} />,  color: '#22C55E' },
            { label: 'متوسط التقدم',   value: `${avgProgress}%`,  icon: <FileText size={14} />,     color: '#E95D22' },
            { label: 'مختنقات SLA',   value: slaCount,           icon: <AlertTriangle size={14} />, color: slaCount > 0 ? '#EF4444' : '#22C55E' },
          ].map(item => (
            <div key={item.label} className="rounded-xl bg-[#1B2B48]/[0.03] border border-[#1B2B48]/5 p-3 text-center">
              <div className="mx-auto mb-1" style={{ color: item.color }}>{item.icon}</div>
              <p className="text-lg font-black text-[#1B2B48]">{item.value}</p>
              <p className="text-[8px] text-gray-500 font-bold">{item.label}</p>
            </div>
          ))}
        </div>

        {/* أقسام التقرير */}
        <div className="grid grid-cols-2 gap-2 mb-5">
          {[
            'مؤشرات الأداء الرئيسية (9 مؤشرات)',
            'صحة المشاريع وتوزيع الدرجات',
            'إشعارات تجاوز SLA',
            'رادار المختنقات الاستراتيجي',
            'جدول حالة المشاريع الكامل',
            'المقارنة الشهرية (6 أشهر)',
            'سجل النشاط المرئي',
          ].map(s => (
            <div key={s} className="flex items-center gap-2 text-[10px] text-gray-600 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E95D22] flex-shrink-0" />
              {s}
            </div>
          ))}
        </div>

        {/* زر التحميل */}
        <motion.button
          onClick={generatePDF}
          disabled={isGenerating}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl font-black text-white text-sm transition-all disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #E95D22, #1B2B48)' }}
        >
          {isGenerating ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              جاري إنشاء التقرير الشامل...
            </>
          ) : (
            <>
              <FileDown size={18} />
              تحميل التقرير التنفيذي الشامل PDF
            </>
          )}
        </motion.button>
      </div>
    </div>
  );
};

export default ExecutivePDFReport;
