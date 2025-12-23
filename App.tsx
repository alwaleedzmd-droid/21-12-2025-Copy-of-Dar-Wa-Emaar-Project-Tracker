
import React, { useState, useEffect, ReactNode } from 'react';
import { 
  LayoutDashboard, Users, FileText, LogOut, 
  Plus, ArrowLeft, Loader2, Send, AlertTriangle, 
  MapPin, Building2, Zap, Droplets, 
  Trash2, CheckCircle2, XCircle,
  RefreshCw, Upload, FileUp, MessageCircle,
  PieChart, Calendar, Edit3, AlertCircle, Shield,
  FolderOpen, Activity, BarChart3, TrendingUp, Landmark, 
  Smartphone, Phone, HardHat, Ruler, ClipboardList, ShieldCheck, UserPlus,
  Briefcase, User as UserIcon
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
  const [isTechModalOpen, setIsTechModalOpen] = useState(false);
  const [isWorkModalOpen, setIsWorkModalOpen] = useState(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isEditProjectModalOpen, setIsEditProjectModalOpen] = useState(false);

  // Forms
  const [techForm, setTechForm] = useState({ project_name: '', scope: '', entity: '', service_type: '', requesting_entity: '', assigned_to: '', deadline: '', details: '' });
  const [workForm, setWorkForm] = useState({ title: '', assigned_to: '', details: '', status: 'new' });
  const [clearForm, setClearForm] = useState({ client_name: '', mobile: '', id_number: '', project_name: '', plot_number: '', deal_value: '', bank_name: '', deed_number: '' });
  const [projectForm, setProjectForm] = useState({ name: '', location: '', client: '' });
  const [editProjectForm, setEditProjectForm] = useState<any>({});
  
  const [bulkProject, setBulkProject] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Management
  const [activeRequest, setActiveRequest] = useState<TechnicalRequest | ClearanceRequest | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');

  // --- RBAC Helper ---
  const canAccess = (allowedRoles: string[]) => {
    return currentUser && allowedRoles.includes(currentUser.role);
  };

  // --- Smart Redirect Logic ---
  const syncUserProfile = async (sessionUser: any) => {
    const { data } = await supabase.from('profiles').select('role, name').eq('id', sessionUser.id).single();
    let userRole = data?.role || 'PR_OFFICER';
    let userName = data?.name || sessionUser.user_metadata?.name || 'موظف';
    
    if (sessionUser.email === 'adaldawsari@darwaemaar.com') userRole = 'ADMIN';
    
    const updatedUser: User = { id: sessionUser.id, name: userName, email: sessionUser.email || '', role: userRole as any };
    setCurrentUser(updatedUser);
    safeStorage.setItem(STORAGE_KEYS.USER_CACHE, JSON.stringify(updatedUser));

    // Role-based smart redirect
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
          name: p.client || p.title || p.name || 'مشروع جديد'
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

  // --- Handlers ---
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

  const handleAddProject = async () => {
      if (!projectForm.name) return alert("الاسم مطلوب");
      const { error } = await supabase.from('projects').insert([{ client: projectForm.name, title: projectForm.name, status: 'active', location: projectForm.location }]);
      if (error) alert(error.message);
      else { alert("تم"); setIsProjectModalOpen(false); setProjectForm({ name: '', location: '', client: '' }); fetchAllData(); }
  };

  const handleUpdateProjectDetails = async () => {
    if (!selectedProject) return;
    const { error } = await supabase.from('projects').update({ details: editProjectForm }).eq('id', selectedProject.id);
    if (!error) { alert("تم التحديث ✅"); setIsEditProjectModalOpen(false); fetchAllData(); }
  };

  const handleDeleteProject = async (id: any) => {
      if(!window.confirm("حذف المشروع؟")) return;
      const { error } = await supabase.from('projects').delete().eq('id', id);
      if(!error) { fetchAllData(); alert("تم الحذف"); }
  };

  const handleWorkSubmit = async () => {
    if (!selectedProject || !workForm.title) return alert("الرجاء إدخال عنوان العمل");
    const payload = {
        project_name: selectedProject.name,
        service_type: workForm.title,
        scope: 'INTERNAL_WORK',
        entity: 'إدارة المشروع',
        assigned_to: workForm.assigned_to,
        details: workForm.details,
        submitted_by: currentUser?.name,
        status: workForm.status
    };
    const { error } = await supabase.from('technical_requests').insert([payload]);
    if (!error) {
        alert("تمت إضافة عمل المشروع بنجاح");
        setIsWorkModalOpen(false);
        setWorkForm({ title: '', assigned_to: '', details: '', status: 'new' });
        fetchAllData();
    } else alert(error.message);
  };

  const handleTechSubmit = async () => {
    if (!techForm.project_name) return alert("الرجاء اختيار المشروع");
    if (!techForm.scope) return alert("الرجاء اختيار جهة المراجعة");
    if (!techForm.service_type) return alert("الرجاء اختيار بيان الأعمال");
    
    const payload = { 
        project_name: techForm.project_name,
        entity: techForm.scope,
        scope: techForm.scope,
        service_type: techForm.service_type,
        requesting_entity: techForm.requesting_entity,
        details: techForm.details,
        deadline: techForm.deadline || null,
        submitted_by: currentUser?.name, 
        status: 'new' 
    };
    
    const { error } = await supabase.from('technical_requests').insert([payload]);
    if (!error) { 
        alert("تم حفظ الطلب الفني بنجاح ✅"); 
        setIsTechModalOpen(false); 
        setTechForm({ project_name: '', scope: '', entity: '', service_type: '', requesting_entity: '', assigned_to: '', deadline: '', details: '' });
        fetchAllData(); 
    } 
    else alert(error.message);
  };

  const handleClearanceSubmit = async () => {
    if (!clearForm.client_name || !clearForm.project_name) return alert("الحقول الأساسية مطلوبة");
    
    const payload = { 
        ...clearForm, 
        submitted_by: currentUser?.name, 
        status: 'new' 
    };
    
    const { error } = await supabase.from('clearance_requests').insert([payload]);
    if (!error) { 
        alert("تم حفظ طلب الإفراغ بنجاح"); 
        setIsClearModalOpen(false); 
        setClearForm({ client_name: '', mobile: '', id_number: '', project_name: '', plot_number: '', deal_value: '', bank_name: '', deed_number: '' });
        fetchAllData(); 
    } else alert(error.message);
  };

  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !bulkProject) return alert("اختر المشروع والملف");
    setIsUploading(true);
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
      } catch (err: any) { alert(err.message); } finally { setIsUploading(false); }
    };
    reader.readAsBinaryString(file);
  };

  const updateRequestStatus = async (newStatus: any) => {
    if (!activeRequest) return;
    const table = 'service_type' in activeRequest ? 'technical_requests' : 'clearance_requests';
    const { error } = await supabase.from(table).update({ status: newStatus }).eq('id', activeRequest.id);
    if (!error) { setActiveRequest({ ...activeRequest, status: newStatus } as any); fetchAllData(); alert("تم التحديث"); }
  };

  const updateRequestDelegation = async (newAssignee: string) => {
    if (!activeRequest) return;
    const assigneeName = usersList.find(u => u.id === newAssignee)?.name || newAssignee;
    const table = 'service_type' in activeRequest ? 'technical_requests' : 'clearance_requests';
    const { error } = await supabase.from(table).update({ assigned_to: assigneeName }).eq('id', activeRequest.id);
    if (!error) { setActiveRequest({ ...activeRequest, assigned_to: assigneeName } as any); fetchAllData(); alert("تم التفويض"); }
  };

  const postComment = async () => {
    if (!newComment.trim() || !activeRequest) return;
    const isTech = 'service_type' in activeRequest;
    const payload: any = { content: newComment, user_id: currentUser?.id, [isTech ? 'technical_request_id' : 'clearance_request_id']: activeRequest.id };
    const { data, error } = await supabase.from('comments').insert([payload]).select().single();
    if (!error) { setComments([...comments, { ...data, text: data.content, author: currentUser?.name } as any]); setNewComment(''); }
  };

  const getProjectProgress = (pName: string) => {
    const tech = technicalRequests.filter(r => r.project_name === pName);
    const clear = clearanceRequests.filter(r => r.project_name === pName);
    const total = tech.length + clear.length;
    return total > 0 ? Math.round(([...tech, ...clear].filter(r => r.status === 'completed' || r.status === 'منجز').length / total) * 100) : 0;
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
        case 'completed': case 'منجز': return <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 w-fit"><CheckCircle2 size={12}/> منجز</span>;
        case 'rejected': case 'مرفوض': return <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 w-fit"><XCircle size={12}/> مرفوض</span>;
        case 'pending_modification': case 'تعديل': return <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 w-fit"><AlertCircle size={12}/> مطلوب تعديل</span>;
        default: return <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-[10px] font-bold w-fit">قيد المتابعة</span>;
    }
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
                <>
                  <div className="flex justify-between items-end mb-6">
                      <div className="grid grid-cols-3 gap-6 flex-1">
                        <div className="bg-white p-6 rounded-[30px] border border-gray-100 flex items-center gap-4 shadow-sm"><div className="p-4 bg-blue-50 text-blue-600 rounded-2xl"><PieChart/></div><div><p className="text-xs font-bold text-gray-400">مشاريع</p><p className="text-2xl font-black text-[#1B2B48]">{projects.length}</p></div></div>
                        <div className="bg-white p-6 rounded-[30px] border border-gray-100 flex items-center gap-4 shadow-sm"><div className="p-4 bg-amber-50 text-amber-600 rounded-2xl"><Zap/></div><div><p className="text-xs font-bold text-gray-400">فنية</p><p className="text-2xl font-black text-[#1B2B48]">{technicalRequests.length}</p></div></div>
                        <div className="bg-white p-6 rounded-[30px] border border-gray-100 flex items-center gap-4 shadow-sm"><div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl"><FileText/></div><div><p className="text-xs font-bold text-gray-400">إفراغات</p><p className="text-2xl font-black text-[#1B2B48]">{clearanceRequests.length}</p></div></div>
                      </div>
                      {canAccess(['ADMIN', 'PR_MANAGER']) && (
                        <button onClick={()=>setIsProjectModalOpen(true)} className="mr-6 bg-[#1B2B48] text-white p-6 rounded-[30px] font-bold shadow-lg hover:scale-105 transition flex items-center gap-2"><Plus/> مشروع جديد</button>
                      )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-10 animate-in fade-in">
                    {projects.map(p => (
                      <div key={p.id} className="relative group">
                          <ProjectCard project={{...p, progress: getProjectProgress(p.name)}} onClick={(proj) => { setSelectedProject(proj); setView('PROJECT_DETAIL'); }} onTogglePin={() => {}} />
                          {canAccess(['ADMIN']) && (
                              <button onClick={(e) => { e.stopPropagation(); handleDeleteProject(p.id); }} className="absolute top-4 left-4 bg-white/80 p-2 rounded-full text-red-500 opacity-0 group-hover:opacity-100 transition hover:bg-white shadow-sm"><Trash2 size={16}/></button>
                          )}
                      </div>
                    ))}
                  </div>
                </>
              )}

              {selectedProject && view === 'PROJECT_DETAIL' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 space-y-8">
                  <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="space-y-2">
                        <button onClick={() => { setSelectedProject(null); setView('DASHBOARD'); }} className="flex items-center gap-2 text-gray-400 hover:text-[#1B2B48] text-sm font-bold transition-all mb-2"><ArrowLeft size={16} /> العودة</button>
                        <div className="flex items-center gap-3">
                          <h2 className="text-4xl font-black text-[#1B2B48] tracking-tight">{selectedProject.name}</h2>
                          {canAccess(['ADMIN', 'PR_MANAGER']) && (
                            <button onClick={() => { setEditProjectForm(selectedProject.details || {}); setIsEditProjectModalOpen(true); }} className="p-2 text-gray-400 hover:text-[#E95D22] hover:bg-orange-50 rounded-full transition-all"><Edit3 size={20} /></button>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-gray-400"><MapPin size={16} className="text-[#E95D22]" /> <span>{selectedProject.location}</span></div>
                    </div>
                    <div className="w-full md:w-96 space-y-3">
                        <div className="flex justify-between text-[11px] font-black uppercase mb-1"><span className="text-gray-400">إنجاز كلي</span><span className="text-[#E95D22]">{Math.round(getProjectProgress(selectedProject.name))}%</span></div>
                        <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden border border-gray-50"><div className="bg-[#E95D22] h-full transition-all duration-1000 ease-in-out" style={{ width: `${getProjectProgress(selectedProject.name)}%` }} /></div>
                    </div>
                  </div>

                  <div className="flex gap-4 p-1.5 bg-gray-100 rounded-[30px] w-fit shadow-inner overflow-x-auto max-w-full">
                    <button onClick={() => setProjectTab('info')} className={`px-8 py-3 rounded-[25px] font-bold transition-all whitespace-nowrap ${projectTab === 'info' ? 'bg-[#1B2B48] text-white shadow-xl scale-105' : 'text-gray-500 hover:text-[#1B2B48] hover:bg-white/50'}`}>المعلومات</button>
                    {canAccess(['ADMIN', 'PR_MANAGER', 'PR_OFFICER']) && (
                        <button onClick={() => setProjectTab('work')} className={`px-8 py-3 rounded-[25px] font-bold transition-all whitespace-nowrap ${projectTab === 'work' ? 'bg-[#1B2B48] text-white shadow-xl scale-105' : 'text-gray-500 hover:text-[#1B2B48] hover:bg-white/50'}`}>أعمال المشروع</button>
                    )}
                    {canAccess(['ADMIN', 'PR_MANAGER', 'TECHNICAL']) && (
                        <button onClick={() => setProjectTab('tech')} className={`px-8 py-3 rounded-[25px] font-bold transition-all whitespace-nowrap ${projectTab === 'tech' ? 'bg-[#1B2B48] text-white shadow-xl scale-105' : 'text-gray-500 hover:text-[#1B2B48] hover:bg-white/50'}`}>الطلبات الفنية</button>
                    )}
                    {canAccess(['ADMIN', 'PR_MANAGER', 'CONVEYANCE', 'FINANCE']) && (
                        <button onClick={() => setProjectTab('clearance')} className={`px-8 py-3 rounded-[25px] font-bold transition-all whitespace-nowrap ${projectTab === 'clearance' ? 'bg-[#1B2B48] text-white shadow-xl scale-105' : 'text-gray-500 hover:text-[#1B2B48] hover:bg-white/50'}`}>الإفراغات</button>
                    )}
                  </div>

                  {projectTab === 'info' && (
                    <div className="space-y-12">
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
                          {[
                              { label: 'الوحدات', icon: Building2, value: selectedProject.details?.unitsCount || 0, color: 'text-blue-600', bg: 'bg-blue-50' },
                              { label: 'الكهرباء', icon: Zap, value: selectedProject.details?.electricityMetersCount || 0, color: 'text-amber-500', bg: 'bg-amber-50' },
                              { label: 'المياه', icon: Droplets, value: selectedProject.details?.waterMetersCount || 0, color: 'text-cyan-500', bg: 'bg-cyan-50' },
                              { label: 'رخص البناء', icon: ClipboardList, value: selectedProject.details?.buildingPermitsCount || 0, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                              { label: 'الأشغال', icon: ShieldCheck, value: selectedProject.details?.occupancyCertificatesCount || 0, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                              { label: 'المساحة', icon: Ruler, value: selectedProject.details?.surveyDecisionsCount || 0, color: 'text-rose-600', bg: 'bg-rose-50' },
                          ].map((m, idx) => (
                              <div key={idx} className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm flex flex-col items-center hover:scale-105 transition-transform">
                                  <div className={`w-14 h-14 ${m.bg} ${m.color} rounded-2xl flex items-center justify-center mb-4`}><m.icon size={28} /></div>
                                  <p className="text-[10px] text-gray-400 font-black uppercase">{m.label}</p>
                                  <p className="text-4xl font-black text-[#1B2B48] mt-2">{m.value}</p>
                              </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {projectTab === 'work' && (
                    <div className="space-y-6">
                      <div className="flex justify-between items-center">
                        <h3 className="font-black text-2xl text-[#1B2B48]">سجل أعمال المشروع الداخلية</h3>
                        <button onClick={() => setIsWorkModalOpen(true)} className="bg-[#1B2B48] text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-md hover:brightness-110 transition-all"><Plus size={18} /> إضافة عمل</button>
                      </div>
                      <div className="bg-white rounded-[40px] shadow-sm border border-gray-100 overflow-hidden">
                        <table className="w-full text-right">
                          <thead className="bg-gray-50 border-b"><tr><th className="p-6 text-xs text-gray-400">العمل / المهمة</th><th className="p-6 text-xs text-gray-400">المسؤول</th><th className="p-6 text-xs text-gray-400">الحالة</th></tr></thead>
                          <tbody className="divide-y divide-gray-50">
                            {technicalRequests.filter(r => r.project_name === selectedProject.name && r.scope === 'INTERNAL_WORK').map(r => (
                              <tr key={r.id} onClick={() => { setActiveRequest(r); setIsManageModalOpen(true); }} className="hover:bg-gray-50 cursor-pointer transition-colors">
                                <td className="p-6"><p className="font-bold text-[#1B2B48]">{r.service_type}</p></td>
                                <td className="p-6 text-sm text-gray-500 font-bold">{r.assigned_to || '-'}</td>
                                <td className="p-6">{getStatusBadge(r.status)}</td>
                              </tr>
                            ))}
                            {technicalRequests.filter(r => r.project_name === selectedProject.name && r.scope === 'INTERNAL_WORK').length === 0 && (
                                <tr><td colSpan={3} className="p-20 text-center text-gray-300 italic font-bold">لا توجد أعمال داخلية مسجلة لهذا المشروع</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {projectTab === 'tech' && (
                    <div className="space-y-6">
                      <div className="flex justify-between items-center">
                        <h3 className="font-black text-2xl text-[#1B2B48]">سجل الطلبات والمراجعات الفنية</h3>
                        <button onClick={() => { setTechForm({...techForm, project_name: selectedProject.name}); setIsTechModalOpen(true); }} className="bg-[#E95D22] text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-md hover:brightness-110 transition-all"><Plus size={18} /> طلب مراجعة</button>
                      </div>
                      <div className="bg-white rounded-[40px] shadow-sm border border-gray-100 overflow-hidden">
                        <table className="w-full text-right">
                          <thead className="bg-gray-50 border-b"><tr><th className="p-6 text-xs text-gray-400">جهة المراجعة</th><th className="p-6 text-xs text-gray-400">بيان العمل</th><th className="p-6 text-xs text-gray-400">الحالة</th></tr></thead>
                          <tbody className="divide-y divide-gray-50">
                            {technicalRequests.filter(r => r.project_name === selectedProject.name && r.scope !== 'INTERNAL_WORK').map(r => (
                              <tr key={r.id} onClick={() => { setActiveRequest(r); setIsManageModalOpen(true); }} className="hover:bg-gray-50 cursor-pointer">
                                <td className="p-6 font-bold text-[#1B2B48]">{r.scope}</td>
                                <td className="p-6 text-sm text-gray-500">{r.service_type}</td>
                                <td className="p-6">{getStatusBadge(r.status)}</td>
                              </tr>
                            ))}
                            {technicalRequests.filter(r => r.project_name === selectedProject.name && r.scope !== 'INTERNAL_WORK').length === 0 && (
                                <tr><td colSpan={3} className="p-20 text-center text-gray-300 italic font-bold">لا توجد مراجعات فنية مسجلة</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {projectTab === 'clearance' && (
                    <div className="space-y-6">
                      <div className="flex justify-end gap-4">
                        <button onClick={() => { setBulkProject(selectedProject.name); setIsBulkUploadModalOpen(true); }} className="bg-white border text-[#1B2B48] px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-sm"><FileUp size={18}/> إكسل</button>
                        <button onClick={() => { setClearForm({...clearForm, project_name: selectedProject.name}); setIsClearModalOpen(true); }} className="bg-[#1B2B48] text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-md hover:brightness-110 transition-all"><Plus size={18} /> تسجيل إفراغ</button>
                      </div>
                      <div className="bg-white rounded-[40px] shadow-sm border border-gray-100 overflow-hidden">
                        <table className="w-full text-right">
                          <thead className="bg-gray-50 border-b"><tr><th className="p-6 text-xs text-gray-400">العميل</th><th className="p-6 text-xs text-gray-400">الصك</th><th className="p-6 text-xs text-gray-400">القيمة</th><th className="p-6 text-xs text-gray-400">الحالة</th></tr></thead>
                          <tbody className="divide-y divide-gray-50">
                            {clearanceRequests.filter(r => r.project_name === selectedProject.name).map(r => (
                              <tr key={r.id} onClick={() => { setActiveRequest(r); setIsManageModalOpen(true); }} className="hover:bg-gray-50 cursor-pointer">
                                <td className="p-6 font-bold text-[#1B2B48]">{r.client_name}</td>
                                <td className="p-6 text-xs text-gray-400 font-mono">{r.deed_number}</td>
                                <td className="p-6 text-sm font-bold text-green-600">{parseFloat(r.deal_value || '0').toLocaleString()}</td>
                                <td className="p-6">{getStatusBadge(r.status)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {view === 'TECHNICAL_SERVICES' && !selectedProject && (
                  <div className="bg-white rounded-[40px] p-8 shadow-sm border border-gray-100">
                      <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-black text-[#1B2B48]">سجل الطلبات الفنية</h2>
                        {canAccess(['ADMIN', 'TECHNICAL', 'PR_MANAGER']) && (
                          <button onClick={() => setIsTechModalOpen(true)} className="bg-[#E95D22] text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:brightness-110 transition-all"><Plus size={18}/> إضافة طلب فني</button>
                        )}
                      </div>
                      <table className="w-full text-right text-sm">
                          <thead className="bg-gray-50 border-b"><tr><th className="p-4 text-gray-400">المشروع</th><th className="p-4 text-gray-400">الخدمة</th><th className="p-4 text-gray-400">الحالة</th></tr></thead>
                          <tbody>{technicalRequests.map(r => <tr key={r.id} className="border-b hover:bg-gray-50 cursor-pointer" onClick={()=>{setActiveRequest(r); setIsManageModalOpen(true)}}><td className="p-4 font-bold text-[#1B2B48]">{r.project_name}</td><td className="p-4 font-bold text-gray-500">{r.service_type}</td><td className="p-4">{getStatusBadge(r.status)}</td></tr>)}</tbody>
                      </table>
                  </div>
              )}

              {view === 'CONVEYANCE_SERVICES' && !selectedProject && (
                  <div className="bg-white rounded-[40px] p-8 shadow-sm border border-gray-100">
                      <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-black text-[#1B2B48]">سجل الإفراغات</h2>
                        {canAccess(['ADMIN', 'CONVEYANCE', 'PR_MANAGER']) && (
                          <button onClick={() => setIsClearModalOpen(true)} className="bg-[#1B2B48] text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:brightness-110 transition-all"><Plus size={18}/> تسجيل إفراغ جديد</button>
                        )}
                      </div>
                      <table className="w-full text-right text-sm">
                          <thead className="bg-gray-50 border-b"><tr><th className="p-4 text-gray-400">المشروع</th><th className="p-4 text-gray-400">العميل</th><th className="p-4 text-gray-400">الحالة</th></tr></thead>
                          <tbody>{clearanceRequests.map(r => <tr key={r.id} className="border-b hover:bg-gray-50 cursor-pointer" onClick={()=>{setActiveRequest(r); setIsManageModalOpen(true)}}><td className="p-4 font-bold text-[#1B2B48]">{r.project_name}</td><td className="p-4 font-bold text-gray-500">{r.client_name}</td><td className="p-4">{getStatusBadge(r.status)}</td></tr>)}</tbody>
                      </table>
                  </div>
              )}

              {view === 'USERS' && !selectedProject && (
                  <div className="bg-white rounded-[40px] p-8 shadow-sm border border-gray-100">
                      <h2 className="text-2xl font-black mb-6 text-[#1B2B48]">إدارة فريق العمل</h2>
                      <table className="w-full text-right">
                          <thead className="bg-gray-50 border-b"><tr><th className="p-6">الاسم</th><th className="p-6">البريد</th><th className="p-6">الدور</th></tr></thead>
                          <tbody>{appUsers.map(u => <tr key={u.id} className="border-b hover:bg-gray-50"><td className="p-6 font-bold text-[#1B2B48]">{u.name}</td><td className="p-6 text-gray-500 font-bold">{u.email}</td><td className="p-6"><span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">{u.role}</span></td></tr>)}</tbody>
                      </table>
                  </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* --- MODALS --- */}

      {/* 1. Technical Request Modal */}
      <Modal isOpen={isTechModalOpen} onClose={() => setIsTechModalOpen(false)} title="إضافة طلب مراجعة فني">
        <div className="space-y-4 text-right font-cairo overflow-visible">
          <div>
            <label className="text-xs text-gray-400 font-bold block mb-1">المشروع</label>
            <select 
              className="w-full p-4 bg-gray-50 rounded-2xl border outline-none font-bold" 
              value={techForm.project_name} 
              onChange={e => setTechForm({...techForm, project_name: e.target.value})}
            >
                <option value="">اختر المشروع...</option>
                {projects.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 font-bold block mb-1">جهة المراجعة</label>
            <select 
              className="w-full p-4 bg-gray-50 rounded-2xl border outline-none font-bold" 
              value={techForm.scope} 
              onChange={e => setTechForm({...techForm, scope: e.target.value, entity: e.target.value})}
            >
                <option value="">اختر جهة المراجعة...</option>
                {Object.keys(TECHNICAL_ENTITY_MAPPING).map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 font-bold block mb-1">بيان الأعمال</label>
            <select 
              className="w-full p-4 bg-gray-50 rounded-2xl border outline-none font-bold" 
              value={techForm.service_type} 
              onChange={e => setTechForm({...techForm, service_type: e.target.value})} 
              disabled={!techForm.scope}
            >
                <option value="">اختر نوع العمل...</option>
                {techForm.scope && TECHNICAL_ENTITY_MAPPING[techForm.scope].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 font-bold block mb-1">الجهة طالبة الخدمة</label>
            <input 
              type="text" 
              placeholder="الجهة الطالبة (إدارة المشاريع، مبيعات...)"
              className="w-full p-4 bg-gray-50 rounded-2xl border outline-none font-bold" 
              value={techForm.requesting_entity} 
              onChange={e => setTechForm({...techForm, requesting_entity: e.target.value})} 
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 font-bold block mb-1">الوصف / التفاصيل</label>
            <textarea 
              rows={3} 
              placeholder="وصف تفصيلي للطلب..."
              className="w-full p-4 bg-gray-50 rounded-2xl border outline-none font-bold resize-none" 
              value={techForm.details} 
              onChange={e => setTechForm({...techForm, details: e.target.value})} 
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 font-bold block mb-1">تاريخ الاستحقاق (Deadline)</label>
            <input 
              type="date" 
              className="w-full p-4 bg-gray-50 rounded-2xl border outline-none font-bold" 
              value={techForm.deadline} 
              onChange={e => setTechForm({...techForm, deadline: e.target.value})} 
            />
          </div>
          <button onClick={handleTechSubmit} className="w-full bg-[#E95D22] text-white py-5 rounded-[25px] font-black shadow-xl mt-4 hover:brightness-110 transition-all">إرسال الطلب</button>
        </div>
      </Modal>

      {/* 2. Clearance Request Modal */}
      <Modal isOpen={isClearModalOpen} onClose={() => setIsClearModalOpen(false)} title="تسجيل طلب إفراغ">
        <div className="space-y-4 text-right font-cairo overflow-visible">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-400 font-bold block mb-1">اسم العميل</label>
                <input className="w-full p-4 bg-gray-50 rounded-2xl border outline-none font-bold" placeholder="الاسم الكامل" value={clearForm.client_name} onChange={e => setClearForm({...clearForm, client_name: e.target.value})} />
              </div>
              <div>
                <label className="text-xs text-gray-400 font-bold block mb-1">رقم الجوال</label>
                <input className="w-full p-4 bg-gray-50 rounded-2xl border outline-none font-bold" placeholder="05xxxxxxxx" value={clearForm.mobile} onChange={e => setClearForm({...clearForm, mobile: e.target.value})} />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400 font-bold block mb-1">رقم الهوية</label>
              <input className="w-full p-4 bg-gray-50 rounded-2xl border outline-none font-bold" placeholder="1xxxxxxxxx" value={clearForm.id_number} onChange={e => setClearForm({...clearForm, id_number: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-400 font-bold block mb-1">المشروع</label>
                <select className="w-full p-4 bg-gray-50 rounded-2xl border outline-none font-bold" value={clearForm.project_name} onChange={e => setClearForm({...clearForm, project_name: e.target.value})}>
                    <option value="">اختر المشروع...</option>
                    {projects.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 font-bold block mb-1">رقم القطعة</label>
                <input className="w-full p-4 bg-gray-50 rounded-2xl border outline-none font-bold" placeholder="القطعة" value={clearForm.plot_number} onChange={e => setClearForm({...clearForm, plot_number: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-400 font-bold block mb-1">قيمة الصفقة</label>
                <input type="number" className="w-full p-4 bg-gray-50 rounded-2xl border outline-none font-bold" placeholder="القيمة بالريال" value={clearForm.deal_value} onChange={e => setClearForm({...clearForm, deal_value: e.target.value})} />
              </div>
              <div>
                <label className="text-xs text-gray-400 font-bold block mb-1">البنك</label>
                <select className="w-full p-4 bg-gray-50 rounded-2xl border outline-none font-bold" value={clearForm.bank_name} onChange={e => setClearForm({...clearForm, bank_name: e.target.value})}>
                    <option value="">اختر البنك...</option>
                    {BANKS_LIST.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400 font-bold block mb-1">رقم الصك</label>
              <input className="w-full p-4 bg-gray-50 rounded-2xl border outline-none font-bold" placeholder="12xxxxxxxxxx" value={clearForm.deed_number} onChange={e => setClearForm({...clearForm, deed_number: e.target.value})} />
            </div>
            <button onClick={handleClearanceSubmit} className="w-full bg-[#1B2B48] text-white py-5 rounded-[25px] font-black shadow-xl mt-4 hover:brightness-110 transition-all">حفظ الطلب</button>
        </div>
      </Modal>

      <Modal isOpen={isWorkModalOpen} onClose={() => setIsWorkModalOpen(false)} title="إضافة عمل مشروع داخلي">
        <div className="space-y-4 text-right font-cairo overflow-visible">
            <div className="space-y-1">
                <label className="text-xs text-gray-400 font-bold block mb-1">بيان العمل</label>
                <input type="text" className="w-full p-4 bg-gray-50 rounded-2xl border outline-none font-bold" placeholder="مثال: مراجعة المخططات، تسوية الأرض..." value={workForm.title} onChange={e => setWorkForm({...workForm, title: e.target.value})} />
            </div>
            <div className="space-y-1">
                <label className="text-xs text-gray-400 font-bold block mb-1">المسؤول عن التنفيذ</label>
                <select className="w-full p-4 bg-gray-50 rounded-2xl border outline-none font-bold" value={workForm.assigned_to} onChange={e => setWorkForm({...workForm, assigned_to: e.target.value})}>
                    <option value="">اختر موظف...</option>
                    {usersList.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                </select>
            </div>
            <div className="space-y-1">
                <label className="text-xs text-gray-400 font-bold block mb-1">الوصف والتفاصيل</label>
                <textarea rows={3} className="w-full p-4 bg-gray-50 rounded-2xl border outline-none font-bold resize-none" value={workForm.details} onChange={e => setWorkForm({...workForm, details: e.target.value})} />
            </div>
            <button onClick={handleWorkSubmit} className="w-full bg-[#1B2B48] text-white py-5 rounded-[25px] font-black shadow-xl mt-4 hover:brightness-110 transition-all">حفظ العمل</button>
        </div>
      </Modal>

      <Modal isOpen={isProjectModalOpen} onClose={() => setIsProjectModalOpen(false)} title="إضافة مشروع جديد">
          <div className="space-y-4 text-right font-cairo">
              <div><label className="text-gray-400 text-xs font-bold block mb-1">اسم المشروع</label><input className="w-full p-4 bg-gray-50 rounded-2xl border outline-none font-bold" value={projectForm.name} onChange={e => setProjectForm({...projectForm, name: e.target.value})} /></div>
              <div><label className="text-gray-400 text-xs font-bold block mb-1">الموقع</label><input className="w-full p-4 bg-gray-50 rounded-2xl border outline-none font-bold" value={projectForm.location} onChange={e => setProjectForm({...projectForm, location: e.target.value})} /></div>
              <button onClick={handleAddProject} className="w-full bg-[#1B2B48] text-white py-5 rounded-[25px] font-black shadow-xl hover:brightness-110 transition-all">إنشاء المشروع</button>
          </div>
      </Modal>

      <Modal isOpen={isManageModalOpen} onClose={() => setIsManageModalOpen(false)} title="إدارة الطلب والتعليقات">
        {activeRequest && (
          <div className="space-y-6 text-right font-cairo">
            <div className="p-6 bg-gray-50 rounded-[30px] border border-gray-100 flex justify-between shadow-inner">
                <div>
                    <h3 className="font-black text-xl text-[#1B2B48]">{'client_name' in activeRequest ? activeRequest.client_name : activeRequest.service_type}</h3>
                    <p className="text-sm text-gray-500 font-bold">المشروع: {activeRequest.project_name}</p>
                </div>
                {getStatusBadge(activeRequest.status)}
            </div>
            <div className="grid grid-cols-1 gap-4"><div className="bg-white p-3 rounded-2xl border shadow-sm"><p className="text-xs text-gray-400 mb-1 font-bold">المسؤول</p><select className="font-bold text-orange-600 bg-transparent outline-none w-full" value={activeRequest.assigned_to || ''} onChange={(e) => updateRequestDelegation(e.target.value)}><option value="">غير محدد</option>{usersList.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}</select></div></div>
            <div className="grid grid-cols-3 gap-3">
                <button onClick={() => updateRequestStatus('completed')} className="bg-green-50 text-green-700 p-4 rounded-2xl font-bold hover:bg-green-100 flex flex-col items-center gap-1 shadow-sm"><CheckCircle2 size={24}/> منجز</button>
                <button onClick={() => updateRequestStatus('rejected')} className="bg-red-50 text-red-700 p-4 rounded-2xl font-bold hover:bg-red-100 flex flex-col items-center gap-1 shadow-sm"><XCircle size={24}/> رفض</button>
                <button onClick={() => updateRequestStatus('pending_modification')} className="bg-orange-50 text-orange-700 p-4 rounded-2xl font-bold hover:bg-orange-100 flex flex-col items-center gap-1 shadow-sm"><Edit3 size={24}/> تعديل</button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={isEditProjectModalOpen} onClose={() => setIsEditProjectModalOpen(false)} title="تعديل تفاصيل المشروع">
        <div className="space-y-6 text-right font-cairo">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-gray-400 font-bold">عدد الوحدات</label>
              <input type="number" className="w-full p-3 bg-gray-50 border rounded-xl font-bold" value={editProjectForm.unitsCount || 0} onChange={e => setEditProjectForm({...editProjectForm, unitsCount: parseInt(e.target.value)})} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-400 font-bold">عدادات الكهرباء</label>
              <input type="number" className="w-full p-3 bg-gray-50 border rounded-xl font-bold" value={editProjectForm.electricityMetersCount || 0} onChange={e => setEditProjectForm({...editProjectForm, electricityMetersCount: parseInt(e.target.value)})} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-400 font-bold">عدادات المياه</label>
              <input type="number" className="w-full p-3 bg-gray-50 border rounded-xl font-bold" value={editProjectForm.waterMetersCount || 0} onChange={e => setEditProjectForm({...editProjectForm, waterMetersCount: parseInt(e.target.value)})} />
            </div>
          </div>
          <button onClick={handleUpdateProjectDetails} className="w-full bg-[#1B2B48] text-white py-5 rounded-[25px] font-black shadow-xl mt-4 hover:brightness-110 transition-all">حفظ التغييرات</button>
        </div>
      </Modal>

    </div>
  );
};

const App: React.FC = () => <ErrorBoundary><AppContent /></ErrorBoundary>;
export default App;
