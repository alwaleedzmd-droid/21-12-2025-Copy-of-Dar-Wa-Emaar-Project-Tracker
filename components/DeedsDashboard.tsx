import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useLocation } from 'react-router';
import { supabase } from '../supabaseClient'; 
import { 
  Plus, Search, CheckCircle2, Clock, 
  ChevronDown, User as UserIcon, 
  MessageSquare, Send, Loader2, XCircle, Activity,
  Sparkles, FileSpreadsheet, Calendar, CreditCard,
  Building2, Phone, MapPin, FileText, Landmark
} from 'lucide-react';
import { ActivityLog, useData } from '../contexts/DataContext';
import { notificationService } from '../services/notificationService';
import Modal from './Modal';
import { parseClearanceExcel } from '../utils/excelHandler';

const STATUS_OPTIONS = [
  { value: 'جديد', label: 'جديد', color: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
  { value: 'قيد العمل', label: 'قيد العمل', color: 'bg-blue-50 text-blue-700 border-blue-100' },
  { value: 'مكتمل', label: 'مكتمل', color: 'bg-green-50 text-green-700 border-green-100' },
  { value: 'مرفوض', label: 'مرفوض', color: 'bg-red-50 text-red-700 border-red-100' }
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
    const [isAutoFilling, setIsAutoFilling] = useState(false);
    const [autoFillSuccess, setAutoFillSuccess] = useState(false);

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

    const isAuthorizedToManage = ['ADMIN', 'PR_MANAGER', 'PR_EMPLOYEE', 'DEEDS_OFFICER', 'CONVEYANCE'].includes(currentUserRole || '');

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
        setAutoFillSuccess(false);

        try {
            const { data, error } = await supabase
                .from('client_archive')
                .select('*')
                .eq('id_number', id)
                .maybeSingle();

            if (data) {
                setNewDeedForm((prev: any) => ({
                    ...prev,
                    client_name: data.customer_name || data.full_name || prev.client_name,
                    project_name: data.project_name || prev.project_name,
                    unit_number: data.unit_number || prev.unit_number,
                    unit_value: data.sale_price || data.unit_price || prev.unit_value,
                    bank_name: data.bank_name || prev.bank_name,
                    sakani_support_number: data.housing_contract_number || data.support_contract_number || prev.sakani_support_number,
                    dob_hijri: data.birth_date || data.dob_hijri || prev.dob_hijri,
                    mobile: data.mobile_number || data.customer_mobile || prev.mobile,
                    tax_number: data.tax_number || prev.tax_number,
                    city: data.city || prev.city,
                    region: data.region || prev.region
                }));
                setAutoFillSuccess(true);
                setTimeout(() => setAutoFillSuccess(false), 3000);
            }
        } catch (err) {
            console.error("🔥 Error in fetchClientDetails:", err);
        } finally {
            setIsAutoFilling(false);
        }
    };

    const fetchComments = async (requestId: number) => {
        setIsCommentLoading(true);
        try {
            const { data, error } = await supabase
                .from('deed_comments')
                .select('*')
                .eq('request_id', requestId)
                .order('created_at', { ascending: true });
            if (error) throw error;
            setComments(data || []);
            setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        } catch (error) {
            console.error("Comments fetch error", error);
        } finally { setIsCommentLoading(false); }
    };

    useEffect(() => { fetchDeeds(); }, [filteredProjectName]);

    const handleOpenManage = (deed: any) => {
        setSelectedDeed(deed);
        setIsManageModalOpen(true);
        fetchComments(deed.id);
    };

    const handleAddComment = async () => {
        if (!newComment.trim() || !selectedDeed) return;
        setIsCommentLoading(true);
        try {
            const { error } = await supabase.from('deed_comments').insert([{
                request_id: selectedDeed.id,
                user_name: currentUserName || 'مستخدم',
                text: newComment.trim() // FIXED: Changed from content to text to match DB
            }]);
            if (error) throw error;
            setNewComment('');
            fetchComments(selectedDeed.id);
            notificationService.send('PR_MANAGER', `💬 ملاحظة جديدة على إفراغ: ${selectedDeed.client_name}`, '/deeds', currentUserName);
        } catch (err: any) {
            alert("فشل إضافة التعليق: " + err.message);
        } finally { setIsCommentLoading(false); }
    };

    const handleUpdateStatus = async (status: string) => {
        if (!selectedDeed || !isAuthorizedToManage) return;
        try {
            const { error } = await supabase.from('deeds_requests').update({ status }).eq('id', selectedDeed.id);
            if (error) throw error;
            setSelectedDeed({ ...selectedDeed, status });
            fetchDeeds();
            logActivity?.('تحديث حالة إفراغ', `${selectedDeed.client_name} -> ${status}`, 'text-blue-500');
        } catch (err: any) {
            alert("خطأ: " + err.message);
        }
    };

    const handleSaveNewDeed = async () => {
        if (!newDeedForm.client_name || !newDeedForm.id_number) return alert("الاسم والهوية مطلوبان");
        setIsSaving(true);
        try {
            const payload = {
                region: newDeedForm.region,
                city: newDeedForm.city,
                project_name: newDeedForm.project_name,
                plan_number: newDeedForm.plan_number,
                unit_number: newDeedForm.unit_number,
                old_deed_number: newDeedForm.old_deed_number,
                deed_date: newDeedForm.deed_date || null,
                client_name: newDeedForm.client_name, 
                id_number: newDeedForm.id_number,     
                mobile: newDeedForm.mobile,           
                birth_date: newDeedForm.dob_hijri || null, 
                unit_value: parseFloat(newDeedForm.unit_value) || 0,
                tax_number: newDeedForm.tax_number,
                bank_name: newDeedForm.bank_name,
                contract_type: newDeedForm.contract_type,
                new_deed_number: newDeedForm.new_deed_number,
                new_deed_date: newDeedForm.new_deed_date || null,
                sakani_support_number: newDeedForm.sakani_support_number,
                status: 'جديد',
                submitted_by: currentUserName
            };

            console.log("Final Payload for DB:", payload);

            const { error } = await supabase.from('deeds_requests').insert([payload]);
            if (error) throw error;
            
            logActivity?.('تسجيل إفراغ جديد', payload.client_name, 'text-green-500');
            notificationService.send('PR_MANAGER', `🆕 طلب إفراغ جديد للمستفيد: ${payload.client_name}`, '/deeds', currentUserName);

            setIsRegModalOpen(false);
            fetchDeeds();
            refreshData();
        } catch (error: any) { 
            console.error("DB Save Error:", error);
            alert("حدث خطأ أثناء الحفظ: " + error.message); 
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
             <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-[35px] border border-gray-100 shadow-sm">
                <div>
                    <h2 className="text-2xl font-black text-[#1B2B48]">سجل الإفراغات</h2>
                    <p className="text-gray-400 text-xs font-bold mt-1 uppercase tracking-widest">إدارة شاملة لملف الإفراغ والتعليقات</p>
                </div>
                <div className="flex items-center gap-3">
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
                                <tr><td colSpan={5} className="p-20 text-center text-gray-300 font-bold italic">لا توجد سجلات</td></tr>
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
                                            <p className="text-xs font-bold text-gray-600">{parseFloat(deed.unit_value || 0).toLocaleString()} ر.س</p>
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
                                <p className="text-xs font-black text-[#1B2B48]">خاصية الإكمال التلقائي الذكية</p>
                                <p className="text-[10px] text-gray-500 font-bold">أدخل رقم الهوية لجلب البيانات من الأرشيف آلياً</p>
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
                           </div>
                        </div>
                        <Field label="اسم المستفيد" value={newDeedForm.client_name} onChange={(v: string) => setNewDeedForm({...newDeedForm, client_name: v})} icon={<UserIcon size={14}/>} />
                        <Field label="جوال المستفيد" value={newDeedForm.mobile} onChange={(v: string) => setNewDeedForm({...newDeedForm, mobile: v})} icon={<Phone size={14}/>} />
                        
                        <div className="col-span-2 border-t pt-2 mt-2 opacity-30 text-[9px] font-black text-gray-400 uppercase tracking-widest">بيانات العقار والصفقة</div>
                        
                        <Field label="المنطقة" value={newDeedForm.region} onChange={(v: string) => setNewDeedForm({...newDeedForm, region: v})} icon={<MapPin size={14}/>} />
                        <Field label="مدينة العقار" value={newDeedForm.city} onChange={(v: string) => setNewDeedForm({...newDeedForm, city: v})} icon={<MapPin size={14}/>} />
                        <Field label="اسم المشروع" value={newDeedForm.project_name} onChange={(v: string) => setNewDeedForm({...newDeedForm, project_name: v})} icon={<Building2 size={14}/>} />
                        <Field label="رقم الوحدة" value={newDeedForm.unit_number} onChange={(v: string) => setNewDeedForm({...newDeedForm, unit_number: v})} icon={<Building2 size={14}/>} />
                        <Field label="رقم الصك القديم" value={newDeedForm.old_deed_number} onChange={(v: string) => setNewDeedForm({...newDeedForm, old_deed_number: v})} icon={<FileText size={14}/>} />
                        
                        <Field 
                            label="تاريخ الصك" 
                            value={newDeedForm.deed_date} 
                            onChange={(v: string) => setNewDeedForm({...newDeedForm, deed_date: v})} 
                            type="text" 
                            placeholder="مثال: 1403/01/01"
                            icon={<Calendar size={14}/>}
                        />
                        <Field 
                            label="تاريخ الميلاد" 
                            value={newDeedForm.dob_hijri} 
                            onChange={(v: string) => setNewDeedForm({...newDeedForm, dob_hijri: v})} 
                            type="text" 
                            placeholder="مثال: 1403/01/01"
                            icon={<Calendar size={14}/>}
                        />
                        
                        <Field label="قيمة الوحدة" value={newDeedForm.unit_value} onChange={(v: string) => setNewDeedForm({...newDeedForm, unit_value: v})} icon={<CreditCard size={14}/>} />
                        <Field label="الرقم الضريبي" value={newDeedForm.tax_number} onChange={(v: string) => setNewDeedForm({...newDeedForm, tax_number: v})} />
                        <Field label="الجهة التمويلية" value={newDeedForm.bank_name} onChange={(v: string) => setNewDeedForm({...newDeedForm, bank_name: v})} icon={<Landmark size={14}/>} />
                        <Field label="رقم الصك الجديد" value={newDeedForm.new_deed_number} onChange={(v: string) => setNewDeedForm({...newDeedForm, new_deed_number: v})} icon={<FileText size={14}/>} />
                        
                        <Field 
                            label="تاريخ الصك الجديد" 
                            value={newDeedForm.new_deed_date} 
                            onChange={(v: string) => setNewDeedForm({...newDeedForm, new_deed_date: v})} 
                            type="text" 
                            placeholder="مثال: 1446/01/01"
                            icon={<Calendar size={14}/>}
                        />
                        
                        <Field label="رقم عقد الدعم" value={newDeedForm.sakani_support_number} onChange={(v: string) => setNewDeedForm({...newDeedForm, sakani_support_number: v})} />
                    </div>
                    <button onClick={handleSaveNewDeed} disabled={isSaving} className="w-full bg-[#1B2B48] text-white py-4 rounded-xl font-black mt-4 shadow-lg flex items-center justify-center gap-2">
                        {isSaving ? <Loader2 className="animate-spin" size={20}/> : 'حفظ البيانات'}
                    </button>
                </div>
            </Modal>

            {selectedDeed && (
                <Modal isOpen={isManageModalOpen} onClose={() => setIsManageModalOpen(false)} title="تدقيق ومتابعة طلب الإفراغ">
                    <div className="space-y-6 text-right overflow-y-auto max-h-[85vh] p-1 custom-scrollbar">
                        <div className="bg-gray-50 p-6 rounded-[30px] border border-gray-100 grid grid-cols-2 gap-6 shadow-inner">
                            <Detail label="المستفيد" value={selectedDeed.client_name} icon={<UserIcon size={14}/>} />
                            <Detail label="الهوية" value={selectedDeed.id_number} icon={<FileText size={14}/>} />
                            <Detail label="المشروع" value={selectedDeed.project_name} icon={<Building2 size={14}/>} />
                            <Detail label="القيمة" value={`${parseFloat(selectedDeed.unit_value || 0).toLocaleString()} ر.س`} icon={<CreditCard size={14}/>} />
                            <Detail label="البنك" value={selectedDeed.bank_name} icon={<Landmark size={14}/>} />
                            <Detail label="رقم الصك الجديد" value={selectedDeed.new_deed_number} icon={<FileText size={14}/>} />
                        </div>

                        {isAuthorizedToManage && (
                          <div className="grid grid-cols-4 gap-2">
                               {STATUS_OPTIONS.map(opt => (
                                 <button key={opt.value} onClick={() => handleUpdateStatus(opt.value)} className={`p-3 rounded-xl font-black text-[10px] border transition-all ${selectedDeed.status === opt.value ? opt.color + ' ring-2 ring-offset-1 ring-[#1B2B48]/10 shadow-sm' : 'bg-white border-gray-100 text-gray-400 hover:bg-gray-50'}`}>
                                   {opt.label}
                                 </button>
                               ))}
                          </div>
                        )}

                        <div className="border-t pt-6">
                            <h4 className="font-black text-[#1B2B48] flex items-center gap-2 mb-4">
                                <MessageSquare className="text-[#E95D22]" size={18} />
                                التحديثات والتعليقات
                            </h4>
                            <div className="bg-gray-50 rounded-[25px] p-4 h-64 overflow-y-auto space-y-3 mb-4 border shadow-inner custom-scrollbar relative">
                                {isCommentLoading && comments.length === 0 ? (
                                    <div className="absolute inset-0 flex items-center justify-center bg-gray-50/50 rounded-[25px]">
                                        <Loader2 className="animate-spin text-[#E95D22]" />
                                    </div>
                                ) : comments.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-gray-300 gap-2 opacity-50">
                                        <MessageSquare size={32} />
                                        <p className="text-xs font-bold">لا توجد ملاحظات حالياً</p>
                                    </div>
                                ) : (
                                    comments.map((c: any) => (
                                        <div key={c.id} className={`p-3 rounded-2xl shadow-sm max-w-[85%] ${c.user_name === currentUserName ? 'bg-[#1B2B48] text-white mr-auto' : 'bg-white text-[#1B2B48] ml-auto border'}`}>
                                            <div className="flex justify-between items-center mb-1 gap-4">
                                                <span className="font-black text-[9px] opacity-70">{c.user_name}</span>
                                                <span className="text-[8px] opacity-50" dir="ltr">{new Date(c.created_at).toLocaleTimeString('ar-SA', {hour: '2-digit', minute:'2-digit'})}</span>
                                            </div>
                                            <p className="text-xs font-bold leading-relaxed">{c.text}</p>
                                        </div>
                                    ))
                                )}
                                <div ref={commentsEndRef} />
                            </div>
                            <div className="flex gap-2">
                                <input 
                                    className="flex-1 p-3.5 bg-gray-50 border rounded-2xl outline-none text-xs font-bold focus:border-[#E95D22] shadow-sm" 
                                    placeholder="أضف ملاحظة أو تحديثاً..." 
                                    value={newComment} 
                                    onChange={e => setNewComment(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleAddComment()}
                                />
                                <button 
                                    onClick={handleAddComment} 
                                    disabled={!newComment.trim() || isCommentLoading}
                                    className="p-4 bg-[#1B2B48] text-white rounded-2xl hover:bg-[#E95D22] transition-all disabled:opacity-50 shadow-md"
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

const Field = ({ label, value, onChange, icon, type = "text", placeholder }: any) => (
    <div className="space-y-1">
        <label className="text-[10px] text-gray-400 font-black">{label}</label>
        <div className="relative">
            {icon && <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300">{icon}</div>}
            <input 
                type={type}
                placeholder={placeholder}
                className={`w-full ${icon ? 'pr-9' : 'px-4'} py-2.5 bg-gray-50 rounded-xl border border-gray-100 outline-none font-bold text-xs focus:border-[#E95D22] transition-all`} 
                value={value} 
                onChange={e => onChange(e.target.value)} 
            />
        </div>
    </div>
);

const Detail = ({ label, value, icon }: any) => (
    <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1.5">
            {icon && <span className="text-gray-300">{icon}</span>}
            <label className="text-[9px] text-gray-400 font-black uppercase tracking-wider">{label}</label>
        </div>
        <span className="font-black text-[#1B2B48] text-sm leading-tight pr-5">{value || '-'}</span>
    </div>
);

export default DeedsDashboard;