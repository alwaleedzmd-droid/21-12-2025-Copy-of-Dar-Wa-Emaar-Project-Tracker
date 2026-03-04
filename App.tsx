
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Routes, Route, useNavigate, useLocation, useParams, Navigate } from 'react-router-dom';
import { AlertTriangle, Loader2, Plus, 
  CheckCircle2, Clock,
  ChevronLeft, ShieldAlert,
  MessageSquare, Send, Sheet, AtSign, Tag, Calendar, Timer, AlertCircle,
  FileWarning
} from 'lucide-react';
import { supabase } from './supabaseClient';
import { ProjectWork, UserRole, User } from './types';
import { DAR_LOGO } from './constants';
import Modal from './components/Modal';
import { useData } from './contexts/DataContext';
import { notificationService } from './services/notificationService';
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

   // عند جلب التعليقات: إذا لم تكن أعمدة الترميز متوفرة، نحسب من التعليقات
   useEffect(() => {
     if (!selectedWork || workComments.length === 0) return;
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

   const handleOpenWorkDetail = (work: ProjectWork) => {
     setSelectedWork(work);
     setIsWorkDetailOpen(true);
     fetchWorkComments(work.id);
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
       setIsWorkDetailOpen(false);
       setLocalWorksFetched(false);
       refreshData();
     } catch (err: any) { alert("خطأ أثناء الحذف: " + err.message); }
   };

   const handleAddComment = async () => {
     if (!newComment.trim() || !selectedWork) return;
     setLoadingComments(true);
     try {
       const { error } = await supabase.from('work_comments').insert({
         work_id: selectedWork.id,
         user_name: currentUser?.name || 'مستخدم',
         content: newComment.trim()
       });
       if (error) throw error;
       
       // استخراج @ترميز من التعليق وتحديث الجهة الحالية
       const tagMatch = newComment.match(/@([\u0600-\u06FFa-zA-Z0-9_]+)/u);
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
         
         notificationService.send('ADMIN', 
           `🏷️ تم ترميز "${selectedWork.task_name}" إلى @${handler}`, 
           `/projects/${id}`, currentUser?.name);
         notificationService.send('PR_MANAGER', 
           `🏷️ تم ترميز "${selectedWork.task_name}" إلى @${handler}`, 
           `/projects/${id}`, currentUser?.name);
       }
       
       notificationService.send('PR_MANAGER', `💬 ملاحظة جديدة في ${selectedWork.task_name}`, `/projects/${id}`, currentUser?.name);

       setNewComment('');
       setLocalWorksFetched(false);
       refreshData();
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
         
         setIsAddWorkOpen(false); 
         setNewWorkForm({ task_name: '', authority: '', department: '', notes: '', expected_completion_date: '' });
         setLocalWorksFetched(false);
         refreshData(); 
       } else {
         alert('فشل إضافة العمل: ' + error.message);
       }
   };

   // تحديث حالة الترميز إلى منجز (للمدير والعلاقات العامة)
   const handleCompleteHandler = async (work: ProjectWork) => {
     if (!work.current_handler) return;
     let dbSuccess = false;
     
     // محاولة 1: تحديث عمود handler_status في قاعدة البيانات
     try {
       const { error } = await supabase.from('project_works').update({
         handler_status: 'completed'
       }).eq('id', work.id);
       if (!error) dbSuccess = true;
       else console.warn('⚠️ عمود handler_status غير متوفر:', error.message);
     } catch (err) {
       console.warn('⚠️ فشل تحديث عمود handler_status:', err);
     }
     
     // محاولة 2 (بديل): تسجيل الإنجاز كتعليق إذا فشل التحديث المباشر
     if (!dbSuccess) {
       try {
         await supabase.from('work_comments').insert({
           work_id: work.id,
           user_name: currentUser?.name || 'النظام',
           content: `✅ تم إنجاز الترميز @${work.current_handler}`
         });
       } catch (e) {
         console.error('فشل تسجيل الإنجاز:', e);
       }
     }
     
     // تحديث الحالة المحلية
     if (selectedWork?.id === work.id) {
       setSelectedWork({ ...selectedWork, handler_status: 'completed' });
     }
     setLocalWorksFetched(false);
     refreshData();
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
                              const dateStr = target.toLocaleDateString('ar-SA');
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
                              تاريخ الإنجاز المتوقع: {new Date(selectedWork.expected_completion_date).toLocaleDateString('ar-SA')}
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
                  {/* شارة الترميز الحالي */}
                  {selectedWork.current_handler && (
                    <div className={`p-4 rounded-2xl border flex items-center justify-between ${
                      selectedWork.handler_status === 'completed' 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-purple-50 border-purple-200'
                    }`}>
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
                            {selectedWork.handler_tagged_at && (
                              <span className="text-xs font-bold opacity-70 mr-2">
                                منذ {new Date(selectedWork.handler_tagged_at).toLocaleDateString('ar-SA')}
                              </span>
                            )}
                          </p>
                          <p className="text-[10px] text-gray-400 font-bold">
                            {selectedWork.handler_status === 'completed' ? 'تم الإنجاز ✅' : 'الإجراء الحالي لدى هذه الجهة'}
                            {selectedWork.handler_tagged_at && (() => {
                              const tagged = new Date(selectedWork.handler_tagged_at);
                              const now = new Date();
                              const diffDays = Math.floor((now.getTime() - tagged.getTime()) / (1000*60*60*24));
                              return diffDays > 0 ? (
                                <span className={`mr-2 px-2 py-0.5 rounded-lg text-[9px] font-black ${
                                  diffDays > 7 ? 'bg-red-100 text-red-600' : diffDays > 3 ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-500'
                                }`}>
                                  {diffDays} يوم
                                </span>
                              ) : null;
                            })()}
                          </p>
                        </div>
                      </div>
                      {isManager && selectedWork.handler_status === 'active' && (
                        <button 
                          onClick={() => handleCompleteHandler(selectedWork)}
                          className="px-4 py-2 bg-green-600 text-white rounded-xl font-bold text-xs flex items-center gap-1 hover:bg-green-700 transition-colors"
                        >
                          <CheckCircle2 size={14} /> منجز
                        </button>
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
                    
                    // ─── حفظ تاريخ جديد مع إشعارات ───
                    const handleSaveDate = async (date: string, justification?: string) => {
                      if (!date) return;
                      setIsSavingDeadline(true);
                      try {
                        // حفظ في قاعدة البيانات
                        const { error } = await supabase.from('project_works').update({ expected_completion_date: date }).eq('id', selectedWork.id);
                        if (error && !error.message?.includes('schema cache')) throw error;
                        
                        const dateStr = new Date(date).toLocaleDateString('ar-SA');
                        const projectName = project?.name || selectedWork.project_name || 'مشروع';
                        
                        // تسجيل كتعليق (يحفظ دائماً حتى لو الأعمدة غير موجودة)
                        const commentContent = justification 
                          ? `📅 تم تحديث تاريخ الإنجاز المتوقع إلى ${dateStr}\n📝 سبب التأخير: ${justification}`
                          : `📅 تم تسجيل تاريخ الإنجاز المتوقع: ${dateStr}`;
                        
                        await supabase.from('work_comments').insert({
                          work_id: selectedWork.id,
                          user_name: currentUser?.name || 'النظام',
                          content: commentContent
                        });
                        
                        // إرسال إشعارات
                        const handlerInfo = selectedWork.current_handler ? ` (لدى @${selectedWork.current_handler})` : '';
                        const notification = justification
                          ? `⚠️ تم تمديد موعد "${selectedWork.task_name}"${handlerInfo} إلى ${dateStr} — السبب: ${justification}`
                          : `📅 تم تحديد موعد إنجاز "${selectedWork.task_name}"${handlerInfo}: ${dateStr}`;
                        
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
                        {/* الحالة العادية: تعيين/تعديل تاريخ */}
                        {!showJustificationForm && (
                          <div className="bg-gray-50 p-4 rounded-2xl border">
                            <div className="flex items-center gap-3 mb-3">
                              <Calendar size={16} className="text-[#E95D22] flex-shrink-0" />
                              <label className="text-xs font-black text-gray-500">{hasDate ? 'تعديل تاريخ الإنجاز المتوقع:' : 'تحديد تاريخ الإنجاز المتوقع:'}</label>
                            </div>
                            <div className="flex items-center gap-2">
                              <input 
                                type="date" 
                                className="flex-1 p-2.5 bg-white border rounded-xl font-bold text-sm outline-none focus:border-[#E95D22]"
                                value={selectedWork.expected_completion_date || ''}
                                min={new Date().toISOString().split('T')[0]}
                                onChange={(e) => {
                                  if (isOverdueNow && hasDate) {
                                    // العمل متأخر — فتح نموذج التبرير
                                    setNewDeadlineDate(e.target.value);
                                    setShowJustificationForm(true);
                                  } else {
                                    // حفظ مباشر مع إشعارات
                                    handleSaveDate(e.target.value);
                                  }
                                }}
                              />
                              {isOverdueNow && hasDate && (
                                <button 
                                  onClick={() => { setShowJustificationForm(true); setNewDeadlineDate(''); }}
                                  className="px-4 py-2.5 bg-red-500 text-white rounded-xl font-black text-[10px] flex items-center gap-1 hover:bg-red-600 transition-colors"
                                >
                                  <FileWarning size={13} /> تبرير التأخير
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {/* نموذج تبرير التأخير */}
                        {showJustificationForm && (
                          <div className="bg-red-50/50 p-5 rounded-2xl border-2 border-red-200 space-y-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <FileWarning size={18} className="text-red-500" />
                                <h4 className="font-black text-sm text-red-700">تبرير التأخير وتحديث الموعد</h4>
                              </div>
                              <button onClick={() => { setShowJustificationForm(false); setJustificationText(''); setNewDeadlineDate(''); }}
                                className="text-gray-400 hover:text-gray-600 font-bold text-lg">
                                ✕
                              </button>
                            </div>
                            
                            <div className="bg-white p-3 rounded-xl border border-red-100">
                              <p className="text-[10px] text-red-500 font-black mb-1">الموعد السابق:</p>
                              <p className="font-bold text-sm text-red-700">{new Date(selectedWork.expected_completion_date!).toLocaleDateString('ar-SA')}</p>
                            </div>
                            
                            <div>
                              <label className="text-xs font-black text-gray-600 mb-1.5 block">📝 سبب التأخير <span className="text-red-500">*</span></label>
                              <textarea 
                                className="w-full p-3 bg-white border border-red-200 rounded-xl font-bold text-sm outline-none focus:border-red-400 resize-none"
                                rows={3}
                                placeholder="اكتب سبب التأخير..."
                                value={justificationText}
                                onChange={(e) => setJustificationText(e.target.value)}
                              />
                            </div>
                            
                            <div>
                              <label className="text-xs font-black text-gray-600 mb-1.5 block">📅 التاريخ الجديد المتوقع <span className="text-red-500">*</span></label>
                              <input 
                                type="date" 
                                className="w-full p-2.5 bg-white border border-red-200 rounded-xl font-bold text-sm outline-none focus:border-red-400"
                                value={newDeadlineDate}
                                min={new Date().toISOString().split('T')[0]}
                                onChange={(e) => setNewDeadlineDate(e.target.value)}
                              />
                            </div>
                            
                            <button 
                              onClick={() => {
                                if (!justificationText.trim()) { alert('يرجى كتابة سبب التأخير'); return; }
                                if (!newDeadlineDate) { alert('يرجى تحديد التاريخ الجديد'); return; }
                                handleSaveDate(newDeadlineDate, justificationText.trim());
                              }}
                              disabled={isSavingDeadline || !justificationText.trim() || !newDeadlineDate}
                              className="w-full py-3 bg-[#1B2B48] text-white rounded-xl font-black text-sm flex items-center justify-center gap-2 hover:bg-[#243a5e] transition-colors disabled:opacity-50"
                            >
                              {isSavingDeadline ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                              حفظ التبرير والتاريخ الجديد
                            </button>
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
                                    <span className="text-[9px] text-gray-400" dir="ltr">{new Date(c.created_at).toLocaleTimeString('ar-SA', {hour: '2-digit', minute:'2-digit'})}</span>
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
                        <button onClick={handleAddComment} disabled={!newComment.trim() || loadingComments} className="p-3 bg-[#1B2B48] text-white rounded-xl"><Send size={16}/></button>
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

  useEffect(() => {
    if (currentUser && !isAuthLoading && location.pathname === '/') {
      navigate(getDefaultPath(currentUser.role), { replace: true });
    }
  }, [currentUser, isAuthLoading, navigate, location.pathname]);

  if (isAuthLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="animate-spin text-[#1B2B48] opacity-20 w-12 h-12" />
        <p className="text-[#1B2B48]/30 font-bold text-sm">جاري تحميل البيانات...</p>
      </div>
    </div>
  );

  if (!currentUser) return <LoginPage />;

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
      
      {/* المحلل الذكي الاستباقي - لجميع الأدوار */}
      {['ADMIN', 'PR_MANAGER', 'TECHNICAL', 'CONVEYANCE'].includes(currentUser.role) && (
        <AIAssistant currentUser={currentUser} projects={projects} technicalRequests={technicalRequests} clearanceRequests={clearanceRequests} projectWorks={projectWorks} appUsers={appUsers} onNavigate={(type, data) => navigate(type === 'PROJECT' ? `/projects/${data?.id}` : type === 'TECHNICAL' ? '/technical' : '/deeds')} />
      )}
    </MainLayout>
  );
};

const App: React.FC = () => (
  <ErrorBoundary><AppContent /></ErrorBoundary>
);

export default App;
