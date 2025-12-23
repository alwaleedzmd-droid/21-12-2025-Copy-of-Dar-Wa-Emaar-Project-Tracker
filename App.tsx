
import React, { useState, useEffect, ReactNode } from 'react';
import { 
  LayoutDashboard, Users, FileText, Settings, LogOut, 
  Plus, ArrowLeft, Loader2, Send, AlertTriangle, 
  MapPin, FolderOpen, Building2, Zap, Droplets, Clock, 
  Edit3, Trash2, WalletCards, BarChart3, CheckCircle2, XCircle,
  FileSpreadsheet, RefreshCw, Archive, Bell, Search, Landmark, Phone, CreditCard, Hash, Upload, FileUp, MessageCircle,
  TrendingUp, Activity, PieChart, DollarSign, UserCheck, Shield, ShieldCheck, UserCircle, UserPlus, Key, Info, IdCard, Smartphone, Hash as HashIcon, HardHat, ClipboardList, Ruler
} from 'lucide-react';
import { supabase } from './supabaseClient';
import * as XLSX from 'xlsx';
import { 
  ProjectSummary, User, ViewState, UserRole, 
  TechnicalRequest, ClearanceRequest, AppNotification, Comment, ContractorInfo
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
  const [isTechModalOpen, setIsTechModalOpen] = useState(false);
  const [isWorkModalOpen, setIsWorkModalOpen] = useState(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [isEditProjectModalOpen, setIsEditProjectModalOpen] = useState(false);
  const [isNewUserModalOpen, setIsNewUserModalOpen] = useState(false);

  // Forms
  const [techForm, setTechForm] = useState({ project_name: '', entity: '', service_type: '', requesting_entity: '', assigned_to: '', details: '', status: 'pending' as any });
  const [workForm, setWorkForm] = useState({ project_name: '', service_type: '', entity: '', requesting_entity: '', details: '', status: 'pending' as any });
  const [clearForm, setClearForm] = useState({ client_name: '', mobile: '', id_number: '', project_name: '', plot_number: '', deal_value: '', bank_name: '', deed_number: '' });
  const [projectForm, setProjectForm] = useState({ 
    name: '', location: 'الرياض', 
    unitsCount: 0, electricityMetersCount: 0, waterMetersCount: 0,
    buildingPermitsCount: 0, occupancyCertificatesCount: 0, surveyDecisionsCount: 0,
    electricityContractor: { companyName: '', mobile: '', engineerName: '' },
    waterContractor: { companyName: '', mobile: '', engineerName: '' },
    consultantOffice: { companyName: '', mobile: '', engineerName: '' }
  });
  const [userForm, setUserForm] = useState({ name: '', email: '', role: 'TECHNICAL' as UserRole, password: '' });
  
  const [bulkProject, setBulkProject] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Management State
  const [activeRequest, setActiveRequest] = useState<TechnicalRequest | ClearanceRequest | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');

  const filteredTech = selectedProject ? technicalRequests.filter(r => r.project_name === selectedProject.name && r.category === 'TECHNICAL_REQUEST') : [];
  const filteredWorks = selectedProject ? technicalRequests.filter(r => r.project_name === selectedProject.name && r.category === 'PROJECT_WORK') : [];
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
    let userRole: UserRole = data?.role || 'TECHNICAL';
    let userName: string = data?.name || sessionUser.user_metadata?.name || 'موظف';
    if (sessionUser.email === 'adaldawsari@darwaemaar.com') userRole = 'ADMIN';
    const updatedUser: User = { id: sessionUser.id, name: userName, email: sessionUser.email || '', role: userRole };
    setCurrentUser(updatedUser);
    safeStorage.setItem(STORAGE_KEYS.USER_CACHE, JSON.stringify(updatedUser));
    if (userRole === 'TECHNICAL') setView('TECHNICAL_SERVICES');
    else if (userRole === 'CONVEYANCE') setView('CONVEYANCE_SERVICES');
    else setView('DASHBOARD');
    return updatedUser;
  };

  const fetchAllData = async () => {
    if (!currentUser) return;
    setIsDbLoading(true);
    try {
      const [pRes, trRes, crRes, uRes] = await Promise.all([
        supabase.from('projects').select('*'),
        supabase.from('technical_requests').select('*').order('created_at', { ascending: false }),
        supabase.from('clearance_requests').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('id, name, email, role, created_at')
      ]);

      if (pRes.data) {
        const mappedProjects = pRes.data.map((p: any) => {
            const projName = p.client || p.title || 'مشروع بدون اسم';
            const projectTasks = trRes.data?.filter((tr: any) => tr.project_name === projName) || [];
            const clearTasks = crRes.data?.filter((cr: any) => cr.project_name === projName) || [];
            
            const total = projectTasks.length + clearTasks.length;
            const completed = projectTasks.filter(t => t.status === 'completed').length + 
                              clearTasks.filter(t => t.status === 'completed').length;

            return {
                ...p,
                name: projName,
                totalTasks: total,
                completedTasks: completed,
                progress: total > 0 ? Math.round((completed / total) * 100) : 0
            };
        });
        setProjects(mappedProjects);
        if (selectedProject) {
           const updated = mappedProjects.find((x: any) => x.id === selectedProject.id);
           if (updated) setSelectedProject(updated);
        }
      }
      if (trRes.data) setTechnicalRequests(trRes.data);
      if (crRes.data) setClearanceRequests(crRes.data);
      if (uRes.data) setAppUsers(uRes.data as User[]);
    } catch (e) { console.error(e); } finally { setIsDbLoading(false); }
  };

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) await syncUserProfile(session.user);
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
    if (error) { alert("خطأ في الدخول: " + error.message); setIsAuthLoading(false); }
    else if (data.user) { await syncUserProfile(data.user); setIsAuthLoading(false); }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    safeStorage.removeItem(STORAGE_KEYS.USER_CACHE);
    setView('LOGIN');
  };

  const handleCreateUser = async () => {
    if (!userForm.email || !userForm.password || !userForm.name) return alert("يرجى إكمال بيانات المستخدم");
    const { data, error } = await supabase.auth.signUp({
      email: userForm.email,
      password: userForm.password,
      options: { data: { name: userForm.name, role: userForm.role } }
    });
    if (error) alert("خطأ في إنشاء الحساب: " + error.message);
    else {
      await supabase.from('profiles').update({ role: userForm.role, name: userForm.name }).eq('id', data.user?.id);
      alert("تم إنشاء الحساب بنجاح");
      setIsNewUserModalOpen(false);
      setUserForm({ name: '', email: '', role: 'TECHNICAL', password: '' });
      fetchAllData();
    }
  };

  const resetProjectForm = () => {
    setProjectForm({ 
        name: '', location: 'الرياض', 
        unitsCount: 0, electricityMetersCount: 0, waterMetersCount: 0,
        buildingPermitsCount: 0, occupancyCertificatesCount: 0, surveyDecisionsCount: 0,
        electricityContractor: { companyName: '', mobile: '', engineerName: '' },
        waterContractor: { companyName: '', mobile: '', engineerName: '' },
        consultantOffice: { companyName: '', mobile: '', engineerName: '' }
    });
  };

  const handleCreateProject = async () => {
    if (!projectForm.name) return alert("يرجى إدخال اسم المشروع");
    const { error } = await supabase.from('projects').insert([{
      client: projectForm.name,
      location: projectForm.location,
      details: {
        unitsCount: projectForm.unitsCount,
        electricityMetersCount: projectForm.electricityMetersCount,
        waterMetersCount: projectForm.waterMetersCount,
        buildingPermitsCount: projectForm.buildingPermitsCount,
        occupancyCertificatesCount: projectForm.occupancyCertificatesCount,
        surveyDecisionsCount: projectForm.surveyDecisionsCount,
        electricityContractor: projectForm.electricityContractor,
        waterContractor: projectForm.waterContractor,
        consultantOffice: projectForm.consultantOffice
      }
    }]);
    if (error) alert(error.message);
    else { alert("تمت إضافة المشروع بنجاح"); setIsNewProjectModalOpen(false); resetProjectForm(); fetchAllData(); }
  };

  const handleUpdateProject = async () => {
    if (!selectedProject || !projectForm.name) return;
    const { error } = await supabase.from('projects').update({
      client: projectForm.name,
      location: projectForm.location,
      details: {
        unitsCount: projectForm.unitsCount,
        electricityMetersCount: projectForm.electricityMetersCount,
        waterMetersCount: projectForm.waterMetersCount,
        buildingPermitsCount: projectForm.buildingPermitsCount,
        occupancyCertificatesCount: projectForm.occupancyCertificatesCount,
        surveyDecisionsCount: projectForm.surveyDecisionsCount,
        electricityContractor: projectForm.electricityContractor,
        waterContractor: projectForm.waterContractor,
        consultantOffice: projectForm.consultantOffice
      }
    }).eq('id', selectedProject.id);
    if (error) alert(error.message);
    else { alert("تم تحديث المشروع بنجاح"); setIsEditProjectModalOpen(false); fetchAllData(); }
  };

  const openEditProject = () => {
    if (!selectedProject) return;
    setProjectForm({
        name: selectedProject.name,
        location: selectedProject.location,
        unitsCount: selectedProject.details?.unitsCount || 0,
        electricityMetersCount: selectedProject.details?.electricityMetersCount || 0,
        waterMetersCount: selectedProject.details?.waterMetersCount || 0,
        buildingPermitsCount: selectedProject.details?.buildingPermitsCount || 0,
        occupancyCertificatesCount: selectedProject.details?.occupancyCertificatesCount || 0,
        surveyDecisionsCount: selectedProject.details?.surveyDecisionsCount || 0,
        electricityContractor: selectedProject.details?.electricityContractor || { companyName: '', mobile: '', engineerName: '' },
        waterContractor: selectedProject.details?.waterContractor || { companyName: '', mobile: '', engineerName: '' },
        consultantOffice: selectedProject.details?.consultantOffice || { companyName: '', mobile: '', engineerName: '' }
    });
    setIsEditProjectModalOpen(true);
  };

  const handleTechSubmit = async () => {
    if (!techForm.project_name || !techForm.entity) return alert("يرجى إكمال الحقول المطلوبة");
    const { error } = await supabase.from('technical_requests').insert([{ ...techForm, category: 'TECHNICAL_REQUEST', submitted_by: currentUser?.name }]);
    if (error) alert(error.message);
    else { alert("تم الحفظ بنجاح"); setIsTechModalOpen(false); setTechForm({ project_name: '', entity: '', service_type: '', requesting_entity: '', assigned_to: '', details: '', status: 'pending' }); fetchAllData(); }
  };

  const handleWorkSubmit = async () => {
    if (!workForm.project_name || !workForm.service_type) return alert("يرجى إكمال بيان الأعمال");
    const { error } = await supabase.from('technical_requests').insert([{ 
        project_name: workForm.project_name, 
        service_type: workForm.service_type, 
        entity: workForm.entity,
        requesting_entity: workForm.requesting_entity,
        details: workForm.details,
        status: workForm.status,
        category: 'PROJECT_WORK', 
        submitted_by: currentUser?.name 
    }]);
    if (error) alert(error.message);
    else { alert("تمت إضافة العمل بنجاح"); setIsWorkModalOpen(false); setWorkForm({ project_name: '', service_type: '', entity: '', requesting_entity: '', details: '', status: 'pending' }); fetchAllData(); }
  };

  const handleClearanceSubmit = async () => {
    if (!clearForm.client_name || !clearForm.project_name) return alert("الاسم والمشروع ضروريان");
    const { error } = await supabase.from('clearance_requests').insert([{ ...clearForm, status: 'new', submitted_by: currentUser?.name }]);
    if (error) alert(error.message);
    else { alert("تمت إضافة طلب الإفراغ"); setIsClearModalOpen(false); setClearForm({ client_name: '', mobile: '', id_number: '', project_name: '', plot_number: '', deal_value: '', bank_name: '', deed_number: '' }); fetchAllData(); }
  };

  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !bulkProject) return;
    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const data = XLSX.utils.sheet_to_json(wb.Sheets[wsname]);
        const requestsToInsert = data.map((row: any) => ({
          client_name: row['الاسم'] || row['اسم العميل'] || '',
          mobile: String(row['الجوال'] || row['رقم الجوال'] || ''),
          id_number: String(row['الهوية'] || row['رقم الهوية'] || ''),
          project_name: bulkProject,
          plot_number: String(row['القطعة'] || row['رقم القطعة'] || ''),
          deal_value: String(row['القيمة'] || row['قيمة الصفقة'] || '0'),
          bank_name: row['البنك'] || 'أخرى',
          deed_number: String(row['الصك'] || row['رقم الصك'] || ''),
          status: 'new',
          submitted_by: currentUser?.name || 'نظام'
        }));
        const { error } = await supabase.from('clearance_requests').insert(requestsToInsert);
        if (error) throw error;
        alert(`تم استيراد ${requestsToInsert.length} طلباً`);
        setIsBulkUploadModalOpen(false); fetchAllData();
      } catch (err: any) { alert("خطأ: " + err.message); } finally { setIsUploading(false); }
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

  const isAdmin = currentUser?.role === 'ADMIN';
  const isPR = currentUser?.role === 'PR_MANAGER' || currentUser?.role === 'PR_OFFICER';
  const isTechnical = currentUser?.role === 'TECHNICAL';
  const isConveyance = currentUser?.role === 'CONVEYANCE';

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
            <input type="email" required className="w-full p-4 bg-gray-50 rounded-2xl border outline-none" value={loginData.email} onChange={e => setLoginData({...loginData, email: e.target.value})} />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-400 block mb-2">كلمة السر</label>
            <input type="password" required className="w-full p-4 bg-gray-50 rounded-2xl border outline-none" value={loginData.password} onChange={e => setLoginData({...loginData, password: e.target.value})} />
          </div>
          <button type="submit" className="w-full bg-[#E95D22] text-white py-5 rounded-[30px] font-bold text-xl hover:brightness-110 shadow-lg transition-all">دخول النظام</button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#f8f9fa] font-cairo overflow-hidden" dir="rtl">
      {/* Sidebar - Preserved from previous versions */}
      <aside className={`bg-[#1B2B48] text-white flex flex-col transition-all duration-300 ${isSidebarCollapsed ? 'w-24' : 'w-72 shadow-2xl z-30'}`}>
        <div className="p-8 border-b border-white/5 flex flex-col items-center">
          <img src={DAR_LOGO} className={isSidebarCollapsed ? 'h-10' : 'h-24'} alt="Logo" />
        </div>
        <nav className="flex-1 p-4 space-y-3 mt-4">
          {(isAdmin || isPR) && (
            <button onClick={() => { setView('DASHBOARD'); setSelectedProject(null); }} className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${view === 'DASHBOARD' && !selectedProject ? 'bg-[#E95D22] shadow-lg' : 'text-gray-400 hover:bg-white/5'}`}>
              <LayoutDashboard size={22} /> {!isSidebarCollapsed && 'لوحة المشاريع'}
            </button>
          )}
          {(isAdmin || isPR || isTechnical) && (
            <button onClick={() => { setView('TECHNICAL_SERVICES'); setSelectedProject(null); }} className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${view === 'TECHNICAL_SERVICES' ? 'bg-[#E95D22] shadow-lg' : 'text-gray-400 hover:bg-white/5'}`}>
              <Zap size={22} /> {!isSidebarCollapsed && 'الطلبات الفنية'}
            </button>
          )}
          {(isAdmin || isPR || isConveyance) && (
            <button onClick={() => { setView('CONVEYANCE_SERVICES'); setSelectedProject(null); }} className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${view === 'CONVEYANCE_SERVICES' ? 'bg-[#E95D22] shadow-lg' : 'text-gray-400 hover:bg-white/5'}`}>
              <FileText size={22} /> {!isSidebarCollapsed && 'الإفراغات'}
            </button>
          )}
          {isAdmin && (
            <button onClick={() => { setView('USERS'); setSelectedProject(null); }} className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${view === 'USERS' ? 'bg-[#E95D22] shadow-lg' : 'text-gray-400 hover:bg-white/5'}`}>
                <Users size={22} /> {!isSidebarCollapsed && 'فريق العمل'}
            </button>
          )}
        </nav>
        <div className="p-4 bg-[#16233a]">
          <button onClick={handleLogout} className="w-full flex items-center gap-4 p-4 text-red-400 hover:bg-red-500/10 rounded-2xl transition-all">
            <LogOut size={20} /> {!isSidebarCollapsed && 'تسجيل الخروج'}
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header - Preserved */}
        <header className="bg-white border-b h-20 flex items-center justify-between px-10 shrink-0 shadow-sm z-20">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-xl">
              <RefreshCw size={20} />
            </button>
            <h1 className="text-2xl font-bold text-[#1B2B48]">
              {selectedProject ? selectedProject.name : view === 'USERS' ? 'إدارة فريق العمل' : 'بوابة مشاريع دار وإعمار'}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-left border-r pr-6 hidden md:block">
              <p className="text-sm font-bold text-[#1B2B48]">{currentUser?.name}</p>
              <span className="text-[10px] bg-orange-100 text-orange-600 px-2 py-0.5 rounded font-black">{currentUser?.role}</span>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-12 bg-[#f8f9fa]">
          {isDbLoading ? (
            <div className="h-full flex flex-col items-center justify-center animate-pulse">
              <Loader2 className="animate-spin text-[#E95D22] w-12 h-12" />
            </div>
          ) : (
            <div className="max-w-7xl mx-auto space-y-8">
              
              {/* Dashboard View */}
              {view === 'DASHBOARD' && !selectedProject && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                  {projects.map(p => (
                    <div key={p.id} className="relative group">
                      <ProjectCard project={p} onClick={(proj) => { setSelectedProject(proj); setView('PROJECT_DETAIL'); setProjectTab('info'); }} onTogglePin={() => {}} />
                      {isAdmin && (
                        <button onClick={(e) => { e.stopPropagation(); if(confirm('حذف المشروع؟')) supabase.from('projects').delete().eq('id', p.id).then(fetchAllData); }} className="absolute bottom-6 left-6 z-20 p-3 bg-red-50 text-red-500 rounded-xl opacity-0 group-hover:opacity-100 shadow-xl"><Trash2 size={18} /></button>
                      )}
                    </div>
                  ))}
                  {isAdmin && (
                    <button onClick={() => { resetProjectForm(); setIsNewProjectModalOpen(true); }} className="h-full min-h-[400px] border-4 border-dashed border-gray-200 rounded-[50px] flex flex-col items-center justify-center text-gray-300 hover:text-[#E95D22] hover:border-[#E95D22] transition-all gap-4">
                        <Plus size={64} /> <span className="font-black text-2xl">مشروع جديد</span>
                    </button>
                  )}
                </div>
              )}

              {/* Project Detail View - UPDATED with 4 Tabs and Indicators */}
              {selectedProject && view === 'PROJECT_DETAIL' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 space-y-10">
                   {/* Project Banner Header */}
                   <div className="bg-white p-10 rounded-[50px] shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-8 relative overflow-hidden">
                    <div className="space-y-3 z-10">
                        <button onClick={() => { setSelectedProject(null); setView('DASHBOARD'); }} className="flex items-center gap-2 text-gray-400 hover:text-[#1B2B48] text-sm font-black transition-all mb-4">
                          <ArrowLeft size={18} /> العودة للرئيسية
                        </button>
                        <div className="flex items-center gap-4">
                            <h2 className="text-5xl font-black text-[#1B2B48] tracking-tighter leading-none">{selectedProject.name}</h2>
                            <button onClick={openEditProject} className="p-3 bg-gray-50 rounded-2xl text-gray-400 hover:text-[#E95D22] transition-colors"><Edit3 size={20}/></button>
                        </div>
                    </div>
                    <div className="w-full md:w-[450px] space-y-4 z-10">
                        <div className="flex justify-between text-[11px] font-black uppercase tracking-widest text-gray-400">
                          <span>إنجاز المشروع الكلي</span>
                          <span className="text-[#E95D22]">{Math.round(selectedProject.progress)}%</span>
                        </div>
                        <div className="w-full bg-gray-100 h-4 rounded-full overflow-hidden shadow-inner">
                          <div className="bg-[#E95D22] h-full transition-all duration-1000" style={{ width: `${selectedProject.progress}%` }} />
                        </div>
                    </div>
                  </div>

                  {/* Tabs Navigation */}
                  <div className="flex gap-4 p-2 bg-gray-200/50 rounded-[35px] w-fit shadow-inner">
                    {[
                      {id: 'info', label: 'لوحة المعلومات'},
                      {id: 'work', label: 'بيان الأعمال'},
                      {id: 'tech', label: 'الطلبات الفنية'},
                      {id: 'clearance', label: 'عمليات الإفراغ'}
                    ].map(t => (
                      <button 
                        key={t.id} 
                        onClick={() => setProjectTab(t.id as any)} 
                        className={`px-12 py-4 rounded-[30px] font-black text-lg transition-all ${projectTab === t.id ? 'bg-[#1B2B48] text-white shadow-2xl scale-105' : 'text-gray-500 hover:text-[#1B2B48] hover:bg-white'}`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  {/* Tab Content: Info Board */}
                  {projectTab === 'info' && (
                    <div className="space-y-12 animate-in fade-in">
                        {/* 6 Grid Metrics */}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
                            {[
                                { label: 'عدد الوحدات', icon: Building2, value: selectedProject.details?.unitsCount || 0, color: 'text-blue-600', bg: 'bg-blue-50' },
                                { label: 'عدادات الكهرباء', icon: Zap, value: selectedProject.details?.electricityMetersCount || 0, color: 'text-amber-500', bg: 'bg-amber-50' },
                                { label: 'عدادات المياه', icon: Droplets, value: selectedProject.details?.waterMetersCount || 0, color: 'text-cyan-500', bg: 'bg-cyan-50' },
                                { label: 'رخص البناء', icon: ClipboardList, value: selectedProject.details?.buildingPermitsCount || 0, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                                { label: 'شهادات الإشغال', icon: ShieldCheck, value: selectedProject.details?.occupancyCertificatesCount || 0, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                                { label: 'القرارات المساحية', icon: Ruler, value: selectedProject.details?.surveyDecisionsCount || 0, color: 'text-rose-600', bg: 'bg-rose-50' },
                            ].map((m, idx) => (
                                <div key={idx} className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm flex flex-col items-center hover:scale-105 transition-transform">
                                    <div className={`w-14 h-14 ${m.bg} ${m.color} rounded-2xl flex items-center justify-center mb-4`}><m.icon size={28} /></div>
                                    <p className="text-[10px] text-gray-400 font-black uppercase text-center">{m.label}</p>
                                    <p className="text-4xl font-black text-[#1B2B48] mt-2">{m.value}</p>
                                </div>
                            ))}
                        </div>

                        {/* Contractors & Consultants Section */}
                        <div className="bg-white p-12 rounded-[50px] shadow-sm border border-gray-100">
                             <h3 className="text-2xl font-black text-[#1B2B48] mb-10 flex items-center gap-3">
                                <Users className="text-[#E95D22]" /> فريق عمل المشروع (المقاولون والاستشاري)
                             </h3>
                             <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                {[
                                    { title: 'مقاول الكهرباء', data: selectedProject.details?.electricityContractor, icon: Zap },
                                    { title: 'مقاول المياه', data: selectedProject.details?.waterContractor, icon: Droplets },
                                    { title: 'المكتب الاستشاري', data: selectedProject.details?.consultantOffice, icon: HardHat }
                                ].map((team, idx) => (
                                    <div key={idx} className="bg-gray-50/50 p-8 rounded-[40px] border border-gray-100 flex flex-col gap-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-[#E95D22] shadow-sm"><team.icon size={24} /></div>
                                            <h4 className="font-black text-xl text-[#1B2B48]">{team.title}</h4>
                                        </div>
                                        <div className="space-y-4">
                                            <div className="flex flex-col"><span className="text-[10px] text-gray-400 font-black uppercase">الشركة</span><span className="font-black text-gray-700">{team.data?.companyName || '-'}</span></div>
                                            <div className="flex flex-col"><span className="text-[10px] text-gray-400 font-black uppercase">المهندس</span><span className="font-black text-gray-700">{team.data?.engineerName || '-'}</span></div>
                                            <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-gray-100 mt-2 shadow-sm">
                                                <Phone className="w-4 h-4 text-[#E95D22]" />
                                                <span className="font-black text-sm text-gray-600 dir-ltr">{team.data?.mobile || '-'}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                             </div>
                        </div>
                    </div>
                  )}

                  {/* Tab Content: Project Works (SEPARATED) */}
                  {projectTab === 'work' && (
                    <div className="space-y-8 animate-in fade-in">
                      <div className="flex justify-between items-center bg-white p-10 rounded-[45px] shadow-sm border border-gray-100">
                         <div>
                            <h3 className="text-3xl font-black text-[#1B2B48]">بيان الأعمال</h3>
                            <p className="text-sm text-gray-400 font-black mt-2">متابعة إنجاز الأعمال الإنشائية والمكتبية الخاصة بالمشروع</p>
                         </div>
                         <button onClick={() => { setWorkForm({...workForm, project_name: selectedProject.name}); setIsWorkModalOpen(true); }} className="bg-[#E95D22] text-white px-10 py-5 rounded-[25px] font-black shadow-2xl hover:brightness-110 flex items-center gap-3">
                          <Plus size={24} /> إضافة عمل جديد للمشروع
                        </button>
                      </div>
                      <div className="bg-white rounded-[50px] shadow-sm border border-gray-100 overflow-hidden">
                        <table className="w-full text-right">
                          <thead className="bg-gray-50 border-b">
                            <tr>
                              <th className="p-8 text-xs font-black text-gray-400 uppercase tracking-widest">بيان الأعمال</th>
                              <th className="p-8 text-xs font-black text-gray-400 uppercase tracking-widest">جهة المراجعة</th>
                              <th className="p-8 text-xs font-black text-gray-400 uppercase tracking-widest">طالب الخدمة</th>
                              <th className="p-8 text-xs font-black text-gray-400 uppercase tracking-widest">الحالة</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {filteredWorks.map(r => (
                              <tr key={r.id} onClick={() => openManageRequest(r)} className="hover:bg-gray-50 cursor-pointer group transition-colors">
                                <td className="p-8 font-black text-[#1B2B48] group-hover:text-[#E95D22] text-xl">{r.service_type}</td>
                                <td className="p-8 text-base text-gray-500 font-black">{r.entity}</td>
                                <td className="p-8 text-base text-gray-500 font-black">{r.requesting_entity || '-'}</td>
                                <td className="p-8">
                                  <span className={`px-6 py-2 rounded-xl text-[10px] font-black shadow-sm ${r.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                    {r.status === 'completed' ? 'منجز' : 'متابعة'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                            {filteredWorks.length === 0 && (
                                <tr><td colSpan={4} className="p-24 text-center text-gray-300 font-black italic">لا توجد أعمال مسجلة لهذا المشروع</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Tab Content: Technical Requests */}
                  {projectTab === 'tech' && (
                    <div className="space-y-8 animate-in fade-in">
                       <div className="flex justify-between items-center bg-white p-10 rounded-[45px] shadow-sm border border-gray-100">
                         <h3 className="text-3xl font-black text-[#1B2B48]">الطلبات الفنية (خارجية)</h3>
                         <button onClick={() => { setTechForm({...techForm, project_name: selectedProject.name}); setIsTechModalOpen(true); }} className="bg-[#1B2B48] text-white px-10 py-5 rounded-[25px] font-black shadow-2xl hover:brightness-110 flex items-center gap-3">
                            <Zap size={24} /> طلب فني جديد
                         </button>
                      </div>
                      <div className="bg-white rounded-[50px] shadow-sm border border-gray-100 overflow-hidden">
                        <table className="w-full text-right">
                          <thead className="bg-gray-50 border-b">
                            <tr><th className="p-8 text-xs font-black text-gray-400 uppercase tracking-widest">جهة المراجعة</th><th className="p-8 text-xs font-black text-gray-400 uppercase tracking-widest">نوع الخدمة</th><th className="p-8 text-xs font-black text-gray-400 uppercase tracking-widest">المسؤول</th><th className="p-8 text-xs font-black text-gray-400 uppercase tracking-widest">الحالة</th></tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {filteredTech.map(r => (
                              <tr key={r.id} onClick={() => openManageRequest(r)} className="hover:bg-gray-50 cursor-pointer group">
                                <td className="p-8 font-black text-[#1B2B48] group-hover:text-[#E95D22] text-xl">{r.entity}</td>
                                <td className="p-8 text-base text-gray-500 font-black">{r.service_type}</td>
                                <td className="p-8 text-sm text-gray-400 font-bold">{r.assigned_to || '-'}</td>
                                <td className="p-8"><span className="px-5 py-2 bg-gray-100 rounded-xl text-[10px] font-black text-gray-600 uppercase tracking-widest">{r.status}</span></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Tab Content: Conveyance Preserved */}
                  {projectTab === 'clearance' && (
                    <div className="animate-in fade-in">
                      <div className="flex justify-between items-center mb-8">
                         <h3 className="text-3xl font-black text-[#1B2B48]">سجل الإفراغات</h3>
                         <button onClick={() => { setClearForm({...clearForm, project_name: selectedProject.name}); setIsClearModalOpen(true); }} className="bg-[#E95D22] text-white px-10 py-5 rounded-[25px] font-black shadow-2xl">تسجيل إفراغ جديد</button>
                      </div>
                      <div className="bg-white rounded-[50px] shadow-sm border border-gray-100 overflow-hidden">
                        <table className="w-full text-right">
                          <thead className="bg-gray-50 border-b">
                            <tr><th className="p-8 text-xs font-black text-gray-400 uppercase tracking-widest">العميل</th><th className="p-8 text-xs font-black text-gray-400 uppercase tracking-widest">رقم الجوال</th><th className="p-8 text-xs font-black text-gray-400 uppercase tracking-widest">رقم الصك</th><th className="p-8 text-xs font-black text-gray-400 uppercase tracking-widest">الحالة</th></tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {filteredClear.map(r => (
                              <tr key={r.id} onClick={() => openManageRequest(r)} className="hover:bg-gray-50 cursor-pointer">
                                <td className="p-8 font-black text-[#1B2B48] text-xl">{r.client_name}</td>
                                <td className="p-8 text-gray-500 font-black">{r.mobile}</td>
                                <td className="p-8 text-sm text-gray-400 font-mono">{r.deed_number}</td>
                                <td className="p-8"><span className="px-5 py-2 bg-green-100 text-green-700 rounded-xl text-[10px] font-black uppercase tracking-widest">{r.status}</span></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Global Views Preserved */}
              {view === 'TECHNICAL_SERVICES' && (
                <div className="space-y-8 animate-in fade-in">
                   <h2 className="text-4xl font-black text-[#1B2B48]">الطلبات الفنية العامة</h2>
                   <div className="bg-white rounded-[45px] border border-gray-100 overflow-hidden shadow-sm">
                    <table className="w-full text-right">
                      <thead className="bg-gray-50 border-b">
                        <tr><th className="p-6 text-xs font-black text-gray-400 uppercase tracking-widest">المشروع</th><th className="p-6 text-xs font-black text-gray-400 uppercase tracking-widest">جهة المراجعة</th><th className="p-6 text-xs font-black text-gray-400 uppercase tracking-widest">نوع الخدمة</th><th className="p-6 text-xs font-black text-gray-400 uppercase tracking-widest">الحالة</th></tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {technicalRequests.filter(r => r.category === 'TECHNICAL_REQUEST').map(r => (
                          <tr key={r.id} onClick={() => openManageRequest(r)} className="hover:bg-gray-50 cursor-pointer">
                            <td className="p-6 font-black text-[#1B2B48]">{r.project_name}</td>
                            <td className="p-6 text-sm text-gray-500 font-black">{r.entity}</td>
                            <td className="p-6 text-sm text-gray-600">{r.service_type}</td>
                            <td className="p-6"><span className="px-5 py-2 bg-gray-100 rounded-xl text-[10px] font-black text-gray-600 uppercase tracking-widest">{r.status}</span></td>
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

      {/* MODAL: Edit Project Details (Expanded with Indicators & Contractors) */}
      <Modal isOpen={isEditProjectModalOpen || isNewProjectModalOpen} onClose={() => {setIsEditProjectModalOpen(false); setIsNewProjectModalOpen(false);}} title={isEditProjectModalOpen ? "تعديل بيانات المشروع" : "إضافة مشروع جديد"}>
        <div className="space-y-8 text-right font-cairo max-h-[80vh] overflow-y-auto px-4 py-2">
            <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2"><label className="text-xs font-black text-gray-400 uppercase px-2 tracking-widest">اسم المشروع</label><input type="text" className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 font-black" value={projectForm.name} onChange={e => setProjectForm({...projectForm, name: e.target.value})} /></div>
                <div className="space-y-2"><label className="text-xs font-black text-gray-400 uppercase px-2 tracking-widest">الموقع</label><input type="text" className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 font-black" value={projectForm.location} onChange={e => setProjectForm({...projectForm, location: e.target.value})} /></div>
            </div>

            <div className="bg-gray-50/50 p-8 rounded-[40px] border border-gray-100">
                <h4 className="font-black text-[#1B2B48] mb-6 flex items-center gap-2"><Activity size={18} className="text-[#E95D22]"/> المؤشرات والكميات</h4>
                <div className="grid grid-cols-3 gap-6">
                    {[
                        { key: 'unitsCount', label: 'الوحدات' },
                        { key: 'electricityMetersCount', label: 'عدادات الكهرباء' },
                        { key: 'waterMetersCount', label: 'عدادات المياه' },
                        { key: 'buildingPermitsCount', label: 'رخص البناء' },
                        { key: 'occupancyCertificatesCount', label: 'شهادات الأشغال' },
                        { key: 'surveyDecisionsCount', label: 'القرارات المساحية' }
                    ].map(m => (
                        <div key={m.key} className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 mr-2">{m.label}</label>
                            <input type="number" className="w-full p-4 bg-white rounded-2xl border border-gray-100 text-center font-black" value={(projectForm as any)[m.key]} onChange={e => setProjectForm({...projectForm, [m.key]: parseInt(e.target.value) || 0})} />
                        </div>
                    ))}
                </div>
            </div>

            <div className="space-y-6">
                {[
                    { key: 'electricityContractor', label: 'مقاول الكهرباء', icon: Zap },
                    { key: 'waterContractor', label: 'مقاول المياه', icon: Droplets },
                    { key: 'consultantOffice', label: 'المكتب الاستشاري', icon: HardHat }
                ].map(c => (
                    <div key={c.key} className="bg-gray-50/50 p-8 rounded-[40px] border border-gray-100">
                        <h4 className="font-black text-[#1B2B48] mb-4 flex items-center gap-2 text-sm"><c.icon size={16} className="text-[#E95D22]"/> بيانات {c.label}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <input type="text" placeholder="اسم الشركة" className="w-full p-4 bg-white rounded-2xl border border-gray-100 text-xs font-black" value={(projectForm as any)[c.key].companyName} onChange={e => setProjectForm({...projectForm, [c.key]: { ...(projectForm as any)[c.key], companyName: e.target.value }})} />
                            <input type="text" placeholder="اسم المهندس" className="w-full p-4 bg-white rounded-2xl border border-gray-100 text-xs font-black" value={(projectForm as any)[c.key].engineerName} onChange={e => setProjectForm({...projectForm, [c.key]: { ...(projectForm as any)[c.key], engineerName: e.target.value }})} />
                            <input type="text" placeholder="رقم الجوال" className="w-full p-4 bg-white rounded-2xl border border-gray-100 text-xs font-black dir-ltr text-right" value={(projectForm as any)[c.key].mobile} onChange={e => setProjectForm({...projectForm, [c.key]: { ...(projectForm as any)[c.key], mobile: e.target.value }})} />
                        </div>
                    </div>
                ))}
            </div>

            <button onClick={isEditProjectModalOpen ? handleUpdateProject : handleCreateProject} className="w-full bg-[#1B2B48] text-white py-6 rounded-[35px] font-black text-xl shadow-2xl transition-all">
                {isEditProjectModalOpen ? "تحديث بيانات المشروع" : "إضافة المشروع للنظام"}
            </button>
        </div>
      </Modal>

      {/* MODAL: New Work Feature (Separated) */}
      <Modal isOpen={isWorkModalOpen} onClose={() => setIsWorkModalOpen(false)} title="إضافة عمل جديد للمشروع">
        <div className="space-y-6 text-right font-cairo">
            <div className="space-y-1">
                <label className="text-xs font-black text-gray-400 uppercase px-2 tracking-widest">بيان الأعمال</label>
                <input type="text" className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 font-black" placeholder="مثال: تركيب واجهات زجاجية" value={workForm.service_type} onChange={e => setWorkForm({...workForm, service_type: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="text-xs font-black text-gray-400 uppercase px-2 tracking-widest">جهة المراجعة</label>
                    <input type="text" className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 font-black" placeholder="مثل: المقاول العام" value={workForm.entity} onChange={e => setWorkForm({...workForm, entity: e.target.value})} />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-black text-gray-400 uppercase px-2 tracking-widest">الجهة طالبة الخدمة</label>
                    <input type="text" className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 font-black" placeholder="مثل: قسم التطوير" value={workForm.requesting_entity} onChange={e => setWorkForm({...workForm, requesting_entity: e.target.value})} />
                </div>
            </div>
            <div className="space-y-1">
                <label className="text-xs font-black text-gray-400 uppercase px-2 tracking-widest">الوصف</label>
                <textarea className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 h-24 font-black text-gray-600" placeholder="تفاصيل العمل المطلوبة..." value={workForm.details} onChange={e => setWorkForm({...workForm, details: e.target.value})} />
            </div>
            <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase px-2 tracking-widest">حالة العمل</label>
                <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => setWorkForm({...workForm, status: 'pending'})} className={`p-5 rounded-2xl border font-black transition-all ${workForm.status === 'pending' ? 'bg-[#1B2B48] text-white border-[#1B2B48] shadow-lg' : 'bg-gray-50 text-gray-400 border-gray-100'}`}>متابعة</button>
                    <button onClick={() => setWorkForm({...workForm, status: 'completed'})} className={`p-5 rounded-2xl border font-black transition-all ${workForm.status === 'completed' ? 'bg-green-600 text-white border-green-600 shadow-lg' : 'bg-gray-50 text-gray-400 border-gray-100'}`}>منجز</button>
                </div>
            </div>
            <button onClick={handleWorkSubmit} className="w-full bg-[#E95D22] text-white py-6 rounded-[25px] font-black text-xl shadow-2xl hover:brightness-110 transition-all">إدراج العمل ضمن المشروع</button>
        </div>
      </Modal>

      {/* Remaining Modals (Tech, Clearance, Manage) Preserved with slight category filtering tweaks */}
      <Modal isOpen={isTechModalOpen} onClose={() => setIsTechModalOpen(false)} title="إضافة طلب فني خارجي">
        <div className="space-y-6 text-right font-cairo">
            <div className="space-y-1">
                <label className="text-xs font-black text-gray-400 uppercase px-2 tracking-widest">جهة المراجعة الخارجية</label>
                <select className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 font-black" value={techForm.entity} onChange={e => setTechForm({...techForm, entity: e.target.value})}>
                    <option value="">اختر الجهة...</option>
                    {Object.keys(TECHNICAL_ENTITY_MAPPING).map(e => <option key={e} value={e}>{e}</option>)}
                </select>
            </div>
            <div className="space-y-1">
                <label className="text-xs font-black text-gray-400 uppercase px-2 tracking-widest">نوع الخدمة</label>
                <select className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 font-black" value={techForm.service_type} onChange={e => setTechForm({...techForm, service_type: e.target.value})}>
                    <option value="">اختر الخدمة...</option>
                    {techForm.entity && TECHNICAL_ENTITY_MAPPING[techForm.entity]?.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>
            <button onClick={handleTechSubmit} className="w-full bg-[#1B2B48] text-white py-6 rounded-[25px] font-black text-xl shadow-2xl transition-all">إرسال الطلب</button>
        </div>
      </Modal>
      
      {/* Manage Modal for Comments System */}
      <Modal isOpen={isManageModalOpen} onClose={() => setIsManageModalOpen(false)} title="إدارة الطلب والتعليقات">
        {activeRequest && (
          <div className="space-y-6 text-right font-cairo">
            <div className="p-8 bg-gray-50 rounded-[40px] flex justify-between items-center shadow-inner">
              <div>
                <h4 className="font-black text-[#1B2B48] text-2xl">{'client_name' in activeRequest ? activeRequest.client_name : activeRequest.service_type}</h4>
                <p className="text-xs text-gray-400 mt-2">نوع السجل: {'category' in activeRequest && activeRequest.category === 'PROJECT_WORK' ? 'بيان أعمال' : 'طلب فني'}</p>
              </div>
              <button onClick={toggleStatus} className={`px-10 py-5 rounded-[25px] text-white font-black transition-all shadow-xl ${activeRequest.status === 'completed' ? 'bg-orange-500' : 'bg-green-600'}`}>
                {activeRequest.status === 'completed' ? 'إعادة للمتابعة' : 'تحديد كمنجز'}
              </button>
            </div>
            <div className="space-y-4 max-h-[300px] overflow-y-auto p-2 scrollbar-thin">
              {comments.map(c => (
                <div key={c.id} className="p-5 bg-white border border-gray-100 rounded-[30px] shadow-sm">
                  <div className="flex justify-between items-center mb-2"><span className="text-xs font-black text-[#1B2B48]">{c.author}</span><span className="text-[10px] text-gray-400">{new Date(c.created_at).toLocaleString('ar-SA')}</span></div>
                  <p className="text-sm text-gray-600 leading-relaxed">{c.text}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-4 p-4 bg-gray-50 rounded-[35px] shadow-inner">
              <input type="text" className="flex-1 p-4 bg-transparent outline-none font-black" placeholder="أضف تعليقاً..." value={newComment} onChange={e => setNewComment(e.target.value)} onKeyDown={e => e.key === 'Enter' && postComment()} />
              <button onClick={postComment} className="bg-[#1B2B48] text-white p-5 rounded-full shadow-2xl hover:scale-110 transition-all"><Send size={24}/></button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal for Clearance preserved */}
      <Modal isOpen={isClearModalOpen} onClose={() => setIsClearModalOpen(false)} title="تسجيل إفراغ جديد">
          <div className="space-y-6 font-cairo text-right">
              <input type="text" placeholder="اسم العميل" className="w-full p-4 bg-gray-50 rounded-2xl border" value={clearForm.client_name} onChange={e => setClearForm({...clearForm, client_name: e.target.value})} />
              <input type="text" placeholder="رقم الجوال" className="w-full p-4 bg-gray-50 rounded-2xl border" value={clearForm.mobile} onChange={e => setClearForm({...clearForm, mobile: e.target.value})} />
              <input type="text" placeholder="رقم الصك" className="w-full p-4 bg-gray-50 rounded-2xl border" value={clearForm.deed_number} onChange={e => setClearForm({...clearForm, deed_number: e.target.value})} />
              <button onClick={handleClearanceSubmit} className="w-full bg-[#1B2B48] text-white py-6 rounded-[25px] font-black">حفظ الطلب</button>
          </div>
      </Modal>

    </div>
  );
};

const App: React.FC = () => <ErrorBoundary><AppContent /></ErrorBoundary>;
export default App;
