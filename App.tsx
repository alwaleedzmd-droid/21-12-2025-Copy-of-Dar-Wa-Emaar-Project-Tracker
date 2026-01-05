
import React, { useState, useEffect, ReactNode, useMemo, useRef } from 'react';
import { Routes, Route, useNavigate, useLocation, useParams, Navigate } from 'react-router-dom';
import { 
  LayoutDashboard, Users, FileText, LogOut, 
  ArrowLeft, Loader2, Zap, Plus,
  Building2, AlertTriangle, Menu, 
  MapPin, MessageSquare, Send, X, Bot, HardHat, AlignLeft, Sparkles, ArrowUpLeft
} from 'lucide-react';
import { supabase } from './supabaseClient';
import { ProjectSummary, User, TechnicalRequest, ClearanceRequest, ProjectWork, WorkComment } from './types';
import { DAR_LOGO } from './constants';
import Modal from './components/Modal';
import { useData } from './contexts/DataContext';

// --- Components ---
import DashboardModule from './components/DashboardModule';
import TechnicalModule from './components/TechnicalModule';
import ProjectsModule from './components/ProjectsModule';
import DeedsDashboard from './components/DeedsDashboard';
import ProjectDetailView from './components/ProjectDetailView';

// --- Storage & Helpers ---
const STORAGE_KEYS = {
    SIDEBAR_COLLAPSED: 'dar_sidebar_v2_collapsed',
    USER_CACHE: 'dar_user_v2_cache'
};

const safeStorage = {
  getItem: (key: string): string | null => { try { return localStorage.getItem(key); } catch { return null; } },
  setItem: (key: string, value: string): void => { try { localStorage.setItem(key, value); } catch {} },
  removeItem: (key: string): void => { try { localStorage.removeItem(key); } catch {} }
};

// --- Error Boundary ---
class ErrorBoundary extends React.Component<{ children: ReactNode }, { hasError: boolean }> {
  public state = { hasError: false };
  static getDerivedStateFromError(_: any) { return { hasError: true }; }
  render() {
    if (this.state.hasError) return (
      <div className="min-h-screen flex items-center justify-center text-red-500 font-bold bg-[#f8f9fa] p-10 text-center flex-col gap-4" dir="rtl">
        <AlertTriangle size={48} />
        <h2 className="text-2xl font-black text-[#1B2B48]">حدث خطأ غير متوقع</h2>
        <button onClick={() => window.location.href = '/'} className="bg-[#1B2B48] text-white px-8 py-3 rounded-2xl font-bold hover:bg-[#2a3f63] transition-all shadow-lg">تحديث الصفحة</button>
      </div>
    );
    return this.props.children;
  }
}

// --- Sidebar Item ---
const SidebarItem = ({ icon, label, active, onClick, collapsed }: any) => (
  <button onClick={onClick} className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all mb-1 ${active ? 'bg-[#E95D22] shadow-lg shadow-orange-500/20 text-white' : 'hover:bg-white/10 text-gray-300 hover:text-white'}`}>
     <div className={`${active ? 'text-white' : 'text-gray-400'}`}>{icon}</div>
     {!collapsed && <span className="font-bold text-sm">{label}</span>}
  </button>
);

// --- AI Assistant ---
const AIAssistantInternal = ({ currentUser, onNavigate, projects = [], technicalRequests = [], deedsRequests = [], projectWorks = [] }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize greeting only once
  useEffect(() => {
      setMessages([{ 
          id: 1, 
          text: `مرحباً ${currentUser?.name || ''} 👋\nأنا مساعدك الذكي لمتابعة المشاريع.\nاسألني عن أي مشروع (مثال: "سرايا البدر") وسأعطيك تقريراً مفصلاً.`, 
          sender: 'bot', 
          time: new Date().toLocaleTimeString('ar-SA', {hour: '2-digit', minute:'2-digit'}) 
      }]);
  }, [currentUser]);

  useEffect(() => { 
    if (isOpen) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); 
  }, [messages, isOpen]);

  if (!currentUser || !['ADMIN', 'PR_MANAGER'].includes(currentUser.role)) return null;

  const processQuery = (rawQuery: string) => {
    const query = rawQuery.toLowerCase().trim();
    let responseText = "";
    let actions: any[] = [];

    const project = projects.find((p: any) => query.includes(p.name?.toLowerCase()));
    
    if (project) {
         const relatedWorks = projectWorks.filter((w: any) => w.projectId === project.id) || [];
         const relatedTech = technicalRequests.filter((t: any) => t.projectId === project.id) || [];
         const allTasks = [...relatedWorks, ...relatedTech];

         const completedList = allTasks.filter((w: any) => w.status === 'completed' || w.status === 'منجز');
         const pendingList = allTasks.filter((w: any) => w.status !== 'completed' && w.status !== 'منجز');

         let detailsText = "";

         if (completedList.length > 0) {
             detailsText += `\n✅ **أبرز الأعمال المنجزة:**\n`;
             completedList.slice(0, 3).forEach((w: any) => { detailsText += `- ${w.task_name || w.type}\n`; });
             if (completedList.length > 3) detailsText += `...و ${completedList.length - 3} أعمال أخرى.\n`;
         }

         if (pendingList.length > 0) {
             detailsText += `\n⏳ **أعمال قيد المتابعة:**\n`;
             pendingList.slice(0, 3).forEach((w: any) => { detailsText += `- ${w.task_name || w.type}\n`; });
             if (pendingList.length > 3) detailsText += `...و ${pendingList.length - 3} أعمال أخرى.\n`;
         }
         
         responseText = `🏗️ **تقرير مشروع: ${project.name}**\n` + `📊 إجمالي المهام: ${allTasks.length}` + detailsText;
         actions.push({ label: `فتح ملف ${project.name}`, type: 'PROJECT', data: project });
    } 
    else if (query.includes('افراغ') || query.includes('إفراغ')) {
         responseText = "يمكنك إدارة الإفراغات من قسم 'سجل الإفراغات'.";
         actions.push({ label: 'سجل الإفراغات', type: 'DEED', data: null });
    }
    else {
        responseText = "عذراً، لم أجد مشروعاً بهذا الاسم. الرجاء كتابة اسم المشروع بدقة.";
    }

    return { text: responseText, actions };
  };

  const handleSend = () => {
    if (!input.trim()) return;
    const userText = input;
    setMessages(prev => [...prev, { id: Date.now(), text: userText, sender: 'user', time: new Date().toLocaleTimeString('ar-SA', {hour: '2-digit', minute:'2-digit'}) }]);
    setInput('');
    setIsTyping(true);

    setTimeout(() => {
        const { text, actions } = processQuery(userText);
        setMessages(prev => [...prev, { 
            id: Date.now() + 1, 
            text: text, 
            sender: 'bot', 
            time: new Date().toLocaleTimeString('ar-SA', {hour: '2-digit', minute:'2-digit'}),
            actions 
        }]);
        setIsTyping(false);
    }, 600);
  };

  return (
    <>
    <button onClick={() => setIsOpen(!isOpen)} className="fixed bottom-8 left-8 z-50 bg-[#1B2B48] hover:bg-[#E95D22] text-white p-4 rounded-full shadow-xl transition-all duration-300 hover:scale-110 flex items-center gap-2 group">
        <span className={`${isOpen ? 'hidden' : 'block'} max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-500 whitespace-nowrap font-bold text-sm`}>المساعد الذكي</span>
        {isOpen ? <X size={28} /> : <Bot size={28} />}
    </button>

    {isOpen && (
        <div className="fixed bottom-24 left-8 z-50 w-80 bg-white rounded-[30px] shadow-2xl border border-gray-100 overflow-hidden flex flex-col animate-in slide-in-from-bottom-10 duration-300 h-[500px] font-cairo" dir="rtl">
          <div className="bg-[#1B2B48] p-4 flex items-center gap-2 text-white shadow-md">
             <Sparkles size={18} className="text-[#E95D22]" />
             <span className="font-bold">مساعد دار وإعمار</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#f8f9fa] custom-scrollbar">
            {messages.map((msg) => (
                <div key={msg.id} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`max-w-[90%] rounded-2xl p-3 text-sm font-bold leading-relaxed shadow-sm whitespace-pre-wrap ${msg.sender === 'user' ? 'bg-[#E95D22] text-white rounded-bl-none' : 'bg-white text-[#1B2B48] border border-gray-100 rounded-br-none'}`}>
                        {msg.text}
                    </div>
                    {msg.actions && (
                        <div className="mt-2 flex flex-wrap gap-2">
                            {msg.actions.map((action: any, idx: number) => (
                                <button key={idx} onClick={() => { 
                                    if(action.type === 'PROJECT') onNavigate('PROJECT', action.data);
                                    if(action.type === 'DEED') onNavigate('DEED', null);
                                    setIsOpen(false);
                                }} className="flex items-center gap-1 bg-[#1B2B48] text-white text-xs px-3 py-2 rounded-lg hover:bg-blue-900 transition-colors w-full justify-center">
                                    {action.label} <ArrowUpLeft size={14}/>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            ))}
            {isTyping && <div className="text-xs text-gray-400 px-2">جاري الكتابة...</div>}
            <div ref={messagesEndRef} />
          </div>
          <div className="p-3 bg-white border-t flex gap-2">
            <input 
                className="flex-1 bg-gray-50 rounded-xl px-4 text-sm font-bold outline-none focus:ring-1 ring-[#E95D22]" 
                placeholder="أكتب اسم المشروع..." 
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
            />
            <button onClick={handleSend} className="p-3 bg-[#1B2B48] text-white rounded-xl hover:bg-[#E95D22] transition-colors">
                <Send size={18} />
            </button>
          </div>
        </div>
    )}
    </>
  );
};

// ==========================================
// Main App Component
// ==========================================
const AppContent: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // --- States ---
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [technicalRequests, setTechnicalRequests] = useState<TechnicalRequest[]>([]); 
  const [projectWorks, setProjectWorks] = useState<ProjectWork[]>([]); 
  const [clearanceRequests, setClearanceRequests] = useState<ClearanceRequest[]>([]);
  const [appUsers, setAppUsers] = useState<any[]>([]);

  const [isDbLoading, setIsDbLoading] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => safeStorage.getItem(STORAGE_KEYS.SIDEBAR_COLLAPSED) === 'true');
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const cached = safeStorage.getItem(STORAGE_KEYS.USER_CACHE);
    return cached ? JSON.parse(cached) : null;
  });

  const [loginData, setLoginData] = useState({ email: 'adaldawsari@darwaemaar.com', password: '' });
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  // --- Auth & Data Fetching ---
  const fetchAllData = async () => {
    setIsDbLoading(true);
    try {
      const [pRes, wRes, tRes, cRes, uRes] = await Promise.all([
        supabase.from('projects').select('*').order('id', { ascending: true }),
        supabase.from('project_works').select('*').order('created_at', { ascending: false }),
        supabase.from('technical_requests').select('*').order('created_at', { ascending: false }),
        supabase.from('clearance_requests').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('*')
      ]);

      if (pRes.data) setProjects(pRes.data.map((p: any) => ({ ...p, name: p.name || p.title || 'مشروع' })));
      if (wRes.data) setProjectWorks(wRes.data);
      if (tRes.data) setTechnicalRequests(tRes.data);
      if (cRes.data) setClearanceRequests(cRes.data);
      if (uRes.data) setAppUsers(uRes.data);

    } catch (e) {
      console.error("Error fetching data:", e);
    } finally {
      setIsDbLoading(false);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
          // Sync user profile
          const { data } = await supabase.from('profiles').select('role, name').eq('id', session.user.id).single();
          const userRole = session.user.email === 'adaldawsari@darwaemaar.com' ? 'ADMIN' : (data?.role || 'PR_OFFICER');
          const updatedUser: User = { 
              id: session.user.id, 
              name: data?.name || session.user.email || 'موظف', 
              email: session.user.email || '', 
              role: userRole as any 
          };
          setCurrentUser(updatedUser);
          safeStorage.setItem(STORAGE_KEYS.USER_CACHE, JSON.stringify(updatedUser));
      }
    };
    initAuth();
  }, []);

  // Fetch data only when user is logged in
  useEffect(() => { 
      if (currentUser) fetchAllData(); 
      else setIsDbLoading(false);
  }, [currentUser]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthLoading(true);
    try {
        const { data, error } = await supabase.auth.signInWithPassword({ email: loginData.email, password: loginData.password });
        if (error) throw error;
    } catch (e) {
        // Fallback login for demo/testing if DB auth fails or isn't set up
        const fallbackUser: User = { id: 'demo', name: 'الوليد الدوسري', email: loginData.email, role: 'ADMIN' };
        setCurrentUser(fallbackUser);
        safeStorage.setItem(STORAGE_KEYS.USER_CACHE, JSON.stringify(fallbackUser));
    } finally {
        setIsAuthLoading(false);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    safeStorage.removeItem(STORAGE_KEYS.USER_CACHE);
    navigate('/');
  };

  // --- Views ---
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

      {/* Main Content */}
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
              <Route path="/" element={<DashboardModule projects={projects} techRequests={technicalRequests} projectWorks={projectWorks} clearanceRequests={clearanceRequests} activities={[]} currentUser={currentUser} users={appUsers} onQuickAction={() => {}} onUpdateStatus={() => {}} />} />
              <Route path="/projects" element={<ProjectsModule projects={projects} stats={{ projects: projects.length, techRequests: technicalRequests.length, clearRequests: clearanceRequests.length }} currentUser={currentUser} onProjectClick={(p) => navigate(`/projects/${p.id}`)} onRefresh={fetchAllData} />} />
              <Route path="/projects/:id" element={<ProjectDetailWrapper projects={projects} projectWorks={projectWorks} technicalRequests={technicalRequests} clearanceRequests={clearanceRequests} onRefresh={fetchAllData} currentUser={currentUser} />} />
              <Route path="/technical" element={<TechnicalModule requests={technicalRequests} projects={projects} currentUser={currentUser} usersList={appUsers} onRefresh={fetchAllData} />} />
              <Route path="/deeds" element={<DeedsDashboard currentUserRole={currentUser.role} />} />
              <Route path="/users" element={<div className="bg-white p-10 rounded-[30px] shadow-sm"><h2 className="text-2xl font-bold mb-4">إدارة الفريق</h2></div>} />
              <Route path="*" element={<Navigate to="/" replace />} />
           </Routes>
        </div>

        <AIAssistantInternal 
            currentUser={currentUser} 
            projects={projects}
            technicalRequests={technicalRequests}
            deedsRequests={clearanceRequests}
            projectWorks={projectWorks}
            onNavigate={(type: any, data: any) => {
                 if (type === 'PROJECT') navigate(`/projects/${data?.id}`);
                 if (type === 'DEED') navigate('/deeds');
            }} 
        />
      </main>
    </div>
  );
};

// --- Component: Project Detail Wrapper ---
const ProjectDetailWrapper = ({ projects = [], projectWorks = [], technicalRequests = [], clearanceRequests = [], onRefresh, currentUser }: any) => {
   const { id } = useParams();
   const navigate = useNavigate();
   
   const [selectedWork, setSelectedWork] = useState<ProjectWork | null>(null);
   const [isAddWorkOpen, setIsAddWorkOpen] = useState(false);
   const [newWorkForm, setNewWorkForm] = useState({ task_name: '', authority: '', department: '', notes: '' });
   const [workComments, setWorkComments] = useState<WorkComment[]>([]);
   const [newComment, setNewComment] = useState('');

   // Ensure Safe Data Access
   const project = useMemo(() => projects.find((p: any) => p.id === Number(id)), [projects, id]);
   const thisProjectWorks = useMemo(() => projectWorks.filter((w: any) => w.projectId === Number(id)), [projectWorks, id]);
   const thisProjectTech = useMemo(() => technicalRequests.filter((t: any) => t.projectId === Number(id)), [technicalRequests, id]);

   const handleAddWork = async () => {
       if (!newWorkForm.task_name) return alert("الرجاء كتابة اسم العمل");
       const { error } = await supabase.from('project_works').insert({
           ...newWorkForm,
           project_name: project.name,
           projectId: project.id,
           status: 'in_progress'
       });
       if (error) alert("خطأ: " + error.message);
       else {
           alert("تمت الإضافة بنجاح");
           setIsAddWorkOpen(false);
           setNewWorkForm({ task_name: '', authority: '', department: '', notes: '' });
           onRefresh();
       }
   };

   const handleStatusChange = async (newStatus: string) => {
       if (!selectedWork) return;
       const { error } = await supabase.from('project_works').update({ status: newStatus }).eq('id', selectedWork.id);
       if (!error) {
           setSelectedWork({ ...selectedWork, status: newStatus });
           onRefresh();
       }
   };

   const fetchComments = async (workId: number) => {
       const { data } = await supabase.from('work_comments').select('*').eq('work_id', workId).order('created_at');
       if (data) setWorkComments(data);
   };

   const handleAddComment = async () => {
       if (!newComment || !selectedWork) return;
       const { error } = await supabase.from('work_comments').insert({
           content: newComment,
           work_id: selectedWork.id,
           user_name: currentUser?.name
       });
       if (!error) {
           setNewComment('');
           fetchComments(selectedWork.id);
       }
   };

   const openWorkDetails = (work: ProjectWork) => {
       setSelectedWork(work);
       fetchComments(work.id);
   };

   if (!project) return (
       <div className="flex flex-col items-center justify-center h-full text-center">
           <Building2 size={64} className="text-gray-300 mb-4" />
           <h2 className="text-xl font-bold text-gray-600">جاري تحميل بيانات المشروع...</h2>
       </div>
   );

   return (
     <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
        <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100 flex justify-between items-center">
            <div>
                <button onClick={() => navigate('/projects')} className="flex items-center gap-2 text-gray-400 hover:text-[#1B2B48] font-bold mb-2"><ArrowLeft size={18}/> العودة</button>
                <h1 className="text-3xl font-black text-[#1B2B48]">{project.name}</h1>
                <p className="text-gray-400 flex items-center gap-2 mt-1"><MapPin size={16} className="text-[#E95D22]"/> {project.location}</p>
            </div>
            <div className="flex gap-4">
               <button onClick={() => setIsAddWorkOpen(true)} className="bg-[#1B2B48] text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-[#2a3f63] shadow-lg">
                   <Plus size={20}/> إضافة عمل جديد
               </button>
            </div>
        </div>

        <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-[#E95D22] text-white rounded-xl"><HardHat size={24}/></div>
                <h2 className="text-2xl font-black text-[#1B2B48]">سجل أعمال المشروع</h2>
            </div>
            {thisProjectWorks.length === 0 ? (
                <div className="text-center p-10 text-gray-400 bg-gray-50 rounded-3xl border-dashed border-2">لا توجد أعمال مسجلة حالياً</div>
            ) : (
                <div className="grid gap-4">
                    {thisProjectWorks.map((work: any) => (
                        <div key={work.id} onClick={() => openWorkDetails(work)} className="flex items-center justify-between p-5 bg-gray-50 rounded-2xl hover:bg-white hover:shadow-md transition-all border border-gray-100 cursor-pointer group">
                            <div className="flex items-center gap-4">
                                <div className={`w-3 h-12 rounded-full ${work.status === 'completed' ? 'bg-green-500' : 'bg-orange-500'}`}></div>
                                <div>
                                    <h3 className="font-bold text-[#1B2B48] text-lg group-hover:text-[#E95D22] transition-colors">{work.task_name}</h3>
                                    <p className="text-sm text-gray-500 flex items-center gap-2">
                                      <span className="bg-white px-2 py-1 rounded border">{work.authority || 'جهة غير محددة'}</span>
                                      <span className="bg-white px-2 py-1 rounded border">{work.department || 'القسم'}</span>
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="text-xs text-gray-400 font-bold">{new Date(work.created_at).toLocaleDateString('ar-SA')}</span>
                                <span className={`px-4 py-2 rounded-xl font-bold text-sm ${work.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                    {work.status === 'completed' ? 'منجز ✅' : 'متابعة ⏳'}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>

        <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100">
             <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-blue-600 text-white rounded-xl"><Zap size={24}/></div>
                <h2 className="text-2xl font-black text-[#1B2B48]">الطلبات الفنية والإفراغات</h2>
            </div>
            <TechnicalModule requests={thisProjectTech} projects={[project]} currentUser={{role: 'ADMIN'} as any} usersList={[]} onRefresh={onRefresh} />
        </div>

        <Modal isOpen={isAddWorkOpen} onClose={() => setIsAddWorkOpen(false)} title="إضافة عمل جديد للمشروع">
            <div className="space-y-4 font-cairo text-right">
                <div>
                    <label className="block text-sm font-bold text-gray-500 mb-1">اسم العمل / المهمة</label>
                    <input className="w-full p-4 bg-gray-50 rounded-2xl border focus:border-[#E95D22] outline-none" placeholder="مثال: إصدار رخصة بناء" value={newWorkForm.task_name} onChange={e => setNewWorkForm({...newWorkForm, task_name: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-500 mb-1">الجهة الحكومية / الخاصة</label>
                        <input className="w-full p-4 bg-gray-50 rounded-2xl border focus:border-[#E95D22] outline-none" placeholder="مثال: الأمانة" value={newWorkForm.authority} onChange={e => setNewWorkForm({...newWorkForm, authority: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-500 mb-1">القسم المسؤول</label>
                        <input className="w-full p-4 bg-gray-50 rounded-2xl border focus:border-[#E95D22] outline-none" placeholder="مثال: إدارة المشاريع" value={newWorkForm.department} onChange={e => setNewWorkForm({...newWorkForm, department: e.target.value})} />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-500 mb-1">الوصف / الملاحظات</label>
                    <textarea 
                        className="w-full p-4 bg-gray-50 rounded-2xl border focus:border-[#E95D22] outline-none h-32 resize-none" 
                        placeholder="أكتب تفاصيل العمل أو أي ملاحظات أولية..." 
                        value={newWorkForm.notes} 
                        onChange={e => setNewWorkForm({...newWorkForm, notes: e.target.value})} 
                    />
                </div>
                <button onClick={handleAddWork} className="w-full bg-[#E95D22] text-white py-4 rounded-2xl font-bold text-lg hover:brightness-110 mt-4 shadow-lg transition-all">حفظ العمل</button>
            </div>
        </Modal>

        {selectedWork && (
            <Modal isOpen={!!selectedWork} onClose={() => setSelectedWork(null)} title={selectedWork.task_name}>
                <div className="font-cairo text-right space-y-6">
                    {selectedWork.notes && (
                        <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                            <h5 className="font-bold text-blue-800 mb-2 flex items-center gap-2"><AlignLeft size={16}/> وصف العمل:</h5>
                            <p className="text-gray-700 text-sm leading-relaxed">{selectedWork.notes}</p>
                        </div>
                    )}
                    <div className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl">
                        <span className="font-bold text-gray-500">حالة العمل الحالية:</span>
                        <button 
                            onClick={() => handleStatusChange(selectedWork.status === 'completed' ? 'in_progress' : 'completed')}
                            className={`px-6 py-2 rounded-xl font-bold transition-all shadow-sm ${selectedWork.status === 'completed' ? 'bg-green-500 text-white' : 'bg-orange-500 text-white hover:bg-green-500'}`}
                        >
                            {selectedWork.status === 'completed' ? 'مكتمل ✅' : 'قيد المتابعة ⏳ (اضغط للإكمال)'}
                        </button>
                    </div>
                    <div className="border-t pt-4">
                        <h4 className="font-bold text-[#1B2B48] mb-4 flex items-center gap-2"><MessageSquare size={18}/> التحديثات والملاحظات</h4>
                        <div className="bg-gray-50 rounded-2xl p-4 h-64 overflow-y-auto mb-4 space-y-3 custom-scrollbar border border-gray-100">
                            {workComments.length === 0 ? <p className="text-gray-400 text-center text-sm py-10">لا توجد ملاحظات بعد</p> : workComments.map(c => (
                                <div key={c.id} className="bg-white p-3 rounded-xl shadow-sm border border-gray-100">
                                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                                        <span className="font-bold text-[#E95D22]">{c.user_name}</span>
                                        <span>{new Date(c.created_at).toLocaleTimeString('ar-SA', {hour: '2-digit', minute:'2-digit'})}</span>
                                    </div>
                                    <p className="text-sm text-gray-700">{c.content}</p>
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <button onClick={handleAddComment} className="p-3 bg-[#1B2B48] text-white rounded-xl hover:bg-[#2a3f63] transition-all"><Send size={20}/></button>
                            <input 
                                className="flex-1 p-3 bg-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-[#1B2B48]/20 transition-all" 
                                placeholder="أكتب تحديثاً جديداً..." 
                                value={newComment}
                                onChange={e => setNewComment(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleAddComment()}
                            />
                        </div>
                    </div>
                </div>
            </Modal>
        )}
     </div>
   );
};

// --- ERROR BOUNDARY WRAPPER ---
// Important: This component doesn't have Router inside, assuming Router is in main.tsx/index.tsx
// If your main.tsx DOES NOT have a Router, wrap <AppContent /> with <BrowserRouter> here.
const App: React.FC = () => (
  <ErrorBoundary>
    <AppContent />
  </ErrorBoundary>
);

export default App;
