
import React, { Component, useState, useEffect, useMemo, useRef } from 'react';
import { Routes, Route, useNavigate, useLocation, useParams, Navigate } from 'react-router-dom';
import { 
  AlertTriangle, Loader2, Plus, 
  CheckCircle2, Clock, Info, Lock,
  ChevronLeft, ShieldAlert,
  MessageSquare, Send 
} from 'lucide-react';
import { supabase } from './supabaseClient';
import { ProjectWork, UserRole } from './types';
import { DAR_LOGO } from './constants';
import Modal from './components/Modal';
import { useData } from './contexts/DataContext';
import { notificationService } from './services/notificationService';
import MainLayout from './layouts/MainLayout';

// --- Components ---
import DashboardModule from './components/DashboardModule';
import TechnicalModule from './components/TechnicalModule';
import ProjectsModule from './components/ProjectsModule';
import DeedsDashboard from './components/DeedsDashboard';
import ProjectDetailView from './components/ProjectDetailView';
import UsersModule from './components/UsersModule';
import AIAssistant from './components/AIAssistant';
import AppMapDashboard from './components/AppMapDashboard';

interface ErrorBoundaryProps {
  children?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(_: any): ErrorBoundaryState {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) return (
      <div className="min-h-screen flex items-center justify-center text-red-500 font-bold bg-[#f8f9fa] p-10 text-center flex-col gap-4" dir="rtl">
        <AlertTriangle size={48} />
        <h2 className="text-2xl font-black text-[#1B2B48]">حدث خطأ في عرض الصفحة</h2>
        <button onClick={() => window.location.reload()} className="bg-[#1B2B48] text-white px-8 py-3 rounded-2xl font-bold shadow-lg">تحديث الواجهة</button>
      </div>
    );
    return this.props.children;
  }
}

const ProjectDetailWrapper = ({ projects = [], currentUser }: any) => {
   const { id } = useParams();
   const navigate = useNavigate();
   const { refreshData, logActivity } = useData();
   
   const [isAddWorkOpen, setIsAddWorkOpen] = useState(false);
   const [isWorkDetailOpen, setIsWorkDetailOpen] = useState(false);
   const [selectedWork, setSelectedWork] = useState<ProjectWork | null>(null);
   const [projectWorks, setProjectWorks] = useState<ProjectWork[]>([]);
   const [workComments, setWorkComments] = useState<any[]>([]);
   const [newComment, setNewComment] = useState('');
   const [loadingComments, setLoadingComments] = useState(false);
   const [isActionLoading, setIsActionLoading] = useState(false);
   
   const [newWorkForm, setNewWorkForm] = useState({ task_name: '', authority: '', department: '', notes: '' });
   const commentsEndRef = useRef<HTMLDivElement>(null);

   const project = useMemo(() => projects.find((p: any) => p.id === Number(id)), [projects, id]);
   const isManager = ['ADMIN', 'PR_MANAGER'].includes(currentUser?.role || '');
   const isAdmin = currentUser?.role === 'ADMIN';

   const fetchWorks = async () => {
     if (!id) return;
     try {
       const { data } = await supabase.from('project_works').select('*').eq('projectId', Number(id)).order('created_at', { ascending: false });
       setProjectWorks(data || []);
     } catch (err) { console.error("Fetch works error:", err); }
   };

   useEffect(() => { fetchWorks(); }, [id]);

   const fetchWorkComments = async (workId: number) => {
     setLoadingComments(true);
     try {
       const { data } = await supabase.from('work_comments').select('*').eq('work_id', workId).order('created_at', { ascending: true });
       setWorkComments(data || []);
       setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
     } catch (err) { console.error("Comments error:", err); } finally { setLoadingComments(false); }
   };

   const handleOpenWorkDetail = (work: ProjectWork) => {
     setSelectedWork(work);
     setIsWorkDetailOpen(true);
     fetchWorkComments(work.id);
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
       fetchWorks();
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
       fetchWorks();
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
       
       notificationService.send('PR_MANAGER', `💬 ملاحظة جديدة في ${selectedWork.task_name}`, `/projects/${id}`, currentUser?.name);

       setNewComment('');
       fetchWorkComments(selectedWork.id);
     } catch (err: any) { alert("خطأ: " + err.message); } finally { setLoadingComments(false); }
   };

   const handleAddWork = async () => {
       if (!newWorkForm.task_name || !project) return;
       const { error } = await supabase.from('project_works').insert({ ...newWorkForm, project_name: project.name, projectId: project.id, status: 'in_progress' });
       if (!error) { 
         notificationService.send('PR_MANAGER', `🆕 تم تسجيل عمل جديد بمشروع ${project.name}`, `/projects/${id}`, currentUser?.name);
         
         setIsAddWorkOpen(false); 
         setNewWorkForm({ task_name: '', authority: '', department: '', notes: '' });
         fetchWorks();
         refreshData(); 
       }
   };

   if (!project) return <div className="p-20 text-center font-bold text-gray-400">جاري تحميل بيانات المشروع...</div>;

   return (
     <div className="space-y-8 animate-in fade-in">
        <ProjectDetailView project={project} isAdmin={isAdmin} onBack={() => navigate('/projects')} onRefresh={refreshData} />
        <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-black text-[#1B2B48]">سجل أعمال المشروع</h2>
                  <p className="text-gray-400 text-xs font-bold mt-1">انقر لعرض التفاصيل والتعليقات</p>
                </div>
                {isManager && (
                  <button onClick={() => setIsAddWorkOpen(true)} className="bg-[#E95D22] text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg hover:brightness-110 active:scale-95 transition-all">
                    <Plus size={20}/> إضافة عمل
                  </button>
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
                                <p className="text-xs text-gray-700 font-bold leading-relaxed">{c.content}</p>
                            </div>
                          ))
                        }
                        <div ref={commentsEndRef} />
                    </div>
                    <div className="flex gap-2">
                        <input className="flex-1 p-3 bg-gray-50 border rounded-xl outline-none text-xs font-bold" placeholder="أضف تعليق..." value={newComment} onChange={e => setNewComment(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddComment()} />
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
    currentUser, isAuthLoading, login, logout,
    projects = [], technicalRequests = [], clearanceRequests = [], projectWorks = [], appUsers = [], activities = [], refreshData, logActivity 
  } = useData();

  const [loginData, setLoginData] = useState({ email: 'adaldawsari@darwaemaar.com', password: '' });
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const dashboardStats = useMemo(() => {
    const allTasks = [...(projectWorks || []), ...(technicalRequests || []), ...(clearanceRequests || [])];
    const completed = allTasks.filter(item => item?.status === 'منجز' || item?.status === 'completed' || item?.status === 'مكتمل').length;
    const totalTasks = allTasks.length;
    return {
        completedCount: completed,
        pendingCount: totalTasks - completed,
        totalDeeds: clearanceRequests?.length || 0,
        activeProjects: projects?.length || 0,
        progressPercent: totalTasks > 0 ? Math.round((completed / totalTasks) * 100) : 0
    };
  }, [projectWorks, technicalRequests, clearanceRequests, projects]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsLoggingIn(true);
    
    try {
      await login(loginData.email, loginData.password);
    } catch (err: any) {
      if (err.message?.includes('Invalid login credentials')) {
        setLoginError("خطأ في البريد الإلكتروني أو كلمة المرور");
      } else {
        setLoginError(err.message || "حدث خطأ أثناء تسجيل الدخول");
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (isAuthLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 flex-col gap-4">
      <Loader2 className="animate-spin text-[#E95D22] w-12 h-12" />
      <p className="font-bold text-[#1B2B48] animate-pulse" dir="rtl">جاري التحقق من الهوية...</p>
    </div>
  );

  if (!currentUser) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 font-cairo" dir="rtl">
      <div className="bg-[#1B2B48] w-full max-w-md rounded-[50px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="p-12 text-center">
          <img src={DAR_LOGO} className="h-32 mx-auto mb-6" alt="Logo" />
          <h1 className="text-white text-3xl font-black tracking-tight">بوابة المتابعة</h1>
          <p className="text-blue-200/60 text-xs mt-2 font-bold uppercase tracking-widest">نظام إدارة المشاريع المركزي</p>
        </div>
        <form onSubmit={handleAuthSubmit} className="p-10 bg-white space-y-6 rounded-t-[50px] shadow-inner">
          {loginError && (
            <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center gap-3 text-red-600 text-xs font-bold animate-in slide-in-from-top-2">
              <ShieldAlert className="shrink-0" size={18} />
              <p>{loginError}</p>
            </div>
          )}
          <div className="space-y-2">
            <label className="text-[10px] text-gray-400 font-black mr-2 uppercase tracking-widest">البريد الإلكتروني</label>
            <input type="email" required placeholder="example@darwaemaar.com" className="w-full p-4 bg-gray-50 rounded-2xl border border-transparent focus:border-[#E95D22] outline-none font-bold transition-all" value={loginData.email} onChange={e => setLoginData({...loginData, email: e.target.value})} />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] text-gray-400 font-black mr-2 uppercase tracking-widest">كلمة المرور</label>
            <input type="password" required placeholder="••••••••" className="w-full p-4 bg-gray-50 rounded-2xl border border-transparent focus:border-[#E95D22] outline-none font-bold transition-all" value={loginData.password} onChange={e => setLoginData({...loginData, password: e.target.value})} />
          </div>
          <button type="submit" disabled={isLoggingIn} className="w-full bg-[#E95D22] text-white py-5 rounded-[30px] font-black text-xl hover:brightness-110 active:scale-95 shadow-lg transition-all flex items-center justify-center gap-3">
            {isLoggingIn ? <Loader2 className="animate-spin" size={24} /> : 'تسجيل الدخول'}
          </button>
          <div className="text-center pt-4">
            <p className="text-[10px] text-gray-300 font-bold">حقوق الطبع محفوظة لشركة دار وإعمار العقارية © {new Date().getFullYear()}</p>
          </div>
        </form>
      </div>
    </div>
  );

  const role = currentUser.role;

  return (
    <MainLayout>
      <Routes>
        {/* التوجيه الأساسي عند الدخول للرابط الجذري */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* مسار لوحة التحكم الرئيسية - خريطة النظام */}
        <Route path="/dashboard" element={
          <AppMapDashboard currentUser={currentUser} onLogout={logout} />
        } />
        
        {/* مسارات المشاريع */}
        <Route path="/projects" element={(role === 'ADMIN' || role === 'PR_MANAGER' || role === 'PR_OFFICER') ? <ProjectsModule projects={projects} stats={{ projects: projects.length, techRequests: technicalRequests.length, clearRequests: clearanceRequests.length }} currentUser={currentUser} onProjectClick={(p) => navigate(`/projects/${p?.id}`)} onRefresh={refreshData} /> : <Navigate to="/dashboard" replace />} />
        <Route path="/projects/:id" element={(role === 'ADMIN' || role === 'PR_MANAGER' || role === 'PR_OFFICER') ? <ProjectDetailWrapper projects={projects} onRefresh={refreshData} currentUser={currentUser} /> : <Navigate to="/dashboard" replace />} />
        
        {/* مسارات الخدمات الفنية والإفراغات */}
        <Route path="/technical" element={(role === 'ADMIN' || role === 'PR_MANAGER' || role === 'TECHNICAL' || role === 'PR_OFFICER') ? <TechnicalModule requests={technicalRequests} projects={projects} currentUser={currentUser} usersList={appUsers} onRefresh={refreshData} logActivity={logActivity} /> : <Navigate to="/dashboard" replace />} />
        <Route path="/deeds" element={(role === 'ADMIN' || role === 'PR_MANAGER' || role === 'DEEDS_OFFICER' || role === 'CONVEYANCE') ? <DeedsDashboard currentUserRole={currentUser.role} currentUserName={currentUser.name} logActivity={logActivity} /> : <Navigate to="/dashboard" replace />} />
        
        {/* إدارة المستخدمين */}
        <Route path="/users" element={ (role === 'ADMIN') ? <UsersModule /> : <Navigate to="/dashboard" replace /> } />
        
        {/* أي مسار غير مطابق يتم تحويله للوحة التحكم */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
      
      {['ADMIN', 'PR_MANAGER'].includes(currentUser?.role || '') && (
        <AIAssistant currentUser={currentUser} projects={projects} technicalRequests={technicalRequests} clearanceRequests={clearanceRequests} projectWorks={projectWorks} onNavigate={(type, data) => navigate(type === 'PROJECT' ? `/projects/${data.id}` : '/deeds')} />
      )}
    </MainLayout>
  );
};

const App: React.FC = () => (
  <ErrorBoundary>
    <AppContent />
  </ErrorBoundary>
);

export default App;
