
import React, { useState, useEffect, ReactNode, Component } from 'react';
import { 
  LayoutDashboard, Users, FileText, Settings, LogOut, 
  Plus, ArrowLeft, Loader2, Send, AlertTriangle, UserPlus, 
  MapPin, FolderOpen, Building2, Zap, Droplets, Clock, MessageSquare, 
  Edit3, Trash2, ClipboardCheck, WalletCards, BarChart3, CheckCircle2, XCircle,
  FileSpreadsheet, Download, RefreshCw, Archive
} from 'lucide-react';
import { supabase } from './supabaseClient';
import * as XLSX from 'xlsx';
import { 
  Task, ProjectSummary, User, ViewState, UserRole, Comment,
  MaintenanceRequest, ClearanceRequest
} from './types';
import { 
  DAR_LOGO, LOCATIONS_ORDER, TECHNICAL_SERVICE_TYPES
} from './constants';
import ProjectCard from './components/ProjectCard';
import TaskCard from './components/TaskCard';
import Modal from './components/Modal';

const STORAGE_KEYS = {
    SIDEBAR_COLLAPSED: 'dar_persistent_v1_sidebar_collapsed',
    USER_CACHE: 'dar_user_profile_cache_v2'
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

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

// Fix: Explicitly declare state and extend Component with generic types to resolve property errors
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  constructor(props: ErrorBoundaryProps) {
    super(props);
  }

  static getDerivedStateFromError(_: any): ErrorBoundaryState {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 text-center" dir="rtl">
          <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md border border-red-100">
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2 font-cairo">عذراً، حدث خطأ ما</h2>
            <button onClick={() => window.location.reload()} className="bg-[#1B2B48] text-white px-8 py-3 rounded-2xl font-bold font-cairo">إعادة تحميل الصفحة</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const AppContent: React.FC = () => {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [maintenanceRequests, setMaintenanceRequests] = useState<MaintenanceRequest[]>([]);
  const [clearanceRequests, setClearanceRequests] = useState<ClearanceRequest[]>([]);
  const [isDbLoading, setIsDbLoading] = useState(true);
  
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const cached = safeStorage.getItem(STORAGE_KEYS.USER_CACHE);
    return cached ? JSON.parse(cached) : null;
  });

  const [view, setView] = useState<ViewState>(() => {
    const cached = safeStorage.getItem(STORAGE_KEYS.USER_CACHE);
    if (!cached) return 'LOGIN';
    const user = JSON.parse(cached);
    if (user.role === 'FINANCE') return 'FINANCE_APPROVALS';
    if (user.role === 'TECHNICAL') return 'TECHNICAL_SERVICES';
    if (user.role === 'CONVEYANCE') return 'CONVEYANCE_SERVICES';
    return 'DASHBOARD';
  });

  const [isAuthLoading, setIsAuthLoading] = useState(!currentUser);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loginData, setLoginData] = useState({ email: 'adaldawsari@darwaemaar.com', password: '' });

  // Fix: Added missing state 'isSidebarCollapsed' and its persistence logic
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const cached = safeStorage.getItem(STORAGE_KEYS.SIDEBAR_COLLAPSED);
    return cached === 'true';
  });

  useEffect(() => {
    safeStorage.setItem(STORAGE_KEYS.SIDEBAR_COLLAPSED, String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  // Modals States
  const [isMaintModalOpen, setIsMaintModalOpen] = useState(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isCommentsModalOpen, setIsCommentsModalOpen] = useState(false);

  // Form States
  const [maintForm, setMaintForm] = useState({ project_name: '', client_name: '', mobile: '', details: '' });
  const [clearForm, setClearForm] = useState({ project_name: '', client_name: '', deed_number: '', id_number: '', property_value: '' });
  const [bulkData, setBulkData] = useState<any>(null);
  const [newTaskData, setNewTaskData] = useState<Partial<Task>>({ status: 'متابعة' });
  const [newProject, setNewProject] = useState<Partial<ProjectSummary>>({ name: '', location: LOCATIONS_ORDER[0] });
  const [selectedProject, setSelectedProject] = useState<ProjectSummary | null>(null);
  const [selectedTaskForComments, setSelectedTaskForComments] = useState<Task | null>(null);
  const [newCommentText, setNewCommentText] = useState('');
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Fix: Implemented missing handler 'handleLogin'
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginData.email,
        password: loginData.password,
      });
      if (error) throw error;
      if (data.user) {
        await syncUserProfile(data.user);
      }
    } catch (err: any) {
      alert(err.message || 'حدث خطأ أثناء تسجيل الدخول');
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Fix: Implemented missing handler 'handleLogout'
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    safeStorage.removeItem(STORAGE_KEYS.USER_CACHE);
    setView('LOGIN');
  };

  // Fix: Implemented missing handler 'handleStatusChange'
  const handleStatusChange = async (table: string, id: string, status: string) => {
    const { error } = await supabase.from(table).update({ status }).eq('id', id);
    if (error) alert(error.message);
    else fetchData();
  };

  const syncUserProfile = async (sessionUser: any) => {
    const adminEmail = 'adaldawsari@darwaemaar.com';
    let userRole: UserRole = sessionUser.user_metadata?.role || 'PR_OFFICER';
    let userName: string = sessionUser.user_metadata?.name || 'مستخدم';
    try {
      const { data } = await supabase.from('profiles').select('role, name').eq('id', sessionUser.id).single();
      if (data) {
        if (data.role) userRole = data.role as UserRole;
        if (data.name) userName = data.name;
      }
    } catch (e) {}
    if (sessionUser.email === adminEmail) userRole = 'ADMIN';
    const updatedUser: User = { id: sessionUser.id, name: userName, email: sessionUser.email || '', role: userRole };
    setCurrentUser(updatedUser);
    safeStorage.setItem(STORAGE_KEYS.USER_CACHE, JSON.stringify(updatedUser));
    return updatedUser;
  };

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const user = await syncUserProfile(session.user);
          // ضبط الواجهة الافتراضية حسب الدور
          if (view === 'LOGIN') {
            if (user.role === 'FINANCE') setView('FINANCE_APPROVALS');
            else if (user.role === 'TECHNICAL') setView('TECHNICAL_SERVICES');
            else if (user.role === 'CONVEYANCE') setView('CONVEYANCE_SERVICES');
            else setView('DASHBOARD');
          }
        } else {
          setCurrentUser(null);
          setView('LOGIN');
        }
      } catch (e) {} finally { setIsAuthLoading(false); }
    };
    checkSession();
  }, []);

  const fetchData = async () => {
    if (!currentUser) return;
    setIsDbLoading(true);
    try {
      const { data: projectsData } = await supabase.from('projects').select('*');
      const { data: tasksData } = await supabase.from('tasks').select('*').order('created_at', { ascending: false });
      
      const projectMap = new Map<string, any>();
      (projectsData || []).forEach(p => {
        const name = p.client || 'مشروع بدون اسم';
        if (!projectMap.has(name)) projectMap.set(name, { ...p, name: name, allIds: [p.id] });
        else projectMap.get(name).allIds.push(p.id);
      });

      const summaries: ProjectSummary[] = Array.from(projectMap.values()).map(p => {
        const pTasks = (tasksData || [])
          .filter((t: any) => p.allIds.includes(t.project_id))
          .map((t: any) => ({
            id: t.id.toString(), project: p.name, description: t.title,
            reviewer: t.reviewer || '', requester: t.requester || '',
            notes: t.notes || '', location: p.location || 'الرياض',
            status: t.status || 'متابعة', date: t.created_at ? new Date(t.created_at).toLocaleDateString('ar-SA') : '',
            comments: t.comments || []
          }));
        const done = pTasks.filter(t => t.status === 'منجز').length;
        return { 
          id: p.id, 
          name: p.name, 
          location: p.location || 'الرياض', 
          tasks: pTasks, 
          totalTasks: pTasks.length, 
          completedTasks: done, 
          progress: pTasks.length > 0 ? (done / pTasks.length) * 100 : 0, 
          allIds: p.allIds,
          image_url: p.image_url // قراءة عمود الصورة الجديد
        };
      });
      setProjects(summaries.sort((a, b) => a.name.localeCompare(b.name, 'ar')));

      const { data: maintData } = await supabase.from('maintenance_requests').select('*').order('created_at', { ascending: false });
      if (maintData) setMaintenanceRequests(maintData);

      const { data: clearData } = await supabase.from('clearance_requests').select('*').order('created_at', { ascending: false });
      if (clearData) setClearanceRequests(clearData);

      if (currentUser.role === 'ADMIN') {
        const { data: profs } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
        if (profs) setProfiles(profs);
      }
    } catch (err) {} finally { setIsDbLoading(false); }
  };

  useEffect(() => { if (currentUser) fetchData(); }, [currentUser?.id, view]);

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);
      setBulkData(data);
      alert('تم قراءة ملف الإكسل بنجاح: ' + data.length + ' سجل');
    };
    reader.readAsBinaryString(file);
  };

  const handleMaintenanceSubmit = async () => {
    if (!maintForm.project_name || !maintForm.client_name) return alert('يرجى إكمال البيانات');
    const { error } = await supabase.from('maintenance_requests').insert([{
      ...maintForm,
      submitted_by: currentUser?.name || 'مجهول',
      status: 'new'
    }]);
    if (error) alert(error.message);
    else { fetchData(); setIsMaintModalOpen(false); setMaintForm({ project_name: '', client_name: '', mobile: '', details: '' }); }
  };

  const handleClearanceSubmit = async () => {
    if (!clearForm.project_name || !clearForm.client_name) return alert('يرجى إكمال البيانات');
    const { error } = await supabase.from('clearance_requests').insert([{
      ...clearForm,
      bulk_data: bulkData, // حفظ بيانات الإكسل كـ JSON
      submitted_by: currentUser?.name || 'مجهول',
      status: 'new'
    }]);
    if (error) alert(error.message);
    else { 
      fetchData(); 
      setIsClearModalOpen(false); 
      setClearForm({ project_name: '', client_name: '', deed_number: '', id_number: '', property_value: '' }); 
      setBulkData(null);
    }
  };

  const handleWorkflowAction = async (requestId: string, nextStatus: string, note?: string) => {
    const updatePayload: any = { status: nextStatus };
    if (currentUser?.role === 'FINANCE') updatePayload.finance_note = note;
    if (currentUser?.role === 'PR_MANAGER' || currentUser?.role === 'ADMIN') updatePayload.manager_note = note;

    const { error } = await supabase.from('clearance_requests').update(updatePayload).eq('id', requestId);
    if (error) alert(error.message);
    else {
      // إذا اكتمل الطلب، نقوم بتحديث نسبة إنجاز المشروع كخطوة منطقية
      if (nextStatus === 'completed') {
        alert('تم اعتماد الطلب وأرشفته بنجاح');
      }
      fetchData();
    }
  };

  const handleAddComment = async () => {
    if (!newCommentText.trim() || !selectedTaskForComments) return;
    const newComment: Comment = {
      id: Math.random().toString(36).substr(2, 9),
      text: newCommentText,
      author: currentUser?.name || 'مستخدم',
      authorRole: currentUser?.role || '',
      timestamp: new Date().toISOString()
    };
    const updatedComments = [...(selectedTaskForComments.comments || []), newComment];
    const { error } = await supabase.from('tasks').update({ comments: updatedComments }).eq('id', selectedTaskForComments.id);
    if (error) alert(error.message);
    else { setNewCommentText(''); setSelectedTaskForComments({ ...selectedTaskForComments, comments: updatedComments }); fetchData(); }
  };

  const isAdmin = currentUser?.role === 'ADMIN';
  const isPrManager = currentUser?.role === 'PR_MANAGER';
  const isFinance = currentUser?.role === 'FINANCE';
  const isTechnical = currentUser?.role === 'TECHNICAL';
  const isConveyance = currentUser?.role === 'CONVEYANCE';

  if (isAuthLoading && !currentUser) return <div className="min-h-screen flex items-center justify-center bg-[#f8f9fa]"><Loader2 className="animate-spin w-10 h-10 text-[#E95D22]" /></div>;

  if (view === 'LOGIN' && !currentUser) return (
    <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center p-4 font-cairo" dir="rtl">
      <div className="bg-[#1B2B48] w-full max-w-md rounded-[50px] shadow-2xl overflow-hidden border border-gray-100 text-center">
        <div className="p-12"><img src={DAR_LOGO} className="h-48 mx-auto mb-8" alt="Logo" /><h1 className="text-white text-3xl font-bold">نظام المتابعة والاعتمادات</h1><p className="text-gray-400 mt-2 text-sm">تسجيل دخول آمن</p></div>
        <form onSubmit={handleLogin} className="p-10 bg-white space-y-6 rounded-t-[50px] text-right">
          <div><label className="text-xs font-bold text-gray-400">البريد الإلكتروني</label><input type="email" required className="w-full p-4 bg-gray-50 rounded-2xl border outline-none focus:border-[#E95D22]" value={loginData.email} onChange={e => setLoginData({...loginData, email: e.target.value})} /></div>
          <div><label className="text-xs font-bold text-gray-400">كلمة السر</label><input type="password" required className="w-full p-4 bg-gray-50 rounded-2xl border outline-none focus:border-[#E95D22]" value={loginData.password} onChange={e => setLoginData({...loginData, password: e.target.value})} /></div>
          <button type="submit" className="w-full bg-[#E95D22] text-white py-5 rounded-[30px] font-bold text-xl transition-all">دخول النظام</button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#f8f9fa] font-cairo overflow-hidden" dir="rtl">
      {/* Sidebar - Role-Based Content */}
      <aside className={`bg-[#1B2B48] text-white flex flex-col transition-all duration-300 ${isSidebarCollapsed ? 'w-20' : 'w-72'}`}>
        <div className="p-6 border-b border-white/5 flex flex-col items-center relative">
          <button 
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="absolute -left-3 top-1/2 -translate-y-1/2 bg-[#E95D22] p-1 rounded-full text-white shadow-lg z-50 hover:scale-110 transition-transform"
            title={isSidebarCollapsed ? "توسيع" : "تصغير"}
          >
            {isSidebarCollapsed ? <Plus size={14} /> : <ArrowLeft size={14} />}
          </button>
          <img src={DAR_LOGO} className={isSidebarCollapsed ? 'h-10' : 'h-20'} alt="Logo" />
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {/* Dashboard only for Admin/Manager/Officers */}
          {(isAdmin || isPrManager || currentUser?.role === 'PR_OFFICER') && (
            <button onClick={() => setView('DASHBOARD')} className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${view === 'DASHBOARD' ? 'bg-[#E95D22]' : 'text-gray-400 hover:bg-white/5'}`}><LayoutDashboard size={20} /> {!isSidebarCollapsed && 'لوحة المشاريع'}</button>
          )}
          
          {/* Technical Services for Admin/Technical/PR */}
          {(isAdmin || isTechnical || isPrManager) && (
            <button onClick={() => setView('TECHNICAL_SERVICES')} className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${view === 'TECHNICAL_SERVICES' ? 'bg-[#E95D22]' : 'text-gray-400 hover:bg-white/5'}`}><Zap size={20} /> {!isSidebarCollapsed && 'طلبات الصيانة'}</button>
          )}

          {/* Conveyance for Admin/Conveyance/PR */}
          {(isAdmin || isConveyance || isPrManager) && (
            <button onClick={() => setView('CONVEYANCE_SERVICES')} className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${view === 'CONVEYANCE_SERVICES' ? 'bg-[#E95D22]' : 'text-gray-400 hover:bg-white/5'}`}><FileText size={20} /> {!isSidebarCollapsed && 'طلبات الإفراغ'}</button>
          )}

          {/* Finance for Admin/Finance/PR */}
          {(isAdmin || isFinance || isPrManager) && (
            <button onClick={() => setView('FINANCE_APPROVALS')} className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${view === 'FINANCE_APPROVALS' ? 'bg-[#E95D22]' : 'text-gray-400 hover:bg-white/5'}`}><WalletCards size={20} /> {!isSidebarCollapsed && 'الموافقات والاعتمادات'}</button>
          )}

          {isAdmin && (
            <>
              <button onClick={() => setView('STATISTICS')} className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${view === 'STATISTICS' ? 'bg-[#E95D22]' : 'text-gray-400 hover:bg-white/5'}`}><BarChart3 size={20} /> {!isSidebarCollapsed && 'الإحصائيات'}</button>
              <button onClick={() => setView('USERS')} className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${view === 'USERS' ? 'bg-[#E95D22]' : 'text-gray-400 hover:bg-white/5'}`}><Users size={20} /> {!isSidebarCollapsed && 'إدارة الموظفين'}</button>
            </>
          )}
        </nav>
        <div className="p-4 border-t border-white/5 bg-[#16233a]">
          {!isSidebarCollapsed && <div className="mb-4 px-4"><p className="text-[11px] text-white font-bold truncate">{currentUser?.name}</p><p className="text-[10px] text-[#E95D22] font-bold uppercase">{currentUser?.role}</p></div>}
          <button onClick={handleLogout} className="w-full flex items-center gap-4 p-4 text-red-400 hover:bg-red-500/10 rounded-2xl"><LogOut size={20} /> {!isSidebarCollapsed && 'خروج'}</button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-12">
        {/* DASHBOARD VIEW */}
        {view === 'DASHBOARD' && (
          <div className="space-y-8 animate-in fade-in">
            <div className="flex justify-between items-center">
              <div><h2 className="text-3xl font-bold text-[#1B2B48]">لوحة المشاريع الميدانية</h2><p className="text-gray-400 text-sm">مرحباً بك مجدداً في نظام دار وإعمار</p></div>
              {isAdmin && <button onClick={() => setIsProjectModalOpen(true)} className="bg-[#E95D22] text-white px-6 py-3 rounded-2xl flex items-center gap-2 font-bold shadow-lg"><Plus size={20} /> إضافة مشروع</button>}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {projects.map(p => <ProjectCard key={p.id} project={p} onClick={() => { setSelectedProject(p); setView('PROJECT_DETAIL'); }} onTogglePin={() => {}} />)}
            </div>
          </div>
        )}

        {/* TECHNICAL SERVICES VIEW */}
        {view === 'TECHNICAL_SERVICES' && (
          <div className="space-y-8 animate-in fade-in">
            <div className="flex justify-between items-center">
              <h2 className="text-3xl font-bold text-[#1B2B48]">طلبات الصيانة الفنية</h2>
              {(isAdmin || isTechnical) && <button onClick={() => setIsMaintModalOpen(true)} className="bg-[#E95D22] text-white px-6 py-3 rounded-2xl font-bold shadow-lg">+ طلب صيانة جديد</button>}
            </div>
            <div className="bg-white rounded-[40px] shadow-sm border overflow-hidden">
              <table className="w-full text-right">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="p-4 text-xs font-bold text-gray-400">المشروع</th>
                    <th className="p-4 text-xs font-bold text-gray-400">العميل</th>
                    <th className="p-4 text-xs font-bold text-gray-400">التفاصيل</th>
                    <th className="p-4 text-xs font-bold text-gray-400">الحالة</th>
                    {(isAdmin || isTechnical) && <th className="p-4 text-xs font-bold text-gray-400">إجراءات</th>}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {maintenanceRequests.map(r => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="p-4 font-bold text-sm text-[#1B2B48]">{r.project_name}</td>
                      <td className="p-4 text-sm">{r.client_name}</td>
                      <td className="p-4 text-sm text-gray-600 max-w-xs truncate">{r.details}</td>
                      <td className="p-4"><span className={`px-3 py-1 rounded-full text-[10px] font-bold ${r.status === 'completed' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>{r.status === 'new' ? 'تحت المعالجة' : 'مكتمل'}</span></td>
                      {(isAdmin || isTechnical) && (
                        <td className="p-4 flex gap-2">
                          <button onClick={() => handleStatusChange('maintenance_requests', r.id, 'completed')} className="text-green-500 p-1"><CheckCircle2 size={18} /></button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* CONVEYANCE SERVICES VIEW */}
        {view === 'CONVEYANCE_SERVICES' && (
          <div className="space-y-8 animate-in fade-in">
            <div className="flex justify-between items-center">
              <h2 className="text-3xl font-bold text-[#1B2B48]">طلبات الإفراغ</h2>
              {(isAdmin || isConveyance) && <button onClick={() => setIsClearModalOpen(true)} className="bg-[#E95D22] text-white px-6 py-3 rounded-2xl font-bold shadow-lg">+ طلب إفراغ جديد</button>}
            </div>
            <div className="bg-white rounded-[40px] shadow-sm border overflow-hidden">
              <table className="w-full text-right">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="p-4 text-xs font-bold text-gray-400">المشروع</th>
                    <th className="p-4 text-xs font-bold text-gray-400">العميل</th>
                    <th className="p-4 text-xs font-bold text-gray-400">الحالة</th>
                    <th className="p-4 text-xs font-bold text-gray-400">التفاصيل</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {clearanceRequests.map(r => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="p-4 font-bold text-sm text-[#1B2B48]">{r.project_name}</td>
                      <td className="p-4 text-sm">{r.client_name}</td>
                      <td className="p-4"><span className="px-3 py-1 bg-gray-100 rounded-full text-[10px]">{r.status}</span></td>
                      <td className="p-4 text-xs text-gray-400">{r.bulk_data ? `تحتوي على ${r.bulk_data.length} سجل إكسل` : 'طلب يدوي'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* FINANCE APPROVALS VIEW (WORKFLOW STAGE 1 & 2) */}
        {view === 'FINANCE_APPROVALS' && (
          <div className="space-y-8 animate-in fade-in">
            <h2 className="text-3xl font-bold text-[#1B2B48]">طلبات بانتظار الاعتماد المالي والإداري</h2>
            <div className="grid grid-cols-1 gap-6">
              {clearanceRequests.filter(r => (isFinance && r.status === 'new') || ((isAdmin || isPrManager) && r.status === 'finance_approved')).map(r => (
                <div key={r.id} className="bg-white p-8 rounded-[30px] shadow-sm border border-gray-100 flex justify-between items-center">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg text-xs font-bold">{r.project_name}</span>
                      <h3 className="text-xl font-bold text-[#1B2B48]">{r.client_name}</h3>
                    </div>
                    <p className="text-gray-400 text-sm">القيمة: <span className="text-green-600 font-bold">{r.property_value} ر.س</span></p>
                    <p className="text-xs text-gray-500 mt-1">بواسطة: {r.submitted_by} | {new Date(r.created_at).toLocaleDateString('ar-SA')}</p>
                    {r.bulk_data && <div className="mt-3 flex items-center gap-2 text-indigo-600 text-xs font-bold bg-indigo-50 w-fit px-3 py-1 rounded-lg"><FileSpreadsheet size={14} /> مرفق ملف بيانات ({r.bulk_data.length} عميل)</div>}
                  </div>
                  <div className="flex gap-3">
                    {isFinance && (
                      <>
                        <button onClick={() => handleWorkflowAction(r.id, 'finance_approved', 'تمت المراجعة المالية')} className="bg-green-500 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2"><CheckCircle2 size={18} /> اعتماد مالي</button>
                        <button onClick={() => handleWorkflowAction(r.id, 'finance_rejected', 'مرفوض مالياً')} className="bg-red-50 text-red-500 px-6 py-2 rounded-xl font-bold border border-red-100"><XCircle size={18} /> رفض</button>
                      </>
                    )}
                    {(isAdmin || isPrManager) && r.status === 'finance_approved' && (
                      <>
                        <button onClick={() => handleWorkflowAction(r.id, 'completed', 'تم الأرشفة والاعتماد النهائي')} className="bg-[#1B2B48] text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2"><Archive size={18} /> اعتماد وأرشفة</button>
                        <button onClick={() => handleWorkflowAction(r.id, 'new', 'إعادة للمالية للمراجعة')} className="bg-gray-100 text-gray-500 px-6 py-2 rounded-xl font-bold flex items-center gap-2"><RefreshCw size={18} /> إعادة مراجعة</button>
                      </>
                    )}
                  </div>
                </div>
              ))}
              {clearanceRequests.filter(r => (isFinance && r.status === 'new') || ((isAdmin || isPrManager) && r.status === 'finance_approved')).length === 0 && (
                <div className="py-20 text-center bg-white rounded-[40px] border border-dashed border-gray-200 text-gray-400">لا توجد طلبات معلقة حالياً</div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* MODALS SECTION */}
      <Modal isOpen={isMaintModalOpen} onClose={() => setIsMaintModalOpen(false)} title="طلب صيانة جديد">
        <div className="space-y-4 font-cairo text-right">
          <div><label className="text-xs font-bold text-gray-400">المشروع</label><input type="text" className="w-full p-4 bg-gray-50 rounded-2xl border outline-none focus:border-[#E95D22]" value={maintForm.project_name} onChange={e => setMaintForm({...maintForm, project_name: e.target.value})} /></div>
          <div><label className="text-xs font-bold text-gray-400">اسم العميل</label><input type="text" className="w-full p-4 bg-gray-50 rounded-2xl border outline-none focus:border-[#E95D22]" value={maintForm.client_name} onChange={e => setMaintForm({...maintForm, client_name: e.target.value})} /></div>
          <div><label className="text-xs font-bold text-gray-400">رقم التواصل</label><input type="text" className="w-full p-4 bg-gray-50 rounded-2xl border outline-none focus:border-[#E95D22]" value={maintForm.mobile} onChange={e => setMaintForm({...maintForm, mobile: e.target.value})} /></div>
          <div><label className="text-xs font-bold text-gray-400">التفاصيل</label><textarea className="w-full p-4 bg-gray-50 rounded-2xl border outline-none h-32 focus:border-[#E95D22]" value={maintForm.details} onChange={e => setMaintForm({...maintForm, details: e.target.value})} /></div>
          <button onClick={handleMaintenanceSubmit} className="w-full bg-[#1B2B48] text-white py-4 rounded-2xl font-bold shadow-lg">إرسال الطلب للفنيين</button>
        </div>
      </Modal>

      <Modal isOpen={isClearModalOpen} onClose={() => setIsClearModalOpen(false)} title="طلب إفراغ ملكية">
        <div className="space-y-4 font-cairo text-right">
          <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100 mb-4 text-center">
            <p className="text-indigo-600 text-xs font-bold mb-3">رفع بيانات إفراغ مجمع (إكسل)</p>
            <label className="cursor-pointer bg-white text-indigo-600 px-6 py-2 rounded-xl border border-indigo-200 inline-flex items-center gap-2 hover:shadow-md transition-all">
              <FileSpreadsheet size={18} /> {bulkData ? 'تغيير الملف المختارة' : 'اختيار ملف الإكسل'}
              <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleExcelUpload} />
            </label>
            {bulkData && <p className="text-[10px] text-green-600 font-bold mt-2">✓ تم تحميل {bulkData.length} عميل</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-xs font-bold text-gray-400">اسم المشروع</label><input type="text" className="w-full p-4 bg-gray-50 rounded-2xl border outline-none" value={clearForm.project_name} onChange={e => setClearForm({...clearForm, project_name: e.target.value})} /></div>
            <div><label className="text-xs font-bold text-gray-400">اسم العميل الرئيسي</label><input type="text" className="w-full p-4 bg-gray-50 rounded-2xl border outline-none" value={clearForm.client_name} onChange={e => setClearForm({...clearForm, client_name: e.target.value})} /></div>
          </div>
          <div><label className="text-xs font-bold text-gray-400">قيمة العقار الإجمالية</label><input type="text" className="w-full p-4 bg-gray-50 rounded-2xl border outline-none" value={clearForm.property_value} onChange={e => setClearForm({...clearForm, property_value: e.target.value})} /></div>
          <button onClick={handleClearanceSubmit} className="w-full bg-[#E95D22] text-white py-4 rounded-2xl font-bold shadow-lg">إرسال الطلب للمراجعة المالية</button>
        </div>
      </Modal>

      <Modal isOpen={isProjectModalOpen} onClose={() => setIsProjectModalOpen(false)} title="إضافة مشروع جديد">
        <div className="space-y-4 font-cairo text-right">
          <div><label className="text-xs font-bold text-gray-400">اسم المشروع</label><input type="text" className="w-full p-4 bg-gray-50 rounded-2xl border outline-none focus:border-[#E95D22]" value={newProject.name} onChange={e => setNewProject({...newProject, name: e.target.value})} /></div>
          <div><label className="text-xs font-bold text-gray-400">رابط صورة المشروع (URL)</label><input type="text" className="w-full p-4 bg-gray-50 rounded-2xl border outline-none focus:border-[#E95D22]" value={newProject.image_url} onChange={e => setNewProject({...newProject, image_url: e.target.value})} placeholder="أضف رابط صورة المشروع هنا" /></div>
          <div><label className="text-xs font-bold text-gray-400">الموقع</label><select className="w-full p-4 bg-gray-50 rounded-2xl border outline-none focus:border-[#E95D22]" value={newProject.location} onChange={e => setNewProject({...newProject, location: e.target.value})}>{LOCATIONS_ORDER.map(loc => <option key={loc} value={loc}>{loc}</option>)}</select></div>
          <button onClick={async () => {
            if (!newProject.name) return alert('يرجى إدخال اسم المشروع');
            const { error } = await supabase.from('projects').insert([{ client: newProject.name, location: newProject.location, image_url: newProject.image_url, date: new Date().toISOString().split('T')[0] }]);
            if (error) alert(error.message); else { fetchData(); setIsProjectModalOpen(false); setNewProject({name: '', location: LOCATIONS_ORDER[0]}); }
          }} className="w-full bg-[#E95D22] text-white py-4 rounded-2xl font-bold">تأكيد الإضافة</button>
        </div>
      </Modal>

      {/* Task & Comments Modals remains with same logic as they are role-agnostic inside Detail View */}
      <Modal isOpen={isTaskModalOpen} onClose={() => setIsTaskModalOpen(false)} title={editingTask ? 'تعديل العمل' : 'إضافة عمل جديد'}>
        <div className="space-y-4 font-cairo text-right">
          <div><label className="text-xs font-bold text-gray-400">نوع الخدمة / البيان</label><select className="w-full p-4 bg-gray-50 rounded-2xl border outline-none" value={newTaskData.description || ''} onChange={e => setNewTaskData({...newTaskData, description: e.target.value})}>{TECHNICAL_SERVICE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
          <button onClick={async () => {
            if (!selectedProject) return;
            const payload = { title: newTaskData.description || 'عمل جديد', status: newTaskData.status || 'متابعة', project_id: selectedProject.id };
            const result = editingTask ? await supabase.from('tasks').update(payload).eq('id', editingTask.id) : await supabase.from('tasks').insert([payload]);
            if (result.error) alert(result.error.message); else { fetchData(); setIsTaskModalOpen(false); setEditingTask(null); }
          }} className="w-full bg-[#1B2B48] text-white py-4 rounded-2xl font-bold">حفظ التغييرات</button>
        </div>
      </Modal>

      <Modal isOpen={isCommentsModalOpen} onClose={() => setIsCommentsModalOpen(false)} title="ملاحظات المتابعة">
        <div className="h-[50vh] flex flex-col font-cairo text-right">
            <div className="flex-1 overflow-y-auto space-y-4 mb-4">
              {selectedTaskForComments?.comments?.map(c => <div key={c.id} className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <div className="flex justify-between items-center mb-1"><span className="text-xs font-bold text-[#E95D22]">{c.author}</span><span className="text-[10px] text-gray-400">{new Date(c.timestamp).toLocaleDateString('ar-SA')}</span></div>
                <p className="text-sm text-gray-700">{c.text}</p>
              </div>)}
            </div>
            <div className="flex gap-2 border-t pt-4">
              <input type="text" placeholder="اكتب ملاحظة جديدة..." className="flex-1 p-4 bg-gray-50 rounded-2xl border outline-none" value={newCommentText} onChange={e => setNewCommentText(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddComment()} />
              <button onClick={handleAddComment} className="p-4 bg-[#E95D22] text-white rounded-2xl"><Send size={20} /></button>
            </div>
        </div>
      </Modal>
    </div>
  );
};

const App: React.FC = () => <ErrorBoundary><AppContent /></ErrorBoundary>;
export default App;
