
import React, { useState, useEffect, ReactNode, Component } from 'react';
import { 
  LayoutDashboard, Users, FileText, Settings, LogOut, 
  Plus, ArrowLeft, Loader2, Send, AlertTriangle, UserPlus, 
  MapPin, FolderOpen, Building2, Zap, Droplets, Clock, MessageSquare, Edit3, Trash2
} from 'lucide-react';
import { supabase } from './supabaseClient';
import { 
  Task, ProjectSummary, User, ViewState, UserRole, Comment
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

/**
 * Fixed ErrorBoundary by adding a constructor and explicitly using the Component type
 * from React to ensure 'props' and 'state' are correctly recognized by the TypeScript compiler.
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
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
  const [isDbLoading, setIsDbLoading] = useState(true);
  
  // استعادة المستخدم من الكاش فوراً
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const cached = safeStorage.getItem(STORAGE_KEYS.USER_CACHE);
    return cached ? JSON.parse(cached) : null;
  });

  // تحديد الواجهة بناءً على وجود مستخدم في الكاش
  const [view, setView] = useState<ViewState>(() => {
    const cached = safeStorage.getItem(STORAGE_KEYS.USER_CACHE);
    return cached ? 'DASHBOARD' : 'LOGIN';
  });

  // حالة التحميل لا تعطل الواجهة إذا كان المستخدم موجوداً
  const [isAuthLoading, setIsAuthLoading] = useState(!currentUser);
  const [profiles, setProfiles] = useState<any[]>([]);
  
  const [loginData, setLoginData] = useState({ 
    email: 'adaldawsari@darwaemaar.com', 
    password: '' 
  });

  const [newUserForm, setNewUserForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'PR_OFFICER' as UserRole
  });

  // جلب البيانات بسرعة قصوى بالاعتماد على الـ Index
  const syncUserProfile = async (sessionUser: any) => {
    const adminEmail = 'adaldawsari@darwaemaar.com';
    let userRole: UserRole = sessionUser.user_metadata?.role || 'PR_OFFICER';
    let userName: string = sessionUser.user_metadata?.name || 'مستخدم';

    try {
      // استعلام مباشر وسريع جداً (Indexed)
      const { data, error } = await supabase
        .from('profiles')
        .select('role, name')
        .eq('id', sessionUser.id)
        .single();
      
      if (data && !error) {
        if (data.role) userRole = data.role as UserRole;
        if (data.name) userName = data.name;
      }
    } catch (e) {
      console.warn("Background profile sync failed");
    }

    if (sessionUser.email === adminEmail) {
      userRole = 'ADMIN';
      if (!userName || userName === 'مستخدم') userName = 'الوليد الدوسري';
    }

    const updatedUser: User = {
      id: sessionUser.id,
      name: userName,
      email: sessionUser.email || '',
      role: userRole
    };

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
          // إذا كنا في صفحة الدخول، ننتقل للرئيسية
          if (view === 'LOGIN') setView('DASHBOARD');
        } else {
          setCurrentUser(null);
          safeStorage.removeItem(STORAGE_KEYS.USER_CACHE);
          setView('LOGIN');
        }
      } catch (e) {
        console.error("Auth init failed");
      } finally {
        setIsAuthLoading(false);
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        await syncUserProfile(session.user);
        if (view === 'LOGIN') setView('DASHBOARD');
      } else {
        setCurrentUser(null);
        safeStorage.removeItem(STORAGE_KEYS.USER_CACHE);
        setView('LOGIN');
      }
      setIsAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProjects = async () => {
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
            id: t.id.toString(),
            project: p.name,
            description: t.title,
            reviewer: t.reviewer || '',
            requester: t.requester || '',
            notes: t.notes || '',
            location: p.location || 'الرياض',
            status: t.status || 'متابعة',
            date: t.created_at ? new Date(t.created_at).toLocaleDateString('ar-SA') : new Date().toLocaleDateString('ar-SA'),
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
          isPinned: false,
          imageUrl: p.image_url,
          allIds: p.allIds
        };
      });
      summaries.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
      setProjects(summaries);
    } catch (err) {
      console.error(err);
    } finally {
      setIsDbLoading(false);
    }
  };

  const fetchProfiles = async () => {
    if (currentUser?.role !== 'ADMIN') return;
    try {
      const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      if (data) setProfiles(data);
    } catch (e) {
      console.warn("Could not fetch profiles");
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchProjects();
      if (currentUser.role === 'ADMIN') fetchProfiles();
    }
  }, [currentUser?.id, view]);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => safeStorage.getItem(STORAGE_KEYS.SIDEBAR_COLLAPSED) === 'true');
  const [selectedProject, setSelectedProject] = useState<any | null>(null);
  const [selectedTaskForComments, setSelectedTaskForComments] = useState<Task | null>(null);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isCommentsModalOpen, setIsCommentsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [newTaskData, setNewTaskData] = useState<Partial<Task>>({ status: 'متابعة' });
  const [newCommentText, setNewCommentText] = useState('');
  const [newProject, setNewProject] = useState<Partial<ProjectSummary>>({ name: '', location: LOCATIONS_ORDER[0] });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ 
      email: loginData.email, 
      password: loginData.password 
    });
    if (error) {
      alert('بيانات الدخول غير صحيحة');
      setIsAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    safeStorage.removeItem(STORAGE_KEYS.USER_CACHE);
    setView('LOGIN');
  };

  const handleCreateProject = async () => {
    if (!newProject.name) return alert('يرجى إدخال اسم المشروع');
    const { error } = await supabase.from('projects').insert([{ client: newProject.name, location: newProject.location, date: new Date().toISOString().split('T')[0] }]);
    if (error) alert(error.message);
    else { fetchProjects(); setIsProjectModalOpen(false); }
  };

  const handleSaveTask = async () => {
    if (!selectedProject) return;
    const payload = { title: newTaskData.description || 'عمل جديد', status: newTaskData.status || 'متابعة', project_id: selectedProject.id };
    const result = editingTask ? await supabase.from('tasks').update(payload).eq('id', editingTask.id) : await supabase.from('tasks').insert([payload]);
    if (result.error) alert(result.error.message);
    else { fetchProjects(); setIsTaskModalOpen(false); setEditingTask(null); }
  };

  const handleAddComment = async () => {
    if (!selectedTaskForComments || !newCommentText.trim()) return;
    const newComment: Comment = { id: Date.now().toString(), text: newCommentText, author: currentUser?.name || 'مستخدم', authorRole: currentUser?.role || 'PR_OFFICER', timestamp: new Date().toISOString() };
    const updatedComments = [...(selectedTaskForComments.comments || []), newComment];
    const { error } = await supabase.from('tasks').update({ comments: updatedComments }).eq('id', selectedTaskForComments.id);
    if (error) alert(error.message);
    else { setSelectedTaskForComments({ ...selectedTaskForComments, comments: updatedComments }); setNewCommentText(''); fetchProjects(); }
  };

  const Logo: React.FC<{ className?: string }> = ({ className }) => (
    <div className={`${className} flex flex-col items-center justify-center`}><img src={DAR_LOGO} className="w-full h-full object-contain" alt="Logo" /></div>
  );

  // شاشة التحميل تظهر فقط إذا لم يكن هناك كاش نهائياً (المرة الأولى فقط)
  if (isAuthLoading && !currentUser) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8f9fa] gap-4">
      <Loader2 className="animate-spin w-10 h-10 text-[#E95D22]" />
    </div>
  );

  if (view === 'LOGIN' && !currentUser) return (
    <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center p-4 font-cairo" dir="rtl">
      <div className="bg-[#1B2B48] w-full max-w-md rounded-[50px] shadow-2xl overflow-hidden border border-gray-100 text-center">
        <div className="p-12">
          <Logo className="h-48 mx-auto mb-8" />
          <h1 className="text-white text-3xl font-bold">نظام المتابعة</h1>
          <p className="text-gray-400 mt-2 text-sm">دار وإعمار - تسجيل دخول آمن</p>
        </div>
        <form onSubmit={handleLogin} className="p-10 bg-white space-y-6 rounded-t-[50px] text-right">
          <div><label className="text-xs font-bold text-gray-400">البريد الإلكتروني الرسمي</label><input type="email" required className="w-full p-4 bg-gray-50 rounded-2xl border outline-none focus:border-[#E95D22]" value={loginData.email} onChange={e => setLoginData({...loginData, email: e.target.value})} /></div>
          <div><label className="text-xs font-bold text-gray-400">كلمة السر</label><input type="password" required className="w-full p-4 bg-gray-50 rounded-2xl border outline-none focus:border-[#E95D22]" value={loginData.password} onChange={e => setLoginData({...loginData, password: e.target.value})} /></div>
          <button type="submit" className="w-full bg-[#E95D22] text-white py-5 rounded-[30px] font-bold text-xl hover:bg-[#d8551f] transition-all">دخول النظام</button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#f8f9fa] font-cairo overflow-hidden" dir="rtl">
      <aside className={`bg-[#1B2B48] text-white flex flex-col transition-all duration-300 ${isSidebarCollapsed ? 'w-20' : 'w-72'}`}>
        <div className="p-6 border-b border-white/5 flex flex-col items-center"><Logo className={isSidebarCollapsed ? 'h-12' : 'h-24'} /></div>
        <nav className="flex-1 p-4 space-y-2">
            <button onClick={() => setView('DASHBOARD')} className={`w-full flex items-center gap-4 p-4 rounded-2xl ${view === 'DASHBOARD' ? 'bg-[#E95D22]' : 'text-gray-400 hover:bg-white/5'}`}><LayoutDashboard size={20} /> {!isSidebarCollapsed && 'الرئيسية'}</button>
            {currentUser?.role === 'ADMIN' && (
              <button onClick={() => setView('USERS')} className={`w-full flex items-center gap-4 p-4 rounded-2xl ${view === 'USERS' ? 'bg-[#E95D22]' : 'text-gray-400 hover:bg-white/5'}`}><Users size={20} /> {!isSidebarCollapsed && 'إدارة الموظفين'}</button>
            )}
        </nav>
        <div className="p-4 border-t border-white/5 bg-[#16233a]">
          <div className="mb-4 px-4 overflow-hidden">
            {!isSidebarCollapsed && <p className="text-[11px] text-white font-bold truncate">{currentUser?.name}</p>}
            {!isSidebarCollapsed && <p className="text-[10px] text-[#E95D22] font-bold uppercase tracking-wider">{currentUser?.role}</p>}
          </div>
          <button onClick={handleLogout} className="w-full flex items-center gap-4 p-4 text-red-400 hover:bg-red-500/10 rounded-2xl transition-all"><LogOut size={20} /> {!isSidebarCollapsed && 'خروج'}</button>
        </div>
      </aside>
      
      <main className="flex-1 overflow-y-auto p-12">
        {view === 'DASHBOARD' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-3xl font-bold text-[#1B2B48]">لوحة المشاريع</h2>
                <p className="text-gray-400 text-sm">مرحباً بك مجدداً، {currentUser?.name}</p>
              </div>
              {currentUser?.role === 'ADMIN' && (
                <button onClick={() => setIsProjectModalOpen(true)} className="bg-[#E95D22] text-white px-6 py-3 rounded-2xl flex items-center gap-2 font-bold shadow-lg hover:scale-[1.02] transition-all"><Plus size={20} /> إضافة مشروع</button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {projects.map(p => <ProjectCard key={p.id} project={p} onClick={() => { setSelectedProject(p); setView('PROJECT_DETAIL'); }} onTogglePin={() => {}} />)}
              {projects.length === 0 && !isDbLoading && (
                <div className="col-span-full py-20 text-center bg-white rounded-[40px] border border-dashed">
                  <FolderOpen className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                  <p className="text-gray-400">لا توجد مشاريع مسجلة</p>
                </div>
              )}
            </div>
          </div>
        )}

        {view === 'PROJECT_DETAIL' && selectedProject && (
          <div className="space-y-6 animate-in slide-in-from-left duration-300">
            <button onClick={() => setView('DASHBOARD')} className="flex items-center gap-2 text-gray-400 font-bold hover:text-[#1B2B48] transition-colors"><ArrowLeft size={16} /> العودة للرئيسية</button>
            <div className="bg-white rounded-[40px] shadow-sm border p-12">
               <div className="flex justify-between items-start mb-8">
                  <div>
                    <h2 className="text-4xl font-bold text-[#1B2B48] mb-2">{selectedProject.name}</h2>
                    <div className="flex items-center gap-2 text-gray-400"><MapPin size={16} /><span className="text-sm">{selectedProject.location}</span></div>
                  </div>
                  <button onClick={() => { setEditingTask(null); setNewTaskData({ status: 'متابعة' }); setIsTaskModalOpen(true); }} className="bg-[#E95D22] text-white px-6 py-3 rounded-2xl font-bold hover:bg-[#d8551f] transition-all">+ إضافة عمل جديد</button>
               </div>
               <div className="grid grid-cols-1 gap-4">
                  {selectedProject.tasks.map((task: any) => (
                    <TaskCard key={task.id} task={task} onEdit={t => { setEditingTask(t); setNewTaskData(t); setIsTaskModalOpen(true); }} onOpenComments={t => { setSelectedTaskForComments(t); setIsCommentsModalOpen(true); }} canManage={currentUser?.role === 'ADMIN'} />
                  ))}
               </div>
            </div>
          </div>
        )}

        {view === 'USERS' && currentUser?.role === 'ADMIN' && (
           <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in">
              <h2 className="text-3xl font-bold text-[#1B2B48]">إدارة الموظفين</h2>
              <div className="bg-white rounded-[30px] shadow-sm border overflow-hidden">
                <div className="divide-y">
                  {profiles.map((p: any) => (
                    <div key={p.id} className="p-6 flex justify-between items-center hover:bg-gray-50 transition-colors">
                      <div><p className="font-bold text-[#1B2B48]">{p.name || 'مستخدم'}</p><p className="text-xs text-gray-400">{p.email}</p></div>
                      <span className={`px-4 py-1 rounded-full text-[10px] font-bold ${p.role === 'ADMIN' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>{p.role}</span>
                    </div>
                  ))}
                </div>
              </div>
           </div>
        )}
      </main>

      <Modal isOpen={isProjectModalOpen} onClose={() => setIsProjectModalOpen(false)} title="إضافة مشروع">
        <div className="space-y-4 font-cairo text-right">
          <div><label className="text-xs font-bold text-gray-400">العميل</label><input type="text" className="w-full p-4 bg-gray-50 rounded-2xl border outline-none" value={newProject.name} onChange={e => setNewProject({...newProject, name: e.target.value})} /></div>
          <button onClick={handleCreateProject} className="w-full bg-[#E95D22] text-white py-4 rounded-2xl font-bold hover:bg-[#d8551f] shadow-lg">حفظ</button>
        </div>
      </Modal>

      <Modal isOpen={isTaskModalOpen} onClose={() => setIsTaskModalOpen(false)} title="بيان العمل">
        <div className="space-y-4 font-cairo text-right">
          <div><label className="text-xs font-bold text-gray-400">النوع</label><select className="w-full p-4 bg-gray-50 rounded-2xl border outline-none" value={newTaskData.description || ''} onChange={e => setNewTaskData({...newTaskData, description: e.target.value})}>{TECHNICAL_SERVICE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
          <button onClick={handleSaveTask} className="w-full bg-[#1B2B48] text-white py-4 rounded-2xl font-bold">حفظ التغييرات</button>
        </div>
      </Modal>

      <Modal isOpen={isCommentsModalOpen} onClose={() => setIsCommentsModalOpen(false)} title="الملاحظات">
        <div className="h-[50vh] flex flex-col font-cairo text-right">
            <div className="flex-1 overflow-y-auto space-y-4 mb-4">
              {selectedTaskForComments?.comments?.map(c => <div key={c.id} className="bg-gray-50 p-4 rounded-2xl border">
                <div className="flex justify-between items-center mb-1"><span className="text-xs font-bold text-[#E95D22]">{c.author}</span><span className="text-[10px] text-gray-400">{new Date(c.timestamp).toLocaleDateString('ar-SA')}</span></div>
                <p className="text-sm text-gray-700">{c.text}</p>
              </div>)}
            </div>
            <div className="flex gap-2 border-t pt-4">
              <input type="text" placeholder="اكتب ملاحظة..." className="flex-1 p-4 bg-gray-50 rounded-2xl border outline-none" value={newCommentText} onChange={e => setNewCommentText(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddComment()} />
              <button onClick={handleAddComment} className="p-4 bg-[#E95D22] text-white rounded-2xl"><Send size={20} /></button>
            </div>
        </div>
      </Modal>
    </div>
  );
};

const App: React.FC = () => <ErrorBoundary><AppContent /></ErrorBoundary>;
export default App;
