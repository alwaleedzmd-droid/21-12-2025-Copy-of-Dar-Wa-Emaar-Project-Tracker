
import React from 'react';
import { Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom';
import { Loader2, AlertTriangle } from 'lucide-react';
import { useData } from './contexts/DataContext';

// Layout & Modules
import MainLayout from './layouts/MainLayout';
import DashboardModule from './components/DashboardModule';
import TechnicalModule from './components/TechnicalModule';
import ProjectsModule from './components/ProjectsModule';
import DeedsDashboard from './components/DeedsDashboard';
import ProjectDetailView from './components/ProjectDetailView';

const ErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hasError, setHasError] = React.useState(false);
  React.useEffect(() => {
    const handleError = (error: ErrorEvent) => {
      console.error("App Crash:", error);
      setHasError(true);
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (hasError) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8f9fa] p-10 text-center" dir="rtl">
      <div className="w-24 h-24 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6 shadow-sm border border-red-100">
        <AlertTriangle size={48} />
      </div>
      <h2 className="text-3xl font-black text-[#1B2B48] mb-4">حدث خطأ في استرداد الصفحة</h2>
      <p className="text-gray-500 font-bold mb-8 max-w-md leading-relaxed">تحدث هذه المشكلة عادةً عند وجود تعارض في مسارات النظام أو فشل في تحميل البيانات الأساسية.</p>
      <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="bg-[#1B2B48] text-white px-10 py-4 rounded-2xl font-black shadow-xl hover:scale-105 transition-all active:scale-95">تحديث النظام بالكامل</button>
    </div>
  );
  return <>{children}</>;
};

const ProjectDetailWrapper = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { projects, refreshData, currentUser } = useData();
  
  const project = projects.find(p => p.id === Number(id));

  if (!project) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-20 text-center">
      <div className="relative mb-6">
        <Loader2 className="animate-spin text-[#E95D22] w-16 h-16" />
        <div className="absolute inset-0 flex items-center justify-center">
           <div className="w-2 h-2 bg-[#1B2B48] rounded-full"></div>
        </div>
      </div>
      <p className="font-black text-[#1B2B48] text-lg">جاري استرداد بيانات المشروع {id}...</p>
      <p className="text-gray-400 text-sm font-bold mt-2">يرجى الانتظار قليلاً</p>
    </div>
  );

  return (
    <ProjectDetailView 
      project={project} 
      isAdmin={currentUser?.role === 'ADMIN'} 
      onBack={() => navigate('/projects')} 
      onRefresh={refreshData} 
    />
  );
};

const AppContent: React.FC = () => {
  const { 
    currentUser, isAuthLoading, login, 
    projects, technicalRequests, clearanceRequests, appUsers, activities, refreshData, logActivity 
  } = useData();
  
  const navigate = useNavigate();
  const [loginData, setLoginData] = React.useState({ email: 'adaldawsari@darwaemaar.com', password: '' });

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f9fa]">
        <div className="flex flex-col items-center gap-4">
            <Loader2 className="animate-spin text-[#E95D22] w-12 h-12" />
            <p className="font-black text-[#1B2B48] animate-pulse">جاري التحقق من الهوية...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 font-cairo" dir="rtl">
        <div className="bg-[#1B2B48] w-full max-w-md rounded-[50px] shadow-2xl overflow-hidden border border-gray-100">
          <div className="p-12 text-center">
            <h1 className="text-white text-3xl font-black tracking-tighter">بوابة المتابعة</h1>
            <div className="w-20 h-1 bg-[#E95D22] mx-auto mt-4 rounded-full"></div>
            <p className="text-gray-400 text-[10px] font-black mt-4 uppercase tracking-widest leading-relaxed">دار وإعمار للتطوير العقاري<br/>نظام الإشراف المركزي</p>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); login(loginData.email, loginData.password); }} className="p-10 bg-white space-y-6 rounded-t-[50px]">
            <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 mr-2 uppercase">البريد الإلكتروني</label>
                <input type="email" required placeholder="example@darwaemaar.com" className="w-full p-4 bg-gray-50 rounded-2xl border border-transparent focus:border-[#1B2B48] outline-none font-bold transition-all" value={loginData.email} onChange={e => setLoginData({...loginData, email: e.target.value})} />
            </div>
            <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 mr-2 uppercase">كلمة السر</label>
                <input type="password" required placeholder="••••••••" className="w-full p-4 bg-gray-50 rounded-2xl border border-transparent focus:border-[#1B2B48] outline-none font-bold transition-all" value={loginData.password} onChange={e => setLoginData({...loginData, password: e.target.value})} />
            </div>
            <button type="submit" className="w-full bg-[#E95D22] text-white py-5 rounded-[30px] font-black text-xl hover:brightness-110 shadow-2xl shadow-orange-200 transition-all active:scale-95">دخول النظام</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <MainLayout>
      <Routes>
        <Route path="/" element={
          <DashboardModule 
            projects={projects}
            techRequests={technicalRequests}
            clearanceRequests={clearanceRequests}
            activities={activities}
            currentUser={currentUser}
            users={appUsers}
            onQuickAction={() => {}}
            onUpdateStatus={() => {}}
          />
        } />
        <Route path="/projects" element={
          <ProjectsModule 
            projects={projects}
            stats={{ projects: projects.length, techRequests: technicalRequests.length, clearRequests: clearanceRequests.length }}
            currentUser={currentUser}
            onProjectClick={(p) => navigate(`/projects/${p?.id}`)}
            onRefresh={refreshData}
          />
        } />
        <Route path="/projects/:id" element={<ProjectDetailWrapper />} />
        <Route path="/technical" element={
          <TechnicalModule 
            requests={technicalRequests} 
            projects={projects} 
            currentUser={currentUser} 
            usersList={appUsers} 
            onRefresh={refreshData} 
            logActivity={logActivity} 
          />
        } />
        <Route path="/deeds" element={
          <DeedsDashboard 
            currentUserRole={currentUser.role} 
            currentUserName={currentUser.name} 
            logActivity={logActivity} 
          />
        } />
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
