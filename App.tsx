import React, { useState, useEffect, ReactNode, useMemo, useRef, Component } from 'react';
import { Routes, Route, useNavigate, useLocation, useParams, Navigate } from 'react-router';
import { 
  AlertTriangle, Loader2, Zap, Plus,
  Building2, Menu, MapPin, HardHat, FileStack, Trash2, Edit3,
  MessageSquare, Send, CheckCircle2, Clock, X, Info, Lock,
  ChevronLeft
} from 'lucide-react';
import { supabase } from './supabaseClient';
import { ProjectWork, TechnicalRequest, ClearanceRequest } from './types';
import { DAR_LOGO } from './constants';
import Modal from './components/Modal';
import ManageRequestModal from './components/ManageRequestModal';
import { useData } from './contexts/DataContext';
import MainLayout from './layouts/MainLayout';

// --- Components ---
import DashboardModule from './components/DashboardModule';
import TechnicalModule from './components/TechnicalModule';
import ProjectsModule from './components/ProjectsModule';
import DeedsDashboard from './components/DeedsDashboard';
import ProjectDetailView from './components/ProjectDetailView';
import UsersModule from './components/UsersModule';
import AIAssistant from './components/AIAssistant';

// --- Error Boundary ---
// Fix: Use React.Component with any for props and state to ensure compatibility across different compiler environments and resolve property access errors.
class ErrorBoundary extends React.Component<any, any> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: any) { return { hasError: true }; }
  
  render() {
    if (this.state.hasError) return (
      <div className="min-h-screen flex items-center justify-center text-red-500 font-bold bg-[#f8f9fa] p-10 text-center flex-col gap-4" dir="rtl">
        <AlertTriangle size={48} />
        <h2 className="text-2xl font-black text-[#1B2B48]">حدث خطأ في عرض الصفحة</h2>
        <p className="text-gray-400">تم رصد الخطأ وتأمينه برمجياً</p>
        <button onClick={() => window.location.reload()} className="bg-[#1B2B48] text-white px-8 py-3 rounded-2xl font-bold shadow-lg">تحديث الواجهة</button>
      </div>
    );
    return this.props.children;
  }
}

// --- Project Detail Wrapper ---
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
     } catch (err) {
       console.error("Fetch works error:", err);
     }
   };

   useEffect(() => { fetchWorks(); }, [id]);

   const fetchWorkComments = async (workId: number) => {
     setLoadingComments(true);
     try {
       const { data } = await supabase.from('work_comments').select('*').eq('work_id', workId).order('created_at', { ascending: true });
       setWorkComments(data || []);
       setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
     } catch (err) {
       console.error("Comments error:", err);
     } finally { setLoadingComments(false); }
   };

   const handleOpenWorkDetail = (work: ProjectWork) => {
     setSelectedWork(work);
     setIsWorkDetailOpen(true);
     fetchWorkComments(work.id);
   };

   const handleUpdateWorkStatus = async (status: 'completed' | 'in_progress') => {
     if (!selectedWork || !isManager) return;
     if (!window.confirm(`هل أنت متأكد من تغيير حالة العمل إلى ${status === 'completed' ? 'منجز' : 'قيد المتابعة'}؟`)) return;
     
     setIsActionLoading(true);
     try {
       const { error } = await supabase.from('project_works').update({ status }).eq('id', selectedWork.id);
       if (error) throw error;
       setSelectedWork({ ...selectedWork, status });
       logActivity?.('تحديث حالة عمل', `${selectedWork.task_name} -> ${status}`, 'text-blue-500');
       fetchWorks();
       refreshData();
     } catch (err: any) {
       alert("فشل التحديث: " + err.message);
     } finally { setIsActionLoading(false); }
   };

   const handleDeleteWork = async (workId: number, taskName: string) => {
     if (!isAdmin) return;
     if (!window.confirm(`هل أنت متأكد من حذف العمل "${taskName}" نهائياً؟`)) return;
     
     try {
       const { error } = await supabase.from('project_works').delete().eq('id', workId);
       if (error) throw error;
       logActivity?.('حذف عمل مشروع', taskName, 'text-orange-500');
       setIsWorkDetailOpen(false);
       fetchWorks();
       refreshData();
     } catch (err: any) {
       alert("خطأ أثناء الحذف: " + err.message);
     }
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
       setNewComment('');
       fetchWorkComments(selectedWork.id);
     } catch (err: any) {
       alert("خطأ: " + err.message);
     } finally { setLoadingComments(false); }
   };

   const handleAddWork = async () => {
       if (!newWorkForm.task_name || !project) return;
       const { error } = await supabase.from('project_works').insert({ ...newWorkForm, project_name: project.name, projectId: project.id, status: 'in_progress' });
       if (!error) { 
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
                  <p className="text-gray-400 text-xs font-bold mt-1">انقر على أي عمل لعرض التفاصيل والتعليقات</p>
                </div>
                {isManager && (
                  <button onClick={() => setIsAddWorkOpen(true)} className="bg-[#E95D22] text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg hover:brightness-110 active:scale-95 transition-all">
                    <Plus size={20}/> إضافة عمل
                  </button>
                )}
            </div>
            
            <div className="grid gap-4">
                {projectWorks.length === 0 ? (
                  <div className="p-10 text-center text-gray-400 border border-dashed rounded-2xl font-bold">لا توجد أعمال مسجلة لهذا المشروع</div>
                ) : (
                  projectWorks?.map(work => (
                      <div 
                        key={work.id} 
                        onClick={() => handleOpenWorkDetail(work)}
                        className="flex items-center justify-between p-5 bg-gray-50 rounded-2xl border border-transparent hover:border-[#E95D22]/30 hover:bg-white transition-all cursor-pointer group"
                      >
                          <div className="flex items-center gap-4">
                              <div className={`w-3 h-12 rounded-full transition-colors ${work.status === 'completed' ? 'bg-green-500' : 'bg-orange-500'}`}></div>
                              <div>
                                  <h3 className="font-bold text-[#1B2B48] group-hover:text-[#E95D22] transition-colors">{work.task_name}</h3>
                                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{work.authority || 'جهة غير محددة'}</p>
                              </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`px-4 py-2 rounded-xl font-black text-[10px] border ${work.status === 'completed' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-orange-50 text-orange-700 border-orange-100'}`}>
                              {work.status === 'completed' ? 'منجز ✅' : 'قيد المتابعة ⏳'}
                            </span>
                            <ChevronLeft className="text-gray-300 group-hover:text-[#E95D22] transition-colors" size={18} />
                          </div>
                      </div>
                  ))
                )}
            </div>
        </div>

        {/* إضافة عمل جديد */}
        <Modal isOpen={isAddWorkOpen} onClose={() => setIsAddWorkOpen(false)} title="إضافة عمل للمشروع">
            <div className="space-y-4 text-right">
                <div>
                  <label className="text-[10px] text-gray-400 font-bold mr-1">بيان العمل</label>
                  <input className="w-full p-4 bg-gray-50 rounded-2xl border outline-none font-bold text-sm focus:border-[#E95D22]" placeholder="مثال: استخراج شهادة إشغال" onChange={e => setNewWorkForm({...newWorkForm, task_name: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-gray-400 font-bold mr-1">جهة المراجعة</label>
                    <input className="w-full p-4 bg-gray-50 rounded-2xl border outline-none font-bold text-sm focus:border-[#E95D22]" placeholder="مثال: أمانة الرياض" onChange={e => setNewWorkForm({...newWorkForm, authority: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 font-bold mr-1">القسم الداخلي</label>
                    <input className="w-full p-4 bg-gray-50 rounded-2xl border outline-none font-bold text-sm focus:border-[#E95D22]" placeholder="مثال: الفني" onChange={e => setNewWorkForm({...newWorkForm, department: e.target.value})} />
                  </div>
                </div>
                <div>
                    <label className="text-[10px] text-gray-400 font-bold mr-1">ملاحظات إضافية</label>
                    <textarea className="w-full p-4 bg-gray-50 rounded-2xl border outline-none font-bold text-sm min-h-[100px] focus:border-[#E95D22]" placeholder="أي تفاصيل أخرى..." onChange={e => setNewWorkForm({...newWorkForm, notes: e.target.value})}></textarea>
                </div>
                <button onClick={handleAddWork} className="w-full bg-[#1B2B48] text-white py-4 rounded-2xl font-black shadow-lg hover:brightness-110 active:scale-95 transition-all">حفظ البيانات</button>
            </div>
        </Modal>

        {/* تفاصيل العمل والتعليقات */}
        {selectedWork && (
          <Modal isOpen={isWorkDetailOpen} onClose={() => setIsWorkDetailOpen(false)} title="تفاصيل عمل المشروع">
              <div className="space-y-6 text-right font-cairo">
                  <div className={`p-5 rounded-[25px] border ${selectedWork.status === 'completed' ? 'bg-green-50 border-green-100 text-green-700' : 'bg-orange-50 border-orange-100 text-orange-700'}`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-[10px] font-bold opacity-70 mb-1 uppercase tracking-widest">مسمى العمل</p>
                          <h3 className="text-xl font-black">{selectedWork.task_name}</h3>
                        </div>
                        <div className="bg-white/50 px-3 py-1.5 rounded-xl font-black text-xs">
                          {selectedWork.status === 'completed' ? 'منجز' : 'قيد المتابعة'}
                        </div>
                      </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                        <span className="text-[10px] text-gray-400 font-bold block mb-1">الجهة</span>
                        <span className="font-bold text-[#1B2B48]">{selectedWork.authority || '-'}</span>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                        <span className="text-[10px] text-gray-400 font-bold block mb-1">القسم</span>
                        <span className="font-bold text-[#1B2B48]">{selectedWork.department || '-'}</span>
                      </div>
                  </div>

                  {selectedWork.notes && (
                    <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
                      <p className="text-[10px] text-blue-400 font-bold mb-1 flex items-center gap-1"><Info size={12}/> وصف العمل</p>
                      <p className="text-sm font-bold text-gray-700 leading-relaxed">{selectedWork.notes}</p>
                    </div>
                  )}

                  {isManager ? (
                    <div className="flex gap-2">
                       {selectedWork.status !== 'completed' ? (
                         <button onClick={() => handleUpdateWorkStatus('completed')} disabled={isActionLoading} className="flex-1 bg-green-600 text-white py-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 hover:bg-green-700 transition-all">
                           {isActionLoading ? <Loader2 className="animate-spin" size={16}/> : <CheckCircle2 size={16}/>} اعتماد كمنجز
                         </button>
                       ) : (
                         <button onClick={() => handleUpdateWorkStatus('in_progress')} disabled={isActionLoading} className="flex-1 bg-orange-500 text-white py-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 hover:bg-orange-600 transition-all">
                           {isActionLoading ? <Loader2 className="animate-spin" size={16}/> : <Clock size={16}/>} إعادة للمتابعة
                         </button>
                       )}
                       {isAdmin && (
                         <button onClick={() => handleDeleteWork(selectedWork.id, selectedWork.task_name)} className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-all">
                           <Trash2 size={20}/>
                         </button>
                       )}
                    </div>
                  ) : (
                    <div className="bg-amber-50 p-3 rounded-xl border border-amber-100 text-amber-700 text-xs font-bold flex items-center gap-2">
                      <Lock size={14}/> لا تملك صلاحية تعديل حالة العمل.
                    </div>
                  )}

                  {/* سجل الملاحظات */}
                  <div className="border-t border-gray-100 pt-5">
                    <h4 className="font-black text-[#1B2B48] mb-4 flex items-center gap-2"><MessageSquare size={18} className="text-[#E95D22]"/> ملاحظات التنسيق</h4>
                    <div className="bg-gray-50 rounded-2xl p-4 h-56 overflow-y-auto space-y-3 mb-4 border border-gray-100 shadow-inner custom-scrollbar">
                        {loadingComments ? (
                           <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-gray-300"/></div>
                        ) : workComments.length === 0 ? (
                           <div className="h-full flex flex-col items-center justify-center text-gray-300 opacity-60">
                             <MessageSquare size={32} className="mb-2"/>
                             <p className="text-xs font-bold">لا توجد ملاحظات مسجلة</p>
                           </div>
                        ) : (
                          workComments?.map((c: any) => (
                            <div key={c.id} className={`p-3 rounded-xl shadow-sm max-w-[85%] ${c.user_name === currentUser?.name ? 'bg-blue-50 mr-auto border border-blue-100' : 'bg-white ml-auto border border-gray-100'}`}>
                                <div className="flex justify-between items-center mb-1 gap-4">
                                    <span className="font-black text-[10px] text-[#1B2B48]">{c.user_name}</span>
                                    <span className="text-[9px] text-gray-400" dir="ltr">{new Date(c.created_at).toLocaleTimeString('ar-SA', {hour:'2-digit', minute:'2-digit'})}</span>
                                </div>
                                <p className="text-xs text-gray-700 font-bold leading-relaxed">{c.content}</p>
                            </div>
                          ))
                        )}
                        <div ref={commentsEndRef} />
                    </div>

                    <div className="flex gap-2">
                        <input className="flex-1 p-3 bg-gray-50 border rounded-xl outline-none text-xs font-bold focus:border-[#E95D22] transition-all" placeholder="أضف ملاحظة جديدة..." value={newComment} onChange={e => setNewComment(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddComment()} />
                        <button onClick={handleAddComment} disabled={!newComment.trim() || loadingComments} className="p-3 bg-[#1B2B48] text-white rounded-xl hover:bg-[#E95D22] transition-all disabled:opacity-50"><Send size={16}/></button>
                    </div>
                  </div>
              </div>
          </Modal>
        )}
     </div>
   );
};

// --- App Content ---
const AppContent: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { 
    currentUser, isAuthLoading, login, logout,
    projects = [], technicalRequests = [], clearanceRequests = [], projectWorks = [], appUsers = [], activities = [], refreshData, logActivity 
  } = useData();

  const [loginData, setLoginData] = useState({ email: 'adaldawsari@darwaemaar.com', password: '' });

  // --- تجميع الإحصائيات المركزية (Aggregator Logic) ---
  const dashboardStats = useMemo(() => {
    // 1. تجميع كل المهام من الجداول الثلاثة
    const allTasks = [
      ...(projectWorks || []),
      ...(technicalRequests || []),
      ...(clearanceRequests || [])
    ];

    // 2. تصفية المنجز
    const completed = allTasks.filter(item => 
      item?.status === 'منجز' || 
      item?.status === 'completed' || 
      item?.status === 'مكتمل'
    ).length;

    // 3. حساب الإحصائيات
    const totalTasks = allTasks.length;
    const pending = totalTasks - completed;

    return {
        completedCount: completed,
        pendingCount: pending,
        totalDeeds: clearanceRequests?.length || 0,
        activeProjects: projects?.length || 0,
        progressPercent: totalTasks > 0 ? Math.round((completed / totalTasks) * 100) : 0
    };
  }, [projectWorks, technicalRequests, clearanceRequests, projects]);

  // حماية التوجيه التلقائي للأدوار المقيدة
  useEffect(() => {
    if (currentUser && !isAuthLoading) {
      if (currentUser.role === 'CONVEYANCE' && location.pathname !== '/deeds') {
        navigate('/deeds', { replace: true });
      } else if (currentUser.role === 'TECHNICAL' && location.pathname !== '/technical') {
        navigate('/technical', { replace: true });
      }
    }
  }, [currentUser, isAuthLoading, location.pathname, navigate]);

  if (isAuthLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 flex-col gap-4">
      <Loader2 className="animate-spin text-[#E95D22] w-12 h-12" />
      <p className="font-bold text-[#1B2B48]">جاري التحقق من الهوية...</p>
    </div>
  );

  if (!currentUser) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 font-cairo" dir="rtl">
      <div className="bg-[#1B2B48] w-full max-w-md rounded-[50px] shadow-2xl overflow-hidden border border-gray-100">
        <div className="p-12 text-center"><img src={DAR_LOGO} className="h-40 mx-auto mb-6" alt="Logo" /><h1 className="text-white text-3xl font-bold">بوابة المتابعة</h1></div>
        <form onSubmit={(e) => { e.preventDefault(); login(loginData.email, loginData.password); }} className="p-10 bg-white space-y-6 rounded-t-[50px]">
          <input type="email" required placeholder="البريد الإلكتروني" className="w-full p-4 bg-gray-50 rounded-2xl border outline-none font-bold" value={loginData.email} onChange={e => setLoginData({...loginData, email: e.target.value})} />
          <input type="password" required placeholder="كلمة السر" className="w-full p-4 bg-gray-50 rounded-2xl border outline-none font-bold" value={loginData.password} onChange={e => setLoginData({...loginData, password: e.target.value})} />
          <button type="submit" className="w-full bg-[#E95D22] text-white py-5 rounded-[30px] font-bold text-xl hover:brightness-110 shadow-lg">دخول النظام</button>
        </form>
      </div>
    </div>
  );

  const role = currentUser.role;

  return (
    <MainLayout>
      <Routes>
        {/* Dashboard Guard */}
        <Route path="/" element={
          (role === 'CONVEYANCE') ? <Navigate to="/deeds" replace /> :
          (role === 'TECHNICAL') ? <Navigate to="/technical" replace /> :
          <DashboardModule 
            stats={dashboardStats}
            projects={projects} 
            techRequests={technicalRequests} 
            projectWorks={projectWorks} 
            clearanceRequests={clearanceRequests} 
            activities={activities} 
            currentUser={currentUser} 
            users={appUsers} 
            onQuickAction={() => {}} 
            onUpdateStatus={() => {}} 
          />
        } />

        {/* Projects Guard */}
        <Route path="/projects" element={
          (role === 'ADMIN' || role === 'PR_MANAGER' || role === 'PR_OFFICER') 
          ? <ProjectsModule projects={projects} stats={{ projects: projects.length, techRequests: technicalRequests.length, clearRequests: clearanceRequests.length }} currentUser={currentUser} onProjectClick={(p) => navigate(`/projects/${p?.id}`)} onRefresh={refreshData} />
          : <Navigate to="/" replace />
        } />

        <Route path="/projects/:id" element={
          (role === 'ADMIN' || role === 'PR_MANAGER' || role === 'PR_OFFICER')
          ? <ProjectDetailWrapper projects={projects} onRefresh={refreshData} currentUser={currentUser} />
          : <Navigate to="/" replace />
        } />

        {/* Technical Guard */}
        <Route path="/technical" element={
          (role === 'ADMIN' || role === 'PR_MANAGER' || role === 'TECHNICAL' || role === 'PR_OFFICER')
          ? <TechnicalModule requests={technicalRequests} projects={projects} currentUser={currentUser} usersList={appUsers} onRefresh={refreshData} logActivity={logActivity} />
          : <Navigate to="/" replace />
        } />

        {/* Deeds Guard */}
        <Route path="/deeds" element={
          (role === 'ADMIN' || role === 'PR_MANAGER' || role === 'DEEDS_OFFICER' || role === 'CONVEYANCE')
          ? <DeedsDashboard currentUserRole={currentUser.role} currentUserName={currentUser.name} logActivity={logActivity} />
          : <Navigate to="/" replace />
        } />

        {/* Users Guard (Admin Only) */}
        <Route path="/users" element={ (role === 'ADMIN') ? <UsersModule /> : <Navigate to="/" replace /> } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      
      {/* 
          تفعيل المساعد الذكي مع تمرير كافة البيانات اللازمة للربط
          يتم تفعيله فقط للأدوار القيادية كما هو محدد في AIAssistant 
      */}
      {['ADMIN', 'PR_MANAGER'].includes(currentUser?.role || '') && (
        <AIAssistant 
          currentUser={currentUser}
          projects={projects}
          technicalRequests={technicalRequests}
          clearanceRequests={clearanceRequests}
          projectWorks={projectWorks}
          onNavigate={(type, data) => navigate(type === 'PROJECT' ? `/projects/${data.id}` : '/deeds')}
        />
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