
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useLocation } from 'react-router';
import { supabase } from '../supabaseClient'; 
import { 
  Plus, Search, CheckCircle2, Clock, 
  AlertCircle, FileStack, ChevronDown, 
  X, User as UserIcon, Building2,
  CreditCard, Calendar, Hash, Phone, MapPin,
  Landmark, FileText, MessageSquare, Send, 
  Trash2, Loader2, XCircle, Activity, Lock,
  LayoutGrid, Scale, Paperclip, Info,
  TrendingUp, BarChart, Check, FileSpreadsheet,
  Sparkles
} from 'lucide-react';
import { ActivityLog, useData } from '../contexts/DataContext';
import { notificationService } from '../services/notificationService';
import Modal from './Modal';
import { parseClearanceExcel } from '../utils/excelHandler';

const STATUS_OPTIONS = [
  { value: 'جديد', label: 'جديد', color: 'bg-indigo-50 text-indigo-700 border-indigo-100', icon: <Plus size={16}/> },
  { value: 'قيد العمل', label: 'قيد العمل', color: 'bg-blue-50 text-blue-700 border-blue-100', icon: <Activity size={16}/> },
  { value: 'مكتمل', label: 'مكتمل', color: 'bg-green-50 text-green-700 border-green-100', icon: <CheckCircle2 size={16}/> },
  { value: 'مرفوض', label: 'مرفوض', color: 'bg-red-50 text-red-700 border-red-100', icon: <XCircle size={16}/> }
];

interface DeedsDashboardProps {
  currentUserRole?: string;
  currentUserName?: string;
  filteredProjectName?: string;
  logActivity?: (action: string, target: string, color: ActivityLog['color']) => void;
}

const DeedsDashboard: React.FC<DeedsDashboardProps> = ({ currentUserRole, currentUserName, filteredProjectName, logActivity }) => {
    const location = useLocation();
    const { refreshData, projects = [] } = useData();
    const [searchQuery, setSearchQuery] = useState('');
    const [isRegModalOpen, setIsRegModalOpen] = useState(false);
    const [isManageModalOpen, setIsManageModalOpen] = useState(false);
    const [selectedDeed, setSelectedDeed] = useState<any>(null);
    const [deeds, setDeeds] = useState<any[]>([]); 
    const [comments, setComments] = useState<any[]>([]);
    const [newComment, setNewComment] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isCommentLoading, setIsCommentLoading] = useState(false);
    
    const [isAutoFilling, setIsAutoFilling] = useState(false);
    const [autoFillSuccess, setAutoFillSuccess] = useState(false);
    const [isImporting, setIsImporting] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const commentsEndRef = useRef<HTMLDivElement>(null);

    const [newDeedForm, setNewDeedForm] = useState<any>({
        region: 'الرياض',
        city: 'الرياض',
        project_name: filteredProjectName || '',
        plan_number: '',
        unit_number: '',
        old_deed_number: '',
        deed_date: '',
        client_name: '',
        id_number: '',
        mobile: '',
        dob_hijri: '',
        unit_value: '',
        tax_number: '',
        bank_name: '',
        contract_type: 'تمويل عقاري',
        new_deed_number: '',
        new_deed_date: '',
        sakani_support_number: '',
        status: 'جديد'
    });

    const isAuthorizedToManage = ['ADMIN', 'PR_MANAGER', 'DEEDS_OFFICER', 'CONVEYANCE'].includes(currentUserRole || '');

    const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setIsImporting(true);
      try {
        const data = await parseClearanceExcel(file, null, { name: currentUserName } as any);
        const { error } = await supabase.from('deeds_requests').insert(data);
        if (error) throw error;
        alert(`تم استيراد ${data.length} سجل بنجاح ✅`);
        fetchDeeds();
      } catch (err: any) {
        alert("خطأ أثناء الاستيراد: " + err.message);
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    const fetchDeeds = async () => {
        setIsLoading(true);
        try {
            let query = supabase
                .from('deeds_requests')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (filteredProjectName) query = query.eq('project_name', filteredProjectName);
            
            const { data, error } = await query;
            if (error) throw error;
            setDeeds(data || []);
        } catch (error) {
            console.error("Critical: Deeds fetch error", error);
        } finally { setIsLoading(false); }
    };

    const fetchClientDetails = async (id: string) => {
        if (!id || id.length < 10) return;
        setIsAutoFilling(true);
        try {
            console.log("Searching for client with ID:", id);
            
            // محاولة البحث في جدول العملاء
            const { data, error } = await supabase
                .from('clients')
                .select('*')
                .eq('id_number', id)
                .maybeSingle();

            if (error) console.warn("Supabase check 'clients' table:", error.message);

            if (data) {
                console.log("Client found in 'clients' table:", data);
                setNewDeedForm((prev: any) => ({
                    ...prev,
                    client_name: data.name || data.client_name || prev.client_name,
                    mobile: data.mobile || prev.mobile,
                    dob_hijri: data.dob_hijri || prev.dob_hijri,
                    tax_number: data.tax_number || prev.tax_number
                }));
                setAutoFillSuccess(true);
                setTimeout(() => setAutoFillSuccess(false), 3000);
                return;
            }

            // إذا لم يوجد في جدول العملاء، ابحث في تاريخ الإفراغات
            console.log("Searching in 'deeds_requests' history...");
            const { data: histData, error: histError } = await supabase
                .from('deeds_requests')
                .select('client_name, mobile, dob_hijri, tax_number')
                .eq('id_number', id)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (histData && !histError) {
                console.log("Client found in history:", histData);
                setNewDeedForm((prev: any) => ({
                    ...prev,
                    client_name: histData.client_name || prev.client_name,
                    mobile: histData.mobile || prev.mobile,
                    dob_hijri: histData.dob_hijri || prev.dob_hijri,
                    tax_number: histData.tax_number || prev.tax_number
                }));
                setAutoFillSuccess(true);
                setTimeout(() => setAutoFillSuccess(false), 3000);
            } else {
                console.log("No historical data found for this ID.");
            }
        } catch (err) {
            console.error("Auto-fill client details failed:", err);
        } finally {
            setIsAutoFilling(false);
        }
    };

    const fetchComments = async (deedId: number) => {
        setIsCommentLoading(true);
        try {
            const { data, error } = await supabase
                .from('deed_comments')
                .select('*')
                .eq('deed_id', deedId)
                .order('created_at', { ascending: true });
            if (error) throw error;
            setComments(data || []);
            setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        } catch (error) {
            console.error("Comments fetch error", error);
        } finally { setIsCommentLoading(false); }
    };

    useEffect(() => { fetchDeeds(); }, [filteredProjectName]);

    useEffect(() => {
      if (location.state?.openId && deeds.length > 0) {
        const targetDeed = deeds.find(d => d.id === location.state.openId);
        if (targetDeed) handleOpenManage(targetDeed);
      }
    }, [location.state, deeds]);

    const handleOpenManage = (deed: any) => {
        setSelectedDeed(deed);
        setIsManageModalOpen(true);
        fetchComments(deed.id);
    };

    const handleUpdateStatus = async (status: string) => {
        if (!selectedDeed || !isAuthorizedToManage) return;
        try {
            const { error } = await supabase.from('deeds_requests').update({ status }).eq('id', selectedDeed.id);
            if (error) throw error;
            setSelectedDeed({ ...selectedDeed, status });
            fetchDeeds();
        } catch (err: any) {
            alert("خطأ: " + err.message);
        }
    };

    const handleSaveNewDeed = async () => {
        if (!newDeedForm.client_name || !newDeedForm.id_number) return alert("الاسم والهوية مطلوبان");
        setIsSaving(true);
        try {
            const payload = { ...newDeedForm, submitted_by: currentUserName };
            const { error } = await supabase.from('deeds_requests').insert([payload]);
            if (error) throw error;
            setIsRegModalOpen(false);
            fetchDeeds();
            refreshData();
        } catch (error: any) { alert(error.message); } finally { setIsSaving(false); }
    };

    const filteredDeeds = useMemo(() => {
        return (deeds || []).filter(d => 
            d.client_name?.includes(searchQuery) || 
            d.id_number?.includes(searchQuery) || 
            d.project_name?.includes(searchQuery)
        );
    }, [deeds, searchQuery]);

    return (
        <div className="space-y-8 animate-in fade-in duration-500 font-cairo text-right" dir="rtl">
             <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-[35px] border border-gray-100 shadow-sm">
                <div>
                    <h2 className="text-2xl font-black text-[#1B2B48]">سجل الإفراغات (18 حقل)</h2>
                    <p className="text-gray-400 text-xs font-bold mt-1 uppercase tracking-widest">إدارة متكاملة حسب متطلبات ملف الإكسل</p>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx,.xls" onChange={handleImportExcel} />
                    <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2.5 bg-green-50 text-green-700 rounded-xl font-black text-sm hover:bg-green-100 border border-green-100 transition-all">
                        {isImporting ? <Loader2 size={16} className="animate-spin" /> : <FileSpreadsheet size={16} />} استيراد Excel
                    </button>
                    <button onClick={() => setIsRegModalOpen(true)} className="flex items-center justify-center gap-2 px-6 py-2.5 bg-[#E95D22] text-white rounded-xl font-black text-sm hover:brightness-110 shadow-lg active:scale-95 transition-all">
                        <Plus size={16} /> تسجيل صك جديد
                    </button>
                </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                <div className="relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300" size={16}/>
                    <input placeholder="بحث بالمستفيد، الهوية، أو المشروع..." className="w-full pr-10 pl-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold outline-none focus:border-[#E95D22]" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                </div>
            </div>

            <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50/50 border-b border-gray-100">
                            <tr className="text-right text-gray-400 text-[10px] font-black uppercase tracking-widest">
                                <th className="p-6">المستفيد</th>
                                <th className="p-6">المشروع / الوحدة</th>
                                <th className="p-6">القيمة / البنك</th>
                                <th className="p-6">الحالة</th>
                                <th className="p-6"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {isLoading ? (
                                <tr><td colSpan={5} className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-gray-300"/></td></tr>
                            ) : filteredDeeds.length === 0 ? (
                                <tr><td colSpan={5} className="p-20 text-center text-gray-300 font-bold">لا توجد سجلات</td></tr>
                            ) : (
                                filteredDeeds.map((deed) => (
                                    <tr key={deed.id} className="hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => handleOpenManage(deed)}>
                                        <td className="p-6">
                                            <p className="font-bold text-[#1B2B48] text-sm">{deed.client_name}</p>
                                            <p className="text-[10px] text-gray-400 font-bold">{deed.id_number}</p>
                                        </td>
                                        <td className="p-6">
                                            <p className="text-sm font-bold text-[#1B2B48]">{deed.project_name}</p>
                                            <p className="text-[10px] text-gray-400 font-bold">وحدة: {deed.unit_number}</p>
                                        </td>
                                        <td className="p-6">
                                            <p className="text-xs font-bold text-gray-600">{parseFloat(deed.unit_value || deed.sale_price || 0).toLocaleString()} ر.س</p>
                                            <p className="text-[9px] text-gray-400">{deed.bank_name || '-'}</p>
                                        </td>
                                        <td className="p-6">
                                            <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black border ${
                                                STATUS_OPTIONS.find(o => o.value === deed.status)?.color || 'bg-gray-50'
                                            }`}>
                                                {deed.status}
                                            </span>
                                        </td>
                                        <td className="p-6 text-center">
                                            <ChevronDown size={16} className="text-gray-300" />
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal isOpen={isRegModalOpen} onClose={() => setIsRegModalOpen(false)} title="تسجيل بيانات إفراغ">
                <div className="space-y-4 text-right overflow-y-auto max-h-[70vh] p-2 custom-scrollbar">
                    <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100 flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                            <Sparkles className="text-[#E95D22]" size={20} />
                            <div>
                                <p className="text-xs font-black text-[#1B2B48]">خاصية الإكمال التلقائي</p>
                                <p className="text-[10px] text-gray-500 font-bold">أدخل رقم الهوية لجلب بيانات العميل المسجلة سابقاً</p>
                            </div>
                        </div>
                        {isAutoFilling && <Loader2 size={16} className="animate-spin text-[#E95D22]" />}
                        {autoFillSuccess && <CheckCircle2 size={16} className="text-green-500 animate-bounce" />}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                           <div className="space-y-1 relative">
                                <label className="text-[10px] text-gray-400 font-black">رقم الهوية</label>
                                <input 
                                    className={`w-full p-3 bg-white rounded-xl border outline-none font-black text-sm transition-all focus:border-[#E95D22] shadow-sm ${autoFillSuccess ? 'ring-2 ring-green-100 border-green-500' : 'border-gray-100'}`} 
                                    placeholder="100XXXXXXXX"
                                    value={newDeedForm.id_number} 
                                    onBlur={(e) => fetchClientDetails(e.target.value)}
                                    onChange={e => setNewDeedForm({...newDeedForm, id_number: e.target.value})} 
                                />
                                {isAutoFilling && <div className="absolute left-3 bottom-2.5"><Loader2 size={14} className="animate-spin text-gray-300" /></div>}
                           </div>
                        </div>
                        <Field label="اسم المستفيد" value={newDeedForm.client_name} onChange={(v: string) => setNewDeedForm({...newDeedForm, client_name: v})} />
                        <Field label="جوال المستفيد" value={newDeedForm.mobile} onChange={(v: string) => setNewDeedForm({...newDeedForm, mobile: v})} />
                        
                        <div className="col-span-2 border-t pt-2 mt-2 opacity-30 text-[9px] font-black text-gray-400 uppercase tracking-widest">بيانات العقار والصفقة</div>
                        
                        <Field label="المنطقة" value={newDeedForm.region} onChange={(v: string) => setNewDeedForm({...newDeedForm, region: v})} />
                        <Field label="مدينة العقار" value={newDeedForm.city} onChange={(v: string) => setNewDeedForm({...newDeedForm, city: v})} />
                        <Field label="اسم المشروع" value={newDeedForm.project_name} onChange={(v: string) => setNewDeedForm({...newDeedForm, project_name: v})} />
                        <Field label="رقم المخطط" value={newDeedForm.plan_number} onChange={(v: string) => setNewDeedForm({...newDeedForm, plan_number: v})} />
                        <Field label="رقم الوحدة" value={newDeedForm.unit_number} onChange={(v: string) => setNewDeedForm({...newDeedForm, unit_number: v})} />
                        <Field label="رقم الصك القديم" value={newDeedForm.old_deed_number} onChange={(v: string) => setNewDeedForm({...newDeedForm, old_deed_number: v})} />
                        <Field label="تاريخ الصك" value={newDeedForm.deed_date} onChange={(v: string) => setNewDeedForm({...newDeedForm, deed_date: v})} />
                        <Field label="تاريخ الميلاد" value={newDeedForm.dob_hijri} onChange={(v: string) => setNewDeedForm({...newDeedForm, dob_hijri: v})} />
                        <Field label="قيمة الوحدة" value={newDeedForm.unit_value} onChange={(v: string) => setNewDeedForm({...newDeedForm, unit_value: v})} />
                        <Field label="الرقم الضريبي" value={newDeedForm.tax_number} onChange={(v: string) => setNewDeedForm({...newDeedForm, tax_number: v})} />
                        <Field label="الجهة التمويلية" value={newDeedForm.bank_name} onChange={(v: string) => setNewDeedForm({...newDeedForm, bank_name: v})} />
                        <Field label="نوع العقد" value={newDeedForm.contract_type} onChange={(v: string) => setNewDeedForm({...newDeedForm, contract_type: v})} />
                        <Field label="رقم الصك الجديد" value={newDeedForm.new_deed_number} onChange={(v: string) => setNewDeedForm({...newDeedForm, new_deed_number: v})} />
                        <Field label="تاريخ الصك الجديد" value={newDeedForm.new_deed_date} onChange={(v: string) => setNewDeedForm({...newDeedForm, new_deed_date: v})} />
                        <Field label="رقم عقد الدعم" value={newDeedForm.sakani_support_number} onChange={(v: string) => setNewDeedForm({...newDeedForm, sakani_support_number: v})} />
                    </div>
                    <button onClick={handleSaveNewDeed} disabled={isSaving} className="w-full bg-[#1B2B48] text-white py-4 rounded-xl font-black mt-4 shadow-lg flex items-center justify-center gap-2">
                        {isSaving ? <Loader2 className="animate-spin" size={20}/> : 'حفظ البيانات'}
                    </button>
                </div>
            </Modal>

            {selectedDeed && (
                <Modal isOpen={isManageModalOpen} onClose={() => setIsManageModalOpen(false)} title="تدقيق طلب الإفراغ">
                    <div className="space-y-6 text-right overflow-y-auto max-h-[80vh] p-1 custom-scrollbar">
                        <div className="bg-gray-50 p-6 rounded-[25px] border border-gray-100 grid grid-cols-2 gap-4">
                            <Detail label="المستفيد" value={selectedDeed.client_name} />
                            <Detail label="الهوية" value={selectedDeed.id_number} />
                            <Detail label="المشروع" value={selectedDeed.project_name} />
                            <Detail label="القيمة" value={selectedDeed.unit_value || selectedDeed.sale_price} />
                            <Detail label="البنك" value={selectedDeed.bank_name} />
                            <Detail label="رقم الصك الجديد" value={selectedDeed.new_deed_number} />
                        </div>
                        <div className="flex gap-2">
                             {STATUS_OPTIONS.map(opt => (
                               <button key={opt.value} onClick={() => handleUpdateStatus(opt.value)} className={`flex-1 p-3 rounded-xl font-bold text-[10px] border ${selectedDeed.status === opt.value ? opt.color : 'bg-white'}`}>
                                 {opt.label}
                               </button>
                             ))}
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

const Field = ({ label, value, onChange }: any) => (
    <div className="space-y-1">
        <label className="text-[10px] text-gray-400 font-black">{label}</label>
        <input className="w-full p-2.5 bg-gray-50 rounded-xl border border-gray-100 outline-none font-bold text-xs focus:border-[#E95D22]" value={value} onChange={e => onChange(e.target.value)} />
    </div>
);

const Detail = ({ label, value }: any) => (
    <div>
        <label className="text-[9px] text-gray-400 font-black block">{label}</label>
        <span className="font-bold text-[#1B2B48] text-xs">{value || '-'}</span>
    </div>
);

export default DeedsDashboard;
