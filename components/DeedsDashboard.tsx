import React, { useState, useMemo, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx'; 
import { supabase } from '../supabaseClient'; 
import { 
  Plus, Search, CheckCircle, Clock, 
  AlertCircle, FileStack, ChevronDown, ChevronUp, 
  X, Printer, User as UserIcon, Building2,
  CheckCircle2, CreditCard, Calendar, Hash, Phone, MapPin,
  ShieldCheck, MessageSquare, Info, UploadCloud, Loader2, Send, FileSpreadsheet
} from 'lucide-react';

// --- القوائم المحدثة حسب طلبك ---
const CITIES_LIST = ['الرياض', 'الدمام', 'الخبر', 'المدينة المنورة'];
const BANKS_LIST = ['مصرف الراجحي', 'البنك الأهلي', 'بنك الرياض', 'مصرف الإنماء', 'بنك البلاد', 'البنك العربي', 'أخرى'];
const PROJECTS_LIST = ['سرايا الجوان', 'سرايا البدر', 'حي الصحافة', 'الأرجس ريزيدنس', 'مشروع شمس الرياض'];

const DeedsDashboard: React.FC<{ currentUserRole?: string, currentUserName?: string }> = ({ currentUserRole, currentUserName }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
    const [deeds, setDeeds] = useState<any[]>([]); 
    const [isLoading, setIsLoading] = useState(true);
    const [commentInputs, setCommentInputs] = useState<{[key: number]: string}>({});
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [newDeedForm, setNewDeedForm] = useState<any>({});

    const canEditStatus = ['PR_MANAGER', 'PR_OFFICER', 'ADMIN'].includes(currentUserRole || '');

    // --- 1. جلب البيانات + التعليقات ---
    const fetchDeeds = async () => {
        try {
            // جلب الطلبات مع التعليقات المرتبطة بها
            const { data, error } = await supabase
                .from('deeds_requests')
                .select('*, deed_comments(*)') 
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (data) {
                const formattedDeeds = data.map((d: any) => ({
                    id: d.id,
                    clientName: d.client_name,
                    idNumber: d.id_number,
                    mobile: d.mobile || '',
                    dob: d.dob || '',
                    region: d.region || '',
                    city: d.city || '',
                    projectName: d.project_name || '',
                    planNumber: d.plan_number || '',
                    plotNumber: d.plot_number || '',
                    unitNumber: d.unit_number || '',
                    unitValue: d.unit_value,
                    oldDeedNumber: d.old_deed_number || '',
                    oldDeedDate: d.old_deed_date || '',
                    newDeedNumber: d.new_deed_number || '',
                    newDeedDate: d.new_deed_date || '',
                    taxNumber: d.tax_number || '',
                    bank: d.bank_name || '',
                    contractType: d.contract_type || '',
                    sakaniSupportNumber: d.sakani_support_number || '', // الخانة الجديدة
                    status: d.status || 'جديد',
                    submitted_by: d.submitted_by,
                    date: new Date(d.created_at).toLocaleDateString('en-CA'),
                    units: [{ 
                        id: `u-${d.id}`, 
                        number: d.unit_number || '-', 
                        type: 'وحدة', 
                        status: 'متاح', 
                        price: d.unit_value ? Number(d.unit_value).toLocaleString() : '0' 
                    }],
                    // ترتيب التعليقات من الأقدم للأحدث
                    comments: d.deed_comments ? d.deed_comments.sort((a:any, b:any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) : []
                }));
                setDeeds(formattedDeeds);
            }
        } catch (error) {
            console.error('Error fetching:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchDeeds();
    }, []);

    // --- 2. إضافة تعليق (فعال) ---
    const handleAddComment = async (deedId: number) => {
        const text = commentInputs[deedId];
        if (!text || text.trim() === "") return;

        try {
            const newCommentPayload = {
                deed_id: deedId,
                text: text,
                author: currentUserName || 'مستخدم',
                role: currentUserRole || 'موظف'
            };

            const { data, error } = await supabase
                .from('deed_comments')
                .insert(newCommentPayload)
                .select()
                .single();

            if (error) throw error;

            // تحديث الواجهة فوراً
            setDeeds(prev => prev.map(d => {
                if (d.id === deedId) {
                    return { ...d, comments: [...(d.comments || []), data] };
                }
                return d;
            }));
            
            setCommentInputs({ ...commentInputs, [deedId]: '' });

        } catch (error: any) {
            alert("فشل إضافة التعليق: " + error.message);
        }
    };

    // --- 3. حفظ البيانات (شامل الخانة الجديدة) ---
    const saveToSupabase = async (newDeedsData: any[]) => {
        try {
            const dbData = newDeedsData.map(d => ({
                client_name: d.clientName,
                id_number: d.idNumber,
                mobile: d.mobile,
                dob: d.dob,
                region: d.region, // المنطقة (يمكنك جعلها نفس المدينة إذا أردت)
                city: d.city,     // المدينة (الرياض، الدمام...)
                project_name: d.projectName,
                plan_number: d.plan_number, // لاحظ: تأكدنا من الاسم البرمجي
                plot_number: d.plotNumber,
                unit_number: d.unitNumber,
                unit_value: d.unitValue ? parseFloat(String(d.unitValue).replace(/[^0-9.]/g, '')) : 0,
                old_deed_number: d.oldDeedNumber,
                old_deed_date: d.oldDeedDate,
                new_deed_number: d.newDeedNumber,
                new_deed_date: d.newDeedDate,
                tax_number: d.taxNumber,
                bank_name: d.bank,
                contract_type: d.contractType,
                sakani_support_number: d.sakaniSupportNumber, // الحفظ في العمود الجديد
                status: 'جديد',
                submitted_by: currentUserName
            }));

            const { error } = await supabase.from('deeds_requests').insert(dbData);
            if (error) throw error;

            alert(`تم حفظ ${dbData.length} طلب بنجاح ✅`);
            fetchDeeds(); 

        } catch (error: any) {
            console.error(error);
            alert('حدث خطأ أثناء الحفظ: ' + error.message);
        }
    };

    // --- 4. استيراد Excel ---
    const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.readAsArrayBuffer(file);
        reader.onload = async (evt) => {
            try {
                const data = new Uint8Array(evt.target?.result as ArrayBuffer);
                const wb = XLSX.read(data, { type: 'array' });
                const jsonData: any[] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
                if (jsonData.length === 0) { alert("الملف فارغ!"); return; }
                const firstRow = jsonData[0];
                const headers = Object.keys(firstRow);
                const findCol = (names: string[]) => headers.find(h => names.includes(h.trim()));
                const nameKey = findCol(['اسم المستفيد', 'اسم العميل', 'الاسم']);
                const idKey = findCol(['رقم الهوية', 'الهوية']);

                if (!nameKey || !idKey) { alert("تأكد من وجود أعمدة الاسم والهوية"); return; }

                const importedDeeds = jsonData.map((row: any) => ({
                    clientName: row[nameKey!],
                    idNumber: String(row[idKey!]),
                    mobile: String(row[findCol(['الجوال', 'رقم الجوال']) || ''] || ''),
                    dob: row[findCol(['تاريخ الميلاد']) || ''] || '',
                    city: row[findCol(['المدينة', 'موقع العقار']) || ''] || '',
                    region: row[findCol(['المنطقة']) || ''] || '',
                    projectName: row[findCol(['المشروع']) || ''] || '',
                    // ... باقي الحقول يمكن إضافتها بنفس الطريقة
                    sakaniSupportNumber: row[findCol(['رقم الدعم', 'رقم عقد الدعم']) || ''] || '',
                })).filter(d => d.clientName && d.idNumber);

                if (importedDeeds.length > 0) await saveToSupabase(importedDeeds);
            } catch (error) { alert("خطأ في الملف"); }
            if (fileInputRef.current) fileInputRef.current.value = '';
        };
    };

    // Helpers
    const handleSaveNewDeed = async () => {
        if (!newDeedForm.clientName || !newDeedForm.idNumber) { alert("الاسم والهوية مطلوبان"); return; }
        await saveToSupabase([{...newDeedForm}]);
        setIsModalOpen(false); setNewDeedForm({});
    };
    const handleStatusChange = async (id: number, newStatus: string) => {
        setDeeds(prev => prev.map(d => d.id === id ? { ...d, status: newStatus } : d));
        await supabase.from('deeds_requests').update({ status: newStatus }).eq('id', id);
    };
    const stats = useMemo(() => ({
        total: deeds.length,
        completed: deeds.filter(d => d.status === 'منجز').length,
        processing: deeds.filter(d => d.status === 'قيد المعالجة').length,
        actionRequired: deeds.filter(d => ['جديد', 'مطلوب تعديل', 'مرفوض'].includes(d.status)).length,
    }), [deeds]);
    const filteredDeeds = useMemo(() => deeds.filter(d => d.clientName?.includes(searchQuery) || d.idNumber?.includes(searchQuery)), [deeds, searchQuery]);
    const handleFormChange = (key: string, value: string) => setNewDeedForm({ ...newDeedForm, [key]: value });
    const toggleRow = (id: number) => { const s = new Set(expandedRows); s.has(id) ? s.delete(id) : s.add(id); setExpandedRows(s); };
    const getStatusColor = (s: string) => s === 'منجز' ? 'bg-green-50 text-green-600 border-green-100' : s === 'قيد المعالجة' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-orange-50 text-orange-600 border-orange-100';

    return (
        <div id="printable-dashboard" className="space-y-8 animate-in fade-in duration-500 font-cairo text-right" dir="rtl">
             {/* Header & KPIs (Same as before) */}
             <div className="flex flex-col md:flex-row justify-between items-center gap-4 no-print">
                <div><h2 className="text-2xl font-black text-[#1B2B48]">سجل الإفراغات</h2><p className="text-gray-400 text-xs font-bold mt-1">نظام إدارة الصكوك والعقود</p></div>
                <div className="flex items-center gap-3">
                    <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls, .csv" onChange={handleImportExcel} />
                    <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 font-bold text-xs transition-all shadow-sm"><UploadCloud size={18} /> استيراد (Excel)</button>
                    <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-6 py-3 bg-[#E95D22] text-white rounded-xl font-bold text-sm hover:brightness-110 shadow-lg shadow-orange-100 transition-all"><Plus size={18} /> تسجيل إفراغ جديد</button>
                    <button onClick={() => window.print()} className="px-4 py-3 bg-white border border-blue-100 text-blue-600 rounded-xl hover:bg-blue-50"><Printer size={18} /></button>
                    <button className="flex items-center gap-2 px-4 py-3 bg-white border border-green-100 text-green-600 rounded-xl hover:bg-green-50 font-bold text-xs transition-all"><FileSpreadsheet size={18} /> Excel</button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard title="إجمالي الطلبات" value={isLoading ? '...' : stats.total} icon={<FileStack size={24}/>} color="text-[#1B2B48]" bg="bg-white" />
                <KPICard title="تم الإفراغ" value={isLoading ? '...' : stats.completed} icon={<CheckCircle size={24}/>} color="text-green-600" bg="bg-green-50" />
                <KPICard title="قيد المعالجة" value={isLoading ? '...' : stats.processing} icon={<Clock size={24}/>} color="text-blue-600" bg="bg-blue-50" />
                <KPICard title="تنبيهات / جديد" value={isLoading ? '...' : stats.actionRequired} icon={<AlertCircle size={24}/>} color="text-red-600" bg="bg-red-50" />
            </div>

            {/* Table */}
            <div className="bg-white rounded-[30px] border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex justify-between items-center p-6 border-b border-gray-100 no-print">
                    <div className="relative w-full max-w-md"><Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} /><input type="text" placeholder="بحث..." className="w-full pr-12 pl-4 py-3 bg-gray-50 rounded-xl border-none outline-none font-bold text-sm" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /></div>
                </div>
                
                {isLoading ? (
                    <div className="p-12 flex justify-center text-gray-400 font-bold gap-2"><Loader2 className="animate-spin"/> جاري التحميل...</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50/50 border-b border-gray-100"><tr className="text-right text-gray-400 text-xs font-black"><th className="p-6">العميل</th><th className="p-6">الهوية</th><th className="p-6">المشروع</th><th className="p-6">الحالة</th><th className="p-6 w-10"></th></tr></thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredDeeds.map((deed) => (
                                    <React.Fragment key={deed.id}>
                                        <tr className={`hover:bg-gray-50 cursor-pointer ${expandedRows.has(deed.id) ? 'bg-blue-50/10' : ''}`}>
                                            <td className="p-6 font-bold text-[#1B2B48] flex items-center gap-3" onClick={() => toggleRow(deed.id)}><div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500"><UserIcon size={14}/></div>{deed.clientName}</td>
                                            <td className="p-6 text-sm font-mono font-bold text-gray-500" onClick={() => toggleRow(deed.id)}>{deed.idNumber}</td>
                                            <td className="p-6 text-sm font-bold text-[#1B2B48]" onClick={() => toggleRow(deed.id)}>{deed.projectName}</td>
                                            <td className="p-6">{canEditStatus ? (<select value={deed.status} onChange={(e) => handleStatusChange(deed.id, e.target.value)} className={`appearance-none cursor-pointer pl-8 pr-4 py-2 rounded-xl text-[11px] font-black border outline-none w-36 ${getStatusColor(deed.status)}`}><option value="جديد">جديد</option><option value="قيد المعالجة">قيد المعالجة</option><option value="منجز">منجز</option><option value="مطلوب تعديل">مطلوب تعديل</option><option value="مرفوض">مرفوض</option></select>) : <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black border ${getStatusColor(deed.status)}`}>{deed.status}</span>}</td>
                                            <td className="p-6 text-gray-400 text-center" onClick={() => toggleRow(deed.id)}>{expandedRows.has(deed.id) ? <ChevronUp size={18}/> : <ChevronDown size={18}/>}</td>
                                        </tr>
                                        {expandedRows.has(deed.id) && (
                                            <tr className="bg-gray-50/30 animate-in fade-in"><td colSpan={6} className="p-6"><div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm">
                                                <div className="flex items-center gap-2 mb-6 pb-4 border-b border-gray-50"><div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Info size={18}/></div><h4 className="text-sm font-black text-[#1B2B48]">تفاصيل الطلب</h4></div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-6 gap-x-12">
                                                    <DetailItem label="اسم المستفيد" value={deed.clientName} icon={<UserIcon size={14}/>} /><DetailItem label="رقم الهوية" value={deed.idNumber} icon={<Hash size={14}/>} /><DetailItem label="رقم الجوال" value={deed.mobile} icon={<Phone size={14}/>} /><DetailItem label="تاريخ الميلاد" value={deed.dob} icon={<Calendar size={14}/>} />
                                                    <DetailItem label="المنطقة" value={deed.region} /><DetailItem label="المدينة" value={deed.city} /><DetailItem label="المشروع" value={deed.projectName} />
                                                    <DetailItem label="رقم المخطط" value={deed.planNumber} /><DetailItem label="رقم القطعة" value={deed.plotNumber} /><DetailItem label="رقم الوحدة" value={deed.unitNumber} icon={<MapPin size={14}/>} />
                                                    <DetailItem label="قيمة الوحدة" value={deed.unitValue} icon={<CreditCard size={14}/>} />
                                                    <DetailItem label="الصك القديم" value={deed.oldDeedNumber} /><DetailItem label="تاريخه" value={deed.oldDeedDate} /><DetailItem label="الصك الجديد" value={deed.newDeedNumber} highlight /><DetailItem label="تاريخه" value={deed.newDeedDate} highlight />
                                                    <DetailItem label="الرقم الضريبي" value={deed.taxNumber} /><DetailItem label="الجهة التمويلية" value={deed.bank} /><DetailItem label="نوع العقد" value={deed.contractType} />
                                                    {/* الخانة الجديدة تظهر هنا */}
                                                    <DetailItem label="رقم عقد الدعم السكني" value={deed.sakaniSupportNumber} highlight />
                                                </div>
                                                <div className="mt-6 pt-6 border-t border-gray-100">
                                                    <h4 className="text-xs font-black text-[#1B2B48] mb-2 flex items-center gap-2"><UserIcon size={14}/> القائم على الطلب</h4>
                                                    <p className="text-sm text-gray-600">{deed.submitted_by || 'غير محدد'}</p>
                                                </div>
                                                {/* قسم التعليقات الفعال */}
                                                <div className="mt-6 bg-gray-50 p-6 rounded-2xl border border-gray-100">
                                                    <h4 className="text-xs font-black text-[#1B2B48] mb-4 flex items-center gap-2"><MessageSquare size={16}/> الملاحظات والردود</h4>
                                                    <div className="space-y-3 mb-4 max-h-60 overflow-y-auto custom-scrollbar">
                                                        {deed.comments && deed.comments.length > 0 ? deed.comments.map((c: any) => (
                                                            <div key={c.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                                                <div className="flex justify-between items-center mb-1"><span className="text-xs font-black text-[#1B2B48]">{c.author} <span className="text-[10px] text-gray-400 font-normal">({c.role})</span></span><span className="text-[10px] text-gray-400" dir="ltr">{new Date(c.created_at).toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit'})}</span></div>
                                                                <p className="text-xs font-bold text-gray-700">{c.text}</p>
                                                            </div>
                                                        )) : <div className="text-center text-gray-400 text-xs py-2">لا توجد ملاحظات بعد</div>}
                                                    </div>
                                                    <div className="relative">
                                                        <input type="text" placeholder="اكتب ملاحظة..." className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-[#E95D22]" value={commentInputs[deed.id] || ''} onChange={(e) => setCommentInputs({ ...commentInputs, [deed.id]: e.target.value })} onKeyPress={(e) => e.key === 'Enter' && handleAddComment(deed.id)} />
                                                        <button onClick={() => handleAddComment(deed.id)} className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 bg-[#1B2B48] text-white rounded-lg hover:bg-[#E95D22]"><Send size={12} /></button>
                                                    </div>
                                                </div>
                                            </div></td></tr>
                                        )}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal - Updated with new Cities and Field */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#1B2B48]/60 backdrop-blur-sm no-print">
                    <div className="bg-white rounded-[30px] w-full max-w-6xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-gray-100 flex justify-between bg-white items-center shrink-0"><div className="flex items-center gap-3"><div className="p-2 bg-orange-50 text-[#E95D22] rounded-xl"><Plus size={20}/></div><div><h3 className="text-lg font-black text-[#1B2B48]">تسجيل إفراغ جديد</h3><p className="text-xs text-gray-400 font-bold">إدخال يدوي</p></div></div><button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-red-500 transition-colors bg-gray-50 p-2 rounded-full"><X size={20}/></button></div>
                        <div className="p-8 overflow-y-auto custom-scrollbar flex-1 bg-gray-50/30"><div className="space-y-8">
                            <div><SectionHeader title="بيانات المستفيد" icon={<UserIcon size={18} className="text-blue-500"/>} color="border-blue-500"/><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5"><Input label="اسم المستفيد" icon={<UserIcon size={16}/>} value={newDeedForm.clientName || ''} onChange={(e:any) => handleFormChange('clientName', e.target.value)} /><Input label="رقم الهوية" type="number" icon={<Hash size={16}/>} value={newDeedForm.idNumber || ''} onChange={(e:any) => handleFormChange('idNumber', e.target.value)} /><Input label="رقم الجوال" type="tel" icon={<Phone size={16}/>} value={newDeedForm.mobile || ''} onChange={(e:any) => handleFormChange('mobile', e.target.value)} /><Input label="تاريخ الميلاد (هجري)" icon={<Calendar size={16}/>} value={newDeedForm.dob || ''} onChange={(e:any) => handleFormChange('dob', e.target.value)} /></div></div>
                            <div><SectionHeader title="بيانات العقار" icon={<Building2 size={18} className="text-green-500"/>} color="border-green-500"/><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5"><Select label="المنطقة" options={CITIES_LIST} value={newDeedForm.region || ''} onChange={(e:any) => handleFormChange('region', e.target.value)} /><Select label="موقع العقار (المدينة)" options={CITIES_LIST} value={newDeedForm.city || ''} onChange={(e:any) => handleFormChange('city', e.target.value)} /><Select label="المشروع" options={PROJECTS_LIST} value={newDeedForm.projectName || ''} onChange={(e:any) => handleFormChange('projectName', e.target.value)} /><Input label="المخطط" value={newDeedForm.planNumber || ''} onChange={(e:any) => handleFormChange('planNumber', e.target.value)} /><Input label="القطعة" value={newDeedForm.plotNumber || ''} onChange={(e:any) => handleFormChange('plotNumber', e.target.value)} /><Input label="الوحدة" icon={<MapPin size={16}/>} value={newDeedForm.unitNumber || ''} onChange={(e:any) => handleFormChange('unitNumber', e.target.value)} /><Input label="القيمة" type="number" icon={<CreditCard size={16}/>} value={newDeedForm.unitValue || ''} onChange={(e:any) => handleFormChange('unitValue', e.target.value)} /></div></div>
                            <div><SectionHeader title="البيانات المالية" icon={<ShieldCheck size={18} className="text-purple-500"/>} color="border-purple-500"/><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5"><Input label="الصك الأساس" value={newDeedForm.oldDeedNumber || ''} onChange={(e:any) => handleFormChange('oldDeedNumber', e.target.value)} /><Input label="تاريخه" type="date" value={newDeedForm.oldDeedDate || ''} onChange={(e:any) => handleFormChange('oldDeedDate', e.target.value)} /><Input label="الصك الجديد" value={newDeedForm.newDeedNumber || ''} onChange={(e:any) => handleFormChange('newDeedNumber', e.target.value)} /><Input label="تاريخه" type="date" value={newDeedForm.newDeedDate || ''} onChange={(e:any) => handleFormChange('newDeedDate', e.target.value)} /><Input label="الرقم الضريبي" value={newDeedForm.taxNumber || ''} onChange={(e:any) => handleFormChange('taxNumber', e.target.value)} /><Select label="البنك" options={BANKS_LIST} value={newDeedForm.bank || ''} onChange={(e:any) => handleFormChange('bank', e.target.value)} /><Select label="العقد" options={['مرابحة', 'إجارة']} value={newDeedForm.contractType || ''} onChange={(e:any) => handleFormChange('contractType', e.target.value)} />
                            {/* الخانة الجديدة في المودال */}
                            <Input label="رقم عقد الدعم السكني" value={newDeedForm.sakaniSupportNumber || ''} onChange={(e:any) => handleFormChange('sakaniSupportNumber', e.target.value)} />
                            </div></div>
                        </div></div>
                        <div className="p-6 border-t border-gray-100 bg-white flex justify-end gap-3 shrink-0"><button onClick={() => setIsModalOpen(false)} className="px-8 py-3.5 border border-gray-200 rounded-xl font-bold text-gray-500 hover:bg-gray-50 text-sm">إلغاء</button><button onClick={handleSaveNewDeed} className="px-10 py-3.5 bg-[#E95D22] text-white rounded-xl font-bold hover:bg-orange-600 shadow-lg text-sm"><CheckCircle2 size={18}/> حفظ السجل</button></div>
                    </div>
                </div>
            )}
            <style>{`@media print { body * { visibility: hidden; } #printable-dashboard, #printable-dashboard * { visibility: visible; } #printable-dashboard { position: absolute; left: 0; top: 0; width: 100%; background: white; padding: 20px; margin: 0; } .no-print { display: none !important; } .shadow-sm, .shadow-lg { box-shadow: none !important; } .bg-gray-50 { background-color: white !important; border: 1px solid #eee; } }`}</style>
        </div>
    );
};

// UI Helpers
const DetailItem = ({ label, value, icon, highlight }: any) => (<div className={`flex flex-col gap-1 ${highlight ? 'p-2 bg-yellow-50/50 rounded-lg -m-2' : ''}`}><span className="text-[10px] font-bold text-gray-400 flex items-center gap-1">{icon} {label}</span><span className={`text-sm font-black ${highlight ? 'text-[#E95D22]' : 'text-[#1B2B48]'}`}>{value || '-'}</span></div>);
const SectionHeader = ({title, icon, color}: any) => (<div className={`flex items-center gap-2 border-r-4 ${color} pr-3 mb-4`}>{icon}<h4 className="text-sm font-black text-[#1B2B48] uppercase">{title}</h4></div>);
const KPICard = ({ title, value, icon, color, bg }: any) => (<div className={`${bg} p-6 rounded-[24px] border border-gray-50 shadow-sm flex items-center justify-between`}><div><p className="text-[11px] font-bold text-gray-400 mb-1">{title}</p><h3 className={`text-2xl font-black ${color}`}>{value}</h3></div><div className={`p-4 rounded-xl bg-white shadow-sm ${color}`}>{icon}</div></div>);
const Input = ({ label, placeholder, type = 'text', icon, value, onChange }: any) => (<div className="space-y-2"><label className="text-[10px] font-bold text-gray-400">{label}</label><div className="relative">{icon && <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">{icon}</div>}<input type={type} className={`w-full ${icon ? 'pr-10' : 'pr-4'} pl-4 py-3.5 bg-white border border-gray-200 rounded-xl outline-none focus:border-[#E95D22] text-sm font-bold transition-all`} placeholder={placeholder} value={value} onChange={onChange} /></div></div>);
const Select = ({ label, options, value, onChange }: any) => (<div className="space-y-2"><label className="text-[10px] font-bold text-gray-400">{label}</label><div className="relative"><select className="w-full pr-4 pl-10 py-3.5 bg-white border border-gray-200 rounded-xl outline-none focus:border-[#E95D22] text-sm font-bold appearance-none cursor-pointer" value={value} onChange={onChange}><option value="" disabled selected>اختر...</option>{options.map((o: string) => <option key={o} value={o}>{o}</option>)}</select><ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16}/></div></div>);

export default DeedsDashboard;