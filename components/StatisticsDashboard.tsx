import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  Building2, Zap, FileStack, TrendingUp,
  CheckCircle2, Clock, Activity, BarChart3, XCircle, AlertCircle, ArrowLeft,
  Download, FileSpreadsheet, FileText, AtSign, Tag, Loader2, Calendar, Timer, FileWarning, MessageSquareWarning
} from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { notificationService } from '../services/notificationService';
import { supabase } from '../supabaseClient';
import { statisticsSnapshotService } from '../services/statisticsSnapshotService';
import { activityLogService } from '../services/activityLogService';
import * as XLSX from 'xlsx';

// ─── ألوان هوية دار وإعمار ───
const NAVY = '#1B2B48';
const ORANGE = '#E95D22';
const COLORS = {
  navy: NAVY,
  orange: ORANGE,
  green: '#10B981',
  amber: '#F59E0B',
  sky: '#0EA5E9',
  rose: '#F43F5E',
  slate: '#64748B',
  emerald: '#059669',
};

const PIE_COLORS = [COLORS.green, COLORS.orange];
const CLEARANCE_PIE_COLORS = [COLORS.green, COLORS.sky, COLORS.rose, COLORS.amber];
const BAR_COLORS = [COLORS.navy, COLORS.orange, COLORS.green, COLORS.amber, COLORS.sky, COLORS.rose];

// ─── ترجمة حالات الطلبات الفنية ───
const STATUS_LABELS: Record<string, string> = {
  pending: 'متابعة',
  approved: 'معتمد',
  completed: 'منجز',
  rejected: 'مرفوض',
  in_progress: 'قيد التنفيذ',
  new: 'جديد',
  cancelled: 'ملغى',
  under_review: 'تحت المراجعة',
  pending_modification: 'بانتظار التعديل',
  'منجز': 'منجز',
  'مكتمل': 'منجز',
};

// ─── مكون البطاقة الإحصائية ───
interface StatCardProps {
  title: string;
  value: number;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
  delay: number;
  onClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, icon, color, delay, onClick }) => {
  const [displayValue, setDisplayValue] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const showTimer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(showTimer);
  }, [delay]);

  useEffect(() => {
    if (!visible) return;
    if (value === 0) { setDisplayValue(0); return; }
    const duration = 1200;
    const steps = 40;
    const stepValue = value / steps;
    let current = 0;
    const interval = setInterval(() => {
      current += stepValue;
      if (current >= value) {
        setDisplayValue(value);
        clearInterval(interval);
      } else {
        setDisplayValue(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(interval);
  }, [value, visible]);

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-[35px] shadow-sm border border-gray-100 p-7 flex flex-col gap-4 transition-all duration-700 ${onClick ? 'cursor-pointer hover:shadow-lg hover:border-gray-200 hover:scale-[1.02] active:scale-[0.98]' : ''} ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
      }`}
    >
      <div className="flex items-center justify-between">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center"
          style={{ backgroundColor: `${color}15` }}
        >
          <div style={{ color }}>{icon}</div>
        </div>
        <TrendingUp size={18} className="text-gray-300" />
      </div>
      <div>
        <p className="text-sm font-bold text-gray-400 mb-1">{title}</p>
        <p className="text-4xl font-black" style={{ color: NAVY }}>
          {displayValue.toLocaleString('ar-EG')}
        </p>
        {subtitle && (
          <p className="text-xs font-bold mt-2" style={{ color }}>
            {subtitle}
          </p>
        )}
        {onClick && (
          <div className="flex items-center gap-1 mt-2 text-[10px] font-bold text-gray-300">
            <ArrowLeft size={10} />
            <span>انقر للتفاصيل</span>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── مكون شريط التقدم ───
interface ProgressBarProps {
  label: string;
  percentage: number;
  color: string;
  icon: React.ReactNode;
  delay: number;
  onClick?: () => void;
}

const AnimatedProgressBar: React.FC<ProgressBarProps> = ({ label, percentage, color, icon, delay, onClick }) => {
  const [width, setWidth] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const showTimer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(showTimer);
  }, [delay]);

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => setWidth(percentage), 300);
    return () => clearTimeout(timer);
  }, [percentage, visible]);

  return (
    <div
      onClick={onClick}
      className={`transition-all duration-700 ${onClick ? 'cursor-pointer hover:bg-gray-50 rounded-2xl p-3 -m-3 active:scale-[0.99]' : ''} ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${color}15` }}
          >
            <div style={{ color }}>{icon}</div>
          </div>
          <span className="font-bold text-sm text-gray-700">{label}</span>
        </div>
        <span className="font-black text-lg" style={{ color }}>
          {percentage.toFixed(1)}%
        </span>
      </div>
      <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-[1500ms] ease-out"
          style={{ width: `${width}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
};

// ─── Tooltip مخصص للرسوم البيانية ───
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 font-cairo" dir="rtl">
      {label && <p className="font-bold text-sm text-gray-600 mb-2">{label}</p>}
      {payload.map((entry: any, index: number) => (
        <div key={index} className="flex items-center gap-2 text-sm">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: entry.color || entry.payload?.fill }}
          />
          <span className="font-bold" style={{ color: entry.color || NAVY }}>
            {entry.name}: {entry.value}
          </span>
        </div>
      ))}
    </div>
  );
};

// ─── مكون الرسم البياني الدائري المخصص ───
const CustomPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: any) => {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  if (percent < 0.05) return null;
  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      className="font-bold"
      style={{ fontSize: '13px', fontFamily: 'Cairo' }}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

// ═══════════════════════════════════════════
//  المكون الرئيسي: لوحة الإحصائيات
// ═══════════════════════════════════════════
const StatisticsDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { projects, technicalRequests, clearanceRequests, projectWorks, isDbLoading, currentUser, refreshData } = useData();
  const [chartsVisible, setChartsVisible] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [completingHandlerId, setCompletingHandlerId] = useState<number | null>(null);

  // ═══ جلب التعليقات لاستخراج الترميزات (@) كبديل عن أعمدة قاعدة البيانات ═══
  const [allComments, setAllComments] = useState<any[]>([]);
  const [commentsLoaded, setCommentsLoaded] = useState(false);

  useEffect(() => {
    const fetchAllComments = async () => {
      try {
        const { data } = await supabase.from('work_comments').select('*').order('created_at', { ascending: true });
        setAllComments(data || []);
      } catch (err) {
        console.warn('⚠️ فشل جلب التعليقات:', err);
      } finally {
        setCommentsLoaded(true);
      }
    };
    fetchAllComments();
  }, [projectWorks]); // إعادة الجلب عند تحديث الأعمال

  useEffect(() => {
    const timer = setTimeout(() => setChartsVisible(true), 600);
    return () => clearTimeout(timer);
  }, []);

  // ═══ لقطات الإحصائيات + سجل النشاطات ═══
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [showTrend, setShowTrend] = useState(false);

  useEffect(() => {
    statisticsSnapshotService.saveDaily();
    statisticsSnapshotService.getLastDays(30).then(setSnapshots);
    activityLogService.getRecent(15).then(setRecentActivity);
  }, []);

  // ─── حساب الإحصائيات مع useMemo ───
  const stats = useMemo(() => {
    const safeProjects = projects ?? [];
    const safeTechnical = technicalRequests ?? [];
    const safeClearance = clearanceRequests ?? [];
    const safeWorks = projectWorks ?? [];

    // إجماليات البطاقات
    const totalProjects = safeProjects.length;
    const totalTechnical = safeTechnical.length;
    // 'approved'/'معتمد' تُحسب ضمن المنجزة (للتوافق مع البيانات القديمة والجديدة)
    const COMPLETED_STATUSES = ['completed', 'done', 'منجز', 'مكتمل', 'approved', 'معتمد'];
    const completedTechnical = safeTechnical.filter(
      (r) => COMPLETED_STATUSES.includes(r.status)
    ).length;
    const technicalCompletionRate =
      totalTechnical > 0 ? (completedTechnical / totalTechnical) * 100 : 0;

    const totalClearance = safeClearance.length;
    const completedClearance = safeClearance.filter(
      (r: any) => COMPLETED_STATUSES.includes(r.status)
    ).length;
    const inProgressClearance = safeClearance.filter(
      (r: any) => r.status === 'قيد العمل' || r.status === 'in_progress' || r.status === 'pending' || r.status === 'جديد'
    ).length;
    const rejectedClearance = safeClearance.filter(
      (r: any) => r.status === 'مرفوض' || r.status === 'rejected'
    ).length;
    const clearanceCompletionRate =
      totalClearance > 0 ? (completedClearance / totalClearance) * 100 : 0;

    // بيانات المخطط الدائري للإفراغات
    const clearancePieData = [
      { name: 'مكتمل', value: completedClearance },
      { name: 'قيد العمل', value: inProgressClearance },
      { name: 'مرفوض', value: rejectedClearance },
    ].filter(d => d.value > 0);

    // بيانات المخطط الدائري (أعمال المشاريع)
    const completedWorks = safeWorks.filter(
      (w) => COMPLETED_STATUSES.includes(w.status)
    ).length;
    const inProgressWorks = safeWorks.length - completedWorks;
    const pieData = [
      { name: 'منجز', value: completedWorks },
      { name: 'قيد الإنجاز', value: inProgressWorks },
    ];

    // تفاصيل الأعمال لكل مشروع
    const projectWorksDetails = safeProjects.map(project => {
      const projectId = project.id;
      const projectTasks = safeWorks.filter((w: any) => {
        const wId = w.projectId ?? w.projectid ?? w.project_id;
        return Number(wId) === projectId;
      });
      const completed = projectTasks.filter(w => COMPLETED_STATUSES.includes(w.status)).length;
      const inProgress = projectTasks.length - completed;
      const completionRate = projectTasks.length > 0 ? (completed / projectTasks.length) * 100 : 0;
      
      return {
        id: projectId,
        name: project.name || project.title || 'مشروع',
        totalWorks: projectTasks.length,
        completed,
        inProgress,
        completionRate
      };
    }).filter(p => p.totalWorks > 0).sort((a, b) => b.totalWorks - a.totalWorks);

    // بيانات الطلبات الفنية التفصيلية
    const inProgressTechnical = safeTechnical.filter(
      (r) => !COMPLETED_STATUSES.includes(r.status) && r.status !== 'rejected' && r.status !== 'مرفوض' && r.status !== 'cancelled' && r.status !== 'ملغى'
    ).length;
    const rejectedTechnical = safeTechnical.filter(
      (r) => r.status === 'rejected' || r.status === 'مرفوض' || r.status === 'cancelled' || r.status === 'ملغى'
    ).length;

    // بيانات المخطط الدائري للطلبات الفنية
    const technicalPieData = [
      { name: 'منجز', value: completedTechnical },
      { name: 'قيد العمل', value: inProgressTechnical },
      { name: 'مرفوض', value: rejectedTechnical },
    ].filter(d => d.value > 0);

    // بيانات المخطط العمودي (الطلبات الفنية حسب الحالة)
    const techByStatus = safeTechnical.reduce<Record<string, number>>((acc, r) => {
      const status = r.status || 'unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
    const barData = Object.entries(techByStatus).map(([status, count]) => ({
      name: STATUS_LABELS[status] || status,
      العدد: count,
      status,
    }));

    // نسب الإنجاز لأشرطة التقدم
    const worksCompletionRate =
      safeWorks.length > 0 ? (completedWorks / safeWorks.length) * 100 : 0;

    return {
      totalProjects,
      totalTechnical,
      completedTechnical,
      inProgressTechnical,
      rejectedTechnical,
      technicalCompletionRate,
      technicalPieData,
      totalClearance,
      completedClearance,
      inProgressClearance,
      rejectedClearance,
      clearanceCompletionRate,
      clearancePieData,
      pieData,
      barData,
      worksCompletionRate,
      projectWorksDetails,
    };
  }, [projects, technicalRequests, clearanceRequests, projectWorks]);

  // إحصائيات الترميز (@) — من أعمدة قاعدة البيانات أو التعليقات
  const handlerStats = useMemo(() => {
    const safeWorks = projectWorks ?? [];
    
    // أولاً: الأعمال التي لديها بيانات ترميز من أعمدة قاعدة البيانات
    const dbTagged = safeWorks.filter(w => w.current_handler && w.handler_status === 'active');
    
    // ثانياً: إذا لم تكن الأعمدة متوفرة، نستخرج من التعليقات
    let enrichedWorks: Array<{
      id: number; task_name: string; project_name?: string;
      current_handler: string; handler_tagged_at?: string; handler_status: string;
      status?: string;
    }> = [];

    if (dbTagged.length > 0) {
      // الأعمدة متوفرة — نستخدم البيانات مباشرة
      enrichedWorks = dbTagged.map(w => ({
        id: w.id,
        task_name: w.task_name,
        project_name: w.project_name,
        current_handler: w.current_handler!,
        handler_tagged_at: w.handler_tagged_at,
        handler_status: 'active',
        status: w.status,
      }));
    } else if (commentsLoaded && allComments.length > 0) {
      // بديل: تحليل التعليقات لاستخراج آخر @ترميز لكل عمل
      const commentsByWork: Record<number, any[]> = {};
      allComments.forEach(c => {
        const wid = c.work_id;
        if (!commentsByWork[wid]) commentsByWork[wid] = [];
        commentsByWork[wid].push(c);
      });

      safeWorks.forEach(work => {
        const wComments = commentsByWork[work.id];
        if (!wComments || wComments.length === 0) return;
        
        // بحث من آخر تعليق إلى الأقدم
        const reversed = [...wComments].sort((a: any, b: any) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        
        let handler: string | null = null;
        let tagDate: string | null = null;
        let isCompleted = false;
        
        for (const comment of reversed) {
          const content = comment.content || '';
          // تحقق من علامة الإنجاز
          if (content.includes('✅ تم إنجاز الترميز @')) {
            const m = content.match(/@([\u0600-\u06FFa-zA-Z0-9_]+)/u);
            if (m) { handler = m[1]; tagDate = comment.created_at; isCompleted = true; }
            break;
          }
          // البحث عن @ترميز
          const tagMatch = content.match(/@([\u0600-\u06FFa-zA-Z0-9_]+)/u);
          if (tagMatch) {
            handler = tagMatch[1];
            tagDate = comment.created_at;
            isCompleted = false;
            break;
          }
        }
        
        if (handler && !isCompleted) {
          enrichedWorks.push({
            id: work.id,
            task_name: work.task_name,
            project_name: work.project_name,
            current_handler: handler,
            handler_tagged_at: tagDate || undefined,
            handler_status: 'active',
            status: work.status,
          });
        }
      });
    }
    
    // تجميع حسب الجهة
    const byHandler: Record<string, typeof enrichedWorks> = {};
    enrichedWorks.forEach(w => {
      const h = w.current_handler;
      if (!byHandler[h]) byHandler[h] = [];
      byHandler[h].push(w);
    });
    
    return {
      totalActive: enrichedWorks.length,
      byHandler,
      handlers: Object.keys(byHandler).sort((a, b) => byHandler[b].length - byHandler[a].length),
      enrichedWorks,
    };
  }, [projectWorks, allComments, commentsLoaded]);

  // ═══ إحصائيات المواعيد النهائية — أعمال قريبة ومتأخرة ═══
  const deadlineStats = useMemo(() => {
    const safeWorks = (projectWorks ?? []).filter(w => 
      w.expected_completion_date && w.status !== 'completed'
    );
    const today = new Date(); today.setHours(0,0,0,0);
    
    const overdue: Array<typeof safeWorks[0] & { diffDays: number }> = [];
    const nearDeadline: Array<typeof safeWorks[0] & { diffDays: number }> = [];
    const safe: Array<typeof safeWorks[0] & { diffDays: number }> = [];
    
    safeWorks.forEach(work => {
      const target = new Date(work.expected_completion_date!);
      target.setHours(0,0,0,0);
      const diffDays = Math.ceil((target.getTime() - today.getTime()) / (1000*60*60*24));
      const enriched = { ...work, diffDays };
      
      if (diffDays < 0) overdue.push(enriched);
      else if (diffDays <= 3) nearDeadline.push(enriched);
      else safe.push(enriched);
    });
    
    // ترتيب: الأقرب/الأكثر تأخراً أولاً
    overdue.sort((a, b) => a.diffDays - b.diffDays);
    nearDeadline.sort((a, b) => a.diffDays - b.diffDays);
    
    return { overdue, nearDeadline, safe, total: safeWorks.length };
  }, [projectWorks]);

  const isManager = ['ADMIN', 'PR_MANAGER'].includes(currentUser?.role || '');

  const handleCompleteHandlerFromDashboard = async (workId: number) => {
    setCompletingHandlerId(workId);
    let dbSuccess = false;
    try {
      const { error } = await supabase.from('project_works').update({
        handler_status: 'completed'
      }).eq('id', workId);
      if (!error) dbSuccess = true;
      else console.warn('⚠️ عمود handler_status غير متوفر:', error.message);
    } catch (err) {
      console.warn('⚠️ فشل تحديث handler_status:', err);
    }
    // بديل: تسجيل الإنجاز كتعليق
    if (!dbSuccess) {
      // البحث عن الجهة من enrichedWorks أو من projectWorks
      const enrichedWork = handlerStats.enrichedWorks.find(w => w.id === workId);
      const handlerName = enrichedWork?.current_handler || (projectWorks ?? []).find(w => w.id === workId)?.current_handler || '';
      try {
        await supabase.from('work_comments').insert({
          work_id: workId,
          user_name: currentUser?.name || 'النظام',
          content: `✅ تم إنجاز الترميز @${handlerName}`
        });
      } catch (e) { console.error('فشل تسجيل تعليق الإنجاز:', e); }
    }
    refreshData();
    setCompletingHandlerId(null);
  };

  // ─── دالة تصدير Excel ───
  const exportToExcel = () => {
    try {
      setIsExporting(true);
      const timestamp = new Date().toLocaleString('ar-EG', { timeZone: 'Asia/Riyadh' });

      // ملخص الإحصائيات
      const summaryData = [
        ['لوحة إحصائيات دار وإعمار'],
        ['تاريخ التصدير:', timestamp],
        [],
        ['البند', 'العدد', 'نسبة الإنجاز'],
        ['المشاريع النشطة', stats.totalProjects, '-'],
        ['الطلبات الفنية', stats.totalTechnical, `${stats.technicalCompletionRate.toFixed(1)}%`],
        ['سجل الإفراغات', stats.totalClearance, `${stats.clearanceCompletionRate.toFixed(1)}%`],
      ];

      // تفاصيل الطلبات الفنية
      const technicalData = [
        ['تفاصيل الطلبات الفنية'],
        [],
        ['الحالة', 'العدد'],
        ...stats.technicalPieData.map((item: any) => [
          item.name,
          item.value
        ])
      ];

      // تفاصيل الإفراغات
      const clearanceData = [
        ['تفاصيل طلبات الإفراغات'],
        [],
        ['الحالة', 'العدد'],
        ...stats.clearancePieData.map((item: any) => [item.name, item.value])
      ];

      // تفاصيل توزيع أعمال المشاريع
      const worksData = [
        ['تفاصيل توزيع أعمال المشاريع'],
        [],
        ['اسم المشروع', 'الأعمال المكتملة', 'الأعمال قيد الإنجاز', 'الإجمالي'],
        ...stats.projectWorksDetails.map((item: any) => [
          item.name,
          item.completed,
          item.inProgress,
          item.totalWorks
        ])
      ];

      // إنشاء Workbook
      const wb = XLSX.utils.book_new();

      const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, ws1, 'ملخص الإحصائيات');

      const ws2 = XLSX.utils.aoa_to_sheet(technicalData);
      XLSX.utils.book_append_sheet(wb, ws2, 'الطلبات الفنية');

      const ws3 = XLSX.utils.aoa_to_sheet(clearanceData);
      XLSX.utils.book_append_sheet(wb, ws3, 'طلبات الإفراغات');

      const ws4 = XLSX.utils.aoa_to_sheet(worksData);
      XLSX.utils.book_append_sheet(wb, ws4, 'توزيع الأعمال');

      // تحميل الملف
      const fileName = `احصائيات_دار_وإعمار_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);

      setIsExporting(false);
    } catch (error) {
      console.error('خطأ في تصدير Excel:', error);
      setIsExporting(false);
      alert('حدث خطأ أثناء تصدير الملف');
    }
  };

  // ─── دالة تصدير PDF ───
  const exportToPDF = async () => {
    try {
      setIsExporting(true);
      
      // تحميل المكتبات
      let html2canvas: any;
      let jsPDF: any;

      try {
        html2canvas = (await import('html2canvas')).default;
      } catch {
        throw new Error('فشل في تحميل مكتبة html2canvas. تأكد من: npm install html2canvas');
      }

      try {
        jsPDF = (await import('jspdf')).default;
      } catch {
        throw new Error('فشل في تحميل مكتبة jspdf. تأكد من: npm install jspdf');
      }

      const element = document.querySelector('[data-export-target]') as HTMLElement;
      if (!element) {
        throw new Error('لم يتم العثور على العنصر المراد تصديره');
      }

      // إخفاء أزرار التصدير مؤقتاً
      const exportButtons = document.querySelector('[data-export-buttons]') as HTMLElement;
      if (exportButtons) exportButtons.style.display = 'none';

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        allowTaint: true
      });

      // إظهار الأزرار مرة أخرى
      if (exportButtons) exportButtons.style.display = 'flex';

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      // حساب أبعاد الصورة
      const imgWidth = pageWidth - 20;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 10;

      // إضافة الصفحة الأولى
      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= (pageHeight - 20);

      // إضافة الصفحات التالية إذا لزم الأمر
      while (heightLeft > 0) {
        pdf.addPage();
        position = heightLeft - imgHeight + 10;
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= (pageHeight - 20);
      }

      const fileName = `احصائيات_دار_وإعمار_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);

      setIsExporting(false);
    } catch (error) {
      console.error('خطأ في تصدير PDF:', error);
      setIsExporting(false);
      const errorMessage = error instanceof Error ? error.message : 'خطأ غير معروف';
      alert(`حدث خطأ أثناء تصدير PDF:\n\n${errorMessage}\n\nالحل: تأكد من تثبيت المكتبات:\nnpm install jspdf html2canvas`);
    }
  };

  // ─── حالة التحميل ───
  if (isDbLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center" dir="rtl">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full border-4 border-gray-200 border-t-[#E95D22] animate-spin" />
          <p className="text-gray-400 font-bold text-sm font-cairo">
            جاري تحميل الإحصائيات...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 font-cairo" dir="rtl" data-export-target>
      {/* رأسية التقرير - تظهر في التصدير */}
      <div className="bg-gradient-to-r from-[#1B2B48] to-[#2a4068] rounded-3xl p-8 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img 
              src="/brand/dar-logo.png" 
              alt="دار وإعمار" 
              className="h-16 bg-white rounded-xl p-2" 
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} 
            />
            <div>
              <h2 className="text-2xl font-black text-white">تقرير الإحصائيات الشامل</h2>
              <p className="text-sm text-gray-200 font-bold mt-1">
                شركة دار وإعمار للتطوير العقاري
              </p>
            </div>
          </div>
          <div className="text-left bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <p className="text-xs text-gray-200 font-bold mb-1">تاريخ التقرير</p>
            <p className="text-sm text-white font-black">
              {new Date().toLocaleDateString('ar-EG', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric'
              })}
            </p>
            <p className="text-xs text-gray-300 font-bold mt-1">
              {new Date().toLocaleDateString('ar-EG', { weekday: 'long' })}
            </p>
          </div>
        </div>
      </div>

      {/* ═══ العنوان الرئيسي مع أزرار التصدير ═══ */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#1B2B48] to-[#2a4068] flex items-center justify-center shadow-lg">
            <BarChart3 size={26} className="text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-[#1B2B48]">لوحة الإحصائيات</h1>
            <p className="text-sm text-gray-400 font-bold">
              نظرة شاملة على أداء المشاريع والإنجاز
            </p>
          </div>
        </div>
        
        {/* أزرار التصدير */}
        <div className="flex items-center gap-3" data-export-buttons>
          <button
            onClick={exportToExcel}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
          >
            <FileSpreadsheet size={18} />
            <span>تصدير Excel</span>
          </button>
          <button
            onClick={exportToPDF}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
          >
            <FileText size={18} />
            <span>تصدير PDF</span>
          </button>
        </div>
      </div>

      {/* ═══ بطاقات الملخص العلوي ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          title="المشاريع النشطة"
          value={stats.totalProjects}
          subtitle={`${stats.totalProjects} مشروع مسجل`}
          icon={<Building2 size={26} />}
          color={COLORS.navy}
          delay={100}
          onClick={() => navigate('/projects')}
        />
        <StatCard
          title="الطلبات الفنية"
          value={stats.totalTechnical}
          subtitle={`نسبة الإنجاز: ${stats.technicalCompletionRate.toFixed(1)}%`}
          icon={<Zap size={26} />}
          color={COLORS.orange}
          delay={250}
          onClick={() => navigate('/technical')}
        />
        <StatCard
          title="سجل الإفراغات"
          value={stats.totalClearance}
          subtitle={`نسبة الإنجاز: ${stats.clearanceCompletionRate.toFixed(1)}%`}
          icon={<FileStack size={26} />}
          color={COLORS.green}
          delay={400}
          onClick={() => navigate('/deeds')}
        />
      </div>

      {/* ═══ الأعمال المرمزة لدى الجهات (@) ═══ */}
      {handlerStats.totalActive > 0 && (
        <div
          className={`bg-white rounded-[35px] shadow-sm border border-gray-100 p-8 transition-all duration-700 ${chartsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center">
                <AtSign size={22} className="text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-black text-[#1B2B48]">الأعمال لدى الجهات</h3>
                <p className="text-xs text-gray-400 font-bold">
                  الأعمال المرمزة بـ@ والموجودة حالياً لدى جهات خارجية أو أقسام
                </p>
              </div>
            </div>
            <div className="bg-purple-50 px-4 py-2 rounded-xl border border-purple-200">
              <span className="text-2xl font-black text-purple-700">{handlerStats.totalActive}</span>
              <span className="text-[10px] font-bold text-purple-400 mr-1">عمل نشط</span>
            </div>
          </div>

          <div className="space-y-4">
            {handlerStats.handlers.map(handler => (
              <div key={handler} className="bg-purple-50/50 rounded-2xl border border-purple-100 overflow-hidden">
                <div className="flex items-center justify-between p-4 bg-purple-50 border-b border-purple-100">
                  <div className="flex items-center gap-2">
                    <Tag size={14} className="text-purple-600" />
                    <span className="font-black text-sm text-purple-800">@{handler}</span>
                  </div>
                  <span className="bg-purple-600 text-white px-3 py-1 rounded-full text-[10px] font-black">
                    {handlerStats.byHandler[handler].length} عمل
                  </span>
                </div>
                <div className="divide-y divide-purple-100">
                  {handlerStats.byHandler[handler].map(work => (
                    <div key={work.id} className="flex items-center justify-between p-4 hover:bg-purple-50/70 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-[#1B2B48] truncate">{work.task_name}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[10px] text-gray-400 font-bold flex items-center gap-1">
                            <Building2 size={10} /> {work.project_name || 'مشروع'}
                          </span>
                          {work.handler_tagged_at && (() => {
                            const tagged = new Date(work.handler_tagged_at);
                            const diffDays = Math.floor((Date.now() - tagged.getTime()) / (1000*60*60*24));
                            return (
                              <>
                                <span className="text-[10px] text-purple-600 font-black">
                                  منذ {tagged.toLocaleDateString('ar-EG')}
                                </span>
                                {diffDays > 0 && (
                                  <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black ${
                                    diffDays > 7 ? 'bg-red-100 text-red-600' : diffDays > 3 ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-500'
                                  }`}>
                                    {diffDays} يوم
                                  </span>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </div>
                      {isManager && (
                        <button
                          onClick={() => handleCompleteHandlerFromDashboard(work.id)}
                          disabled={completingHandlerId === work.id}
                          className="px-4 py-2 bg-green-600 text-white rounded-xl font-bold text-[10px] flex items-center gap-1 hover:bg-green-700 transition-colors disabled:opacity-50 mr-3"
                        >
                          {completingHandlerId === work.id 
                            ? <Loader2 size={12} className="animate-spin" /> 
                            : <CheckCircle2 size={12} />
                          } منجز
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ متابعة المواعيد النهائية — أعمال متأخرة وقريبة ═══ */}
      {(deadlineStats.overdue.length > 0 || deadlineStats.nearDeadline.length > 0) && (
        <div
          className={`bg-white rounded-[35px] shadow-sm border border-gray-100 p-8 transition-all duration-700 ${chartsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center">
                <Calendar size={22} className="text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-black text-[#1B2B48]">متابعة المواعيد النهائية</h3>
                <p className="text-xs text-gray-400 font-bold">
                  الأعمال المتأخرة عن موعد الإنجاز والأعمال القريبة من الموعد
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {deadlineStats.overdue.length > 0 && (
                <div className="bg-red-50 px-4 py-2 rounded-xl border border-red-200">
                  <span className="text-2xl font-black text-red-600">{deadlineStats.overdue.length}</span>
                  <span className="text-[10px] font-bold text-red-400 mr-1">متأخر</span>
                </div>
              )}
              {deadlineStats.nearDeadline.length > 0 && (
                <div className="bg-amber-50 px-4 py-2 rounded-xl border border-amber-200">
                  <span className="text-2xl font-black text-amber-600">{deadlineStats.nearDeadline.length}</span>
                  <span className="text-[10px] font-bold text-amber-400 mr-1">قريب</span>
                </div>
              )}
            </div>
          </div>

          {/* الأعمال المتأخرة */}
          {deadlineStats.overdue.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle size={16} className="text-red-500" />
                <h4 className="font-black text-sm text-red-700">أعمال متأخرة عن الموعد</h4>
              </div>
              <div className="space-y-2">
                {deadlineStats.overdue.map(work => (
                  <div key={work.id} 
                    onClick={() => navigate(`/projects/${work.projectId}`)}
                    className="flex items-center justify-between p-4 bg-red-50/60 rounded-2xl border border-red-200 hover:bg-red-50 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="w-2 h-10 rounded-full bg-red-500 flex-shrink-0"></div>
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-[#1B2B48] truncate group-hover:text-red-700 transition-colors">{work.task_name}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[10px] text-gray-400 font-bold flex items-center gap-1">
                            <Building2 size={10} /> {work.project_name || 'مشروع'}
                          </span>
                          <span className="text-[10px] text-red-500 font-black">
                            الموعد: {new Date(work.expected_completion_date!).toLocaleDateString('ar-EG')}
                          </span>
                          {work.current_handler && (
                            <span className="text-[10px] text-purple-600 font-black flex items-center gap-1">
                              <AtSign size={9} /> {work.current_handler}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <span className="bg-red-500 text-white px-3 py-1.5 rounded-xl text-[10px] font-black flex items-center gap-1 flex-shrink-0">
                      <Timer size={11} /> متأخر {Math.abs(work.diffDays)} يوم
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* الأعمال القريبة من الموعد */}
          {deadlineStats.nearDeadline.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Timer size={16} className="text-amber-500" />
                <h4 className="font-black text-sm text-amber-700">أعمال قريبة من الموعد (≤ 3 أيام)</h4>
              </div>
              <div className="space-y-2">
                {deadlineStats.nearDeadline.map(work => (
                  <div key={work.id}
                    onClick={() => navigate(`/projects/${work.projectId}`)}
                    className="flex items-center justify-between p-4 bg-amber-50/60 rounded-2xl border border-amber-200 hover:bg-amber-50 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="w-2 h-10 rounded-full bg-amber-500 flex-shrink-0"></div>
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-[#1B2B48] truncate group-hover:text-amber-700 transition-colors">{work.task_name}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[10px] text-gray-400 font-bold flex items-center gap-1">
                            <Building2 size={10} /> {work.project_name || 'مشروع'}
                          </span>
                          <span className="text-[10px] text-amber-600 font-black">
                            الموعد: {new Date(work.expected_completion_date!).toLocaleDateString('ar-EG')}
                          </span>
                          {work.current_handler && (
                            <span className="text-[10px] text-purple-600 font-black flex items-center gap-1">
                              <AtSign size={9} /> {work.current_handler}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black flex items-center gap-1 flex-shrink-0 ${
                      work.diffDays === 0 ? 'bg-red-500 text-white' : 'bg-amber-500 text-white'
                    }`}>
                      <Calendar size={11} /> {work.diffDays === 0 ? 'اليوم آخر موعد!' : `${work.diffDays} يوم متبقي`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ الرسوم البيانية ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* المخطط الدائري - أعمال المشاريع */}
        <div
          onClick={() => navigate('/projects')}
          className={`bg-white rounded-[35px] shadow-sm border border-gray-100 p-8 transition-all duration-700 cursor-pointer hover:shadow-lg hover:border-gray-200 ${
            chartsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
                <Activity size={20} className="text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-black text-[#1B2B48]">توزيع أعمال المشاريع</h3>
                <p className="text-xs text-gray-400 font-bold">
                  منجز مقابل قيد الإنجاز
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-[10px] font-bold text-gray-300">
              <ArrowLeft size={12} />
              <span>انقر للانتقال</span>
            </div>
          </div>

          {stats.pieData.every((d) => d.value === 0) ? (
            <div className="h-72 flex items-center justify-center text-gray-300 font-bold">
              لا توجد بيانات أعمال حالياً
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* المخطط الدائري */}
              <div>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={stats.pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={100}
                      paddingAngle={4}
                      dataKey="value"
                      labelLine={false}
                      label={CustomPieLabel}
                      animationBegin={400}
                      animationDuration={1200}
                      animationEasing="ease-out"
                    >
                      {stats.pieData.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={PIE_COLORS[index]}
                          stroke="none"
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      formatter={(value: string) => (
                        <span className="font-bold text-sm text-gray-600 font-cairo">
                          {value}
                        </span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* قائمة المشاريع مع التفاصيل */}
              <div className="space-y-3 max-h-[260px] overflow-y-auto pr-2 custom-scrollbar">
                {stats.projectWorksDetails.slice(0, 5).map((project: any) => (
                  <div
                    key={project.id}
                    className="group relative bg-gradient-to-l from-gray-50 to-white rounded-xl p-4 border border-gray-100 hover:border-green-200 hover:shadow-md transition-all duration-300 cursor-pointer"
                    onClick={(e) => { e.stopPropagation(); navigate(`/projects/${project.id}`); }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-bold text-sm text-[#1B2B48] truncate flex-1">{project.name}</h4>
                      <div className="text-xs font-black text-gray-400 bg-gray-100 px-2 py-1 rounded-lg">
                        {project.totalWorks} عمل
                      </div>
                    </div>
                    
                    {/* شريط التقدم */}
                    <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
                      <div
                        className="absolute top-0 right-0 h-full bg-gradient-to-l from-green-500 to-emerald-400 transition-all duration-1000 ease-out rounded-full"
                        style={{ width: `${project.completionRate}%` }}
                      />
                    </div>

                    {/* التفاصيل الأساسية */}
                    <div className="flex items-center justify-between text-[10px]">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1 text-green-600 font-bold">
                          <CheckCircle2 size={12} />
                          {project.completed}
                        </span>
                        <span className="flex items-center gap-1 text-orange-600 font-bold">
                          <Clock size={12} />
                          {project.inProgress}
                        </span>
                      </div>
                      <span className="font-black text-gray-500">
                        {project.completionRate.toFixed(0)}%
                      </span>
                    </div>

                    {/* التفاصيل الموسعة عند الـ hover */}
                    <div className="absolute top-0 left-0 right-0 bottom-0 bg-white/95 backdrop-blur-sm rounded-xl p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 border border-green-200 shadow-lg z-10">
                      <div className="h-full flex flex-col justify-center">
                        <p className="font-black text-[#1B2B48] text-center mb-3">{project.name}</p>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="bg-green-50 rounded-lg p-2 border border-green-100">
                            <CheckCircle2 size={16} className="text-green-600 mx-auto mb-1" />
                            <p className="text-xl font-black text-green-700">{project.completed}</p>
                            <p className="text-[9px] font-bold text-green-500">منجز</p>
                          </div>
                          <div className="bg-orange-50 rounded-lg p-2 border border-orange-100">
                            <Clock size={16} className="text-orange-600 mx-auto mb-1" />
                            <p className="text-xl font-black text-orange-700">{project.inProgress}</p>
                            <p className="text-[9px] font-bold text-orange-500">قيد العمل</p>
                          </div>
                          <div className="bg-blue-50 rounded-lg p-2 border border-blue-100">
                            <Activity size={16} className="text-blue-600 mx-auto mb-1" />
                            <p className="text-xl font-black text-blue-700">{project.totalWorks}</p>
                            <p className="text-[9px] font-bold text-blue-500">الإجمالي</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* المخطط الدائري - الطلبات الفنية حسب الحالة */}
        <div
          onClick={() => navigate('/technical')}
          className={`bg-white rounded-[35px] shadow-sm border border-gray-100 p-8 transition-all duration-700 delay-150 cursor-pointer hover:shadow-lg hover:border-gray-200 ${
            chartsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
                <Zap size={20} className="text-orange-600" />
              </div>
              <div>
                <h3 className="text-lg font-black text-[#1B2B48]">الطلبات الفنية حسب الحالة</h3>
                <p className="text-xs text-gray-400 font-bold">
                  توزيع الطلبات وفقاً لمراحل المعالجة
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-[10px] font-bold text-gray-300">
              <ArrowLeft size={12} />
              <span>انقر للانتقال</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* الرسم الدائري للطلبات الفنية */}
            <div>
              {stats.technicalPieData.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-gray-300 font-bold">
                  لا توجد طلبات فنية حالياً
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={stats.technicalPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={100}
                      paddingAngle={4}
                      dataKey="value"
                      labelLine={false}
                      label={CustomPieLabel}
                      animationBegin={600}
                      animationDuration={1200}
                      animationEasing="ease-out"
                    >
                      {stats.technicalPieData.map((_, index) => (
                        <Cell
                          key={`technical-cell-${index}`}
                          fill={CLEARANCE_PIE_COLORS[index % CLEARANCE_PIE_COLORS.length]}
                          stroke="none"
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      formatter={(value: string) => (
                        <span className="font-bold text-sm text-gray-600 font-cairo">
                          {value}
                        </span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* بطاقات تفصيلية للطلبات الفنية — تفاعلية */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 content-center">
              <div onClick={(e) => { e.stopPropagation(); navigate('/technical?status=completed'); }}
                className="bg-green-50 rounded-2xl p-5 text-center border border-green-100 cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all">
                <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 size={20} className="text-green-600" />
                </div>
                <p className="text-3xl font-black text-green-700">{stats.completedTechnical.toLocaleString('ar-EG')}</p>
                <p className="text-xs font-bold text-green-500 mt-1">منجز</p>
              </div>
              <div onClick={(e) => { e.stopPropagation(); navigate('/technical?status=in_progress'); }}
                className="bg-sky-50 rounded-2xl p-5 text-center border border-sky-100 cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all">
                <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center mx-auto mb-3">
                  <Clock size={20} className="text-sky-600" />
                </div>
                <p className="text-3xl font-black text-sky-700">{stats.inProgressTechnical.toLocaleString('ar-EG')}</p>
                <p className="text-xs font-bold text-sky-500 mt-1">قيد العمل</p>
              </div>
              <div onClick={(e) => { e.stopPropagation(); navigate('/technical?status=rejected'); }}
                className="bg-red-50 rounded-2xl p-5 text-center border border-red-100 cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all">
                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center mx-auto mb-3">
                  <XCircle size={20} className="text-red-500" />
                </div>
                <p className="text-3xl font-black text-red-600">{stats.rejectedTechnical.toLocaleString('ar-EG')}</p>
                <p className="text-xs font-bold text-red-400 mt-1">مرفوض</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ قسم إحصائيات الإفراغات التفاعلي ═══ */}
      <div
        onClick={() => navigate('/deeds')}
        className={`bg-white rounded-[35px] shadow-sm border border-gray-100 p-8 transition-all duration-700 delay-200 cursor-pointer hover:shadow-lg hover:border-gray-200 ${
          chartsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <FileStack size={20} className="text-emerald-600" />
            </div>
            <div>
              <h3 className="text-lg font-black text-[#1B2B48]">تفاصيل سجل الإفراغات</h3>
              <p className="text-xs text-gray-400 font-bold">
                توزيع طلبات الإفراغ حسب الحالة
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-[10px] font-bold text-gray-300">
            <ArrowLeft size={12} />
            <span>انقر للانتقال</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* الرسم الدائري للإفراغات */}
          <div>
            {stats.clearancePieData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-gray-300 font-bold">
                لا توجد بيانات إفراغات حالياً
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={stats.clearancePieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={100}
                    paddingAngle={4}
                    dataKey="value"
                    labelLine={false}
                    label={CustomPieLabel}
                    animationBegin={600}
                    animationDuration={1200}
                    animationEasing="ease-out"
                  >
                    {stats.clearancePieData.map((_, index) => (
                      <Cell
                        key={`clearance-cell-${index}`}
                        fill={CLEARANCE_PIE_COLORS[index % CLEARANCE_PIE_COLORS.length]}
                        stroke="none"
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value: string) => (
                      <span className="font-bold text-sm text-gray-600 font-cairo">
                        {value}
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* بطاقات تفصيلية للإفراغات — تفاعلية */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 content-center">
            <div onClick={(e) => { e.stopPropagation(); navigate('/deeds?status=completed'); }}
              className="bg-green-50 rounded-2xl p-5 text-center border border-green-100 cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all">
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 size={20} className="text-green-600" />
              </div>
              <p className="text-3xl font-black text-green-700">{stats.completedClearance.toLocaleString('ar-EG')}</p>
              <p className="text-xs font-bold text-green-500 mt-1">مكتمل</p>
            </div>
            <div onClick={(e) => { e.stopPropagation(); navigate('/deeds?status=in_progress'); }}
              className="bg-sky-50 rounded-2xl p-5 text-center border border-sky-100 cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all">
              <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center mx-auto mb-3">
                <Clock size={20} className="text-sky-600" />
              </div>
              <p className="text-3xl font-black text-sky-700">{stats.inProgressClearance.toLocaleString('ar-EG')}</p>
              <p className="text-xs font-bold text-sky-500 mt-1">تحت الإجراء</p>
            </div>
            <div onClick={(e) => { e.stopPropagation(); navigate('/deeds?status=rejected'); }}
              className="bg-red-50 rounded-2xl p-5 text-center border border-red-100 cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center mx-auto mb-3">
                <XCircle size={20} className="text-red-500" />
              </div>
              <p className="text-3xl font-black text-red-600">{stats.rejectedClearance.toLocaleString('ar-EG')}</p>
              <p className="text-xs font-bold text-red-400 mt-1">مرفوض</p>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ قسم تحليل الإنجاز ═══ */}
      <div
        className={`bg-white rounded-[35px] shadow-sm border border-gray-100 p-8 transition-all duration-700 delay-300 ${
          chartsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center">
            <TrendingUp size={20} className="text-sky-600" />
          </div>
          <div>
            <h3 className="text-lg font-black text-[#1B2B48]">تحليل نسب الإنجاز</h3>
            <p className="text-xs text-gray-400 font-bold">
              متابعة مستوى الإنجاز في كل قسم
            </p>
          </div>
        </div>

        <div className="space-y-8">
          <AnimatedProgressBar
            label="إنجاز الطلبات الفنية"
            percentage={stats.technicalCompletionRate}
            color={COLORS.orange}
            icon={<Zap size={20} />}
            delay={800}
            onClick={() => navigate('/technical')}
          />
          <AnimatedProgressBar
            label="إنجاز الإفراغات"
            percentage={stats.clearanceCompletionRate}
            color={COLORS.green}
            icon={<FileStack size={20} />}
            delay={1000}
            onClick={() => navigate('/deeds')}
          />
          <AnimatedProgressBar
            label="إنجاز الأعمال الميدانية"
            percentage={stats.worksCompletionRate}
            color={COLORS.navy}
            icon={<CheckCircle2 size={20} />}
            delay={1200}
            onClick={() => navigate('/projects')}
          />
        </div>
      </div>

      {/* ═══ ملخص سفلي سريع ═══ */}
      <div
        className={`grid grid-cols-2 md:grid-cols-4 gap-4 transition-all duration-700 delay-500 ${
          chartsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
        }`}
      >
        {[
          {
            label: 'طلبات فنية مكتملة',
            value: stats.completedTechnical,
            icon: <CheckCircle2 size={18} />,
            color: COLORS.green,
            path: '/technical',
          },
          {
            label: 'طلبات فنية معلقة',
            value: stats.totalTechnical - stats.completedTechnical,
            icon: <Clock size={18} />,
            color: COLORS.amber,
            path: '/technical',
          },
          {
            label: 'إفراغات مكتملة',
            value: stats.completedClearance,
            icon: <CheckCircle2 size={18} />,
            color: COLORS.emerald,
            path: '/deeds',
          },
          {
            label: 'إفراغات معلقة',
            value: stats.totalClearance - stats.completedClearance,
            icon: <Clock size={18} />,
            color: COLORS.rose,
            path: '/deeds',
          },
        ].map((item) => (
          <div
            key={item.label}
            onClick={() => navigate(item.path)}
            className="bg-white rounded-[25px] shadow-sm border border-gray-100 p-5 flex items-center gap-4 cursor-pointer hover:shadow-lg hover:border-gray-200 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${item.color}15` }}
            >
              <div style={{ color: item.color }}>{item.icon}</div>
            </div>
            <div>
              <p className="text-2xl font-black" style={{ color: NAVY }}>
                {item.value.toLocaleString('ar-EG')}
              </p>
              <p className="text-[11px] font-bold text-gray-400">{item.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ═══════ قسم تتبع الأداء عبر الزمن ═══════ */}
      {snapshots.length > 1 && (
        <div className="mt-8">
          <button
            onClick={() => setShowTrend(!showTrend)}
            className="w-full flex items-center gap-3 text-white py-4 px-6 rounded-2xl font-bold text-base transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
          >
            <span>📈</span>
            <span>تتبع الأداء — آخر {snapshots.length} يوم</span>
            <span className="mr-auto text-sm opacity-80">
              {showTrend ? '▲ إخفاء' : '▼ عرض'}
            </span>
          </button>

          {showTrend && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              {(() => {
                const first = snapshots[0];
                const last = snapshots[snapshots.length - 1];
                const diffWorks = last.completed_works - first.completed_works;
                const diffOverdue = last.overdue_works - first.overdue_works;
                const diffProjects = last.total_projects - first.total_projects;
                return (
                  <>
                    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                      <p className="text-sm text-gray-500 mb-2">📊 الأعمال المنجزة</p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-emerald-600">{last.completed_works}</span>
                        <span className={`text-sm font-bold ${diffWorks >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {diffWorks >= 0 ? `⬆ +${diffWorks}` : `⬇ ${diffWorks}`}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">مقارنة بـ {first.snapshot_date}</p>
                    </div>
                    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                      <p className="text-sm text-gray-500 mb-2">⚠️ الأعمال المتأخرة</p>
                      <div className="flex items-baseline gap-2">
                        <span className={`text-3xl font-black ${last.overdue_works > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{last.overdue_works}</span>
                        <span className={`text-sm font-bold ${diffOverdue <= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {diffOverdue <= 0 ? `⬇ ${diffOverdue}` : `⬆ +${diffOverdue}`}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">{diffOverdue <= 0 ? 'تحسّن ✅' : 'يحتاج متابعة ⚠️'}</p>
                    </div>
                    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                      <p className="text-sm text-gray-500 mb-2">📋 إجمالي المشاريع</p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black" style={{ color: NAVY }}>{last.total_projects}</span>
                        {diffProjects > 0 && (
                          <span className="text-sm font-bold text-blue-600">+{diffProjects} جديد</span>
                        )}
                      </div>
                    </div>
                  </>
                );
              })()}

              {/* جدول اللقطات */}
              <div className="md:col-span-3 bg-white rounded-2xl p-5 border border-gray-100 shadow-sm overflow-x-auto">
                <p className="text-sm font-bold text-gray-600 mb-3">📅 سجل اللقطات اليومية</p>
                <table className="w-full text-sm" dir="rtl">
                  <thead>
                    <tr className="border-b-2 border-gray-200 text-right">
                      <th className="py-2 px-3">التاريخ</th>
                      <th className="py-2 px-3">مشاريع</th>
                      <th className="py-2 px-3">أعمال منجزة</th>
                      <th className="py-2 px-3">متأخرة</th>
                      <th className="py-2 px-3">تكليفات</th>
                      <th className="py-2 px-3">طلبات فنية</th>
                      <th className="py-2 px-3">إفراغات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {snapshots.slice().reverse().slice(0, 14).map((s: any, i: number) => (
                      <tr key={s.id} className={`border-b border-gray-50 ${i % 2 === 0 ? 'bg-gray-50/50' : ''}`}>
                        <td className="py-2 px-3 font-bold">{s.snapshot_date}</td>
                        <td className="py-2 px-3">{s.total_projects}</td>
                        <td className="py-2 px-3 text-emerald-600 font-bold">{s.completed_works}</td>
                        <td className={`py-2 px-3 font-bold ${s.overdue_works > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{s.overdue_works}</td>
                        <td className="py-2 px-3">{s.total_assignments}</td>
                        <td className="py-2 px-3">{s.total_technical_requests}</td>
                        <td className="py-2 px-3">{s.total_deed_requests}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════ آخر النشاطات ═══════ */}
      {recentActivity.length > 0 && (
        <div className="mt-6 bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <p className="text-base font-bold text-gray-600 mb-4 flex items-center gap-2">
            <span>📝</span> آخر النشاطات في النظام
          </p>
          <div className="flex flex-col gap-2">
            {recentActivity.slice(0, 10).map((a: any) => {
              const icons: Record<string, string> = {
                create: '➕', update: '✏️', delete: '🗑️', approve: '✅', reject: '❌',
                assign: '👤', handler_change: '🔄', deadline_change: '📅', justify_delay: '📝',
                complete: '🏁', status_change: '🔀', comment: '💬',
              };
              return (
                <div key={a.id} className="flex gap-3 items-start p-3 bg-gray-50 rounded-xl text-sm">
                  <span className="text-base">{icons[a.action_type] || '📌'}</span>
                  <div className="flex-1">
                    <p className="font-bold text-gray-800">{a.description}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {a.user_name} • {new Date(a.created_at).toLocaleString('ar-EG-u-nu-latn', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  {a.entity_name && (
                    <span className="text-[11px] bg-purple-50 text-purple-700 px-2 py-0.5 rounded-lg whitespace-nowrap">
                      {a.entity_name}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default StatisticsDashboard;
