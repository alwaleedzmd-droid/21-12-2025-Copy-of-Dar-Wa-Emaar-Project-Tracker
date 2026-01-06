
import React, { useState, useEffect, ReactNode, useMemo } from 'react';
// استخدام react-router بدلاً من react-router-dom لضمان توفر المكونات والخطافات
import { Routes, Route, useNavigate, useLocation, useParams, Navigate } from 'react-router';
import { 
  AlertTriangle, Loader2, Zap, Plus,
  Building2, Menu, MapPin, HardHat, FileStack, Trash2, Edit3
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

// --- Error Boundary ---
class ErrorBoundary extends React.Component<{ children: ReactNode }, { hasError: boolean }> {
  public state = { hasError: false };
  static getDerivedStateFromError(_: any) { return { hasError: true }; }
  render() {
    if (this.state.hasError) return (
      <div className="min-h-screen flex items-center justify-center text-red-500 font-bold bg-[#f8f9fa] p-10 text-center flex-col gap-4" dir="rtl">
        <AlertTriangle size={48} />
        <h2 className="text-2xl font-black text-[#1B2B48]">حدث خطأ في عرض الصفحة</h2>
        <button onClick={() => window.location.hash = '/'} className="bg-[#1B2B48] text-white px-8 py-3 rounded-2xl font-bold">العودة للرئيسية</button>
      </div>
    );
    return this.props.children;
  }
}

// --- Project Detail Wrapper ---
const ProjectDetailWrapper = ({ projects = [], currentUser }: any) => {
   const { id } = useParams();
   const navigate = useNavigate();
   const { technicalRequests = [], refreshData, logActivity } = useData();
   
   const [isAddWorkOpen, setIsAddWorkOpen] = useState(false);
   const [isEditWorkOpen, setIsEditWorkOpen] = useState(false);
   const [projectWorks, setProjectWorks] = useState<ProjectWork[]>([]);
   const [newWorkForm, setNewWorkForm] = useState({ task_name: '', authority: '', department: '', notes: '' });
   const [editingWork, setEditingWork] = useState<ProjectWork | null>(null);

   const project = useMemo(() => projects.find((p: any) => p.id === Number(id)), [projects, id]);
   const isAdmin = currentUser?.role === 'ADMIN';

   useEffect(() => {
     const fetchWorks = async () => {
       if (!id) return;
       const { data } = await supabase.from('project_works').select('*').eq('projectId', Number(id)).order('created_at', { ascending: false });
       setProjectWorks(data || []);
     };
     fetchWorks();
   }, [id]);

   const handleAddWork = async () => {
       if (!newWorkForm.task_name || !project) return;
       const { error } = await supabase.from('project_works').insert({ ...newWorkForm, project_name: project.name, projectId: project.id, status: 'in_progress' });
       if (!error) { setIsAddWorkOpen(false); refreshData(); }
   };

   if (!project) return <div className="p-20 text-center font-bold text-gray-400">جاري التحميل...</div>;

   return (
     <div className="space-y-8 animate-in fade-in">
        <ProjectDetailView project={project} isAdmin={isAdmin} onBack={() => navigate('/projects')} onRefresh={refreshData} />
        <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-black text-[#1B2B48]">سجل أعمال المشروع</h2>
                <button onClick={() => setIsAddWorkOpen(true)} className="bg-[#E95D22] text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2"><Plus size={20}/> إضافة عمل</button>
            </div>
            <div className="grid gap-4">
                {projectWorks.map(work => (
                    <div key={work.id} className="flex items-center justify-between p-5 bg-gray-50 rounded-2xl border border-gray-100">
                        <div className="flex items-center gap-4">
                            <div className={`w-3 h-12 rounded-full ${work.status === 'completed' ? 'bg-green-500' : 'bg-orange-500'}`}></div>
                            <div>
                                <h3 className="font-bold text-[#1B2B48]">{work.task_name}</h3>
                                <p className="text-xs text-gray-500">{work.authority}</p>
                            </div>
                        </div>
                        <span className="px-4 py-2 rounded-xl font-bold text-sm bg-white border">{work.status === 'completed' ? 'منجز ✅' : 'قيد المتابعة ⏳'}</span>
                    </div>
                ))}
            </div>
        </div>
        <Modal isOpen={isAddWorkOpen} onClose={() => setIsAddWorkOpen(false)} title="إضافة عمل للمشروع">
            <div className="space-y-4 text-right">
                <input className="w-full p-4 bg-gray-50 rounded-2xl border outline-none font-bold" placeholder="اسم العمل" onChange={e => setNewWorkForm({...newWorkForm, task_name: e.target.value})} />
                <button onClick={handleAddWork} className="w-full bg-[#1B2B48] text-white py-4 rounded-2xl font-black">حفظ</button>
            </div>
        </Modal>
     </div>
   );
};

// --- App Content ---
const AppContent: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { 
    currentUser, isAuthLoading, login, logout,
    projects = [], technicalRequests = [], clearanceRequests = [], appUsers = [], activities = [], refreshData, logActivity 
  } = useData();

  const [loginData, setLoginData] = useState({ email: 'adaldawsari@darwaemaar.com', password: '' });

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
          <button type="submit" className="w-full bg-[#E95D22] text-white py-5 rounded-[30px] font-bold text-xl">دخول النظام</button>
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
          <DashboardModule projects={projects} techRequests={technicalRequests} projectWorks={[]} clearanceRequests={clearanceRequests} activities={activities} currentUser={currentUser} users={appUsers} onQuickAction={() => {}} onUpdateStatus={() => {}} />
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
    </MainLayout>
  );
};

const App: React.FC = () => (
  <ErrorBoundary>
    <AppContent />
  </ErrorBoundary>
);

export default App;