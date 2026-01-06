
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
  FileSpreadsheet, Trash2
} from 'lucide-react';
import { ActivityLog } from '../contexts/DataContext';
// Fixed: Added missing import for Modal component
import Modal from './Modal';

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
        clientName: '',
        id_number: '',
        mobile: '',
        status: 'جديد'
    });

    const canManage = ['ADMIN', 'PR_MANAGER', 'DEEDS_OFFICER'].includes(currentUserRole || '');
    const isAdmin = currentUserRole === 'ADMIN';

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
            setDeeds(data?.map((d: any) => ({
                id: d.id,
                clientName: d.client_name,
                idNumber: d.id_number,
                mobile: d.mobile || '',
                projectName: d.project_name || '',
                status: d.status || 'جديد',
                created_at: d.created_at,
                comments: d.deed_comments || [],
                details: d
            })) || []);
        } catch (error) {
            console.error("Deeds fetch error:", error);
        } finally { setIsLoading(false); }
    };

    useEffect(() => { fetchDeeds(); }, [filteredProjectName]);

    const handleDeleteDeed = async (e: React.MouseEvent, id: number, name: string) => {
        e.stopPropagation();
        if (!window.confirm(`هل أنت متأكد من حذف سجل المستفيد "${name}"؟`)) return;
        try {
            const { error } = await supabase.from('deeds_requests').delete().eq('id', id);
            if (error) throw error;
            logActivity?.('حذف سجل إفراغ', name, 'text-orange-500');
            fetchDeeds();
        } catch (err: any) { alert("خطأ: " + err.message); }
    };

    const handleSaveNewDeed = async () => {
        if (!newDeedForm.clientName || !newDeedForm.id_number) return alert("يرجى إكمال البيانات الأساسية");
        setIsSaving(true);
        try {
            const { error } = await supabase.from('deeds_requests').insert([{
                region: newDeedForm.region,
                city: newDeedForm.city,
                project_name: newDeedForm.projectName,
                client_name: newDeedForm.clientName,
                id_number: newDeedForm.id_number,
                mobile: newDeedForm.mobile,
                status: 'جديد',
                submitted_by: currentUserName
            }]);
            if (error) throw error;
            setIsRegModalOpen(false);
            fetchDeeds();
        } catch (error: any) { alert('خطأ: ' + error.message); } finally { setIsSaving(false); }
    };

    const toggleRow = (id: number) => { 
        const s = new Set(expandedRows); 
        s.has(id) ? s.delete(id) : s.add(id); 
        setExpandedRows(s); 
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 font-cairo text-right" dir="rtl">
             <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-[35px] border border-gray-100 shadow-sm">
                <div>
                    <h2 className="text-2xl font-black text-[#1B2B48]">سجل الإفراغات العام</h2>
                    <p className="text-gray-400 text-xs font-bold mt-1 uppercase tracking-widest">إدارة الملكية العقارية والتدقيق الفني</p>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    {canManage && (
                        <button onClick={() => setIsRegModalOpen(true)} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-3 bg-[#E95D22] text-white rounded-2xl font-black text-sm hover:brightness-110 shadow-xl shadow-orange-100 active:scale-95 transition-all"><Plus size={18} /> تسجيل إفراغ جديد</button>
                    )}
                </div>
            </div>

            <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50/50 border-b border-gray-100">
                            <tr className="text-right text-gray-400 text-[10px] font-black uppercase tracking-widest">
                                <th className="p-6">المستفيد</th>
                                <th className="p-6">المشروع</th>
                                <th className="p-6">الحالة</th>
                                <th className="p-6 w-20 text-center">الإجراء</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {isLoading ? (
                                <tr><td colSpan={4} className="p-10 text-center text-gray-400">جاري جلب السجلات...</td></tr>
                            ) : deeds?.length === 0 ? (
                                <tr><td colSpan={4} className="p-20 text-center text-gray-300 font-bold">لا توجد سجلات حالياً</td></tr>
                            ) : (
                                deeds?.filter(d => d.clientName?.includes(searchQuery) || d.idNumber?.includes(searchQuery)).map((deed) => (
                                    <React.Fragment key={deed.id}>
                                        <tr className="hover:bg-gray-50 cursor-pointer group" onClick={() => toggleRow(deed.id)}>
                                            <td className="p-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-black text-xs">{deed.clientName?.[0]}</div>
                                                    <div><p className="font-bold text-[#1B2B48] text-sm">{deed.clientName}</p><p className="text-[10px] text-gray-400 font-bold">{deed.idNumber}</p></div>
                                                </div>
                                            </td>
                                            <td className="p-6 text-sm font-bold text-gray-600">{deed.projectName}</td>
                                            <td className="p-6"><span className={`px-4 py-1.5 rounded-xl text-[10px] font-black border ${deed.status === 'مكتمل' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>{deed.status}</span></td>
                                            <td className="p-6 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    {isAdmin && (
                                                        <button onClick={(e) => handleDeleteDeed(e, deed.id, deed.clientName)} className="p-2 text-gray-400 hover:text-red-500 transition-all"><Trash2 size={18}/></button>
                                                    )}
                                                    <ChevronDown className={`text-gray-300 transition-transform ${expandedRows.has(deed.id) ? 'rotate-180' : ''}`} size={18}/>
                                                </div>
                                            </td>
                                        </tr>
                                    </React.Fragment>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {isRegModalOpen && (
                <Modal isOpen={isRegModalOpen} onClose={() => setIsRegModalOpen(false)} title="تسجيل إفراغ جديد">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-right">
                        <input className="w-full p-4 bg-gray-50 rounded-2xl border outline-none font-bold" placeholder="اسم المستفيد" value={newDeedForm.clientName} onChange={v => setNewDeedForm({...newDeedForm, clientName: v.target.value})} />
                        <input className="w-full p-4 bg-gray-50 rounded-2xl border outline-none font-bold" placeholder="رقم الهوية" value={newDeedForm.id_number} onChange={v => setNewDeedForm({...newDeedForm, id_number: v.target.value})} />
                        <button onClick={handleSaveNewDeed} className="w-full md:col-span-2 bg-[#E95D22] text-white py-4 rounded-2xl font-black mt-4 active:scale-95 transition-all">تأكيد التسجيل</button>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default DeedsDashboard;