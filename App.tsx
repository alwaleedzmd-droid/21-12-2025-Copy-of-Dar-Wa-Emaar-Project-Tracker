
import React, { useState, useEffect, ReactNode, useMemo } from 'react';
import { 
  LayoutDashboard, Users, FileText, LogOut, 
  Plus, ArrowLeft, Loader2, Zap, Droplets, 
  CheckCircle2, RefreshCw, FileUp,
  Edit3, Building2,
  Briefcase, User as UserIcon, ShieldCheck, 
  Search, FileStack, CheckCircle, Clock, ChevronDown, ChevronUp, X, LayoutList, Printer,
  Calendar, Hash, Phone, MapPin, CreditCard, UserCheck, AlertTriangle, WifiOff,
  ClipboardList, Ruler 
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
  const [isEditProjectModalOpen, setIsEditProjectModalOpen] = useState(false);
  const [editProjectForm, setEditProjectForm] = useState<any>({});
  const [bulkProject, setBulkProject] = useState('');

  const projectInternalWorks = useMemo(() => 
    selectedProject ? technicalRequests.filter(r => r.project_name === selectedProject.name && r.scope === 'INTERNAL_WORK') : []
  , [technicalRequests, selectedProject]);

  const projectExternalTechRequests = useMemo(() => 
    selectedProject ? technicalRequests.filter(r => r.project_name === selectedProject.name && r.scope !== 'INTERNAL_WORK') : []
  , [technicalRequests, selectedProject]);

  const stats = useMemo(() => ({
    projects: projects.length,
    techRequests: technicalRequests.filter(r => r.scope !== 'INTERNAL_WORK').length,
    clearRequests: deedsRequestsCount, 
    deeds: deedsRequestsCount 
  }), [projects.length, technicalRequests.length, deedsRequestsCount]);

  const canAccess = (allowedRoles: string[]) => {
    return currentUser && allowedRoles.includes(currentUser.role);
  };

  // --- AI Assistant Strict Access Control ---
  // Must only be System Manager (ADMIN) or Public Relations (PR_MANAGER)
  const canSeeAIAssistant = useMemo(() => {
    return currentUser && ['ADMIN', 'PR_MANAGER'].includes(currentUser.role);
  }, [currentUser]);

  const syncUserProfile = async (sessionUser: any) => {
    try {
        const { data, error } = await supabase.from('profiles').select('role, name').eq('id', sessionUser.id).single();
        if (error) throw error;

        let userRole = data?.role || 'PR_OFFICER';
        let userName = data?.name || sessionUser.user_metadata?.name || 'موظف';
        if (sessionUser.email === 'adaldawsari@darwaemaar.com') userRole = 'ADMIN';
        
        const updatedUser: User = { id: sessionUser.id, name: userName, email: sessionUser.email || '', role: userRole as any };
        setCurrentUser(updatedUser);
        safeStorage.setItem(STORAGE_KEYS.USER_CACHE, JSON.stringify(updatedUser));

        if (userRole === 'TECHNICAL') setView('TECHNICAL_SERVICES');
        else if (userRole === 'CONVEYANCE' || userRole === 'FINANCE' || userRole === 'DEEDS_OFFICER') setView('CONVEYANCE_SERVICES');
        else if (userRole === 'ADMIN' || userRole === 'PR_MANAGER' || userRole === 'PR_OFFICER') setView('DASHBOARD');
        else setView('DASHBOARD');

        return updatedUser;
    } catch (e: any) {
        setErrorState("حدث خطأ أثناء مزامنة بيانات الملف الشخصي: " + (e.message || "فشل الاتصال بالخادم"));
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
        const mappedProjects = pRes.data.map((p: any) => ({
          ...p,
          name: p.client || p.title || p.name || 'مشروع جديد',
          consultant_name: p.consultant_name || p.details?.consultant_name || p.details?.consultantName,
          consultant_engineer: p.consultant_engineer || p.details?.consultant_engineer || p.details?.consultantEngineer,
          consultant_mobile: p.consultant_mobile || p.details?.consultant_mobile || p.details?.consultantMobile,
          water_contractor: p.water_contractor || p.details?.water_contractor || p.details?.waterContractor,
          water_contractor_engineer: p.water_contractor_engineer || p.details?.water_contractor_engineer || p.details?.waterContractorEngineer,
          water_contractor_mobile: p.water_contractor_mobile || p.details?.water_contractor_mobile || p.details?.waterContractorMobile,
          electricity_contractor: p.electricity_contractor || p.details?.electricity_contractor || p.details?.electricityContractor,
          electricity_contractor_engineer: p.electricity_contractor_engineer || p.details?.electricity_contractor_engineer || p.details?.electricityContractorEngineer,
          electricity_contractor_mobile: p.electricity_contractor_mobile || p.details?.electricity_contractor_mobile || p.details?.electricityContractorMobile,
          units_count: p.units_count || p.details?.unitsCount || 0,
          electricity_meters: p.electricity_meters || p.details?.electricityMetersCount || 0,
          water_meters: p.water_meters || p.details?.waterMetersCount || 0,
          building_permits: p.building_permits || p.details?.buildingPermitsCount || 0,
          occupancy_certificates: p.occupancy_certificates || p.details?.occupancyCertificatesCount || 0,
          survey_decisions_count: p.survey_decisions_count || p.details?.surveyDecisionsCount || 0
        }));
        setProjects(mappedProjects);
        
        if (selectedProject) {
            const updated = mappedProjects.find((px: any) => px.id === selectedProject.id);
            if (updated) setSelectedProject(updated);
        }
      }
      if (trRes.data) setTechnicalRequests(trRes.data as any);
      if (crRes.data) setClearanceRequests(crRes.data as any);
      if (profilesRes.data) {
          setAppUsers(profilesRes.data);
          setUsersList(profilesRes.data);
      }
      if (deedsRes.data) {
          setDeedsRequests(deedsRes.data);
          setDeedsRequestsCount(deedsRes.data.length);
      }

    } catch (e: any) { 
        setErrorState("تعذر جلب البيانات من الخادم. يرجى التأكد من اتصال الإنترنت.");
    } finally { 
        setIsDbLoading(false); 
    }
  };

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (session?.user) { await syncUserProfile(session.user); } 
        else setView('LOGIN');
      } catch (e: any) {
        setErrorState("فشل الاتصال بخدمات النظام. يرجى التحقق من الشبكة.");
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
    setErrorState(null);
    try {
        const { data, error } = await supabase.auth.signInWithPassword({ email: loginData.email, password: loginData.password });
        if (error) throw error;
        if (data.user) { await syncUserProfile(data.user); }
    } catch (e: any) {
        alert("خطأ في تسجيل الدخول: " + (e.message || "فشل الاتصال"));
    } finally {
        setIsAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try { await supabase.auth.signOut(); } catch (e) { console.error(e); }
    setCurrentUser(null);
    safeStorage.removeItem(STORAGE_KEYS.USER_CACHE);
    setView('LOGIN');
  };

  const handleUpdateProjectDetails = async () => {
    if (!selectedProject) return;
    try {
        const directUpdate = {
            survey_decisions_count: editProjectForm.surveyDecisionsCount,
            units_count: editProjectForm.unitsCount,
            electricity_meters: editProjectForm.electricityMetersCount,
            water_meters: editProjectForm.waterMetersCount,
            building_permits: editProjectForm.buildingPermitsCount,
            occupancy_certificates: editProjectForm.occupancyCertificatesCount,
            consultant_name: editProjectForm.consultant_name,
            consultant_engineer: editProjectForm.consultant_engineer,
            consultant_mobile: editProjectForm.consultant_mobile,
            water_contractor: editProjectForm.water_contractor,
            water_contractor_engineer: editProjectForm.water_contractor_engineer,
            water_contractor_mobile: editProjectForm.water_contractor_mobile,
            electricity_contractor: editProjectForm.electricity_contractor,
            electricity_contractor_engineer: editProjectForm.electricity_contractor_engineer,
            electricity_contractor_mobile: editProjectForm.electricity_contractor_mobile,
        };

        const { error } = await supabase.from('projects').update(directUpdate).eq('id', selectedProject.id);
        if (error) throw error;
        
        alert("تم حفظ البيانات بنجاح ✅"); 
        setIsEditProjectModalOpen(false); 
        fetchAllData(); 
    } catch (e: any) {
        alert("خطأ في الحفظ: " + e.message);
    }
  };

  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !bulkProject) return alert("اختر المشروع والملف");
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const wb = XLSX.read(evt.target?.result, { type: 'binary' });
        const data: any[] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
        const formatted = data.map(r => ({
          client_name: r['Client Name'] || r['اسم العميل'],
          mobile: String(r['Mobile'] || ''),
          id_number: String(r['ID Number'] || ''),
          project_name: bulkProject,
          submitted_by: currentUser?.name,
          status: 'new'
        })).filter(r => r.client_name);
        const { error } = await supabase.from('clearance_requests').insert(formatted);
        if (error) throw error;
        alert(`تم رفع ${formatted.length} سجل`); setIsBulkUploadModalOpen(false); fetchAllData(); 
      } catch (err: any) { alert(err.message); }
    };
    reader.readAsBinaryString(file);
  };

  const getProjectProgress = (pName: string) => {
    const tech = technicalRequests.filter(r => r.project_name === pName);
    const deeds = deedsRequests.filter(d => d.project_name === pName);
    const total = tech.length + deeds.length;
    const completed = tech.filter(r => r.status === 'completed' || r.status === 'منجز').length + 
                    deeds.filter(d => d.status === 'منجز').length;
    return total > 0 ? Math.round((completed / total) * 100) : 0;
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

  if (isAuthLoading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="animate-spin text-[#E95D22] w-12 h-12" /></div>;

  if (view === 'LOGIN' && !currentUser) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 font-cairo" dir="rtl">
      <div className="bg-[#1B2B48] w-full max-w-md rounded-[50px] shadow-2xl overflow-hidden border border-gray-100 animate-in zoom-in-95">
        <div className="p-12 text-center"><img src={DAR_LOGO} className="h-40 mx-auto mb-6" alt="Logo" /><h1 className="text-white text-3xl font-bold">بوابة المتابعة</h1></div>
        <form onSubmit={handleLogin} className="p-10 bg-white space-y-6 rounded-t-[50px]">
          <input type="email" required placeholder="البريد الإلكتروني" className="w-full p-4 bg-gray-50 rounded-2xl border outline-none font-bold" value={loginData.email} onChange={e => setLoginData({...loginData, email: e.target.value})} />
          <input type="password" required placeholder="كلمة السر" className="w-full p-4 bg-gray-50 rounded-2xl border outline-none font-bold" value={loginData.password} onChange={e => setLoginData({...loginData, password: e.target.value})} />
          <button type="submit" className="w-full bg-[#E95D22] text-white py-5 rounded-[30px] font-bold text-xl hover:brightness-110 shadow-lg transition-all active:scale-95">دخول النظام</button>
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
            <button onClick={() => { setView('DASHBOARD'); setSelectedProject(null); }} className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${view === 'DASHBOARD' ? 'bg-[#E95D22]' : 'hover:bg-white/5'}`}><LayoutDashboard size={22}/> {!isSidebarCollapsed && 'الرئيسية'}</button>
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
            <h1 className="text-2xl font-bold text-[#1B2B48]">{selectedProject ? selectedProject.name : (view === 'CONVEYANCE_SERVICES' ? 'سجل الإفراغات العام' : 'بوابة المشاريع')}</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-left border-r pr-6"><p className="text-sm font-bold text-[#1B2B48]">{currentUser?.name}</p><p className="text-[10px] text-[#E95D22] font-bold uppercase">{currentUser?.role}</p></div>
            <div className="w-10 h-10 bg-[#1B2B48] text-white flex items-center justify-center rounded-xl font-bold shadow-sm">{currentUser?.name?.[0]}</div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-12 bg-[#f8f9fa]">
          {isDbLoading ? <div className="h-full flex flex-col items-center justify-center"><Loader2 className="animate-spin text-[#E95D22] w-12 h-12" /></div> : 
           errorState ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-gray-50 animate-in fade-in">
                <div className="bg-red-100 p-6 rounded-full text-red-600 mb-6 shadow-sm"><WifiOff size={48}/></div>
                <h2 className="text-2xl font-black text-[#1B2B48] mb-3">عذراً، تعذر الاتصال بالخادم</h2>
                <p className="text-gray-500 mb-8 max-w-md font-bold leading-relaxed">{errorState}</p>
                <button onClick={() => { setErrorState(null); fetchAllData(); }} className="flex items-center gap-3 px-10 py-4 bg-[#1B2B48] text-white rounded-[25px] font-black shadow-xl hover:scale-105 transition-all active:scale-95">
                    <RefreshCw size={20} className={isDbLoading ? 'animate-spin' : ''} /> إعادة المحاولة
                </button>
            </div>
           ) : (
            <div className="max-w-7xl mx-auto space-y-8">
              {view === 'DASHBOARD' && !selectedProject && (
                <ProjectsModule 
                  projects={projects.map(p => ({...p, progress: getProjectProgress(p.name)}))}
                  stats={stats}
                  currentUser={currentUser}
                  onProjectClick={(p) => { setSelectedProject(p); setView('PROJECT_DETAIL'); }}
                  onRefresh={fetchAllData}
                />
              )}

              {selectedProject && view === 'PROJECT_DETAIL' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 space-y-8">
                  <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="space-y-2">
                        <button onClick={() => { setSelectedProject(null); setView('DASHBOARD'); }} className="flex items-center gap-2 text-gray-400 hover:text-[#1B2B48] text-sm font-bold transition-all mb-2">
                          <ArrowLeft size={16} /> العودة للرئيسية
                        </button>
                        <div className="flex items-center gap-3">
                          <h2 className="text-4xl font-black text-[#1B2B48] tracking-tight">{selectedProject.name}</h2>
                          {canAccess(['ADMIN', 'PR_MANAGER']) && (
                            <button onClick={() => { 
                                setEditProjectForm({
                                    ...selectedProject, 
                                    surveyDecisionsCount: selectedProject['survey_decisions_count'],
                                    unitsCount: selectedProject['units_count'],
                                    electricityMetersCount: selectedProject['electricity_meters'],
                                    waterMetersCount: selectedProject['water_meters'],
                                    buildingPermitsCount: selectedProject['building_permits'],
                                    occupancyCertificatesCount: selectedProject['occupancy_certificates'],
                                    consultant_name: selectedProject['consultant_name'] || '',
                                    consultant_engineer: selectedProject['consultant_engineer'] || '',
                                    consultant_mobile: selectedProject['consultant_mobile'] || '',
                                    water_contractor: selectedProject['water_contractor'] || '',
                                    water_contractor_engineer: selectedProject['water_contractor_engineer'] || '',
                                    water_contractor_mobile: selectedProject['water_contractor_mobile'] || '',
                                    electricity_contractor: selectedProject['electricity_contractor'] || '',
                                    electricity_contractor_engineer: selectedProject['electricity_contractor_engineer'] || '',
                                    electricity_contractor_mobile: selectedProject['electricity_contractor_mobile'] || '',
                                }); 
                                setIsEditProjectModalOpen(true); 
                            }} className="p-2 text-gray-400 hover:text-[#E95D22] hover:bg-orange-50 rounded-full transition-all"><Edit3 size={20} /></button>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-gray-400"><MapPin size={16} className="text-[#E95D22]" /> <span>{selectedProject.location || 'الرياض'}</span></div>
                    </div>
                  </div>

                  <div className="flex gap-4 p-1.5 bg-gray-100 rounded-[30px] w-fit shadow-inner overflow-x-auto max-w-full no-scrollbar">
                    <button onClick={() => setProjectTab('info')} className={`px-8 py-3 rounded-[25px] font-bold transition-all whitespace-nowrap ${projectTab === 'info' ? 'bg-[#1B2B48] text-white shadow-xl scale-105' : 'text-gray-500 hover:text-[#1B2B48] hover:bg-white/50'}`}>المعلومات الأساسية</button>
                    {canAccess(['ADMIN', 'PR_MANAGER', 'PR_OFFICER']) && <button onClick={() => setProjectTab('work')} className={`px-8 py-3 rounded-[25px] font-bold transition-all whitespace-nowrap ${projectTab === 'work' ? 'bg-[#1B2B48] text-white shadow-xl scale-105' : 'text-gray-500 hover:text-[#1B2B48] hover:bg-white/50'}`}>أعمال المشروع الداخلية</button>}
                    {canAccess(['ADMIN', 'PR_MANAGER', 'TECHNICAL']) && <button onClick={() => setProjectTab('tech')} className={`px-8 py-3 rounded-[25px] font-bold transition-all whitespace-nowrap ${projectTab === 'tech' ? 'bg-[#1B2B48] text-white shadow-xl scale-105' : 'text-gray-500 hover:text-[#1B2B48] hover:bg-white/50'}`}>المراجعات والطلبات الفنية</button>}
                    {canAccess(['ADMIN', 'PR_MANAGER', 'CONVEYANCE', 'FINANCE', 'DEEDS_OFFICER']) && <button onClick={() => setProjectTab('clearance')} className={`px-8 py-3 rounded-[25px] font-bold transition-all whitespace-nowrap ${projectTab === 'clearance' ? 'bg-[#1B2B48] text-white shadow-xl scale-105' : 'text-gray-500 hover:text-[#1B2B48] hover:bg-white/50'}`}>إجراءات الإفراغ</button>}
                  </div>

                  <div className="animate-in fade-in duration-300">
                    {projectTab === 'info' && (
                      <div className="space-y-8 animate-in fade-in duration-300">
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 text-right" dir="rtl">
                            {[
                                { label: 'الوحدات', icon: Building2, value: selectedProject['units_count'] || 0, color: 'text-blue-600', bg: 'bg-blue-50' },
                                { label: 'الكهرباء', icon: Zap, value: selectedProject['electricity_meters'] || 0, color: 'text-amber-500', bg: 'bg-amber-50' },
                                { label: 'المياه', icon: Droplets, value: selectedProject['water_meters'] || 0, color: 'text-cyan-500', bg: 'bg-cyan-50' },
                                { label: 'رخص البناء', icon: ClipboardList, value: selectedProject['building_permits'] || 0, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                                { label: 'الأشغال', icon: ShieldCheck, value: selectedProject['occupancy_certificates'] || 0, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                                { label: 'المساحة', icon: Ruler, value: selectedProject['survey_decisions_count'] || 0, color: 'text-rose-600', bg: 'bg-rose-50' },
                            ].map((m, idx) => (
                                <div key={idx} className="bg-white p-6 rounded-[30px] border border-gray-100 shadow-sm flex flex-col items-center justify-center hover:scale-105 transition-transform">
                                    <div className={`w-12 h-12 ${m.bg} ${m.color} rounded-2xl flex items-center justify-center mb-3`}><m.icon size={24} /></div>
                                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-tight">{m.label}</p>
                                    <p className="text-3xl font-black text-[#1B2B48] mt-1">{m.value}</p>
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-white p-6 rounded-[30px] border border-gray-100 shadow-sm relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-2 h-full bg-[#1B2B48]"></div>
                                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-50">
                                    <div className="p-3 bg-gray-50 text-[#1B2B48] rounded-2xl"><Briefcase size={20}/></div>
                                    <h3 className="font-bold text-lg text-[#1B2B48]">المكتب الاستشاري</h3>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center"><span className="text-gray-400 text-xs font-bold">اسم المكتب</span><span className="font-bold text-[#1B2B48]">{selectedProject['consultant_name'] || '-'}</span></div>
                                    <div className="flex justify-between items-center"><span className="text-gray-400 text-xs font-bold">المهندس المسؤول</span><span className="font-bold text-[#1B2B48]">{selectedProject['consultant_engineer'] || '-'}</span></div>
                                    <div className="flex justify-between items-center"><span className="text-gray-400 text-xs font-bold">رقم التواصل</span><span className="font-bold text-[#1B2B48] dir-ltr">{selectedProject['consultant_mobile'] || '-'}</span></div>
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-[30px] border border-gray-100 shadow-sm relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-2 h-full bg-amber-400"></div>
                                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-50">
                                    <div className="p-3 bg-amber-50 text-yellow-600 rounded-2xl"><Zap size={20}/></div>
                                    <h3 className="font-bold text-lg text-[#1B2B48]">مقاول الكهرباء</h3>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center"><span className="text-gray-400 text-xs font-bold">الجهة المنفذة</span><span className="font-bold text-[#1B2B48]">{selectedProject['electricity_contractor'] || '-'}</span></div>
                                    <div className="flex justify-between items-center"><span className="text-gray-400 text-xs font-bold">المهندس المسؤول</span><span className="font-bold text-[#1B2B48]">{selectedProject['electricity_contractor_engineer'] || '-'}</span></div>
                                    <div className="flex justify-between items-center"><span className="text-gray-400 text-xs font-bold">رقم التواصل</span><span className="font-bold text-[#1B2B48] dir-ltr">{selectedProject['electricity_contractor_mobile'] || '-'}</span></div>
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-[30px] border border-gray-100 shadow-sm relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-2 h-full bg-cyan-400"></div>
                                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-50">
                                    <div className="p-3 bg-cyan-50 text-cyan-600 rounded-2xl"><Droplets size={20}/></div>
                                    <h3 className="font-bold text-lg text-[#1B2B48]">مقاول المياه</h3>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center"><span className="text-gray-400 text-xs font-bold">الجهة المنفذة</span><span className="font-bold text-[#1B2B48]">{selectedProject['water_contractor'] || '-'}</span></div>
                                    <div className="flex justify-between items-center"><span className="text-gray-400 text-xs font-bold">المهندس المسؤول</span><span className="font-bold text-[#1B2B48]">{selectedProject['water_contractor_engineer'] || '-'}</span></div>
                                    <div className="flex justify-between items-center"><span className="text-gray-400 text-xs font-bold">رقم التواصل</span><span className="font-bold text-[#1B2B48] dir-ltr">{selectedProject['water_contractor_mobile'] || '-'}</span></div>
                                </div>
                            </div>
                        </div>
                      </div>
                    )}
                    {projectTab === 'work' && <TechnicalModule requests={projectInternalWorks} projects={[selectedProject]} currentUser={currentUser} usersList={usersList} onRefresh={fetchAllData} filteredByProject={selectedProject.name} scopeFilter="INTERNAL_WORK" />}
                    {projectTab === 'tech' && <TechnicalModule requests={projectExternalTechRequests} projects={[selectedProject]} currentUser={currentUser} usersList={usersList} onRefresh={fetchAllData} filteredByProject={selectedProject.name} scopeFilter="EXTERNAL" />}
                    {projectTab === 'clearance' && (
                      <DeedsDashboard 
                        filteredProjectName={selectedProject.name} 
                        currentUserRole={currentUser.role} 
                        currentUserName={currentUser.name} 
                      />
                    )}
                  </div>
                </div>
              )}

              {view === 'TECHNICAL_SERVICES' && !selectedProject && (
                  <TechnicalModule requests={technicalRequests.filter(r => r.scope !== 'INTERNAL_WORK')} projects={projects} currentUser={currentUser} usersList={usersList} onRefresh={fetchAllData} />
              )}

              {view === 'CONVEYANCE_SERVICES' && !selectedProject && (
                  <DeedsDashboard currentUserRole={currentUser.role} currentUserName={currentUser.name} />
              )}

              {view === 'USERS' && !selectedProject && (
                  <div className="bg-white rounded-[40px] p-8 shadow-sm border border-gray-100 animate-in fade-in">
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

      {/* STRICT AI ASSISTANT RESTRICTION */}
      {canSeeAIAssistant && (
        <AIAssistant 
          projects={projects}
          technicalRequests={technicalRequests}
          clearanceRequests={clearanceRequests}
          deedsRequests={deedsRequests}
          onNavigate={handleAssistantNavigate}
        />
      )}

      <Modal isOpen={isEditProjectModalOpen} onClose={() => setIsEditProjectModalOpen(false)} title="تعديل تفاصيل المشروع">
        <div className="space-y-6 text-right font-cairo">
             <div className="grid grid-cols-2 gap-4">
               <div className="space-y-1">
                  <label className="text-xs text-gray-400 font-bold block mb-1">عدد الوحدات</label>
                  <input type="number" className="w-full p-4 bg-gray-50 border rounded-2xl font-bold" value={editProjectForm.unitsCount || 0} onChange={e => setEditProjectForm({...editProjectForm, unitsCount: parseInt(e.target.value)})} />
               </div>
               <div className="space-y-1">
                  <label className="text-xs text-gray-400 font-bold block mb-1">عدادات الكهرباء</label>
                  <input type="number" className="w-full p-4 bg-gray-50 border rounded-2xl font-bold" value={editProjectForm.electricityMetersCount || 0} onChange={e => setEditProjectForm({...editProjectForm, electricityMetersCount: parseInt(e.target.value)})} />
               </div>
               <div className="space-y-1">
                  <label className="text-xs text-gray-400 font-bold block mb-1">عدادات المياه</label>
                  <input type="number" className="w-full p-4 bg-gray-50 border rounded-2xl font-bold" value={editProjectForm.waterMetersCount || 0} onChange={e => setEditProjectForm({...editProjectForm, waterMetersCount: parseInt(e.target.value)})} />
               </div>
               <div className="space-y-1">
                  <label className="text-xs text-gray-400 font-bold block mb-1">رخص البناء</label>
                  <input type="number" className="w-full p-4 bg-gray-50 border rounded-2xl font-bold" value={editProjectForm.buildingPermitsCount || 0} onChange={e => setEditProjectForm({...editProjectForm, buildingPermitsCount: parseInt(e.target.value)})} />
               </div>
               <div className="space-y-1">
                  <label className="text-xs text-gray-400 font-bold block mb-1">شهادات الأشغال</label>
                  <input type="number" className="w-full p-4 bg-gray-50 border rounded-2xl font-bold" value={editProjectForm.occupancyCertificatesCount || 0} onChange={e => setEditProjectForm({...editProjectForm, occupancyCertificatesCount: parseInt(e.target.value)})} />
               </div>
               <div className="space-y-1">
                  <label className="text-xs text-gray-400 font-bold block mb-1">القرارات المساحية</label>
                  <input type="number" className="w-full p-4 bg-gray-50 border rounded-2xl font-bold" value={editProjectForm.surveyDecisionsCount || 0} onChange={e => setEditProjectForm({...editProjectForm, surveyDecisionsCount: parseInt(e.target.value)})} />
               </div>
             </div>

             <div className="space-y-4 border-t pt-4">
                <h4 className="font-bold text-[#1B2B48] text-sm">بيانات الاستشاري والمقاولين</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-gray-400 font-bold block mb-1">المكتب الاستشاري</label>
                    <input type="text" className="w-full p-4 bg-gray-50 border rounded-2xl font-bold" value={editProjectForm.consultant_name || ''} onChange={e => setEditProjectForm({...editProjectForm, consultant_name: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-400 font-bold block mb-1">مهندس الاستشاري</label>
                    <input type="text" className="w-full p-4 bg-gray-50 border rounded-2xl font-bold" value={editProjectForm.consultant_engineer || ''} onChange={e => setEditProjectForm({...editProjectForm, consultant_engineer: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-400 font-bold block mb-1">جوال الاستشاري</label>
                    <input type="text" className="w-full p-4 bg-gray-50 border rounded-2xl font-bold" value={editProjectForm.consultant_mobile || ''} onChange={e => setEditProjectForm({...editProjectForm, consultant_mobile: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-400 font-bold block mb-1">مقاول الكهرباء</label>
                    <input type="text" className="w-full p-4 bg-gray-50 border rounded-2xl font-bold" value={editProjectForm.electricity_contractor || ''} onChange={e => setEditProjectForm({...editProjectForm, electricity_contractor: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-400 font-bold block mb-1">مهندس الكهرباء</label>
                    <input type="text" className="w-full p-4 bg-gray-50 border rounded-2xl font-bold" value={editProjectForm.electricity_contractor_engineer || ''} onChange={e => setEditProjectForm({...editProjectForm, electricity_contractor_engineer: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-400 font-bold block mb-1">جوال مقاول الكهرباء</label>
                    <input type="text" className="w-full p-4 bg-gray-50 border rounded-2xl font-bold" value={editProjectForm.electricity_contractor_mobile || ''} onChange={e => setEditProjectForm({...editProjectForm, electricity_contractor_mobile: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-400 font-bold block mb-1">مقاول المياه</label>
                    <input type="text" className="w-full p-4 bg-gray-50 border rounded-2xl font-bold" value={editProjectForm.water_contractor || ''} onChange={e => setEditProjectForm({...editProjectForm, water_contractor: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-400 font-bold block mb-1">مهندس المياه</label>
                    <input type="text" className="w-full p-4 bg-gray-50 border rounded-2xl font-bold" value={editProjectForm.water_contractor_engineer || ''} onChange={e => setEditProjectForm({...editProjectForm, water_contractor_engineer: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-400 font-bold block mb-1">جوال مقاول المياه</label>
                    <input type="text" className="w-full p-4 bg-gray-50 border rounded-2xl font-bold" value={editProjectForm.water_contractor_mobile || ''} onChange={e => setEditProjectForm({...editProjectForm, water_contractor_mobile: e.target.value})} />
                  </div>
                </div>
             </div>

             <button onClick={handleUpdateProjectDetails} className="w-full bg-[#1B2B48] text-white py-5 rounded-[25px] font-black shadow-xl mt-4 hover:brightness-110 active:scale-95 transition-all">حفظ التغييرات</button>
        </div>
      </Modal>

      <Modal isOpen={isBulkUploadModalOpen} onClose={() => setIsBulkUploadModalOpen(false)} title="رفع بيانات إفراغ جماعية">
        <div className="space-y-4 text-right font-cairo">
          <select className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold" value={bulkProject} onChange={e => setBulkProject(e.target.value)}>
              <option value="">اختر مشروعاً...</option>
              {projects.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
          </select>
          <div className="border-2 border-dashed border-gray-200 rounded-[30px] p-12 text-center bg-gray-50 hover:border-[#E95D22] transition-all group cursor-pointer relative">
            <input type="file" accept=".xlsx,.xls" onChange={handleExcelImport} className="absolute inset-0 opacity-0 cursor-pointer" id="excel-upload" />
            <div className="flex flex-col items-center">
              <FileUp className="w-12 h-12 text-[#E95D22] mb-2" />
              <p className="text-lg font-black text-[#1B2B48]">اختر ملف Excel</p>
              <p className="text-xs text-gray-400 mt-1">يرجى التأكد من تطابق الأعمدة مع النظام</p>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

const App: React.FC = () => <ErrorBoundary><AppContent /></ErrorBoundary>;
export default App;
