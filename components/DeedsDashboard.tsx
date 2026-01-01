import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx'; 
import { 
  FileText, Plus, Search, CheckCircle, Clock, 
  AlertCircle, FileStack, ChevronDown, ChevronUp, 
  X, Printer, User as UserIcon, Building2,
  CheckCircle2, LayoutList, FileSpreadsheet,
  CreditCard, Calendar, Hash, Phone, MapPin, Filter,
  ShieldCheck
} from 'lucide-react';

// --- ثوابت القوائم ---
const BANKS_LIST = ['مصرف الراجحي', 'البنك الأهلي', 'بنك الرياض', 'مصرف الإنماء', 'بنك البلاد', 'البنك العربي', 'أخرى'];
const LOCATIONS_ORDER = ['المنطقة الوسطى', 'المنطقة الغربية', 'المنطقة الشرقية', 'المنطقة الشمالية', 'المنطقة الجنوبي'];
const PROJECTS_LIST = ['سرايا الجوان', 'سرايا البدر', 'حي الصحافة', 'الأرجس ريزيدنس', 'مشروع شمس الرياض'];

// بيانات تجريبية
const MOCK_DEEDS = [
  {
    id: 1, clientName: "أحمد بن محمد القحطاني", idNumber: "1098273645", projectName: "سرايا الجوان", status: "منجز", date: "2024/05/12",
    units: [{ id: 'u1', number: 'A-101', type: 'شقة', status: 'مباع', price: '850,000' }]
  },
  {
    id: 2, clientName: "شركة الرؤية العقارية", idNumber: "7001928374", projectName: "سرايا البدر", status: "قيد المعالجة", date: "2024/05/14",
    units: [
        { id: 'u3', number: 'V-09', type: 'فيلا', status: 'محجوز', price: '1,200,000' },
        { id: 'u4', number: 'V-10', type: 'فيلا', status: 'محجوز', price: '1,200,000' }
    ]
  },
  {
    id: 3, clientName: "عبدالله العتيبي", idNumber: "1055555555", projectName: "حي الصحافة", status: "جديد", date: "2024/05/16",
    units: [{ id: 'u6', number: 'B-20', type: 'شقة', status: 'متاح', price: '650,000' }]
  }
];

const DeedsDashboard: React.FC<{ currentUserRole?: string }> = ({ currentUserRole }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
    const [deeds] = useState(MOCK_DEEDS);

    // فلترة البيانات
    const filteredDeeds = useMemo(() => {
        return deeds.filter(d => 
            d.clientName.includes(searchQuery) || 
            d.idNumber.includes(searchQuery) ||
            d.projectName.includes(searchQuery)
        );
    }, [deeds, searchQuery]);

    const stats = useMemo(() => ({
        total: deeds.length,
        completed: deeds.filter(d => d.status === 'منجز').length,
        processing: deeds.filter(d => d.status === 'قيد المعالجة').length,
        actionRequired: deeds.filter(d => d.status === 'مطلوب تعديل' || d.status === 'جديد').length,
    }), [deeds]);

    // تصدير Excel
    const handleExportExcel = () => {
        const dataToExport = filteredDeeds.flatMap(d => 
            d.units.map(u => ({
                "العميل": d.clientName,
                "رقم الهوية": d.idNumber,
                "المشروع": d.projectName,
                "رقم الوحدة": u.number,
                "النوع": u.type,
                "السعر": u.price,
                "الحالة": d.status,
                "التاريخ": d.date
            }))
        );
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(dataToExport);
        ws['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 12 }];
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
        return 'bg-orange-50 text-orange-600 border-orange-100';
    };

    return (
        // Added ID here to target specific print area
        <div id="printable-dashboard" className="space-y-8 animate-in fade-in duration-500 font-cairo text-right" dir="rtl">
             
             {/* --- Print Only Header (يظهر فقط في الـ PDF) --- */}
             <div className="hidden print:flex flex-col items-center justify-center mb-8 border-b-2 border-gray-100 pb-6">
                <h1 className="text-3xl font-black text-[#1B2B48] mb-2">تقرير سجل الإفراغات</h1>
                <div className="flex gap-4 text-sm text-gray-500">
                    <span>تاريخ التقرير: {new Date().toLocaleDateString('ar-SA')}</span>
                    <span>|</span>
                    <span>عدد السجلات: {filteredDeeds.length}</span>
                </div>
             </div>

             {/* Header Section (Hidden in Print) */}
             <div className="flex flex-col md:flex-row justify-between items-center gap-4 no-print">
                <div>
                    <h2 className="text-2xl font-black text-[#1B2B48]">سجل الإفراغات</h2>
                    <p className="text-gray-400 text-xs font-bold mt-1">نظام إدارة الصكوك والعقود</p>
                </div>
                <div className="flex items-center gap-3">
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

            {/* KPIs (Visible in Print but simplified) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard title="إجمالي الطلبات" value={stats.total} icon={<FileStack size={24}/>} color="text-[#1B2B48]" bg="bg-white" />
                <KPICard title="تم الإفراغ" value={stats.completed} icon={<CheckCircle size={24}/>} color="text-green-600" bg="bg-green-50" />
                <KPICard title="قيد المعالجة" value={stats.processing} icon={<Clock size={24}/>} color="text-blue-600" bg="bg-blue-50" />
                <KPICard title="تنبيهات" value={stats.actionRequired} icon={<AlertCircle size={24}/>} color="text-red-600" bg="bg-red-50" />
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
                                    <tr className={`hover:bg-gray-50 cursor-pointer transition-colors ${expandedRows.has(deed.id) ? 'bg-blue-50/10' : ''}`} onClick={() => toggleRow(deed.id)}>
                                        <td className="p-6 font-bold text-[#1B2B48] flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 no-print"><UserIcon size={14}/></div>
                                            {deed.clientName}
                                        </td>
                                        <td className="p-6 text-sm font-mono font-bold text-gray-500">{deed.idNumber}</td>
                                        <td className="p-6 text-sm font-bold text-[#1B2B48]">{deed.projectName}</td>
                                        <td className="p-6"><span className={`px-3 py-1 rounded-lg text-[10px] font-black border ${getStatusColor(deed.status)}`}>{deed.status}</span></td>
                                        <td className="p-6 text-gray-400 no-print">{expandedRows.has(deed.id) ? <ChevronUp size={18}/> : <ChevronDown size={18}/>}</td>
                                    </tr>
                                    {/* Accordion Content - Always expanded in print if needed, currently conditional */}
                                    {expandedRows.has(deed.id) && (
                                        <tr className="bg-gray-50/30 animate-in fade-in">
                                            <td colSpan={6} className="p-6">
                                                <div className="bg-white rounded-2xl border border-gray-100 p-6 print:border-black">
                                                    <h4 className="text-xs font-black text-[#1B2B48] mb-4 flex items-center gap-2"><Building2 size={16}/> الوحدات المرتبطة</h4>
                                                    {deed.units.map(unit => (
                                                        <div key={unit.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-xl border border-gray-100 mb-2 print:bg-white print:border-b print:rounded-none">
                                                            <span className="font-bold text-sm text-[#1B2B48]">وحدة {unit.number} <span className="text-gray-400 text-xs">({unit.type})</span></span>
                                                            <span className="font-mono font-bold text-[#1B2B48]">{unit.price} ر.س</span>
                                                        </div>
                                                    ))}
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

            {/* --- نافذة تسجيل إفراغ جديد (18 حقل) --- */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#1B2B48]/60 backdrop-blur-sm no-print">
                    <div className="bg-white rounded-[30px] w-full max-w-6xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-gray-100 flex justify-between bg-white items-center shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-orange-50 text-[#E95D22] rounded-xl"><Plus size={20}/></div>
                                <div>
                                    <h3 className="text-lg font-black text-[#1B2B48]">تسجيل إفراغ جديد</h3>
                                    <p className="text-xs text-gray-400 font-bold">نموذج بيانات الإفراغ الشامل (18 خانة)</p>
                                </div>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-red-500 transition-colors bg-gray-50 p-2 rounded-full"><X size={20}/></button>
                        </div>
                        
                        <div className="p-8 overflow-y-auto custom-scrollbar flex-1 bg-gray-50/30">
                            <div className="space-y-8">
                                {/* القسم 1: بيانات المستفيد */}
                                <div>
                                    <SectionHeader title="بيانات المستفيد" icon={<UserIcon size={18} className="text-blue-500"/>} color="border-blue-500"/>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                                        <Input label="اسم المستفيد" placeholder="الاسم الرباعي" icon={<UserIcon size={16}/>} />
                                        <Input label="رقم الهوية" placeholder="10xxxxxxxx" type="number" icon={<Hash size={16}/>} />
                                        <Input label="رقم الجوال" placeholder="05xxxxxxxx" type="tel" icon={<Phone size={16}/>} />
                                        <Input label="تاريخ الميلاد (هجري)" placeholder="YYYY/MM/DD" icon={<Calendar size={16}/>} />
                                    </div>
                                </div>

                                {/* القسم 2: بيانات العقار */}
                                <div>
                                    <SectionHeader title="بيانات العقار والوحدة" icon={<Building2 size={18} className="text-green-500"/>} color="border-green-500"/>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                                        <Select label="المنطقة" options={LOCATIONS_ORDER} />
                                        <Select label="مدينة العقار" options={['الرياض', 'جدة', 'الدمام', 'مكة المكرمة']} />
                                        <Select label="اسم المشروع" options={PROJECTS_LIST} />
                                        <Input label="رقم المخطط" placeholder="مثال: 3045/أ" />
                                        <Input label="رقم القطعة" placeholder="مثال: 543" /> 
                                        <Input label="رقم الوحدة" placeholder="مثال: A-101" icon={<MapPin size={16}/>} />
                                        <Input label="قيمة الوحدة" placeholder="0.00" type="number" icon={<CreditCard size={16}/>} suffix="ر.س" />
                                    </div>
                                </div>

                                {/* القسم 3: البيانات المالية والصك */}
                                <div>
                                    <SectionHeader title="البيانات المالية والصكوك" icon={<ShieldCheck size={18} className="text-purple-500"/>} color="border-purple-500"/>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                                        <Input label="رقم الصك (الأساس)" placeholder="XXXXXXXXXXXX" />
                                        <Input label="تاريخ الصك (الأساس)" type="date" />
                                        
                                        <Input label="رقم الصك الجديد" placeholder="XXXXXXXXXXXX" />
                                        <Input label="تاريخ الصك الجديد" type="date" />

                                        <Input label="الرقم الضريبي" placeholder="3XXXXXXXXXXXXX" type="number" />
                                        <Select label="الجهة التمويلية" options={BANKS_LIST} />
                                        <Select label="نوع العقد التمويلي" options={['مرابحة', 'إجارة', 'تمويل عقاري مدعوم', 'نقد (كاش)']} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-gray-100 bg-white flex justify-end gap-3 shrink-0">
                            <button onClick={() => setIsModalOpen(false)} className="px-8 py-3.5 border border-gray-200 rounded-xl font-bold text-gray-500 hover:bg-gray-50 transition-all text-sm">إلغاء العملية</button>
                            <button onClick={() => { alert("تم الحفظ بنجاح"); setIsModalOpen(false); }} className="px-10 py-3.5 bg-[#E95D22] text-white rounded-xl font-bold hover:bg-orange-600 shadow-lg shadow-orange-100 transition-all flex items-center gap-2 text-sm">
                                <CheckCircle2 size={18}/> حفظ السجل
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Smart Print Logic: Hides everything on body and only shows this component cleanly */}
            <style>{`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    #printable-dashboard, #printable-dashboard * {
                        visibility: visible;
                    }
                    #printable-dashboard {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        background: white;
                        padding: 20px;
                        margin: 0;
                    }
                    .no-print { 
                        display: none !important; 
                    }
                    .shadow-sm, .shadow-lg, .shadow-2xl {
                        box-shadow: none !important;
                    }
                    /* Ensure table fits */
                    table { width: 100%; }
                    
                    /* Reset background colors for print to save ink/clean look */
                    .bg-gray-50, .bg-blue-50, .bg-green-50, .bg-red-50 {
                        background-color: white !important;
                        border: 1px solid #eee;
                    }
                }
            `}</style>
        </div>
    );
};

// --- Helper Components ---
const SectionHeader = ({title, icon, color}: any) => (
    <div className={`flex items-center gap-2 border-r-4 ${color} pr-3 mb-4`}>
        {icon}
        <h4 className="text-sm font-black text-[#1B2B48] uppercase">{title}</h4>
    </div>
);

const KPICard = ({ title, value, icon, color, bg }: any) => (
    <div className={`${bg} p-6 rounded-[24px] border border-gray-50 shadow-sm flex items-center justify-between`}>
        <div><p className="text-[11px] font-bold text-gray-400 mb-1">{title}</p><h3 className={`text-2xl font-black ${color}`}>{value}</h3></div>
        <div className={`p-4 rounded-xl bg-white shadow-sm ${color}`}>{icon}</div>
    </div>
);

const Input = ({ label, placeholder, type = 'text', icon, suffix }: any) => (
    <div className="space-y-2">
        <label className="text-[10px] font-bold text-gray-400">{label}</label>
        <div className="relative">
            {icon && <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">{icon}</div>}
            <input 
                type={type}
                className={`w-full ${icon ? 'pr-10' : 'pr-4'} ${suffix ? 'pl-10' : 'pl-4'} py-3.5 bg-white border border-gray-200 rounded-xl outline-none focus:border-[#E95D22] text-sm font-bold transition-all hover:border-gray-300`} 
                placeholder={placeholder} 
            />
            {suffix && <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400">{suffix}</div>}
        </div>
    </div>
);

const Select = ({ label, options }: any) => (
    <div className="space-y-2">
        <label className="text-[10px] font-bold text-gray-400">{label}</label>
        <div className="relative">
            <select className="w-full pr-4 pl-10 py-3.5 bg-white border border-gray-200 rounded-xl outline-none focus:border-[#E95D22] text-sm font-bold appearance-none cursor-pointer hover:border-gray-300">
                <option value="" disabled selected>اختر من القائمة...</option>
                {options.map((o: string) => <option key={o} value={o}>{o}</option>)}
            </select>
            <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16}/>
        </div>
    </div>
);

export default DeedsDashboard;