
import React, { useState, useEffect, ReactNode } from 'react';
import { 
  LayoutDashboard, Users, FileText, Settings, LogOut, 
  Plus, ArrowLeft, Loader2, Send, AlertTriangle, 
  MapPin, FolderOpen, Building2, Zap, Droplets, Clock, 
  Edit3, Trash2, WalletCards, BarChart3, CheckCircle2, XCircle,
  FileSpreadsheet, RefreshCw, Archive, Bell, Search, Landmark, Phone, CreditCard, Hash, Upload, FileUp, MessageCircle,
  TrendingUp, Activity, PieChart, DollarSign, UserCheck, Shield
} from 'lucide-react';
import { supabase } from './supabaseClient';
import * as XLSX from 'xlsx';
import { 
  ProjectSummary, User, ViewState, UserRole, 
  TechnicalRequest, ClearanceRequest, AppNotification, Comment
} from './types';
import { 
  DAR_LOGO, TECHNICAL_ENTITY_MAPPING, BANKS_LIST
} from './constants';
import ProjectCard from './components/ProjectCard';
import Modal from './components/Modal';

const STORAGE_KEYS = {
    SIDEBAR_COLLAPSED: 'dar_sidebar_v2_collapsed',
    USER_CACHE: 'dar_user_v2_cache'
};

const safeStorage = {
  getItem: (key: string): string | null => {
    try { return localStorage.getItem(key); } catch { return null; }
  },
  setItem: (key: string, value: string): void => {
    try { localStorage.setItem(key, value); } catch {}
  },
  removeItem: (key: string): void => {
    try { localStorage.removeItem(key); } catch {}
  }
};

class ErrorBoundary extends React.Component<{children?: ReactNode}, {hasError: boolean}> {
  public state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 text-center font-cairo" dir="rtl">
          <div className="bg-white p-12 rounded-[40px] shadow-2xl max-w-md border border-red-100">
            <AlertTriangle className="w-20 h-20 text-red-500 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-gray-800 mb-4">عذراً، حدث خطأ غير متوقع</h2>
            <button onClick={() => window.location.reload()} className="bg-[#1B2B48] text-white px-10 py-4 rounded-2xl font-bold transition-transform hover:scale-105">تحديث الصفحة</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const AppContent: React.FC = () => {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [technicalRequests, setTechnicalRequests] = useState<TechnicalRequest[]>([]);
  const [clearanceRequests, setClearanceRequests] = useState<ClearanceRequest[]>([]);
  const [appUsers, setAppUsers] = useState<User[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isDbLoading, setIsDbLoading] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => safeStorage.getItem(STORAGE_KEYS.SIDEBAR_COLLAPSED) === 'true');
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const cached = safeStorage.getItem(STORAGE_KEYS.USER_CACHE);
    return cached ? JSON.parse(cached) : null;
  });

  const [view, setView] = useState<ViewState>('LOGIN');
  const [selectedProject, setSelectedProject] = useState<ProjectSummary | null>(null);
  const [projectTab, setProjectTab] = useState<'info' | 'tech' | 'clearance'>('info');
  
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [loginData, setLoginData] = useState({ email: 'adaldawsari@darwaemaar.com', password: '' });

  // Modals
  const [isTechModalOpen, setIsTechModalOpen] = useState(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);

  // Forms
  const [techForm, setTechForm] = useState({ project_name: '', entity: '', service_type: '', requesting_entity: '', assigned_to: '', details: '' });
  const [clearForm, setClearForm] = useState({ client_name: '', mobile: '', id_number: '', project_name: '', plot_number: '', deal_value: '', bank_name: '', deed_number: '' });
  const [projectForm, setProjectForm] = useState({ name: '', location: 'الرياض', unitsCount: 0, electricityMetersCount: 0, waterMetersCount: 0 });
  
  const [bulkProject, setBulkProject] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Management State
  const [activeRequest, setActiveRequest] = useState<TechnicalRequest | ClearanceRequest | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');

  const filteredTech = selectedProject ? technicalRequests.filter(r => r.project_name === selectedProject.name) : [];
  const filteredClear = selectedProject ? clearanceRequests.filter(r => r.project_name === selectedProject.name) : [];

  const stats = {
    projects: projects.length,
    techRequests: technicalRequests.length,
    clearRequests: clearanceRequests.length,
  };

  useEffect(() => {
    safeStorage.setItem(STORAGE_KEYS.SIDEBAR_COLLAPSED, String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  const syncUserProfile = async (sessionUser: any) => {
    const { data } = await supabase.from('profiles').select('role, name').eq('id', sessionUser.id).single();
    let userRole: UserRole = data?.role || 'PR_OFFICER';
    let userName: string = data?.name || sessionUser.user_metadata?.name || 'موظف';
    if (sessionUser.email === 'adaldawsari@darwaemaar.com') userRole = 'ADMIN';
    const updatedUser: User = { id: sessionUser.id, name: userName, email: sessionUser.email || '', role: userRole };
    setCurrentUser(updatedUser);
    safeStorage.setItem(STORAGE_KEYS.USER_CACHE, JSON.stringify(updatedUser));
    return updatedUser;
  };

  const fetchAllData = async () => {
    if (!currentUser) return;
    setIsDbLoading(true);
    try {
      const [pRes, trRes, crRes, uRes, nRes] = await Promise.all([
        supabase.from('projects').select('*'),
        supabase.from('technical_requests').select('*').order('created_at', { ascending: false }),
        supabase.from('clearance_requests').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('id, name, email, role'),
        supabase.from('notifications').select('*').eq('user_id', currentUser.id).order('created_at', { ascending: false }).limit(5)
      ]);

      if (pRes.data) {
        const mappedProjects = pRes.data.map((p: any) => ({
          ...p,
          // FIX: Use p.client as primary, fallback to p.title
          name: p.client || p.title || 'مشروع بدون اسم'
        }));
        setProjects(mappedProjects);
      }
      if (trRes.data) setTechnicalRequests(trRes.data);
      if (crRes.data) setClearanceRequests(crRes.data);
      if (uRes.data) {
        setAppUsers(uRes.data as User[]);
        setUsersList(uRes.data);
      }
      if (nRes.data) setNotifications(nRes.data);
    } catch (e) { console.error(e); } finally { setIsDbLoading(false); }
  };

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await syncUserProfile(session.user);
        setView('DASHBOARD');
      } else setView('LOGIN');
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
    else if (data.user) { await syncUserProfile(data.user); setView('DASHBOARD'); setIsAuthLoading(false); }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    safeStorage.removeItem(STORAGE_KEYS.USER_CACHE);
    setView('LOGIN');
  };

  // PROJECT MANAGEMENT
  const handleCreateProject = async () => {
    if (!projectForm.name) return alert("يرجى إدخال اسم المشروع");
    const { error } = await supabase.from('projects').insert([{
      client: projectForm.name,
      location: projectForm.location,
      details: {
        unitsCount: projectForm.unitsCount,
        electricityMetersCount: projectForm.electricityMetersCount,
        waterMetersCount: projectForm.waterMetersCount
      }
    }]);
    if (error) alert(error.message);
    else {
      alert("تمت إضافة المشروع بنجاح");
      setIsNewProjectModalOpen(false);
      setProjectForm({ name: '', location: 'الرياض', unitsCount: 0, electricityMetersCount: 0, waterMetersCount: 0 });
      fetchAllData();
    }
  };

  const handleDeleteProject = async (id: string, name: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف المشروع "${name}" نهائياً؟`)) return;
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) alert(error.message);
    else {
      alert("تم حذف المشروع");
      fetchAllData();
    }
  };

  const handleTechSubmit = async () => {
    if (!techForm.project_name || !techForm.entity) return alert("يرجى إكمال البيانات الأساسية");
    const { error } = await supabase.from('technical_requests').insert([{ ...techForm, submitted_by: currentUser?.name, status: 'pending' }]);
    if (error) alert(error.message);
    else { alert("تمت الإضافة بنجاح"); setIsTechModalOpen(false); setTechForm({ project_name: '', entity: '', service_type: '', requesting_entity: '', assigned_to: '', details: '' }); fetchAllData(); }
  };

  const handleClearanceSubmit = async () => {
    if (!clearForm.client_name || !clearForm.project_name) return alert("الاسم والمشروع ضروريان");
    const { error } = await supabase.from('clearance_requests').insert([{ ...clearForm, submitted_by: currentUser?.name, status: 'new' }]);
    if (error) alert(error.message);
    else { alert("تمت إضافة طلب الإفراغ"); setIsClearModalOpen(false); setClearForm({ client_name: '', mobile: '', id_number: '', project_name: '', plot_number: '', deal_value: '', bank_name: '', deed_number: '' }); fetchAllData(); }
  };

  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !bulkProject) return alert("اختر المشروع أولاً");
    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const data: any[] = XLSX.utils.sheet_to_json(wb.Sheets[wsname]);
        if (data.length === 0) throw new Error("الملف فارغ");
        const formatted = data.map(r => ({
          client_name: r['Client Name'] || r['اسم العميل'] || '',
          mobile: String(r['Mobile'] || r['رقم الجوال'] || ''),
          id_number: String(r['ID Number'] || r['رقم الهوية'] || ''),
          project_name: bulkProject,
          plot_number: String(r['Plot Number'] || r['رقم القطعة'] || ''),
          deal_value: String(r['Deal Value'] || r['قيمة الصفقة'] || '0'),
          bank_name: r['Bank'] || r['البنك'] || 'أخرى',
          deed_number: String(r['Deed Number'] || r['رقم الصك'] || ''),
          submitted_by: currentUser?.name,
          status: 'new'
        }));
        const { error } = await supabase.from('clearance_requests').insert(formatted);
        if (error) throw error;
        alert(`تم استيراد ${formatted.length} سجلات`);
        setIsBulkUploadModalOpen(false); fetchAllData();
      } catch (err: any) { alert("فشل الاستيراد: " + err.message); } finally { setIsUploading(false); e.target.value = ''; }
    };
    reader.readAsBinaryString(file);
  };

  const openManageRequest = async (req: TechnicalRequest | ClearanceRequest) => {
    setActiveRequest(req);
    setIsManageModalOpen(true);
    const { data } = await supabase.from('comments').select('*').eq('request_id', req.id).order('created_at', { ascending: true });
    setComments(data || []);
  };

  const postComment = async () => {
    if (!newComment.trim() || !activeRequest) return;
    const { data, error } = await supabase.from('comments').insert([{ request_id: activeRequest.id, text: newComment, author: currentUser?.name, author_role: currentUser?.role }]).select().single();
    if (!error && data) { setComments([...comments, data]); setNewComment(''); }
  };

  const toggleStatus = async () => {
    if (!activeRequest) return;
    const newStatus = activeRequest.status === 'completed' ? 'pending' : 'completed';
    const table = 'client_name' in activeRequest ? 'clearance_requests' : 'technical_requests';
    const { error } = await supabase.from(table).update({ status: newStatus }).eq('id', activeRequest.id);
    if (!error) { setActiveRequest({ ...activeRequest, status: newStatus } as any); fetchAllData(); }
  };

  const updateRequestDelegation = async (newAssignee: string) => {
    if (!activeRequest) return;
    const table = 'client_name' in activeRequest ? 'clearance_requests' : 'technical_requests';
    const { error } = await supabase.from(table).update({ assigned_to: newAssignee }).eq('id', activeRequest.id);
    if (!error) { setActiveRequest({ ...activeRequest, assigned_to: newAssignee } as any); fetchAllData(); }
  };

  const getProjectProgress = (projectName: string) => {
    const tech = technicalRequests.filter(r => r.project_name === projectName);
    const clear = clearanceRequests.filter(r => r.project_name === projectName);
    const total = tech.length + clear.length;
    const completed = [...tech, ...clear].filter(r => r.status === 'completed').length;
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  };

  if (isAuthLoading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="animate-spin text-[#E95D22] w-12 h-12" /></div>;

  if (view === 'LOGIN') return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 font-cairo" dir="rtl">
      <div className="bg-[#1B2B48] w-full max-w-md rounded-[50px] shadow-2xl overflow-hidden border border-gray-100">
        <div className="p-12 text-center">
          <img src={DAR_LOGO} className="h-40 mx-auto mb-6" alt="Logo" />
          <h1 className="text-white text-3xl font-bold">بوابة المتابعة</h1>
          <p className="text-gray-400 mt-2">نظام إدارة المشاريع - دار وإعمار</p>
        </div>
        <form onSubmit={handleLogin} className="p-10 bg-white space-y-6 rounded-t-[50px]">
          <div>
            <label className="text-xs font-bold text-gray-400 block mb-2">البريد الإلكتروني</label>
            <input type="email" required className="w-full p-4 bg-gray-50 rounded-2xl border outline-none focus:border-[#E95D22]" value={loginData.email} onChange={e => setLoginData({...loginData, email: e.target.value})} />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-400 block mb-2">كلمة السر</label>
            <input type="password" required className="w-full p-4 bg-gray-50 rounded-2xl border outline-none focus:border-[#E95D22]" value={loginData.password} onChange={e => setLoginData({...loginData, password: e.target.value})} />
          </div>
          <button type="submit" className="w-full bg-[#E95D22] text-white py-5 rounded-[30px] font-bold text-xl hover:brightness-110 shadow-lg transition-all">دخول النظام</button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#f8f9fa] font-cairo overflow-hidden" dir="rtl">
      {/* Sidebar */}
      <aside className={`bg-[#1B2B48] text-white flex flex-col transition-all duration-300 ${isSidebarCollapsed ? 'w-24' : 'w-72 shadow-2xl z-30'}`}>
        <div className="p-8 border-b border-white/5 flex flex-col items-center">
          <img src={DAR_LOGO} className={isSidebarCollapsed ? 'h-10' : 'h-24'} alt="Logo" />
        </div>
        <nav className="flex-1 p-4 space-y-3">
          <button onClick={() => { setView('DASHBOARD'); setSelectedProject(null); }} className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${view === 'DASHBOARD' && !selectedProject ? 'bg-[#E95D22] shadow-lg' : 'text-gray-400 hover:bg-white/5'}`}>
            <LayoutDashboard size={22} /> {!isSidebarCollapsed && 'لوحة المشاريع'}
          </button>
          <button onClick={() => { setView('TECHNICAL_SERVICES'); setSelectedProject(null); }} className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${view === 'TECHNICAL_SERVICES' ? 'bg-[#E95D22] shadow-lg' : 'text-gray-400 hover:bg-white/5'}`}>
            <Zap size={22} /> {!isSidebarCollapsed && 'الطلبات الفنية'}
          </button>
          <button onClick={() => { setView('CONVEYANCE_SERVICES'); setSelectedProject(null); }} className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${view === 'CONVEYANCE_SERVICES' ? 'bg-[#E95D22] shadow-lg' : 'text-gray-400 hover:bg-white/5'}`}>
            <FileText size={22} /> {!isSidebarCollapsed && 'الإفراغات'}
          </button>
          <button onClick={() => { setView('USERS'); setSelectedProject(null); }} className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${view === 'USERS' ? 'bg-[#E95D22] shadow-lg' : 'text-gray-400 hover:bg-white/5'}`}>
            <Users size={22} /> {!isSidebarCollapsed && 'الفريق والمستخدمين'}
          </button>
        </nav>
        <div className="p-4 bg-[#16233a]">
          <button onClick={handleLogout} className="w-full flex items-center gap-4 p-4 text-red-400 hover:bg-red-500/10 rounded-2xl transition-all">
            <LogOut size={20} /> {!isSidebarCollapsed && 'تسجيل الخروج'}
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b h-20 flex items-center justify-between px-10 shrink-0 shadow-sm z-20">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-xl transition-colors">
              <RefreshCw size={20} />
            </button>
            <h1 className="text-2xl font-bold text-[#1B2B48]">
              {selectedProject ? selectedProject.name : view === 'USERS' ? 'إدارة فريق العمل' : 'بوابة مشاريع دار وإعمار'}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-left border-r pr-6">
              <p className="text-sm font-bold text-[#1B2B48]">{currentUser?.name}</p>
              <p className="text-[10px] text-[#E95D22] font-bold uppercase tracking-widest">{currentUser?.role}</p>
            </div>
            <div className="w-10 h-10 bg-[#1B2B48] text-white flex items-center justify-center rounded-xl font-bold shadow-sm border border-white/10 uppercase">
              {currentUser?.name[0]}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-12 bg-[#f8f9fa]">
          {isDbLoading ? (
            <div className="h-full flex flex-col items-center justify-center animate-pulse">
              <Loader2 className="animate-spin text-[#E95D22] w-12 h-12" />
              <p className="text-gray-400 mt-4 font-bold">جاري المزامنة مع قاعدة البيانات...</p>
            </div>
          ) : (
            <div className="max-w-7xl mx-auto space-y-8">
              
              {/* Dashboard View */}
              {view === 'DASHBOARD' && !selectedProject && (
                <>
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-[#1B2B48]">ملخص الحالة العامة</h2>
                    {currentUser?.role === 'ADMIN' && (
                      <button onClick={() => setIsNewProjectModalOpen(true)} className="bg-[#1B2B48] text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:brightness-110 shadow-lg transition-all">
                        <Plus size={18} /> إضافة مشروع جديد
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
                    <div className="bg-white p-6 rounded-[30px] shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
                      <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl"><PieChart size={24} /></div>
                      <div>
                        <p className="text-xs font-bold text-gray-400 uppercase">إجمالي المشاريع</p>
                        <p className="text-2xl font-black text-[#1B2B48]">{stats.projects}</p>
                      </div>
                    </div>
                    <div className="bg-white p-6 rounded-[30px] shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
                      <div className="p-4 bg-amber-50 text-amber-600 rounded-2xl"><Zap size={24} /></div>
                      <div>
                        <p className="text-xs font-bold text-gray-400 uppercase">الطلبات الفنية</p>
                        <p className="text-2xl font-black text-[#1B2B48]">{stats.techRequests}</p>
                      </div>
                    </div>
                    <div className="bg-white p-6 rounded-[30px] shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
                      <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl"><FileText size={24} /></div>
                      <div>
                        <p className="text-xs font-bold text-gray-400 uppercase">طلبات الإفراغ</p>
                        <p className="text-2xl font-black text-[#1B2B48]">{stats.clearRequests}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 animate-in fade-in slide-in-from-bottom-2">
                    {projects.map(p => (
                      <div key={p.id} className="relative group">
                        <ProjectCard 
                          project={{...p, progress: getProjectProgress(p.name)}} 
                          onClick={(proj) => { setSelectedProject(proj); setView('PROJECT_DETAIL'); }} 
                          onTogglePin={() => {}} 
                        />
                        {currentUser?.role === 'ADMIN' && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDeleteProject(p.id, p.name); }}
                            className="absolute bottom-6 left-6 z-20 p-2.5 bg-red-50 text-red-500 rounded-xl opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:text-white transition-all shadow-md"
                            title="حذف المشروع"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Users View */}
              {view === 'USERS' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
                   <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm flex justify-between items-center">
                      <div>
                        <h2 className="text-3xl font-black text-[#1B2B48]">فريق العمل</h2>
                        <p className="text-gray-400 font-bold mt-1">عرض وإدارة صلاحيات الموظفين والمستخدمين</p>
                      </div>
                      <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl"><Shield size={32} /></div>
                   </div>

                   <div className="bg-white rounded-[40px] border border-gray-100 overflow-hidden shadow-sm">
                      <table className="w-full text-right">
                        <thead className="bg-gray-50 border-b">
                          <tr>
                            <th className="p-6 text-xs font-bold text-gray-400">الاسم</th>
                            <th className="p-6 text-xs font-bold text-gray-400">البريد الإلكتروني</th>
                            <th className="p-6 text-xs font-bold text-gray-400">الدور الوظيفي</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {appUsers.map(u => (
                            <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                              <td className="p-6">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-indigo-100 text-indigo-700 rounded-xl flex items-center justify-center font-bold">{u.name[0]}</div>
                                  <span className="font-bold text-[#1B2B48]">{u.name}</span>
                                </div>
                              </td>
                              <td className="p-6 text-sm text-gray-500">{u.email}</td>
                              <td className="p-6">
                                <span className={`px-4 py-1.5 rounded-full text-[10px] font-bold shadow-sm uppercase tracking-widest ${u.role === 'ADMIN' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
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

              {/* Technical Services View */}
              {view === 'TECHNICAL_SERVICES' && (
                <div className="space-y-8">
                  <div className="flex justify-between items-center bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm">
                    <h2 className="text-3xl font-black text-[#1B2B48]">الطلبات الفنية والأعمال</h2>
                    <button onClick={() => setIsTechModalOpen(true)} className="bg-[#E95D22] text-white px-10 py-5 rounded-[25px] font-bold shadow-xl flex items-center gap-2">
                      <Plus size={20} /> إضافة طلب فني
                    </button>
                  </div>
                  <div className="bg-white rounded-[40px] border border-gray-100 overflow-hidden shadow-sm">
                    <table className="w-full text-right">
                      <thead className="bg-gray-50 border-b">
                        <tr><th className="p-6 text-xs font-bold text-gray-400">المشروع</th><th className="p-6 text-xs font-bold text-gray-400">جهة المراجعة</th><th className="p-6 text-xs font-bold text-gray-400">الخدمة</th><th className="p-6 text-xs font-bold text-gray-400">الحالة</th></tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {technicalRequests.map(r => (
                          <tr key={r.id} onClick={() => openManageRequest(r)} className="hover:bg-gray-50 cursor-pointer transition-colors border-b group">
                            <td className="p-6 font-bold text-[#1B2B48] group-hover:text-[#E95D22]">{r.project_name}</td>
                            <td className="p-6 text-sm text-gray-500">{r.entity}</td>
                            <td className="p-6 text-sm text-gray-500">{r.service_type}</td>
                            <td className="p-6"><span className={`px-4 py-1.5 rounded-full text-[10px] font-bold ${r.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{r.status === 'completed' ? 'منجز' : 'قيد المتابعة'}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Conveyance Services View */}
              {view === 'CONVEYANCE_SERVICES' && (
                <div className="space-y-8">
                  <div className="flex justify-between items-center bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm">
                    <h2 className="text-3xl font-black text-[#1B2B48]">طلبات الإفراغ العقاري</h2>
                    <div className="flex gap-4">
                      <button onClick={() => setIsBulkUploadModalOpen(true)} className="bg-white text-[#1B2B48] border border-gray-200 px-8 py-5 rounded-[25px] font-bold flex items-center gap-2"><FileUp size={20} className="text-[#E95D22]" /> استيراد إكسل</button>
                      <button onClick={() => setIsClearModalOpen(true)} className="bg-[#1B2B48] text-white px-10 py-5 rounded-[25px] font-bold shadow-xl flex items-center gap-2"><Plus size={20} /> إضافة طلب إفراغ</button>
                    </div>
                  </div>
                  <div className="bg-white rounded-[40px] border border-gray-100 overflow-hidden shadow-sm">
                    <table className="w-full text-right">
                      <thead className="bg-gray-50 border-b">
                        <tr><th className="p-6 text-xs font-bold text-gray-400">العميل</th><th className="p-6 text-xs font-bold text-gray-400">المشروع</th><th className="p-6 text-xs font-bold text-gray-400">القيمة الإجمالية</th><th className="p-6 text-xs font-bold text-gray-400">الحالة</th></tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {clearanceRequests.map(r => (
                          <tr key={r.id} onClick={() => openManageRequest(r)} className="hover:bg-gray-50 border-b cursor-pointer group">
                            <td className="p-6 font-bold text-[#1B2B48] group-hover:text-[#E95D22]">{r.client_name}</td>
                            <td className="p-6 text-sm text-gray-500">{r.project_name}</td>
                            <td className="p-6 text-sm font-bold text-green-600">{parseFloat(r.deal_value).toLocaleString()} ر.س</td>
                            <td className="p-6"><span className="px-4 py-1.5 bg-gray-100 rounded-full text-[10px] font-bold text-gray-600">{r.status === 'completed' ? 'منجز' : 'متابعة'}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Project Detail View (Embedded inside Tabs logic) */}
              {selectedProject && view === 'PROJECT_DETAIL' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 space-y-8">
                  <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="space-y-2">
                        <button onClick={() => { setSelectedProject(null); setView('DASHBOARD'); }} className="flex items-center gap-2 text-gray-400 hover:text-[#1B2B48] text-sm font-bold mb-2"><ArrowLeft size={16} /> العودة للرئيسية</button>
                        <h2 className="text-4xl font-black text-[#1B2B48]">{selectedProject.name}</h2>
                        <div className="flex items-center gap-2 text-gray-400"><MapPin size={16} className="text-[#E95D22]" /> <span>{selectedProject.location}</span></div>
                    </div>
                    <div className="w-full md:w-96 space-y-3">
                        <div className="flex justify-between text-[11px] font-black uppercase mb-1"><span className="text-gray-400">إنجاز المشروع الكلي</span><span className="text-[#E95D22]">{Math.round(getProjectProgress(selectedProject.name))}%</span></div>
                        <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden border border-gray-50"><div className="bg-[#E95D22] h-full transition-all duration-1000" style={{ width: `${getProjectProgress(selectedProject.name)}%` }} /></div>
                    </div>
                  </div>

                  <div className="flex gap-4 p-1.5 bg-gray-100 rounded-[30px] w-fit shadow-inner">
                    {(['info', 'tech', 'clearance'] as const).map(t => (
                      <button key={t} onClick={() => setProjectTab(t)} className={`px-10 py-3 rounded-[25px] font-bold transition-all ${projectTab === t ? 'bg-[#1B2B48] text-white shadow-xl scale-105' : 'text-gray-500 hover:text-[#1B2B48] hover:bg-white/50'}`}>
                        {t === 'info' ? 'لوحة المعلومات' : t === 'tech' ? 'الطلبات الفنية' : 'عمليات الإفراغ'}
                      </button>
                    ))}
                  </div>

                  {projectTab === 'info' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-in fade-in">
                        <div className="bg-white p-10 rounded-[40px] border border-gray-100 shadow-sm flex flex-col items-center">
                            <Building2 className="text-[#E95D22] mb-4" size={40} />
                            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">عدد الوحدات</p>
                            <p className="text-6xl font-black text-[#1B2B48] mt-2">{selectedProject.details?.unitsCount || 0}</p>
                        </div>
                        <div className="bg-white p-10 rounded-[40px] border border-gray-100 shadow-sm flex flex-col items-center">
                            <Zap className="text-amber-500 mb-4" size={40} />
                            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">عدادات الكهرباء</p>
                            <p className="text-6xl font-black text-[#1B2B48] mt-2">{selectedProject.details?.electricityMetersCount || 0}</p>
                        </div>
                        <div className="bg-white p-10 rounded-[40px] border border-gray-100 shadow-sm flex flex-col items-center">
                            <Droplets className="text-blue-500 mb-4" size={40} />
                            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">عدادات المياه</p>
                            <p className="text-6xl font-black text-[#1B2B48] mt-2">{selectedProject.details?.waterMetersCount || 0}</p>
                        </div>
                    </div>
                  )}

                  {projectTab === 'tech' && (
                    <div className="space-y-6">
                      <div className="flex justify-end">
                        <button onClick={() => { setTechForm({...techForm, project_name: selectedProject.name}); setIsTechModalOpen(true); }} className="bg-[#E95D22] text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2"><Plus size={18} /> إضافة طلب فني للمشروع</button>
                      </div>
                      <div className="bg-white rounded-[40px] shadow-sm border border-gray-100 overflow-hidden">
                        <table className="w-full text-right">
                          <thead className="bg-gray-50 border-b">
                            <tr><th className="p-6 text-xs font-bold text-gray-400">البيان / الخدمة</th><th className="p-6 text-xs font-bold text-gray-400">الجهة</th><th className="p-6 text-xs font-bold text-gray-400">المسؤول</th><th className="p-6 text-xs font-bold text-gray-400">الحالة</th></tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {filteredTech.map(r => (
                              <tr key={r.id} onClick={() => openManageRequest(r)} className="hover:bg-gray-50 cursor-pointer group">
                                <td className="p-6 font-bold text-[#1B2B48] group-hover:text-[#E95D22]">{r.service_type}</td><td className="p-6 text-sm text-gray-500">{r.entity}</td><td className="p-6 text-sm text-gray-500">{r.assigned_to}</td><td className="p-6"><span className={`px-4 py-1.5 rounded-full text-[10px] font-bold shadow-sm ${r.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{r.status === 'completed' ? 'منجز' : 'قيد المتابعة'}</span></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {projectTab === 'clearance' && (
                    <div className="space-y-6">
                      <div className="flex justify-end gap-4">
                        <button onClick={() => { setBulkProject(selectedProject.name); setIsBulkUploadModalOpen(true); }} className="bg-white border border-gray-200 text-[#1B2B48] px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-sm"><FileUp size={18} className="text-[#E95D22]" /> استيراد إكسل</button>
                        <button onClick={() => { setClearForm({...clearForm, project_name: selectedProject.name}); setIsClearModalOpen(true); }} className="bg-[#1B2B48] text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-md"><Plus size={18} /> تسجيل إفراغ يدوي</button>
                      </div>
                      <div className="bg-white rounded-[40px] shadow-sm border border-gray-100 overflow-hidden">
                        <table className="w-full text-right">
                          <thead className="bg-gray-50 border-b">
                            <tr><th className="p-6 text-xs font-bold text-gray-400">العميل</th><th className="p-6 text-xs font-bold text-gray-400">رقم الصك</th><th className="p-6 text-xs font-bold text-gray-400">قيمة الصفقة</th><th className="p-6 text-xs font-bold text-gray-400">البنك</th><th className="p-6 text-xs font-bold text-gray-400">الحالة</th></tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {filteredClear.map(r => (
                              <tr key={r.id} onClick={() => openManageRequest(r)} className="hover:bg-gray-50 cursor-pointer group">
                                <td className="p-6 font-bold text-[#1B2B48] group-hover:text-[#E95D22]">{r.client_name}</td><td className="p-6 text-xs text-gray-400 font-mono" dir="ltr">{r.deed_number}</td><td className="p-6 text-sm font-bold text-green-600">{parseFloat(r.deal_value).toLocaleString()} ر.س</td><td className="p-6 text-xs text-gray-500">{r.bank_name}</td><td className="p-6"><span className={`px-4 py-1.5 rounded-full text-[10px] font-bold shadow-sm ${r.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{r.status === 'completed' ? 'منجز' : 'قيد المتابعة'}</span></td>
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
          )}
        </div>
      </main>

      {/* MODAL: New Project */}
      <Modal isOpen={isNewProjectModalOpen} onClose={() => setIsNewProjectModalOpen(false)} title="إضافة مشروع جديد">
        <div className="space-y-6 text-right font-cairo">
          <div>
            <label className="text-xs font-bold text-gray-400 block mb-2">اسم المشروع (العميل)</label>
            <input type="text" className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 outline-none focus:border-[#E95D22]" placeholder="مثال: مشروع مجمع النرجس" value={projectForm.name} onChange={e => setProjectForm({...projectForm, name: e.target.value})} />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-400 block mb-2">الموقع / المدينة</label>
            <input type="text" className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 outline-none focus:border-[#E95D22]" value={projectForm.location} onChange={e => setProjectForm({...projectForm, location: e.target.value})} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-400 block mb-2">عدد الوحدات</label>
              <input type="number" className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 outline-none focus:border-[#E95D22]" value={projectForm.unitsCount} onChange={e => setProjectForm({...projectForm, unitsCount: parseInt(e.target.value) || 0})} />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-400 block mb-2">عدادات الكهرباء</label>
              <input type="number" className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 outline-none focus:border-[#E95D22]" value={projectForm.electricityMetersCount} onChange={e => setProjectForm({...projectForm, electricityMetersCount: parseInt(e.target.value) || 0})} />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-400 block mb-2">عدادات المياه</label>
              <input type="number" className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 outline-none focus:border-[#E95D22]" value={projectForm.waterMetersCount} onChange={e => setProjectForm({...projectForm, waterMetersCount: parseInt(e.target.value) || 0})} />
            </div>
          </div>
          <button onClick={handleCreateProject} className="w-full bg-[#1B2B48] text-white py-6 rounded-[25px] font-black text-lg shadow-2xl hover:brightness-110 transition-all">إنشاء المشروع</button>
        </div>
      </Modal>

      {/* MODAL: Technical Request */}
      <Modal isOpen={isTechModalOpen} onClose={() => setIsTechModalOpen(false)} title="إضافة طلب فني جديد">
        <div className="space-y-6 text-right font-cairo">
          <div>
            <label className="text-xs font-bold text-gray-400 block mb-2">المشروع</label>
            <select className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 outline-none focus:border-[#E95D22]" value={techForm.project_name} onChange={e => setTechForm({...techForm, project_name: e.target.value})}>
              <option value="">اختر المشروع...</option>
              {projects.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-xs font-bold text-gray-400 block mb-2">جهة المراجعة</label>
                <select className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 outline-none focus:border-[#E95D22]" value={techForm.entity} onChange={e => setTechForm({...techForm, entity: e.target.value})}>
                  <option value="">اختر الجهة...</option>
                  {Object.keys(TECHNICAL_ENTITY_MAPPING).map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
              {techForm.entity && (
                <div>
                  <label className="text-xs font-bold text-gray-400 block mb-2">نوع الخدمة</label>
                  <select className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 outline-none focus:border-[#E95D22]" value={techForm.service_type} onChange={e => setTechForm({...techForm, service_type: e.target.value})}>
                    <option value="">اختر الخدمة...</option>
                    {TECHNICAL_ENTITY_MAPPING[techForm.entity].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              )}
          </div>
          <button onClick={handleTechSubmit} className="w-full bg-[#1B2B48] text-white py-6 rounded-[25px] font-black shadow-2xl transition-all">إرسال الطلب</button>
        </div>
      </Modal>

      {/* MODAL: Clearance Request */}
      <Modal isOpen={isClearModalOpen} onClose={() => setIsClearModalOpen(false)} title="تسجيل طلب إفراغ يدوي">
          <div className="space-y-6 text-right font-cairo overflow-y-auto max-h-[70vh] p-2">
              <div className="grid grid-cols-2 gap-6">
                  <div><label className="text-xs font-bold text-gray-400 block mb-2">اسم العميل</label><input type="text" className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 outline-none" value={clearForm.client_name} onChange={e => setClearForm({...clearForm, client_name: e.target.value})} /></div>
                  <div><label className="text-xs font-bold text-gray-400 block mb-2">المشروع</label><select className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 outline-none" value={clearForm.project_name} onChange={e => setClearForm({...clearForm, project_name: e.target.value})}>{projects.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}</select></div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                  <div><label className="text-xs font-bold text-gray-400 block mb-2">قيمة الصفقة</label><input type="number" className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 outline-none" value={clearForm.deal_value} onChange={e => setClearForm({...clearForm, deal_value: e.target.value})} /></div>
                  <div><label className="text-xs font-bold text-gray-400 block mb-2">البنك</label><select className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 outline-none" value={clearForm.bank_name} onChange={e => setClearForm({...clearForm, bank_name: e.target.value})}>{BANKS_LIST.map(b => <option key={b} value={b}>{b}</option>)}</select></div>
              </div>
              <button onClick={handleClearanceSubmit} className="w-full bg-[#1B2B48] text-white py-6 rounded-[25px] font-black text-lg shadow-2xl transition-all mt-4">حفظ وتسجيل الطلب</button>
          </div>
      </Modal>

      {/* MODAL: Management & Comments System */}
      <Modal isOpen={isManageModalOpen} onClose={() => setIsManageModalOpen(false)} title="إدارة تفاصيل المتابعة">
        {activeRequest && (
          <div className="space-y-8 text-right font-cairo flex flex-col max-h-[75vh]">
            <div className="p-8 bg-gray-50 rounded-[40px] border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-6 shrink-0 shadow-inner">
                <div className="space-y-1">
                  <h4 className="font-black text-[#1B2B48] text-2xl tracking-tight leading-none">
                    {'client_name' in activeRequest ? activeRequest.client_name : activeRequest.service_type}
                  </h4>
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest pt-2">الحالة الحالية: <span className="text-[#E95D22] bg-orange-50 px-3 py-1 rounded-full uppercase">{activeRequest.status === 'completed' ? 'منجز' : 'متابعة'}</span></p>
                </div>
                <div className="flex gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mr-2">تحديث التفويض</label>
                      <select 
                        className="p-3 bg-white rounded-xl border border-gray-100 text-sm font-bold text-[#1B2B48] outline-none shadow-sm"
                        value={activeRequest.assigned_to || ''}
                        onChange={(e) => updateRequestDelegation(e.target.value)}
                      >
                        <option value="">اختر الموظف...</option>
                        {usersList.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                      </select>
                    </div>
                    <button 
                      onClick={toggleStatus} 
                      className={`px-8 py-4 rounded-2xl font-black text-sm transition-all shadow-xl hover:scale-105 mt-auto ${activeRequest.status === 'completed' ? 'bg-orange-100 text-[#E95D22]' : 'bg-green-600 text-white'}`}
                    >
                      {activeRequest.status === 'completed' ? 'إعادة للمتابعة ↩' : 'تحديد كمنجز ✓'}
                    </button>
                </div>
            </div>
            
            <div className="space-y-4 flex flex-col flex-1 overflow-hidden px-2">
                <h5 className="font-black text-lg flex items-center gap-2 text-[#1B2B48] px-2 shrink-0"><MessageCircle size={22} className="text-[#E95D22]" /> الخط الزمني للمتابعة</h5>
                <div className="bg-white border border-gray-50 rounded-[40px] p-8 flex-1 overflow-y-auto space-y-8 shadow-sm">
                    {comments.map(c => (
                        <div key={c.id} className="relative pr-8 border-r-2 border-gray-50 pb-2">
                            <div className="absolute top-0 -right-[7px] w-3 h-3 bg-[#E95D22] rounded-full border-2 border-white shadow-sm" />
                            <div className="flex justify-between items-center mb-3">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-black text-[#1B2B48]">{c.author}</span>
                                <span className="text-[9px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-md font-bold">{c.author_role}</span>
                              </div>
                              <span className="text-[10px] text-gray-300 font-mono" dir="ltr">{new Date(c.created_at).toLocaleString('ar-SA')}</span>
                            </div>
                            <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 p-5 rounded-3xl border border-white">{c.text}</p>
                        </div>
                    ))}
                    {comments.length === 0 && <p className="text-center text-gray-300 italic py-16">لا توجد تحديثات حتى الآن</p>}
                </div>
                <div className="flex gap-3 p-4 bg-white rounded-[30px] shadow-lg border border-gray-100 shrink-0">
                  <input type="text" placeholder="أضف تعليقاً أو تحديثاً للحالة هنا..." className="flex-1 p-5 bg-gray-50 rounded-2xl border border-transparent outline-none focus:border-[#E95D22] text-sm" value={newComment} onChange={e => setNewComment(e.target.value)} onKeyDown={e => e.key === 'Enter' && postComment()} />
                  <button onClick={postComment} className="bg-[#1B2B48] text-white px-6 py-5 rounded-2xl hover:brightness-110 shadow-xl"><Send size={22} /></button>
                </div>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL: Excel Bulk Upload */}
      <Modal isOpen={isBulkUploadModalOpen} onClose={() => setIsBulkUploadModalOpen(false)} title="استيراد كتل البيانات">
        <div className="space-y-8 text-right font-cairo">
          <div className="p-6 bg-orange-50 border border-orange-200 rounded-[30px] flex items-start gap-4 shadow-inner">
            <AlertTriangle className="text-orange-600 shrink-0 mt-1" size={24} />
            <p className="text-xs text-orange-800 leading-relaxed font-bold">يجب أن يحتوي ملف الإكسل على الرؤوس: Client Name, Mobile, ID Number, Plot Number, Deal Value, Bank, Deed Number</p>
          </div>
          <select className="w-full p-5 bg-gray-50 rounded-3xl border border-gray-100 outline-none" value={bulkProject} onChange={e => setBulkProject(e.target.value)}>
              <option value="">اختر المشروع...</option>
              {projects.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
          </select>
          <div className={`relative border-2 border-dashed rounded-[40px] p-16 text-center bg-blue-50/20 ${!bulkProject ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:bg-blue-50/50'}`}>
            <input type="file" accept=".xlsx, .xls" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleExcelImport} disabled={!bulkProject || isUploading} />
            {isUploading ? <div className="animate-pulse flex flex-col items-center gap-4"><Loader2 className="animate-spin w-12 h-12" /><p className="font-black text-blue-600">جاري المعالجة...</p></div> : <div className="flex flex-col items-center gap-6 text-blue-600"><Upload size={48} /><p className="font-black text-xl text-[#1B2B48]">انقر لرفع ملف الإكسل</p></div>}
          </div>
        </div>
      </Modal>

    </div>
  );
};

const App: React.FC = () => <ErrorBoundary><AppContent /></ErrorBoundary>;
export default App;
