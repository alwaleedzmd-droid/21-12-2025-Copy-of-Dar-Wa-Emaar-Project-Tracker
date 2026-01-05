
import React, { useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import { 
  LayoutDashboard, Users, FileText, LogOut, 
  Plus, ArrowLeft, Loader2, Zap, Droplets, 
  CheckCircle2, RefreshCw, FileUp,
  Edit3, Building2,
  Briefcase, User as UserIcon, ShieldCheck, 
  Search, FileStack, CheckCircle, Clock, ChevronDown, ChevronUp, X, LayoutList, Printer,
  Calendar, Hash, Phone, MapPin, CreditCard, UserCheck, AlertTriangle, WifiOff,
  ClipboardList, Ruler, Map as MapIcon 
} from 'lucide-react';
import { supabase } from './supabaseClient';
import * as XLSX from 'xlsx';
import { 
  ProjectSummary, User, ViewState, 
  TechnicalRequest, ClearanceRequest
} from './types';
import { 
  DAR_LOGO
} from './constants';
import Modal from './components/Modal';

// Components
import ClearanceModule from './components/ClearanceModule';
import TechnicalModule from './components/TechnicalModule';
import ProjectsModule from './components/ProjectsModule';
import DeedsDashboard from './components/DeedsDashboard';
import AIAssistant from './components/AIAssistant';
import AppMapDashboard from './components/AppMapDashboard';
import DashboardModule from './components/DashboardModule';

export interface ActivityLog {
  id: string;
  user: string;
  action: string;
  target: string;
  timestamp: Date;
  color: 'text-blue-500' | 'text-orange-500' | 'text-green-500';
}

const STORAGE_KEYS = {
    SIDEBAR_COLLAPSED: 'dar_sidebar_v2_collapsed',
    USER_CACHE: 'dar_user_v2_cache'
};

const safeStorage = {
  getItem: (key: string): string | null => { try { return localStorage.getItem(key); } catch { return null; } },
  setItem: (key: string, value: string): void => { try { localStorage.setItem(key, value); } catch {} },
  removeItem: (key: string): void => { try { localStorage.removeItem(key); } catch {} }
};

class ErrorBoundary extends React.Component<{ children: ReactNode }, { hasError: boolean }> {
  public state = { hasError: false };
  static getDerivedStateFromError(_: any) { return { hasError: true }; }
  render() {
    if (this.state.hasError) return (
      <div className="min-h-screen flex items-center justify-center text-red-500 font-bold bg-white p-10 text-center flex-col gap-4">
        <AlertTriangle size={48} />
        <h2 className="text-2xl font-black text-[#1B2B48]">حدث خطأ غير متوقع</h2>
        <button onClick={() => window.location.reload()} className="bg-[#1B2B48] text-white px-8 py-3 rounded-2xl font-bold transition-all hover:bg-[#2a3f63]">تحديث الصفحة</button>
      </div>
    );
    return this.props.children;
  }
}

const AppContent: React.FC = () => {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [technicalRequests, setTechnicalRequests] = useState<TechnicalRequest[]>([]);
  const [clearanceRequests, setClearanceRequests] = useState<ClearanceRequest[]>([]);
  const [deedsRequests, setDeedsRequests] = useState<any[]>([]);
  const [deedsRequestsCount, setDeedsRequestsCount] = useState(0);
  const [appUsers, setAppUsers] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  
  const [isDbLoading, setIsDbLoading] = useState(true);
  const [errorState, setErrorState] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => safeStorage.getItem(STORAGE_KEYS.SIDEBAR_COLLAPSED) === 'true');
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const cached = safeStorage.getItem(STORAGE_KEYS.USER_CACHE);
    return cached ? JSON.parse(cached) : null;
  });

  const [view, setView] = useState<ViewState>('LOGIN');
  const [selectedProject, setSelectedProject] = useState<ProjectSummary | null>(null);
  const [projectTab, setProjectTab] = useState<'info' | 'work' | 'tech' | 'clearance'>('info');
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [loginData, setLoginData] = useState({ email: 'adaldawsari@darwaemaar.com', password: '' });

  const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false);

  // Centralized Activity Logger
  const logActivity = useCallback((action: string, target: string, color: ActivityLog['color'] = 'text-blue-500') => {
    const newLog: ActivityLog = {
      id: Math.random().toString(36).substr(2, 9),
      user: currentUser?.name || 'مستخدم النظام',
      action,
      target,
      timestamp: new Date(),
      color
    };
    setActivities(prev => [newLog, ...prev].slice(0, 50));
  }, [currentUser]);

  const stats = useMemo(() => ({
    projects: projects.length,
    techRequests: technicalRequests.filter(r => r.scope !== 'INTERNAL_WORK').length,
    clearRequests: deedsRequestsCount
  }), [projects.length, technicalRequests.length, deedsRequestsCount]);

  const canAccess = (allowedRoles: string[]) => {
    return currentUser && allowedRoles.includes(currentUser.role);
  };

  const canSeeAIAssistant = useMemo(() => {
    return currentUser && ['ADMIN', 'PR_MANAGER'].includes(currentUser.role);
  }, [currentUser]);

  const syncUserProfile = async (sessionUser: any) => {
    try {
        const { data, error } = await supabase.from('profiles').select('role, name').eq('id', sessionUser.id).single();
        if (error) {
            const fallbackUser: User = { 
                id: sessionUser.id, 
                name: sessionUser.user_metadata?.name || 'موظف', 
                email: sessionUser.email || '', 
                role: (sessionUser.email === 'adaldawsari@darwaemaar.com' ? 'ADMIN' : 'PR_OFFICER') as any 
            };
            setCurrentUser(fallbackUser);
            safeStorage.setItem(STORAGE_KEYS.USER_CACHE, JSON.stringify(fallbackUser));
            setView('DASHBOARD');
            return fallbackUser;
        }

        let userRole = data?.role || 'PR_OFFICER';
        let userName = data?.name || sessionUser.user_metadata?.name || 'موظف';
        if (sessionUser.email === 'adaldawsari@darwaemaar.com') userRole = 'ADMIN';
        
        const updatedUser: User = { id: sessionUser.id, name: userName, email: sessionUser.email || '', role: userRole as any };
        setCurrentUser(updatedUser);
        safeStorage.setItem(STORAGE_KEYS.USER_CACHE, JSON.stringify(updatedUser));

        if (userRole === 'TECHNICAL') setView('TECHNICAL_SERVICES');
        else if (userRole === 'CONVEYANCE' || userRole === 'FINANCE' || userRole === 'DEEDS_OFFICER') setView('CONVEYANCE_SERVICES');
        else setView('DASHBOARD');

        return updatedUser;
    } catch (e: any) {
        return null;
    }
  };

  const fetchAllData = async () => {
    if (!currentUser) return;
    setIsDbLoading(true);
    setErrorState(null);
    try {
      const results = await Promise.all([
        supabase.from('projects').select('*'),
        supabase.from('technical_requests').select('*').order('created_at', { ascending: false }),
        supabase.from('clearance_requests').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('*'),
        supabase.from('deeds_requests').select('*').order('created_at', { ascending: false })
      ]);

      const [pRes, trRes, crRes, profilesRes, deedsRes] = results;

      if (pRes.error) throw pRes.error;
      if (trRes.error) throw trRes.error;
      if (crRes.error) throw crRes.error;
      if (profilesRes.error) throw profilesRes.error;

      if (pRes.data) {
        setProjects(pRes.data.map((p: any) => ({
          ...p,
          name: p.client || p.title || p.name || 'مشروع جديد',
          title: p.title || p.name || p.client
        })));
      }
      if (trRes.data) setTechnicalRequests(trRes.data as any);
      if (crRes.data) setClearanceRequests(crRes.data as any);
      if (profilesRes.data) {
          setAppUsers(profilesRes.data);
          setUsersList(profilesRes.data);
      }
      if (deedsRes.data) {
          const mappedDeeds = deedsRes.data.map((d: any) => ({
            id: d.id,
            clientName: d.client_name,
            projectName: d.project_name,
            status: d.status,
            unit_value: d.unit_value,
            created_at: d.created_at
          }));
          setDeedsRequests(mappedDeeds);
          setDeedsRequestsCount(mappedDeeds.length);
      }

    } catch (e: any) { 
        setErrorState("تعذر جلب البيانات. يرجى تحديث الصفحة.");
    } finally { 
        setIsDbLoading(false); 
    }
  };

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (session?.user) await syncUserProfile(session.user);
        else setView('LOGIN');
      } catch (e) {
        setView('LOGIN');
      } finally {
        setIsAuthLoading(false);
      }
    };
    checkSession();
  }, []);

  useEffect(() => { if (currentUser && view !== 'LOGIN') fetchAllData(); }, [currentUser?.id, view]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthLoading(true);
    try {
        const { data, error } = await supabase.auth.signInWithPassword({ email: loginData.email, password: loginData.password });
        if (error) throw error;
        if (data.user) await syncUserProfile(data.user);
        logActivity('سجل الدخول', 'النظام الرئيسي', 'text-blue-500');
    } catch (e: any) {
        alert("خطأ: " + e.message);
    } finally {
        setIsAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    logActivity('سجل الخروج', 'النظام الرئيسي', 'text-orange-500');
    try { await supabase.auth.signOut(); } catch (e) {}
    setCurrentUser(null);
    safeStorage.removeItem(STORAGE_KEYS.USER_CACHE);
    setView('LOGIN');
  };

  const updateDeedStatus = async (id: number, status: string) => {
    const { error } = await supabase.from('deeds_requests').update({ status }).eq('id', id);
    if (!error) {
        const item = deedsRequests.find(d => d.id === id);
        logActivity('حدث حالة إفراغ', item?.clientName || 'عميل', status === 'مكتمل' ? 'text-green-500' : 'text-blue-500');
        fetchAllData();
    }
  };

  const handleAssistantNavigate = (type: 'PROJECT' | 'DEED', data: any) => {
    if (type === 'PROJECT') {
      const targetProject = projects.find(p => p.name === data.name || p.id === data.id) || data;
      setSelectedProject(targetProject);
      setProjectTab('info');
      setView('PROJECT_DETAIL');
    } else if (type === 'DEED') {
      setSelectedProject(null);
      setView('CONVEYANCE_SERVICES');
    }
  };

  const handleQuickAction = (action: string) => {
    if (action === 'add_project') setView('PROJECTS_LIST');
    else if (action === 'upload_excel') setView('CONVEYANCE_SERVICES');
    else if (action === 'view_projects') setView('PROJECTS_LIST');
    else if (action === 'view_deeds') setView('CONVEYANCE_SERVICES');
  };

  const handleProjectClick = (project: ProjectSummary) => {
    setSelectedProject(project);
    setView('PROJECT_DETAIL');
  };

  if (isAuthLoading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="animate-spin text-[#E95D22] w-12 h-12" /></div>;

  if (view === 'LOGIN' && !currentUser) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 font-cairo" dir="rtl">
      <div className="bg-[#1B2B48] w-full max-w-md rounded-[50px] shadow-2xl overflow-hidden border border-gray-100">
        <div className="p-12 text-center"><img src={DAR_LOGO} className="h-40 mx-auto mb-6" alt="Logo" /><h1 className="text-white text-3xl font-bold">بوابة المتابعة</h1></div>
        <form onSubmit={handleLogin} className="p-10 bg-white space-y-6 rounded-t-[50px]">
          <input type="email" required placeholder="البريد الإلكتروني" className="w-full p-4 bg-gray-50 rounded-2xl border outline-none font-bold" value={loginData.email} onChange={e => setLoginData({...loginData, email: e.target.value})} />
          <input type="password" required placeholder="كلمة السر" className="w-full p-4 bg-gray-50 rounded-2xl border outline-none font-bold" value={loginData.password} onChange={e => setLoginData({...loginData, password: e.target.value})} />
          <button type="submit" className="w-full bg-[#E95D22] text-white py-5 rounded-[30px] font-bold text-xl hover:brightness-110 shadow-lg active:scale-95 transition-all">دخول النظام</button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#f8f9fa] font-cairo overflow-hidden" dir="rtl">
      <aside className={`bg-[#1B2B48] text-white flex flex-col transition-all duration-300 ${isSidebarCollapsed ? 'w-24' : 'w-72 shadow-2xl z-30'}`}>
        <div className="p-8 border-b border-white/5 flex flex-col items-center"><img src={DAR_LOGO} className={isSidebarCollapsed ? 'h-10' : 'h-24'} alt="Logo" /></div>
        <nav className="flex-1 p-4 space-y-3">
          {canAccess(['ADMIN', 'PR_MANAGER', 'PR_OFFICER']) && (
            <button onClick={() => { setView('DASHBOARD'); setSelectedProject(null); }} className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${view === 'DASHBOARD' ? 'bg-[#E95D22]' : 'hover:bg-white/5'}`}><LayoutDashboard size={22}/> {!isSidebarCollapsed && 'لوحة التحكم'}</button>
          )}
          {canAccess(['ADMIN', 'PR_MANAGER']) && (
            <button onClick={() => { setView('PROJECTS_LIST'); setSelectedProject(null); }} className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${view === 'PROJECTS_LIST' ? 'bg-[#E95D22]' : 'hover:bg-white/5'}`}><Building2 size={22}/> {!isSidebarCollapsed && 'المشاريع'}</button>
          )}
          {canAccess(['ADMIN', 'PR_MANAGER']) && (
            <button onClick={() => { setView('APP_MAP'); setSelectedProject(null); }} className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${view === 'APP_MAP' ? 'bg-[#E95D22]' : 'hover:bg-white/5'}`}><MapIcon size={22}/> {!isSidebarCollapsed && 'خريطة النظام'}</button>
          )}
          {canAccess(['ADMIN', 'PR_MANAGER', 'TECHNICAL']) && (
            <button onClick={() => { setView('TECHNICAL_SERVICES'); setSelectedProject(null); }} className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${view === 'TECHNICAL_SERVICES' ? 'bg-[#E95D22]' : 'hover:bg-white/5'}`}><Zap size={22}/> {!isSidebarCollapsed && 'الطلبات الفنية'}</button>
          )}
          {canAccess(['ADMIN', 'PR_MANAGER', 'CONVEYANCE', 'FINANCE', 'DEEDS_OFFICER']) && (
            <button onClick={() => { setView('CONVEYANCE_SERVICES'); setSelectedProject(null); }} className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${view === 'CONVEYANCE_SERVICES' ? 'bg-[#E95D22]' : 'hover:bg-white/5'}`}><FileText size={22}/> {!isSidebarCollapsed && 'الإفراغات'}</button>
          )}
          {canAccess(['ADMIN', 'PR_MANAGER']) && (
            <button onClick={() => { setView('USERS'); setSelectedProject(null); }} className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${view === 'USERS' ? 'bg-[#E95D22]' : 'hover:bg-white/5'}`}><Users size={22}/> {!isSidebarCollapsed && 'الفريق'}</button>
          )}
        </nav>
        <div className="p-4 bg-[#16233a]"><button onClick={handleLogout} className="w-full flex items-center gap-4 p-4 text-red-400 hover:bg-red-500/10 rounded-2xl transition-all"><LogOut size={20}/> {!isSidebarCollapsed && 'خروج'}</button></div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b h-20 flex items-center justify-between px-10 shrink-0 shadow-sm z-20">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-xl transition-all"><RefreshCw size={20} /></button>
            <h1 className="text-2xl font-bold text-[#1B2B48]">
                {selectedProject ? selectedProject.name : (view === 'APP_MAP' ? 'خريطة النظام' : (view === 'DASHBOARD' ? 'لوحة المعلومات المركزية' : (view === 'PROJECTS_LIST' ? 'إدارة المشاريع' : 'بوابة المتابعة')))}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-left border-r pr-6"><p className="text-sm font-bold text-[#1B2B48]">{currentUser?.name}</p><p className="text-[10px] text-[#E95D22] font-bold uppercase">{currentUser?.role}</p></div>
            <div className="w-10 h-10 bg-[#1B2B48] text-white flex items-center justify-center rounded-xl font-bold shadow-sm">{currentUser?.name?.[0]}</div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-12 bg-[#f8f9fa]">
          {isDbLoading ? <div className="h-full flex flex-col items-center justify-center"><Loader2 className="animate-spin text-[#E95D22] w-12 h-12" /></div> : (
            <div className="max-w-7xl mx-auto space-y-8">
              {view === 'DASHBOARD' && !selectedProject && (
                <DashboardModule 
                    projects={projects}
                    techRequests={technicalRequests}
                    clearanceRequests={deedsRequests}
                    users={appUsers}
                    currentUser={currentUser}
                    activities={activities}
                    onQuickAction={handleQuickAction}
                    onUpdateStatus={updateDeedStatus}
                />
              )}

              {view === 'PROJECTS_LIST' && !selectedProject && (
                <ProjectsModule 
                    projects={projects}
                    stats={stats}
                    currentUser={currentUser}
                    onProjectClick={handleProjectClick}
                    onRefresh={fetchAllData}
                />
              )}

              {view === 'APP_MAP' && (
                  <AppMapDashboard currentUser={currentUser} setView={setView} onLogout={handleLogout} />
              )}

              {selectedProject && view === 'PROJECT_DETAIL' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 space-y-8">
                   <button onClick={() => { setView('PROJECTS_LIST'); setSelectedProject(null); }} className="flex items-center gap-2 text-gray-400 hover:text-[#1B2B48] text-sm font-bold transition-all"><ArrowLeft size={16} /> العودة لقائمة المشاريع</button>
                    <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100"><h2 className="text-4xl font-black text-[#1B2B48]">{selectedProject.name}</h2></div>
                </div>
              )}

              {view === 'TECHNICAL_SERVICES' && !selectedProject && (
                  <TechnicalModule requests={technicalRequests} projects={projects} currentUser={currentUser} usersList={appUsers} onRefresh={fetchAllData} logActivity={logActivity} />
              )}

              {view === 'CONVEYANCE_SERVICES' && !selectedProject && (
                  <DeedsDashboard currentUserRole={currentUser.role} currentUserName={currentUser.name} logActivity={logActivity} />
              )}

              {view === 'USERS' && !selectedProject && (
                  <div className="bg-white rounded-[40px] p-8 shadow-sm border border-gray-100">
                      <h2 className="text-2xl font-black mb-6 text-[#1B2B48]">إدارة فريق العمل</h2>
                      <div className="overflow-hidden border border-gray-100 rounded-[30px]">
                        <table className="w-full text-right">
                            <thead className="bg-gray-50 border-b">
                              <tr><th className="p-6 text-xs text-gray-400 uppercase font-bold tracking-wider">الاسم</th><th className="p-6 text-xs text-gray-400 uppercase font-bold tracking-wider">البريد الإلكتروني</th><th className="p-6 text-xs text-gray-400 uppercase font-bold tracking-wider text-left">الدور</th></tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                              {appUsers.map(u => (
                                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                                  <td className="p-6 font-bold text-[#1B2B48]">{u.name}</td>
                                  <td className="p-6 text-gray-500 font-bold">{u.email}</td>
                                  <td className="p-6 text-left"><span className="bg-indigo-50 text-indigo-700 px-4 py-1.5 rounded-full text-xs font-black shadow-sm">{u.role}</span></td>
                                </tr>
                              ))}
                            </tbody>
                        </table>
                      </div>
                  </div>
              )}
            </div>
          )}
        </div>
      </main>

      {canSeeAIAssistant && (
        <AIAssistant 
          projects={projects}
          technicalRequests={technicalRequests}
          clearanceRequests={clearanceRequests}
          deedsRequests={deedsRequests}
          onNavigate={handleAssistantNavigate}
        />
      )}
    </div>
  );
};

const App: React.FC = () => <ErrorBoundary><AppContent /></ErrorBoundary>;
export default App;
