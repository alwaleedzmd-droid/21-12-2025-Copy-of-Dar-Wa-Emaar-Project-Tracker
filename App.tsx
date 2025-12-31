
import React, { useState, useEffect, ReactNode, useMemo } from 'react';
import { 
  LayoutDashboard, Users, FileText, LogOut, 
  Plus, ArrowLeft, Loader2, Zap, Droplets, 
  CheckCircle2, RefreshCw, FileUp,
  Edit3, AlertCircle, Building2,
  Briefcase, User as UserIcon, ShieldCheck, 
  Search, FileStack, CheckCircle, Clock, ChevronDown, ChevronUp, X, LayoutList, Printer,
  Calendar, Hash, Phone, MapPin, CreditCard, UserCheck, AlertTriangle, WifiOff
} from 'lucide-react';
import { supabase } from './supabaseClient';
import * as XLSX from 'xlsx';
import { 
  ProjectSummary, User, ViewState, 
  TechnicalRequest, ClearanceRequest
} from './types';
import { 
  DAR_LOGO
} from './constants';
import Modal from './components/Modal';
import ClearanceModule from './components/ClearanceModule';
import TechnicalModule from './components/TechnicalModule';
import ProjectsModule from './components/ProjectsModule';

// --- CONSTANTS & MOCKS FOR DEEDS ---
const BANKS_LIST = ['مصرف الراجحي', 'البنك الأهلي', 'بنك الرياض', 'مصرف الإنماء', 'بنك البلاد'];
const LOCATIONS_ORDER = ['المنطقة الوسطى', 'المنطقة الغربية', 'المنطقة الشرقية', 'المنطقة الشمالية', 'المنطقة الجنوبي'];

interface Unit {
  id: string;
  number: string;
  type: string;
  price: string;
  status: 'متاح' | 'محجوز' | 'مباع';
}

interface DeedRequest {
  id: number;
  clientName: string;
  idNumber: string;
  projectName: string;
  status: 'جديد' | 'قيد المعالجة' | 'منجز' | 'مطلوب تعديل';
  date: string;
  units: Unit[];
}

const MOCK_DEEDS: DeedRequest[] = [
  {
    id: 1,
    clientName: "أحمد بن محمد القحطاني",
    idNumber: "1098273645",
    projectName: "مشروع دار الصفوة - متعدد",
    status: "منجز",
    date: "2024/05/12",
    units: [
      { id: 'u1', number: 'A-101', type: 'شقة سكنية', status: 'مباع', price: '850,000' },
      { id: 'u2', number: 'Park-05', type: 'موقف خاص', status: 'مباع', price: '25,000' }
    ]
  },
  {
    id: 2,
    clientName: "شركة الرؤية العقارية",
    idNumber: "7001928374",
    projectName: "مشروع لؤلؤة جدة",
    status: "قيد المعالجة",
    date: "2024/05/14",
    units: [
      { id: 'u3', number: 'Villa-09', type: 'فيلا دوبلكس', status: 'محجوز', price: '1,200,000' },
      { id: 'u4', number: 'Villa-10', type: 'فيلا دوبلكس', status: 'محجوز', price: '1,200,000' },
      { id: 'u5', number: 'Villa-11', type: 'فيلا منفصلة', status: 'متاح', price: '1,800,000' }
    ]
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

class ErrorBoundary extends React.Component<{ children: ReactNode }, { hasError: boolean }> {
  public state = { hasError: false };
  static getDerivedStateFromError(_: any) { return { hasError: true }; }
  render() {
    if (this.state.hasError) return <div className="min-h-screen flex items-center justify-center text-red-500 font-bold bg-white p-10 text-center flex-col gap-4">
      <AlertTriangle size={48} />
      <h2 className="text-2xl font-black">حدث خطأ غير متوقع</h2>
      <p>يرجى تحديث الصفحة أو المحاولة لاحقاً.</p>
      <button onClick={() => window.location.reload()} className="bg-[#1B2B48] text-white px-8 py-3 rounded-2xl font-bold">تحديث الصفحة</button>
    </div>;
    return this.props.children;
  }
}

// --- NEW COMPONENT: DEEDS DASHBOARD ---
const DeedsDashboard: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
    const [deeds] = useState<DeedRequest[]>(MOCK_DEEDS);

    const toggleRow = (id: number) => {
        const newExpanded = new Set(expandedRows);
        if (newExpanded.has(id)) newExpanded.delete(id);
        else newExpanded.add(id);
        setExpandedRows(newExpanded);
    };

    const filteredDeeds = useMemo(() => {
        return deeds.filter(d => 
            d.clientName.includes(searchQuery) || 
            d.idNumber.includes(searchQuery) || 
            d.projectName.includes(searchQuery)
        );
    }, [deeds, searchQuery]);

    const kpis = useMemo(() => ({
        total: deeds.length,
        completed: deeds.filter(d => d.status === 'منجز').length,
        processing: deeds.filter(d => d.status === 'قيد المعالجة').length,
        pending: deeds.filter(d => d.status === 'جديد' || d.status === 'مطلوب تعديل').length,
    }), [deeds]);

    const getStatusColor = (status: string) => {
        switch(status) {
            case 'منجز': return 'bg-green-50 text-green-700 border-green-200';
            case 'قيد المعالجة': return 'bg-blue-50 text-blue-700 border-blue-200';
            case 'مطلوب تعديل': return 'bg-orange-50 text-orange-700 border-orange-200';
            default: return 'bg-gray-50 text-gray-700 border-gray-200';
        }
    };

    const SectionHeader = ({title, icon, color}: any) => (
        <div className={`flex items-center gap-2 border-r-4 ${color} pr-3`}>
            {icon}
            <h4 className="text-sm font-black text-[#1B2B48] uppercase">{title}</h4>
        </div>
    );
    const FormInput = ({ label, type = 'text', icon, suffix }: any) => (
        <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-400">{label}</label>
            <div className="relative">
                {icon && <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">{icon}</div>}
                <input type={type} className={`w-full ${icon ? 'pr-10' : 'pr-4'} ${suffix ? 'pl-10' : 'pl-4'} py-3 bg-white border border-gray-200 rounded-xl focus:border-[#E95D22] outline-none text-sm font-bold text-[#1B2B48] transition-all`} />
                {suffix && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">{suffix}</div>}
            </div>
        </div>
    );
    const FormSelect = ({ label, options }: any) => (
        <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-400">{label}</label>
            <div className="relative">
                <select className="w-full pr-4 pl-10 py-3 bg-white border border-gray-200 rounded-xl focus:border-[#E95D22] outline-none text-sm font-bold text-[#1B2B48] appearance-none">
                    <option value="">اختر...</option>
                    {options.map((o: string) => <option key={o} value={o}>{o}</option>)}
                </select>
                <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16}/>
            </div>
        </div>
    );
    const KPICard = ({ title, value, icon, color, bg }: any) => (
        <div className={`${bg} p-6 rounded-2xl border border-gray-100/50 shadow-sm flex items-center justify-between`}>
            <div><p className="text-[10px] font-bold text-gray-400 uppercase mb-1">{title}</p><h3 className={`text-2xl font-black ${color}`}>{value}</h3></div>
            <div className={`p-3 rounded-xl bg-white/60 ${color}`}>{icon}</div>
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
             <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-6 py-3 bg-[#E95D22] text-white rounded-xl font-bold text-sm hover:brightness-110 shadow-lg shadow-orange-100 transition-all active:scale-95">
                        <Plus size={18} /> تسجيل إفراغ جديد
                    </button>
                    <button onClick={() => alert('جار تحميل ملف Excel')} className="p-3 bg-white border border-gray-200 text-green-600 rounded-xl hover:bg-green-50 transition-all"><LayoutList size={20} /></button>
                    <button onClick={() => alert('جار تحميل ملف PDF')} className="p-3 bg-white border border-gray-200 text-blue-600 rounded-xl hover:bg-blue-50 transition-all"><Printer size={20} /></button>
                </div>
                <div className="relative w-full md:w-96">
                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input type="text" placeholder="بحث برقم الهوية أو اسم العميل..." className="w-full pr-12 pl-4 py-3 bg-white rounded-xl border border-gray-200 focus:border-[#E95D22] outline-none transition-all font-semibold text-sm" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard title="إجمالي الطلبات" value={kpis.total} icon={<FileStack size={20}/>} color="text-[#1B2B48]" bg="bg-white" />
                <KPICard title="تم الإفراغ" value={kpis.completed} icon={<CheckCircle size={20}/>} color="text-green-600" bg="bg-green-50" />
                <KPICard title="تحت الإجراء" value={kpis.processing} icon={<Clock size={20}/>} color="text-blue-600" bg="bg-blue-50" />
                <KPICard title="تنبيهات" value={kpis.pending} icon={<AlertCircle size={20}/>} color="text-red-500" bg="bg-red-50" />
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr className="text-right text-gray-400 text-xs uppercase tracking-wider">
                            <th className="p-5 font-bold">العميل</th>
                            <th className="p-5 font-bold">رقم الهوية</th>
                            <th className="p-5 font-bold">المشروع</th>
                            <th className="p-5 font-bold">الوحدات</th>
                            <th className="p-5 font-bold">الحالة</th>
                            <th className="p-5"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {filteredDeeds.map((deed) => (
                            <React.Fragment key={deed.id}>
                                <tr className={`transition-all hover:bg-gray-50 cursor-pointer ${expandedRows.has(deed.id) ? 'bg-orange-50/10' : ''}`} onClick={() => toggleRow(deed.id)}>
                                    <td className="p-5 font-bold text-[#1B2B48] flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-xs"><UserIcon size={14}/></div>
                                        {deed.clientName}
                                    </td>
                                    <td className="p-5 text-sm font-mono text-gray-500">{deed.idNumber}</td>
                                    <td className="p-5 text-sm font-semibold text-gray-600">{deed.projectName}</td>
                                    <td className="p-5"><span className="px-3 py-1 bg-gray-100 rounded-lg text-xs font-bold text-gray-600">{deed.units.length} وحدات</span></td>
                                    <td className="p-5"><span className={`px-3 py-1 rounded-full text-[10px] font-bold border ${getStatusColor(deed.status)}`}>{deed.status}</span></td>
                                    <td className="p-5 text-gray-400">{expandedRows.has(deed.id) ? <ChevronUp size={18} className="text-[#E95D22]"/> : <ChevronDown size={18}/>}</td>
                                </tr>
                                {expandedRows.has(deed.id) && (
                                    <tr className="bg-gray-50/50 animate-in fade-in duration-200">
                                        <td colSpan={6} className="p-4 pr-16">
                                            <div className="bg-white rounded-xl border border-gray-200 p-4">
                                                <h4 className="text-xs font-bold text-gray-400 mb-3 uppercase tracking-wider flex items-center gap-2"><Building2 size={14}/> تفاصيل الوحدات التابعة للعميل</h4>
                                                <table className="w-full text-sm text-right">
                                                    <thead><tr className="text-gray-400 text-[10px]"><th className="pb-2">رقم الوحدة</th><th className="pb-2">النوع</th><th className="pb-2">السعر</th><th className="pb-2">الحالة</th></tr></thead>
                                                    <tbody>
                                                        {deed.units.map(unit => (
                                                            <tr key={unit.id} className="border-t border-gray-50">
                                                                <td className="py-2 font-bold text-[#1B2B48]">{unit.number}</td>
                                                                <td className="py-2 text-gray-500">{unit.type}</td>
                                                                <td className="py-2 text-gray-500 font-mono">{unit.price} ر.س</td>
                                                                <td className="py-2"><span className={`text-[10px] px-2 py-0.5 rounded border ${unit.status === 'مباع' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-orange-50 text-orange-600 border-orange-100'}`}>{unit.status}</span></td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#1B2B48]/50 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-3xl w-full max-w-6xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <div className="flex items-center gap-3"><div className="p-2 bg-[#E95D22] text-white rounded-lg"><Plus size={20} /></div><div><h3 className="text-xl font-black text-[#1B2B48]">تسجيل إفراغ جديد</h3></div></div>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:bg-red-50 hover:text-red-500 rounded-lg transition-all"><X size={24} /></button>
                        </div>
                        <div className="p-8 overflow-y-auto custom-scrollbar flex-1">
                            <div className="space-y-8">
                                <SectionHeader title="بيانات المستفيد" icon={<UserCheck size={18} className="text-blue-500"/>} color="border-blue-500"/>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                                    <FormInput label="اسم المستفيد" icon={<UserIcon size={16}/>} />
                                    <FormInput label="رقم الهوية" type="number" icon={<Hash size={16}/>} />
                                    <FormInput label="رقم الجوال" type="tel" icon={<Phone size={16}/>} />
                                    <FormInput label="تاريخ الميلاد (هجري)" icon={<Calendar size={16}/>} />
                                </div>
                                <SectionHeader title="بيانات العقار" icon={<Building2 size={18} className="text-green-500"/>} color="border-green-500"/>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                    <FormSelect label="المنطقة" options={LOCATIONS_ORDER} />
                                    <FormSelect label="المدينة" options={['الرياض', 'جدة', 'الدمام']} />
                                    <FormSelect label="المشروع" options={['مشروع دار الصفوة', 'مشروع لؤلؤة جدة']} />
                                    <FormInput label="رقم المخطط" />
                                    <FormInput label="رقم الوحدة" icon={<MapPin size={16}/>} />
                                    <FormInput label="قيمة الوحدة" type="number" icon={<CreditCard size={16}/>} suffix="ر.س" />
                                </div>
                                <SectionHeader title="البيانات المالية والصك" icon={<ShieldCheck size={18} className="text-purple-500"/>} color="border-purple-500"/>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                                    <FormInput label="رقم الصك" />
                                    <FormInput label="تاريخ الصك" type="date" />
                                    <FormInput label="الرقم الضريبي" />
                                    <FormSelect label="الجهة التمويلية" options={BANKS_LIST} />
                                    <FormSelect label="نوع العقد" options={['مرابحة', 'إجارة', 'كاش']} />
                                </div>
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                            <button onClick={() => setIsModalOpen(false)} className="px-6 py-3 border border-gray-200 text-gray-500 rounded-xl font-bold text-sm hover:bg-white transition-all">إلغاء</button>
                            <button onClick={() => { alert("تم الحفظ!"); setIsModalOpen(false); }} className="px-8 py-3 bg-[#E95D22] text-white rounded-xl font-bold text-sm shadow-lg hover:bg-[#d14d15] transition-all flex items-center gap-2"><CheckCircle2 size={18} /> حفظ السجل</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- MAIN APP COMPONENT ---

const AppContent: React.FC = () => {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [technicalRequests, setTechnicalRequests] = useState<TechnicalRequest[]>([]);
  const [clearanceRequests, setClearanceRequests] = useState<ClearanceRequest[]>([]);
  const [appUsers, setAppUsers] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  
  const [isDbLoading, setIsDbLoading] = useState(true);
  const [errorState, setErrorState] = useState<string | null>(null);
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

  const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false);
  const [isEditProjectModalOpen, setIsEditProjectModalOpen] = useState(false);
  const [editProjectForm, setEditProjectForm] = useState<any>({});
  const [bulkProject, setBulkProject] = useState('');

  const projectInternalWorks = useMemo(() => 
    selectedProject ? technicalRequests.filter(r => r.project_name === selectedProject.name && r.scope === 'INTERNAL_WORK') : []
  , [technicalRequests, selectedProject]);

  const projectExternalTechRequests = useMemo(() => 
    selectedProject ? technicalRequests.filter(r => r.project_name === selectedProject.name && r.scope !== 'INTERNAL_WORK') : []
  , [technicalRequests, selectedProject]);

  const projectClearanceRequests = useMemo(() => 
    selectedProject ? clearanceRequests.filter(r => r.project_name === selectedProject.name) : []
  , [clearanceRequests, selectedProject]);

  const stats = useMemo(() => ({
    projects: projects.length,
    techRequests: technicalRequests.filter(r => r.scope !== 'INTERNAL_WORK').length,
    clearRequests: clearanceRequests.length
  }), [projects.length, technicalRequests.length, clearanceRequests.length]);

  const canAccess = (allowedRoles: string[]) => {
    return currentUser && allowedRoles.includes(currentUser.role);
  };

  const syncUserProfile = async (sessionUser: any) => {
    try {
        const { data, error } = await supabase.from('profiles').select('role, name').eq('id', sessionUser.id).single();
        if (error) throw error;

        let userRole = data?.role || 'PR_OFFICER';
        let userName = data?.name || sessionUser.user_metadata?.name || 'موظف';
        if (sessionUser.email === 'adaldawsari@darwaemaar.com') userRole = 'ADMIN';
        
        const updatedUser: User = { id: sessionUser.id, name: userName, email: sessionUser.email || '', role: userRole as any };
        setCurrentUser(updatedUser);
        safeStorage.setItem(STORAGE_KEYS.USER_CACHE, JSON.stringify(updatedUser));

        if (userRole === 'TECHNICAL') setView('TECHNICAL_SERVICES');
        else if (userRole === 'CONVEYANCE' || userRole === 'FINANCE') setView('CONVEYANCE_SERVICES');
        else if (userRole === 'ADMIN' || userRole === 'PR_MANAGER' || userRole === 'PR_OFFICER') setView('DASHBOARD');
        else setView('DASHBOARD');

        return updatedUser;
    } catch (e: any) {
        console.error("Profile sync error:", e);
        setErrorState("حدث خطأ أثناء مزامنة بيانات الملف الشخصي: " + (e.message || "فشل الاتصال بالخادم"));
        return null;
    }
  };

  const fetchAllData = async () => {
    if (!currentUser) return;
    setIsDbLoading(true);
    setErrorState(null);
    try {
      const results = await Promise.all([
        supabase.from('projects').select('*'),
        supabase.from('technical_requests').select('*').order('created_at', { ascending: false }),
        supabase.from('clearance_requests').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('*')
      ]);

      const [pRes, trRes, crRes, profilesRes] = results;

      if (pRes.error) throw pRes.error;
      if (trRes.error) throw trRes.error;
      if (crRes.error) throw crRes.error;
      if (profilesRes.error) throw profilesRes.error;

      if (pRes.data) {
        const mappedProjects = pRes.data.map((p: any) => ({
          ...p,
          name: p.client || p.title || p.name || 'مشروع جديد',
          consultant_name: p.consultant_name,
          consultant_engineer: p.consultant_engineer,
          consultant_mobile: p.consultant_mobile,
          water_contractor: p.water_contractor,
          water_contractor_engineer: p.water_contractor_engineer,
          water_contractor_mobile: p.water_contractor_mobile,
          electricity_contractor: p.electricity_contractor,
          electricity_contractor_engineer: p.electricity_contractor_engineer,
          electricity_contractor_mobile: p.electricity_contractor_mobile,
          survey_decisions_count: p.survey_decisions_count || p.details?.surveyDecisionsCount || 0
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
    } catch (e: any) { 
        console.error("Data fetch error:", e); 
        setErrorState("تعذر جلب البيانات من الخادم. يرجى التأكد من اتصال الإنترنت.");
    } finally { 
        setIsDbLoading(false); 
    }
  };

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (session?.user) { await syncUserProfile(session.user); } 
        else setView('LOGIN');
      } catch (e: any) {
        console.error("Session check error:", e);
        setErrorState("فشل الاتصال بخدمات Supabase. يرجى التحقق من الشبكة.");
      } finally {
        setIsAuthLoading(false);
      }
    };
    checkSession();
  }, []);

  useEffect(() => { if (currentUser && view !== 'LOGIN') fetchAllData(); }, [currentUser?.id, view]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthLoading(true);
    setErrorState(null);
    try {
        const { data, error } = await supabase.auth.signInWithPassword({ email: loginData.email, password: loginData.password });
        if (error) throw error;
        if (data.user) { await syncUserProfile(data.user); }
    } catch (e: any) {
        alert("خطأ في تسجيل الدخول: " + (e.message || "فشل الاتصال"));
    } finally {
        setIsAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
        await supabase.auth.signOut();
    } catch (e) { console.error(e); }
    setCurrentUser(null);
    safeStorage.removeItem(STORAGE_KEYS.USER_CACHE);
    setView('LOGIN');
  };

  const handleUpdateProjectDetails = async () => {
    if (!selectedProject) return;
    try {
        const directUpdate = {
            survey_decisions_count: editProjectForm.surveyDecisionsCount,
            consultant_name: editProjectForm.consultant_name,
            consultant_engineer: editProjectForm.consultant_engineer,
            consultant_mobile: editProjectForm.consultant_mobile,
            water_contractor: editProjectForm.water_contractor,
            water_contractor_engineer: editProjectForm.water_contractor_engineer,
            water_contractor_mobile: editProjectForm.water_contractor_mobile,
            electricity_contractor: editProjectForm.electricity_contractor,
            electricity_contractor_engineer: editProjectForm.electricity_contractor_engineer,
            electricity_contractor_mobile: editProjectForm.electricity_contractor_mobile,
        };
        const detailsUpdate = {
            unitsCount: editProjectForm.unitsCount,
            electricityMetersCount: editProjectForm.electricityMetersCount,
            waterMetersCount: editProjectForm.waterMetersCount,
            buildingPermitsCount: editProjectForm.buildingPermitsCount,
            occupancyCertificatesCount: editProjectForm.occupancyCertificatesCount,
        };
        const { error } = await supabase.from('projects').update({ ...directUpdate, details: detailsUpdate }).eq('id', selectedProject.id);
        if (error) throw error;
        alert("تم حفظ البيانات بنجاح ✅"); 
        setIsEditProjectModalOpen(false); 
        fetchAllData(); 
    } catch (e: any) {
        alert("خطأ في الحفظ: " + e.message);
    }
  };

  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !bulkProject) return alert("اختر المشروع والملف");
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
          submitted_by: currentUser?.name,
          status: 'new'
        })).filter(r => r.client_name);
        const { error } = await supabase.from('clearance_requests').insert(formatted);
        if (error) throw error;
        alert(`تم رفع ${formatted.length} سجل`); setIsBulkUploadModalOpen(false); fetchAllData(); 
      } catch (err: any) { alert(err.message); }
    };
    reader.readAsBinaryString(file);
  };

  const getProjectProgress = (pName: string) => {
    const tech = technicalRequests.filter(r => r.project_name === pName);
    const clear = clearanceRequests.filter(r => r.project_name === pName);
    const total = tech.length + clear.length;
    return total > 0 ? Math.round(([...tech, ...clear].filter(r => r.status === 'completed' || r.status === 'منجز').length / total) * 100) : 0;
  };

  // --- Render logic for Error states ---
  const ErrorScreen = () => (
    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-gray-50 animate-in fade-in">
        <div className="bg-red-100 p-6 rounded-full text-red-600 mb-6 shadow-sm"><WifiOff size={48}/></div>
        <h2 className="text-2xl font-black text-[#1B2B48] mb-3">عذراً، تعذر الاتصال بالخادم</h2>
        <p className="text-gray-500 mb-8 max-w-md font-bold leading-relaxed">{errorState}</p>
        <button 
            onClick={() => { setErrorState(null); fetchAllData(); }} 
            className="flex items-center gap-3 px-10 py-4 bg-[#1B2B48] text-white rounded-[25px] font-black shadow-xl hover:scale-105 transition-all active:scale-95"
        >
            <RefreshCw size={20} className={isDbLoading ? 'animate-spin' : ''} /> إعادة المحاولة
        </button>
    </div>
  );

  if (isAuthLoading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="animate-spin text-[#E95D22] w-12 h-12" /></div>;

  if (view === 'LOGIN' && !currentUser) return (
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
            <h1 className="text-2xl font-bold text-[#1B2B48]">{selectedProject ? selectedProject.name : (view === 'CONVEYANCE_SERVICES' ? 'سجل الإفراغات' : 'بوابة المشاريع')}</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-left border-r pr-6"><p className="text-sm font-bold text-[#1B2B48]">{currentUser?.name}</p><p className="text-[10px] text-[#E95D22] font-bold uppercase">{currentUser?.role}</p></div>
            <div className="w-10 h-10 bg-[#1B2B48] text-white flex items-center justify-center rounded-xl font-bold">{currentUser?.name?.[0]}</div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-12 bg-[#f8f9fa]">
          {isDbLoading ? <div className="h-full flex flex-col items-center justify-center"><Loader2 className="animate-spin text-[#E95D22] w-12 h-12" /></div> : 
           errorState ? <ErrorScreen /> : (
            <div className="max-w-7xl mx-auto space-y-8">
              
              {view === 'DASHBOARD' && !selectedProject && (
                <ProjectsModule 
                  projects={projects.map(p => ({...p, progress: getProjectProgress(p.name)}))}
                  stats={stats}
                  currentUser={currentUser}
                  onProjectClick={(p) => { setSelectedProject(p); setView('PROJECT_DETAIL'); }}
                  onRefresh={fetchAllData}
                />
              )}

              {selectedProject && view === 'PROJECT_DETAIL' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 space-y-8">
                  <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="space-y-2">
                        <button onClick={() => { setSelectedProject(null); setView('DASHBOARD'); }} className="flex items-center gap-2 text-gray-400 hover:text-[#1B2B48] text-sm font-bold transition-all mb-2">
                          <ArrowLeft size={16} /> العودة للرئيسية
                        </button>
                        <div className="flex items-center gap-3">
                          <h2 className="text-4xl font-black text-[#1B2B48] tracking-tight">{selectedProject.name}</h2>
                          {canAccess(['ADMIN', 'PR_MANAGER']) && (
                            <button onClick={() => { 
                                setEditProjectForm({
                                    ...selectedProject.details, 
                                    surveyDecisionsCount: selectedProject['survey_decisions_count'],
                                    consultant_name: selectedProject['consultant_name'],
                                    consultant_engineer: selectedProject['consultant_engineer'],
                                    consultant_mobile: selectedProject['consultant_mobile'],
                                    water_contractor: selectedProject['water_contractor'],
                                    water_contractor_engineer: selectedProject['water_contractor_engineer'],
                                    water_contractor_mobile: selectedProject['water_contractor_mobile'],
                                    electricity_contractor: selectedProject['electricity_contractor'],
                                    electricity_contractor_engineer: selectedProject['electricity_contractor_engineer'],
                                    electricity_contractor_mobile: selectedProject['electricity_contractor_mobile'],
                                }); 
                                setIsEditProjectModalOpen(true); 
                            }} className="p-2 text-gray-400 hover:text-[#E95D22] hover:bg-orange-50 rounded-full transition-all"><Edit3 size={20} /></button>
                          )}
                        </div>
                    </div>
                  </div>

                  <div className="flex gap-4 p-1.5 bg-gray-100 rounded-[30px] w-fit shadow-inner overflow-x-auto max-w-full no-scrollbar">
                    <button onClick={() => setProjectTab('info')} className={`px-8 py-3 rounded-[25px] font-bold transition-all whitespace-nowrap ${projectTab === 'info' ? 'bg-[#1B2B48] text-white shadow-xl scale-105' : 'text-gray-500 hover:text-[#1B2B48] hover:bg-white/50'}`}>المعلومات الأساسية</button>
                    {canAccess(['ADMIN', 'PR_MANAGER', 'PR_OFFICER']) && <button onClick={() => setProjectTab('work')} className={`px-8 py-3 rounded-[25px] font-bold transition-all whitespace-nowrap ${projectTab === 'work' ? 'bg-[#1B2B48] text-white shadow-xl scale-105' : 'text-gray-500 hover:text-[#1B2B48] hover:bg-white/50'}`}>أعمال المشروع الداخلية</button>}
                    {canAccess(['ADMIN', 'PR_MANAGER', 'TECHNICAL']) && <button onClick={() => setProjectTab('tech')} className={`px-8 py-3 rounded-[25px] font-bold transition-all whitespace-nowrap ${projectTab === 'tech' ? 'bg-[#1B2B48] text-white shadow-xl scale-105' : 'text-gray-500 hover:text-[#1B2B48] hover:bg-white/50'}`}>المراجعات والطلبات الفنية</button>}
                    {canAccess(['ADMIN', 'PR_MANAGER', 'CONVEYANCE', 'FINANCE']) && <button onClick={() => setProjectTab('clearance')} className={`px-8 py-3 rounded-[25px] font-bold transition-all whitespace-nowrap ${projectTab === 'clearance' ? 'bg-[#1B2B48] text-white shadow-xl scale-105' : 'text-gray-500 hover:text-[#1B2B48] hover:bg-white/50'}`}>إجراءات الإفراغ</button>}
                  </div>

                  <div className="animate-in fade-in duration-300">
                    {projectTab === 'info' && (
                      <div className="space-y-8 animate-in fade-in duration-300">
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 text-right" dir="rtl">
                            {[
                                { label: 'الوحدات', icon: Building2, value: selectedProject['units_count'] || 0, color: 'text-blue-600', bg: 'bg-blue-50' },
                                { label: 'الكهرباء', icon: Zap, value: selectedProject['electricity_meters'] || 0, color: 'text-amber-500', bg: 'bg-amber-50' },
                                { label: 'المياه', icon: Droplets, value: selectedProject['water_meters'] || 0, color: 'text-cyan-500', bg: 'bg-cyan-50' },
                            ].map((m, idx) => (
                                <div key={idx} className="bg-white p-6 rounded-[30px] border border-gray-100 shadow-sm flex flex-col items-center justify-center hover:scale-105 transition-transform">
                                    <div className={`w-12 h-12 ${m.bg} ${m.color} rounded-2xl flex items-center justify-center mb-3`}><m.icon size={24} /></div>
                                    <p className="text-3xl font-black text-[#1B2B48] mt-1">{m.value}</p>
                                    <p className="text-xs font-bold text-gray-400">{m.label}</p>
                                </div>
                            ))}
                        </div>
                      </div>
                    )}
                    {projectTab === 'work' && <TechnicalModule requests={projectInternalWorks} projects={[selectedProject]} currentUser={currentUser} usersList={usersList} onRefresh={fetchAllData} filteredByProject={selectedProject.name} scopeFilter="INTERNAL_WORK" />}
                    {projectTab === 'tech' && <TechnicalModule requests={projectExternalTechRequests} projects={[selectedProject]} currentUser={currentUser} usersList={usersList} onRefresh={fetchAllData} filteredByProject={selectedProject.name} scopeFilter="EXTERNAL" />}
                    {projectTab === 'clearance' && <ClearanceModule requests={projectClearanceRequests} projects={[selectedProject]} currentUser={currentUser} usersList={usersList} onRefresh={fetchAllData} filteredByProject={selectedProject.name} />}
                  </div>
                </div>
              )}

              {view === 'TECHNICAL_SERVICES' && !selectedProject && (
                  <TechnicalModule requests={technicalRequests.filter(r => r.scope !== 'INTERNAL_WORK')} projects={projects} currentUser={currentUser} usersList={usersList} onRefresh={fetchAllData} />
              )}

              {view === 'CONVEYANCE_SERVICES' && !selectedProject && (
                  <DeedsDashboard />
              )}

              {view === 'USERS' && !selectedProject && (
                  <div className="bg-white rounded-[40px] p-8 shadow-sm border border-gray-100 animate-in fade-in">
                      <h2 className="text-2xl font-black mb-6 text-[#1B2B48]">إدارة فريق العمل</h2>
                      <div className="overflow-hidden border border-gray-100 rounded-[30px]">
                        <table className="w-full text-right">
                            <thead className="bg-gray-50 border-b">
                              <tr><th className="p-6 text-xs text-gray-400 uppercase font-bold tracking-wider">الاسم</th><th className="p-6 text-xs text-gray-400 uppercase font-bold tracking-wider">البريد الإلكتروني</th><th className="p-6 text-xs text-gray-400 uppercase font-bold tracking-wider text-left">الدور</th></tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                              {appUsers.map(u => (
                                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                                  <td className="p-6 font-bold text-[#1B2B48]">{u.name}</td>
                                  <td className="p-6 text-gray-500 font-bold">{u.email}</td>
                                  <td className="p-6 text-left"><span className="bg-indigo-50 text-indigo-700 px-4 py-1.5 rounded-full text-xs font-black shadow-sm">{u.role}</span></td>
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

      <Modal isOpen={isEditProjectModalOpen} onClose={() => setIsEditProjectModalOpen(false)} title="تعديل تفاصيل المشروع">
        <div className="space-y-6 text-right font-cairo">
             <div className="grid grid-cols-2 gap-4">
               <input type="number" placeholder="عدد الوحدات" className="w-full p-4 bg-gray-50 border rounded-2xl" value={editProjectForm.unitsCount || 0} onChange={e => setEditProjectForm({...editProjectForm, unitsCount: parseInt(e.target.value)})} />
             </div>
             <button onClick={handleUpdateProjectDetails} className="w-full bg-[#1B2B48] text-white py-5 rounded-[25px] font-black shadow-xl mt-4">حفظ التغييرات</button>
        </div>
      </Modal>

      <Modal isOpen={isBulkUploadModalOpen} onClose={() => setIsBulkUploadModalOpen(false)} title="رفع بيانات إفراغ جماعية">
        <div className="space-y-4 text-right font-cairo">
          <select className="w-full p-4 bg-gray-50 rounded-2xl" value={bulkProject} onChange={e => setBulkProject(e.target.value)}>
              <option value="">اختر مشروعاً...</option>
              {projects.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
          </select>
          <div className="border-2 border-dashed border-gray-200 rounded-[30px] p-12 text-center bg-gray-50 hover:border-[#E95D22] transition-all group cursor-pointer">
            <input type="file" accept=".xlsx,.xls" onChange={handleExcelImport} className="hidden" id="excel-upload" />
            <label htmlFor="excel-upload" className="cursor-pointer flex flex-col items-center">
              <FileUp className="w-10 h-10 text-[#E95D22]" />
              <p className="text-lg font-black text-[#1B2B48] mb-1">اختر ملف Excel</p>
            </label>
          </div>
        </div>
      </Modal>

    </div>
  );
};

const App: React.FC = () => <ErrorBoundary><AppContent /></ErrorBoundary>;
export default App;
