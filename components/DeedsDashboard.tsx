
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
  LayoutGrid, Scale, Paperclip, Info
} from 'lucide-react';
import { ActivityLog, useData } from '../contexts/DataContext';
import Modal from './Modal';

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
    const { refreshData } = useData();
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
    const commentsEndRef = useRef<HTMLDivElement>(null);

    // نموذج الـ 18 حقلًا
    const [newDeedForm, setNewDeedForm] = useState<any>({
        project_name: filteredProjectName || '',
        client_name: '',
        id_number: '',
        mobile: '',
        unit_number: '',
        block_number: '',
        plot_number: '',
        total_area: '',
        sale_price: '',
        payment_method: 'تمويل عقاري',
        bank_name: '',
        financing_status: 'قيد المراجعة',
        contract_date: '',
        deed_number: '',
        attachment_url: '',
        notes: '',
        status: 'جديد'
    });

    const isAuthorizedToManage = ['ADMIN', 'PR_MANAGER'].includes(currentUserRole || '');
    const isAdmin = currentUserRole === 'ADMIN';

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

    // منطق الربط العميق: فتح طلب الإفراغ تلقائياً
    useEffect(() => {
      if (location.state?.openId && deeds.length > 0) {
        const targetDeed = deeds.find(d => d.id === location.state.openId);
        if (targetDeed) {
          handleOpenManage(targetDeed);
        }
      }
    }, [location.state, deeds]);

    const handleOpenManage = (deed: any) => {
        setSelectedDeed(deed);
        setIsManageModalOpen(true);
        fetchComments(deed.id);
    };

    const handleUpdateStatus = async (status: string) => {
        if (!selectedDeed || !isAuthorizedToManage) return;
        if (!window.confirm(`تغيير حالة طلب ${selectedDeed.client_name} إلى ${status}؟`)) return;
        
        try {
            const { error } = await supabase
                .from('deeds_requests')
                .update({ status })
                .eq('id', selectedDeed.id);
            if (error) throw error;
            
            setSelectedDeed({ ...selectedDeed, status });
            logActivity?.('تحديث حالة صك', `${selectedDeed.client_name} -> ${status}`, 'text-blue-500');
            fetchDeeds();
            refreshData();
        } catch (err: any) {
            alert("خطأ في التحديث: " + err.message);
        }
    };

    const handleAddComment = async () => {
        if (!newComment.trim() || !selectedDeed) return;
        setIsCommentLoading(true);
        try {
            const { error } = await supabase
                .from('deed_comments')
                .insert([{
                    deed_id: selectedDeed.id,
                    user_name: currentUserName || 'مستخدم',
                    content: newComment.trim()
                }]);
            if (error) throw error;
            setNewComment('');
            fetchComments(selectedDeed.id);
        } catch (err: any) {
            alert("فشل إضافة التعليق: " + err.message);
        } finally { setIsCommentLoading(false); }
    };

    const handleSaveNewDeed = async () => {
        if (!newDeedForm.client_name || !newDeedForm.id_number) return alert("يرجى إكمال البيانات الأساسية (المستفيد والهوية)");
        setIsSaving(true);
        try {
            const payload = {
                ...newDeedForm,
                submitted_by: currentUserName,
                created_at: new Date().toISOString()
            };
            const { error } = await supabase.from('deeds_requests').insert([payload]);
            if (error) throw error;
            
            logActivity?.('تسجيل طلب إفراغ جديد', newDeedForm.client_name, 'text-green-500');
            setIsRegModalOpen(false);
            setNewDeedForm({ project_name: filteredProjectName || '', client_name: '', id_number: '', mobile: '', unit_number: '', block_number: '', plot_number: '', total_area: '', sale_price: '', payment_method: 'تمويل عقاري', bank_name: '', financing_status: 'قيد المراجعة', contract_date: '', deed_number: '', attachment_url: '', notes: '', status: 'جديد' });
            fetchDeeds();
            refreshData();
        } catch (error: any) { 
            alert('فشل الحفظ: ' + error.message); 
        } finally { setIsSaving(false); }
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
             {/* Header */}
             <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-[35px] border border-gray-100 shadow-sm">
                <div>
                    <h2 className="text-2xl font-black text-[#1B2B48]">سجل الإفراغات والصكوك</h2>
                    <p className="text-gray-400 text-xs font-bold mt-1 uppercase tracking-widest">إدارة الملكية العقارية - 18 حقل تدقيق</p>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300" size={16}/>
                        <input 
                            placeholder="بحث بالمستفيد، الهوية، أو المشروع..."
                            className="w-full pr-10 pl-4 py-2 bg-gray-50 border rounded-xl text-xs font-bold outline-none focus:border-[#E95D22]"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
                    {['ADMIN', 'PR_MANAGER', 'DEEDS_OFFICER'].includes(currentUserRole || '') && (
                        <button onClick={() => setIsRegModalOpen(true)} className="flex items-center justify-center gap-2 px-6 py-2.5 bg-[#E95D22] text-white rounded-xl font-black text-sm hover:brightness-110 shadow-lg shadow-orange-100 active:scale-95 transition-all">
                            <Plus size={16} /> تسجيل صك جديد
                        </button>
                    )}
                </div>
            </div>

            {/* List Table */}
            <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50/50 border-b border-gray-100">
                            <tr className="text-right text-gray-400 text-[10px] font-black uppercase tracking-widest">
                                <th className="p-6">المستفيد</th>
                                <th className="p-6">المشروع / الوحدة</th>
                                <th className="p-6">طريقة الدفع</th>
                                <th className="p-6">الحالة</th>
                                <th className="p-6 text-center">الإجراء</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {isLoading ? (
                                <tr><td colSpan={5} className="p-10 text-center text-gray-400"><Loader2 className="animate-spin mx-auto"/></td></tr>
                            ) : filteredDeeds.length === 0 ? (
                                <tr><td colSpan={5} className="p-20 text-center text-gray-300 font-bold">لا توجد سجلات مطابقة</td></tr>
                            ) : (
                                filteredDeeds.map((deed) => (
                                    <tr key={deed.id} className="hover:bg-gray-50 cursor-pointer group" onClick={() => handleOpenManage(deed)}>
                                        <td className="p-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center font-black text-xs">{deed.client_name?.[0]}</div>
                                                <div>
                                                    <p className="font-bold text-[#1B2B48] text-sm">{deed.client_name}</p>
                                                    <p className="text-[10px] text-gray-400 font-bold">{deed.id_number}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            <p className="text-sm font-bold text-[#1B2B48]">{deed.project_name || 'عام'}</p>
                                            <p className="text-[10px] text-gray-400 font-bold">وحدة: {deed.unit_number || '-'} | بلوك: {deed.block_number || '-'}</p>
                                        </td>
                                        <td className="p-6">
                                            <p className="text-xs font-bold text-gray-600">{deed.payment_method}</p>
                                            <p className="text-[9px] text-gray-400">{deed.bank_name || 'نقداً'}</p>
                                        </td>
                                        <td className="p-6">
                                            <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black border ${
                                                STATUS_OPTIONS.find(o => o.value === deed.status)?.color || 'bg-gray-50 text-gray-600 border-gray-100'
                                            }`}>
                                                {deed.status}
                                            </span>
                                        </td>
                                        <td className="p-6 text-center">
                                            <button className="text-blue-500 font-black text-xs hover:underline">عرض وتدقيق</button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Registration Modal (18 Fields Grid) */}
            <Modal isOpen={isRegModalOpen} onClose={() => setIsRegModalOpen(false)} title="تسجيل بيانات إفراغ جديدة">
                <div className="space-y-6 text-right font-cairo overflow-y-auto max-h-[70vh] p-2">
                    <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100 flex items-center gap-3">
                        <Info size={20} className="text-[#E95D22]"/>
                        <p className="text-xs font-bold text-orange-800">يرجى استيفاء كافة حقول التدقيق لضمان دقة التقارير.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* 1. Project Name */}
                        <div className="space-y-1">
                            <label className="text-[10px] text-gray-400 font-black mr-1 uppercase">اسم المشروع</label>
                            <input className="w-full p-3 bg-gray-50 rounded-xl border outline-none font-bold text-xs focus:border-[#E95D22]" placeholder="اختر المشروع" value={newDeedForm.project_name} onChange={e => setNewDeedForm({...newDeedForm, project_name: e.target.value})} disabled={!!filteredProjectName} />
                        </div>
                        {/* 2. Client Name */}
                        <div className="space-y-1">
                            <label className="text-[10px] text-gray-400 font-black mr-1 uppercase">اسم المستفيد</label>
                            <input className="w-full p-3 bg-gray-50 rounded-xl border outline-none font-bold text-xs focus:border-[#E95D22]" placeholder="الاسم الكامل كما في الهوية" value={newDeedForm.client_name} onChange={e => setNewDeedForm({...newDeedForm, client_name: e.target.value})} />
                        </div>
                        {/* 3. ID Number */}
                        <div className="space-y-1">
                            <label className="text-[10px] text-gray-400 font-black mr-1 uppercase">رقم الهوية</label>
                            <input className="w-full p-3 bg-gray-50 rounded-xl border outline-none font-bold text-xs focus:border-[#E95D22]" placeholder="10xxxxxxxx" value={newDeedForm.id_number} onChange={e => setNewDeedForm({...newDeedForm, id_number: e.target.value})} />
                        </div>
                        {/* 4. Mobile */}
                        <div className="space-y-1">
                            <label className="text-[10px] text-gray-400 font-black mr-1 uppercase">رقم الجوال</label>
                            <input className="w-full p-3 bg-gray-50 rounded-xl border outline-none font-bold text-xs focus:border-[#E95D22]" placeholder="05xxxxxxxx" value={newDeedForm.mobile} onChange={e => setNewDeedForm({...newDeedForm, mobile: e.target.value})} />
                        </div>
                        {/* 5. Unit No */}
                        <div className="space-y-1">
                            <label className="text-[10px] text-gray-400 font-black mr-1 uppercase">رقم الوحدة</label>
                            <input className="w-full p-3 bg-gray-50 rounded-xl border outline-none font-bold text-xs focus:border-[#E95D22]" placeholder="رقم الشقة/الفيلا" value={newDeedForm.unit_number} onChange={e => setNewDeedForm({...newDeedForm, unit_number: e.target.value})} />
                        </div>
                        {/* 6. Block No */}
                        <div className="space-y-1">
                            <label className="text-[10px] text-gray-400 font-black mr-1 uppercase">رقم البلوك</label>
                            <input className="w-full p-3 bg-gray-50 rounded-xl border outline-none font-bold text-xs focus:border-[#E95D22]" placeholder="رقم المربع" value={newDeedForm.block_number} onChange={e => setNewDeedForm({...newDeedForm, block_number: e.target.value})} />
                        </div>
                        {/* 7. Plot No */}
                        <div className="space-y-1">
                            <label className="text-[10px] text-gray-400 font-black mr-1 uppercase">رقم المخطط</label>
                            <input className="w-full p-3 bg-gray-50 rounded-xl border outline-none font-bold text-xs focus:border-[#E95D22]" placeholder="رقم المخطط المعتمد" value={newDeedForm.plot_number} onChange={e => setNewDeedForm({...newDeedForm, plot_number: e.target.value})} />
                        </div>
                        {/* 8. Total Area */}
                        <div className="space-y-1">
                            <label className="text-[10px] text-gray-400 font-black mr-1 uppercase">المساحة الإجمالية</label>
                            <input className="w-full p-3 bg-gray-50 rounded-xl border outline-none font-bold text-xs focus:border-[#E95D22]" placeholder="بالمتر المربع" value={newDeedForm.total_area} onChange={e => setNewDeedForm({...newDeedForm, total_area: e.target.value})} />
                        </div>
                        {/* 9. Sale Price */}
                        <div className="space-y-1">
                            <label className="text-[10px] text-gray-400 font-black mr-1 uppercase">قيمة البيع (ريال)</label>
                            <input className="w-full p-3 bg-gray-50 rounded-xl border outline-none font-bold text-xs focus:border-[#E95D22]" placeholder="المبلغ الصافي" value={newDeedForm.sale_price} onChange={e => setNewDeedForm({...newDeedForm, sale_price: e.target.value})} />
                        </div>
                        {/* 10. Payment Method */}
                        <div className="space-y-1">
                            <label className="text-[10px] text-gray-400 font-black mr-1 uppercase">طريقة الدفع</label>
                            <select className="w-full p-3 bg-gray-50 rounded-xl border outline-none font-bold text-xs focus:border-[#E95D22]" value={newDeedForm.payment_method} onChange={e => setNewDeedForm({...newDeedForm, payment_method: e.target.value})}>
                                <option>تمويل عقاري</option>
                                <option>نقداً (كاش)</option>
                                <option>دفعات</option>
                            </select>
                        </div>
                        {/* 11. Bank Name */}
                        <div className="space-y-1">
                            <label className="text-[10px] text-gray-400 font-black mr-1 uppercase">اسم البنك</label>
                            <input className="w-full p-3 bg-gray-50 rounded-xl border outline-none font-bold text-xs focus:border-[#E95D22]" placeholder="في حال التمويل" value={newDeedForm.bank_name} onChange={e => setNewDeedForm({...newDeedForm, bank_name: e.target.value})} />
                        </div>
                        {/* 12. Financing Status */}
                        <div className="space-y-1">
                            <label className="text-[10px] text-gray-400 font-black mr-1 uppercase">حالة التمويل</label>
                            <input className="w-full p-3 bg-gray-50 rounded-xl border outline-none font-bold text-xs focus:border-[#E95D22]" placeholder="موافقة مبدئية / نهائية" value={newDeedForm.financing_status} onChange={e => setNewDeedForm({...newDeedForm, financing_status: e.target.value})} />
                        </div>
                        {/* 13. Contract Date */}
                        <div className="space-y-1">
                            <label className="text-[10px] text-gray-400 font-black mr-1 uppercase">تاريخ العقد</label>
                            <input type="date" className="w-full p-3 bg-gray-50 rounded-xl border outline-none font-bold text-xs focus:border-[#E95D22]" value={newDeedForm.contract_date} onChange={e => setNewDeedForm({...newDeedForm, contract_date: e.target.value})} />
                        </div>
                        {/* 14. Deed Number */}
                        <div className="space-y-1">
                            <label className="text-[10px] text-gray-400 font-black mr-1 uppercase">رقم الصك</label>
                            <input className="w-full p-3 bg-gray-50 rounded-xl border outline-none font-bold text-xs focus:border-[#E95D22]" placeholder="رقم الصك الصادر" value={newDeedForm.deed_number} onChange={e => setNewDeedForm({...newDeedForm, deed_number: e.target.value})} />
                        </div>
                        {/* 15. Attachment URL */}
                        <div className="space-y-1">
                            <label className="text-[10px] text-gray-400 font-black mr-1 uppercase">رابط المرفقات</label>
                            <input className="w-full p-3 bg-gray-50 rounded-xl border outline-none font-bold text-xs focus:border-[#E95D22]" placeholder="Dropbox / Google Drive" value={newDeedForm.attachment_url} onChange={e => setNewDeedForm({...newDeedForm, attachment_url: e.target.value})} />
                        </div>
                        {/* 16. User Identity (Auto) */}
                        <div className="space-y-1 opacity-60">
                            <label className="text-[10px] text-gray-400 font-black mr-1 uppercase">المُدخل بواسطة</label>
                            <div className="w-full p-3 bg-gray-100 rounded-xl border font-bold text-xs">{currentUserName}</div>
                        </div>
                    </div>
                    {/* 17. General Notes */}
                    <div className="space-y-1">
                        <label className="text-[10px] text-gray-400 font-black mr-1 uppercase">ملاحظات عامة</label>
                        <textarea className="w-full p-3 bg-gray-50 rounded-xl border outline-none font-bold text-xs min-h-[80px]" placeholder="أي تفاصيل إضافية عن الطلب..." value={newDeedForm.notes} onChange={e => setNewDeedForm({...newDeedForm, notes: e.target.value})}></textarea>
                    </div>

                    <button 
                        onClick={handleSaveNewDeed} 
                        disabled={isSaving} 
                        className="w-full bg-[#1B2B48] text-white py-4 rounded-[25px] font-black mt-4 hover:brightness-110 active:scale-95 transition-all shadow-xl shadow-blue-100 flex items-center justify-center gap-2"
                    >
                        {isSaving ? <Loader2 className="animate-spin" size={20}/> : 'تأكيد وحفظ بيانات الإفراغ'}
                    </button>
                </div>
            </Modal>

            {/* Management Modal (Details + Restricted Status + Comments) */}
            {selectedDeed && (
                <Modal isOpen={isManageModalOpen} onClose={() => setIsManageModalOpen(false)} title="تدقيق ومتابعة طلب الإفراغ">
                    <div className="space-y-6 text-right font-cairo overflow-y-auto max-h-[80vh] p-1">
                        {/* Summary Card */}
                        <div className={`p-5 rounded-[25px] border shadow-sm ${STATUS_OPTIONS.find(o => o.value === selectedDeed.status)?.color || 'bg-gray-50 text-gray-600'}`}>
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="text-[10px] opacity-70 font-bold mb-1">المستفيد</p>
                                    <h3 className="font-black text-xl">{selectedDeed.client_name}</h3>
                                </div>
                                <div className="bg-white/50 px-4 py-2 rounded-xl backdrop-blur-md">
                                    <p className="text-[10px] opacity-70 font-bold mb-1">الحالة</p>
                                    <span className="font-black text-sm">{selectedDeed.status}</span>
                                </div>
                            </div>
                        </div>

                        {/* Detail Grid (Show all 18 fields) */}
                        <div className="bg-white p-6 rounded-[25px] border border-gray-100 shadow-sm grid grid-cols-2 gap-y-4 gap-x-6">
                            <DetailRow label="المشروع" value={selectedDeed.project_name} icon={<Building2 size={12}/>} />
                            <DetailRow label="رقم الهوية" value={selectedDeed.id_number} icon={<Hash size={12}/>} />
                            <DetailRow label="رقم الجوال" value={selectedDeed.mobile} icon={<Phone size={12}/>} />
                            <DetailRow label="رقم الوحدة" value={selectedDeed.unit_number} icon={<LayoutGrid size={12}/>} />
                            <DetailRow label="البلوك" value={selectedDeed.block_number} icon={<MapPin size={12}/>} />
                            <DetailRow label="المخطط" value={selectedDeed.plot_number} icon={<MapPin size={12}/>} />
                            <DetailRow label="المساحة" value={selectedDeed.total_area} icon={<Scale size={12}/>} />
                            <DetailRow label="القيمة" value={selectedDeed.sale_price} icon={<CreditCard size={12}/>} />
                            <DetailRow label="البنك" value={selectedDeed.bank_name} icon={<Landmark size={12}/>} />
                            <DetailRow label="طريقة الدفع" value={selectedDeed.payment_method} icon={<CreditCard size={12}/>} />
                            <DetailRow label="حالة التمويل" value={selectedDeed.financing_status} icon={<Clock size={12}/>} />
                            <DetailRow label="رقم الصك" value={selectedDeed.deed_number} icon={<FileText size={12}/>} />
                            <DetailRow label="تاريخ العقد" value={selectedDeed.contract_date} icon={<Calendar size={12}/>} />
                            <DetailRow label="المُدخل" value={selectedDeed.submitted_by} icon={<UserIcon size={12}/>} />
                            {selectedDeed.attachment_url && (
                                <div className="col-span-2 mt-2">
                                    <a href={selectedDeed.attachment_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-3 bg-blue-50 text-blue-700 rounded-xl font-bold text-xs hover:bg-blue-100 transition-all border border-blue-100">
                                        <Paperclip size={14}/> عرض المرفقات والملفات الثبوتية
                                    </a>
                                </div>
                            )}
                            {selectedDeed.notes && (
                                <div className="col-span-2 mt-2 bg-gray-50 p-4 rounded-xl border border-gray-100">
                                    <label className="text-[10px] text-gray-400 font-black block mb-1">ملاحظات الطلب</label>
                                    <p className="text-xs text-gray-600 font-bold leading-relaxed">{selectedDeed.notes}</p>
                                </div>
                            )}
                        </div>

                        {/* Restricted Status Update Buttons */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mr-1">تحديث الحالة (صلاحيات الإدارة)</h4>
                            {isAuthorizedToManage ? (
                                <div className="grid grid-cols-4 gap-2">
                                    {STATUS_OPTIONS.map(option => (
                                        <button 
                                            key={option.value}
                                            onClick={() => handleUpdateStatus(option.value)}
                                            className={`p-3 rounded-xl font-black text-[10px] flex flex-col items-center gap-1 transition-all active:scale-95 border ${
                                                selectedDeed.status === option.value ? option.color + ' ring-2 ring-offset-1' : 'bg-gray-50 text-gray-400 border-gray-100 hover:bg-gray-100'
                                            }`}
                                        >
                                            {option.icon}
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex items-center gap-2 text-amber-700 text-xs font-bold shadow-sm">
                                    <Lock size={14}/>
                                    لا تملك الصلاحية لتغيير الحالة، يرجى مراجعة إدارة العلاقات العامة.
                                </div>
                            )}
                        </div>

                        {/* Comments System */}
                        <div className="border-t border-gray-100 pt-6">
                            <h3 className="font-black text-[#1B2B48] mb-4 flex items-center gap-2">
                                <MessageSquare size={18} className="text-[#E95D22]"/>
                                سجل الملاحظات والتدقيق
                            </h3>

                            <div className="bg-gray-50 rounded-2xl p-4 h-60 overflow-y-auto space-y-3 mb-4 border border-gray-100 custom-scrollbar shadow-inner">
                                {isCommentLoading ? (
                                    <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-gray-300"/></div>
                                ) : (comments || []).length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-gray-300 opacity-60">
                                        <MessageSquare size={32} className="mb-2"/>
                                        <p className="text-xs font-bold">لا توجد ملاحظات حتى الآن</p>
                                    </div>
                                ) : (
                                    comments.map((c: any) => (
                                        <div key={c.id} className={`p-3 rounded-xl shadow-sm max-w-[85%] ${c.user_name === currentUserName ? 'bg-blue-50 mr-auto border border-blue-100' : 'bg-white ml-auto border border-gray-100'}`}>
                                            <div className="flex justify-between items-center mb-1 gap-4">
                                                <span className="font-black text-[10px] text-[#1B2B48]">{c.user_name}</span>
                                                <span className="text-[9px] text-gray-400" dir="ltr">{new Date(c.created_at).toLocaleTimeString('ar-SA', {hour:'2-digit', minute:'2-digit'})}</span>
                                            </div>
                                            <p className="text-xs text-gray-700 font-bold leading-relaxed">{c.content}</p>
                                        </div>
                                    ))
                                )}
                                <div ref={commentsEndRef} />
                            </div>

                            <div className="flex gap-2">
                                <input 
                                    className="flex-1 p-3 bg-gray-50 border rounded-xl outline-none text-xs font-bold focus:border-[#E95D22] transition-all"
                                    placeholder="إضافة ملاحظة فنية..."
                                    value={newComment}
                                    onChange={e => setNewComment(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleAddComment()}
                                />
                                <button 
                                    onClick={handleAddComment}
                                    disabled={!newComment.trim() || isCommentLoading}
                                    className="p-3 bg-[#1B2B48] text-white rounded-xl hover:bg-[#E95D22] transition-all disabled:opacity-50"
                                >
                                    <Send size={16}/>
                                </button>
                            </div>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

// Component for Detail Grid Rows
const DetailRow = ({ label, value, icon }: { label: string, value: string | number, icon: any }) => (
    <div className="flex flex-col border-b border-gray-50 pb-2">
        <label className="text-[9px] text-gray-400 font-black flex items-center gap-1 mb-1 uppercase tracking-tighter">
            {icon} {label}
        </label>
        <span className="font-bold text-[#1B2B48] text-xs truncate">
            {value || '-'}
        </span>
    </div>
);

export default DeedsDashboard;
