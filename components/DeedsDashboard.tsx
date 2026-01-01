import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx'; 
import { 
  FileText, Plus, Search, CheckCircle, Clock, 
  AlertCircle, FileStack, ChevronDown, ChevronUp, 
  X, Printer, User as UserIcon, Building2,
  CheckCircle2, LayoutList, FileSpreadsheet,
  CreditCard, Calendar, Hash, Phone, MapPin, Filter
} from 'lucide-react';

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

    // --- وظيفة تصدير Excel الحقيقية ---
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
        // ضبط عرض الأعمدة
        ws['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 12 }];
        XLSX.utils.book_append_sheet(wb, ws, "تقرير الإفراغات");
        XLSX.writeFile(wb, "Deeds_Report.xlsx");
    };

    // --- وظيفة الطباعة PDF ---
    const handlePrintPDF = () => {
        window.print();
    };

    const toggleRow = (id: number) => {
        const newExpanded = new Set(expandedRows);
        if (newExpanded.has(id)) newExpanded.delete(id); else newExpanded.add(id);
        setExpandedRows(newExpanded);
    };

    const getStatusColor = (status: string) => {
        if (status === 'منجز') return 'bg-green-50 text-green-600 border-green-100';
        if (status === 'قيد المعالجة') return 'bg-blue-50 text-blue-600 border-blue-100';
        if (status === 'مطلوب تعديل') return 'bg-red-50 text-red-600 border-red-100';
        return 'bg-gray-50 text-gray-600 border-gray-200';
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 font-cairo text-right" dir="rtl">
             {/* Header */}
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

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 no-print">
                <KPICard title="إجمالي الطلبات" value={stats.total} icon={<FileStack size={24}/>} color="text-[#1B2B48]" bg="bg-white" />
                <KPICard title="تم الإفراغ" value={stats.completed} icon={<CheckCircle size={24}/>} color="text-green-600" bg="bg-green-50" />
                <KPICard title="قيد المعالجة" value={stats.processing} icon={<Clock size={24}/>} color="text-blue-600" bg="bg-blue-50" />
                <KPICard title="تنبيهات" value={stats.actionRequired} icon={<AlertCircle size={24}/>} color="text-red-600" bg="bg-red-50" />
            </div>

            {/* Search */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-2 rounded-2xl border border-gray-100 shadow-sm no-print">
                <div className="relative w-full">
                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input 
                        type="text" 
                        placeholder="البحث باسم العميل، رقم الهوية..." 
                        className="w-full pr-12 pl-4 py-3 bg-transparent outline-none font-bold text-sm text-[#1B2B48]" 
                        value={searchQuery} 
                        onChange={(e) => setSearchQuery(e.target.value)} 
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-[30px] border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50/50 border-b border-gray-100">
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
                                    {expandedRows.has(deed.id) && (
                                        <tr className="bg-gray-50/30 animate-in fade-in">
                                            <td colSpan={5} className="p-6">
                                                <div className="bg-white rounded-2xl border border-gray-100 p-6">
                                                    <h4 className="text-xs font-black text-[#1B2B48] mb-4 flex items-center gap-2"><Building2 size={16}/> الوحدات المرتبطة</h4>
                                                    {deed.units.map(unit => (
                                                        <div key={unit.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-xl border border-gray-100 mb-2">
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

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#1B2B48]/60 backdrop-blur-sm no-print">
                    <div className="bg-white rounded-[30px] w-full max-w-4xl shadow-2xl overflow-hidden animate-in zoom-in-95">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="text-xl font-black text-[#1B2B48]">إضافة طلب جديد</h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full transition-all"><X size={20}/></button>
                        </div>
                        <div className="p-8 grid grid-cols-2 gap-6">
                            <Input label="اسم المستفيد" />
                            <Input label="رقم الهوية" />
                            <Input label="المشروع" />
                            <Input label="رقم الوحدة" />
                        </div>
                        <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                            <button onClick={() => setIsModalOpen(false)} className="px-6 py-3 rounded-xl border font-bold text-gray-500 hover:bg-white">إلغاء</button>
                            <button onClick={() => {alert('تم الحفظ'); setIsModalOpen(false)}} className="px-8 py-3 rounded-xl bg-[#E95D22] text-white font-bold hover:shadow-lg transition-all">حفظ</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Print Styles */}
            <style>{`
                @media print {
                    .no-print { display: none !important; }
                    body { background: white; -webkit-print-color-adjust: exact; }
                    .shadow-sm, .shadow-lg { box-shadow: none !important; }
                }
            `}</style>
        </div>
    );
};

const KPICard = ({ title, value, icon, color, bg }: any) => (
    <div className={`${bg} p-6 rounded-[24px] border border-gray-50 shadow-sm flex items-center justify-between`}>
        <div><p className="text-[11px] font-bold text-gray-400 mb-1">{title}</p><h3 className={`text-2xl font-black ${color}`}>{value}</h3></div>
        <div className={`p-4 rounded-xl bg-white shadow-sm ${color}`}>{icon}</div>
    </div>
);

const Input = ({ label }: any) => (
    <div className="space-y-2">
        <label className="text-xs font-bold text-gray-500">{label}</label>
        <input className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-[#E95D22] text-sm font-bold" />
    </div>
);

export default DeedsDashboard;