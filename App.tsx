
import React, { useState, useEffect, ReactNode, useRef, useMemo } from 'react';
import { 
  LayoutDashboard, Users, FileText, Settings, LogOut, 
  Plus, ChevronRight, ChevronLeft, History as HistoryIcon, 
  FileCheck, User as UserIcon, UploadCloud,
  Menu, X, ArrowLeft, CheckCircle, XCircle, AlertCircle,
  ImageIcon, Pin, Search, Filter, Trash2, Loader2, 
  Send, Clock, CheckCircle2, ShieldCheck, UserPlus, Building, 
  MessageSquare, MessageCirclePlus, MapPin, FileSpreadsheet,
  ListChecks, AlertTriangle, RotateCcw, ThumbsUp, ThumbsDown,
  Building2, SortAsc, SortDesc, Edit2, CreditCard, Landmark, Hash, Phone, FileUp,
  ClipboardList, CheckCircle as CheckIcon, XCircle as CloseIcon, RefreshCw, FileDown,
  HardHat, Droplets, Zap, Info, Briefcase, Mail, Key, Shield, PieChart, BarChart3, Activity,
  Download
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from './supabaseClient';
import { 
  Task, ProjectSummary, User, ServiceRequest, RequestStatus, 
  ViewState, UserRole, Comment, ProjectDetails, ContractorInfo
} from './types';
import { 
  INITIAL_USERS, RAW_CSV_DATA, DAR_LOGO,
  LOCATIONS_ORDER, TECHNICAL_SERVICE_TYPES, GOVERNMENT_AUTHORITIES
} from './constants';
import ProjectCard from './components/ProjectCard';
import TaskCard from './components/TaskCard';
import Modal from './components/Modal';

// الوصول لمكتبات PDF من النافذة العالمية (Global Window) لضمان التوافق
const html2canvas = (window as any).html2canvas;
const jspdfModule = (window as any).jspdf;

const STORAGE_KEYS = {
    USERS: 'dar_persistent_v1_users',
    REQUESTS: 'dar_persistent_v1_requests',
    SIDEBAR_COLLAPSED: 'dar_persistent_v1_sidebar_collapsed',
    PROJECT_METADATA: 'dar_persistent_v1_project_metadata'
};

const safeStorage = {
  getItem: (key: string): string | null => {
    try { return localStorage.getItem(key); } catch { return null; }
  },
  setItem: (key: string, value: string): void => {
    try { localStorage.setItem(key, value); } catch {}
  }
};

interface ErrorBoundaryProps {
  children?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
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
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [users, setUsers] = useState<User[]>(() => {
    const saved = safeStorage.getItem(STORAGE_KEYS.USERS);
    return saved ? JSON.parse(saved) : INITIAL_USERS;
  });
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>(() => {
    const saved = safeStorage.getItem(STORAGE_KEYS.REQUESTS);
    return saved ? JSON.parse(saved) : [];
  });
  const [projectMetadata, setProjectMetadata] = useState<Record<string, ProjectDetails>>(() => {
    const saved = safeStorage.getItem(STORAGE_KEYS.PROJECT_METADATA);
    return saved ? JSON.parse(saved) : {};
  });

  const fetchProjects = async () => {
    setIsDbLoading(true);
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;

      const grouped: Record<string, Task[]> = {};
      data?.forEach((row: any) => {
        const task: Task = {
          id: row.id.toString(),
          project: row.client,
          description: row.title,
          reviewer: row.reviewer || '', 
          requester: row.requester || '',
          notes: row.notes || '',
          location: 'الرياض', 
          status: row.status || 'متابعة',
          date: row.date || new Date().toISOString().split('T')[0],
          comments: row.comments || []
        };
        if (!grouped[row.client]) grouped[row.client] = [];
        grouped[row.client].push(task);
      });

      const summaries: ProjectSummary[] = Object.keys(grouped).map(name => {
        const tasks = grouped[name];
        const done = tasks.filter(t => t.status === 'منجز').length;
        const metadata = projectMetadata[name] || {};
        return {
          name,
          location: metadata.location || 'الرياض',
          tasks,
          totalTasks: tasks.length,
          completedTasks: done,
          progress: tasks.length > 0 ? (done / tasks.length) * 100 : 0,
          isPinned: false,
          details: metadata
        };
      });

      setProjects(summaries);
    } catch (err) {
      console.error("Fetch Error:", err);
    } finally {
      setIsDbLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [projectMetadata]);

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [view, setView] = useState<ViewState>('LOGIN');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => safeStorage.getItem(STORAGE_KEYS.SIDEBAR_COLLAPSED) === 'true');

  const [searchQuery, setSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Completed'>('All');
  
  const [selectedProject, setSelectedProject] = useState<ProjectSummary | null>(null);
  const [selectedTaskForComments, setSelectedTaskForComments] = useState<Task | null>(null);
  const [selectedRequestForComments, setSelectedRequestForComments] = useState<ServiceRequest | null>(null);
  const [selectedRequestForDetails, setSelectedRequestForDetails] = useState<ServiceRequest | null>(null);
  
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isProjectEditModalOpen, setIsProjectEditModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isCommentsModalOpen, setIsCommentsModalOpen] = useState(false);
  const [isRequestCommentsModalOpen, setIsRequestCommentsModalOpen] = useState(false);
  const [isRequestDetailModalOpen, setIsRequestDetailModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeleteTaskConfirmOpen, setIsDeleteTaskConfirmOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [newProject, setNewProject] = useState<Partial<ProjectSummary>>({ name: '', location: LOCATIONS_ORDER[0] });
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [newTaskData, setNewTaskData] = useState<Partial<Task>>({ status: 'متابعة' });
  const [newCommentText, setNewCommentText] = useState('');
  const [newRequestCommentText, setNewRequestCommentText] = useState('');
  const [newRequest, setNewRequest] = useState<Partial<ServiceRequest>>({ projectName: '', type: 'technical' });
  const [newUser, setNewUser] = useState<Partial<User>>({ role: 'PR_OFFICER' });

  const [tempProjectDetails, setTempProjectDetails] = useState<ProjectDetails>({});

  useEffect(() => { safeStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users)); }, [users]);
  useEffect(() => { safeStorage.setItem(STORAGE_KEYS.REQUESTS, JSON.stringify(serviceRequests)); }, [serviceRequests]);
  useEffect(() => { safeStorage.setItem(STORAGE_KEYS.SIDEBAR_COLLAPSED, String(isSidebarCollapsed)); }, [isSidebarCollapsed]);
  useEffect(() => { safeStorage.setItem(STORAGE_KEYS.PROJECT_METADATA, JSON.stringify(projectMetadata)); }, [projectMetadata]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = users.find(u => u.email === loginData.email && u.password === loginData.password);
    if (user) {
      setCurrentUser(user);
      if (user.role === 'TECHNICAL' || user.role === 'CONVEYANCE') setView('SERVICE_ONLY');
      else if (user.role === 'FINANCE') setView('REQUESTS');
      else setView('DASHBOARD');
    } else alert('بيانات الدخول غير صحيحة');
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.name || !newUser.email || !newUser.password) return alert('يرجى تعبئة كافة الحقول');
    const createdUser: User = { id: Date.now().toString(), name: newUser.name, email: newUser.email, password: newUser.password, role: newUser.role as UserRole };
    setUsers([...users, createdUser]);
    setIsUserModalOpen(false);
    setNewUser({ role: 'PR_OFFICER' });
    alert('تم إنشاء الحساب بنجاح');
  };

  const handleDeleteUser = (userId: string) => {
    if (userId === '1') return alert('لا يمكن حذف حساب مدير النظام الرئيسي');
    if (confirm('هل أنت متأكد من حذف هذا الحساب؟')) setUsers(users.filter(u => u.id !== userId));
  };

  const handleDeleteRequest = (requestId: string) => {
    if (confirm('هل أنت متأكد من حذف هذا الطلب؟')) {
      setServiceRequests(prev => prev.filter(r => r.id !== requestId));
      alert('تم حذف الطلب بنجاح');
    }
  };

  const handleCreateProject = async () => {
    if (!newProject.name) return alert('يرجى إدخال اسم المشروع');
    const { error } = await supabase.from('projects').insert([{ title: 'بداية المشروع', client: newProject.name, status: 'متابعة', date: new Date().toISOString().split('T')[0] }]);
    if (error) alert("خطأ: " + error.message);
    else {
      setProjectMetadata({ ...projectMetadata, [newProject.name]: { ...projectMetadata[newProject.name], location: newProject.location } });
      await fetchProjects();
      setIsProjectModalOpen(false);
      setNewProject({ name: '', location: LOCATIONS_ORDER[0] });
    }
  };

  const handleUpdateProjectDetails = () => {
    if (!selectedProject) return;
    setProjectMetadata({ ...projectMetadata, [selectedProject.name]: tempProjectDetails });
    setIsProjectEditModalOpen(false);
    alert('تم تحديث بيانات المشروع بنجاح');
  };

  const handleDeleteProject = async () => {
    if (projectToDelete) {
      const { error } = await supabase.from('projects').delete().eq('client', projectToDelete);
      if (error) alert(error.message);
      else {
        const newMetadata = { ...projectMetadata };
        delete newMetadata[projectToDelete];
        setProjectMetadata(newMetadata);
        await fetchProjects();
        if (selectedProject?.name === projectToDelete) setView('DASHBOARD');
        setIsDeleteConfirmOpen(false);
        setProjectToDelete(null);
      }
    }
  };

  const handleDeleteTask = async () => {
    if (taskToDelete) {
      const { error } = await supabase.from('projects').delete().eq('id', taskToDelete.id);
      if (error) alert(error.message);
      else {
        await fetchProjects();
        if (selectedProject) {
            const updated = (await supabase.from('projects').select('*').eq('client', selectedProject.name));
            if (updated.data) {
                const tasks: Task[] = updated.data.map((r: any) => ({ id: r.id.toString(), project: r.client, description: r.title, reviewer: r.reviewer || '', requester: r.requester || '', notes: r.notes || '', location: 'الرياض', status: r.status, date: r.date, comments: r.comments || [] }));
                const done = tasks.filter(t => t.status === 'منجز').length;
                setSelectedProject({ ...selectedProject, tasks, totalTasks: tasks.length, completedTasks: done, progress: tasks.length > 0 ? (done / tasks.length) * 100 : 0, details: projectMetadata[selectedProject.name] || {} });
            }
        }
        setIsDeleteTaskConfirmOpen(false);
        setTaskToDelete(null);
      }
    }
  };

  const handleSaveTask = async () => {
    if (!selectedProject) return;
    const payload = { 
        title: newTaskData.description || 'عمل جديد', 
        status: newTaskData.status || 'متابعة', 
        reviewer: newTaskData.reviewer || '', 
        requester: newTaskData.requester || '', 
        notes: newTaskData.notes || '', 
        client: selectedProject.name, 
        date: new Date().toISOString().split('T')[0] 
    };
    if (editingTask) await supabase.from('projects').update(payload).eq('id', editingTask.id);
    else await supabase.from('projects').insert([payload]);
    await fetchProjects();
    setIsTaskModalOpen(false);
    setEditingTask(null);
    if (selectedProject) {
        const updated = (await supabase.from('projects').select('*').eq('client', selectedProject.name));
        if (updated.data) {
            const tasks: Task[] = updated.data.map((r: any) => ({ id: r.id.toString(), project: r.client, description: r.title, reviewer: r.reviewer || '', requester: r.requester || '', notes: r.notes || '', location: 'الرياض', status: r.status, date: r.date, comments: r.comments || [] }));
            const done = tasks.filter(t => t.status === 'منجز').length;
            setSelectedProject({ ...selectedProject, tasks, totalTasks: tasks.length, completedTasks: done, progress: tasks.length > 0 ? (done / tasks.length) * 100 : 0, details: projectMetadata[selectedProject.name] || {} });
        }
    }
  };

  const handleAddComment = async () => {
    if (!selectedTaskForComments || !newCommentText.trim()) return;
    const newComment: Comment = { id: Date.now().toString(), text: newCommentText, author: currentUser?.name || 'مستخدم', authorRole: currentUser?.role || 'PR_OFFICER', timestamp: new Date().toISOString() };
    const updatedComments = [...(selectedTaskForComments.comments || []), newComment];
    await supabase.from('projects').update({ comments: updatedComments }).eq('id', selectedTaskForComments.id);
    setSelectedTaskForComments({ ...selectedTaskForComments, comments: updatedComments });
    setNewCommentText('');
    await fetchProjects();
  };

  const handleAddRequestComment = () => {
    if (!selectedRequestForComments || !newRequestCommentText.trim()) return;
    const newComment: Comment = { 
      id: Date.now().toString(), 
      text: newRequestCommentText, 
      author: currentUser?.name || 'مستخدم', 
      authorRole: currentUser?.role || 'PR_OFFICER', 
      timestamp: new Date().toISOString() 
    };
    
    setServiceRequests(prev => prev.map(req => {
      if (req.id === selectedRequestForComments.id) {
        const updated = {
          ...req,
          comments: [...(req.comments || []), newComment]
        };
        setSelectedRequestForComments(updated);
        return updated;
      }
      return req;
    }));
    
    setNewRequestCommentText('');
  };

  const handleCreateRequest = (e: React.FormEvent) => {
    e.preventDefault();
    const req: ServiceRequest = { id: Date.now().toString(), name: currentUser?.name || '', projectName: newRequest.projectName || '', type: newRequest.type as any, details: newRequest.details || '', submittedBy: currentUser?.name || '', role: currentUser?.role || '', status: 'new', date: new Date().toISOString().split('T')[0], history: [{ action: 'تقديم طلب جديد', by: currentUser?.name || '', role: currentUser?.role || '', timestamp: new Date().toISOString() }], comments: [], ...newRequest };
    setServiceRequests([req, ...serviceRequests]);
    alert('تم تقديم الطلب بنجاح');
    setNewRequest({ projectName: '', type: newRequest.type });
  };

  const handleUpdateRequestStatus = (requestId: string, newStatus: RequestStatus) => {
    setServiceRequests(prev => prev.map(req => {
      if (req.id === requestId) {
        let actionText = 'تحديث حالة الطلب';
        if (newStatus === 'completed') actionText = 'موافقة على الطلب';
        else if (newStatus === 'rejected') actionText = 'رفض الطلب';
        else if (newStatus === 'revision') actionText = 'طلب تعديل / مراجعة';
        
        return {
          ...req,
          status: newStatus,
          history: [
            ...req.history,
            {
              action: actionText,
              by: currentUser?.name || 'مستخدم',
              role: currentUser?.role || '',
              timestamp: new Date().toISOString()
            }
          ]
        };
      }
      return req;
    }));
    setIsRequestDetailModalOpen(false);
    alert('تم تحديث حالة الطلب بنجاح');
  };

  const handleExportAllProjects = () => {
    const exportData = projects.flatMap(p => p.tasks.map(t => ({ 'المشروع': p.name, 'بيان الأعمال': t.description, 'جهة المراجعة': t.reviewer, 'الجهة طالبة الخدمة': t.requester, 'الموقع': p.location, 'الحالة': t.status, 'التاريخ': t.date })));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "المشاريع");
    XLSX.writeFile(wb, "تقرير_المشاريع.xlsx");
  };

  // وظيفة تصدير PDF
  const handleExportPDF = async () => {
    const element = document.getElementById('statistics-dashboard-content');
    if (!element || !html2canvas || !jspdfModule) {
      alert('مكتبة التصدير غير جاهزة حالياً');
      return;
    }

    setIsExportingPDF(true);
    try {
      const canvas = await html2canvas(element, {
        scale: 2, // جودة أعلى
        useCORS: true,
        backgroundColor: '#f8f9fa',
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
      });

      const imgData = canvas.toDataURL('image/png');
      const { jsPDF } = jspdfModule;
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`تحليلات_المشاريع_دار_وإعمار_${new Date().toLocaleDateString('ar-SA')}.pdf`);
      
    } catch (error) {
      console.error('PDF Export Error:', error);
      alert('حدث خطأ أثناء تصدير ملف PDF');
    } finally {
      setIsExportingPDF(false);
    }
  };

  // --- Filtering Logic for Dashboard ---
  const filteredDashboard = useMemo(() => {
    return projects.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesLocation = locationFilter === 'All' || p.location === locationFilter;
      const matchesStatus = statusFilter === 'All' 
        ? true 
        : statusFilter === 'Completed' ? p.progress >= 100 : p.progress < 100;
      return matchesSearch && matchesLocation && matchesStatus;
    });
  }, [projects, locationFilter, searchQuery, statusFilter]);

  const filteredRequests = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'FINANCE') return serviceRequests.filter(req => req.type === 'conveyance');
    if (['ADMIN', 'PR_MANAGER'].includes(currentUser.role)) return serviceRequests;
    return serviceRequests.filter(req => req.submittedBy === currentUser.name);
  }, [serviceRequests, currentUser]);

  const filteredUsers = useMemo(() => users.filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.email.toLowerCase().includes(searchQuery.toLowerCase())), [users, searchQuery]);

  const projectStatsAggregated = useMemo(() => {
    if (projects.length === 0) return null;
    const totalProjects = projects.length;
    const totalTasks = projects.reduce((acc, p) => acc + p.totalTasks, 0);
    const completedTasks = projects.reduce((acc, p) => acc + p.completedTasks, 0);
    const avgProgress = projects.reduce((acc, p) => acc + p.progress, 0) / totalProjects;
    const locationCounts: Record<string, number> = {};
    projects.forEach(p => { locationCounts[p.location] = (locationCounts[p.location] || 0) + 1; });
    const finishedProjects = projects.filter(p => p.progress >= 100).length;
    return {
      totalProjects, totalTasks, completedTasks, avgProgress, locationCounts, finishedProjects, activeProjects: totalProjects - finishedProjects,
      totalUnits: projects.reduce((acc, p) => acc + (p.details?.unitsCount || 0), 0),
      totalElectricity: projects.reduce((acc, p) => acc + (p.details?.electricityMetersCount || 0), 0),
      totalWater: projects.reduce((acc, p) => acc + (p.details?.waterMetersCount || 0), 0)
    };
  }, [projects]);

  const completedRequestsForCurrentProject = useMemo(() => {
    if (!selectedProject) return [];
    return serviceRequests.filter(req => req.projectName === selectedProject.name && req.status === 'completed');
  }, [serviceRequests, selectedProject]);

  const Logo: React.FC<{ className?: string }> = ({ className }) => (
    <div className={`${className} flex flex-col items-center justify-center`}><img src={DAR_LOGO} className="w-full h-full object-contain" alt="Logo" /></div>
  );

  const getStatusLabel = (status: RequestStatus) => {
    switch (status) {
        case 'new': return { text: 'جديد', color: 'bg-blue-100 text-blue-700' };
        case 'completed': return { text: 'مقبول', color: 'bg-green-100 text-green-700' };
        case 'rejected': return { text: 'مرفوض', color: 'bg-red-100 text-red-700' };
        case 'revision': return { text: 'يحتاج تعديل', color: 'bg-orange-100 text-orange-700' };
        default: return { text: 'تحت الإجراء', color: 'bg-gray-100 text-gray-700' };
    }
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
        case 'ADMIN': return { text: 'مدير نظام', color: 'bg-indigo-100 text-indigo-700' };
        case 'PR_MANAGER': return { text: 'مدير علاقات', color: 'bg-purple-100 text-purple-700' };
        case 'PR_OFFICER': return { text: 'مسؤول علاقات', color: 'bg-blue-100 text-blue-700' };
        case 'TECHNICAL': return { text: 'قسم فني', color: 'bg-orange-100 text-orange-700' };
        case 'CONVEYANCE': return { text: 'موظف إفراغات', color: 'bg-emerald-100 text-emerald-700' };
        case 'FINANCE': return { text: 'المالية', color: 'bg-rose-100 text-rose-700' };
        default: return { text: role, color: 'bg-gray-100 text-gray-700' };
    }
  };

  const canUserCommentOnTasks = useMemo(() => ['ADMIN', 'PR_MANAGER', 'PR_OFFICER'].includes(currentUser?.role || ''), [currentUser]);
  const canUserCommentOnRequests = useMemo(() => {
    if (!currentUser) return false;
    if (['ADMIN', 'PR_MANAGER'].includes(currentUser.role)) return true;
    if (['TECHNICAL', 'CONVEYANCE', 'FINANCE'].includes(currentUser.role)) return true;
    return false;
  }, [currentUser]);

  const InfoCard = ({ icon: Icon, title, value, unit, onClick }: { icon: any, title: string, value: any, unit?: string, onClick?: () => void }) => (
    <div 
        onClick={onClick}
        className={`bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-5 transition-all ${onClick ? 'cursor-pointer hover:shadow-md hover:border-[#E95D22]/20 group' : ''}`}
    >
      <div className={`bg-[#E95D22]/10 p-4 rounded-2xl text-[#E95D22] transition-colors ${onClick ? 'group-hover:bg-[#E95D22] group-hover:text-white' : ''}`}><Icon size={24} /></div>
      <div className="text-right">
        <p className="text-gray-400 text-sm font-bold">{title}</p>
        <p className="text-xl font-bold text-[#1B2B48]">{value || '0'}<span className="text-sm mr-1">{unit}</span></p>
      </div>
      {onClick && <ChevronLeft size={16} className="text-gray-200 mr-auto group-hover:text-[#E95D22] group-hover:translate-x-[-4px] transition-all" />}
    </div>
  );

  const ContactCard = ({ icon: Icon, type, company, engineer, phone }: { icon: any, type: string, company?: string, engineer?: string, phone?: string }) => (
    <div className="bg-gray-50 p-6 rounded-[30px] border border-gray-100 space-y-4">
      <div className="flex items-center gap-3 text-[#1B2B48] font-bold border-b pb-3 border-gray-200">
        <Icon className="text-[#E95D22]" size={20} />
        <span>{type}</span>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-sm"><span className="text-gray-400">الشركة:</span><span className="font-bold">{company || '-'}</span></div>
        <div className="flex justify-between text-sm"><span className="text-gray-400">المهندس:</span><span className="font-bold">{engineer || '-'}</span></div>
        <div className="flex justify-between text-sm"><span className="text-gray-400">الجوال:</span><span className="font-bold text-[#E95D22]" dir="ltr">{phone || '-'}</span></div>
      </div>
    </div>
  );

  if (view === 'LOGIN') return (
    <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center p-4 font-cairo" dir="rtl">
      <div className="bg-[#1B2B48] w-full max-w-md rounded-[50px] shadow-2xl overflow-hidden border border-gray-100 text-center">
        <div className="p-12 relative overflow-hidden"><Logo className="h-48 mx-auto mb-8 relative z-10" /><h1 className="text-white text-4xl font-bold">تسجيل الدخول</h1></div>
        <form onSubmit={handleLogin} className="p-10 bg-white space-y-6 rounded-t-[50px] text-right">
          <input type="email" placeholder="البريد الإلكتروني" className="w-full p-4 bg-gray-50 rounded-2xl border outline-none text-right font-cairo" value={loginData.email} onChange={e => setLoginData({...loginData, email: e.target.value})} required />
          <input type="password" placeholder="كلمة المرور" className="w-full p-4 bg-gray-50 rounded-2xl border outline-none text-right font-cairo" value={loginData.password} onChange={e => setLoginData({...loginData, password: e.target.value})} required />
          <button className="w-full bg-[#E95D22] text-white py-5 rounded-3xl font-bold shadow-xl text-xl">دخول النظام</button>
        </form>
      </div>
    </div>
  );

  const sidebarItems = [ 
    { id: 'DASHBOARD', label: 'الرئيسية', icon: LayoutDashboard, roles: ['ADMIN', 'PR_MANAGER', 'PR_OFFICER'] }, 
    { id: 'STATISTICS', label: 'التحليلات', icon: Activity, roles: ['ADMIN', 'PR_MANAGER'] },
    { id: 'REQUESTS', label: 'الطلبات', icon: FileText, roles: ['ADMIN', 'PR_MANAGER', 'PR_OFFICER', 'FINANCE', 'TECHNICAL', 'CONVEYANCE'] }, 
    { id: 'USERS', label: 'المستخدمين', icon: Users, roles: ['ADMIN'] },
    { id: 'SERVICE_ONLY', label: 'طلب جديد', icon: Plus, roles: ['TECHNICAL', 'CONVEYANCE', 'ADMIN', 'PR_MANAGER', 'PR_OFFICER'] }
  ].filter(i => i.roles.includes(currentUser?.role || ''));

  return (
    <div className="flex h-screen bg-[#f8f9fa] font-cairo overflow-hidden" dir="rtl">
      {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />}
      <aside className={`fixed lg:relative inset-y-0 right-0 z-50 bg-[#1B2B48] text-white flex flex-col transition-all duration-300 ${isSidebarCollapsed ? 'w-20' : 'w-72'} ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}`}>
        <div className="p-6 border-b border-white/5 flex flex-col items-center">
          <Logo className={isSidebarCollapsed ? 'h-12 w-12' : 'h-24 w-24'} />
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
            {sidebarItems.map(item => (
                <button key={item.id} onClick={() => { setView(item.id as ViewState); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${view === item.id ? 'bg-[#E95D22] shadow-xl' : 'hover:bg-white/5 text-gray-400'} ${isSidebarCollapsed ? 'justify-center' : ''}`}><item.icon size={20} />{!isSidebarCollapsed && <span>{item.label === 'الطلبات' && (currentUser?.role === 'TECHNICAL' || currentUser?.role === 'CONVEYANCE') ? 'طلباتي' : item.label}</span>}</button>
            ))}
        </nav>
        <div className="p-4 border-t border-white/5"><button onClick={() => setView('LOGIN')} className="w-full flex items-center gap-4 p-4 text-red-400 hover:bg-red-500/10 rounded-2xl transition-all"><LogOut size={20} />{!isSidebarCollapsed && <span className="font-bold">خروج</span>}</button></div>
      </aside>
      
      <main className="flex-1 flex flex-col min-w-0 bg-[#f8f9fa] overflow-hidden">
        <header className="lg:hidden p-4 bg-[#1B2B48] flex justify-between items-center"><Logo className="h-10 w-10" /><button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-white"><Menu /></button></header>
        <div className="flex-1 overflow-y-auto p-6 lg:p-12 text-right custom-scrollbar">
          {isDbLoading ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-4">
              <Loader2 className="animate-spin w-12 h-12 text-[#E95D22]" />
              <p className="font-bold">جاري تحميل البيانات...</p>
            </div>
          ) : (
            <>
              {view === 'DASHBOARD' && currentUser?.role !== 'FINANCE' && (
                <div className="space-y-6">
                  <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <h2 className="text-2xl font-bold text-[#1B2B48]">الرئيسية</h2>
                    <div className="flex flex-wrap gap-3 w-full md:w-auto">
                      <div className="relative flex-1 md:flex-initial"><Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" /><input type="text" placeholder="بحث..." className="pr-10 pl-4 py-2 rounded-xl border w-full md:w-64 text-right font-cairo outline-none focus:ring-2 ring-orange-500/20" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} /></div>
                      <select className="px-4 py-2 rounded-xl border font-cairo outline-none" value={locationFilter} onChange={e => setLocationFilter(e.target.value)}>
                        <option value="All">كل المناطق</option>
                        {LOCATIONS_ORDER.map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                      <select className="px-4 py-2 rounded-xl border font-cairo outline-none" value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)}>
                        <option value="All">كل المشاريع</option>
                        <option value="Active">قيد العمل</option>
                        <option value="Completed">مكتملة 100%</option>
                      </select>
                      <button onClick={handleExportAllProjects} className="bg-green-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 shadow-lg hover:bg-green-700 transition-all"><FileDown size={20} /> تصدير Excel</button>
                      <button onClick={() => setIsProjectModalOpen(true)} className="bg-[#E95D22] text-white px-4 py-2 rounded-xl flex items-center gap-2 shadow-lg hover:bg-opacity-90 transition-all"><Plus size={20} /> جديد</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredDashboard.length > 0 ? (
                        filteredDashboard.map(p => <ProjectCard key={p.name} project={p} onClick={p => { setSelectedProject(p); setView('PROJECT_DETAIL'); }} onTogglePin={() => {}} />)
                    ) : (
                        <div className="col-span-full py-20 text-center bg-white rounded-[40px] border-2 border-dashed">
                             <Search size={48} className="mx-auto mb-4 opacity-10" />
                             <p className="text-gray-400 font-bold">لا يوجد مشاريع تطابق خيارات التصفية الحالية</p>
                        </div>
                    )}
                  </div>
                </div>
              )}

              {view === 'STATISTICS' && projectStatsAggregated && (
                <div className="space-y-8 animate-in fade-in duration-500">
                    <div className="flex flex-col md:flex-row justify-between items-center border-b pb-6 border-gray-100 gap-4">
                        <h2 className="text-3xl font-bold text-[#1B2B48] flex items-center gap-3">
                            <Activity className="text-[#E95D22]" /> تحليلات المشاريع العامة
                        </h2>
                        <div className="flex items-center gap-3">
                            <div className="bg-[#1B2B48]/5 px-4 py-2 rounded-2xl border border-[#1B2B48]/10 text-xs hidden md:block">
                                <span className="text-gray-400">انقر على أي بطاقة لتصفية المشاريع</span>
                            </div>
                            <button 
                                onClick={handleExportPDF} 
                                disabled={isExportingPDF}
                                className="bg-[#1B2B48] text-white px-6 py-2.5 rounded-xl flex items-center gap-2 shadow-lg font-bold hover:bg-opacity-90 transition-all disabled:opacity-50"
                            >
                                {isExportingPDF ? <Loader2 className="animate-spin" size={20} /> : <FileDown size={20} />}
                                <span>تصدير تقرير PDF</span>
                            </button>
                        </div>
                    </div>

                    <div id="statistics-dashboard-content" className="space-y-10 p-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div 
                                onClick={() => { setLocationFilter('All'); setStatusFilter('All'); setView('DASHBOARD'); }}
                                className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-50 flex flex-col justify-between cursor-pointer hover:border-[#E95D22]/30 hover:shadow-xl transition-all group"
                            >
                                <div className="bg-blue-50 w-12 h-12 rounded-2xl flex items-center justify-center text-blue-600 mb-6 group-hover:bg-[#E95D22] group-hover:text-white transition-colors"><Building size={24} /></div>
                                <div>
                                    <h4 className="text-gray-400 font-bold mb-1">إجمالي المشاريع</h4>
                                    <p className="text-4xl font-bold text-[#1B2B48]">{projectStatsAggregated.totalProjects}</p>
                                </div>
                            </div>
                            <div 
                                onClick={() => { setStatusFilter('Active'); setView('DASHBOARD'); }}
                                className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-50 flex flex-col justify-between cursor-pointer hover:border-[#E95D22]/30 hover:shadow-xl transition-all group"
                            >
                                <div className="bg-orange-50 w-12 h-12 rounded-2xl flex items-center justify-center text-[#E95D22] mb-6 group-hover:bg-[#1B2B48] group-hover:text-white transition-colors"><Clock size={24} /></div>
                                <div>
                                    <h4 className="text-gray-400 font-bold mb-1">مشاريع قيد العمل</h4>
                                    <p className="text-4xl font-bold text-[#1B2B48]">{projectStatsAggregated.activeProjects}</p>
                                </div>
                            </div>
                            <div 
                                onClick={() => { setStatusFilter('Completed'); setView('DASHBOARD'); }}
                                className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-50 flex flex-col justify-between cursor-pointer hover:border-[#E95D22]/30 hover:shadow-xl transition-all group"
                            >
                                <div className="bg-green-50 w-12 h-12 rounded-2xl flex items-center justify-center text-green-600 mb-6 group-hover:bg-green-600 group-hover:text-white transition-colors"><CheckCircle2 size={24} /></div>
                                <div>
                                    <h4 className="text-gray-400 font-bold mb-1">مشاريع مكتملة 100%</h4>
                                    <p className="text-4xl font-bold text-[#1B2B48]">{projectStatsAggregated.finishedProjects}</p>
                                </div>
                            </div>
                            <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-50 flex flex-col justify-between">
                                <div className="bg-purple-50 w-12 h-12 rounded-2xl flex items-center justify-center text-purple-600 mb-6"><ListChecks size={24} /></div>
                                <div>
                                    <h4 className="text-gray-400 font-bold mb-1">متوسط الإنجاز الكلي</h4>
                                    <p className="text-4xl font-bold text-[#1B2B48]">{Math.round(projectStatsAggregated.avgProgress)}%</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                            <div className="lg:col-span-1 bg-[#1B2B48] text-white p-10 rounded-[50px] shadow-xl relative overflow-hidden">
                                <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-3xl"></div>
                                <h3 className="text-xl font-bold mb-8 flex items-center gap-3"><MapPin className="text-[#E95D22]" /> توزيع المشاريع حسب المنطقة</h3>
                                <div className="space-y-6">
                                    {Object.entries(projectStatsAggregated.locationCounts).map(([loc, count]) => {
                                        const percentage = (count / projectStatsAggregated.totalProjects) * 100;
                                        return (
                                            <div 
                                                key={loc} 
                                                onClick={() => { setLocationFilter(loc); setStatusFilter('All'); setView('DASHBOARD'); }}
                                                className="space-y-2 cursor-pointer group"
                                            >
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="font-bold group-hover:text-[#E95D22] transition-colors">{loc}</span>
                                                    <span className="text-gray-400">{count} مشروع</span>
                                                </div>
                                                <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden border border-white/5">
                                                    <div className="bg-[#E95D22] h-full rounded-full transition-all duration-1000 group-hover:bg-white" style={{ width: `${percentage}%` }}></div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="lg:col-span-2 bg-white p-10 rounded-[50px] shadow-sm border border-gray-50 flex flex-col h-full">
                                <h3 className="text-xl font-bold text-[#1B2B48] mb-8 flex items-center gap-3"><BarChart3 className="text-[#E95D22]" /> إجمالي جرد الموارد</h3>
                                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-8">
                                    <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 flex flex-col items-center justify-center text-center group hover:bg-blue-50 transition-colors">
                                        <Building2 className="text-blue-600 mb-4 group-hover:scale-110 transition-transform" size={40} />
                                        <p className="text-gray-400 text-sm font-bold">إجمالي الوحدات</p>
                                        <p className="text-3xl font-bold text-[#1B2B48] mt-1">{projectStatsAggregated.totalUnits}</p>
                                    </div>
                                    <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 flex flex-col items-center justify-center text-center group hover:bg-amber-50 transition-colors">
                                        <Zap className="text-amber-500 mb-4 group-hover:scale-110 transition-transform" size={40} />
                                        <p className="text-gray-400 text-sm font-bold">إجمالي الكهرباء</p>
                                        <p className="text-3xl font-bold text-[#1B2B48] mt-1">{projectStatsAggregated.totalElectricity}</p>
                                    </div>
                                    <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 flex flex-col items-center justify-center text-center group hover:bg-cyan-50 transition-colors">
                                        <Droplets className="text-cyan-500 mb-4 group-hover:scale-110 transition-transform" size={40} />
                                        <p className="text-gray-400 text-sm font-bold">إجمالي المياه</p>
                                        <p className="text-3xl font-bold text-[#1B2B48] mt-1">{projectStatsAggregated.totalWater}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div 
                            onClick={() => { setView('DASHBOARD'); setStatusFilter('All'); }}
                            className="bg-white p-10 rounded-[50px] shadow-sm border border-gray-50 cursor-pointer hover:shadow-xl transition-all group"
                        >
                            <h3 className="text-xl font-bold text-[#1B2B48] mb-8 flex items-center gap-3 group-hover:text-[#E95D22] transition-colors"><Activity className="text-[#E95D22]" /> حالة إنجاز المهام الكلية للمنظمة</h3>
                            <div className="flex flex-col md:flex-row items-center gap-10">
                                <div className="relative w-48 h-48 flex items-center justify-center">
                                    <svg className="w-full h-full transform -rotate-90">
                                        <circle cx="96" cy="96" r="80" stroke="currentColor" strokeWidth="16" fill="transparent" className="text-gray-100" />
                                        <circle cx="96" cy="96" r="80" stroke="currentColor" strokeWidth="16" fill="transparent" 
                                            strokeDasharray={2 * Math.PI * 80}
                                            strokeDashoffset={2 * Math.PI * 80 * (1 - projectStatsAggregated.completedTasks / (projectStatsAggregated.totalTasks || 1))}
                                            className="text-[#E95D22] transition-all duration-1000"
                                            strokeLinecap="round"
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-3xl font-bold text-[#1B2B48]">{Math.round((projectStatsAggregated.completedTasks / (projectStatsAggregated.totalTasks || 1)) * 100)}%</span>
                                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">الإغلاق العام</span>
                                    </div>
                                </div>
                                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-6 w-full">
                                    <div className="bg-green-50 p-8 rounded-3xl border border-green-100 group-hover:bg-green-100 transition-colors">
                                        <p className="text-green-800 text-sm font-bold mb-2">إجمالي المهام المنجزة</p>
                                        <p className="text-5xl font-bold text-green-900">{projectStatsAggregated.completedTasks}</p>
                                    </div>
                                    <div className="bg-orange-50 p-8 rounded-3xl border border-orange-100 group-hover:bg-orange-100 transition-colors">
                                        <p className="text-orange-800 text-sm font-bold mb-2">المهام تحت الإجراء</p>
                                        <p className="text-5xl font-bold text-orange-900">{projectStatsAggregated.totalTasks - projectStatsAggregated.completedTasks}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
              )}

              {view === 'PROJECT_DETAIL' && selectedProject && (
                <div className="space-y-6 animate-in fade-in duration-500 pb-20 text-right">
                    <button onClick={() => setView('DASHBOARD')} className="flex items-center gap-2 text-gray-400 hover:text-[#E95D22] mb-4 transition-colors font-bold"><ArrowLeft size={16} /> العودة للرئيسية</button>
                    <div className="bg-white rounded-[40px] p-8 md:p-12 shadow-sm border space-y-10">
                        <div className="flex flex-col md:flex-row justify-between items-start gap-6 border-b pb-10">
                            <div>
                                <h2 className="text-4xl font-bold text-[#1B2B48]">{selectedProject.name}</h2>
                                <p className="text-gray-400 flex items-center gap-2 mt-2"><MapPin size={18} /> {selectedProject.location}</p>
                            </div>
                            <div className="flex gap-4">
                                <button onClick={() => { setTempProjectDetails(selectedProject.details || {}); setIsProjectEditModalOpen(true); }} className="bg-gray-50 text-[#1B2B48] p-4 rounded-3xl hover:bg-gray-100 transition-colors border" title="تعديل بيانات المشروع"><Edit2 size={24} /></button>
                                <button onClick={() => { setProjectToDelete(selectedProject.name); setIsDeleteConfirmOpen(true); }} className="bg-red-50 text-red-500 p-4 rounded-3xl hover:bg-red-100 transition-colors border border-red-100"><Trash2 size={24} /></button>
                                <div className="bg-[#1B2B48] text-white p-6 rounded-3xl text-center font-bold text-3xl shadow-xl min-w-[100px]">{Math.round(selectedProject.progress)}%</div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
                          <InfoCard icon={Building2} title="عدد الوحدات" value={selectedProject.details?.unitsCount} unit="وحدة" />
                          <InfoCard icon={Zap} title="عدادات الكهرباء" value={selectedProject.details?.electricityMetersCount} unit="عداد" />
                          <InfoCard icon={Droplets} title="عدادات المياة" value={selectedProject.details?.waterMetersCount} unit="عداد" />
                          <InfoCard icon={FileText} title="رخص البناء" value={selectedProject.details?.buildingPermitsCount} unit="رخصة" />
                          <InfoCard icon={ShieldCheck} title="شهادات الإشغال" value={selectedProject.details?.occupancyCertificatesCount} unit="شهادة" />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <ContactCard icon={Zap} type="مقاول الكهرباء" company={selectedProject.details?.electricityContractor?.company} engineer={selectedProject.details?.electricityContractor?.engineer} phone={selectedProject.details?.electricityContractor?.phone} />
                          <ContactCard icon={Droplets} type="مقاول المياة" company={selectedProject.details?.waterContractor?.company} engineer={selectedProject.details?.waterContractor?.engineer} phone={selectedProject.details?.waterContractor?.phone} />
                          <ContactCard icon={ShieldCheck} type="المكتب الاستشاري" company={selectedProject.details?.consultantOffice?.company} engineer={selectedProject.details?.consultantOffice?.engineer} phone={selectedProject.details?.consultantOffice?.phone} />
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 pt-10 border-t">
                            <div className="lg:col-span-1 space-y-6">
                                <h3 className="text-xl font-bold text-[#1B2B48] flex items-center gap-2"><ListChecks className="text-[#E95D22]" /> قائمة المهام</h3>
                                <button onClick={() => { setEditingTask(null); setNewTaskData({ status: 'متابعة', description: TECHNICAL_SERVICE_TYPES[0], notes: '' }); setIsTaskModalOpen(true); }} className="w-full bg-[#E95D22] text-white py-5 rounded-[30px] font-bold text-lg shadow-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-2"><Plus size={24} /> إضافة عمل جديد</button>
                                {completedRequestsForCurrentProject.length > 0 && (
                                    <div className="mt-8">
                                        <h4 className="text-sm font-bold text-gray-400 mb-4 flex items-center gap-2"><Briefcase size={16} /> الطلبات الحكومية المنجزة</h4>
                                        <div className="space-y-3">
                                            {completedRequestsForCurrentProject.map(req => (
                                                <div key={req.id} onClick={() => { setSelectedRequestForDetails(req); setIsRequestDetailModalOpen(true); }} className="bg-gray-50 p-4 rounded-2xl border flex justify-between items-center cursor-pointer hover:bg-[#E95D22]/5 transition-colors">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-green-100 text-green-700 rounded-lg"><FileCheck size={16} /></div>
                                                        <span className="text-sm font-bold">{req.type === 'conveyance' ? req.clientName : req.serviceSubType}</span>
                                                    </div>
                                                    <ChevronLeft size={14} className="text-gray-300" />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="lg:col-span-2 space-y-4">
                                {selectedProject.tasks.map(task => <TaskCard key={task.id} task={task} onEdit={t => { setEditingTask(t); setNewTaskData(t); setIsTaskModalOpen(true); }} onOpenComments={t => { setSelectedTaskForComments(t); setIsCommentsModalOpen(true); }} onDelete={t => { setTaskToDelete(t); setIsDeleteTaskConfirmOpen(true); }} canManage={canUserCommentOnTasks} />)}
                            </div>
                        </div>
                    </div>
                </div>
              )}

              {view === 'USERS' && currentUser?.role === 'ADMIN' && (
                <div className="space-y-8 animate-in fade-in duration-500">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-right">
                        <h2 className="text-3xl font-bold text-[#1B2B48] flex items-center gap-3"><Users className="text-[#E95D22]" /> إدارة المستخدمين</h2>
                        <button onClick={() => setIsUserModalOpen(true)} className="bg-[#E95D22] text-white px-6 py-2.5 rounded-xl flex items-center gap-2 shadow-lg font-bold"><UserPlus size={20} /> إضافة حساب</button>
                    </div>
                    <div className="bg-white rounded-[40px] shadow-sm border overflow-hidden">
                        <table className="w-full text-right">
                            <thead className="bg-gray-50 border-b">
                                <tr><th className="px-6 py-5 text-gray-400 font-bold text-sm">المستخدم</th><th className="px-6 py-5 text-gray-400 font-bold text-sm">البريد الإلكتروني</th><th className="px-6 py-5 text-gray-400 font-bold text-sm">الصلاحية</th><th className="px-6 py-5 text-center text-gray-400 font-bold text-sm">إجراءات</th></tr>
                            </thead>
                            <tbody className="divide-y">
                                {filteredUsers.map(user => (
                                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-5 font-bold text-[#1B2B48]">{user.name}</td>
                                        <td className="px-6 py-5 text-gray-600">{user.email}</td>
                                        <td className="px-6 py-5"><span className={`px-4 py-1 rounded-full text-xs font-bold ${getRoleLabel(user.role).color}`}>{getRoleLabel(user.role).text}</span></td>
                                        <td className="px-6 py-5 text-center"><button onClick={() => handleDeleteUser(user.id)} disabled={user.id === '1'} className={`p-2 rounded-xl transition-all ${user.id === '1' ? 'text-gray-200 cursor-not-allowed' : 'text-gray-400 hover:text-red-500'}`}><Trash2 size={18} /></button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
              )}

              {view === 'REQUESTS' && (
                <div className="space-y-12 text-right">
                    <h2 className="text-3xl font-bold text-[#1B2B48] flex items-center gap-3"><ClipboardList className="text-[#E95D22]" /> قائمة الطلبات</h2>
                    <div className="grid grid-cols-1 gap-6">
                        {filteredRequests.length === 0 ? (
                            <div className="bg-white p-20 rounded-[40px] text-center text-gray-400 border-2 border-dashed"><FileSpreadsheet size={48} className="mx-auto mb-4 opacity-10" /><p className="font-bold">لا توجد طلبات في السجل حالياً</p></div>
                        ) : (
                            filteredRequests.map(req => (
                                <div key={req.id} onClick={() => { setSelectedRequestForDetails(req); setIsRequestDetailModalOpen(true); }} className="bg-white p-8 rounded-[35px] border-2 border-transparent hover:border-[#E95D22]/20 hover:shadow-xl transition-all cursor-pointer flex flex-col md:flex-row justify-between items-center gap-6">
                                    <div className="flex items-center gap-6">
                                        <div className={`p-5 rounded-3xl ${req.type === 'technical' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>{req.type === 'technical' ? <Settings size={30} /> : <FileCheck size={30} />}</div>
                                        <div className="space-y-1"><h4 className="font-bold text-xl text-[#1B2B48]">{req.projectName} - {req.type === 'conveyance' ? req.clientName : req.serviceSubType}</h4><div className="flex items-center gap-4 text-sm text-gray-400"><span className="flex items-center gap-1"><UserIcon size={14} /> {req.submittedBy}</span><span className="flex items-center gap-1"><Clock size={14} /> {req.date}</span></div></div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <button onClick={(e) => { e.stopPropagation(); setSelectedRequestForComments(req); setIsRequestCommentsModalOpen(true); }} className={`flex items-center gap-2 px-4 py-2 rounded-2xl transition-all ${(req.comments?.length || 0) > 0 ? 'bg-[#E95D22] text-white shadow-md' : 'bg-gray-50 text-gray-400 hover:text-[#E95D22]'}`}><MessageSquare size={18} /><span className="text-sm font-bold">{req.comments?.length || 0}</span></button>
                                        <div className={`px-6 py-2 rounded-2xl text-sm font-bold shadow-sm ${getStatusLabel(req.status).color}`}>{getStatusLabel(req.status).text}</div>
                                        {currentUser?.role === 'ADMIN' && <button onClick={(e) => { e.stopPropagation(); handleDeleteRequest(req.id); }} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all" title="حذف"><Trash2 size={18} /></button>}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
              )}

              {view === 'SERVICE_ONLY' && (
                <div className="max-w-5xl mx-auto space-y-8 animate-in slide-in-from-bottom duration-500 text-right">
                    <h2 className="text-3xl font-bold text-[#1B2B48] text-center">إنشاء طلب جديد</h2>
                    <form onSubmit={handleCreateRequest} className="bg-white p-8 md:p-12 rounded-[40px] shadow-sm border space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div><label className="block text-sm font-bold text-gray-700 mb-2">نوع الطلب</label><select className="w-full p-4 bg-gray-50 rounded-2xl border outline-none font-cairo focus:ring-2 ring-[#E95D22]/20" value={newRequest.type} onChange={e => setNewRequest({...newRequest, type: e.target.value as any})}><option value="technical">طلب فني / حكومي</option><option value="conveyance">طلب إفراغ / نقل ملكية</option></select></div>
                            <div><label className="block text-sm font-bold text-gray-700 mb-2">المشروع</label><select className="w-full p-4 bg-gray-50 rounded-2xl border outline-none font-cairo focus:ring-2 ring-[#E95D22]/20" value={newRequest.projectName} onChange={e => setNewRequest({...newRequest, projectName: e.target.value})} required><option value="">اختر المشروع...</option>{projects.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}</select></div>
                        </div>
                        {newRequest.type === 'conveyance' ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in">
                                <div className="md:col-span-2"><label className="block text-sm font-bold text-gray-700 mb-2">اسم العميل</label><input type="text" className="w-full p-4 bg-gray-50 rounded-2xl border outline-none font-cairo" value={newRequest.clientName} onChange={e => setNewRequest({...newRequest, clientName: e.target.value})} required /></div>
                                <div><label className="block text-sm font-bold text-gray-700 mb-2">رقم الهوية</label><input type="text" className="w-full p-4 bg-gray-50 rounded-2xl border outline-none font-cairo" value={newRequest.idNumber} onChange={e => setNewRequest({...newRequest, idNumber: e.target.value})} /></div>
                                <div><label className="block text-sm font-bold text-gray-700 mb-2">رقم الصك</label><input type="text" className="w-full p-4 bg-gray-50 rounded-2xl border outline-none font-cairo" value={newRequest.deedNumber} onChange={e => setNewRequest({...newRequest, deedNumber: e.target.value})} /></div>
                            </div>
                        ) : (
                            <div className="space-y-6 animate-in fade-in">
                                <div><label className="block text-sm font-bold text-gray-700 mb-2">نوع الخدمة</label><select className="w-full p-4 bg-gray-50 rounded-2xl border outline-none font-cairo" value={newRequest.serviceSubType} onChange={e => setNewRequest({...newRequest, serviceSubType: e.target.value})} required><option value="">اختر الخدمة...</option>{TECHNICAL_SERVICE_TYPES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                                <div><label className="block text-sm font-bold text-gray-700 mb-2">جهة المراجعة</label><select className="w-full p-4 bg-gray-50 rounded-2xl border outline-none font-cairo" value={newRequest.authority} onChange={e => setNewRequest({...newRequest, authority: e.target.value})} required><option value="">اختر الجهة...</option>{GOVERNMENT_AUTHORITIES.map(a => <option key={a} value={a}>{a}</option>)}</select></div>
                                <div><label className="block text-sm font-bold text-gray-700 mb-2">التفاصيل</label><textarea className="w-full p-4 bg-gray-50 rounded-2xl border h-32 outline-none font-cairo" value={newRequest.details} onChange={e => setNewRequest({...newRequest, details: e.target.value})} required /></div>
                            </div>
                        )}
                        <button type="submit" className="w-full bg-[#1B2B48] text-white py-5 rounded-3xl font-bold text-xl shadow-xl hover:bg-opacity-95 transition-all">تقديم الطلب الآن</button>
                    </form>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* --- Modals --- */}
      <Modal isOpen={isUserModalOpen} onClose={() => setIsUserModalOpen(false)} title="إضافة حساب مستخدم">
        <form onSubmit={handleCreateUser} className="space-y-4 text-right">
            <div><label className="text-xs font-bold text-gray-400">الاسم</label><input type="text" className="w-full p-4 bg-gray-50 rounded-2xl border outline-none" onChange={e => setNewUser({...newUser, name: e.target.value})} required /></div>
            <div><label className="text-xs font-bold text-gray-400">البريد الإلكتروني</label><input type="email" className="w-full p-4 bg-gray-50 rounded-2xl border outline-none" onChange={e => setNewUser({...newUser, email: e.target.value})} required /></div>
            <div><label className="text-xs font-bold text-gray-400">كلمة المرور</label><input type="password" dir="ltr" className="w-full p-4 bg-gray-50 rounded-2xl border outline-none" onChange={e => setNewUser({...newUser, password: e.target.value})} required /></div>
            <div><label className="text-xs font-bold text-gray-400">الصلاحية</label><select className="w-full p-4 bg-gray-50 rounded-2xl border outline-none font-cairo" onChange={e => setNewUser({...newUser, role: e.target.value as UserRole})} required><option value="PR_OFFICER">مسؤول علاقات</option><option value="PR_MANAGER">مدير علاقات</option><option value="TECHNICAL">قسم فني</option><option value="CONVEYANCE">إفراغات</option><option value="FINANCE">مالية</option></select></div>
            <button type="submit" className="w-full bg-[#E95D22] text-white py-4 rounded-2xl font-bold shadow-lg mt-4">إنشاء الحساب</button>
        </form>
      </Modal>

      <Modal isOpen={isProjectModalOpen} onClose={() => setIsProjectModalOpen(false)} title="مشروع جديد">
        <div className="space-y-4 text-right">
          <div><label className="text-xs font-bold text-gray-400 pr-1">اسم المشروع</label><input type="text" placeholder="سرايا..." className="w-full p-4 bg-gray-50 rounded-2xl border text-right font-cairo outline-none focus:ring-2 ring-[#E95D22]/20" value={newProject.name} onChange={e => setNewProject({...newProject, name: e.target.value})} /></div>
          <div><label className="text-xs font-bold text-gray-400 pr-1">موقع المشروع</label><select className="w-full p-4 bg-gray-50 rounded-2xl border text-right font-cairo outline-none focus:ring-2 ring-[#E95D22]/20" value={newProject.location} onChange={e => setNewProject({...newProject, location: e.target.value})}>{LOCATIONS_ORDER.map(loc => <option key={loc} value={loc}>{loc}</option>)}</select></div>
          <button onClick={handleCreateProject} className="w-full bg-[#E95D22] text-white py-4 rounded-2xl font-bold mt-4 shadow-lg hover:bg-opacity-90 transition-all">حفظ المشروع</button>
        </div>
      </Modal>

      <Modal isOpen={isTaskModalOpen} onClose={() => setIsTaskModalOpen(false)} title={editingTask ? 'تعديل العمل' : 'إضافة عمل'}>
        <div className="space-y-4 text-right">
          <div>
            <label className="text-xs font-bold text-gray-400 pr-1">بيان الأعمال</label>
            <select 
              className="w-full p-4 bg-gray-50 rounded-2xl border text-right font-cairo outline-none focus:ring-2 ring-[#E95D22]/20" 
              value={newTaskData.description || ''} 
              onChange={e => setNewTaskData({...newTaskData, description: e.target.value})}
            >
              <option value="">اختر نوع العمل...</option>
              {TECHNICAL_SERVICE_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-400 pr-1">وصف الأعمال (اختياري)</label>
            <textarea 
              className="w-full p-4 bg-gray-50 rounded-2xl border outline-none font-cairo h-24" 
              placeholder="اكتب تفاصيل العمل هنا..."
              value={newTaskData.notes || ''} 
              onChange={e => setNewTaskData({...newTaskData, notes: e.target.value})} 
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-xs font-bold text-gray-400 pr-1">جهة المراجعة</label><select className="w-full p-4 bg-gray-50 rounded-2xl border text-right font-cairo outline-none" value={newTaskData.reviewer || ''} onChange={e => setNewTaskData({...newTaskData, reviewer: e.target.value})}><option value="">اختر جهة...</option>{GOVERNMENT_AUTHORITIES.map(auth => <option key={auth} value={auth}>{auth}</option>)}</select></div>
            <div><label className="text-xs font-bold text-gray-400 pr-1">الحالة</label><select className="w-full p-4 bg-gray-50 rounded-2xl border text-right font-cairo outline-none" value={newTaskData.status || 'متابعة'} onChange={e => setNewTaskData({...newTaskData, status: e.target.value})}><option value="متابعة">متابعة</option><option value="منجز">منجز</option></select></div>
          </div>
          <button onClick={handleSaveTask} className="w-full bg-[#1B2B48] text-white py-4 rounded-2xl font-bold shadow-lg mt-4 hover:bg-opacity-95 transition-all">حفظ العمل</button>
        </div>
      </Modal>

      <Modal isOpen={isCommentsModalOpen} onClose={() => setIsCommentsModalOpen(false)} title={`تعليقات المهمة`}>
        <div className="space-y-6 text-right font-cairo flex flex-col h-[60vh]">
            <div className="flex-1 overflow-y-auto space-y-4 p-2 custom-scrollbar">
                {selectedTaskForComments?.comments?.map(comment => (<div key={comment.id} className="bg-gray-50 p-4 rounded-2xl border border-gray-100"><div className="flex justify-between items-start mb-2"><span className="font-bold text-[#1B2B48] text-sm">{comment.author}</span><span className="text-[10px] text-gray-400">{new Date(comment.timestamp).toLocaleString('ar-SA')}</span></div><p className="text-sm text-gray-600">{comment.text}</p></div>))}
            </div>
            {canUserCommentOnTasks && (
              <div className="border-t pt-4 flex gap-2">
                <input type="text" placeholder="اكتب تعليقك..." className="flex-1 p-4 bg-gray-50 rounded-2xl border outline-none font-cairo" value={newCommentText} onChange={e => setNewCommentText(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddComment()} />
                <button onClick={handleAddComment} className="p-4 bg-[#E95D22] text-white rounded-2xl shadow-lg transition-transform active:scale-95"><Send size={20} /></button>
              </div>
            )}
        </div>
      </Modal>

      <Modal isOpen={isRequestCommentsModalOpen} onClose={() => setIsRequestCommentsModalOpen(false)} title={`تعليقات الطلب`}>
        <div className="space-y-6 text-right font-cairo flex flex-col h-[60vh]">
            <div className="flex-1 overflow-y-auto space-y-4 p-2 custom-scrollbar">
                {selectedRequestForComments?.comments?.map(comment => (
                  <div key={comment.id} className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-bold text-[#1B2B48] text-sm">{comment.author}</span>
                      <span className="text-[10px] text-gray-400">{new Date(comment.timestamp).toLocaleString('ar-SA')}</span>
                    </div>
                    <p className="text-sm text-gray-600">{comment.text}</p>
                  </div>
                ))}
                {(!selectedRequestForComments?.comments || selectedRequestForComments.comments.length === 0) && (
                  <div className="h-full flex flex-col items-center justify-center text-gray-300 opacity-50">
                    <MessageSquare size={40} className="mb-2" />
                    <p className="text-sm font-bold">لا يوجد تعليقات حتى الآن</p>
                  </div>
                )}
            </div>
            {canUserCommentOnRequests && (
              <div className="border-t pt-4 flex gap-2">
                <input type="text" placeholder="اكتب تعليقك على الطلب..." className="flex-1 p-4 bg-gray-50 rounded-2xl border outline-none font-cairo" value={newRequestCommentText} onChange={e => setNewRequestCommentText(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddRequestComment()} />
                <button onClick={handleAddRequestComment} className="p-4 bg-[#1B2B48] text-white rounded-2xl shadow-lg transition-transform active:scale-95"><Send size={20} /></button>
              </div>
            )}
        </div>
      </Modal>
      
      <Modal isOpen={isDeleteConfirmOpen} onClose={() => setIsDeleteConfirmOpen(false)} title="تأكيد الحذف"><div className="text-right space-y-6"><div className="bg-red-50 p-6 rounded-3xl border border-red-100 flex items-center gap-4"><AlertCircle className="text-red-500" size={32} /><p className="text-red-700 font-bold">حذف مشروع "{projectToDelete}"؟</p></div><div className="flex gap-4"><button onClick={handleDeleteProject} className="flex-1 bg-red-600 text-white py-4 rounded-2xl font-bold">نعم، احذف</button><button onClick={() => setIsDeleteConfirmOpen(false)} className="flex-1 bg-gray-100 text-gray-600 py-4 rounded-2xl font-bold">إلغاء</button></div></div></Modal>
      <Modal isOpen={isDeleteTaskConfirmOpen} onClose={() => setIsDeleteTaskConfirmOpen(false)} title="تأكيد حذف العمل"><div className="text-right space-y-6"><div className="bg-red-50 p-6 rounded-3xl border border-red-100 flex items-center gap-4"><AlertCircle className="text-red-500" size={32} /><p className="text-red-700 font-bold">هل أنت متأكد من حذف هذا العمل؟</p></div><div className="flex gap-4"><button onClick={handleDeleteTask} className="flex-1 bg-red-600 text-white py-4 rounded-2xl font-bold">تأكيد الحذف</button><button onClick={() => setIsDeleteTaskConfirmOpen(false)} className="flex-1 bg-gray-100 text-gray-600 py-4 rounded-2xl font-bold">إلغاء</button></div></div></Modal>
      <Modal isOpen={isProjectEditModalOpen} onClose={() => setIsProjectEditModalOpen(false)} title="تحديث بيانات المشروع">
        <div className="space-y-4 text-right">
             <div className="grid grid-cols-2 gap-4">
                <div><label className="text-[10px] font-bold text-gray-400">الوحدات</label><input type="number" className="w-full p-4 bg-gray-50 rounded-2xl border outline-none" value={tempProjectDetails.unitsCount || ''} onChange={e => setTempProjectDetails({...tempProjectDetails, unitsCount: Number(e.target.value)})} /></div>
                <div><label className="text-[10px] font-bold text-gray-400">الكهرباء</label><input type="number" className="w-full p-4 bg-gray-50 rounded-2xl border outline-none" value={tempProjectDetails.electricityMetersCount || ''} onChange={e => setTempProjectDetails({...tempProjectDetails, electricityMetersCount: Number(e.target.value)})} /></div>
                <div><label className="text-[10px] font-bold text-gray-400">المياه</label><input type="number" className="w-full p-4 bg-gray-50 rounded-2xl border outline-none" value={tempProjectDetails.waterMetersCount || ''} onChange={e => setTempProjectDetails({...tempProjectDetails, waterMetersCount: Number(e.target.value)})} /></div>
                <div><label className="text-[10px] font-bold text-gray-400">رخص البناء</label><input type="number" className="w-full p-4 bg-gray-50 rounded-2xl border outline-none" value={tempProjectDetails.buildingPermitsCount || ''} onChange={e => setTempProjectDetails({...tempProjectDetails, buildingPermitsCount: Number(e.target.value)})} /></div>
             </div>
             <button onClick={handleUpdateProjectDetails} className="w-full bg-[#1B2B48] text-white py-5 rounded-3xl font-bold mt-4 shadow-xl">حفظ التغييرات</button>
        </div>
      </Modal>
      <Modal isOpen={isRequestDetailModalOpen} onClose={() => setIsRequestDetailModalOpen(false)} title="تفاصيل الطلب">
        {selectedRequestForDetails && (
          <div className="space-y-6 text-right font-cairo">
            <div className="bg-gray-50 p-6 rounded-3xl border space-y-4">
                <div className="flex justify-between items-center"><span className="text-gray-400 text-sm">نوع الطلب:</span><span className="font-bold text-[#1B2B48]">{selectedRequestForDetails.type === 'technical' ? 'طلب فني' : 'إفراغ عقاري'}</span></div>
                <div className="flex justify-between items-center"><span className="text-gray-400 text-sm">المشروع:</span><span className="font-bold text-[#1B2B48]">{selectedRequestForDetails.projectName}</span></div>
                <div className="pt-4 border-t"><p className="text-sm text-gray-600 leading-relaxed">{selectedRequestForDetails.details}</p></div>
            </div>
            {((['PR_MANAGER', 'ADMIN'].includes(currentUser?.role || '')) || (currentUser?.role === 'FINANCE' && selectedRequestForDetails.type === 'conveyance')) && selectedRequestForDetails.status === 'new' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <button onClick={() => handleUpdateRequestStatus(selectedRequestForDetails.id, 'completed')} className="bg-green-600 text-white p-4 rounded-2xl font-bold flex flex-col items-center gap-2 hover:bg-green-700 transition-colors shadow-lg"><CheckIcon /> موافقة</button>
                <button onClick={() => handleUpdateRequestStatus(selectedRequestForDetails.id, 'rejected')} className="bg-red-600 text-white p-4 rounded-2xl font-bold flex flex-col items-center gap-2 hover:bg-red-700 transition-colors shadow-lg"><CloseIcon /> رفض</button>
                <button onClick={() => handleUpdateRequestStatus(selectedRequestForDetails.id, 'revision')} className="bg-orange-500 text-white p-4 rounded-2xl font-bold flex flex-col items-center gap-2 hover:bg-orange-600 transition-colors shadow-lg"><RefreshCw /> تعديل</button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

const App: React.FC = () => <ErrorBoundary><AppContent /></ErrorBoundary>;
export default App;
