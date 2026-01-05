import React, { useState, useMemo, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '../supabaseClient'; 
import { 
  Plus, Search, CheckCircle, Clock, 
  AlertCircle, FileStack, ChevronDown, ChevronUp, 
  X, User as UserIcon, Building2,
  CheckCircle2, CreditCard, Calendar, Hash, Phone, MapPin,
  ShieldCheck, Landmark, FileText, Lock, Map as MapIcon,
  MessageSquare, Send, History, FileUp, Download, Loader2,
  FileSpreadsheet
} from 'lucide-react';
import { ActivityLog } from '../contexts/DataContext';

const CITIES_LIST = ['الرياض', 'الدمام', 'الخبر', 'المدينة المنورة', 'جدة', 'مكة المكرمة'];
const REGIONS_LIST = ['المنطقة الوسطى', 'المنطقة الشرقية', 'المنطقة الغربية', 'المنطقة الشمالية', 'المنطقة الجنوبية'];
const CONTRACT_TYPES = ['اجاره', 'مرابحة', 'شراء نقدي', 'سداد مبكر'];

interface DeedsDashboardProps {
  currentUserRole?: string;
  currentUserName?: string;
  filteredProjectName?: string;
  logActivity?: (action: string, target: string, color: ActivityLog['color']) => void;
}

const DeedsDashboard: React.FC<DeedsDashboardProps> = ({ currentUserRole, currentUserName, filteredProjectName, logActivity }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [isRegModalOpen, setIsRegModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
    const [deeds, setDeeds] = useState<any[]>([]); 
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [commentInput, setCommentInput] = useState<{[key: number]: string}>({});

    const [newDeedForm, setNewDeedForm] = useState<any>({
        region: '',
        city: '',
        projectName: filteredProjectName || '',
        planNumber: '',
        unitNumber: '',
        deedNumber: '',
        deedDate: '',
        clientName: '',
        id_number: '',
        mobile: '',
        dobHijri: '',
        unitValue: '',
        taxNumber: '',
        bankName: '',
        contractType: 'مرابحة',
        newDeedNumber: '',
        newDeedDate: '',
        sakaniSupportNumber: '',
        status: 'جديد'
    });

    const canManage = ['ADMIN', 'PR_MANAGER', 'DEEDS_OFFICER'].includes(currentUserRole || '');

    const fetchDeeds = async () => {
        setIsLoading(true);
        try {
            let query = supabase
                .from('deeds_requests')
                .select('*, deed_comments(*)') 
                .order('created_at', { ascending: false });
            if (filteredProjectName) query = query.eq('project_name', filteredProjectName);
            const { data, error } = await query;
            if (error) throw error;
            if (data) {
                setDeeds(data.map((d: any) => ({
                    id: d.id,
                    clientName: d.client_name,
                    idNumber: d.id_number,
                    mobile: d.mobile || '',
                    projectName: d.project_name || '',
                    status: d.status || 'جديد',
                    created_at: d.created_at,
                    comments: d.deed_comments || [],
                    details: d
                })));
            }
        } catch (error) {} finally { setIsLoading(false); }
    };

    useEffect(() => { fetchDeeds(); }, [filteredProjectName]);

    const handleSaveNewDeed = async () => {
        if (!newDeedForm.clientName || !newDeedForm.id_number) return alert("يرجى إكمال البيانات الأساسية");
        setIsSaving(true);
        try {
            const dbData = {
                region: newDeedForm.region,
                city: newDeedForm.city,
                project_name: filteredProjectName || newDeedForm.projectName,
                plan_number: newDeedForm.planNumber,
                unit_number: newDeedForm.unitNumber,
                old_deed_number: newDeedForm.deedNumber,
                client_name: newDeedForm.clientName,
                id_number: newDeedForm.id_number,
                mobile: newDeedForm.mobile,
                unit_value: newDeedForm.unitValue ? parseFloat(String(newDeedForm.unitValue)) : 0,
                bank_name: newDeedForm.bankName,
                contract_type: newDeedForm.contractType,
                status: 'جديد',
                submitted_by: currentUserName
            };
            const { error } = await supabase.from('deeds_requests').insert([dbData]);
            if (error) throw error;
            
            logActivity?.('سجل إفراغ جديد', newDeedForm.clientName, 'text-orange-500');
            
            alert(`تم تسجيل الطلب بنجاح ✅`);
            setIsRegModalOpen(false);
            setNewDeedForm({ projectName: filteredProjectName || '', contractType: 'مرابحة', id_number: '' });
            fetchDeeds();
        } catch (error: any) { alert('خطأ: ' + error.message); } finally { setIsSaving(false); }
    };

    const handlePostComment = async (deedId: number) => {
        const text = commentInput[deedId];
        if (!text?.trim()) return;
        try {
            const { error } = await supabase.from('deed_comments').insert({ deed_id: deedId, text: text, author: currentUserName, role: currentUserRole });
            if (error) throw error;
            const deed = deeds.find(d => d.id === deedId);
            logActivity?.('أضاف ملاحظة', deed?.clientName || 'عميل', 'text-blue-500');
            setCommentInput(prev => ({ ...prev, [deedId]: '' }));
            fetchDeeds();
        } catch (e: any) {}
    };

    const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data: any[] = XLSX.utils.sheet_to_json(ws);
                const formatted = data.map(r => ({
                    project_name: r['اسم المشروع'] || filteredProjectName || '',
                    client_name: r['اسم المستفيد'] || '',
                    id_number: String(r['هوية المستفيد'] || ''),
                    status: 'جديد',
                    submitted_by: currentUserName
                })).filter(r => r.client_name && r.id_number);
                if (formatted.length === 0) throw new Error("لم يتم العثور على بيانات صالحة");
                const { error } = await supabase.from('deeds_requests').insert(formatted);
                if (error) throw error;
                logActivity?.('استورد ملف إفراغات', `${formatted.length} سجل`, 'text-orange-500');
                alert(`تم استيراد ${formatted.length} سجل بنجاح ✅`);
                setIsImportModalOpen(false);
                fetchDeeds();
            } catch (err: any) { alert("خطأ في الاستيراد: " + err.message); }
        };
        reader.readAsBinaryString(file);
    };

    const toggleRow = (id: number) => { 
        const s = new Set(expandedRows); 
        s.has(id) ? s.delete(id) : s.add(id); 
        setExpandedRows(s); 
    };

    const stats = useMemo(() => ({
        total: deeds.length,
        completed: deeds.filter(d => d.status === 'مكتمل' || d.status === 'منجز').length,
        pending: deeds.filter(d => d.status !== 'مكتمل' && d.status !== 'منجز').length,
    }), [deeds]);

    return (
        <div className="space-y-8 animate-in fade-in duration-500 font-cairo text-right" dir="rtl">
             <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-[35px] border border-gray-100 shadow-sm">
                <div>
                    <h2 className="text-2xl font-black text-[#1B2B48]">سجل الإفراغات العام</h2>
                    <p className="text-gray-400 text-xs font-bold mt-1 uppercase tracking-widest">إدارة الملكية العقارية والتدقيق الفني</p>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    {canManage && (
                        <>
                            <button onClick={() => setIsImportModalOpen(true)} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-[#1B2B48] text-white rounded-2xl font-black text-sm hover:brightness-110 shadow-lg shadow-blue-100"><FileUp size={18} /> رفع ملف إكسل</button>
                            <button onClick={() => setIsRegModalOpen(true)} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-3 bg-[#E95D22] text-white rounded-2xl font-black text-sm hover:brightness-110 shadow-xl shadow-orange-100 active:scale-95 transition-all"><Plus size={18} /> تسجيل إفراغ جديد</button>
                        </>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatBox title="إجمالي السجلات" value={stats.total} icon={<FileStack size={22}/>} color="text-blue-600" bg="bg-white" />
                <StatBox title="تم الإفراغ بنجاح" value={stats.completed} icon={<CheckCircle size={22}/>} color="text-green-600" bg="bg-green-50" />
                <StatBox title="قيد المراجعة والتدقيق" value={stats.pending} icon={<Clock size={22}/>} color="text-amber-600" bg="bg-amber-50" />
            </div>

            <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="relative w-full max-w-md">
                        <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
                        <input type="text" placeholder="بحث بالاسم أو الهوية..." className="w-full pr-12 pl-4 py-3.5 bg-gray-50 rounded-2xl border-none outline-none font-bold text-sm focus:ring-2 focus:ring-[#E95D22]/10 transition-all" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50/50 border-b border-gray-100">
                            <tr className="text-right text-gray-400 text-[10px] font-black uppercase tracking-widest">
                                <th className="p-6">المستفيد والبيانات</th>
                                <th className="p-6">المشروع</th>
                                <th className="p-6">رقم الصك</th>
                                <th className="p-6">الحالة</th>
                                <th className="p-6 w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {deeds.length === 0 ? (
                                <tr><td colSpan={5} className="p-20 text-center text-gray-300 font-bold">لا توجد سجلات حالياً</td></tr>
                            ) : (
                                deeds.filter(d => d.clientName?.includes(searchQuery) || d.idNumber?.includes(searchQuery)).map((deed) => (
                                    <React.Fragment key={deed.id}>
                                        <tr className="hover:bg-gray-50 cursor-pointer group" onClick={() => toggleRow(deed.id)}>
                                            <td className="p-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-black text-xs">{deed.clientName?.[0]}</div>
                                                    <div><p className="font-bold text-[#1B2B48] text-sm">{deed.clientName}</p><p className="text-[10px] font-mono text-gray-400 font-bold">{deed.idNumber}</p></div>
                                                </div>
                                            </td>
                                            <td className="p-6 text-sm font-bold text-gray-600">{deed.projectName}</td>
                                            <td className="p-6 text-sm font-mono font-bold text-gray-400">{deed.details.old_deed_number || '-'}</td>
                                            <td className="p-6"><span className={`px-4 py-1.5 rounded-xl text-[10px] font-black border ${deed.status === 'مكتمل' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>{deed.status}</span></td>
                                            <td className="p-6 text-gray-300">{expandedRows.has(deed.id) ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}</td>
                                        </tr>
                                        {expandedRows.has(deed.id) && (
                                            <tr className="bg-gray-50/30">
                                                <td colSpan={5} className="p-8">
                                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                                        <div className="bg-white rounded-[30px] border border-gray-100 p-8 shadow-sm flex flex-col h-[400px]">
                                                            <div className="flex justify-between items-center mb-6"><h4 className="font-black text-[#1B2B48] flex items-center gap-2"><MessageSquare size={20} className="text-[#E95D22]" /> ملاحظات وتحديثات الطلب</h4></div>
                                                            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar mb-6">
                                                                {deed.comments.length === 0 ? (<div className="h-full flex flex-col items-center justify-center opacity-30"><History size={48} className="mb-2" /><p className="text-xs font-bold italic">لا توجد تحديثات سابقة</p></div>) : (
                                                                    deed.comments.map((c: any) => (<div key={c.id} className={`p-4 rounded-2xl border ${c.author === currentUserName ? 'bg-blue-50 border-blue-100 ml-8' : 'bg-gray-50 border-gray-100 mr-8'}`}><div className="flex justify-between items-center mb-1"><span className="text-[10px] font-black text-[#1B2B48]">{c.author}</span><span className="text-[9px] text-gray-400 font-bold" dir="ltr">{new Date(c.created_at).toLocaleTimeString('ar-SA')}</span></div><p className="text-xs text-gray-600 font-bold leading-relaxed">{c.text}</p></div>))
                                                                )}
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <input type="text" placeholder="أضف ملاحظة أو تحديثاً للحالة..." className="flex-1 p-4 bg-gray-50 rounded-2xl text-xs font-bold outline-none border border-transparent focus:border-[#E95D22]/20" value={commentInput[deed.id] || ''} onChange={(e) => setCommentInput({...commentInput, [deed.id]: e.target.value})} onKeyDown={(e) => e.key === 'Enter' && handlePostComment(deed.id)}/>
                                                                <button onClick={() => handlePostComment(deed.id)} className="p-4 bg-[#1B2B48] text-white rounded-2xl hover:bg-[#E95D22] transition-all"><Send size={18} /></button>
                                                            </div>
                                                        </div>
                                                        <div className="bg-white rounded-[30px] border border-gray-100 p-8 shadow-sm"><h4 className="font-black text-[#1B2B48] mb-6 flex items-center gap-2"><FileText size={20} className="text-[#E95D22]" /> التفاصيل المسجلة</h4>
                                                            <div className="grid grid-cols-2 gap-y-4 gap-x-8">
                                                                <DetailRow label="رقم الجوال" value={deed.mobile} />
                                                                <DetailRow label="الجهة التمويلية" value={deed.details.bank_name} />
                                                                <DetailRow label="نوع العقد" value={deed.details.contract_type} />
                                                                <DetailRow label="المنطقة" value={deed.details.region} />
                                                                <DetailRow label="قيمة الوحدة" value={deed.details.unit_value?.toLocaleString() + ' ر.س'} />
                                                                <DetailRow label="رقم المخطط" value={deed.details.plan_number} />
                                                                <DetailRow label="رقم الوحدة" value={deed.details.unit_number} />
                                                                <DetailRow label="عقد الدعم" value={deed.details.sakani_support_number} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {isRegModalOpen && canManage && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#1B2B48]/40 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white rounded-[45px] w-full max-w-7xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
                        <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-white shrink-0">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-orange-50 text-[#E95D22] rounded-2xl shadow-sm"><FileText size={24} /></div>
                                <div><h3 className="text-xl font-black text-[#1B2B48]">تسجيل إفراغ جديد</h3><p className="text-[10px] text-gray-400 font-black mt-1 uppercase tracking-widest">تعبئة نموذج البيانات الموحد - 18 حقلاً</p></div>
                            </div>
                            <button onClick={() => setIsRegModalOpen(false)} className="p-2 bg-gray-50 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"><X size={24}/></button>
                        </div>
                        <div className="p-10 overflow-y-auto custom-scrollbar flex-1 bg-[#fcfcfc]">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-10">
                                <FormSelect label="المنطقة" options={REGIONS_LIST} value={newDeedForm.region} onChange={v => setNewDeedForm({...newDeedForm, region: v})} />
                                <FormSelect label="مدينة العقار" options={CITIES_LIST} value={newDeedForm.city} onChange={v => setNewDeedForm({...newDeedForm, city: v})} />
                                <FormField label="اسم المشروع" icon={<Building2 size={16}/>} value={newDeedForm.projectName} onChange={v => setNewDeedForm({...newDeedForm, projectName: v})} disabled={!!filteredProjectName} />
                                <FormField label="رقم المخطط" value={newDeedForm.planNumber} onChange={v => setNewDeedForm({...newDeedForm, planNumber: v})} />
                                <FormField label="رقم الوحدة" icon={<MapPin size={16}/>} value={newDeedForm.unitNumber} onChange={v => setNewDeedForm({...newDeedForm, unitNumber: v})} />
                                <FormField label="رقم الصك" icon={<Hash size={16}/>} value={newDeedForm.deedNumber} onChange={v => setNewDeedForm({...newDeedForm, deedNumber: v})} />
                                <FormField label="تاريخ الصك" icon={<Calendar size={16}/>} value={newDeedForm.deedDate} onChange={v => setNewDeedForm({...newDeedForm, deedDate: v})} type="date" />
                                <FormField label="اسم المستفيد" icon={<UserIcon size={16}/>} value={newDeedForm.clientName} onChange={v => setNewDeedForm({...newDeedForm, clientName: v})} />
                                <FormField label="هوية المستفيد" icon={<Hash size={16}/>} value={newDeedForm.id_number} onChange={v => setNewDeedForm({...newDeedForm, id_number: v})} type="number" />
                                <FormField label="رقم جوال المستفيد" icon={<Phone size={16}/>} value={newDeedForm.mobile} onChange={v => setNewDeedForm({...newDeedForm, mobile: v})} />
                                <FormField label="تاريخ الميلاد (هجري)" icon={<Calendar size={16}/>} value={newDeedForm.dobHijri} onChange={v => setNewDeedForm({...newDeedForm, dobHijri: v})} placeholder="14XX/XX/XX" />
                                <FormField label="قيمة الوحدة" icon={<CreditCard size={16}/>} value={newDeedForm.unitValue} onChange={v => setNewDeedForm({...newDeedForm, unitValue: v})} type="number" />
                                <FormField label="الرقم الضريبي" icon={<FileText size={16}/>} value={newDeedForm.taxNumber} onChange={v => setNewDeedForm({...newDeedForm, taxNumber: v})} />
                                <FormField label="الجهة التمويلية" icon={<Landmark size={16}/>} value={newDeedForm.bankName} onChange={v => setNewDeedForm({...newDeedForm, bankName: v})} />
                                <FormSelect label="نوع العقد التمويلي" options={CONTRACT_TYPES} value={newDeedForm.contractType} onChange={v => setNewDeedForm({...newDeedForm, contractType: v})} />
                                <FormField label="رقم الصك الجديد" icon={<CheckCircle2 size={16}/>} value={newDeedForm.newDeedNumber} onChange={v => setNewDeedForm({...newDeedForm, newDeedNumber: v})} />
                                <FormField label="تاريخ الصك الجديد" icon={<Calendar size={16}/>} value={newDeedForm.newDeedDate} onChange={v => setNewDeedForm({...newDeedForm, newDeedDate: v})} type="date" />
                                <FormField label="رقم عقد الدعم" icon={<ShieldCheck size={16}/>} value={newDeedForm.sakaniSupportNumber} onChange={v => setNewDeedForm({...newDeedForm, sakaniSupportNumber: v})} />
                            </div>
                        </div>
                        <div className="p-8 border-t border-gray-100 bg-white flex justify-end gap-5 shrink-0">
                            <button onClick={() => setIsRegModalOpen(false)} className="px-10 py-4 border border-gray-200 rounded-[22px] font-black text-gray-500 hover:bg-gray-50 text-sm active:scale-95 transition-all">إلغاء</button>
                            <button onClick={handleSaveNewDeed} disabled={isSaving} className="px-16 py-4 bg-[#E95D22] text-white rounded-[22px] font-black hover:brightness-110 shadow-2xl shadow-orange-100 text-sm flex items-center gap-2 active:scale-95 disabled:opacity-50 transition-all">{isSaving ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20}/>} {isSaving ? 'جاري الحفظ...' : 'حفظ الطلب'}</button>
                        </div>
                    </div>
                </div>
            )}

            {isImportModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#1B2B48]/40 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white rounded-[40px] w-full max-w-lg shadow-2xl overflow-hidden p-8 animate-in zoom-in-95 duration-300 text-center">
                        <div className="p-5 bg-blue-50 text-[#1B2B48] rounded-3xl w-20 h-20 flex items-center justify-center mx-auto mb-6 shadow-sm"><FileSpreadsheet size={36} /></div>
                        <h3 className="text-2xl font-black text-[#1B2B48] mb-2">استيراد سجلات الإفراغ</h3>
                        <p className="text-gray-400 font-bold mb-8 text-sm px-10">يرجى اختيار ملف Excel يحتوي على الأعمدة المعتمدة</p>
                        <div className="border-2 border-dashed border-gray-100 rounded-[30px] p-10 hover:border-[#1B2B48] transition-all group relative bg-gray-50/50 cursor-pointer mb-6">
                            <input type="file" accept=".xlsx,.xls" onChange={handleExcelImport} className="absolute inset-0 opacity-0 cursor-pointer" />
                            <FileUp className="w-12 h-12 text-[#1B2B48]/30 mb-2 mx-auto group-hover:scale-110 transition-transform" />
                            <p className="text-sm font-black text-gray-400 group-hover:text-[#1B2B48]">اضغط هنا لاختيار الملف</p>
                        </div>
                        <button onClick={() => setIsImportModalOpen(false)} className="w-full py-4 bg-gray-100 text-gray-500 rounded-2xl font-black text-sm active:scale-95 transition-all">إغلاق</button>
                    </div>
                </div>
            )}
        </div>
    );
};

const FormField = ({ label, icon, value, onChange, type = 'text', placeholder, disabled }: any) => (
    <div className="space-y-2">
        <label className="text-[10px] font-black text-gray-400 mr-1 uppercase tracking-widest block">{label}</label>
        <div className="relative group">
            {icon && <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-[#E95D22] transition-colors">{icon}</div>}
            <input type={type} disabled={disabled} placeholder={placeholder} className={`w-full ${icon ? 'pr-12' : 'pr-4'} pl-4 py-4 bg-gray-50 border border-transparent rounded-[20px] outline-none focus:border-[#E95D22] focus:bg-white focus:ring-4 focus:ring-orange-50 text-sm font-bold transition-all shadow-sm ${disabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''}`} value={value || ''} onChange={(e) => onChange(e.target.value)} />
        </div>
    </div>
);

const FormSelect = ({ label, options, value, onChange }: any) => (
    <div className="space-y-2">
        <label className="text-[10px] font-black text-gray-400 mr-1 uppercase tracking-widest block">{label}</label>
        <div className="relative">
            <select className="w-full pr-4 pl-10 py-4 bg-gray-50 border border-transparent rounded-[20px] outline-none focus:border-[#E95D22] focus:bg-white focus:ring-4 focus:ring-orange-50 text-sm font-bold appearance-none cursor-pointer transition-all shadow-sm" value={value || ''} onChange={(e) => onChange(e.target.value)}>
                <option value="" disabled selected>اختر...</option>
                {options.map((o: string) => <option key={o} value={o}>{o}</option>)}
            </select>
            <ChevronDown className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" size={18}/>
        </div>
    </div>
);

const StatBox = ({ title, value, icon, color, bg }: any) => (
  <div className={`${bg} p-8 rounded-[35px] border border-white shadow-sm flex items-center justify-between group hover:-translate-y-1 transition-all duration-300`}>
    <div><p className="text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">{title}</p><h3 className={`text-3xl font-black ${color}`}>{value}</h3></div>
    <div className={`p-4 rounded-2xl bg-white shadow-sm ${color} group-hover:scale-110 transition-transform`}>{icon}</div>
  </div>
);

const DetailRow = ({ label, value }: {label: string, value: string}) => (
    <div className="flex justify-between items-center border-b border-gray-50 pb-2">
        <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">{label}</span>
        <span className="text-xs font-black text-[#1B2B48]">{value || '-'}</span>
    </div>
);

export default DeedsDashboard;
