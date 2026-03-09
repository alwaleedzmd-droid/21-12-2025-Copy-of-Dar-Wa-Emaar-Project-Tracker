
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Routes, Route, useNavigate, useLocation, useParams, Navigate } from 'react-router-dom';
import { AlertTriangle, Loader2, Plus, 
  CheckCircle2, Clock,
  ChevronLeft, ShieldAlert,
  MessageSquare, Send, Sheet, AtSign, Tag, Calendar, Timer, AlertCircle,
  FileWarning, ArrowLeftRight, TrendingUp, ChevronDown, ChevronUp
} from 'lucide-react';
import { supabase } from './supabaseClient';
import { ProjectWork, UserRole, User } from './types';
import { DAR_LOGO } from './constants';
import Modal from './components/Modal';
import { useData } from './contexts/DataContext';
import { notificationService } from './services/notificationService';
import { activityLogService } from './services/activityLogService';
import MainLayout from './layouts/MainLayout';
import { parseProjectWorksExcel } from './utils/excelHandler';

// --- Components ---
import DashboardModule from './components/DashboardModule';
import TechnicalModule from './components/TechnicalModule';
import ProjectsModule from './components/ProjectsModule';
import DeedsDashboard from './components/DeedsDashboard';
import ProjectDetailView from './components/ProjectDetailView';
import ProjectRequestsView from './components/ProjectRequestsView';
import UserManagement from './components/UserManagement'; 
import WorkflowManagement from './components/WorkflowManagement';
import AIAssistant from './components/AIAssistant';
import StatisticsDashboard from './components/StatisticsDashboard';
import LoginPage from './components/LoginPage';
import SystemGuide from './components/SystemGuide';
import InteractiveOperationsMap from './components/InteractiveOperationsMap';
import TaskAssignment from './components/TaskAssignment';
import MyTasksDashboard from './components/MyTasksDashboard';
import AppleStyleHero from './components/AppleStyleHero';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
}

/**
 * Silent ProtectedRoute
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { currentUser, isAuthLoading } = useData();

  if (isAuthLoading || !currentUser) {
    return <div className="min-h-screen bg-white" />;
  }
  
  if (!allowedRoles.includes(currentUser.role)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-12 text-center font-cairo" dir="rtl">
        <ShieldAlert size={64} className="text-red-500 mb-6" />
        <h2 className="text-3xl font-black text-[#1B2B48] mb-4">الوصول مرفوض</h2>
        <p className="text-gray-500 font-bold max-w-md mb-8">عذراً، لا تملك الصلاحيات الكافية لعرض هذا القسم.</p>
        <button 
          onClick={() => window.location.href = '/'} 
          className="px-10 py-4 bg-[#1B2B48] text-white rounded-2xl font-black shadow-lg"
        >
          العودة للرئيسية
        </button>
      </div>
    );
  }

  return <>{children}</>;
};

interface ErrorBoundaryProps {
  children?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: any): ErrorBoundaryState {
    return { hasError: true };
  }

  render(): React.ReactNode {
    if (this.state.hasError) return (
      <div className="min-h-screen flex items-center justify-center text-red-500 font-bold bg-[#f8f9fa] p-10 text-center flex-col gap-4" dir="rtl">
        <AlertTriangle size={48} />
        <h2 className="text-2xl font-black text-[#1B2B48]">حدث خطأ غير متوقع</h2>
        <button onClick={() => window.location.reload()} className="bg-[#1B2B48] text-white px-8 py-3 rounded-2xl font-bold shadow-lg">إعادة تحميل النظام</button>
      </div>
    );
    return this.props.children;
  }
}

const ProjectDetailWrapper = ({ projects = [], currentUser }: any) => {
   const { id } = useParams();
   const navigate = useNavigate();
   const { refreshData, logActivity, projectWorks: allProjectWorks, technicalRequests, clearanceRequests } = useData();
   
   const [isAddWorkOpen, setIsAddWorkOpen] = useState(false);
   const [isWorkDetailOpen, setIsWorkDetailOpen] = useState(false);
   const [selectedWork, setSelectedWork] = useState<ProjectWork | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
   const [workComments, setWorkComments] = useState<any[]>([]);
   const [newComment, setNewComment] = useState('');
   const [loadingComments, setLoadingComments] = useState(false);
   const [isActionLoading, setIsActionLoading] = useState(false);
   const [isBulkLoading, setIsBulkLoading] = useState(false);
   
   const [newWorkForm, setNewWorkForm] = useState({ task_name: '', authority: '', department: '', notes: '', expected_completion_date: '' });
   const commentsEndRef = useRef<HTMLDivElement>(null);
   const excelInputRef = useRef<HTMLInputElement>(null);
   
   // حالات نظام تبرير التأخير وتعديل التاريخ
   const [showJustificationForm, setShowJustificationForm] = useState(false);
   const [justificationText, setJustificationText] = useState('');
   const [newDeadlineDate, setNewDeadlineDate] = useState('');
   const [isSavingDeadline, setIsSavingDeadline] = useState(false);
   
   // حالات تاريخ الترميز وإقفال المعالج
   const [handlerHistory, setHandlerHistory] = useState<any[]>([]);
   const [showHandlerHistory, setShowHandlerHistory] = useState(false);
   const [showCloseHandlerForm, setShowCloseHandlerForm] = useState(false);
   const [closeHandlerAction, setCloseHandlerAction] = useState<'completed' | 'in_progress' | 'escalated'>('completed');

   const project = useMemo(() => projects.find((p: any) => p.id === Number(id)), [projects, id]);
   const isManager = ['ADMIN', 'PR_MANAGER'].includes(currentUser?.role || '');
   const isAdmin = currentUser?.role === 'ADMIN';

   // جلب الأعمال مباشرة من Supabase كبديل احتياطي
   const [localWorks, setLocalWorks] = useState<ProjectWork[]>([]);
   const [localWorksFetched, setLocalWorksFetched] = useState(false);

   // استخدام بيانات أعمال المشاريع من DataContext وتصفيتها حسب المشروع الحالي
   const filteredWorks = useMemo(() => {
     if (!project) return [];
     const pid = Number(project.id);
     const projectNames = [project.name, project.title, project.client]
       .map((n: string | undefined) => (n || '').trim())
       .filter(Boolean);
     
     const result = (allProjectWorks || []).filter((w: any) => {
       const wId = Number(w.projectId ?? w.projectid ?? w.project_id ?? -1);
       if (wId === pid) return true;
       if (!w.project_name) return false;
       return projectNames.includes(String(w.project_name).trim());
     });

     console.log('🔍 تصفية أعمال المشروع:', {
       projectId: pid,
       projectNames,
       totalWorksInContext: (allProjectWorks || []).length,
       matchedWorks: result.length
     });

     return result;
   }, [allProjectWorks, project]);

   // جلب مباشر من قاعدة البيانات في حال لم تعمل التصفية
   useEffect(() => {
     const fetchDirectWorks = async () => {
       if (!project || filteredWorks.length > 0) {
         setLocalWorks([]);
         setLocalWorksFetched(true);
         return;
       }
       // إذا لم تجد التصفية أي نتائج، جلب مباشر
       console.log('⚠️ لم يتم العثور على أعمال عبر التصفية، جلب مباشر من Supabase...');
       try {
         const pid = Number(project.id);
         const projectNames = [project.name, project.title, project.client].filter(Boolean);

         // محاولة 1: بواسطة projectId
         let { data, error } = await supabase
           .from('project_works')
           .select('*')
           .or(`projectId.eq.${pid},projectid.eq.${pid},project_id.eq.${pid}`);
         
         if (error) {
           console.warn('⚠️ خطأ الجلب بـ projectId:', error.message);
           // محاولة 2: بدون فلتر
           const res2 = await supabase.from('project_works').select('*');
           if (!res2.error && res2.data) {
             data = res2.data.filter((w: any) => {
               const wId = Number(w.projectId ?? w.projectid ?? w.project_id ?? w['"projectId"'] ?? -1);
               if (wId === pid) return true;
               if (!w.project_name) return false;
               return projectNames.includes(String(w.project_name).trim());
             });
           }
         }

         // محاولة 3: بواسطة project_name
         if (!data || data.length === 0) {
           if (projectNames.length > 0) {
             const res3 = await supabase
               .from('project_works')
               .select('*')
               .in('project_name', projectNames);
             if (!res3.error && res3.data) {
               data = res3.data;
             }
           }
         }

         // محاولة 4: جلب جميع الأعمال والتصفية يدوياً
         if (!data || data.length === 0) {
           const res4 = await supabase.from('project_works').select('*');
           if (!res4.error && res4.data && res4.data.length > 0) {
             console.log('📋 جميع الأعمال - أعمدة:', Object.keys(res4.data[0]));
             console.log('📋 جميع الأعمال - عينة:', JSON.stringify(res4.data[0]));
             data = res4.data.filter((w: any) => {
               const wId = Number(w.projectId ?? w.projectid ?? w.project_id ?? -1);
               if (wId === pid) return true;
               if (!w.project_name) return false;
               return projectNames.includes(String(w.project_name).trim());
             });
             console.log(`📋 بعد التصفية اليدوية: ${data.length} من ${res4.data.length}`);
           }
         }

         const normalized = (data || []).map((w: any) => ({
           ...w,
           projectId: w.projectId ?? w.projectid ?? w.project_id ?? null
         }));
         console.log('✅ جلب مباشر:', normalized.length, 'عمل');
         setLocalWorks(normalized);
       } catch (err) {
         console.error('❌ خطأ الجلب المباشر:', err);
       } finally {
         setLocalWorksFetched(true);
       }
     };
     fetchDirectWorks();
   }, [project, filteredWorks.length]);

   // دمج النتائج: أولوية للتصفية من DataContext، ثم الجلب المباشر
   const projectWorks = filteredWorks.length > 0 ? filteredWorks : localWorks;

   const fetchWorkComments = async (workId: number) => {
     setLoadingComments(true);
     try {
       const { data } = await supabase.from('work_comments').select('*').eq('work_id', workId).order('created_at', { ascending: true });
       setWorkComments(data || []);
       setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
     } catch (err) { console.error("Comments error:", err); } finally { setLoadingComments(false); }
   };

   // ═══ حساب الجهة المرمَّزة من التعليقات كبديل عن أعمدة قاعدة البيانات ═══
   // يعمل حتى لو لم يتم تشغيل ملفات الترحيل (migration)
   const computeHandlerFromComments = (comments: any[]): { handler: string | null; date: string | null; isCompleted: boolean } => {
     const reversed = [...comments].reverse();
     for (const comment of reversed) {
       const content = comment.content || '';
       // التحقق من علامة الإنجاز أولاً
       if (content.includes('✅ تم إنجاز الترميز @')) {
         const match = content.match(/@([\u0600-\u06FFa-zA-Z0-9_]+)/u);
         return { handler: match ? match[1] : null, date: comment.created_at, isCompleted: true };
       }
       // البحث عن @ترميز
       const tagMatch = content.match(/@([\u0600-\u06FFa-zA-Z0-9_]+)/u);
       if (tagMatch) {
         return { handler: tagMatch[1], date: comment.created_at, isCompleted: false };
       }
     }
     return { handler: null, date: null, isCompleted: false };
   };

   // ═══ حساب تاريخ الترميز الكامل من التعليقات ═══
   const computeHandlerHistory = (comments: any[]): any[] => {
     const history: any[] = [];
     for (const comment of comments) {
       const content = comment.content || '';
       // البحث عن @ترميز (إسناد جديد)
       const tagMatch = content.match(/@([\u0600-\u06FFa-zA-Z0-9_]+)/u);
       if (tagMatch) {
         const handler = tagMatch[1];
         const isCompletion = content.includes('✅ تم إنجاز الترميز') || content.includes('✅ تم إقفال');
         const isEscalation = content.includes('⬆️ تصعيد');
         const isReturn = content.includes('🔄 إعادة');
         
         if (isCompletion) {
           history.push({ handler, date: comment.created_at, action: 'completed', user: comment.user_name, note: content });
         } else if (isEscalation) {
           history.push({ handler, date: comment.created_at, action: 'escalated', user: comment.user_name, note: content });
         } else if (isReturn) {
           history.push({ handler, date: comment.created_at, action: 'returned', user: comment.user_name, note: content });
         } else {
           history.push({ handler, date: comment.created_at, action: 'tagged', user: comment.user_name, note: content });
         }
       }
     }
     return history;
   };

   // عند جلب التعليقات: إذا لم تكن أعمدة الترميز متوفرة، نحسب من التعليقات
   useEffect(() => {
     if (!selectedWork || workComments.length === 0) return;
     
     // حساب تاريخ الترميز من التعليقات
     const history = computeHandlerHistory(workComments);
     setHandlerHistory(history);
     
     if (selectedWork.current_handler) return; // البيانات موجودة من قاعدة البيانات
     
     const { handler, date, isCompleted } = computeHandlerFromComments(workComments);
     if (handler) {
       setSelectedWork(prev => prev ? {
         ...prev,
         current_handler: handler,
         handler_tagged_at: date || undefined,
         handler_status: isCompleted ? 'completed' : 'active'
       } : prev);
     }
   }, [workComments]);
   
   // ═══ فحص 48 ساعة بدون تحديثات على المعالج الحالي ═══
   useEffect(() => {
     if (!selectedWork?.current_handler || selectedWork.handler_status !== 'active' || !selectedWork.handler_tagged_at) return;
     if (!isManager) return;
     
     const taggedTime = new Date(selectedWork.handler_tagged_at).getTime();
     const hoursSinceTag = (Date.now() - taggedTime) / (1000 * 60 * 60);
     
     // التحقق من آخر تعليق على هذا العمل
     const lastComment = workComments.length > 0 ? workComments[workComments.length - 1] : null;
     const lastCommentTime = lastComment ? new Date(lastComment.created_at).getTime() : taggedTime;
     const hoursSinceLastUpdate = (Date.now() - lastCommentTime) / (1000 * 60 * 60);
     
     if (hoursSinceLastUpdate >= 48) {
       const days = Math.floor(hoursSinceLastUpdate / 24);
       notificationService.send(
         ['ADMIN', 'PR_MANAGER'],
         `⏰ العمل "${selectedWork.task_name}" لدى @${selectedWork.current_handler} منذ ${days} يوم بدون تحديثات — يرجى المتابعة`,
         `/projects/${id}`,
         '🤖 نظام المتابعة'
       );
     }
   }, [selectedWork, workComments]);

   const handleOpenWorkDetail = (work: ProjectWork) => {
     setSelectedWork(work);
     setIsWorkDetailOpen(true);
     // إعادة تهيئة نموذج التبرير عند فتح عمل جديد
     setShowJustificationForm(false);
     setJustificationText('');
     setNewDeadlineDate('');
     setShowCloseHandlerForm(false);
     setShowHandlerHistory(false);
     setHandlerHistory([]);
     fetchWorkComments(work.id);

    // prepare editable draft for notes
    setNoteDraft(work.notes || '');
     
     // فتح نموذج التبرير تلقائياً للأعمال المتأخرة (للمديرين فقط)
     if (['ADMIN', 'PR_MANAGER'].includes(currentUser?.role || '') && work.status !== 'completed' && work.expected_completion_date) {
       const today = new Date(); today.setHours(0,0,0,0);
       const target = new Date(work.expected_completion_date); target.setHours(0,0,0,0);
       if (target < today) {
         // تأخير بسيط لضمان عرض المودال أولاً ثم فتح النموذج
         setTimeout(() => setShowJustificationForm(true), 300);
       }
     }
   };

   const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !project) return;

    setIsBulkLoading(true);
    try {
      const data = await parseProjectWorksExcel(file, project.id, project.name || project.title);
      const { error } = await supabase.from('project_works').insert(data);
      if (error) throw error;

      notificationService.send('PR_MANAGER', `تم استيراد ${data.length} عمل لمشروع ${project.name}`, `/projects/${id}`, currentUser?.name);
      logActivity?.('استيراد إكسل أعمال', `مشروع ${project.name}: ${data.length} عمل`, 'text-blue-500');
      activityLogService.log({ userId: currentUser?.id || '', userName: currentUser?.name || '', userRole: currentUser?.role || '', actionType: 'create', entityType: 'work', entityName: project.name, description: `تم استيراد ${data.length} عمل لمشروع ${project.name}`, metadata: { projectId: project.id, count: data.length } });
      setLocalWorksFetched(false);
      refreshData();
      alert(`تم استيراد ${data.length} سجل بنجاح ✅`);
    } catch (err: any) {
      alert("فشل الاستيراد: " + err.message);
    } finally {
      setIsBulkLoading(false);
      e.target.value = '';
    }
   };

   const handleUpdateWorkStatus = async (status: 'completed' | 'in_progress') => {
     if (!selectedWork || !isManager) return;
     if (!window.confirm(`تغيير الحالة إلى ${status === 'completed' ? 'منجز' : 'قيد المتابعة'}؟`)) return;
     setIsActionLoading(true);
     try {
       const { error } = await supabase.from('project_works').update({ status }).eq('id', selectedWork.id);
       if (error) throw error;
       
       if (status === 'completed') {
          notificationService.send('PR_MANAGER', `✅ تم إنجاز عمل بالمشروع: ${selectedWork.task_name}`, `/projects/${id}`, currentUser?.name);
       }

       setSelectedWork({ ...selectedWork, status });
       logActivity?.('تحديث حالة عمل', `${selectedWork.task_name} -> ${status}`, 'text-blue-500');
       activityLogService.log({ userId: currentUser?.id || '', userName: currentUser?.name || '', userRole: currentUser?.role || '', actionType: 'status_change', entityType: 'work', entityId: String(selectedWork.id), entityName: selectedWork.task_name, description: `تغيير حالة "${selectedWork.task_name}" إلى ${status === 'completed' ? 'منجز' : 'قيد المتابعة'}`, oldValue: { status: selectedWork.status }, newValue: { status } });
       setLocalWorksFetched(false);
       refreshData();
     } catch (err: any) { alert("فشل التحديث: " + err.message); } finally { setIsActionLoading(false); }
   };

   const handleDeleteWork = async (workId: number, taskName: string) => {
     if (!isAdmin) return;
     if (!window.confirm(`حذف العمل "${taskName}" نهائياً؟`)) return;
     try {
       const { error } = await supabase.from('project_works').delete().eq('id', workId);
       if (error) throw error;
       logActivity?.('حذف عمل مشروع', taskName, 'text-orange-500');
       activityLogService.log({ userId: currentUser?.id || '', userName: currentUser?.name || '', userRole: currentUser?.role || '', actionType: 'delete', entityType: 'work', entityId: String(workId), entityName: taskName, description: `تم حذف العمل "${taskName}"` });
       setIsWorkDetailOpen(false);
       setLocalWorksFetched(false);
       refreshData();
     } catch (err: any) { alert("خطأ أثناء الحذف: " + err.message); }
   };

  // حفظ وصف العمل (قابل للحفظ من قبل مدير النظام)
  const handleSaveWorkNotes = async () => {
    if (!selectedWork) return;
    if (currentUser?.role !== 'ADMIN') { alert('لا تملك الصلاحية لحفظ الوصف'); return; }
    setIsActionLoading(true);
    try {
      const payload: any = { notes: noteDraft || null };
      let { error } = await supabase.from('project_works').update(payload).eq('id', selectedWork.id);
      if (error && error.message?.includes('schema cache')) {
        const { error: retryErr } = await supabase.from('project_works').update({ notes: noteDraft }).eq('id', selectedWork.id);
        error = retryErr;
      }
      if (error) throw error;

      setSelectedWork({ ...selectedWork, notes: noteDraft });
      setLocalWorksFetched(false);
      refreshData();
      activityLogService.log({ userId: currentUser?.id || '', userName: currentUser?.name || '', userRole: currentUser?.role || '', actionType: 'update', entityType: 'work', entityId: String(selectedWork.id), entityName: selectedWork.task_name, description: `تحديث وصف العمل: ${selectedWork.task_name}`, oldValue: { notes: selectedWork.notes }, newValue: { notes: noteDraft } });
      alert('تم حفظ الوصف بنجاح');
    } catch (err: any) {
      alert('فشل حفظ الوصف: ' + (err?.message || String(err)));
      console.error('Save notes error', err);
    } finally {
      setIsActionLoading(false);
    }
  };

   const handleAddComment = async () => {
     if (!newComment.trim() || !selectedWork) return;
     
     // ══ فحص: يجب إقفال المعالج الحالي قبل ترميز جديد ══
     const tagMatch = newComment.match(/@([\u0600-\u06FFa-zA-Z0-9_]+)/u);
     if (tagMatch && tagMatch[1]) {
       const newHandler = tagMatch[1];
       // إذا كان هناك معالج نشط مختلف عن الجديد → يجب إقفاله أولاً
       if (selectedWork.current_handler && selectedWork.handler_status === 'active' && selectedWork.current_handler !== newHandler) {
         alert(`⚠️ يجب إقفال الترميز الحالي لدى @${selectedWork.current_handler} أولاً (منجز / قيد العمل / تصعيد) قبل ترميز جهة جديدة`);
         setShowCloseHandlerForm(true);
         return;
       }
     }
     
     setLoadingComments(true);
     try {
      const { error } = await supabase.from('work_comments').insert({
        work_id: selectedWork.id,
        user_name: currentUser?.name || 'مستخدم',
        content: newComment.trim()
      });
      if (error) throw error;

      // إضافة متفائلة محلياً لعرض التعليق فوراً قبل إعادة الجلب
      try {
        const optimisticComment = {
          id: `tmp-${Date.now()}`,
          work_id: selectedWork.id,
          user_name: currentUser?.name || 'مستخدم',
          content: newComment.trim(),
          created_at: new Date().toISOString()
        };
        setWorkComments(prev => [...(prev || []), optimisticComment]);
        setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      } catch (e) {
        console.warn('Optimistic comment append failed', e);
      }
       
       // استخراج @ترميز من التعليق وتحديث الجهة الحالية
       if (tagMatch && tagMatch[1]) {
         const handler = tagMatch[1];
         const taggedAt = new Date().toISOString();
         
         // محاولة تحديث أعمدة قاعدة البيانات (قد تفشل إذا لم يتم تشغيل الترحيل)
         try {
           const { error: hErr } = await supabase.from('project_works').update({
             current_handler: handler,
             handler_tagged_at: taggedAt,
             handler_status: 'active'
           }).eq('id', selectedWork.id);
           if (hErr) console.warn('⚠️ أعمدة الترميز غير متوفرة في قاعدة البيانات - البيانات محفوظة في التعليقات:', hErr.message);
         } catch (e) {
           console.warn('⚠️ أعمدة الترميز غير متوفرة:', e);
         }
         
         // تحديث الحالة المحلية دائماً (يعمل من التعليقات)
         setSelectedWork({ ...selectedWork, current_handler: handler, handler_tagged_at: taggedAt, handler_status: 'active' });
         
         notificationService.send(['ADMIN', 'PR_MANAGER'], 
           `🏷️ تم ترميز "${selectedWork.task_name}" إلى @${handler}`, 
           `/projects/${id}`, currentUser?.name);
       }
       
       notificationService.send('PR_MANAGER', `💬 ملاحظة جديدة في ${selectedWork.task_name}`, `/projects/${id}`, currentUser?.name);

      setNewComment('');
      setLocalWorksFetched(false);
      refreshData();
      // جلب التعليقات للتأكد من التزامن مع الخادم
      fetchWorkComments(selectedWork.id);
     } catch (err: any) { alert("خطأ: " + err.message); } finally { setLoadingComments(false); }
   };

     const handleAddWork = async () => {
       if (!newWorkForm.task_name || !project) return;
       const projectName = project.name || project.title || project.client || '';
       const baseData: any = { 
         task_name: newWorkForm.task_name,
         authority: newWorkForm.authority || null,
         department: newWorkForm.department || null,
         notes: newWorkForm.notes || null,
         project_name: projectName, 
         projectId: project.id, 
         status: 'in_progress'
       };
       
       // محاولة الإدراج مع تاريخ الإنجاز المتوقع (إن وُجد)
       let insertData = { ...baseData };
       if (newWorkForm.expected_completion_date) {
         insertData.expected_completion_date = newWorkForm.expected_completion_date;
       }
       let { error } = await supabase.from('project_works').insert(insertData);
       
       // إذا فشل بسبب عمود غير موجود، إعادة المحاولة بدون expected_completion_date
       if (error && error.message?.includes('schema cache')) {
         console.warn('⚠️ عمود expected_completion_date غير متوفر، إعادة المحاولة بدون تاريخ الإنجاز');
         const { error: retryErr } = await supabase.from('project_works').insert(baseData);
         error = retryErr;
       }
       
       if (!error) { 
         notificationService.send('PR_MANAGER', `🆕 تم تسجيل عمل جديد بمشروع ${project.name}`, `/projects/${id}`, currentUser?.name);
         activityLogService.log({ userId: currentUser?.id || '', userName: currentUser?.name || '', userRole: currentUser?.role || '', actionType: 'create', entityType: 'work', entityName: newWorkForm.task_name, description: `تم إضافة عمل جديد "${newWorkForm.task_name}" في مشروع ${project.name}`, metadata: { projectId: project.id, projectName: project.name } });
         
         setIsAddWorkOpen(false); 
         setNewWorkForm({ task_name: '', authority: '', department: '', notes: '', expected_completion_date: '' });
         setLocalWorksFetched(false);
         refreshData(); 
       } else {
         alert('فشل إضافة العمل: ' + error.message);
       }
   };

   // تحديث حالة الترميز (منجز / قيد العمل / تصعيد) — مع تسجيل التاريخ
   const handleCloseHandler = async (work: ProjectWork, action: 'completed' | 'in_progress' | 'escalated') => {
     if (!work.current_handler) return;
     
     const actionLabels: Record<string, { emoji: string; label: string; dbStatus: string }> = {
       'completed': { emoji: '✅', label: 'منجز', dbStatus: 'completed' },
       'in_progress': { emoji: '🔄', label: 'قيد العمل', dbStatus: 'completed' },
       'escalated': { emoji: '⬆️', label: 'تصعيد', dbStatus: 'completed' },
     };
     const { emoji, label, dbStatus } = actionLabels[action];
     
     let dbSuccess = false;
     
     // محاولة 1: تحديث عمود handler_status في قاعدة البيانات
     try {
       const { error } = await supabase.from('project_works').update({
         handler_status: dbStatus
       }).eq('id', work.id);
       if (!error) dbSuccess = true;
       else console.warn('⚠️ عمود handler_status غير متوفر:', error.message);
     } catch (err) {
       console.warn('⚠️ فشل تحديث عمود handler_status:', err);
     }
     
     // تسجيل الإقفال كتعليق (دائماً — لبناء سجل التاريخ)
     const commentContent = `${emoji} تم إقفال الترميز @${work.current_handler} — الحالة: ${label}`;
     try {
       await supabase.from('work_comments').insert({
         work_id: work.id,
         user_name: currentUser?.name || 'النظام',
         content: commentContent
       });
     } catch (e) {
       console.error('فشل تسجيل الإقفال:', e);
     }
     
     // إشعار
     notificationService.send(['ADMIN', 'PR_MANAGER'],
       `${emoji} @${work.current_handler} — ${label} في "${work.task_name}"`,
       `/projects/${id}`, currentUser?.name);
     activityLogService.log({ userId: currentUser?.id || '', userName: currentUser?.name || '', userRole: currentUser?.role || '', actionType: 'handler_change', entityType: 'work', entityId: String(work.id), entityName: work.task_name, description: `${emoji} إقفال ترميز @${work.current_handler} — ${label} في "${work.task_name}"`, oldValue: { handler: work.current_handler, handler_status: 'active' }, newValue: { handler_status: dbStatus } });
     
     // تحديث الحالة المحلية
     if (selectedWork?.id === work.id) {
       setSelectedWork({ ...selectedWork, handler_status: 'completed' as any });
     }
     setShowCloseHandlerForm(false);
     setLocalWorksFetched(false);
     refreshData();
     fetchWorkComments(work.id);
   };

   if (!project) return <div className="p-20 text-center font-bold text-gray-400">جاري تحميل بيانات المشروع...</div>;

   return (
     <div className="space-y-8 animate-in fade-in">
        <ProjectDetailView 
          project={project} 
          isAdmin={isAdmin} 
          onBack={() => navigate('/projects')} 
          onRefresh={refreshData}
          technicalRequests={technicalRequests}
          clearanceRequests={clearanceRequests}
        />
        
        {/* ✅ عرض الطلبات التقنية والإفراغات المرتبطة بالمشروع */}
        <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100">
          <ProjectRequestsView 
            projectId={project.id}
            projectName={project.name || project.title || project.client || ''}
            technicalRequests={technicalRequests}
            clearanceRequests={clearanceRequests}
          />
        </div>
        
        <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-black text-[#1B2B48]">سجل أعمال المشروع</h2>
                  <p className="text-gray-400 text-xs font-bold mt-1">انقر لعرض التفاصيل والتعليقات</p>
                </div>
                {isManager && (
                  <div className="flex items-center gap-3">
                    <input type="file" ref={excelInputRef} hidden accept=".xlsx, .xls" onChange={handleExcelImport} />
                    <button 
                      onClick={() => excelInputRef.current?.click()}
                      disabled={isBulkLoading}
                      className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-50 transition-all shadow-sm"
                    >
                      {isBulkLoading ? <Loader2 size={18} className="animate-spin" /> : <Sheet size={18} className="text-green-600" />}
                      استيراد إكسل
                    </button>
                    <button onClick={() => setIsAddWorkOpen(true)} className="bg-[#E95D22] text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg hover:brightness-110 active:scale-95 transition-all">
                      <Plus size={20}/> إضافة عمل
                    </button>
                  </div>
                )}
            </div>
            {/* ─── تنبيه الأعمال المتأخرة (للمديرين فقط) ─── */}
            {isManager && (() => {
              const today = new Date(); today.setHours(0,0,0,0);
              const overdueWorks = projectWorks.filter((w: ProjectWork) => {
                if (w.status === 'completed' || !w.expected_completion_date) return false;
                const target = new Date(w.expected_completion_date); target.setHours(0,0,0,0);
                return target < today;
              });
              if (overdueWorks.length === 0) return null;
              return (
                <div className="mb-4 bg-red-50 border-2 border-red-300 p-4 rounded-2xl">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle size={18} className="text-red-600" />
                    <h3 className="font-black text-sm text-red-700">
                      ⚠️ {overdueWorks.length} عمل متأخر يحتاج تبرير
                    </h3>
                  </div>
                  <div className="space-y-1.5">
                    {overdueWorks.map((w: ProjectWork) => {
                      const target = new Date(w.expected_completion_date!); target.setHours(0,0,0,0);
                      const days = Math.abs(Math.ceil((target.getTime() - today.getTime()) / (1000*60*60*24)));
                      return (
                        <div key={w.id} onClick={() => handleOpenWorkDetail(w)} className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-red-200 cursor-pointer hover:bg-red-50 transition-colors">
                          <span className="font-bold text-xs text-red-800">{w.task_name}</span>
                          <span className="text-[10px] font-black text-red-500 bg-red-100 px-2 py-1 rounded-lg">متأخر {days} يوم</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
            <div className="grid gap-4">
                {projectWorks.length === 0 ? (
                  <div className="p-10 text-center text-gray-400 border border-dashed rounded-2xl font-bold">لا توجد أعمال مسجلة</div>
                ) : (
                  projectWorks?.map(work => (
                      <div key={work.id} onClick={() => handleOpenWorkDetail(work)} className="flex items-center justify-between p-5 bg-gray-50 rounded-2xl border border-transparent hover:border-[#E95D22]/30 hover:bg-white transition-all cursor-pointer group">
                          <div className="flex items-center gap-4">
                              <div className={`w-3 h-12 rounded-full ${work.status === 'completed' ? 'bg-green-500' : 'bg-orange-500'}`}></div>
                              <div>
                                  <h3 className="font-bold text-[#1B2B48] group-hover:text-[#E95D22] transition-colors">{work.task_name}</h3>
                                  <p className="text-[10px] text-gray-400 font-bold uppercase">{work.authority || 'جهة غير محددة'}</p>
                                  {work.notes && (
                                    <p className="text-[12px] text-gray-600 mt-2 max-w-[44rem]" style={{whiteSpace: 'pre-wrap'}}>
                                      {work.notes.length > 220 ? work.notes.slice(0,220) + '...' : work.notes}
                                    </p>
                                  )}
                              </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {work.current_handler && work.handler_status === 'active' && (
                              <span className="px-3 py-1.5 rounded-xl font-black text-[10px] bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1">
                                <AtSign size={10} /> {work.current_handler}
                              </span>
                            )}
                            {work.expected_completion_date && (() => {
                              const today = new Date(); today.setHours(0,0,0,0);
                              const target = new Date(work.expected_completion_date); target.setHours(0,0,0,0);
                              const diffDays = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                              const isCompleted = work.status === 'completed';
                              const isOverdue = diffDays < 0 && !isCompleted;
                              const isNear = diffDays >= 0 && diffDays <= 3 && !isCompleted;
                              const isSafe = diffDays > 3 || isCompleted;
                              const dateStr = target.toLocaleDateString('ar-EG');
                              return (
                                <span className={`px-3 py-1.5 rounded-xl font-black text-[10px] flex items-center gap-1.5 border ${
                                  isCompleted ? 'bg-green-50 text-green-600 border-green-200' :
                                  isOverdue ? 'bg-red-50 text-red-600 border-red-300' : 
                                  isNear ? 'bg-amber-50 text-amber-600 border-amber-200' : 
                                  'bg-blue-50 text-blue-600 border-blue-200'
                                }`}>
                                  {isOverdue ? <AlertCircle size={11} /> : isNear ? <Timer size={11} /> : <Calendar size={11} />}
                                  <span>{dateStr}</span>
                                  {!isCompleted && (
                                    <span className={`px-1.5 py-0.5 rounded-md text-[8px] font-black ${
                                      isOverdue ? 'bg-red-500 text-white' : isNear ? 'bg-amber-500 text-white' : 'bg-blue-100 text-blue-700'
                                    }`}>
                                      {isOverdue ? `متأخر ${Math.abs(diffDays)}ي` : diffDays === 0 ? 'اليوم!' : `${diffDays}ي`}
                                    </span>
                                  )}
                                </span>
                              );
                            })()}
                            <span className={`px-4 py-2 rounded-xl font-black text-[10px] border ${work.status === 'completed' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-orange-50 text-orange-700 border-orange-100'}`}>
                              {work.status === 'completed' ? 'منجز ✅' : 'قيد المتابعة ⏳'}
                            </span>
                            <ChevronLeft className="text-gray-300 group-hover:text-[#E95D22]" size={18} />
                          </div>
                      </div>
                  ))
                )}
            </div>
        </div>
        <Modal isOpen={isAddWorkOpen} onClose={() => setIsAddWorkOpen(false)} title="إضافة عمل للمشروع">
            <div className="space-y-4 text-right font-cairo">
                <input className="w-full p-4 bg-gray-50 rounded-2xl border outline-none font-bold text-sm focus:border-[#E95D22]" placeholder="بيان العمل" onChange={e => setNewWorkForm({...newWorkForm, task_name: e.target.value})} />
                <div className="grid grid-cols-2 gap-3">
                  <input className="w-full p-4 bg-gray-50 rounded-2xl border outline-none font-bold text-sm focus:border-[#E95D22]" placeholder="جهة المراجعة" onChange={e => setNewWorkForm({...newWorkForm, authority: e.target.value})} />
                  <input className="w-full p-4 bg-gray-50 rounded-2xl border outline-none font-bold text-sm focus:border-[#E95D22]" placeholder="القسم الداخلي" onChange={e => setNewWorkForm({...newWorkForm, department: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-500 mb-2 flex items-center gap-1">
                    <Calendar size={14} className="text-[#E95D22]" /> تاريخ الإنجاز المتوقع
                  </label>
                  <input 
                    type="date" 
                    title="تاريخ الإنجاز المتوقع"
                    className="w-full p-4 bg-gray-50 rounded-2xl border outline-none font-bold text-sm focus:border-[#E95D22]" 
                    value={newWorkForm.expected_completion_date} 
                    onChange={e => setNewWorkForm({...newWorkForm, expected_completion_date: e.target.value})} 
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <textarea className="w-full p-4 bg-gray-50 rounded-2xl border outline-none font-bold text-sm min-h-[100px] focus:border-[#E95D22]" placeholder="ملاحظات..." onChange={e => setNewWorkForm({...newWorkForm, notes: e.target.value})}></textarea>
                <button onClick={handleAddWork} className="w-full bg-[#1B2B48] text-white py-4 rounded-2xl font-black shadow-lg">حفظ البيانات</button>
            </div>
        </Modal>
        {selectedWork && (
          <Modal isOpen={isWorkDetailOpen} onClose={() => setIsWorkDetailOpen(false)} title="تفاصيل عمل المشروع">
              <div className="space-y-6 text-right font-cairo">
                  <div className={`p-5 rounded-[25px] border ${selectedWork.status === 'completed' ? 'bg-green-50 border-green-100 text-green-700' : 'bg-orange-50 border-orange-100 text-orange-700'}`}>
                      <h3 className="text-xl font-black">{selectedWork.task_name}</h3>
                      <p className="text-xs font-bold opacity-70 mt-1">{selectedWork.status === 'completed' ? 'منجز' : 'قيد المتابعة'}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 p-4 rounded-2xl border">
                        <span className="text-[10px] text-gray-400 font-bold block">الجهة</span>
                        <span className="font-bold text-[#1B2B48]">{selectedWork.authority || '-'}</span>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-2xl border">
                        <span className="text-[10px] text-gray-400 font-bold block">القسم</span>
                        <span className="font-bold text-[#1B2B48]">{selectedWork.department || '-'}</span>
                      </div>
                  </div>
                  {/* وصف/ملاحظات العمل — قابل للتعديل من قِبل مدير النظام */}
                  <div>
                    <label className="text-[10px] text-gray-400 font-bold block mb-1">الوصف</label>
                    {isAdmin ? (
                      <div className="space-y-2">
                        <textarea
                          className="w-full p-3 bg-white border rounded-xl font-bold text-sm outline-none min-h-[100px]"
                          value={noteDraft}
                          onChange={e => setNoteDraft(e.target.value)}
                        />
                        <div className="flex gap-2">
                          <button onClick={handleSaveWorkNotes} disabled={isActionLoading} className="bg-[#1B2B48] text-white px-4 py-2 rounded-xl font-bold hover:bg-[#243a5e]">
                            {isActionLoading ? 'جاري الحفظ...' : 'حفظ الوصف'}
                          </button>
                          <button onClick={() => setNoteDraft(selectedWork.notes || '')} disabled={isActionLoading} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-xl font-bold">
                            إلغاء
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-gray-50 p-4 rounded-2xl border">
                        <p className="text-sm font-bold text-[#1B2B48]">{selectedWork.notes || '-'}</p>
                      </div>
                    )}
                  </div>
                  {/* تاريخ الإنجاز المتوقع */}
                  {selectedWork.expected_completion_date && (() => {
                    const today = new Date();
                    today.setHours(0,0,0,0);
                    const target = new Date(selectedWork.expected_completion_date);
                    target.setHours(0,0,0,0);
                    const diffDays = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                    const isCompleted = selectedWork.status === 'completed';
                    const isOverdue = diffDays < 0 && !isCompleted;
                    const isNear = diffDays >= 0 && diffDays <= 3 && !isCompleted;
                    return (
                      <div className={`p-4 rounded-2xl border flex items-center justify-between ${
                        isCompleted ? 'bg-green-50 border-green-200' :
                        isOverdue ? 'bg-red-50 border-red-300' : 
                        isNear ? 'bg-amber-50 border-amber-200' : 
                        'bg-blue-50 border-blue-200'
                      }`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            isCompleted ? 'bg-green-100' :
                            isOverdue ? 'bg-red-100' : isNear ? 'bg-amber-100' : 'bg-blue-100'
                          }`}>
                            {isOverdue ? <AlertCircle size={18} className="text-red-600" /> : <Calendar size={18} className={isCompleted ? 'text-green-600' : isNear ? 'text-amber-600' : 'text-blue-600'} />}
                          </div>
                          <div>
                            <p className={`font-black text-sm ${
                              isCompleted ? 'text-green-700' :
                              isOverdue ? 'text-red-700' : isNear ? 'text-amber-700' : 'text-blue-700'
                            }`}>
                              تاريخ الإنجاز المتوقع: {new Date(selectedWork.expected_completion_date).toLocaleDateString('ar-EG')}
                            </p>
                            <p className={`text-[10px] font-bold ${
                              isCompleted ? 'text-green-500' :
                              isOverdue ? 'text-red-500' : isNear ? 'text-amber-500' : 'text-gray-400'
                            }`}>
                              {isCompleted ? 'تم الإنجاز ✅' :
                               isOverdue ? `⚠️ متأخر ${Math.abs(diffDays)} يوم` :
                               diffDays === 0 ? '❗ اليوم آخر موعد' :
                               `متبقي ${diffDays} يوم`}
                            </p>
                          </div>
                        </div>
                        {isOverdue && !isCompleted && (
                          <span className="bg-red-500 text-white px-3 py-1.5 rounded-xl text-[10px] font-black flex items-center gap-1">
                            <Timer size={12} /> متأخر
                          </span>
                        )}
                      </div>
                    );
                  })()}
                  {/* شارة الترميز الحالي + تاريخ الترميز + إقفال */}
                  {selectedWork.current_handler && (
                    <div className="space-y-3">
                      <div className={`p-4 rounded-2xl border ${
                        selectedWork.handler_status === 'completed' 
                          ? 'bg-green-50 border-green-200' 
                          : 'bg-purple-50 border-purple-200'
                      }`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                              selectedWork.handler_status === 'completed' ? 'bg-green-100' : 'bg-purple-100'
                            }`}>
                              {selectedWork.handler_status === 'completed' 
                                ? <CheckCircle2 size={18} className="text-green-600" />
                                : <AtSign size={18} className="text-purple-600" />
                              }
                            </div>
                            <div>
                              <p className={`font-black text-sm ${
                                selectedWork.handler_status === 'completed' ? 'text-green-700' : 'text-purple-700'
                              }`}>
                                لدى @{selectedWork.current_handler}
                              </p>
                              <p className="text-[10px] text-gray-400 font-bold">
                                {selectedWork.handler_tagged_at && (
                                  <span>منذ {new Date(selectedWork.handler_tagged_at).toLocaleDateString('ar-EG')}</span>
                                )}
                                {selectedWork.handler_status === 'completed' ? ' — تم الإنجاز ✅' : ' — نشط'}
                                {selectedWork.handler_tagged_at && selectedWork.handler_status === 'active' && (() => {
                                  const tagged = new Date(selectedWork.handler_tagged_at);
                                  const now = new Date();
                                  const diffDays = Math.floor((now.getTime() - tagged.getTime()) / (1000*60*60*24));
                                  const diffHours = Math.floor((now.getTime() - tagged.getTime()) / (1000*60*60));
                                  return (
                                    <span className={`mr-2 px-2 py-0.5 rounded-lg text-[9px] font-black ${
                                      diffDays >= 2 ? 'bg-red-100 text-red-600 animate-pulse' : diffDays >= 1 ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-500'
                                    }`}>
                                      {diffDays >= 1 ? `${diffDays} يوم` : `${diffHours} ساعة`}
                                      {diffDays >= 2 && ' ⚠️'}
                                    </span>
                                  );
                                })()}
                              </p>
                            </div>
                          </div>
                          {/* أزرار الإقفال — للمدير فقط */}
                          {isManager && selectedWork.handler_status === 'active' && !showCloseHandlerForm && (
                            <button 
                              onClick={() => setShowCloseHandlerForm(true)}
                              className="px-3 py-2 bg-purple-600 text-white rounded-xl font-bold text-[10px] flex items-center gap-1 hover:bg-purple-700 transition-colors"
                            >
                              <ArrowLeftRight size={12} /> إقفال/تحويل
                            </button>
                          )}
                        </div>
                        
                        {/* نموذج إقفال المعالج */}
                        {showCloseHandlerForm && isManager && selectedWork.handler_status === 'active' && (
                          <div className="mt-3 p-3 bg-white rounded-xl border border-purple-200 space-y-3">
                            <p className="text-xs font-black text-purple-700">تحديث حالة @{selectedWork.current_handler}:</p>
                            <div className="grid grid-cols-3 gap-2">
                              <button 
                                onClick={() => handleCloseHandler(selectedWork, 'completed')}
                                className={`py-2 rounded-lg text-[10px] font-black border transition-colors flex items-center justify-center gap-1 ${
                                  closeHandlerAction === 'completed' ? 'bg-green-500 text-white border-green-500' : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                                }`}
                              >
                                <CheckCircle2 size={12} /> منجز ✅
                              </button>
                              <button 
                                onClick={() => handleCloseHandler(selectedWork, 'in_progress')}
                                className={`py-2 rounded-lg text-[10px] font-black border transition-colors flex items-center justify-center gap-1 ${
                                  closeHandlerAction === 'in_progress' ? 'bg-blue-500 text-white border-blue-500' : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                                }`}
                              >
                                <Clock size={12} /> قيد العمل 🔄
                              </button>
                              <button 
                                onClick={() => handleCloseHandler(selectedWork, 'escalated')}
                                className={`py-2 rounded-lg text-[10px] font-black border transition-colors flex items-center justify-center gap-1 ${
                                  closeHandlerAction === 'escalated' ? 'bg-red-500 text-white border-red-500' : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                                }`}
                              >
                                <TrendingUp size={12} /> تصعيد ⬆️
                              </button>
                            </div>
                            <button onClick={() => setShowCloseHandlerForm(false)} className="text-[10px] text-gray-400 hover:text-gray-600 font-bold">
                              إلغاء
                            </button>
                          </div>
                        )}
                      </div>
                      
                      {/* ═══ سجل تاريخ الترميز (Timeline) ═══ */}
                      {handlerHistory.length > 0 && (
                        <div className="bg-gray-50 rounded-2xl border p-3">
                          <button onClick={() => setShowHandlerHistory(!showHandlerHistory)} className="w-full flex items-center justify-between">
                            <span className="text-xs font-black text-[#1B2B48] flex items-center gap-1.5">
                              <Clock size={13} className="text-purple-500" />
                              سجل تاريخ الترميز ({handlerHistory.length})
                            </span>
                            {showHandlerHistory ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                          </button>
                          {showHandlerHistory && (
                            <div className="mt-3 space-y-0 relative pr-4">
                              {/* الخط العمودي */}
                              <div className="absolute right-[7px] top-2 bottom-2 w-0.5 bg-purple-200"></div>
                              {handlerHistory.map((entry, idx) => {
                                const actionConfig: Record<string, { color: string; bg: string; emoji: string }> = {
                                  'tagged': { color: 'text-purple-600', bg: 'bg-purple-500', emoji: '🏷️' },
                                  'completed': { color: 'text-green-600', bg: 'bg-green-500', emoji: '✅' },
                                  'escalated': { color: 'text-red-600', bg: 'bg-red-500', emoji: '⬆️' },
                                  'returned': { color: 'text-blue-600', bg: 'bg-blue-500', emoji: '🔄' },
                                };
                                const config = actionConfig[entry.action] || actionConfig['tagged'];
                                const entryDate = new Date(entry.date);
                                const nextEntry = idx < handlerHistory.length - 1 ? handlerHistory[idx + 1] : null;
                                const duration = nextEntry 
                                  ? Math.floor((new Date(nextEntry.date).getTime() - entryDate.getTime()) / (1000*60*60*24))
                                  : entry.action === 'tagged' && selectedWork.handler_status === 'active'
                                    ? Math.floor((Date.now() - entryDate.getTime()) / (1000*60*60*24))
                                    : null;
                                
                                return (
                                  <div key={idx} className="relative flex items-start gap-3 pb-3">
                                    <div className={`w-3.5 h-3.5 rounded-full ${config.bg} border-2 border-white shadow-sm flex-shrink-0 z-10`}></div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className={`text-[10px] font-black ${config.color}`}>
                                          {config.emoji} @{entry.handler}
                                        </span>
                                        <span className="text-[9px] text-gray-400">
                                          {entryDate.toLocaleDateString('ar-EG')} {entryDate.toLocaleTimeString('ar-EG', {hour: '2-digit', minute:'2-digit'})}
                                        </span>
                                        {duration !== null && duration > 0 && (
                                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-black ${
                                            duration >= 2 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'
                                          }`}>
                                            {duration} يوم
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-[9px] text-gray-400 font-bold mt-0.5">بواسطة {entry.user}</p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  {/* تعديل/إضافة تاريخ الإنجاز المتوقع — للمدير و PR */}
                  {isManager && selectedWork.status !== 'completed' && (() => {
                    const hasDate = !!selectedWork.expected_completion_date;
                    const isOverdueNow = hasDate && (() => {
                      const today = new Date(); today.setHours(0,0,0,0);
                      const target = new Date(selectedWork.expected_completion_date!); target.setHours(0,0,0,0);
                      return target < today;
                    })();
                    const overdueDays = isOverdueNow ? (() => {
                      const today = new Date(); today.setHours(0,0,0,0);
                      const target = new Date(selectedWork.expected_completion_date!); target.setHours(0,0,0,0);
                      return Math.abs(Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
                    })() : 0;
                    
                    // ─── حفظ تاريخ جديد مع إشعارات ───
                    const handleSaveDate = async (date: string, justification?: string) => {
                      if (!date) return;
                      setIsSavingDeadline(true);
                      try {
                        // حفظ في قاعدة البيانات
                        const { error } = await supabase.from('project_works').update({ expected_completion_date: date }).eq('id', selectedWork.id);
                        if (error && !error.message?.includes('schema cache')) throw error;
                        
                        const dateStr = new Date(date).toLocaleDateString('ar-EG');
                        const projectName = project?.name || selectedWork.project_name || 'مشروع';
                        
                        // تسجيل كتعليق (يحفظ دائماً حتى لو الأعمدة غير موجودة)
                        const commentContent = justification 
                          ? `⚠️📅 تبرير التأخير — ${selectedWork.task_name}\nالموعد السابق: ${new Date(selectedWork.expected_completion_date!).toLocaleDateString('ar-EG')}\nالموعد الجديد: ${dateStr}\n📝 السبب: ${justification}`
                          : `📅 تم تسجيل تاريخ الإنجاز المتوقع: ${dateStr}`;
                        
                        await supabase.from('work_comments').insert({
                          work_id: selectedWork.id,
                          user_name: currentUser?.name || 'النظام',
                          content: commentContent
                        });
                        
                        // إرسال إشعارات
                        const handlerInfo = selectedWork.current_handler ? ` (لدى @${selectedWork.current_handler})` : '';
                        const notification = justification
                          ? `⚠️ تبرير التأخير: "${selectedWork.task_name}" في ${projectName}${handlerInfo}\nالموعد الجديد: ${dateStr}\nالسبب: ${justification}`
                          : `📅 تم تحديد موعد إنجاز "${selectedWork.task_name}"${handlerInfo}: ${dateStr}`;
                        
                        activityLogService.log({ userId: currentUser?.id || '', userName: currentUser?.name || '', userRole: currentUser?.role || '', actionType: justification ? 'justify_delay' : 'deadline_change', entityType: 'work', entityId: String(selectedWork.id), entityName: selectedWork.task_name, description: justification ? `تبرير تأخير "${selectedWork.task_name}": ${justification}` : `تحديد موعد إنجاز "${selectedWork.task_name}": ${dateStr}`, oldValue: { expected_completion_date: selectedWork.expected_completion_date }, newValue: { expected_completion_date: date }, metadata: { projectName, justification } });

                        // إشعار المدير والعلاقات العامة
                        notificationService.send(['ADMIN', 'PR_MANAGER'], notification, `/projects/${id}`, currentUser?.name);
                        
                        // إشعار الموظف المُسند إليه
                        if (selectedWork.assigned_to) {
                          notificationService.send('TECHNICAL', notification, `/projects/${id}`, currentUser?.name);
                          notificationService.send('CONVEYANCE', notification, `/projects/${id}`, currentUser?.name);
                        }
                        
                        setSelectedWork({ ...selectedWork, expected_completion_date: date });
                        setShowJustificationForm(false);
                        setJustificationText('');
                        setNewDeadlineDate('');
                        setLocalWorksFetched(false);
                        fetchWorkComments(selectedWork.id);
                        refreshData();
                      } catch (err: any) { 
                        alert('فشل حفظ التاريخ: ' + err.message); 
                      } finally {
                        setIsSavingDeadline(false);
                      }
                    };
                    
                    return (
                      <div className="space-y-3">
                        {/* ─── تحذير فوري للأعمال المتأخرة ─── */}
                        {isOverdueNow && !showJustificationForm && (
                          <div className="bg-red-500/10 border-2 border-red-400 p-4 rounded-2xl animate-pulse">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
                                  <AlertCircle size={18} className="text-white" />
                                </div>
                                <div>
                                  <h4 className="font-black text-sm text-red-700">⚠️ هذا العمل متأخر عن الموعد!</h4>
                                  <p className="text-[10px] font-bold text-red-500">
                                    الموعد المحدد: {new Date(selectedWork.expected_completion_date!).toLocaleDateString('ar-EG')} — متأخر {overdueDays} يوم
                                  </p>
                                </div>
                              </div>
                            </div>
                            <button 
                              onClick={() => { setShowJustificationForm(true); setNewDeadlineDate(''); setJustificationText(''); }}
                              className="w-full py-3 bg-red-600 text-white rounded-xl font-black text-sm flex items-center justify-center gap-2 hover:bg-red-700 transition-colors shadow-lg shadow-red-200"
                            >
                              <FileWarning size={16} /> تقديم مبرر التأخير وتحديد موعد جديد
                            </button>
                          </div>
                        )}

                        {/* ─── الحالة العادية: تعيين/تعديل تاريخ (غير متأخر) ─── */}
                        {!isOverdueNow && !showJustificationForm && (
                          <div className="bg-gray-50 p-4 rounded-2xl border">
                            <div className="flex items-center gap-3 mb-3">
                              <Calendar size={16} className="text-[#E95D22] flex-shrink-0" />
                              <label className="text-xs font-black text-gray-500">{hasDate ? 'تعديل تاريخ الإنجاز المتوقع:' : 'تحديد تاريخ الإنجاز المتوقع:'}</label>
                            </div>
                            <input 
                              type="date" 
                              title="تاريخ الإنجاز المتوقع"
                              className="w-full p-2.5 bg-white border rounded-xl font-bold text-sm outline-none focus:border-[#E95D22]"
                              value={selectedWork.expected_completion_date || ''}
                              min={new Date().toISOString().split('T')[0]}
                              onChange={(e) => handleSaveDate(e.target.value)}
                            />
                          </div>
                        )}
                        
                        {/* ─── نموذج تبرير التأخير (يفتح تلقائياً للأعمال المتأخرة) ─── */}
                        {showJustificationForm && (
                          <div className="bg-red-50 p-5 rounded-2xl border-2 border-red-300 space-y-4 shadow-lg shadow-red-100/50">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
                                  <FileWarning size={16} className="text-white" />
                                </div>
                                <h4 className="font-black text-sm text-red-700">تبرير التأخير وتحديث الموعد</h4>
                              </div>
                              <button onClick={() => { setShowJustificationForm(false); setJustificationText(''); setNewDeadlineDate(''); }}
                                className="text-gray-400 hover:text-red-500 font-bold text-lg transition-colors">
                                ✕
                              </button>
                            </div>
                            
                            {hasDate && (
                              <div className="bg-white p-3 rounded-xl border border-red-200 flex items-center gap-3">
                                <Timer size={16} className="text-red-500 flex-shrink-0" />
                                <div>
                                  <p className="text-[10px] text-red-500 font-black">الموعد السابق (متأخر {overdueDays} يوم):</p>
                                  <p className="font-bold text-sm text-red-700">{new Date(selectedWork.expected_completion_date!).toLocaleDateString('ar-EG')}</p>
                                </div>
                              </div>
                            )}
                            
                            <div>
                              <label className="text-xs font-black text-gray-600 mb-1.5 block">📝 سبب التأخير <span className="text-red-500">*</span></label>
                              <textarea 
                                className="w-full p-3 bg-white border-2 border-red-200 rounded-xl font-bold text-sm outline-none focus:border-red-400 resize-none"
                                rows={3}
                                placeholder="اكتب سبب التأخير بالتفصيل..."
                                value={justificationText}
                                onChange={(e) => setJustificationText(e.target.value)}
                                autoFocus
                              />
                            </div>
                            
                            <div>
                              <label className="text-xs font-black text-gray-600 mb-1.5 block">📅 التاريخ الجديد المتوقع <span className="text-red-500">*</span></label>
                              <input 
                                type="date" 
                                title="التاريخ الجديد المتوقع"
                                className="w-full p-2.5 bg-white border-2 border-red-200 rounded-xl font-bold text-sm outline-none focus:border-red-400"
                                value={newDeadlineDate}
                                min={new Date().toISOString().split('T')[0]}
                                onChange={(e) => setNewDeadlineDate(e.target.value)}
                              />
                            </div>
                            
                            <div className="flex gap-2">
                              <button 
                                onClick={() => {
                                  if (!justificationText.trim()) { alert('يرجى كتابة سبب التأخير'); return; }
                                  if (!newDeadlineDate) { alert('يرجى تحديد التاريخ الجديد'); return; }
                                  handleSaveDate(newDeadlineDate, justificationText.trim());
                                }}
                                disabled={isSavingDeadline || !justificationText.trim() || !newDeadlineDate}
                                className="flex-1 py-3 bg-[#1B2B48] text-white rounded-xl font-black text-sm flex items-center justify-center gap-2 hover:bg-[#243a5e] transition-colors disabled:opacity-50"
                              >
                                {isSavingDeadline ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                                حفظ التبرير والتاريخ الجديد
                              </button>
                              <button 
                                onClick={() => { setShowJustificationForm(false); setJustificationText(''); setNewDeadlineDate(''); }}
                                className="px-4 py-3 bg-gray-200 text-gray-600 rounded-xl font-black text-sm hover:bg-gray-300 transition-colors"
                              >
                                إلغاء
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                  {isManager && (
                    <div className="flex gap-2">
                       {selectedWork.status !== 'completed' ? (
                         <button onClick={() => handleUpdateWorkStatus('completed')} disabled={isActionLoading} className="flex-1 bg-green-600 text-white py-3 rounded-xl font-black text-xs flex items-center justify-center gap-2">
                           {isActionLoading ? <Loader2 className="animate-spin" size={16}/> : <CheckCircle2 size={16}/>} اعتماد كمنجز
                         </button>
                       ) : (
                         <button onClick={() => handleUpdateWorkStatus('in_progress')} disabled={isActionLoading} className="flex-1 bg-orange-500 text-white py-3 rounded-xl font-black text-xs flex items-center justify-center gap-2">
                           {isActionLoading ? <Loader2 className="animate-spin" size={16}/> : <Clock size={16}/>} إعادة للمتابعة
                         </button>
                       )}
                    </div>
                  )}
                  <div className="border-t pt-5">
                    <h4 className="font-black text-[#1B2B48] mb-4 flex items-center gap-2"><MessageSquare size={18} className="text-[#E95D22]"/> التعليقات</h4>
                    <div className="bg-gray-50 rounded-2xl p-4 h-56 overflow-y-auto space-y-3 mb-4 border shadow-inner custom-scrollbar">
                        {loadingComments ? <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-gray-300"/></div> : 
                          workComments?.map((c: any) => (
                            <div key={c.id} className={`p-3 rounded-xl shadow-sm max-w-[85%] ${c.user_name === currentUser?.name ? 'bg-blue-50 mr-auto border border-blue-100' : 'bg-white ml-auto border border-gray-100'}`}>
                                <div className="flex justify-between items-center mb-1 gap-4">
                                    <span className="font-black text-[10px] text-[#1B2B48]">{c.user_name}</span>
                                    <span className="text-[9px] text-gray-400" dir="ltr">{new Date(c.created_at).toLocaleTimeString('ar-EG', {hour: '2-digit', minute:'2-digit'})}</span>
                                </div>
                                <p className="text-xs text-gray-700 font-bold leading-relaxed">{c.content.split(/(@[\u0600-\u06FFa-zA-Z0-9_]+)/gu).map((part: string, i: number) => 
                                  part.match(/^@/) ? <span key={i} className="text-purple-600 font-black bg-purple-50 px-1 rounded">{part}</span> : part
                                )}</p>
                            </div>
                          ))
                        }
                        <div ref={commentsEndRef} />
                    </div>
                    <div className="flex gap-2">
                        <input className="flex-1 p-3 bg-gray-50 border rounded-xl outline-none text-xs font-bold" placeholder="أضف تعليق... (استخدم @الجهة للترميز)" value={newComment} onChange={e => setNewComment(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddComment()} />
                        <button onClick={handleAddComment} disabled={!newComment.trim() || loadingComments} aria-label="إرسال" className="p-3 bg-[#1B2B48] text-white rounded-xl flex items-center justify-center">
                          <span className="sr-only">إرسال</span>
                          <Send size={16}/>
                        </button>
                    </div>
                  </div>
              </div>
          </Modal>
        )}
     </div>
   );
};

const AppContent: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { 
    currentUser, isAuthLoading, logout,
    projects, technicalRequests, clearanceRequests, projectWorks, appUsers, refreshData, logActivity 
  } = useData();
  const [hasSeenHero, setHasSeenHero] = React.useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const forceShow = params.get('hero') === '1' || params.get('showHero') === '1';
      if (forceShow) return false; // force showing hero
    } catch (e) {
      // ignore
    }
    return localStorage.getItem('dar_seen_hero') === 'true';
  });

  const getDefaultPath = (role: UserRole) => {
    switch (role) {
      case 'ADMIN':
      case 'PR_MANAGER':
        return '/dashboard';
      case 'TECHNICAL':
        return '/technical';
      case 'CONVEYANCE':
        return '/deeds';
      default:
        return '/dashboard';
    }
  };

  const handleSaveWorkNotes = async () => {
    if (!selectedWork) return;
    if (!isAdmin) { alert('لا تملك الصلاحية لحفظ الوصف'); return; }
    setIsActionLoading(true);
    try {
      const payload: any = { notes: noteDraft || null };
      let { error } = await supabase.from('project_works').update(payload).eq('id', selectedWork.id);
      // fallback for schema cache errors - try without nulls
      if (error && error.message?.includes('schema cache')) {
        const { error: retryErr } = await supabase.from('project_works').update({ notes: noteDraft }).eq('id', selectedWork.id);
        error = retryErr;
      }
      if (error) throw error;

      // update local state and refresh
      setSelectedWork({ ...selectedWork, notes: noteDraft });
      setLocalWorksFetched(false);
      refreshData();
      activityLogService.log({ userId: currentUser?.id || '', userName: currentUser?.name || '', userRole: currentUser?.role || '', actionType: 'update', entityType: 'work', entityId: String(selectedWork.id), entityName: selectedWork.task_name, description: `تحديث وصف العمل: ${selectedWork.task_name}`, oldValue: { notes: selectedWork.notes }, newValue: { notes: noteDraft } });
      alert('تم حفظ الوصف بنجاح');
    } catch (err: any) {
      alert('فشل حفظ الوصف: ' + (err?.message || String(err)));
      console.error('Save notes error', err);
    } finally {
      setIsActionLoading(false);
    }
  };

  useEffect(() => {
    // Only auto-redirect to the default path if the hero has been seen.
    if (currentUser && !isAuthLoading && location.pathname === '/' && hasSeenHero) {
      navigate(getDefaultPath(currentUser.role), { replace: true });
    }
  }, [currentUser, isAuthLoading, navigate, location.pathname, hasSeenHero]);

  // Note: do not auto-mark hero as seen on auth state change — this caused
  // the hero to disappear immediately after login in some deployments.

  if (isAuthLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="animate-spin text-[#1B2B48] opacity-20 w-12 h-12" />
        <p className="text-[#1B2B48]/30 font-bold text-sm">جاري تحميل البيانات...</p>
      </div>
    </div>
  );

  if (!currentUser) return <LoginPage />;

  // عرض صفحة البداية السينمائية أول مرة
  if (!hasSeenHero) {
    return (
      <AppleStyleHero onSeen={(targetPath?: string) => {
        try {
          if (targetPath) navigate(targetPath, { replace: true });
        } finally {
          localStorage.setItem('dar_seen_hero', 'true');
          setHasSeenHero(true);
        }
      }} />
    );
  }

  return (
   <MainLayout>
      <Routes>
        {/* التوجيه التلقائي للموظف حسب صلاحياته */}
        <Route path="/" element={currentUser ? <Navigate to={getDefaultPath(currentUser.role)} replace /> : <Navigate to="/dashboard" replace />} />
        
        {/* لوحة الإحصائيات */}
        <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['ADMIN', 'PR_MANAGER']}><StatisticsDashboard /></ProtectedRoute>} />
        
        <Route path="/projects" element={<ProtectedRoute allowedRoles={['ADMIN', 'PR_MANAGER']}><ProjectsModule projects={projects} projectWorks={projectWorks} stats={{ projects: projects.length, techRequests: technicalRequests.length, clearRequests: clearanceRequests.length }} currentUser={currentUser} onProjectClick={(p) => navigate(`/projects/${p?.id}`)} onRefresh={refreshData} /></ProtectedRoute>} />
        
        <Route path="/projects/:id" element={<ProtectedRoute allowedRoles={['ADMIN', 'PR_MANAGER']}><ProjectDetailWrapper projects={projects} currentUser={currentUser} /></ProtectedRoute>} />
        
        {/* الطلبات الفنية: متاحة للفني والعلاقات العامة والمدير */}
        <Route path="/technical" element={<ProtectedRoute allowedRoles={['ADMIN', 'TECHNICAL', 'PR_MANAGER']}><TechnicalModule requests={technicalRequests} projects={projects} currentUser={currentUser} usersList={appUsers} onRefresh={refreshData} logActivity={logActivity} /></ProtectedRoute>} />
        
        {/* سجل الإفراغ: متاح لموظف الإفراغ (نورة وفريقها) والعلاقات العامة والمدير */}
        <Route path="/deeds" element={<ProtectedRoute allowedRoles={['ADMIN', 'CONVEYANCE', 'PR_MANAGER']}><DeedsDashboard currentUserRole={currentUser.role} currentUserName={currentUser.name} logActivity={logActivity} /></ProtectedRoute>} />
        
        {/* إدارة المستخدمين: للمدير فقط */}
        <Route path="/users" element={<ProtectedRoute allowedRoles={['ADMIN']}><UserManagement /></ProtectedRoute>} />
        
        {/* إسناد المهام: للمدير فقط */}
        <Route path="/task-assignment" element={<ProtectedRoute allowedRoles={['ADMIN']}><TaskAssignment /></ProtectedRoute>} />
        
        {/* لوحة مهامي: لجميع الأدوار */}
        <Route path="/my-tasks" element={<ProtectedRoute allowedRoles={['ADMIN', 'PR_MANAGER', 'TECHNICAL', 'CONVEYANCE']}><MyTasksDashboard /></ProtectedRoute>} />
        
        {/* إدارة سير الموافقات: للمدير فقط */}
        <Route path="/workflow" element={<ProtectedRoute allowedRoles={['ADMIN']}><WorkflowManagement currentUser={currentUser} /></ProtectedRoute>} />
        
        {/* الدليل الشامل للنظام */}
        <Route path="/guide" element={<ProtectedRoute allowedRoles={['ADMIN', 'PR_MANAGER']}><SystemGuide /></ProtectedRoute>} />
        
        {/* الخريطة التفاعلية للعمليات */}
        <Route path="/operations-map" element={<ProtectedRoute allowedRoles={['ADMIN', 'PR_MANAGER']}><InteractiveOperationsMap /></ProtectedRoute>} />
        
        <Route path="*" element={currentUser ? <Navigate to={getDefaultPath(currentUser.role)} replace /> : <Navigate to="/dashboard" replace />} />
      </Routes>
      
      {/* المحلل الذكي الاستباقي - لمدير النظام والعلاقات العامة فقط */}
      {['ADMIN', 'PR_MANAGER'].includes(currentUser.role) && (
        <AIAssistant currentUser={currentUser} projects={projects} technicalRequests={technicalRequests} clearanceRequests={clearanceRequests} projectWorks={projectWorks} appUsers={appUsers} onNavigate={(type, data) => navigate(type === 'PROJECT' ? `/projects/${data?.id}` : type === 'TECHNICAL' ? '/technical' : '/deeds')} />
      )}
    </MainLayout>
  );
};

const App: React.FC = () => (
  <ErrorBoundary><AppContent /></ErrorBoundary>
);

export default App;
