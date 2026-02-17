
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router';
import { supabase } from '../supabaseClient'; 
import * as XLSX from 'xlsx';
import { 
  Plus, Search, CheckCircle2, Clock, 
  ChevronDown, User as UserIcon, 
  MessageSquare, Send, Loader2, XCircle, Activity,
  Sparkles, FileSpreadsheet, Calendar, CreditCard,
  Building2, Phone, MapPin, FileText, Landmark, Sheet, Download
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
// Fix: Removed ActivityLog import as it is not exported from DataContext
import { useData } from '../contexts/DataContext';
import { notificationService } from '../services/notificationService';
import Modal from './Modal';
import { parseClearanceExcel } from '../utils/excelHandler';

const STATUS_OPTIONS = [
  { value: 'جديد', label: 'جديد', color: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
  { value: 'قيد العمل', label: 'قيد العمل', color: 'bg-blue-50 text-blue-700 border-blue-100' },
  { value: 'مكتمل', label: 'مكتمل', color: 'bg-green-50 text-green-700 border-green-100' },
  { value: 'مرفوض', label: 'مرفوض', color: 'bg-red-50 text-red-700 border-red-100' }
];

const DONUT_COLORS = {
    completed: '#10B981',
    inProgress: '#0EA5E9',
    rejected: '#F43F5E'
};

const renderDonutLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (percent < 0.08) return null;
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
        <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" className="font-black" style={{ fontSize: '12px' }}>
            {(percent * 100).toFixed(0)}%
        </text>
    );
};

interface DeedsDashboardProps {
  currentUserRole?: string;
  currentUserName?: string;
  filteredProjectName?: string;
  // Fix: Removed reference to non-existent ActivityLog type and used string for color consistency
  logActivity?: (action: string, target: string, color: 'text-blue-500' | 'text-orange-500' | 'text-green-500' | string) => void;
}

const DeedsDashboard: React.FC<DeedsDashboardProps> = ({ currentUserRole, currentUserName, filteredProjectName, logActivity }) => {
    const location = useLocation();
    const { refreshData, currentUser } = useData();
    const [searchQuery, setSearchQuery] = useState('');
    const [isRegModalOpen, setIsRegModalOpen] = useState(false);
    const [isManageModalOpen, setIsManageModalOpen] = useState(false);
    const [selectedDeed, setSelectedDeed] = useState<any>(null);
    const [deeds, setDeeds] = useState<any[]>([]); 
    const [comments, setComments] = useState<any[]>([]);
    const [newComment, setNewComment] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isBulkLoading, setIsBulkLoading] = useState(false);
    const [isCommentLoading, setIsCommentLoading] = useState(false);
    const [isAutoFilling, setIsAutoFilling] = useState(false);
    const [autoFillSuccess, setAutoFillSuccess] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const excelInputRef = useRef<HTMLInputElement>(null);
    const commentsEndRef = useRef<HTMLDivElement>(null);
    const lastFetchedIdRef = useRef<string>('');
    const autoFillTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

    // إزالة الرتب القديمة وحصر الصلاحية في الرتب المطلوبة
    const isAuthorizedToManage = ['ADMIN', 'PR_MANAGER', 'CONVEYANCE'].includes(currentUserRole || '');

    /**
     * إرسال إشعار ذكي حسب دور المرسل:
     * - CONVEYANCE → إشعار لـ PR_MANAGER و ADMIN
     * - PR_MANAGER / ADMIN → إشعار لـ CONVEYANCE
     */
    const sendAppNotification = async (title: string, message: string) => {
        const senderRole = currentUserRole || currentUser?.role;
        const targetRoles: any[] = senderRole === 'CONVEYANCE'
            ? ['PR_MANAGER', 'ADMIN']
            : ['CONVEYANCE'];

        await notificationService.send(
            targetRoles,
            `📢 ${title}: ${message}`,
            '/deeds',
            currentUserName || 'نظام الإفراغات'
        );
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

    const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsBulkLoading(true);
      try {
        const data = await parseClearanceExcel(file, null, currentUser);
        const { error } = await supabase.from('deeds_requests').insert(data);
        if (error) throw error;

        await sendAppNotification('استيراد إكسل', `تم إضافة ${data.length} سجل إفراغ جديد عبر إكسل`);
        logActivity?.('استيراد إكسل إفراغات', `تم إضافة ${data.length} سجل`, 'text-blue-500');
        fetchDeeds();
        alert(`تم استيراد ${data.length} سجل بنجاح ✅`);
      } catch (err: any) {
        alert("فشل الاستيراد: " + err.message);
      } finally {
        setIsBulkLoading(false);
        e.target.value = '';
      }
    };

    const normalizeId = useCallback((value: string) => value.replace(/\s+/g, '').replace(/-/g, '').trim(), []);

    const fetchClientDetails = useCallback(async (id: string) => {
        const normalizedId = normalizeId(id);
        if (!normalizedId || normalizedId.length < 10) return;
        if (normalizedId === lastFetchedIdRef.current) return;

        lastFetchedIdRef.current = normalizedId;
        setIsAutoFilling(true);
        setAutoFillSuccess(false);

        try {
            const { data, error } = await supabase
                .from('client_archive')
                .select('id_number, customer_name, mobile_number, project_name, unit_number, sale_price, bank_name, birth_date, housing_contract_number')
                .eq('id_number', normalizedId)
                .limit(1)
                .maybeSingle();

            if (error) throw error;

            let resolved = data;

            if (!resolved) {
                const { data: fallbackData, error: fallbackError } = await supabase
                    .from('client_archive')
                    .select('id_number, customer_name, mobile_number, project_name, unit_number, sale_price, bank_name, birth_date, housing_contract_number')
                    .ilike('id_number', `%${normalizedId}%`)
                    .limit(1)
                    .maybeSingle();

                if (fallbackError) throw fallbackError;
                resolved = fallbackData;
            }

            if (resolved) {
                setNewDeedForm((prev: any) => ({
                    ...prev,
                    client_name: resolved.customer_name || prev.client_name,
                    project_name: resolved.project_name || prev.project_name,
                    unit_number: resolved.unit_number || prev.unit_number,
                    unit_value: resolved.sale_price || prev.unit_value,
                    bank_name: resolved.bank_name || prev.bank_name,
                    sakani_support_number: resolved.housing_contract_number || prev.sakani_support_number,
                    dob_hijri: resolved.birth_date || prev.dob_hijri,
                    mobile: resolved.mobile_number || prev.mobile,
                }));
                setAutoFillSuccess(true);
                setTimeout(() => setAutoFillSuccess(false), 3000);
            } else {
                setAutoFillSuccess(false);
                lastFetchedIdRef.current = '';
                console.warn('لم يتم العثور على بيانات في client_archive للهوية:', normalizedId);
            }
        } catch (err) {
            console.error("🔥 Error in fetchClientDetails:", err);
            lastFetchedIdRef.current = '';
        } finally {
            setIsAutoFilling(false);
        }
    }, [normalizeId]);

    useEffect(() => {
        const idValue = normalizeId(newDeedForm.id_number || '');
        if (idValue.length < 10) {
            setAutoFillSuccess(false);
            lastFetchedIdRef.current = '';
            return;
        }

        if (autoFillTimerRef.current) clearTimeout(autoFillTimerRef.current);
        autoFillTimerRef.current = setTimeout(() => {
            fetchClientDetails(idValue);
        }, 500);

        return () => {
            if (autoFillTimerRef.current) clearTimeout(autoFillTimerRef.current);
        };
    }, [newDeedForm.id_number, normalizeId, fetchClientDetails]);

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
                text: newComment.trim()
            }]);
            if (error) throw error;

            await sendAppNotification('تعليق جديد', `تم إضافة ملاحظة على طلب العميل ${selectedDeed.client_name}`);

            // تحديث updated_at لإظهار مؤشر التحديث الجديد
            await supabase.from('deeds_requests').update({ updated_at: new Date().toISOString() }).eq('id', selectedDeed.id);

            setNewComment('');
            fetchComments(selectedDeed.id);
        } catch (err: any) {
            alert("فشل إضافة التعليق: " + err.message);
        } finally { setIsCommentLoading(false); }
    };

    const handleUpdateStatus = async (status: string) => {
        if (!selectedDeed || !isAuthorizedToManage) return;
        try {
            const { error } = await supabase.from('deeds_requests').update({ status, updated_at: new Date().toISOString() }).eq('id', selectedDeed.id);
            if (error) throw error;
            
            await sendAppNotification('تحديث حالة إفراغ', `تم تغيير حالة طلب ${selectedDeed.client_name} إلى (${status})`);
            
            setSelectedDeed({ ...selectedDeed, status, updated_at: new Date().toISOString() });
            fetchDeeds();
            refreshData(); // تحديث البيانات في DataContext والإحصائيات
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

            const { error } = await supabase.from('deeds_requests').insert([payload]);
            if (error) throw error;
            
            await sendAppNotification('طلب إفراغ جديد', `تم تسجيل طلب جديد للمستفيد ${payload.client_name}`);

            logActivity?.('تسجيل إفراغ جديد', payload.client_name, 'text-green-500');

            setIsRegModalOpen(false);
            setNewDeedForm({
                region: 'الرياض', city: 'الرياض', project_name: filteredProjectName || '',
                plan_number: '', unit_number: '', old_deed_number: '', deed_date: '',
                client_name: '', id_number: '', mobile: '', dob_hijri: '', unit_value: '',
                tax_number: '', bank_name: '', contract_type: 'تمويل عقاري',
                new_deed_number: '', new_deed_date: '', sakani_support_number: '', status: 'جديد'
            });
            lastFetchedIdRef.current = '';
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

    const deedsSummary = useMemo(() => {
        const all = deeds || [];
        const isCompleted = (status: string) => ['مكتمل', 'completed', 'منجز'].includes(status);
        const isRejected = (status: string) => ['مرفوض', 'rejected'].includes(status);

        const completed = all.filter(d => isCompleted(d?.status || '')).length;
        const rejected = all.filter(d => isRejected(d?.status || '')).length;
        const inProgress = all.filter(d => !isCompleted(d?.status || '') && !isRejected(d?.status || '')).length;

        const chartData = [
            { name: 'مكتمل', value: completed, color: DONUT_COLORS.completed },
            { name: 'تحت الإجراء', value: inProgress, color: DONUT_COLORS.inProgress },
            { name: 'مرفوض', value: rejected, color: DONUT_COLORS.rejected }
        ];

        return {
            total: all.length,
            completed,
            inProgress,
            rejected,
            chartData
        };
    }, [deeds]);

    const handleExportExcel = () => {
        if (filteredDeeds.length === 0) {
            alert('لا توجد بيانات للتصدير');
            return;
        }

        const exportData = filteredDeeds.map((deed, index) => ({
            '#': index + 1,
            'اسم المستفيد': deed.client_name || '',
            'هوية المستفيد': deed.id_number || '',
            'رقم جوال المستفيد': deed.mobile || '',
            'المنطقة': deed.region || '',
            'مدينة العقار': deed.city || '',
            'اسم المشروع': deed.project_name || '',
            'رقم المخطط': deed.plan_number || '',
            'رقم الوحدة': deed.unit_number || '',
            'رقم الصك القديم': deed.old_deed_number || '',
            'تاريخ الصك': deed.deed_date || '',
            'تاريخ الميلاد (هجري)': deed.birth_date || deed.dob_hijri || '',
            'قيمة الوحدة': deed.unit_value || 0,
            'الرقم الضريبي': deed.tax_number || '',
            'الجهة التمويلية': deed.bank_name || '',
            'نوع العقد التمويلي': deed.contract_type || '',
            'رقم الصك الجديد': deed.new_deed_number || '',
            'تاريخ الصك الجديد': deed.new_deed_date || '',
            'رقم عقد الدعم': deed.sakani_support_number || '',
            'الحالة': deed.status || '',
            'مسجل بواسطة': deed.submitted_by || '',
        }));

        const worksheet = XLSX.utils.json_to_sheet(exportData);

        // Set RTL and column widths
        worksheet['!cols'] = [
            { wch: 5 },   // #
            { wch: 25 },  // اسم المستفيد
            { wch: 15 },  // هوية المستفيد
            { wch: 15 },  // رقم جوال
            { wch: 12 },  // المنطقة
            { wch: 12 },  // المدينة
            { wch: 20 },  // المشروع
            { wch: 12 },  // رقم المخطط
            { wch: 12 },  // رقم الوحدة
            { wch: 15 },  // الصك القديم
            { wch: 14 },  // تاريخ الصك
            { wch: 14 },  // الميلاد
            { wch: 15 },  // القيمة
            { wch: 15 },  // الضريبي
            { wch: 15 },  // البنك
            { wch: 15 },  // نوع العقد
            { wch: 15 },  // الصك الجديد
            { wch: 14 },  // تاريخ الجديد
            { wch: 15 },  // عقد الدعم
            { wch: 10 },  // الحالة
            { wch: 18 },  // مسجل بواسطة
        ];

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'سجل الإفراغات');

        const today = new Date().toISOString().split('T')[0];
        XLSX.writeFile(workbook, `سجل_الإفراغات_${today}.xlsx`);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 font-cairo text-right" dir="rtl">
             <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-[35px] border border-gray-100 shadow-sm">
                <div>
                    <h2 className="text-2xl font-black text-[#1B2B48]">سجل الإفراغات</h2>
                    <p className="text-gray-400 text-xs font-bold mt-1 uppercase tracking-widest">إدارة شاملة لملف الإفراغ والتعليقات</p>
                </div>
                <div className="flex items-center gap-3">
                    <input type="file" ref={excelInputRef} hidden accept=".xlsx, .xls" onChange={handleExcelImport} />
                    <button 
                      onClick={handleExportExcel}
                      className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-100 text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-50 transition-all shadow-sm"
                    >
                      <Download size={16} className="text-blue-600" />
                      تحميل إكسل
                    </button>
                    <button 
                      onClick={() => excelInputRef.current?.click()}
                      disabled={isBulkLoading}
                      className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-100 text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-50 transition-all shadow-sm"
                    >
                      {isBulkLoading ? <Loader2 size={16} className="animate-spin" /> : <Sheet size={16} className="text-green-600" />}
                      استيراد إكسل
                    </button>
                    <button onClick={() => setIsRegModalOpen(true)} className="flex items-center justify-center gap-2 px-6 py-2.5 bg-[#E95D22] text-white rounded-xl font-black text-sm hover:brightness-110 shadow-lg active:scale-95 transition-all">
                        <Plus size={16} /> تسجيل صك جديد
                    </button>
                </div>
            </div>

            <div className="bg-white p-6 rounded-[35px] border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-lg font-black text-[#1B2B48]">تفاصيل سجل الإفراغات</h3>
                        <p className="text-[10px] text-gray-400 font-bold">توزيع طلبات الإفراغ حسب الحالة</p>
                    </div>
                    <span className="text-[10px] text-gray-400 font-bold">الإجمالي: {deedsSummary.total}</span>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:col-span-2">
                        <SummaryStatCard label="مرفوض" value={deedsSummary.rejected} icon={<XCircle size={18} />} color="text-rose-600" bg="bg-rose-50 border-rose-100" />
                        <SummaryStatCard label="تحت الإجراء" value={deedsSummary.inProgress} icon={<Clock size={18} />} color="text-sky-600" bg="bg-sky-50 border-sky-100" />
                        <SummaryStatCard label="مكتمل" value={deedsSummary.completed} icon={<CheckCircle2 size={18} />} color="text-emerald-600" bg="bg-emerald-50 border-emerald-100" />
                    </div>
                    <div className="bg-gray-50 rounded-[28px] p-4 border border-gray-100">
                        <div className="h-44">
                            {deedsSummary.total === 0 ? (
                                <div className="h-full flex items-center justify-center">
                                    <div className="w-28 h-28 rounded-full border-[10px] border-gray-200 flex items-center justify-center text-[10px] font-black text-gray-400">
                                        لا توجد بيانات
                                    </div>
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={deedsSummary.chartData}
                                            dataKey="value"
                                            nameKey="name"
                                            innerRadius={45}
                                            outerRadius={70}
                                            label={renderDonutLabel}
                                            labelLine={false}
                                        >
                                            {deedsSummary.chartData.map((entry) => (
                                                <Cell key={entry.name} fill={entry.color} />
                                            ))}
                                        </Pie>
                                    </PieChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                        <div className="flex flex-wrap justify-center gap-3 mt-2 text-[10px] font-bold text-gray-500">
                            {deedsSummary.chartData.map((item) => (
                                <div key={item.name} className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                                    <span>{item.name}</span>
                                    <span className="text-gray-400">{item.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
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
                                filteredDeeds.map((deed) => {
                                    // مؤشر التحديث الجديد: إذا تم التحديث خلال آخر 24 ساعة
                                    const isRecentlyUpdated = deed.updated_at && 
                                        (new Date().getTime() - new Date(deed.updated_at).getTime()) < 24 * 60 * 60 * 1000 &&
                                        deed.updated_at !== deed.created_at;
                                    return (
                                    <tr key={deed.id} className="hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => handleOpenManage(deed)}>
                                        <td className="p-6">
                                            <div className="flex items-center gap-2">
                                                <div>
                                                    <p className="font-bold text-[#1B2B48] text-sm">{deed.client_name}</p>
                                                    <p className="text-[10px] text-gray-400 font-bold">{deed.id_number}</p>
                                                </div>
                                                {isRecentlyUpdated && (
                                                    <span className="flex items-center gap-1 px-2 py-0.5 bg-orange-50 text-[#E95D22] rounded-lg text-[9px] font-black border border-orange-100 animate-pulse">
                                                        <Activity size={10} />
                                                        تحديث
                                                    </span>
                                                )}
                                            </div>
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
                                    );
                                })
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
                        {/* بيانات المستفيد */}
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-[30px] border border-blue-100 shadow-sm">
                            <h3 className="text-sm font-black text-[#1B2B48] mb-4 flex items-center gap-2">
                                <UserIcon size={16} className="text-blue-600" />
                                بيانات المستفيد
                            </h3>
                            <div className="grid grid-cols-2 gap-6">
                                <Detail label="اسم المستفيد" value={selectedDeed.client_name} icon={<UserIcon size={14}/>} />
                                <Detail label="رقم الهوية" value={selectedDeed.id_number} icon={<FileText size={14}/>} />
                                <Detail label="جوال المستفيد" value={selectedDeed.mobile} icon={<Phone size={14}/>} />
                                <Detail label="تاريخ الميلاد" value={selectedDeed.dob_hijri} icon={<Calendar size={14}/>} />
                            </div>
                        </div>

                        {/* بيانات العقار والصفقة */}
                        <div className="bg-gradient-to-br from-orange-50 to-amber-50 p-6 rounded-[30px] border border-orange-100 shadow-sm">
                            <h3 className="text-sm font-black text-[#1B2B48] mb-4 flex items-center gap-2">
                                <Building2 size={16} className="text-orange-600" />
                                بيانات العقار والصفقة
                            </h3>
                            <div className="grid grid-cols-2 gap-6">
                                <Detail label="المنطقة" value={selectedDeed.region} icon={<MapPin size={14}/>} />
                                <Detail label="مدينة العقار" value={selectedDeed.city} icon={<MapPin size={14}/>} />
                                <Detail label="اسم المشروع" value={selectedDeed.project_name} icon={<Building2 size={14}/>} />
                                <Detail label="رقم المخطط" value={selectedDeed.plan_number} icon={<Sheet size={14}/>} />
                                <Detail label="رقم الوحدة" value={selectedDeed.unit_number} icon={<Sheet size={14}/>} />
                                <Detail label="قيمة الوحدة" value={selectedDeed.unit_value ? `${parseFloat(selectedDeed.unit_value).toLocaleString()} ر.س` : '-'} icon={<CreditCard size={14}/>} />
                                <Detail label="الرقم الضريبي" value={selectedDeed.tax_number} icon={<FileText size={14}/>} />
                                <Detail label="نوع العقد" value={selectedDeed.contract_type} icon={<FileText size={14}/>} />
                            </div>
                        </div>

                        {/* بيانات التمويل */}
                        <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-[30px] border border-green-100 shadow-sm">
                            <h3 className="text-sm font-black text-[#1B2B48] mb-4 flex items-center gap-2">
                                <Landmark size={16} className="text-green-600" />
                                بيانات التمويل
                            </h3>
                            <div className="grid grid-cols-2 gap-6">
                                <Detail label="اسم البنك" value={selectedDeed.bank_name} icon={<Landmark size={14}/>} />
                                <Detail label="الدفعة التمويلية سكني" value={selectedDeed.sakani_support_number} icon={<CreditCard size={14}/>} />
                            </div>
                        </div>

                        {/* بيانات الصك */}
                        <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-[30px] border border-purple-100 shadow-sm">
                            <h3 className="text-sm font-black text-[#1B2B48] mb-4 flex items-center gap-2">
                                <FileText size={16} className="text-purple-600" />
                                بيانات الصك
                            </h3>
                            <div className="grid grid-cols-2 gap-6">
                                <Detail label="رقم الصك القديم" value={selectedDeed.old_deed_number} icon={<FileText size={14}/>} />
                                <Detail label="تاريخ الصك" value={selectedDeed.deed_date} icon={<Calendar size={14}/>} />
                                <Detail label="رقم الملك الجديد" value={selectedDeed.new_deed_number} icon={<FileText size={14}/>} />
                                <Detail label="تاريخ الملك الجديد" value={selectedDeed.new_deed_date} icon={<Calendar size={14}/>} />
                            </div>
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

const SummaryStatCard = ({ label, value, icon, color, bg }: any) => (
    <div className={`rounded-2xl border p-4 ${bg}`}>
        <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-white/70 flex items-center justify-center text-gray-400">
                {icon}
            </div>
            <span className={`text-3xl font-black ${color}`}>{value}</span>
        </div>
        <p className="text-xs font-black text-gray-500 mt-2">{label}</p>
    </div>
);

export default DeedsDashboard;
