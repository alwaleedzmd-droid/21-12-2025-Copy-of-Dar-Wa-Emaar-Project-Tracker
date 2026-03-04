import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  ClipboardList, CheckCircle2, Clock, AlertTriangle, Play, Loader2,
  Building2, Calendar, MessageSquare, Timer, TrendingUp, Sparkles,
  ChevronDown, ChevronUp, FileText, User as UserIcon, Bell
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useData } from '../contexts/DataContext';
import { ProjectWork } from '../types';
import Modal from './Modal';
import { notificationService } from '../services/notificationService';
import { checkTaskReminders, TaskReminder } from '../services/taskReminderService';

// ============================
// حالات المهام المُسندة
// ============================
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  'pending': { label: 'بانتظار البدء', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', icon: <Clock size={16} /> },
  'in_progress': { label: 'تحت الإجراء', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200', icon: <Play size={16} /> },
  'completed': { label: 'منجز', color: 'text-green-700', bg: 'bg-green-50 border-green-200', icon: <CheckCircle2 size={16} /> },
  'overdue': { label: 'متأخر ⚠️', color: 'text-red-700', bg: 'bg-red-50 border-red-200', icon: <AlertTriangle size={16} /> },
};

const MyTasksDashboard: React.FC = () => {
  const { projectWorks, projects, currentUser, refreshData, appUsers } = useData();
  
  const [activeTab, setActiveTab] = useState<'my_tasks' | 'coded_tasks'>('my_tasks');
  const [statusFilter, setStatusFilter] = useState('');
  const [detailWork, setDetailWork] = useState<ProjectWork | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [expandedCard, setExpandedCard] = useState<number | null>(null);
  const [aiReminders, setAiReminders] = useState<TaskReminder[]>([]);
  const [showReminders, setShowReminders] = useState(false);

  // ============================
  // المهام المُسندة إلى المستخدم الحالي
  // ============================
  const myAssignedTasks = useMemo(() => {
    if (!currentUser) return [];
    return (projectWorks || []).filter(w => w.assigned_to === currentUser.id);
  }, [projectWorks, currentUser]);

  // ============================
  // المهام المُرمَّز عليها (المشاريع التي المستخدم مسؤول عنها)
  // ============================
  const myCodedTasks = useMemo(() => {
    if (!currentUser) return [];
    // المشاريع التي يكون فيها المستخدم project_lead
    const myProjectIds = (projects || [])
      .filter(p => p.project_lead_id === currentUser.id || p.project_lead_email === currentUser.email)
      .map(p => p.id);
    
    if (myProjectIds.length === 0) return [];
    return (projectWorks || []).filter(w => myProjectIds.includes(w.projectId));
  }, [projectWorks, projects, currentUser]);

  // ============================
  // إحصائيات المهام
  // ============================
  const stats = useMemo(() => {
    const tasks = activeTab === 'my_tasks' ? myAssignedTasks : myCodedTasks;
    const total = tasks.length;
    const pending = tasks.filter(t => t.assignment_status === 'pending' || (!t.assignment_status && t.status !== 'completed')).length;
    const inProgress = tasks.filter(t => t.assignment_status === 'in_progress').length;
    const completed = tasks.filter(t => t.assignment_status === 'completed' || t.status === 'completed').length;
    const overdue = tasks.filter(t => {
      if (t.assignment_status === 'completed' || t.status === 'completed') return false;
      if (!t.assigned_at) return false;
      const hours = (Date.now() - new Date(t.assigned_at).getTime()) / (1000 * 60 * 60);
      return hours >= 48;
    }).length;

    return { total, pending, inProgress, completed, overdue };
  }, [myAssignedTasks, myCodedTasks, activeTab]);

  // ============================
  // تصفية المهام
  // ============================
  const filteredTasks = useMemo(() => {
    const tasks = activeTab === 'my_tasks' ? myAssignedTasks : myCodedTasks;
    if (!statusFilter) return tasks;
    
    if (statusFilter === 'overdue') {
      return tasks.filter(t => {
        if (t.assignment_status === 'completed' || t.status === 'completed') return false;
        if (!t.assigned_at) return false;
        return (Date.now() - new Date(t.assigned_at).getTime()) / (1000 * 60 * 60) >= 48;
      });
    }
    
    return tasks.filter(t => {
      if (statusFilter === 'completed') return t.assignment_status === 'completed' || t.status === 'completed';
      if (statusFilter === 'pending') return t.assignment_status === 'pending' || (!t.assignment_status && t.status !== 'completed');
      return t.assignment_status === statusFilter;
    });
  }, [myAssignedTasks, myCodedTasks, activeTab, statusFilter]);

  // ============================
  // فحص تنبيهات الذكاء الاصطناعي
  // ============================
  useEffect(() => {
    if (!currentUser || !projectWorks) return;
    const reminders = checkTaskReminders(projectWorks, currentUser.id, appUsers);
    setAiReminders(reminders);
    
    // إرسال إشعارات تلقائية للمهام المتأخرة
    reminders.filter(r => r.severity === 'critical').forEach(r => {
      notificationService.send(
        currentUser.role,
        `⚠️ ${r.message}`,
        `/my-tasks`,
        '🤖 المحلل الذكي'
      );
    });
  }, [projectWorks, currentUser, appUsers]);

  // ============================
  // حساب الوقت المتبقي
  // ============================
  const getTimeInfo = useCallback((work: ProjectWork) => {
    if (!work.assigned_at) return null;
    const assignedTime = new Date(work.assigned_at).getTime();
    const now = Date.now();
    const hoursPassed = (now - assignedTime) / (1000 * 60 * 60);
    const hoursRemaining = Math.max(0, 48 - hoursPassed);
    const isOverdue = hoursPassed >= 48;
    const progress = Math.min(100, (hoursPassed / 48) * 100);
    
    return { hoursPassed, hoursRemaining, isOverdue, progress };
  }, []);

  // ============================
  // تحديث حالة المهمة (للموظف)
  // ============================
  const handleUpdateStatus = async (work: ProjectWork, newStatus: 'in_progress' | 'completed') => {
    setIsUpdating(true);
    try {
      const updateData: any = { assignment_status: newStatus };
      if (newStatus === 'completed') {
        updateData.completed_at = new Date().toISOString();
        updateData.status = 'completed';
      }
      
      const { error } = await supabase.from('project_works').update(updateData).eq('id', work.id);
      if (error) throw error;

      // إشعار المدير بتحديث الحالة
      notificationService.send(
        'ADMIN',
        newStatus === 'completed' 
          ? `✅ ${currentUser?.name} أنجز المهمة: ${work.task_name}`
          : `▶️ ${currentUser?.name} بدأ العمل على: ${work.task_name}`,
        `/task-assignment`,
        currentUser?.name
      );

      setDetailWork(null);
      refreshData();
    } catch (err: any) {
      alert('فشل التحديث: ' + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  // ============================
  // تحديد الحالة الفعلية (مع مراعاة التأخير)
  // ============================
  const getEffectiveStatus = (work: ProjectWork): string => {
    if (work.assignment_status === 'completed' || work.status === 'completed') return 'completed';
    if (work.assigned_at) {
      const hours = (Date.now() - new Date(work.assigned_at).getTime()) / (1000 * 60 * 60);
      if (hours >= 48) return 'overdue';
    }
    return work.assignment_status || 'pending';
  };

  return (
    <div className="space-y-6 font-cairo" dir="rtl">
      {/* Header */}
      <div className="flex justify-between items-start flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-black text-[#1B2B48] flex items-center gap-3">
            <ClipboardList size={28} className="text-[#E95D22]" />
            لوحة مهامي
          </h2>
          <p className="text-gray-400 text-sm font-bold mt-1">
            مرحباً {currentUser?.name} — إليك ملخص أعمالك ومهامك المُسندة
          </p>
        </div>
        {aiReminders.length > 0 && (
          <button
            onClick={() => setShowReminders(!showReminders)}
            className="relative bg-red-50 text-red-600 px-5 py-3 rounded-2xl font-bold flex items-center gap-2 border border-red-200 hover:bg-red-100 transition-all"
          >
            <Sparkles size={18} />
            تنبيهات الذكاء الاصطناعي
            <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
              {aiReminders.length}
            </span>
          </button>
        )}
      </div>

      {/* AI Reminders Panel */}
      {showReminders && aiReminders.length > 0 && (
        <div className="bg-gradient-to-l from-red-50 to-orange-50 p-6 rounded-[30px] border border-red-200 shadow-sm space-y-3">
          <h3 className="font-black text-[#1B2B48] flex items-center gap-2 mb-3">
            <Sparkles size={20} className="text-[#E95D22]" />
            🤖 تنبيهات المحلل الذكي — متابعة الإنجاز
          </h3>
          {aiReminders.map((reminder, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-2xl border flex items-start gap-3 ${
                reminder.severity === 'critical' 
                  ? 'bg-red-50 border-red-300' 
                  : reminder.severity === 'warning' 
                    ? 'bg-amber-50 border-amber-300' 
                    : 'bg-blue-50 border-blue-200'
              }`}
            >
              <div className={`mt-0.5 ${
                reminder.severity === 'critical' ? 'text-red-500' : reminder.severity === 'warning' ? 'text-amber-500' : 'text-blue-500'
              }`}>
                {reminder.severity === 'critical' ? <AlertTriangle size={18} /> : <Bell size={18} />}
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm text-[#1B2B48]">{reminder.message}</p>
                <p className="text-xs text-gray-500 mt-1">{reminder.suggestion}</p>
              </div>
              <span className="text-[10px] font-bold text-gray-400 whitespace-nowrap mt-1">
                {reminder.hoursElapsed}h
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Tab Switch */}
      <div className="flex gap-2 bg-white p-2 rounded-2xl border shadow-sm w-fit">
        <button
          onClick={() => { setActiveTab('my_tasks'); setStatusFilter(''); }}
          className={`px-6 py-3 rounded-xl font-bold text-sm transition-all ${
            activeTab === 'my_tasks' 
              ? 'bg-[#1B2B48] text-white shadow-lg' 
              : 'text-gray-500 hover:bg-gray-100'
          }`}
        >
          <ClipboardList size={16} className="inline ml-2" />
          مهامي المُسندة ({myAssignedTasks.length})
        </button>
        <button
          onClick={() => { setActiveTab('coded_tasks'); setStatusFilter(''); }}
          className={`px-6 py-3 rounded-xl font-bold text-sm transition-all ${
            activeTab === 'coded_tasks' 
              ? 'bg-[#1B2B48] text-white shadow-lg' 
              : 'text-gray-500 hover:bg-gray-100'
          }`}
        >
          <Building2 size={16} className="inline ml-2" />
          أعمال مشاريعي ({myCodedTasks.length})
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <button onClick={() => setStatusFilter('')}
          className={`bg-white p-4 rounded-[20px] border shadow-sm text-right transition-all ${!statusFilter ? 'ring-2 ring-[#E95D22]' : 'hover:shadow-md'}`}>
          <p className="text-gray-400 text-[10px] font-bold mb-1">الإجمالي</p>
          <p className="text-2xl font-black text-[#1B2B48]">{stats.total}</p>
        </button>
        <button onClick={() => setStatusFilter('pending')}
          className={`bg-white p-4 rounded-[20px] border shadow-sm text-right transition-all ${statusFilter === 'pending' ? 'ring-2 ring-amber-400' : 'hover:shadow-md'}`}>
          <p className="text-amber-500 text-[10px] font-bold mb-1">بانتظار البدء</p>
          <p className="text-2xl font-black text-amber-600">{stats.pending}</p>
        </button>
        <button onClick={() => setStatusFilter('in_progress')}
          className={`bg-white p-4 rounded-[20px] border shadow-sm text-right transition-all ${statusFilter === 'in_progress' ? 'ring-2 ring-blue-400' : 'hover:shadow-md'}`}>
          <p className="text-blue-500 text-[10px] font-bold mb-1">تحت الإجراء</p>
          <p className="text-2xl font-black text-blue-600">{stats.inProgress}</p>
        </button>
        <button onClick={() => setStatusFilter('completed')}
          className={`bg-white p-4 rounded-[20px] border shadow-sm text-right transition-all ${statusFilter === 'completed' ? 'ring-2 ring-green-400' : 'hover:shadow-md'}`}>
          <p className="text-green-500 text-[10px] font-bold mb-1">منجز</p>
          <p className="text-2xl font-black text-green-600">{stats.completed}</p>
        </button>
        <button onClick={() => setStatusFilter('overdue')}
          className={`bg-white p-4 rounded-[20px] border shadow-sm text-right transition-all ${statusFilter === 'overdue' ? 'ring-2 ring-red-400' : 'hover:shadow-md'}`}>
          <p className="text-red-500 text-[10px] font-bold mb-1">متأخر ⚠️</p>
          <p className="text-2xl font-black text-red-600">{stats.overdue}</p>
        </button>
      </div>

      {/* Tasks List */}
      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="bg-white p-16 rounded-[30px] border shadow-sm text-center">
            <ClipboardList size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="font-bold text-gray-400 text-lg">
              {activeTab === 'my_tasks' ? 'لا توجد مهام مُسندة إليك حالياً' : 'لا توجد أعمال مرتبطة بمشاريعك'}
            </p>
          </div>
        ) : (
          filteredTasks.map(work => {
            const effectiveStatus = getEffectiveStatus(work);
            const config = STATUS_CONFIG[effectiveStatus] || STATUS_CONFIG['pending'];
            const timeInfo = getTimeInfo(work);
            const isExpanded = expandedCard === work.id;

            return (
              <div
                key={work.id}
                className={`bg-white rounded-[25px] border shadow-sm overflow-hidden transition-all hover:shadow-md ${
                  effectiveStatus === 'overdue' ? 'border-red-300 bg-red-50/30' : 'border-gray-100'
                }`}
              >
                {/* Card Header */}
                <div
                  className="p-5 cursor-pointer"
                  onClick={() => setExpandedCard(isExpanded ? null : work.id)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      {/* Status Indicator */}
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${config.bg} border ${config.color}`}>
                        {config.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-black text-[#1B2B48] text-base">{work.task_name}</h3>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          <span className="text-[10px] text-gray-400 font-bold flex items-center gap-1">
                            <Building2 size={11} /> {work.project_name || 'مشروع'}
                          </span>
                          {work.authority && (
                            <span className="text-[10px] text-gray-400 font-bold">
                              • {work.authority}
                            </span>
                          )}
                          {work.assigned_at && (
                            <span className="text-[10px] text-gray-400 font-bold flex items-center gap-1">
                              <Calendar size={11} /> {new Date(work.assigned_at).toLocaleDateString('ar-SA')}
                            </span>
                          )}
                        </div>
                        {work.assignment_description && (
                          <p className="text-xs text-gray-500 font-bold mt-2 bg-gray-50 p-2 rounded-lg border border-gray-100">
                            <FileText size={12} className="inline ml-1 text-[#E95D22]" />
                            {work.assignment_description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black border ${config.bg} ${config.color}`}>
                        {config.label}
                      </span>
                      {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                    </div>
                  </div>

                  {/* Time Progress Bar */}
                  {timeInfo && effectiveStatus !== 'completed' && (
                    <div className="mt-4">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1">
                          <Timer size={11} />
                          {timeInfo.isOverdue 
                            ? `تأخير ${Math.round(timeInfo.hoursPassed - 48)} ساعة` 
                            : `متبقي ${Math.round(timeInfo.hoursRemaining)} ساعة`
                          }
                        </span>
                        <span className="text-[10px] font-bold text-gray-400">
                          {Math.round(timeInfo.hoursPassed)} / 48 ساعة
                        </span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            timeInfo.isOverdue 
                              ? 'bg-red-500' 
                              : timeInfo.progress > 75 
                                ? 'bg-amber-500' 
                                : 'bg-blue-500'
                          }`}
                          style={{ width: `${Math.min(100, timeInfo.progress)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="px-5 pb-5 pt-0 border-t border-gray-100 space-y-4">
                    {/* Details Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                      <div className="bg-gray-50 p-3 rounded-xl border">
                        <span className="text-[10px] text-gray-400 font-bold block">الجهة</span>
                        <span className="font-bold text-sm text-[#1B2B48]">{work.authority || '-'}</span>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-xl border">
                        <span className="text-[10px] text-gray-400 font-bold block">القسم</span>
                        <span className="font-bold text-sm text-[#1B2B48]">{work.department || '-'}</span>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-xl border">
                        <span className="text-[10px] text-gray-400 font-bold block">تاريخ الإسناد</span>
                        <span className="font-bold text-sm text-[#1B2B48]">
                          {work.assigned_at ? new Date(work.assigned_at).toLocaleDateString('ar-SA') : '-'}
                        </span>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-xl border">
                        <span className="text-[10px] text-gray-400 font-bold block">تاريخ الإنجاز</span>
                        <span className="font-bold text-sm text-[#1B2B48]">
                          {work.completed_at ? new Date(work.completed_at).toLocaleDateString('ar-SA') : '-'}
                        </span>
                      </div>
                    </div>

                    {/* Notes */}
                    {work.notes && (
                      <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                        <span className="text-[10px] text-blue-500 font-bold block mb-1">ملاحظات</span>
                        <p className="text-sm font-bold text-[#1B2B48]">{work.notes}</p>
                      </div>
                    )}

                    {/* Action Buttons (only for assigned tasks, not coded) */}
                    {activeTab === 'my_tasks' && effectiveStatus !== 'completed' && (
                      <div className="flex gap-3 pt-2">
                        {(effectiveStatus === 'pending' || effectiveStatus === 'overdue') && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleUpdateStatus(work, 'in_progress'); }}
                            disabled={isUpdating}
                            className="flex-1 bg-blue-600 text-white py-3 rounded-2xl font-black text-sm flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors disabled:opacity-50"
                          >
                            {isUpdating ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                            بدء العمل
                          </button>
                        )}
                        {(effectiveStatus === 'in_progress' || effectiveStatus === 'overdue') && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleUpdateStatus(work, 'completed'); }}
                            disabled={isUpdating}
                            className="flex-1 bg-green-600 text-white py-3 rounded-2xl font-black text-sm flex items-center justify-center gap-2 hover:bg-green-700 transition-colors disabled:opacity-50"
                          >
                            {isUpdating ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                            تم الإنجاز
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Completion Rate */}
      {stats.total > 0 && (
        <div className="bg-white p-6 rounded-[30px] border shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-black text-[#1B2B48] flex items-center gap-2">
              <TrendingUp size={20} className="text-[#E95D22]" />
              معدل الإنجاز
            </h3>
            <span className="text-3xl font-black text-[#E95D22]">
              {Math.round((stats.completed / stats.total) * 100)}%
            </span>
          </div>
          <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-l from-[#E95D22] to-green-500 rounded-full transition-all duration-700"
              style={{ width: `${(stats.completed / stats.total) * 100}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs font-bold text-gray-400">
            <span>{stats.completed} منجز من {stats.total}</span>
            <span>{stats.total - stats.completed} متبقي</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyTasksDashboard;
