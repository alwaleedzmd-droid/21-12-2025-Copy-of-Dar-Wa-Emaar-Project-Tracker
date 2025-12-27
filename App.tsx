import React, { useState, useEffect, ReactNode, useMemo } from 'react';
import { 
  LayoutDashboard, Users, FileText, LogOut, 
  Plus, ArrowLeft, Loader2, Send, AlertTriangle, 
  MapPin, Building2, Zap, Droplets, 
  Trash2, CheckCircle2, XCircle,
  RefreshCw, Upload, FileUp, MessageCircle,
  PieChart, Calendar, Edit3, AlertCircle, Shield,
  FolderOpen, Activity, BarChart3, TrendingUp, Landmark, 
  Smartphone, Phone, HardHat, Ruler, ClipboardList, ShieldCheck, UserPlus,
  Briefcase, User as UserIcon, RotateCcw
} from 'lucide-react';
import { supabase } from './supabaseClient';
import * as XLSX from 'xlsx';
import { 
  ProjectSummary, User, ViewState, 
  TechnicalRequest, ClearanceRequest, Comment
} from './types';
import { 
  DAR_LOGO, TECHNICAL_ENTITY_MAPPING, BANKS_LIST
} from './constants';
import ProjectCard from './components/ProjectCard';
import Modal from './components/Modal';
import ManageRequestModal from './components/ManageRequestModal';
import ClearanceModule from './components/ClearanceModule';
import TechnicalModule from './components/TechnicalModule';
import ProjectsModule from './components/ProjectsModule';

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
    if (this.state.hasError) return <div className="min-h-screen flex items-center justify-center text-red-500 font-bold">حدث خطأ غير متوقع، يرجى تحديث الصفحة.</div>;
    return this.props.children;
  }
}

const AppContent: React.FC = () => {
  // --- State ---
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [technicalRequests, setTechnicalRequests] = useState<TechnicalRequest[]>([]);
  const [clearanceRequests, setClearanceRequests] = useState<ClearanceRequest[]>([]);
  const [appUsers, setAppUsers] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  
  const [isDbLoading, setIsDbLoading] = useState(true);
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

  // Modals
  const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false);
  const [isEditProjectModalOpen, setIsEditProjectModalOpen] = useState(false);

  // Forms
  const [editProjectForm, setEditProjectForm] = useState<any>({});
  const [bulkProject, setBulkProject] = useState('');

  // --- Derived State ---
  const projectTechnicalRequests = useMemo(() => 
    selectedProject ? technicalRequests.filter(r => r.project_name === selectedProject.name) : []
  , [technicalRequests, selectedProject]);

  const projectClearanceRequests = useMemo(() => 
    selectedProject ? clearanceRequests.filter(r => r.project_name === selectedProject.name) : []
  , [clearanceRequests, selectedProject]);

  const stats = useMemo(() => ({
    projects: projects.length,
    techRequests: technicalRequests.length,
    clearRequests: clearanceRequests.length
  }), [projects.length, technicalRequests.length, clearanceRequests.length]);

  const canAccess = (allowedRoles: string[]) => {
    return currentUser && allowedRoles.includes(currentUser.role);
  };

  const syncUserProfile = async (sessionUser: any) => {
    const { data } = await supabase.from('profiles').select('role, name').eq('id', sessionUser.id).single();
    let userRole = data?.role || 'PR_OFFICER';
    let userName = data?.name || sessionUser.user_metadata?.name || 'موظف';
    
    if (sessionUser.email === 'adaldawsari@darwaemaar.com') userRole = 'ADMIN';
    
    const updatedUser: User = { id: sessionUser.id, name: userName, email: sessionUser.email || '', role: userRole as any };
    setCurrentUser(updatedUser);
    safeStorage.setItem(STORAGE_KEYS.USER_CACHE, JSON.stringify(updatedUser));

    if (userRole === 'TECHNICAL') setView('TECHNICAL_SERVICES');
    else if (userRole === 'CONVEYANCE' || userRole === 'FINANCE') setView('CONVEYANCE_SERVICES');
    else if (userRole === 'ADMIN' || userRole === 'PR_MANAGER' || userRole === 'PR_OFFICER') setView('DASHBOARD');
    else setView('DASHBOARD');

    return updatedUser;
  };

  const fetchAllData = async () => {
    if (!currentUser) return;
    setIsDbLoading(true);
    try {
      const [pRes, trRes, crRes, profilesRes] = await Promise.all([
        supabase.from('projects').select('*'),
        supabase.from('technical_requests').select('*').order('created_at', { ascending: false }),
        supabase.from('clearance_requests').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('*')
      ]);

      if (pRes.data) {
        const mappedProjects = pRes.data.map((p: any) => ({
          ...p,
          name: p.client || p.title || p.name || 'مشروع جديد',
          // قراءة الأعمدة المباشرة بدلاً من details
          units_count: p.units_count || 0,
          electricity_meters: p.electricity_meters || 0,
          water_meters: p.water_meters || 0,
          building_permits: p.building_permits || 0,
          occupancy_certificates: p.occupancy_certificates || 0,
          survey_decisions_count: p.survey_decisions_count || 0,
          
          consultant_name: p.consultant_name,
          consultant_engineer: p.consultant_engineer,
          consultant_mobile: p.consultant_mobile,
          water_contractor: p.water_contractor,
          water_contractor_engineer: p.water_contractor_engineer,
          water_contractor_mobile: p.water_contractor_mobile,
          electricity_contractor: p.electricity_contractor,
          electricity_contractor_engineer: p.electricity_contractor_engineer,
          electricity_contractor_mobile: p.electricity_contractor_mobile,
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
    } catch (e) { console.error(e); } finally { setIsDbLoading(false); }
  };

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) { await syncUserProfile(session.user); } 
      else setView('LOGIN');
      setIsAuthLoading(false);
    };
    checkSession();
  }, []);

  useEffect(() => { if (currentUser) fetchAllData(); }, [currentUser?.id, view]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email: loginData.email, password: loginData.password });
    if (error) { alert("خطأ: " + error.message); setIsAuthLoading(false); }
    else if (data.user) { await syncUserProfile(data.user); setIsAuthLoading(false); }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    safeStorage.removeItem(STORAGE_KEYS.USER_CACHE);
    setView('LOGIN');
  };

  // === دالة الحفظ المصححة (تكتب في الأعمدة المباشرة فقط وتتجاهل details) ===
  const handleUpdateProjectDetails = async () => {
    if (!selectedProject) return;
    
    // إزالة الاعتماد على عمود details نهائياً
    const updatePayload = {
        // العدادات والإحصائيات
        units_count: editProjectForm.unitsCount,
        electricity_meters: editProjectForm.electricityMetersCount,
        water_meters: editProjectForm.waterMetersCount,
        building_permits: editProjectForm.buildingPermitsCount,
        occupancy_certificates: editProjectForm.occupancyCertificatesCount,
        survey_decisions_count: editProjectForm.surveyDecisionsCount,
        
        // الاستشاري
        consultant_name: editProjectForm.consultant_name,
        consultant_engineer: editProjectForm.consultant_engineer,
        consultant_mobile: editProjectForm.consultant_mobile,
        
        // المياه
        water_contractor: editProjectForm.water_contractor,
        water_contractor_engineer: editProjectForm.water_contractor_engineer,
        water_contractor_mobile: editProjectForm.water_contractor_mobile,
        
        // الكهرباء
        electricity_contractor: editProjectForm.electricity_contractor,
        electricity_contractor_engineer: editProjectForm.electricity_contractor_engineer,
        electricity_contractor_mobile: editProjectForm.electricity_contractor_mobile,
    };

    const { error } = await supabase
        .from('projects')
        .update(updatePayload)
        .eq('id', selectedProject.id);

    if (!error) { 
        alert("تم حفظ البيانات بنجاح ✅"); 
        setIsEditProjectModalOpen(false); 
        fetchAllData(); 
    } else {
        console.error(error);
        alert("خطأ في الحفظ: " + error.message);
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
          plot_number: String(r['Plot Number'] || ''),
          deal_value: String(r['Deal Value'] || '0'),
          bank_name: r['Bank'] || 'أخرى',
          deed_number: String(r['Deed Number'] || ''),
          submitted_by: currentUser?.name,
          status: 'new'
        })).filter(r => r.client_name);
        const { error } = await supabase.from('clearance_requests').insert(formatted);
        if (!error) { alert(`تم رفع ${formatted.length} سجل`); setIsBulkUploadModalOpen(false); fetchAllData(); }
      } catch (err: any) { alert(err.message); }
    };
    reader.readAsBinaryString(file);
  };

  const getProjectProgress = (pName: string) => {
    const tech = technicalRequests.filter(r => r.project_name === pName);
    const clear = clearanceRequests.filter(r => r.project_name === pName);
    const total = tech.length + clear.length;
    return total > 0 ? Math.round(([...tech, ...clear].filter(r => r.status === 'completed' || r.status === 'منجز').length / total) * 100) : 0;
  };

  if (isAuthLoading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="animate-spin text-[#E95D22] w-12 h-12" /></div>;

  if (view === 'LOGIN') return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 font-cairo" dir="rtl">
      <div className="bg-[#1B2B48] w-full max-w-md rounded-[50px] shadow-2xl overflow-hidden border border-gray-100">
        <div className="p-12 text-center"><img src={DAR_LOGO} className="h-40 mx-auto mb-6" alt="Logo" /><h1 className="text-white text-3xl font-bold">بوابة المتابعة</h1></div>
        <form onSubmit={handleLogin} className="p-10 bg-white space-y-6 rounded-t-[50px]">
          <input type="email" required placeholder="البريد الإلكتروني" className="w-full p-4 bg-gray-50 rounded-2xl border outline-none font-bold" value={loginData.email} onChange={e => setLoginData({...loginData, email: e.target.value})} />
          <input type="password" required placeholder="كلمة السر" className="w-full p-4 bg-gray-50 rounded-2xl border outline-none font-bold" value={loginData.password} onChange={e => setLoginData({...loginData, password: e.target.value})} />
          <button type="submit" className="w-full bg-[#E95D22] text-white py-5 rounded-[30px] font-bold text-xl hover:brightness-110 shadow-lg">دخول النظام</button>
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
          {canAccess(['ADMIN', 'PR_MANAGER', 'CONVEYANCE', 'FINANCE']) && (
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
            <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-xl"><RefreshCw size={20} /></button>
            <h1 className="text-2xl font-bold text-[#1B2B48]">{selectedProject ? selectedProject.name : 'بوابة المشاريع'}</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-left border-r pr-6"><p className="text-sm font-bold text-[#1B2B48]">{currentUser?.name}</p><p className="text-[10px] text-[#E95D22] font-bold uppercase">{currentUser?.role}</p></div>
            <div className="w-10 h-10 bg-[#1B2B48] text-white flex items-center justify-center rounded-xl font-bold">{currentUser?.name?.[0]}</div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-12 bg-[#f8f9fa]">
          {isDbLoading ? <div className="h-full flex flex-col items-center justify-center"><Loader2 className="animate-spin text-[#E95D22] w-12 h-12" /></div> : (
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
                  {/* ... (رأس الصفحة) ... */}
                  <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="space-y-2">
                        <button onClick={() => { setSelectedProject(null); setView('DASHBOARD'); }} className="flex items-center gap-2 text-gray-400 hover:text-[#1B2B48] text-sm font-bold transition-all mb-2">
                          <ArrowLeft size={16} /> العودة للرئيسية
                        </button>
                        <div className="flex items-center gap-3">
                          <h2 className="text-4xl font-black text-[#1B2B48] tracking-tight">{selectedProject.name}</h2>
                          {canAccess(['ADMIN', 'PR_MANAGER']) && (
                            <button onClick={() => { 
                                // تحميل البيانات في الفورم من الأعمدة المباشرة
                                setEditProjectForm({
                                    // العدادات
                                    unitsCount: selectedProject['units_count'],
                                    electricityMetersCount: selectedProject['electricity_meters'],
                                    waterMetersCount: selectedProject['water_meters'],
                                    buildingPermitsCount: selectedProject['building_permits'],
                                    occupancyCertificatesCount: selectedProject['occupancy_certificates'],
                                    surveyDecisionsCount: selectedProject['survey_decisions_count'],
                                    
                                    // الاستشاري
                                    consultant_name: selectedProject['consultant_name'],
                                    consultant_engineer: selectedProject['consultant_engineer'],
                                    consultant_mobile: selectedProject['consultant_mobile'],
                                    
                                    // المياه
                                    water_contractor: selectedProject['water_contractor'],
                                    water_contractor_engineer: selectedProject['water_contractor_engineer'],
                                    water_contractor_mobile: selectedProject['water_contractor_mobile'],
                                    
                                    // الكهرباء
                                    electricity_contractor: selectedProject['electricity_contractor'],
                                    electricity_contractor_engineer: selectedProject['electricity_contractor_engineer'],
                                    electricity_contractor_mobile: selectedProject['electricity_contractor_mobile'],
                                }); 
                                setIsEditProjectModalOpen(true); 
                            }} className="p-2 text-gray-400 hover:text-[#E95D22] hover:bg-orange-50 rounded-full transition-all">
                              <Edit3 size={20} />
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-gray-400">
                          <MapPin size={16} className="text-[#E95D22]" /> 
                          <span>{selectedProject.location}</span>
                        </div>
                    </div>
                    <div className="w-full md:w-96 space-y-3">
                        <div className="flex justify-between text-[11px] font-black uppercase mb-1">
                          <span className="text-gray-400 tracking-wider">معدل الإنجاز العام</span>
                          <span className="text-[#E95D22]">{Math.round(getProjectProgress(selectedProject.name))}%</span>
                        </div>
                        <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden border border-gray-50">
                          <div className="bg-[#E95D22] h-full transition-all duration-1000 ease-in-out" style={{ width: `${getProjectProgress(selectedProject.name)}%` }} />
                        </div>
                    </div>
                  </div>

                  <div className="flex gap-4 p-1.5 bg-gray-100 rounded-[30px] w-fit shadow-inner overflow-x-auto max-w-full no-scrollbar">
                    <button onClick={() => setProjectTab('info')} className={`px-8 py-3 rounded-[25px] font-bold transition-all whitespace-nowrap ${projectTab === 'info' ? 'bg-[#1B2B48] text-white shadow-xl scale-105' : 'text-gray-500 hover:text-[#1B2B48] hover:bg-white/50'}`}>المعلومات الأساسية</button>
                    {canAccess(['ADMIN', 'PR_MANAGER', 'PR_OFFICER']) && (
                        <button onClick={() => setProjectTab('work')} className={`px-8 py-3 rounded-[25px] font-bold transition-all whitespace-nowrap ${projectTab === 'work' ? 'bg-[#1B2B48] text-white shadow-xl scale-105' : 'text-gray-500 hover:text-[#1B2B48] hover:bg-white/50'}`}>أعمال المشروع الداخلية</button>
                    )}
                    {canAccess(['ADMIN', 'PR_MANAGER', 'TECHNICAL']) && (
                        <button onClick={() => setProjectTab('tech')} className={`px-8 py-3 rounded-[25px] font-bold transition-all whitespace-nowrap ${projectTab === 'tech' ? 'bg-[#1B2B48] text-white shadow-xl scale-105' : 'text-gray-500 hover:text-[#1B2B48] hover:bg-white/50'}`}>المراجعات والطلبات الفنية</button>
                    )}
                    {canAccess(['ADMIN', 'PR_MANAGER', 'CONVEYANCE', 'FINANCE']) && (
                        <button onClick={() => setProjectTab('clearance')} className={`px-8 py-3 rounded-[25px] font-bold transition-all whitespace-nowrap ${projectTab === 'clearance' ? 'bg-[#1B2B48] text-white shadow-xl scale-105' : 'text-gray-500 hover:text-[#1B2B48] hover:bg-white/50'}`}>إجراءات الإفراغ</button>
                    )}
                  </div>

                  <div className="animate-in fade-in duration-300">
                    {projectTab === 'info' && (
                      <div className="space-y-8 animate-in fade-in duration-300">
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
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
                            {/* بطاقات الاستشاري والمقاولين (كما هي) */}
                            <div className="bg-white p-6 rounded-[30px] border border-gray-100 shadow-sm relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-2 h-full bg-[#1B2B48]"></div>
                                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-50">
                                    <div className="p-3 bg-gray-50 text-[#1B2B48] rounded-2xl"><Briefcase size={20}/></div>
                                    <h3 className="font-bold text-lg text-[#1B2B48]">المكتب الاستشاري</h3>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-400 text-xs font-bold">اسم المكتب</span>
                                        <span className="font-bold text-[#1B2B48]">{selectedProject['consultant_name'] || '-'}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-400 text-xs font-bold">المهندس المسؤول</span>
                                        <span className="font-bold text-[#1B2B48]">{selectedProject['consultant_engineer'] || '-'}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-400 text-xs font-bold">رقم التواصل</span>
                                        <span className="font-bold text-[#1B2B48] dir-ltr">{selectedProject['consultant_mobile'] || '-'}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-[30px] border border-gray-100 shadow-sm relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-2 h-full bg-amber-400"></div>
                                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-50">
                                    <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl"><Zap size={20}/></div>
                                    <h3 className="font-bold text-lg text-[#1B2B48]">مقاول الكهرباء</h3>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-400 text-xs font-bold">الجهة المنفذة</span>
                                        <span className="font-bold text-[#1B2B48]">{selectedProject['electricity_contractor'] || '-'}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-400 text-xs font-bold">المهندس المسؤول</span>
                                        <span className="font-bold text-[#1B2B48]">{selectedProject['electricity_contractor_engineer'] || '-'}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-400 text-xs font-bold">رقم التواصل</span>
                                        <span className="font-bold text-[#1B2B48] dir-ltr">{selectedProject['electricity_contractor_mobile'] || '-'}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-[30px] border border-gray-100 shadow-sm relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-2 h-full bg-cyan-400"></div>
                                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-50">
                                    <div className="p-3 bg-cyan-50 text-cyan-600 rounded-2xl"><Droplets size={20}/></div>
                                    <h3 className="font-bold text-lg text-[#1B2B48]">مقاول المياه</h3>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-400 text-xs font-bold">الجهة المنفذة</span>
                                        <span className="font-bold text-[#1B2B48]">{selectedProject['water_contractor'] || '-'}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-400 text-xs font-bold">المهندس المسؤول</span>
                                        <span className="font-bold text-[#1B2B48]">{selectedProject['water_contractor_engineer'] || '-'}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-400 text-xs font-bold">رقم التواصل</span>
                                        <span className="font-bold text-[#1B2B48] dir-ltr">{selectedProject['water_contractor_mobile'] || '-'}</span>
                                    </div>
                                </div>
                            </div>

                        </div>
                      </div>
                    )}

                    {/* ... (بقية التبويبات) ... */}
                    {projectTab === 'work' && (
                      <TechnicalModule 
                        requests={projectTechnicalRequests}
                        projects={[selectedProject]}
                        currentUser={currentUser}
                        usersList={usersList}
                        onRefresh={fetchAllData}
                        filteredByProject={selectedProject.name}
                        scopeFilter="INTERNAL_WORK"
                      />
                    )}

                    {projectTab === 'tech' && (
                      <TechnicalModule 
                        requests={projectTechnicalRequests}
                        projects={[selectedProject]}
                        currentUser={currentUser}
                        usersList={usersList}
                        onRefresh={fetchAllData}
                        filteredByProject={selectedProject.name}
                        scopeFilter="EXTERNAL"
                      />
                    )}

                    {projectTab === 'clearance' && (
                      <ClearanceModule 
                        requests={projectClearanceRequests}
                        projects={[selectedProject]}
                        currentUser={currentUser}
                        usersList={usersList}
                        onRefresh={fetchAllData}
                        filteredByProject={selectedProject.name}
                      />
                    )}
                  </div>
                </div>
              )}

              {/* ... (بقية الصفحات) ... */}
              {view === 'TECHNICAL_SERVICES' && !selectedProject && (
                  <TechnicalModule 
                    requests={technicalRequests}
                    projects={projects}
                    currentUser={currentUser}
                    usersList={usersList}
                    onRefresh={fetchAllData}
                  />
              )}

              {view === 'CONVEYANCE_SERVICES' && !selectedProject && (
                  <ClearanceModule 
                    requests={clearanceRequests}
                    projects={projects}
                    currentUser={currentUser}
                    usersList={usersList}
                    onRefresh={fetchAllData}
                  />
              )}

              {view === 'USERS' && !selectedProject && (
                  <div className="bg-white rounded-[40px] p-8 shadow-sm border border-gray-100 animate-in fade-in">
                      <h2 className="text-2xl font-black mb-6 text-[#1B2B48]">إدارة فريق العمل</h2>
                      <div className="overflow-hidden border border-gray-100 rounded-[30px]">
                        <table className="w-full text-right">
                            <thead className="bg-gray-50 border-b">
                              <tr>
                                <th className="p-6 text-xs text-gray-400 uppercase font-bold tracking-wider">الاسم</th>
                                <th className="p-6 text-xs text-gray-400 uppercase font-bold tracking-wider">البريد الإلكتروني</th>
                                <th className="p-6 text-xs text-gray-400 uppercase font-bold tracking-wider text-left">الدور</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                              {appUsers.map(u => (
                                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                                  <td className="p-6 font-bold text-[#1B2B48]">{u.name}</td>
                                  <td className="p-6 text-gray-500 font-bold">{u.email}</td>
                                  <td className="p-6 text-left">
                                    <span className="bg-indigo-50 text-indigo-700 px-4 py-1.5 rounded-full text-xs font-black shadow-sm">
                                      {u.role}
                                    </span>
                                  </td>
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

      <Modal isOpen={isEditProjectModalOpen} onClose={() => setIsEditProjectModalOpen(false)} title="تعديل تفاصيل المشروع">
        <div className="space-y-6 text-right font-cairo">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-gray-400 font-bold block mb-1">عدد الوحدات</label>
              <input type="number" className="w-full p-4 bg-gray-50 border rounded-2xl font-bold outline-none focus:border-[#E95D22] transition-all" value={editProjectForm.unitsCount || 0} onChange={e => setEditProjectForm({...editProjectForm, unitsCount: parseInt(e.target.value)})} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-400 font-bold block mb-1">عدادات الكهرباء</label>
              <input type="number" className="w-full p-4 bg-gray-50 border rounded-2xl font-bold outline-none focus:border-[#E95D22] transition-all" value={editProjectForm.electricityMetersCount || 0} onChange={e => setEditProjectForm({...editProjectForm, electricityMetersCount: parseInt(e.target.value)})} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-400 font-bold block mb-1">عدادات المياه</label>
              <input type="number" className="w-full p-4 bg-gray-50 border rounded-2xl font-bold outline-none focus:border-[#E95D22] transition-all" value={editProjectForm.waterMetersCount || 0} onChange={e => setEditProjectForm({...editProjectForm, waterMetersCount: parseInt(e.target.value)})} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-400 font-bold block mb-1">رخص البناء</label>
              <input type="number" className="w-full p-4 bg-gray-50 border rounded-2xl font-bold outline-none focus:border-[#E95D22] transition-all" value={editProjectForm.buildingPermitsCount || 0} onChange={e => setEditProjectForm({...editProjectForm, buildingPermitsCount: parseInt(e.target.value)})} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-400 font-bold block mb-1">شهادات الأشغال</label>
              <input type="number" className="w-full p-4 bg-gray-50 border rounded-2xl font-bold outline-none focus:border-[#E95D22] transition-all" value={editProjectForm.occupancyCertificatesCount || 0} onChange={e => setEditProjectForm({...editProjectForm, occupancyCertificatesCount: parseInt(e.target.value)})} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-400 font-bold block mb-1">القرارات المساحية</label>
              <input type="number" className="w-full p-4 bg-gray-50 border rounded-2xl font-bold outline-none focus:border-[#E95D22] transition-all" value={editProjectForm.surveyDecisionsCount || 0} onChange={e => setEditProjectForm({...editProjectForm, surveyDecisionsCount: parseInt(e.target.value)})} />
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4 mt-4 space-y-6">
            <h4 className="text-sm font-bold text-[#1B2B48] mb-1">بيانات الاستشاري والمقاولين</h4>
            
            {/* الاستشاري */}
            <div className="space-y-3 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <div className="flex items-center gap-2 mb-1 text-[#1B2B48] font-bold"><Briefcase size={18}/><span>المكتب الاستشاري</span></div>
                <input placeholder="اسم المكتب الاستشاري" className="w-full p-3 bg-white rounded-xl border border-gray-200 font-bold outline-none focus:border-[#E95D22]" value={editProjectForm.consultant_name || ''} onChange={e => setEditProjectForm({...editProjectForm, consultant_name: e.target.value})} />
                <div className="grid grid-cols-2 gap-3">
                    <input placeholder="المهندس المسؤول" className="w-full p-3 bg-white rounded-xl border border-gray-200 font-bold outline-none focus:border-[#E95D22]" value={editProjectForm.consultant_engineer || ''} onChange={e => setEditProjectForm({...editProjectForm, consultant_engineer: e.target.value})} />
                    <input placeholder="رقم التواصل" className="w-full p-3 bg-white rounded-xl border border-gray-200 font-bold outline-none focus:border-[#E95D22]" value={editProjectForm.consultant_mobile || ''} onChange={e => setEditProjectForm({...editProjectForm, consultant_mobile: e.target.value})} />
                </div>
            </div>

            {/* الكهرباء */}
            <div className="space-y-3 p-4 bg-amber-50/50 rounded-2xl border border-amber-100">
                 <div className="flex items-center gap-2 mb-1 text-amber-600 font-bold"><Zap size={18}/><span>مقاول الكهرباء</span></div>
                 <input placeholder="اسم شركة الكهرباء" className="w-full p-3 bg-white rounded-xl border border-gray-200 font-bold outline-none focus:border-[#E95D22]" value={editProjectForm.electricity_contractor || ''} onChange={e => setEditProjectForm({...editProjectForm, electricity_contractor: e.target.value})} />
                 <div className="grid grid-cols-2 gap-3">
                    <input placeholder="المهندس المسؤول" className="w-full p-3 bg-white rounded-xl border border-gray-200 font-bold outline-none focus:border-[#E95D22]" value={editProjectForm.electricity_contractor_engineer || ''} onChange={e => setEditProjectForm({...editProjectForm, electricity_contractor_engineer: e.target.value})} />
                    <input placeholder="رقم التواصل" className="w-full p-3 bg-white rounded-xl border border-gray-200 font-bold outline-none focus:border-[#E95D22]" value={editProjectForm.electricity_contractor_mobile || ''} onChange={e => setEditProjectForm({...editProjectForm, electricity_contractor_mobile: e.target.value})} />
                </div>
            </div>

            {/* المياه */}
            <div className="space-y-3 p-4 bg-cyan-50/50 rounded-2xl border border-cyan-100">
                 <div className="flex items-center gap-2 mb-1 text-cyan-600 font-bold"><Droplets size={18}/><span>مقاول المياه</span></div>
                 <input placeholder="اسم شركة المياه" className="w-full p-3 bg-white rounded-xl border border-gray-200 font-bold outline-none focus:border-[#E95D22]" value={editProjectForm.water_contractor || ''} onChange={e => setEditProjectForm({...editProjectForm, water_contractor: e.target.value})} />
                 <div className="grid grid-cols-2 gap-3">
                    <input placeholder="المهندس المسؤول" className="w-full p-3 bg-white rounded-xl border border-gray-200 font-bold outline-none focus:border-[#E95D22]" value={editProjectForm.water_contractor_engineer || ''} onChange={e => setEditProjectForm({...editProjectForm, water_contractor_engineer: e.target.value})} />
                    <input placeholder="رقم التواصل" className="w-full p-3 bg-white rounded-xl border border-gray-200 font-bold outline-none focus:border-[#E95D22]" value={editProjectForm.water_contractor_mobile || ''} onChange={e => setEditProjectForm({...editProjectForm, water_contractor_mobile: e.target.value})} />
                </div>
            </div>

          </div>

          <button onClick={handleUpdateProjectDetails} className="w-full bg-[#1B2B48] text-white py-5 rounded-[25px] font-black shadow-xl mt-4 hover:brightness-110 hover:-translate-y-1 transition-all active:scale-95">حفظ التغييرات</button>
        </div>
      </Modal>

      <Modal isOpen={isBulkUploadModalOpen} onClose={() => setIsBulkUploadModalOpen(false)} title="رفع بيانات إفراغ جماعية">
        <div className="space-y-4 text-right font-cairo">
          <div>
            <label className="text-gray-400 text-xs font-bold block mb-2 mr-1">المشروع المستهدف</label>
            <select className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-200 outline-none font-bold focus:border-[#E95D22] transition-all appearance-none" value={bulkProject} onChange={e => setBulkProject(e.target.value)}>
              <option value="">اختر مشروعاً...</option>
              {projects.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
            </select>
          </div>
          <div className="border-2 border-dashed border-gray-200 rounded-[30px] p-12 text-center bg-gray-50 hover:border-[#E95D22] transition-all group cursor-pointer">
            <input type="file" accept=".xlsx,.xls" onChange={handleExcelImport} className="hidden" id="excel-upload" />
            <label htmlFor="excel-upload" className="cursor-pointer flex flex-col items-center">
              <div className="p-5 bg-white rounded-full shadow-sm mb-4 group-hover:scale-110 transition-transform">
                <FileUp className="w-10 h-10 text-[#E95D22]" />
              </div>
              <p className="text-lg font-black text-[#1B2B48] mb-1">اختر ملف Excel</p>
              <p className="text-sm font-bold text-gray-400 tracking-tight">اضغط هنا أو قم بسحب وإفلات الملف</p>
            </label>
          </div>
        </div>
      </Modal>

    </div>
  );
};

const App: React.FC = () => <ErrorBoundary><AppContent /></ErrorBoundary>;
export default App;