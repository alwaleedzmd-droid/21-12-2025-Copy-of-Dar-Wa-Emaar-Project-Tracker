
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

// Fix: Redefined ErrorBoundary to fix TypeScript property access errors
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  // Fix: Explicitly declare and initialize state to resolve "Property 'state' does not exist" error
  state: ErrorBoundaryState = { hasError: false };

  // Fix: Static method for handling errors
  static getDerivedStateFromError(_: any): ErrorBoundaryState {
    return { hasError: true };
  }

  render() {
    // Fix: access state and props which are now correctly typed through inheritance
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
      // 1. جلب المشاريع من قاعدة البيانات
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .order('client', { ascending: true }); // الترتيب حسب اسم العميل/المشروع

      if (projectsError) throw projectsError;

      // 2. جلب المهام من جدول tasks الجديد
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (tasksError) throw tasksError;

      // 3. بناء هيكل البيانات
      const summaries: ProjectSummary[] = (projectsData || []).map(p => {
        const projectName = p.client || 'مشروع بدون اسم';
        const metadata = projectMetadata[projectName] || {};
        
        const pTasks = (tasksData || [])
          .filter((t: any) => t.project_id === p.id)
          .map((t: any) => ({
            id: t.id.toString(),
            project: projectName,
            description: t.title, // عنوان المهمة في جدول tasks
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
          name: projectName, // اسم المشروع من عمود client
          location: p.location || metadata.location || 'الرياض',
          tasks: pTasks,
          totalTasks: pTasks.length,
          completedTasks: done,
          progress: pTasks.length > 0 ? (done / pTasks.length) * 100 : 0,
          isPinned: false,
          details: metadata,
          imageUrl: p.image_url
        };
      });

      setProjects(summaries);

      if (selectedProject) {
        const updated = summaries.find(s => (s as any).id === (selectedProject as any).id);
        if (updated) setSelectedProject(updated);
      }
    } catch (err: any) {
      console.error("Fetch Error Details:", err?.message || err);
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
  
  const [selectedProject, setSelectedProject] = useState<any | null>(null);
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
  
  const [projectToDelete, setProjectToDelete] = useState<any | null>(null);
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
    const { error } = await supabase.from('projects').insert([{ 
      client: newProject.name, // التخزين في عمود client
      location: newProject.location,
      date: new Date().toISOString().split('T')[0]
    }]);
    if (error) alert("خطأ: " + error.message);
    else {
      setProjectMetadata({ ...projectMetadata, [newProject.name as string]: { location: newProject.location } });
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
      await supabase.from('tasks').delete().eq('project_id', projectToDelete.id);
      const { error } = await supabase.from('projects').delete().eq('id', projectToDelete.id);
      if (error) alert(error.message);
      else {
        const newMetadata = { ...projectMetadata };
        delete newMetadata[projectToDelete.name];
        setProjectMetadata(newMetadata);
        await fetchProjects();
        if (selectedProject?.id === projectToDelete.id) setView('DASHBOARD');
        setIsDeleteConfirmOpen(false);
        setProjectToDelete(null);
      }
    }
  };

  const handleDeleteTask = async () => {
    if (taskToDelete) {
      const { error } = await supabase.from('tasks').delete().eq('id', taskToDelete.id);
      if (error) alert(error.message);
      else {
        await fetchProjects();
        setIsDeleteTaskConfirmOpen(false);
        setTaskToDelete(null);
      }
    }
  };

  const handleSaveTask = async () => {
    if (!selectedProject) return;
    const payload: any = { 
        title: newTaskData.description || 'عمل جديد', 
        status: newTaskData.status || 'متابعة', 
        project_id: selectedProject.id
    };
    
    let result;
    if (editingTask) {
        result = await supabase.from('tasks').update(payload).eq('id', editingTask.id);
    } else {
        result = await supabase.from('tasks').insert([payload]);
    }
    
    if (result.error) {
        alert("خطأ في قاعدة البيانات: " + result.error.message);
    } else {
        await fetchProjects();
        setIsTaskModalOpen(false);
        setEditingTask(null);
    }
  };

  const handleAddComment = async () => {
    if (!selectedTaskForComments || !newCommentText.trim()) return;
    const newComment: Comment = { id: Date.now().toString(), text: newCommentText, author: currentUser?.name || 'مستخدم', authorRole: currentUser?.role || 'PR_OFFICER', timestamp: new Date().toISOString() };
    const updatedComments = [...(selectedTaskForComments.comments || []), newComment];
    const { error } = await supabase.from('tasks').update({ comments: updatedComments }).eq('id', selectedTaskForComments.id);
    if (error) {
        alert("فشل تحديث التعليقات: " + error.message);
    } else {
        setSelectedTaskForComments({ ...selectedTaskForComments, comments: updatedComments });
        setNewCommentText('');
        await fetchProjects();
    }
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
    const exportData = projects.flatMap(p => p.tasks.map(t => ({ 'المشروع': p.name, 'بيان الأعمال': t.description, 'الموقع': p.location, 'الحالة': t.status, 'التاريخ': t.date })));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "المشاريع");
    XLSX.writeFile(wb, "تقرير_المشاريع.xlsx");
  };

  const handleExportPDF = async () => {
    const element = document.getElementById('statistics-dashboard-content');
    if (!element || !html2canvas || !jspdfModule) {
      alert('مكتبة التصدير غير جاهزة حالياً');
      return;
    }
    setIsExportingPDF(true);
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
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
    } catch (error: any) {
      console.error('PDF Export Error:', error?.message || error);
      alert('حدث خطأ أثناء تصدير ملف PDF');
    } finally {
      setIsExportingPDF(false);
    }
  };

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

  // --- استعادة تصميم تسجيل الدخول الاحترافي ---
  if (view === 'LOGIN') return (
    <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center p-4 font-cairo" dir="rtl">
      <div className="bg-[#1B2B48] w-full max-w-md rounded-[50px] shadow-2xl overflow-hidden border border-gray-100 text-center">
        <div className="p-12 relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-[#E95D22]/10 rounded-full blur-3xl"></div>
          <Logo className="h-48 mx-auto mb-8 relative z-10" />
          <h1 className="text-white text-4xl font-bold relative z-10">نظام المتابعة</h1>
          <p className="text-gray-400 mt-2 font-medium">شركة دار وإعمار للتطوير العقاري</p>
        </div>
        <form onSubmit={handleLogin} className="p-10 bg-white space-y-6 rounded-t-[50px] text-right">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 pr-2">البريد الإلكتروني</label>
            <input 
              type="email" 
              placeholder="admin@dar.sa" 
              className="w-full p-5 bg-gray-50 rounded-3xl border border-gray-100 outline-none text-right font-cairo focus:ring-2 ring-[#E95D22]/10" 
              value={loginData.email} 
              onChange={e => setLoginData({...loginData, email: e.target.value})} 
              required 
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 pr-2">كلمة المرور</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              className="w-full p-5 bg-gray-50 rounded-3xl border border-gray-100 outline-none text-right font-cairo focus:ring-2 ring-[#E95D22]/10" 
              value={loginData.password} 
              onChange={e => setLoginData({...loginData, password: e.target.value})} 
              required 
            />
          </div>
          <button className="w-full bg-[#E95D22] text-white py-5 rounded-[30px] font-bold shadow-xl text-xl hover:scale-[1.02] active:scale-95 transition-all">دخول النظام</button>
          <div className="text-center pt-2">
            <a href="#" className="text-gray-300 text-sm hover:text-[#E95D22] transition-colors">هل نسيت كلمة المرور؟</a>
          </div>
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

  const circleRadius = 80;
  const dashArrayValue = 2 * Math.PI * circleRadius;
  const progressRatio = projectStatsAggregated ? (projectStatsAggregated.completedTasks / (projectStatsAggregated.totalTasks || 1)) : 0;
  const dashOffsetValue = dashArrayValue * (1 - progressRatio);

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
                    <h2 className="text-2xl font-bold text-[#1B2B48]">المشاريع الحالية</h2>
                    <div className="flex flex-wrap gap-3 w-full md:w-auto">
                      <div className="relative flex-1 md:flex-initial"><Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" /><input type="text" placeholder="ابحث عن مشروع..." className="pr-10 pl-4 py-2 rounded-xl border w-full md:w-64 text-right font-cairo outline-none focus:ring-2 ring-orange-500/20" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} /></div>
                      <select className="px-4 py-2 rounded-xl border font-cairo outline-none" value={locationFilter} onChange={e => setLocationFilter(e.target.value)}>
                        <option value="All">كل المناطق</option>
                        {LOCATIONS_ORDER.map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                      <button onClick={handleExportAllProjects} className="bg-green-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 shadow-lg hover:bg-green-700 transition-all"><FileDown size={20} /> Excel</button>
                      <button onClick={() => setIsProjectModalOpen(true)} className="bg-[#E95D22] text-white px-4 py-2 rounded-xl flex items-center gap-2 shadow-lg hover:bg-opacity-90 transition-all"><Plus size={20} /> مشروع جديد</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredDashboard.length > 0 ? (
                        filteredDashboard.map(p => <ProjectCard key={p.id} project={p} onClick={p => { setSelectedProject(p); setView('PROJECT_DETAIL'); }} onTogglePin={() => {}} />)
                    ) : (
                        <div className="col-span-full py-20 text-center bg-white rounded-[40px] border-2 border-dashed">
                             <Search size={48} className="mx-auto mb-4 opacity-10" />
                             <p className="text-gray-400 font-bold">لم يتم العثور على نتائج</p>
                        </div>
                    )}
                  </div>
                </div>
              )}

              {view === 'PROJECT_DETAIL' && selectedProject && (
                <div className="space-y-6 animate-in fade-in duration-500 pb-20 text-right">
                    <button onClick={() => setView('DASHBOARD')} className="flex items-center gap-2 text-gray-400 hover:text-[#E95D22] mb-4 transition-colors font-bold"><ArrowLeft size={16} /> العودة للمشاريع</button>
                    <div className="bg-white rounded-[40px] shadow-sm border overflow-hidden">
                        <div 
                          className={`relative flex flex-col justify-end min-h-[350px] transition-all duration-700 ${selectedProject.imageUrl ? 'text-white' : 'bg-[#1B2B48] text-white'}`}
                          style={selectedProject.imageUrl ? {
                            backgroundImage: `linear-gradient(to top, rgba(27, 43, 72, 1) 0%, rgba(27, 43, 72, 0.6) 50%, rgba(27, 43, 72, 0.2) 100%), url(${selectedProject.imageUrl})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                          } : {}}
                        >
                          <div className="p-8 md:p-12 w-full flex flex-col md:flex-row justify-between items-end gap-6">
                            <div className="space-y-2">
                                <h2 className="text-4xl md:text-5xl font-bold drop-shadow-lg">{selectedProject.name}</h2>
                                <p className="flex items-center gap-2 text-gray-200 drop-shadow-md"><MapPin size={18} /> {selectedProject.location}</p>
                            </div>
                            <div className="flex gap-4">
                                <button onClick={() => { setTempProjectDetails(selectedProject.details || {}); setIsProjectEditModalOpen(true); }} className="bg-white/20 backdrop-blur-md text-white p-4 rounded-3xl hover:bg-white/30 transition-colors border border-white/20"><Edit2 size={24} /></button>
                                <button onClick={() => { setProjectToDelete(selectedProject); setIsDeleteConfirmOpen(true); }} className="bg-red-500/20 backdrop-blur-md text-red-200 p-4 rounded-3xl hover:bg-red-500/40 transition-colors border border-red-500/20"><Trash2 size={24} /></button>
                                <div className="bg-[#E95D22] text-white p-6 rounded-3xl text-center font-bold text-3xl shadow-2xl min-w-[120px] ring-4 ring-[#E95D22]/20">{Math.round(selectedProject.progress)}%</div>
                            </div>
                          </div>
                        </div>
                        <div className="p-8 md:p-12 space-y-10">
                            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
                              <InfoCard icon={Building2} title="عدد الوحدات" value={selectedProject.details?.unitsCount} unit="وحدة" />
                              <InfoCard icon={Zap} title="عدادات الكهرباء" value={selectedProject.details?.electricityMetersCount} unit="عداد" />
                              <InfoCard icon={Droplets} title="عدادات المياة" value={selectedProject.details?.waterMetersCount} unit="عداد" />
                              <InfoCard icon={FileText} title="رخص البناء" value={selectedProject.details?.buildingPermitsCount} unit="رخصة" />
                              <InfoCard icon={ShieldCheck} title="شهادات الإشغال" value={selectedProject.details?.occupancyCertificatesCount} unit="شهادة" />
                            </div>
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 pt-10 border-t">
                                <div className="lg:col-span-1 space-y-6">
                                    <h3 className="text-xl font-bold text-[#1B2B48] flex items-center gap-2"><ListChecks className="text-[#E95D22]" /> قائمة الأعمال</h3>
                                    <button onClick={() => { setEditingTask(null); setNewTaskData({ status: 'متابعة', description: TECHNICAL_SERVICE_TYPES[0], notes: '' }); setIsTaskModalOpen(true); }} className="w-full bg-[#E95D22] text-white py-5 rounded-[30px] font-bold text-lg shadow-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-2"><Plus size={24} /> إضافة عمل</button>
                                </div>
                                <div className="lg:col-span-2 space-y-4">
                                    {selectedProject.tasks.length > 0 ? (
                                        selectedProject.tasks.map((task: any) => <TaskCard key={task.id} task={task} onEdit={t => { setEditingTask(t); setNewTaskData(t); setIsTaskModalOpen(true); }} onOpenComments={t => { setSelectedTaskForComments(t); setIsCommentsModalOpen(true); }} onDelete={t => { setTaskToDelete(t); setIsDeleteTaskConfirmOpen(true); }} canManage={canUserCommentOnTasks} />)
                                    ) : (
                                        <div className="py-10 text-center text-gray-400 bg-gray-50 rounded-3xl border border-dashed">لا توجد أعمال مضافة لهذا المشروع حالياً</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
              )}
              {/* باقي Views (USERS, REQUESTS, STATISTICS) تبقى كما هي مع تغيير المرجع لـ p.name/p.client */}
              {view === 'USERS' && currentUser?.role === 'ADMIN' && (
                <div className="space-y-8 animate-in fade-in duration-500">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-right">
                        <h2 className="text-3xl font-bold text-[#1B2B48] flex items-center gap-3"><Users className="text-[#E95D22]" /> إدارة الحسابات</h2>
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
            </>
          )}
        </div>
      </main>

      {/* --- Modals --- */}
      <Modal isOpen={isProjectModalOpen} onClose={() => setIsProjectModalOpen(false)} title="إضافة مشروع جديد">
        <div className="space-y-4 text-right">
          <div><label className="text-xs font-bold text-gray-400 pr-1">اسم المشروع</label><input type="text" placeholder="مثلاً: سرايا النرجس" className="w-full p-4 bg-gray-50 rounded-2xl border text-right font-cairo outline-none focus:ring-2 ring-[#E95D22]/20" value={newProject.name} onChange={e => setNewProject({...newProject, name: e.target.value})} /></div>
          <div><label className="text-xs font-bold text-gray-400 pr-1">موقع المشروع</label><select className="w-full p-4 bg-gray-50 rounded-2xl border text-right font-cairo outline-none focus:ring-2 ring-[#E95D22]/20" value={newProject.location} onChange={e => setNewProject({...newProject, location: e.target.value})}>{LOCATIONS_ORDER.map(loc => <option key={loc} value={loc}>{loc}</option>)}</select></div>
          <button onClick={handleCreateProject} className="w-full bg-[#E95D22] text-white py-4 rounded-2xl font-bold mt-4 shadow-lg hover:bg-opacity-90 transition-all">إنشاء المشروع</button>
        </div>
      </Modal>

      <Modal isOpen={isTaskModalOpen} onClose={() => setIsTaskModalOpen(false)} title={editingTask ? 'تعديل العمل' : 'إضافة عمل جديد'}>
        <div className="space-y-4 text-right">
          <div>
            <label className="text-xs font-bold text-gray-400 pr-1">بيان العمل</label>
            <select 
              className="w-full p-4 bg-gray-50 rounded-2xl border text-right font-cairo outline-none focus:ring-2 ring-[#E95D22]/20" 
              value={newTaskData.description || ''} 
              onChange={e => setNewTaskData({...newTaskData, description: e.target.value})}
            >
              <option value="">اختر نوع العمل...</option>
              {TECHNICAL_SERVICE_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-xs font-bold text-gray-400 pr-1">الحالة</label><select className="w-full p-4 bg-gray-50 rounded-2xl border text-right font-cairo outline-none" value={newTaskData.status || 'متابعة'} onChange={e => setNewTaskData({...newTaskData, status: e.target.value})}><option value="متابعة">متابعة</option><option value="منجز">منجز</option></select></div>
          </div>
          <button onClick={handleSaveTask} className="w-full bg-[#1B2B48] text-white py-4 rounded-2xl font-bold shadow-lg mt-4 hover:bg-opacity-95 transition-all">حفظ العمل</button>
        </div>
      </Modal>

      {/* مودالات أخرى متبقية كما هي */}
      <Modal isOpen={isCommentsModalOpen} onClose={() => setIsCommentsModalOpen(false)} title={`تعليقات العمل`}>
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
      
      <Modal isOpen={isDeleteConfirmOpen} onClose={() => setIsDeleteConfirmOpen(false)} title="تأكيد الحذف"><div className="text-right space-y-6"><div className="bg-red-50 p-6 rounded-3xl border border-red-100 flex items-center gap-4"><AlertCircle className="text-red-500" size={32} /><p className="text-red-700 font-bold">حذف مشروع "{projectToDelete?.name}"؟ سيتم حذف كافة المهام المرتبطة به.</p></div><div className="flex gap-4"><button onClick={handleDeleteProject} className="flex-1 bg-red-600 text-white py-4 rounded-2xl font-bold">نعم، احذف</button><button onClick={() => setIsDeleteConfirmOpen(false)} className="flex-1 bg-gray-100 text-gray-600 py-4 rounded-2xl font-bold">إلغاء</button></div></div></Modal>
      <Modal isOpen={isDeleteTaskConfirmOpen} onClose={() => setIsDeleteTaskConfirmOpen(false)} title="تأكيد حذف العمل"><div className="text-right space-y-6"><div className="bg-red-50 p-6 rounded-3xl border border-red-100 flex items-center gap-4"><AlertCircle className="text-red-500" size={32} /><p className="text-red-700 font-bold">هل أنت متأكد من حذف هذا العمل؟</p></div><div className="flex gap-4"><button onClick={handleDeleteTask} className="flex-1 bg-red-600 text-white py-4 rounded-2xl font-bold">تأكيد الحذف</button><button onClick={() => setIsDeleteTaskConfirmOpen(false)} className="flex-1 bg-gray-100 text-gray-600 py-4 rounded-2xl font-bold">إلغاء</button></div></div></Modal>

      <Modal isOpen={isUserModalOpen} onClose={() => setIsUserModalOpen(false)} title="إضافة حساب مستخدم">
        <form onSubmit={handleCreateUser} className="space-y-4 text-right">
            <div><label className="text-xs font-bold text-gray-400">الاسم</label><input type="text" className="w-full p-4 bg-gray-50 rounded-2xl border outline-none" onChange={e => setNewUser({...newUser, name: e.target.value})} required /></div>
            <div><label className="text-xs font-bold text-gray-400">البريد الإلكتروني</label><input type="email" className="w-full p-4 bg-gray-50 rounded-2xl border outline-none" onChange={e => setNewUser({...newUser, email: e.target.value})} required /></div>
            <div><label className="text-xs font-bold text-gray-400">كلمة المرور</label><input type="password" dir="ltr" className="w-full p-4 bg-gray-50 rounded-2xl border outline-none" onChange={e => setNewUser({...newUser, password: e.target.value})} required /></div>
            <div><label className="text-xs font-bold text-gray-400">الصلاحية</label><select className="w-full p-4 bg-gray-50 rounded-2xl border outline-none font-cairo" onChange={e => setNewUser({...newUser, role: e.target.value as UserRole})} required><option value="PR_OFFICER">مسؤول علاقات</option><option value="PR_MANAGER">مدير علاقات</option><option value="TECHNICAL">قسم فني</option><option value="CONVEYANCE">إفراغات</option><option value="FINANCE">مالية</option></select></div>
            <button type="submit" className="w-full bg-[#E95D22] text-white py-4 rounded-2xl font-bold shadow-lg mt-4">إنشاء الحساب</button>
        </form>
      </Modal>
    </div>
  );
};

const App: React.FC = () => <ErrorBoundary><AppContent /></ErrorBoundary>;
export default App;
