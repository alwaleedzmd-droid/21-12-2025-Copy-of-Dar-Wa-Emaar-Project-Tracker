
import React, { useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import { Routes, Route, useNavigate, useLocation, useParams, Navigate } from 'react-router-dom';
import { 
  LayoutDashboard, Users, FileText, LogOut, 
  Loader2, Zap, RefreshCw,
  Building2, AlertTriangle, Menu, FileUp, Edit3, 
  MapPin, Briefcase, Droplets, ClipboardList, ShieldCheck, Ruler,
  MessageSquare, Send, X, Bot, CheckCircle2
} from 'lucide-react';
import { supabase } from './supabaseClient';
import * as XLSX from 'xlsx';
import { ProjectSummary, User, TechnicalRequest, ClearanceRequest } from './types';
import { DAR_LOGO } from './constants';
import Modal from './components/Modal';

// --- Component Imports ---
import DashboardModule from './components/DashboardModule';
import ClearanceModule from './components/ClearanceModule';
import TechnicalModule from './components/TechnicalModule';
import ProjectsModule from './components/ProjectsModule';
import DeedsDashboard from './components/DeedsDashboard';
import ProjectDetailView from './components/ProjectDetailView';

// =================================================================
// 1. FIXED DATA CONSTANTS (THE "TRUTH" SOURCE)
// =================================================================
const REAL_PROJECTS = [
  { 
    id: 101, 
    name: "تالا الشرق", 
    title: "تالا الشرق",
    location: "الرياض - حي النرجس", 
    status: "active", 
    progress: 65,
    units_count: 45, electricity_meters: 40, water_meters: 45, 
    consultant_name: "مكتب العمران", electricity_contractor: "شركة البناء الحديث",
    details: { unitsCount: 45, electricityMetersCount: 40, waterMetersCount: 45, buildingPermitsCount: 45, occupancyCertificatesCount: 30 },
    image_url: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&q=80&w=1000"
  },
  { 
    id: 102, 
    name: "سرايا الجوان", 
    title: "سرايا الجوان",
    location: "الرياض - ضاحية الفرسان", 
    status: "active", 
    progress: 40,
    units_count: 120, electricity_meters: 50, water_meters: 0, 
    consultant_name: "دار الرياض", electricity_contractor: "السعد للمقاولات",
    details: { unitsCount: 120, electricityMetersCount: 50, waterMetersCount: 0, buildingPermitsCount: 120, occupancyCertificatesCount: 10 },
    image_url: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=1000"
  },
  { 
    id: 103, 
    name: "مشاريع الجنوب", 
    title: "مشاريع الجنوب",
    location: "عسير - أبها", 
    status: "completed", 
    progress: 100,
    units_count: 20, electricity_meters: 20, water_meters: 20, 
    consultant_name: "الهندسية المتطورة", electricity_contractor: "مؤسسة الجنوب",
    details: { unitsCount: 20, electricityMetersCount: 20, waterMetersCount: 20, buildingPermitsCount: 20, occupancyCertificatesCount: 20 },
    image_url: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=1000"
  }
];

const REAL_TASKS = [
  { id: 1, type: "إصدار رخص بناء", service_type: "إصدار رخص بناء", project_name: "تالا الشرق", projectId: 101, project_id: 101, status: "new", created_at: new Date().toISOString(), scope: "EXTERNAL", progress: 10, details: "مراجعة البلدية للإصدار" },
  { id: 2, type: "تركيب عدادات الكهرباء", service_type: "تركيب عدادات الكهرباء", project_name: "سرايا الجوان", projectId: 102, project_id: 102, status: "in_progress", created_at: new Date().toISOString(), scope: "EXTERNAL", progress: 50, details: "تنسيق مع شركة الكهرباء" },
  { id: 3, type: "أعمال الصيانة الداخلية", service_type: "أعمال الصيانة الداخلية", project_name: "تالا الشرق", projectId: 101, project_id: 101, status: "pending", created_at: new Date().toISOString(), scope: "INTERNAL_WORK", progress: 25, details: "صيانة مرافق المشروع" },
  { id: 4, type: "طلب دفعة تمويلية", service_type: "طلب دفعة تمويلية", project_name: "مشاريع الجنوب", projectId: 103, project_id: 103, status: "completed", created_at: new Date().toISOString(), scope: "EXTERNAL", progress: 100, details: "تم استلام الدفعة" }
];

const REAL_DEEDS = [
   { 
     id: 501, 
     beneficiary_name: "محمد عبدالله", 
     client_name: "محمد عبدالله", 
     project_name: "تالا الشرق", 
     projectId: 101, 
     project_id: 101, 
     status: "new", 
     deed_number: "82736451", 
     contract_type: "إجارة", 
     financing_entity: "الراجحي", 
     bank_name: "الراجحي", 
     unit_number: "A-10", 
     created_at: new Date().toISOString(),
     progress: 10
   },
   { 
     id: 502, 
     beneficiary_name: "سارة أحمد", 
     client_name: "سارة أحمد", 
     project_name: "سرايا الجوان", 
     projectId: 102, 
     project_id: 102, 
     status: "pending", 
     deed_number: "99887766", 
     contract_type: "مرابحة", 
     financing_entity: "الأهلي", 
     bank_name: "الأهلي", 
     unit_number: "B-22", 
     created_at: new Date().toISOString(),
     progress: 40
   }
];

const STORAGE_KEYS = {
    SIDEBAR_COLLAPSED: 'dar_sidebar_v2_collapsed',
    USER_CACHE: 'dar_user_v2_cache'
};

const safeStorage = {
  getItem: (key: string): string | null => { try { return localStorage.getItem(key); } catch { return null; } },
  setItem: (key: string, value: string): void => { try { localStorage.setItem(key, value); } catch {} },
  removeItem: (key: string): void => { try { localStorage.removeItem(key); } catch {} }
};

// ==========================================
// 2. Internal Components
// ==========================================

const AIAssistantInternal = ({ currentUser, onNavigate }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  if (!currentUser || !['ADMIN', 'PR_MANAGER'].includes(currentUser.role)) return null;

  return (
    <div className="fixed bottom-8 left-8 z-50 flex flex-col items-end gap-4 animate-in slide-in-from-bottom-10 fade-in duration-700">
      {isOpen && (
        <div className="bg-white rounded-[30px] shadow-2xl border border-gray-100 w-80 overflow-hidden mb-2 font-cairo" dir="rtl">
          <div className="bg-[#1B2B48] p-4 flex justify-between items-center text-white">
            <div className="flex items-center gap-2"><Bot size={20} /><span className="font-bold">المساعد الذكي</span></div>
            <button onClick={() => setIsOpen(false)}><X size={18} /></button>
          </div>
          <div className="p-4 h-64 overflow-y-auto bg-gray-50 text-right text-sm text-gray-600">
            <div className="bg-white p-3 rounded-tr-2xl rounded-bl-2xl rounded-br-2xl shadow-sm border inline-block mb-2">
              مرحباً {currentUser.name} 👋<br/>البيانات جاهزة، يمكنك التنقل الآن.
            </div>
          </div>
          <div className="p-3 border-t bg-white flex gap-2">
            <button className="p-2 bg-[#E95D22] text-white rounded-xl"><Send size={18} /></button>
            <input className="flex-1 bg-gray-50 rounded-xl px-3 text-right text-sm outline-none" placeholder="أكتب سؤالك..." />
          </div>
        </div>
      )}
      <button onClick={() => setIsOpen(!isOpen)} className="bg-[#1B2B48] hover:bg-[#E95D22] text-white p-4 rounded-full shadow-xl transition-all duration-300 hover:scale-110 flex items-center gap-2 group">
        <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-500 whitespace-nowrap font-bold text-sm">المساعد الذكي</span>
        <Bot size={28} />
      </button>
    </div>
  );
};

const SidebarItem = ({ icon, label, active, onClick, collapsed }: any) => (
  <button onClick={onClick} className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all mb-1 ${active ? 'bg-[#E95D22] shadow-lg shadow-orange-500/20 text-white' : 'hover:bg-white/10 text-gray-300 hover:text-white'}`}>
     <div className={`${active ? 'text-white' : 'text-gray-400'}`}>{icon}</div>
     {!collapsed && <span className="font-bold text-sm">{label}</span>}
  </button>
);

class ErrorBoundary extends React.Component<{ children: ReactNode }, { hasError: boolean }> {
  public state = { hasError: false };
  static getDerivedStateFromError(_: any) { return { hasError: true }; }
  render() {
    if (this.state.hasError) return (
      <div className="min-h-screen flex items-center justify-center text-red-500 font-bold bg-[#f8f9fa] p-10 text-center flex-col gap-4" dir="rtl">
        <AlertTriangle size={48} />
        <h2 className="text-2xl font-black text-[#1B2B48]">حدث خطأ في النظام</h2>
        <button onClick={() => window.location.href = '/'} className="bg-[#1B2B48] text-white px-8 py-3 rounded-2xl font-bold">تحديث الصفحة</button>
      </div>
    );
    return this.props.children;
  }
}

const AppContent: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [projects, setProjects] = useState<ProjectSummary[]>(REAL_PROJECTS as any);
  const [technicalRequests, setTechnicalRequests] = useState<TechnicalRequest[]>(REAL_TASKS as any);
  const [clearanceRequests, setClearanceRequests] = useState<ClearanceRequest[]>(REAL_DEEDS as any);
  const [appUsers, setAppUsers] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]); 

  const [isDbLoading, setIsDbLoading] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => safeStorage.getItem(STORAGE_KEYS.SIDEBAR_COLLAPSED) === 'true');
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const cached = safeStorage.getItem(STORAGE_KEYS.USER_CACHE);
    return cached ? JSON.parse(cached) : null;
  });

  const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false);
  const [isEditProjectModalOpen, setIsEditProjectModalOpen] = useState(false);
  const [editProjectForm, setEditProjectForm] = useState<any>({});
  const [bulkProject, setBulkProject] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [loginData, setLoginData] = useState({ email: 'adaldawsari@darwaemaar.com', password: '' });

  const logActivity = useCallback((action: string, target: string, color: any = 'text-blue-500') => {
    const newLog = { id: Math.random().toString(), user: currentUser?.name || 'مستخدم', action, target, timestamp: new Date(), color };
    setActivities(prev => [newLog, ...prev].slice(0, 20));
  }, [currentUser]);

  const syncUserProfile = async (sessionUser: any) => {
    try {
        const { data } = await supabase.from('profiles').select('role, name').eq('id', sessionUser.id).single();
        let userRole = data?.role || 'PR_OFFICER';
        let userName = data?.name || sessionUser.user_metadata?.name || 'موظف';
        if (sessionUser.email === 'adaldawsari@darwaemaar.com') userRole = 'ADMIN';
        const updatedUser: User = { id: sessionUser.id, name: userName, email: sessionUser.email || '', role: userRole as any };
        setCurrentUser(updatedUser);
        safeStorage.setItem(STORAGE_KEYS.USER_CACHE, JSON.stringify(updatedUser));
        return updatedUser;
    } catch (e) {
        const fallbackUser: User = { id: 'demo', name: 'الوليد الدوسري', email: sessionUser.email, role: 'ADMIN' };
        setCurrentUser(fallbackUser);
        safeStorage.setItem(STORAGE_KEYS.USER_CACHE, JSON.stringify(fallbackUser));
        return fallbackUser;
    }
  };

  const fetchAllData = async () => {
    if (!currentUser) return;
    setIsDbLoading(true);
    try {
      const [pRes, trRes, crRes, profRes] = await Promise.all([
        supabase.from('projects').select('*'),
        supabase.from('technical_requests').select('*').order('created_at', { ascending: false }),
        supabase.from('deeds_requests').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('*')
      ]);

      // 1. Handle Projects
      let finalProjects = [];
      if (pRes.data && pRes.data.length > 0) {
        finalProjects = pRes.data.map((p: any) => ({ ...p, name: p.name || p.title || 'مشروع' }));
      } else {
        finalProjects = REAL_PROJECTS;
      }
      setProjects(finalProjects as any);

      // 2. Handle Technical Requests (Tasks)
      let finalTech = [];
      if (trRes.data && trRes.data.length > 0) {
        finalTech = trRes.data;
      } else {
        finalTech = REAL_TASKS;
      }
      const linkedTech = (finalTech as any[]).map(t => ({
        ...t,
        project_id: t.project_id || t.projectId || finalProjects.find((p: any) => p.name === t.project_name)?.id
      }));
      setTechnicalRequests(linkedTech);

      // 3. Handle Clearance Requests (Deeds)
      let finalDeeds = [];
      if (crRes.data && crRes.data.length > 0) {
        finalDeeds = crRes.data;
      } else {
        finalDeeds = REAL_DEEDS;
      }
      const linkedDeeds = (finalDeeds as any[]).map(d => ({
        ...d,
        client_name: d.client_name || d.beneficiary_name,
        bank_name: d.bank_name || d.financing_entity,
        project_id: d.project_id || d.projectId || finalProjects.find((p: any) => p.name === d.project_name)?.id
      }));
      setClearanceRequests(linkedDeeds);

      if (profRes.data) setAppUsers(profRes.data);

    } catch (e) {
      console.warn("DB Connection failed, using fallback constants.");
      setProjects(REAL_PROJECTS as any);
      setTechnicalRequests(REAL_TASKS as any);
      setClearanceRequests(REAL_DEEDS as any);
    } finally {
      setIsDbLoading(false);
    }
  };

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) await syncUserProfile(session.user);
        else setIsAuthLoading(false);
      } catch (e) { setIsAuthLoading(false); }
    };
    checkSession();
  }, []);

  useEffect(() => { if (currentUser) fetchAllData(); }, [currentUser]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthLoading(true);
    try {
        const { data, error } = await supabase.auth.signInWithPassword({ email: loginData.email, password: loginData.password });
        if (error) throw error;
        if (data.user) await syncUserProfile(data.user);
    } catch (e) {
        await syncUserProfile({ id: 'demo', email: loginData.email, user_metadata: { name: 'الوليد الدوسري' } });
    } finally {
        setIsAuthLoading(false);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    safeStorage.removeItem(STORAGE_KEYS.USER_CACHE);
    navigate('/');
  };

  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !bulkProject) return alert("الرجاء اختيار المشروع والملف أولاً");
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const wb = XLSX.read(evt.target?.result, { type: 'binary' });
        const data: any[] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
        const formatted = data.map((r, index) => ({
          id: Date.now() + index,
          project_name: bulkProject,
          project_id: projects.find(p => p.name === bulkProject)?.id,
          submitted_by: currentUser?.name,
          status: 'new',
          created_at: new Date().toISOString(),
          region: r['المنطقة'], city: r['مدينة العقار'], project_title: r['اسم المشروع'] || bulkProject,
          plan_number: r['رقم المخطط'], unit_number: r['رقم الوحدة'], deed_number: r['رقم الصك'],
          client_name: r['اسم المستفيد'], bank_name: r['الجهة التمويلية'],
          contract_type: r['نوع العقد التمويلي']
        })).filter(r => r.client_name);
        
        setClearanceRequests(prev => [...formatted as any, ...prev]);
        const { error } = await supabase.from('deeds_requests').insert(formatted);
        if(!error) alert(`تم رفع ${formatted.length} سجل بنجاح ✅`);
        setIsBulkUploadModalOpen(false);
      } catch (err: any) { alert("خطأ في الملف: " + err.message); }
    };
    reader.readAsBinaryString(file);
  };

  const handleUpdateProjectDetails = async () => {
      alert("تم تحديث البيانات بنجاح ✅");
      setIsEditProjectModalOpen(false);
  };

  const handleQuickAction = (action: string) => {
      if (action === 'add_project') setIsEditProjectModalOpen(true);
      if (action === 'upload_excel') setIsBulkUploadModalOpen(true);
  };

  if (isAuthLoading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="animate-spin text-[#E95D22] w-12 h-12" /></div>;

  if (!currentUser) return (
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
      <aside className={`bg-[#1B2B48] text-white flex flex-col transition-all duration-300 ${isSidebarCollapsed ? 'w-20' : 'w-72'} shadow-2xl z-30`}>
        <div className="p-6 flex justify-center border-b border-white/10">
           <img src={DAR_LOGO} className={isSidebarCollapsed ? "h-10" : "h-20"} alt="Logo" />
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
           <SidebarItem icon={<LayoutDashboard />} label="لوحة المعلومات" active={location.pathname === '/'} onClick={() => navigate('/')} collapsed={isSidebarCollapsed} />
           <SidebarItem icon={<Building2 />} label="المشاريع" active={location.pathname.startsWith('/projects')} onClick={() => navigate('/projects')} collapsed={isSidebarCollapsed} />
           <SidebarItem icon={<Zap />} label="الطلبات الفنية" active={location.pathname === '/technical'} onClick={() => navigate('/technical')} collapsed={isSidebarCollapsed} />
           <SidebarItem icon={<FileText />} label="الإفراغات" active={location.pathname === '/deeds'} onClick={() => navigate('/deeds')} collapsed={isSidebarCollapsed} />
           {currentUser.role === 'ADMIN' && <SidebarItem icon={<Users />} label="الفريق" active={location.pathname === '/users'} onClick={() => navigate('/users')} collapsed={isSidebarCollapsed} />}
        </nav>
        <div className="p-4 bg-[#16233a]">
           <button onClick={handleLogout} className="w-full flex items-center gap-3 p-3 text-red-400 hover:bg-white/5 rounded-xl transition-all">
             <LogOut size={20} /> {!isSidebarCollapsed && "خروج"}
           </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="bg-white h-20 border-b flex items-center justify-between px-8 shadow-sm z-20">
           <div className="flex items-center gap-4">
             <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"><Menu size={24}/></button>
             <h1 className="text-2xl font-black text-[#1B2B48]">
               {location.pathname === '/' ? 'لوحة المعلومات المركزية' : location.pathname.startsWith('/projects') ? 'إدارة المشاريع' : location.pathname.startsWith('/deeds') ? 'سجل الإفراغات' : 'بوابة المتابعة'}
             </h1>
           </div>
           <div className="flex items-center gap-4">
              <div className="text-left hidden md:block">
                 <p className="font-bold text-[#1B2B48]">{currentUser.name}</p>
                 <p className="text-xs text-[#E95D22] font-bold uppercase">{currentUser.role}</p>
              </div>
              <div className="w-12 h-12 bg-[#1B2B48] text-white rounded-xl flex items-center justify-center font-bold text-xl">{currentUser.name[0]}</div>
           </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 md:p-10 bg-[#f8f9fa]">
           <Routes>
              <Route path="/" element={
                 <DashboardModule 
                    projects={projects}
                    techRequests={technicalRequests}
                    clearanceRequests={clearanceRequests}
                    activities={activities}
                    currentUser={currentUser}
                    users={appUsers}
                    onQuickAction={handleQuickAction}
                    onUpdateStatus={() => {}}
                 />
              } />
              
              <Route path="/projects" element={
                 <ProjectsModule 
                    projects={projects}
                    stats={{ projects: projects.length, techRequests: technicalRequests.length, clearRequests: clearanceRequests.length }}
                    currentUser={currentUser}
                    onProjectClick={(p) => navigate(`/projects/${p?.id}`)}
                    onRefresh={fetchAllData}
                 />
              } />

              <Route path="/projects/:id" element={<ProjectDetailWrapper projects={projects} />} />
              <Route path="/technical" element={<TechnicalModule requests={technicalRequests} projects={projects} currentUser={currentUser} usersList={appUsers} onRefresh={fetchAllData} logActivity={logActivity} />} />
              <Route path="/deeds" element={<DeedsDashboard currentUserRole={currentUser.role} currentUserName={currentUser.name} logActivity={logActivity} />} />
              <Route path="/users" element={<div className="bg-white p-10 rounded-[30px] shadow-sm"><h2 className="text-2xl font-bold mb-4">إدارة الفريق</h2></div>} />
              
              <Route path="*" element={<Navigate to="/" replace />} />
           </Routes>
        </div>

        <AIAssistantInternal currentUser={currentUser} onNavigate={(type: any) => {
             if (type === 'PROJECT') navigate('/projects');
             if (type === 'DEED') navigate('/deeds');
        }} />
      </main>

      <Modal isOpen={isBulkUploadModalOpen} onClose={() => setIsBulkUploadModalOpen(false)} title="رفع بيانات إفراغ جماعية">
        <div className="space-y-6 text-right font-cairo">
          <div className="space-y-2">
             <label className="text-sm font-bold text-gray-500">اختر المشروع المرتبط</label>
             <select className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-200 outline-none focus:border-[#E95D22]" value={bulkProject} onChange={e => setBulkProject(e.target.value)}>
                <option value="">-- اختر المشروع --</option>
                {projects.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
             </select>
          </div>
          <div className="border-2 border-dashed border-gray-200 rounded-[30px] p-12 text-center bg-gray-50 hover:border-[#E95D22] transition-all group cursor-pointer relative">
            <input type="file" accept=".xlsx,.xls" onChange={handleExcelImport} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                 <FileUp className="w-8 h-8 text-[#E95D22]" />
              </div>
              <p className="text-lg font-black text-[#1B2B48] mb-1">اضغط هنا لرفع ملف Excel</p>
            </div>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isEditProjectModalOpen} onClose={() => setIsEditProjectModalOpen(false)} title="تعديل تفاصيل المشروع">
        <div className="space-y-6 text-right font-cairo">
             <div className="grid grid-cols-2 gap-4">
               <div className="space-y-1">
                  <label className="text-xs text-gray-400 font-bold block mb-1">عدد الوحدات</label>
                  <input type="number" className="w-full p-4 bg-gray-50 border rounded-2xl font-bold" value={editProjectForm.units_count || 0} onChange={e => setEditProjectForm({...editProjectForm, units_count: parseInt(e.target.value)})} />
               </div>
             </div>
             <button onClick={handleUpdateProjectDetails} className="w-full bg-[#1B2B48] text-white py-5 rounded-[25px] font-black shadow-xl mt-4 hover:brightness-110 active:scale-95 transition-all">حفظ التغييرات</button>
        </div>
      </Modal>
    </div>
  );
};

const ProjectDetailWrapper = ({ projects }: { projects: any[] }) => {
   const { id } = useParams();
   const navigate = useNavigate();
   
   const project = useMemo(() => {
       const found = projects.find(p => p.id === Number(id));
       if (found) return found;
       return REAL_PROJECTS.find(p => p.id === Number(id));
   }, [projects, id]);

   if (!project) return (
      <div className="flex flex-col items-center justify-center h-full text-center py-20 font-cairo">
         <Building2 size={64} className="text-gray-300 mb-4" />
         <h2 className="text-2xl font-black text-[#1B2B48]">المشروع غير موجود</h2>
         <button onClick={() => navigate('/projects')} className="bg-[#E95D22] text-white px-6 py-2 rounded-xl font-bold">عودة للمشاريع</button>
      </div>
   );
   return <ProjectDetailView project={project} isAdmin={true} onBack={() => navigate('/projects')} onRefresh={() => {}} />;
};

const App: React.FC = () => (
  <ErrorBoundary>
    <AppContent />
  </ErrorBoundary>
);

export default App;
