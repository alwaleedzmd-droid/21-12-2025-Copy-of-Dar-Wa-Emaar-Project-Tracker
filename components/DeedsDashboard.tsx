import React, { useState, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx'; 
import { 
  FileText, Plus, Search, CheckCircle, Clock, 
  AlertCircle, FileStack, ChevronDown, ChevronUp, 
  X, Printer, User as UserIcon, Building2,
  CheckCircle2, LayoutList, FileSpreadsheet,
  CreditCard, Calendar, Hash, Phone, MapPin, Filter,
  ShieldCheck, Edit2, Send, MessageSquare, Info, UploadCloud
} from 'lucide-react';

// --- Types ---
interface Comment {
    id: number;
    text: string;
    author: string;
    role: string;
    date: string;
}

// --- ثوابت القوائم ---
const BANKS_LIST = ['مصرف الراجحي', 'البنك الأهلي', 'بنك الرياض', 'مصرف الإنماء', 'بنك البلاد', 'البنك العربي', 'أخرى'];
const LOCATIONS_ORDER = ['المنطقة الوسطى', 'المنطقة الغربية', 'المنطقة الشرقية', 'المنطقة الشمالية', 'المنطقة الجنوبي'];
const PROJECTS_LIST = ['سرايا الجوان', 'سرايا البدر', 'حي الصحافة', 'الأرجس ريزيدنس', 'مشروع شمس الرياض'];

// بيانات تجريبية
const MOCK_DEEDS = [
  {
    id: 1, 
    clientName: "أحمد بن محمد القحطاني", 
    idNumber: "1098273645", 
    mobile: "0551234567",
    dob: "1405/01/01",
    projectName: "سرايا الجوان", 
    status: "منجز", 
    date: "2024/05/12",
    region: "المنطقة الوسطى",
    city: "الرياض",
    planNumber: "3045/أ",
    unitNumber: "A-101",
    unitValue: "850,000",
    unitType: "شقة",
    oldDeedNumber: "4102938475",
    oldDeedDate: "1444/05/10",
    newDeedNumber: "9102938400",
    newDeedDate: "1445/11/12",
    taxNumber: "300123456700003",
    bank: "مصرف الراجحي",
    contractType: "مرابحة",
    comments: [{ id: 1, text: "تم استلام الصك الأساسي", author: "نورة المالكي", role: "Conveyance", date: "10:30 AM" }]
  }
];

const DeedsDashboard: React.FC<{ currentUserRole?: string, currentUserName?: string }> = ({ currentUserRole, currentUserName }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
    const [deeds, setDeeds] = useState(MOCK_DEEDS);
    const [commentInputs, setCommentInputs] = useState<{[key: number]: string}>({});
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [newDeedForm, setNewDeedForm] = useState<any>({});

    const canEditStatus = ['PR_MANAGER', 'PR_OFFICER', 'ADMIN'].includes(currentUserRole || '');

    const filteredDeeds = useMemo(() => {
        return deeds.filter(d => 
            d.clientName?.includes(searchQuery) || 
            d.idNumber?.includes(searchQuery) ||
            d.projectName?.includes(searchQuery)
        );
    }, [deeds, searchQuery]);

    const stats = useMemo(() => ({
        total: deeds.length,
        completed: deeds.filter(d => d.status === 'منجز').length,
        processing: deeds.filter(d => d.status === 'قيد المعالجة').length,
        actionRequired: deeds.filter(d => d.status === 'مطلوب تعديل' || d.status === 'جديد' || d.status === 'مرفوض').length,
    }), [deeds]);

    // --- دالة الاستيراد المحسنة (تدعم اللغة العربية 100%) ---
    const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        
        // استخدام ArrayBuffer بدلاً من BinaryString لحل مشاكل الترميز العربي
        reader.readAsArrayBuffer(file);

        reader.onload = (evt) => {
            try {
                const data = new Uint8Array(evt.target?.result as ArrayBuffer);
                const wb = XLSX.read(data, { type: 'array' });
                const ws = wb.Sheets[wb.SheetNames[0]];
                const jsonData: any[] = XLSX.utils.sheet_to_json(ws); // قراءة تلقائية من الصف الأول

                if (jsonData.length === 0) {
                    alert("الملف فارغ!");
                    return;
                }

                // التحقق الذكي من العناوين (Fuzzy Matching)
                const firstRow = jsonData[0];
                const headers = Object.keys(firstRow);
                
                // دالة مساعدة للبحث عن العمود بغض النظر عن المسافات الزائدة
                const findCol = (possibleNames: string[]) => {
                    return headers.find(h => possibleNames.includes(h.trim()));
                };

                const nameKey = findCol(['اسم المستفيد', 'اسم العميل', 'الاسم', 'Client Name']);
                const idKey = findCol(['رقم الهوية', 'الهوية', 'ID']);

                if (!nameKey || !idKey) {
                    alert(`فشل الاستيراد.\nلم يتم العثور على عمود "اسم المستفيد" أو "رقم الهوية".\nالأعمدة الموجودة في ملفك هي:\n[ ${headers.join(' , ')} ]`);
                    return;
                }

                const importedDeeds = jsonData.map((row: any, index: number) => ({
                    id: Date.now() + index,
                    status: 'جديد',
                    date: new Date().toLocaleDateString('en-CA'),
                    
                    // استخدام المفاتيح التي تم العثور عليها
                    clientName: row[nameKey!] || '',
                    idNumber: String(row[idKey!] || ''),
                    
                    // باقي الحقول (محاولة المطابقة)
                    mobile: String(row[findCol(['رقم الجوال', 'الجوال']) || ''] || ''),
                    dob: row[findCol(['تاريخ الميلاد (هجري)', 'تاريخ الميلاد']) || ''] || '',
                    region: row[findCol(['المنطقة']) || ''] || '',
                    city: row[findCol(['مدينة العقار', 'المدينة']) || ''] || '',
                    projectName: row[findCol(['اسم المشروع', 'المشروع']) || ''] || '',
                    planNumber: row[findCol(['رقم المخطط', 'المخطط']) || ''] || '',
                    plotNumber: row[findCol(['رقم القطعة', 'القطعة']) || ''] || '',
                    unitNumber: row[findCol(['رقم الوحدة', 'الوحدة']) || ''] || '',
                    unitValue: row[findCol(['قيمة الوحدة', 'القيمة']) || ''] || '',
                    
                    oldDeedNumber: row[findCol(['رقم الصك (الأساس)', 'رقم الصك']) || ''] || '',
                    oldDeedDate: row[findCol(['تاريخ الصك (الأساس)', 'تاريخ الصك']) || ''] || '',
                    newDeedNumber: row[findCol(['رقم الصك الجديد']) || ''] || '',
                    newDeedDate: row[findCol(['تاريخ الصك الجديد']) || ''] || '',
                    
                    taxNumber: row[findCol(['الرقم الضريبي', 'الضريبة']) || ''] || '',
                    bank: row[findCol(['الجهة التمويلية', 'البنك']) || ''] || '',
                    contractType: row[findCol(['نوع العقد', 'العقد']) || ''] || '',

                    units: [{ 
                        id: `u-${Date.now()}-${index}`, 
                        number: row[findCol(['رقم الوحدة', 'الوحدة']) || ''] || '-', 
                        type: 'وحدة', 
                        status: 'متاح', 
                        price: row[findCol(['قيمة الوحدة', 'القيمة']) || ''] || '0' 
                    }],
                    comments: []
                }));

                setDeeds([...importedDeeds, ...deeds]);
                alert(`تم بنجاح استيراد ${importedDeeds.length} سجل ✅`);

            } catch (error) {
                console.error(error);
                alert("حدث خطأ غير متوقع أثناء قراءة الملف.");
            }
            if (fileInputRef.current) fileInputRef.current.value = '';
        };
    };

    const handleFormChange = (key: string, value: string) => {
        setNewDeedForm({ ...newDeedForm, [key]: value });
    };

    const handleSaveNewDeed = () => {
        if (!newDeedForm.clientName || !newDeedForm.idNumber) {
            alert("يرجى إدخال اسم العميل ورقم الهوية على الأقل");
            return;
        }
        const newDeed = {
            id: Date.now(),
            ...newDeedForm,
            status: 'جديد',
            date: new Date().toLocaleDateString('en-CA'),
            units: [{ id: `u-${Date.now()}`, number: newDeedForm.unitNumber || '-', type: 'وحدة', status: 'متاح', price: newDeedForm.unitValue || '0' }],
            comments: []
        };
        setDeeds([newDeed, ...deeds]);
        setIsModalOpen(false);
        setNewDeedForm({});
        alert("تم إضافة الطلب بنجاح");
    };

    const handleAddComment = (deedId: number) => {
        const text = commentInputs[deedId];
        if (!text || text.trim() === "") return;
        const newComment: Comment = {
            id: Date.now(),
            text: text,
            author: currentUserName || 'المستخدم الحالي', 
            role: currentUserRole || 'Employee',
            date: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        };
        const updatedDeeds = deeds.map(d => {
            if (d.id === deedId) return { ...d, comments: [...(d.comments || []), newComment] };
            return d;
        });
        setDeeds(updatedDeeds);
        setCommentInputs({ ...commentInputs, [deedId]: '' });
    };

    const handleStatusChange = (id: number, newStatus: string) => {
        const updatedDeeds = deeds.map(deed => deed.id === id ? { ...deed, status: newStatus } : deed);
        setDeeds(updatedDeeds);
    };

    const handleExportExcel = () => {
        const dataToExport = filteredDeeds.map(d => ({
            "العميل": d.clientName, "الهوية": d.idNumber, "المشروع": d.projectName, "رقم الوحدة": d.unitNumber,
            "القيمة": d.unitValue, "الحالة": d.status, "تاريخ الطلب": d.date
        }));
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(dataToExport);
        XLSX.utils.book_append_sheet(wb, ws, "تقرير الإفراغات");
        XLSX.writeFile(wb, "Deeds_Report.xlsx");
    };

    const handlePrintPDF = () => window.print();

    const toggleRow = (id: number) => {
        const newExpanded = new Set(expandedRows);
        if (newExpanded.has(id)) newExpanded.delete(id); else newExpanded.add(id);
        setExpandedRows(newExpanded);
    };

    const getStatusColor = (status: string) => {
        if (status === 'منجز') return 'bg-green-50 text-green-600 border-green-100';
        if (status === 'قيد المعالجة') return 'bg-blue-50 text-blue-600 border-blue-100';
        if (status === 'مطلوب تعديل' || status === 'مرفوض') return 'bg-red-50 text-red-600 border-red-100';
        return 'bg-gray-50 text-gray-600 border-gray-200';
    };

    return (
        <div id="printable-dashboard" className="space-y-8 animate-in fade-in duration-500 font-cairo text-right" dir="rtl">
             
             {/* Print Header */}
             <div className="hidden print:flex flex-col items-center justify-center mb-8 border-b-2 border-gray-100 pb-6">
                <h1 className="text-3xl font-black text-[#1B2B48] mb-2">تقرير سجل الإفراغات</h1>
                <div className="flex gap-4 text-sm text-gray-500">
                    <span>تاريخ التقرير: {new Date().toLocaleDateString('ar-SA')}</span>
                    <span>|</span>
                    <span>عدد السجلات: {filteredDeeds.length}</span>
                </div>
             </div>

             {/* Header UI */}
             <div className="flex flex-col md:flex-row justify-between items-center gap-4 no-print">
                <div>
                    <h2 className="text-2xl font-black text-[#1B2B48]">سجل الإفراغات</h2>
                    <p className="text-gray-400 text-xs font-bold mt-1">نظام إدارة الصكوك والعقود</p>
                </div>
                <div className="flex items-center gap-3">
                    {/* زر استيراد Excel */}
                    <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls, .csv" onChange={handleImportExcel} />
                    
                    <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 font-bold text-xs transition-all shadow-sm">
                        <UploadCloud size={18} /> استيراد (Excel)
                    </button>

                    <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-6 py-3 bg-[#E95D22] text-white rounded-xl font-bold text-sm hover:brightness-110 shadow-lg shadow-orange-100 transition-all">
                        <Plus size={18} /> تسجيل إفراغ جديد
                    </button>
                    <button onClick={handlePrintPDF} className="flex items-center gap-2 px-4 py-3 bg-white border border-blue-100 text-blue-600 rounded-xl hover:bg-blue-50 font-bold text-xs transition-all">
                        <Printer size={18} /> PDF
                    </button>
                    <button onClick={handleExportExcel} className="flex items-center gap-2 px-4 py-3 bg-white border border-green-100 text-green-600 rounded-xl hover:bg-green-50 font-bold text-xs transition-all">
                        <FileSpreadsheet size={18} /> Excel
                    </button>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard title="إجمالي الطلبات" value={stats.total} icon={<FileStack size={24}/>} color="text-[#1B2B48]" bg="bg-white" />
                <KPICard title="تم الإفراغ" value={stats.completed} icon={<CheckCircle size={24}/>} color="text-green-600" bg="bg-green-50" />
                <KPICard title="قيد المعالجة" value={stats.processing} icon={<Clock size={24}/>} color="text-blue-600" bg="bg-blue-50" />
                <KPICard title="تنبيهات / مرفوض" value={stats.actionRequired} icon={<AlertCircle size={24}/>} color="text-red-600" bg="bg-red-50" />
            </div>

            {/* Table */}
            <div className="bg-white rounded-[30px] border border-gray-100 shadow-sm overflow-hidden print:border-none print:shadow-none">
                <div className="flex justify-between items-center p-6 border-b border-gray-100 no-print">
                    <div className="relative w-full max-w-md">
                        <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input type="text" placeholder="بحث..." className="w-full pr-12 pl-4 py-3 bg-gray-50 rounded-xl border-none outline-none font-bold text-sm" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50/50 border-b border-gray-100 print:bg-gray-100">
                            <tr className="text-right text-gray-400 text-xs font-black">
                                <th className="p-6">العميل</th>
                                <th className="p-6">الهوية</th>
                                <th className="p-6">المشروع</th>
                                <th className="p-6">الحالة</th>
                                <th className="p-6 w-10 no-print"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredDeeds.map((deed) => (
                                <React.Fragment key={deed.id}>
                                    <tr className={`hover:bg-gray-50 cursor-pointer transition-colors ${expandedRows.has(deed.id) ? 'bg-blue-50/10' : ''}`}>
                                        <td className="p-6 font-bold text-[#1B2B48] flex items-center gap-3" onClick={() => toggleRow(deed.id)}>
                                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 no-print"><UserIcon size={14}/></div>
                                            {deed.clientName}
                                        </td>
                                        <td className="p-6 text-sm font-mono font-bold text-gray-500" onClick={() => toggleRow(deed.id)}>{deed.idNumber}</td>
                                        <td className="p-6 text-sm font-bold text-[#1B2B48]" onClick={() => toggleRow(deed.id)}>{deed.projectName}</td>
                                        
                                        <td className="p-6">
                                            {canEditStatus ? (
                                                <div className="relative group/edit">
                                                    <select value={deed.status} onChange={(e) => handleStatusChange(deed.id, e.target.value)} className={`appearance-none cursor-pointer pl-8 pr-4 py-2 rounded-xl text-[11px] font-black border outline-none transition-all w-36 ${getStatusColor(deed.status)}`}>
                                                        <option value="جديد">جديد</option>
                                                        <option value="قيد المعالجة">قيد المعالجة</option>
                                                        <option value="منجز">منجز</option>
                                                        <option value="مطلوب تعديل">مطلوب تعديل</option>
                                                        <option value="مرفوض">مرفوض</option>
                                                    </select>
                                                    <Edit2 size={12} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50 pointer-events-none group-hover/edit:opacity-100 transition-opacity"/>
                                                </div>
                                            ) : (
                                                <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black border ${getStatusColor(deed.status)}`}>{deed.status}</span>
                                            )}
                                        </td>

                                        <td className="p-6 text-gray-400 no-print text-center" onClick={() => toggleRow(deed.id)}>
                                            {expandedRows.has(deed.id) ? <ChevronUp size={18}/> : <ChevronDown size={18}/>}
                                        </td>
                                    </tr>
                                    
                                    {/* Expanded Details View */}
                                    {expandedRows.has(deed.id) && (
                                        <tr className="bg-gray-50/30 animate-in fade-in">
                                            <td colSpan={6} className="p-6">
                                                <div className="flex flex-col gap-6">
                                                    <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm">
                                                        <div className="flex items-center gap-2 mb-6 pb-4 border-b border-gray-50">
                                                            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Info size={18}/></div>
                                                            <h4 className="text-sm font-black text-[#1B2B48]">تفاصيل الطلب (18 خانة)</h4>
                                                        </div>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-6 gap-x-12">
                                                            <DetailItem label="اسم المستفيد" value={deed.clientName} icon={<UserIcon size={14}/>} />
                                                            <DetailItem label="رقم الهوية" value={deed.idNumber} icon={<Hash size={14}/>} />
                                                            <DetailItem label="رقم الجوال" value={deed.mobile} icon={<Phone size={14}/>} />
                                                            <DetailItem label="تاريخ الميلاد" value={deed.dob} icon={<Calendar size={14}/>} />
                                                            <DetailItem label="المنطقة" value={deed.region} />
                                                            <DetailItem label="المدينة" value={deed.city} />
                                                            <DetailItem label="المشروع" value={deed.projectName} />
                                                            <DetailItem label="رقم المخطط" value={deed.planNumber} />
                                                            <DetailItem label="رقم القطعة" value={deed.plotNumber} />
                                                            <DetailItem label="رقم الوحدة" value={deed.unitNumber} icon={<MapPin size={14}/>} />
                                                            <DetailItem label="قيمة الوحدة" value={`${deed.unitValue} ر.س`} icon={<CreditCard size={14}/>} />
                                                            <DetailItem label="رقم الصك (القديم)" value={deed.oldDeedNumber} />
                                                            <DetailItem label="تاريخ الصك (القديم)" value={deed.oldDeedDate} />
                                                            <DetailItem label="رقم الصك (الجديد)" value={deed.newDeedNumber} highlight />
                                                            <DetailItem label="تاريخ الصك (الجديد)" value={deed.newDeedDate} highlight />
                                                            <DetailItem label="الرقم الضريبي" value={deed.taxNumber} />
                                                            <DetailItem label="الجهة التمويلية" value={deed.bank} />
                                                            <DetailItem label="نوع العقد" value={deed.contractType} />
                                                        </div>
                                                    </div>
                                                    <div className="bg-white rounded-3xl border border-gray-100 p-6 no-print">
                                                        <h4 className="text-xs font-black text-[#1B2B48] mb-4 flex items-center gap-2"><MessageSquare size={16}/> الملاحظات والردود</h4>
                                                        <div className="space-y-3 mb-4 max-h-60 overflow-y-auto custom-scrollbar">
                                                            {deed.comments && deed.comments.length > 0 ? (
                                                                deed.comments.map((comment) => (
                                                                    <div key={comment.id} className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                                                        <div className="flex justify-between items-center mb-1">
                                                                            <span className="text-xs font-black text-[#1B2B48]">{comment.author}</span>
                                                                            <span className="text-[10px] text-gray-400" dir="ltr">{comment.date}</span>
                                                                        </div>
                                                                        <p className="text-xs font-bold text-gray-600">{comment.text}</p>
                                                                    </div>
                                                                ))
                                                            ) : <div className="text-center text-gray-300 text-xs font-bold py-4">لا توجد ملاحظات</div>}
                                                        </div>
                                                        <div className="relative">
                                                            <input type="text" placeholder="اكتب ملاحظة..." className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-[#E95D22]" value={commentInputs[deed.id] || ''} onChange={(e) => setCommentInputs({ ...commentInputs, [deed.id]: e.target.value })} onKeyPress={(e) => e.key === 'Enter' && handleAddComment(deed.id)} />
                                                            <button onClick={() => handleAddComment(deed.id)} className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 bg-[#1B2B48] text-white rounded-lg hover:bg-[#E95D22]"><Send size={12} /></button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* --- Modal (Manual Entry) --- */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#1B2B48]/60 backdrop-blur-sm no-print">
                    <div className="bg-white rounded-[30px] w-full max-w-6xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-gray-100 flex justify-between bg-white items-center shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-orange-50 text-[#E95D22] rounded-xl"><Plus size={20}/></div>
                                <div><h3 className="text-lg font-black text-[#1B2B48]">تسجيل إفراغ جديد</h3><p className="text-xs text-gray-400 font-bold">إدخال يدوي لبيانات العميل</p></div>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-red-500 transition-colors bg-gray-50 p-2 rounded-full"><X size={20}/></button>
                        </div>
                        <div className="p-8 overflow-y-auto custom-scrollbar flex-1 bg-gray-50/30">
                            <div className="space-y-8">
                                <div><SectionHeader title="بيانات المستفيد" icon={<UserIcon size={18} className="text-blue-500"/>} color="border-blue-500"/>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                                        <Input label="اسم المستفيد" icon={<UserIcon size={16}/>} value={newDeedForm.clientName || ''} onChange={(e:any) => handleFormChange('clientName', e.target.value)} />
                                        <Input label="رقم الهوية" type="number" icon={<Hash size={16}/>} value={newDeedForm.idNumber || ''} onChange={(e:any) => handleFormChange('idNumber', e.target.value)} />
                                        <Input label="رقم الجوال" type="tel" icon={<Phone size={16}/>} value={newDeedForm.mobile || ''} onChange={(e:any) => handleFormChange('mobile', e.target.value)} />
                                        <Input label="تاريخ الميلاد (هجري)" icon={<Calendar size={16}/>} value={newDeedForm.dob || ''} onChange={(e:any) => handleFormChange('dob', e.target.value)} />
                                    </div>
                                </div>
                                <div><SectionHeader title="بيانات العقار والوحدة" icon={<Building2 size={18} className="text-green-500"/>} color="border-green-500"/>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                                        <Select label="المنطقة" options={LOCATIONS_ORDER} value={newDeedForm.region || ''} onChange={(e:any) => handleFormChange('region', e.target.value)} />
                                        <Select label="مدينة العقار" options={['الرياض', 'جدة']} value={newDeedForm.city || ''} onChange={(e:any) => handleFormChange('city', e.target.value)} />
                                        <Select label="اسم المشروع" options={PROJECTS_LIST} value={newDeedForm.projectName || ''} onChange={(e:any) => handleFormChange('projectName', e.target.value)} />
                                        <Input label="رقم المخطط" value={newDeedForm.planNumber || ''} onChange={(e:any) => handleFormChange('planNumber', e.target.value)} />
                                        <Input label="رقم القطعة" value={newDeedForm.plotNumber || ''} onChange={(e:any) => handleFormChange('plotNumber', e.target.value)} />
                                        <Input label="رقم الوحدة" icon={<MapPin size={16}/>} value={newDeedForm.unitNumber || ''} onChange={(e:any) => handleFormChange('unitNumber', e.target.value)} />
                                        <Input label="قيمة الوحدة" type="number" icon={<CreditCard size={16}/>} value={newDeedForm.unitValue || ''} onChange={(e:any) => handleFormChange('unitValue', e.target.value)} />
                                    </div>
                                </div>
                                <div><SectionHeader title="البيانات المالية والصكوك" icon={<ShieldCheck size={18} className="text-purple-500"/>} color="border-purple-500"/>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                                        <Input label="رقم الصك (الأساس)" value={newDeedForm.oldDeedNumber || ''} onChange={(e:any) => handleFormChange('oldDeedNumber', e.target.value)} />
                                        <Input label="تاريخ الصك (الأساس)" type="date" value={newDeedForm.oldDeedDate || ''} onChange={(e:any) => handleFormChange('oldDeedDate', e.target.value)} />
                                        <Input label="رقم الصك الجديد" value={newDeedForm.newDeedNumber || ''} onChange={(e:any) => handleFormChange('newDeedNumber', e.target.value)} />
                                        <Input label="تاريخ الصك الجديد" type="date" value={newDeedForm.newDeedDate || ''} onChange={(e:any) => handleFormChange('newDeedDate', e.target.value)} />
                                        <Input label="الرقم الضريبي" value={newDeedForm.taxNumber || ''} onChange={(e:any) => handleFormChange('taxNumber', e.target.value)} />
                                        <Select label="الجهة التمويلية" options={BANKS_LIST} value={newDeedForm.bank || ''} onChange={(e:any) => handleFormChange('bank', e.target.value)} />
                                        <Select label="نوع العقد" options={['مرابحة', 'إجارة', 'نقد (كاش)']} value={newDeedForm.contractType || ''} onChange={(e:any) => handleFormChange('contractType', e.target.value)} />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-100 bg-white flex justify-end gap-3 shrink-0"><button onClick={() => setIsModalOpen(false)} className="px-8 py-3.5 border border-gray-200 rounded-xl font-bold text-gray-500 hover:bg-gray-50 text-sm">إلغاء</button><button onClick={handleSaveNewDeed} className="px-10 py-3.5 bg-[#E95D22] text-white rounded-xl font-bold hover:bg-orange-600 shadow-lg text-sm"><CheckCircle2 size={18}/> حفظ السجل</button></div>
                    </div>
                </div>
            )}

            <style>{`
                @media print {
                    body * { visibility: hidden; }
                    #printable-dashboard, #printable-dashboard * { visibility: visible; }
                    #printable-dashboard { position: absolute; left: 0; top: 0; width: 100%; background: white; padding: 20px; margin: 0; }
                    .no-print { display: none !important; }
                    .shadow-sm, .shadow-lg { box-shadow: none !important; }
                    .bg-gray-50 { background-color: white !important; border: 1px solid #eee; }
                }
            `}</style>
        </div>
    );
};

// --- Helper Components ---
const DetailItem = ({ label, value, icon, highlight }: any) => (
    <div className={`flex flex-col gap-1 ${highlight ? 'p-2 bg-yellow-50/50 rounded-lg -m-2' : ''}`}>
        <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1">{icon} {label}</span>
        <span className={`text-sm font-black ${highlight ? 'text-[#E95D22]' : 'text-[#1B2B48]'}`}>{value || '-'}</span>
    </div>
);

const SectionHeader = ({title, icon, color}: any) => (<div className={`flex items-center gap-2 border-r-4 ${color} pr-3 mb-4`}>{icon}<h4 className="text-sm font-black text-[#1B2B48] uppercase">{title}</h4></div>);
const KPICard = ({ title, value, icon, color, bg }: any) => (<div className={`${bg} p-6 rounded-[24px] border border-gray-50 shadow-sm flex items-center justify-between`}><div><p className="text-[11px] font-bold text-gray-400 mb-1">{title}</p><h3 className={`text-2xl font-black ${color}`}>{value}</h3></div><div className={`p-4 rounded-xl bg-white shadow-sm ${color}`}>{icon}</div></div>);
const Input = ({ label, placeholder, type = 'text', icon, value, onChange }: any) => (<div className="space-y-2"><label className="text-[10px] font-bold text-gray-400">{label}</label><div className="relative">{icon && <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">{icon}</div>}<input type={type} className={`w-full ${icon ? 'pr-10' : 'pr-4'} pl-4 py-3.5 bg-white border border-gray-200 rounded-xl outline-none focus:border-[#E95D22] text-sm font-bold transition-all`} placeholder={placeholder} value={value} onChange={onChange} /></div></div>);
const Select = ({ label, options, value, onChange }: any) => (<div className="space-y-2"><label className="text-[10px] font-bold text-gray-400">{label}</label><div className="relative"><select className="w-full pr-4 pl-10 py-3.5 bg-white border border-gray-200 rounded-xl outline-none focus:border-[#E95D22] text-sm font-bold appearance-none cursor-pointer" value={value} onChange={onChange}><option value="" disabled selected>اختر...</option>{options.map((o: string) => <option key={o} value={o}>{o}</option>)}</select><ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16}/></div></div>);

export default DeedsDashboard;