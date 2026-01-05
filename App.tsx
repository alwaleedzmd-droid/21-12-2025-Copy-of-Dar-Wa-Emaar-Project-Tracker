
import React, { useState, useEffect, ReactNode, useMemo, useRef } from 'react';
import { Routes, Route, useNavigate, useLocation, useParams, Navigate } from 'react-router-dom';
import { 
  LayoutDashboard, Users, FileText, LogOut, 
  ArrowLeft, Loader2, Zap, Plus,
  Building2, AlertTriangle, Menu, 
  MapPin, MessageSquare, Send, X, Bot, HardHat, AlignLeft, Sparkles, ArrowUpLeft, ClipboardList,
  FileStack
} from 'lucide-react';
import { supabase } from './supabaseClient';
import { ProjectSummary, User, TechnicalRequest, ClearanceRequest, ProjectWork, WorkComment } from './types';
import { DAR_LOGO } from './constants';
import Modal from './components/Modal';
import ManageRequestModal from './components/ManageRequestModal';
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

  useEffect(() => {
      if (currentUser) {
          setMessages([{ 
              id: 1, 
              text: `مرحباً ${currentUser?.name || ''} 👋\nأنا مساعدك الذكي لمتابعة المشاريع.\nاسألني عن أي مشروع (مثال: "سرايا البدر") وسأعطيك تقريراً مفصلاً.`, 
              sender: 'bot', 
              time: new Date().toLocaleTimeString('ar-SA', {hour: '2-digit', minute:'2-digit'}) 
          }]);
      }
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
         const relatedTech = technicalRequests.filter((t: any) => t.projectId === project.id || t.project_id === project.id) || [];
         const allTasks = [...relatedWorks, ...relatedTech];

         const completedList = allTasks.filter((w: any) => w.status === 'completed' || w.status === 'منجز');
         const pendingList = allTasks.filter((w: any) => w.status !== 'completed' && w.status !== 'منجز');

         let detailsText = "";
         if (completedList.length > 0) {
             detailsText += `\n✅ **أبرز الأعمال المنجزة:**\n`;
             completedList.slice(0, 3).forEach((w: any) => { detailsText += `- ${w.task_name || w.service_type || w.type}\n`; });
             if (completedList.length > 3) detailsText += `...و ${completedList.length - 3} أعمال أخرى.\n`;
         }

         if (pendingList.length > 0) {
             detailsText += `\n⏳ **أعمال قيد المتابعة:**\n`;
             pendingList.slice(0, 3).forEach((w: any) => { detailsText += `- ${w.task_name || w.service_type || w.type}\n`; });
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
  const { 
    currentUser, isAuthLoading, login, logout,
    projects, technicalRequests, clearanceRequests, appUsers, activities, refreshData, logActivity 
  } = useData();

  const [projectWorks, setProjectWorks] = useState<ProjectWork[]>([]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => safeStorage.getItem(STORAGE_KEYS.SIDEBAR_COLLAPSED) === 'true');
  const [loginData, setLoginData] = useState({ email: 'adaldawsari@darwaemaar.com', password: '' });

  const fetchGlobalWorks = async () => {
      const { data } = await supabase.from('project_works').select('*').order('created_at', { ascending: false });
      if (data) setProjectWorks(data);
  };

  useEffect(() => {
      if (currentUser) fetchGlobalWorks();
  }, [currentUser]);

  if (isAuthLoading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="animate-spin text-[#E95D22] w-12 h-12" /></div>;

  if (!currentUser) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 font-cairo" dir="rtl">
      <div className="bg-[#1B2B48] w-full max-w-md rounded-[50px] shadow-2xl overflow-hidden border border-gray-100">
        <div className="p-12 text-center"><img src={DAR_LOGO} className="h-40 mx-auto mb-6" alt="Logo" /><h1 className="text-white text-3xl font-bold">بوابة المتابعة</h1></div>
        <form onSubmit={(e) => { e.preventDefault(); login(loginData.email, loginData.password); }} className="p-10 bg-white space-y-6 rounded-t-[50px]">
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
           <SidebarItem icon={<LayoutDashboard />} label="لوحة التحكم" active={location.pathname === '/'} onClick={() => navigate('/')} collapsed={isSidebarCollapsed} />
           <SidebarItem icon={<Building2 />} label="المشاريع" active={location.pathname.startsWith('/projects')} onClick={() => navigate('/projects')} collapsed={isSidebarCollapsed} />
           <SidebarItem icon={<Zap />} label="الطلبات الفنية" active={location.pathname === '/technical'} onClick={() => navigate('/technical')} collapsed={isSidebarCollapsed} />
           <SidebarItem icon={<FileStack size={20} />} label="سجل الإفراغات" active={location.pathname === '/deeds'} onClick={() => navigate('/deeds')} collapsed={isSidebarCollapsed} />
        </nav>
        <div className="p-4 bg-[#16233a]">
           <button onClick={logout} className="w-full flex items-center gap-3 p-3 text-red-400 hover:bg-white/5 rounded-xl transition-all">
             <LogOut size={20} /> {!isSidebarCollapsed && "خروج"}
           </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="bg-white h-20 border-b flex items-center justify-between px-8 shadow-sm z-20">
           <div className="flex items-center gap-4">
             <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"><Menu size={24}/></button>
             <h1 className="text-2xl font-black text-[#1B2B48]">
               {location.pathname === '/' ? 'لوحة المعلومات المركزية' : location.pathname.startsWith('/projects') ? 'إدارة المشاريع' : 'بوابة المتابعة'}
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
              <Route path="/" element={<DashboardModule projects={projects} techRequests={technicalRequests} projectWorks={projectWorks} clearanceRequests={clearanceRequests} activities={activities} currentUser={currentUser} users={appUsers} onQuickAction={() => {}} onUpdateStatus={() => {}} />} />
              <Route path="/projects" element={<ProjectsModule projects={projects} stats={{ projects: projects.length, techRequests: technicalRequests.length, clearRequests: clearanceRequests.length }} currentUser={currentUser} onProjectClick={(p) => navigate(`/projects/${p?.id}`)} onRefresh={refreshData} />} />
              <Route path="/projects/:id" element={<ProjectDetailWrapper projects={projects} onRefresh={() => { refreshData(); fetchGlobalWorks(); }} currentUser={currentUser} />} />
              <Route path="/technical" element={<TechnicalModule requests={technicalRequests} projects={projects} currentUser={currentUser} usersList={appUsers} onRefresh={refreshData} logActivity={logActivity} />} />
              <Route path="/deeds" element={<DeedsDashboard currentUserRole={currentUser.role} currentUserName={currentUser.name} logActivity={logActivity} />} />
              <Route path="*" element={<Navigate to="/" replace />} />
           </Routes>
        </div>

        <AIAssistantInternal 
            currentUser={currentUser} 
            projects={projects}
            technicalRequests={technicalRequests}
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
const ProjectDetailWrapper = ({ projects = [], onRefresh, currentUser }: any) => {
   const { id } = useParams();
   const navigate = useNavigate();
   const { technicalRequests = [], refreshData, logActivity } = useData();
   
   const [selectedWork, setSelectedWork] = useState<ProjectWork | null>(null);
   const [selectedTechRequest, setSelectedTechRequest] = useState<TechnicalRequest | null>(null);
   const [isAddWorkOpen, setIsAddWorkOpen] = useState(false);
   const [projectWorks, setProjectWorks] = useState<ProjectWork[]>([]);
   const [workComments, setWorkComments] = useState<WorkComment[]>([]);
   const [newComment, setNewComment] = useState('');
   const [newWorkForm, setNewWorkForm] = useState({ task_name: '', authority: '', department: '', notes: '' });
   const [isTechModalOpen, setIsTechModalOpen] = useState(false);
   const [isTechLoading, setIsTechLoading] = useState(false);

   const project = useMemo(() => projects.find((p: any) => p.id === Number(id)), [projects, id]);

   // التصفية الجراحية للطلبات الفنية المرتبطة بهذا المشروع
   const thisProjectTech = useMemo(() => {
     return (technicalRequests || []).filter((t: any) => (Number(t?.project_id) === Number(id) || Number(t?.projectId) === Number(id))) || [];
   }, [technicalRequests, id]);

   const fetchWorks = async () => {
       if (!id) return;
       const { data } = await supabase.from('project_works').select('*').eq('projectId', Number(id)).order('created_at', { ascending: false });
       if (data) setProjectWorks(data);
   };

   useEffect(() => { fetchWorks(); }, [id]);

   const handleAddWork = async () => {
       if (!newWorkForm.task_name || !project) return alert("الرجاء كتابة اسم العمل");
       const { error } = await supabase.from('project_works').insert({
           ...newWorkForm,
           project_name: project?.name || project?.title,
           projectId: project?.id,
           status: 'in_progress'
       });
       if (error) alert("خطأ: " + error.message);
       else {
           setIsAddWorkOpen(false);
           setNewWorkForm({ task_name: '', authority: '', department: '', notes: '' });
           fetchWorks();
           onRefresh();
       }
   };

   const fetchComments = async (workId: number) => {
       const { data } = await supabase.from('work_comments').select('*').eq('work_id', Number(workId)).order('created_at');
       if (data) setWorkComments(data);
   };

   const handleAddComment = async () => {
       if (!newComment || !selectedWork) return;
       const { error } = await supabase.from('work_comments').insert({
           content: newComment,
           work_id: Number(selectedWork?.id),
           user_name: currentUser?.name
       });
       if (!error) {
           setNewComment('');
           fetchComments(selectedWork?.id);
       }
   };

   const handleStatusChange = async (newStatus: string) => {
       if (!selectedWork) return;
       const { error } = await supabase.from('project_works').update({ status: newStatus }).eq('id', Number(selectedWork?.id));
       if (!error) {
           setSelectedWork({ ...selectedWork, status: newStatus });
           fetchWorks();
           onRefresh();
       }
   };

   // وظيفة جراحية ومستقرة لتحديث حالة الطلب الفني ومعالجة الأخطاء بشكل دقيق
   const handleTechStatusUpdate = async (newStatus: string) => {
     if (!selectedTechRequest?.id) return;
     setIsTechLoading(true);
     try {
       // إعداد حمولة التحديث بدون updated_at يدوياً لترك التحكم لقاعدة البيانات
       const updatePayload: any = { 
         status: newStatus
       };

       // تحديث التقدم تلقائياً إذا كانت الحالة منجز
       if (newStatus === 'completed' || newStatus === 'منجز') {
         updatePayload.progress = 100;
       }

       const { error } = await supabase
         .from('technical_requests')
         .update(updatePayload)
         .eq('id', Number(selectedTechRequest?.id));
       
       if (error) {
         console.error("Supabase technical_requests update error:", error);
         // استخراج رسالة الخطأ لتجنب ظهور [object Object]
         const errorMsg = error?.message || (typeof error === 'object' ? JSON.stringify(error) : String(error));
         throw new Error(errorMsg);
       }
       
       // تحديث الحالة محلياً للطلب المختار لضمان رؤية التغيير فوراً في المودال
       setSelectedTechRequest(prev => prev ? ({ ...prev, ...updatePayload }) : null);

       // تسجيل النشاط
       if (logActivity) {
         logActivity('تحديث حالة الطلب', `${selectedTechRequest?.service_type || 'طلب فني'}: ${newStatus}`, 'text-blue-500');
       }
       
       // تحديث البيانات على مستوى التطبيق والمكون (onRefresh استدعاء في حال النجاح فقط)
       await refreshData();
       if (onRefresh) onRefresh();
       
       // Success Alert ONLY if no error
       alert("تم تحديث حالة الطلب بنجاح ✅");
       
     } catch (err: any) {
       console.error("Detailed Technical Request Update Error:", err);
       alert("فشل تحديث الحالة: " + (err?.message || "حدث خطأ غير متوقع في الاتصال بقاعدة البيانات"));
       // إعادة رمي الخطأ لتمكين المكون الابن من التراجع عن الحالة المحلية
       throw err;
     } finally {
       setIsTechLoading(false);
     }
   };

   if (!project) return (
       <div className="flex flex-col items-center justify-center h-full text-center">
           <Building2 size={64} className="text-gray-300 mb-4" />
           <h2 className="text-xl font-bold text-gray-600">جاري تحميل بيانات المشروع...</h2>
       </div>
   );

   return (
     <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
        <ProjectDetailView project={project} isAdmin={currentUser?.role === 'ADMIN'} onBack={() => navigate('/projects')} onRefresh={onRefresh} />
        
        {/* قسم أعمال المشروع (سجل المهام المضافة يدوياً) */}
        <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-[#1B2B48] text-white rounded-xl"><HardHat size={24}/></div>
                    <h2 className="text-2xl font-black text-[#1B2B48]">سجل أعمال المشروع</h2>
                </div>
                <button onClick={() => setIsAddWorkOpen(true)} className="bg-[#E95D22] text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:brightness-110 shadow-lg">
                   <Plus size={20}/> إضافة عمل
                </button>
            </div>
            {(projectWorks || [])?.length === 0 ? (
                <div className="text-center p-12 text-gray-400 bg-gray-50 rounded-[30px] border-dashed border-2 font-bold">لا توجد أعمال مسجلة لهذا المشروع حالياً</div>
            ) : (
                <div className="grid gap-4">
                    {(projectWorks || [])?.map((work) => (
                        <div key={work?.id} onClick={() => { setSelectedWork(work); fetchComments(work?.id); }} className="flex items-center justify-between p-5 bg-gray-50 rounded-2xl hover:bg-white hover:shadow-md transition-all border border-gray-100 cursor-pointer group">
                            <div className="flex items-center gap-4">
                                <div className={`w-3 h-12 rounded-full ${work?.status === 'completed' || work?.status === 'منجز' ? 'bg-green-500' : 'bg-orange-500'}`}></div>
                                <div>
                                    <h3 className="font-bold text-[#1B2B48] text-lg group-hover:text-[#E95D22] transition-colors">{work?.task_name}</h3>
                                    <p className="text-xs text-gray-500 font-bold mt-1">{work?.authority || 'جهة غير محددة'}</p>
                                </div>
                            </div>
                            <span className={`px-4 py-2 rounded-xl font-bold text-sm ${work?.status === 'completed' || work?.status === 'منجز' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                {work?.status === 'completed' || work?.status === 'منجز' ? 'منجز ✅' : 'قيد المتابعة ⏳'}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>

        {/* قسم الطلبات الفنية المرتبطة بالمشروع (من جدول technical_requests) */}
        <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-blue-600 text-white rounded-xl"><ClipboardList size={24}/></div>
                <h2 className="text-2xl font-black text-[#1B2B48]">الطلبات الفنية والمراجعات</h2>
            </div>
            {(thisProjectTech || [])?.length === 0 ? (
                <div className="text-center p-12 text-gray-400 bg-gray-50 rounded-[30px] border-dashed border-2 font-bold">لا توجد طلبات فنية مرتبطة بهذا المشروع</div>
            ) : (
                <div className="grid gap-4">
                    {(thisProjectTech || [])?.map((req: any) => (
                        <div 
                          key={req?.id} 
                          onClick={() => { setSelectedTechRequest(req); setIsTechModalOpen(true); }}
                          className="flex items-center justify-between p-5 bg-gray-50 rounded-2xl border border-gray-100 hover:bg-white hover:shadow-md transition-all cursor-pointer group"
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-3 h-12 rounded-full ${req?.status === 'completed' || req?.status === 'منجز' ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                                <div>
                                    <h3 className="font-bold text-[#1B2B48] text-lg group-hover:text-blue-600 transition-colors">{req?.service_type || req?.type}</h3>
                                    <p className="text-xs text-gray-400 font-bold mt-1">{req?.reviewing_entity || 'جهة المراجعة'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className={`px-4 py-2 rounded-xl font-bold text-sm ${req?.status === 'completed' || req?.status === 'منجز' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                    {req?.status === 'completed' || req?.status === 'منجز' ? 'منجز ✅' : 'قيد المتابعة ⏳'}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>

        {/* نافذة المتابعة للطلب الفني */}
        {selectedTechRequest && (
          <ManageRequestModal 
            isOpen={isTechModalOpen}
            onClose={() => { setIsTechModalOpen(false); setSelectedTechRequest(null); }}
            request={selectedTechRequest}
            currentUser={currentUser}
            usersList={[]} 
            onUpdateStatus={handleTechStatusUpdate}
            onUpdateDelegation={() => {}}
          />
        )}

        <Modal isOpen={isAddWorkOpen} onClose={() => setIsAddWorkOpen(false)} title="إضافة عمل جديد للمشروع">
            <div className="space-y-4 font-cairo text-right">
                <input className="w-full p-4 bg-gray-50 rounded-2xl border outline-none font-bold" placeholder="اسم العمل / المهمة" value={newWorkForm.task_name} onChange={e => setNewWorkForm({...newWorkForm, task_name: e.target.value})} />
                <div className="grid grid-cols-2 gap-4">
                    <input className="w-full p-4 bg-gray-50 rounded-2xl border outline-none font-bold" placeholder="الجهة المراجعة" value={newWorkForm.authority} onChange={e => setNewWorkForm({...newWorkForm, authority: e.target.value})} />
                    <input className="w-full p-4 bg-gray-50 rounded-2xl border outline-none font-bold" placeholder="القسم" value={newWorkForm.department} onChange={e => setNewWorkForm({...newWorkForm, department: e.target.value})} />
                </div>
                <textarea className="w-full p-4 bg-gray-50 rounded-2xl border outline-none h-32 resize-none font-bold" placeholder="ملاحظات إضافية..." value={newWorkForm.notes} onChange={e => setNewWorkForm({...newWorkForm, notes: e.target.value})} />
                <button onClick={handleAddWork} className="w-full bg-[#1B2B48] text-white py-4 rounded-2xl font-black text-lg hover:brightness-110 shadow-lg transition-all active:scale-95">حفظ العمل</button>
            </div>
        </Modal>

        {selectedWork && (
            <Modal isOpen={!!selectedWork} onClose={() => setSelectedWork(null)} title={selectedWork?.task_name}>
                <div className="font-cairo text-right space-y-6">
                    {(selectedWork as any)?.notes && (
                        <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                            <h5 className="font-bold text-blue-800 mb-2 flex items-center gap-2"><AlignLeft size={16}/> وصف العمل:</h5>
                            <p className="text-gray-700 text-sm leading-relaxed">{(selectedWork as any)?.notes}</p>
                        </div>
                    )}
                    <div className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl">
                        <span className="font-bold text-gray-500">الحالة:</span>
                        <button 
                            onClick={() => handleStatusChange(selectedWork?.status === 'completed' || selectedWork?.status === 'منجز' ? 'in_progress' : 'completed')}
                            className={`px-6 py-2 rounded-xl font-bold transition-all shadow-sm ${selectedWork?.status === 'completed' || selectedWork?.status === 'منجز' ? 'bg-green-500 text-white' : 'bg-orange-500 text-white hover:bg-green-500'}`}
                        >
                            {selectedWork?.status === 'completed' || selectedWork?.status === 'منجز' ? 'مكتمل ✅' : 'قيد المتابعة ⏳ (اضغط للإكمال)'}
                        </button>
                    </div>
                    <div className="border-t pt-4">
                        <h4 className="font-bold text-[#1B2B48] mb-4 flex items-center gap-2"><MessageSquare size={18}/> التحديثات والملاحظات</h4>
                        <div className="bg-gray-50 rounded-2xl p-4 h-48 overflow-y-auto mb-4 space-y-3 custom-scrollbar border border-gray-100">
                            {(workComments || [])?.length === 0 ? <p className="text-gray-400 text-center text-sm py-10 font-bold">لا توجد ملاحظات بعد</p> : (workComments || [])?.map(c => (
                                <div key={c?.id} className="bg-white p-3 rounded-xl shadow-sm border border-gray-100">
                                    <div className="flex justify-between text-xs text-gray-400 mb-1 font-bold">
                                        <span className="text-[#E95D22]">{c?.user_name}</span>
                                        <span>{c?.created_at ? new Date(c?.created_at).toLocaleTimeString('ar-SA', {hour: '2-digit', minute:'2-digit'}) : ''}</span>
                                    </div>
                                    <p className="text-sm text-gray-700 font-bold">{c?.content}</p>
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <button onClick={handleAddComment} className="p-3 bg-[#1B2B48] text-white rounded-xl hover:bg-[#2a3f63] transition-all"><Send size={20}/></button>
                            <input 
                                className="flex-1 p-3 bg-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-[#1B2B48]/20 transition-all font-bold" 
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

const App: React.FC = () => (
  <ErrorBoundary>
    <AppContent />
  </ErrorBoundary>
);

export default App;
