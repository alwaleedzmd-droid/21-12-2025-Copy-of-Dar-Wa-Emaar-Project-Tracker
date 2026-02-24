import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router';
import { 
  Plus, MoreHorizontal, Trash2, Edit, FileText, 
  Building2, AlignLeft, CheckCircle2, Paperclip, 
  FileUp, Sheet, Search, Filter, Zap, ChevronLeft, Loader2, Clock, XCircle, Download
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { supabase } from '../supabaseClient';
import { TechnicalRequest, ProjectSummary, User } from '../types';
import { notificationService } from '../services/notificationService';
import { updateProjectProgress } from '../services/projectProgressService';
import { 
  TECHNICAL_SERVICE_OPTIONS,
  WORKFLOW_ROUTES,
  normalizeWorkflowType,
  canApproveWorkflowRequest
} from '../services/requestWorkflowService';
import Modal from './Modal';
import ManageRequestModal from './ManageRequestModal';
import * as XLSX from 'xlsx';
import { parseTechnicalRequestsExcel } from '../utils/excelHandler';

// --- Constants ---
const RAW_REVIEW_ENTITIES = [
  "وزارة الإسكان", "الشركة الوطنية للإسكان", "أمانة منطقة الرياض", "الشركة السعودية للكهرباء",
  "المركز الوطني للرقابة على الالتزام البيئي", "الشرطة", "شركة المياه الوطنية", "بلدية شمال الرياض",
  "وزارة الشؤون الإسلامية", "أمانة محافظة جدة", "بلدية العقيق", "الدفاع المدني", "أمانة المنطقة الشرقية",
  "بلدية صفوى", "بلدية شرق الدمام", "أمانة العاصمة المقدسة", "الهيئة الملكية لتطوير الرياض", "أخرى"
];

const REVIEW_ENTITIES = Array.from(new Set(RAW_REVIEW_ENTITIES));

const STATUS_OPTIONS = [
  { value: 'new', label: 'جديد' },
  { value: 'pending', label: 'متابعة' },
  { value: 'in_progress', label: 'قيد التنفيذ' },
  { value: 'pending_modification', label: 'بانتظار التعديل' },
  { value: 'under_review', label: 'تحت المراجعة' },
  { value: 'approved', label: 'معتمد' },
  { value: 'completed', label: 'منجز' },
  { value: 'rejected', label: 'مرفوض' },
  { value: 'cancelled', label: 'ملغى' }
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

interface TechnicalModuleProps {
  requests: TechnicalRequest[];
  projects: ProjectSummary[];
  currentUser: User | null;
  usersList: any[];
  onRefresh: () => void;
  filteredByProject?: string;
  scopeFilter?: 'INTERNAL_WORK' | 'EXTERNAL';
  logActivity?: (action: string, target: string, color?: 'text-blue-500' | 'text-orange-500' | 'text-green-500') => void;
}

const TechnicalModule: React.FC<TechnicalModuleProps> = ({ 
  requests, projects, currentUser, usersList, onRefresh, filteredByProject, scopeFilter, logActivity 
}) => {
  const location = useLocation();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [activeRequest, setActiveRequest] = useState<TechnicalRequest | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isUploading, setIsUploading] = useState(false);
  const [isBulkLoading, setIsBulkLoading] = useState(false);
  const [attachment, setAttachment] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);

  const [techForm, setTechForm] = useState({
    id: 0, 
    project_id: '', 
    service_type: '', 
    reviewing_entity: '', 
    requesting_entity: '', 
    details: '', 
    status: 'new', 
    progress: 0,
    attachment_url: '' 
  });

  useEffect(() => {
    if (location.state?.openId && (requests || []).length > 0) {
      const targetReq = requests.find(r => r.id === location.state.openId);
      if (targetReq) {
        setActiveRequest(targetReq);
        setIsManageModalOpen(true);
      }
    }
  }, [location.state, requests]);

  const openAddModal = () => {
    const proj = filteredByProject ? (projects || []).find(p => p.name === filteredByProject || p.title === filteredByProject) : null;
    setTechForm({ 
      id: 0, 
      project_id: proj ? proj?.id?.toString() : '', 
      service_type: '', 
      reviewing_entity: '', 
      requesting_entity: '', 
      details: '', 
      status: 'new', 
      progress: 0,
      attachment_url: ''
    });
    setAttachment(null);
    setIsAddModalOpen(true);
  };

  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsBulkLoading(true);
    try {
      const proj = filteredByProject ? projects.find(p => p.name === filteredByProject || p.title === filteredByProject) : null;
      const data = await parseTechnicalRequestsExcel(file, proj?.id || null, filteredByProject || null);
      
      const { error } = await supabase.from('technical_requests').insert(data);
      if (error) throw error;

      notificationService.send(
        ['TECHNICAL', 'PR_MANAGER', 'ADMIN'],
        `تم استيراد ${data.length} طلب فني جديد عبر إكسل`,
        '/technical',
        currentUser?.name || 'النظام'
      );
      logActivity?.('استيراد إكسل', `تم إضافة ${data.length} طلب فني`, 'text-blue-500');
      onRefresh();
      alert(`تم استيراد ${data.length} سجل بنجاح ✅`);
    } catch (err: any) {
      alert("فشل الاستيراد: " + err.message);
    } finally {
      setIsBulkLoading(false);
      e.target.value = '';
    }
  };

  const handleExportExcel = () => {
    if (scopedRequests.length === 0) {
      alert('لا توجد بيانات للتصدير');
      return;
    }

    const exportData = scopedRequests.map((req, index) => ({
      '#': index + 1,
      'المشروع': req?.project_name || '',
      'بيان العمل': req?.service_type || '',
      'جهة المراجعة': req?.reviewing_entity || '',
      'الجهة الطالبة': req?.requesting_entity || '',
      'الوصف': req?.details || '',
      'الحالة': STATUS_OPTIONS.find(o => o.value === req?.status)?.label || req?.status || '',
      'نسبة الانجاز': req?.progress ?? 0,
      'نطاق العمل': req?.scope || '',
      'تاريخ الاضافة': req?.created_at || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    worksheet['!cols'] = [
      { wch: 5 },  // #
      { wch: 20 }, // المشروع
      { wch: 20 }, // بيان العمل
      { wch: 20 }, // جهة المراجعة
      { wch: 18 }, // الجهة الطالبة
      { wch: 30 }, // الوصف
      { wch: 12 }, // الحالة
      { wch: 12 }, // نسبة الانجاز
      { wch: 12 }, // نطاق العمل
      { wch: 18 }  // تاريخ الاضافة
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'الطلبات الفنية');
    const today = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `الطلبات_الفنية_${today}.xlsx`);
  };

  const handleSubmit = async () => {
    if (!techForm.project_id || !techForm.service_type) return alert("يرجى تعبئة الحقول الأساسية");
    setIsUploading(true); 

    let finalAttachmentUrl = techForm.attachment_url;
    if (attachment) {
      try {
        const fileExt = attachment.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${fileName}`;
        const { error: uploadError } = await supabase.storage.from('attachments').upload(filePath, attachment);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('attachments').getPublicUrl(filePath);
        finalAttachmentUrl = publicUrl;
      } catch (err: any) {
        alert('حدث خطأ أثناء رفع الملف');
        setIsUploading(false);
        return;
      }
    }

    const selectedProj = (projects || []).find(p => p?.id?.toString() === techForm.project_id);
    const workflowType = 'TECHNICAL_SECTION';
    
    // جلب سير الموافقة من قاعدة البيانات
    const { getWorkflowRoute } = await import('../services/requestWorkflowService');
    const workflowRoute = await getWorkflowRoute(workflowType);

    const trimUnsupportedWorkflowColumns = (inputPayload: Record<string, any>, message?: string) => {
      const nextPayload = { ...inputPayload };
      const lowered = (message || '').toLowerCase();

      const missingColumnMatch = message?.match(/'([^']+)'\s+column/i);
      const missingColumn = missingColumnMatch?.[1];
      if (missingColumn && missingColumn in nextPayload) {
        delete nextPayload[missingColumn];
      }

      if (lowered.includes('request_type')) delete nextPayload.request_type;
      if (lowered.includes('workflow_cc')) delete nextPayload.workflow_cc;
      return nextPayload;
    };

    const hasSameKeys = (a: Record<string, any>, b: Record<string, any>) => {
      const aKeys = Object.keys(a).sort().join('|');
      const bKeys = Object.keys(b).sort().join('|');
      return aKeys === bKeys;
    };

    const payload: Record<string, any> = {
      project_id: parseInt(techForm.project_id),
      scope: scopeFilter || 'EXTERNAL',
      request_type: workflowType,
      service_type: techForm.service_type,
      reviewing_entity: techForm.reviewing_entity,
      requesting_entity: techForm.requesting_entity || currentUser?.name, 
      details: techForm.details,
      status: 'pending', 
      progress: techForm.progress,
      project_name: selectedProj ? (selectedProj?.name || selectedProj?.title) : '',
      attachment_url: finalAttachmentUrl,
      submitted_by: currentUser?.name,
      assigned_to: workflowRoute.assigneeName,
      workflow_cc: workflowRoute.ccLabel
    };

    try {
      if (techForm.id === 0) {
        let insertPayload: Record<string, any> = { ...payload };
        let insertedRequest: { id: number } | null = null;
        let insertError: any = null;

        for (let attempt = 0; attempt < 3; attempt++) {
          const { data, error } = await supabase
            .from('technical_requests')
            .insert([insertPayload])
            .select('id')
            .single();

          if (!error) {
            insertedRequest = data;
            insertError = null;
            break;
          }

          insertError = error;
          const nextPayload = trimUnsupportedWorkflowColumns(
            insertPayload,
            `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`
          );
          if (hasSameKeys(insertPayload, nextPayload)) break;
          insertPayload = nextPayload;
        }

        if (insertError) throw insertError;

        if (insertedRequest?.id) {
          await supabase.from('request_comments').insert([{
            request_id: insertedRequest.id,
            request_type: 'technical',
            user_name: currentUser?.name || 'النظام',
            content: `تم تقديم الطلب وتعيينه إلى ${workflowRoute.assigneeName}`
          }]);
        }

        notificationService.send(
          workflowRoute.notifyRoles,
          `طلب فني جديد: ${techForm.service_type} | المسؤول: ${workflowRoute.assigneeName} | نسخة للعلم: ${workflowRoute.ccLabel}`,
          '/technical',
          currentUser?.name || 'الإدارة'
        ).catch(() => {});
      } else {
        let updatePayload: Record<string, any> = { ...payload };
        let updateError: any = null;

        for (let attempt = 0; attempt < 3; attempt++) {
          const { error } = await supabase.from('technical_requests').update(updatePayload).eq('id', Number(techForm.id));
          if (!error) {
            updateError = null;
            break;
          }

          updateError = error;
          const nextPayload = trimUnsupportedWorkflowColumns(
            updatePayload,
            `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`
          );
          if (hasSameKeys(updatePayload, nextPayload)) break;
          updatePayload = nextPayload;
        }

        if (updateError) throw updateError;
        notificationService.send(
          workflowRoute.notifyRoles,
          `تحديث طلب فني: ${techForm.service_type} | المسؤول: ${workflowRoute.assigneeName}`,
          '/technical',
          currentUser?.name || 'الإدارة'
        ).catch(() => {});
      }
      // صوت تأكيد محلي عند نجاح الحفظ
      try { new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play().catch(() => {}); } catch {}
      setIsAddModalOpen(false);
      await onRefresh();
      alert("تم حفظ البيانات بنجاح ✅");
    } catch (err: any) {
        console.error("❌ خطأ قاعدة البيانات:", err);
        alert("حدث خطأ في قاعدة البيانات:\n" + (err?.message || JSON.stringify(err)));
    } finally { setIsUploading(false); }
  };

  const updateStatus = async (newStatus: string, reason?: string) => {
    if (!activeRequest?.id) return;
    if (!canApproveWorkflowRequest(currentUser?.name, activeRequest.assigned_to)) {
      alert('تحديث الحالة متاح فقط للمسؤول المباشر المعين على الطلب');
      return;
    }

    if (!['approved', 'rejected'].includes(newStatus)) {
      alert('المسموح فقط: مقبول أو مرفوض');
      return;
    }

    try {
      const updateData: any = {
        status: newStatus,
        progress: newStatus === 'approved' ? 100 : (activeRequest?.progress || 0)
      };
      const { error } = await supabase.from('technical_requests').update(updateData).eq('id', Number(activeRequest?.id));
      if (error) throw error;

      await supabase.from('request_comments').insert([{
        request_id: activeRequest.id,
        request_type: 'technical',
        user_name: currentUser?.name || 'النظام',
        content: `قرار نهائي: ${newStatus === 'approved' ? 'مقبول' : 'مرفوض'}${reason ? ` | السبب: ${reason}` : ''}`
      }]);

      const workflowType = normalizeWorkflowType(activeRequest.request_type || activeRequest.service_type);
      
      // جلب سير الموافقة من قاعدة البيانات
      const { getWorkflowRoute } = await import('../services/requestWorkflowService');
      const workflowRoute = await getWorkflowRoute(workflowType);
      
      // ✅ إنشاء ProjectWork عند الموافقة على الطلب
      if (newStatus === 'approved' && activeRequest?.project_id) {
        try {
          const projectName = activeRequest.project_name || activeRequest.project_title || 'مشروع';
          await supabase.from('project_works').insert({
            projectId: activeRequest.project_id,
            project_name: projectName,
            task_name: `${activeRequest.service_type} - طلب تقني مقبول`,
            status: 'in_progress',
            authority: activeRequest.reviewing_entity || 'غير محدد',
            department: activeRequest.scope || 'قسم فني',
            notes: `طلب تقني مقبول - ${activeRequest.service_type}${reason ? ` | ملاحظات: ${reason}` : ''} | رقم الطلب: #${activeRequest.id}`,
            created_at: new Date().toISOString()
          });
        } catch (workErr: any) {
          console.warn('⚠️ تنبيه: فشل إنشاء ProjectWork:', workErr.message);
          // عدم إيقاف العملية إذا فشل إنشاء work
        }
      }
      
      notificationService.send(
        workflowRoute.notifyRoles,
        `تم ${newStatus === 'approved' ? 'قبول' : 'رفض'} الطلب: ${activeRequest.service_type}${reason ? ` | السبب: ${reason}` : ''}`,
        '/technical',
        currentUser?.name || 'النظام'
      );
      
      // 🔄 تحديث نسبة إنجاز المشروع تلقائياً
      if (activeRequest?.project_id) {
        await updateProjectProgress(activeRequest.project_id);
      }

      setActiveRequest({ ...activeRequest, ...updateData });
      await onRefresh();
    } catch (err: any) { alert("فشل تحديث الحالة"); }
  };

  const scopedRequests = useMemo(() => {
    const base = requests || [];
    return base.filter((r) => {
      if (scopeFilter && r?.scope && r?.scope !== scopeFilter) return false;
      if (filteredByProject) {
        const projectMatch =
          r?.project_name === filteredByProject ||
          r?.project_title === filteredByProject ||
          r?.project_id?.toString() === filteredByProject;
        if (!projectMatch) return false;
      }
      return true;
    });
  }, [requests, filteredByProject, scopeFilter]);

  const filteredRequests = useMemo(() => {
    if (!searchTerm) return scopedRequests;
    const term = searchTerm.toLowerCase();
    return scopedRequests.filter(r => (
      r?.project_name?.toLowerCase()?.includes(term) ||
      r?.service_type?.toLowerCase()?.includes(term) ||
      r?.reviewing_entity?.toLowerCase()?.includes(term)
    ));
  }, [scopedRequests, searchTerm]);

  const techSummary = useMemo(() => {
    const isCompleted = (status: string) => ['completed', 'منجز', 'مكتمل'].includes(status);
    const isRejected = (status: string) => ['rejected', 'مرفوض', 'cancelled', 'ملغى'].includes(status);

    const completed = scopedRequests.filter(r => isCompleted(r?.status || '')).length;
    const rejected = scopedRequests.filter(r => isRejected(r?.status || '')).length;
    const inProgress = scopedRequests.filter(r => !isCompleted(r?.status || '') && !isRejected(r?.status || '')).length;

    const chartData = [
      { name: 'منجز', value: completed, color: DONUT_COLORS.completed },
      { name: 'تحت الإجراء', value: inProgress, color: DONUT_COLORS.inProgress },
      { name: 'مرفوض', value: rejected, color: DONUT_COLORS.rejected }
    ];

    return {
      total: scopedRequests.length,
      completed,
      inProgress,
      rejected,
      chartData
    };
  }, [scopedRequests]);

  // Fix: Removed 'PR_EMPLOYEE' as it is not a valid UserRole and caused type overlap errors.
  const canEdit = currentUser?.role === 'ADMIN' || currentUser?.role === 'PR_MANAGER' || currentUser?.role === 'TECHNICAL';

  return (
    <div className="space-y-8 animate-in fade-in font-cairo" dir="rtl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-[#1B2B48]">{scopeFilter === 'INTERNAL_WORK' ? 'أعمال المشروع الداخلية' : 'المراجعات والطلبات الفنية'}</h2>
          <p className="text-gray-400 text-sm mt-1">إدارة ومتابعة المهام والأعمال الهندسية والفنية</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {canEdit && (
            <>
              <input type="file" ref={excelInputRef} hidden accept=".xlsx, .xls" onChange={handleExcelImport} />
              <button 
                onClick={handleExportExcel}
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-50 transition-all shadow-sm"
              >
                <Download size={18} className="text-blue-600" />
                تحميل اكسل
              </button>
              <button 
                onClick={() => excelInputRef.current?.click()}
                disabled={isBulkLoading}
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-50 transition-all shadow-sm"
              >
                {isBulkLoading ? <Loader2 size={18} className="animate-spin" /> : <Sheet size={18} className="text-green-600" />}
                استيراد إكسل
              </button>
              <button onClick={openAddModal} className="flex items-center gap-2 px-6 py-2.5 bg-[#1B2B48] text-white rounded-xl font-black text-sm hover:brightness-110 shadow-lg transition-all active:scale-95">
                <Plus size={20} /> إضافة طلب
              </button>
            </>
          )}
        </div>
      </div>

      <div className="bg-white p-6 rounded-[35px] border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-black text-[#1B2B48]">تفاصيل الطلبات الفنية</h3>
            <p className="text-[10px] text-gray-400 font-bold">توزيع الطلبات حسب الحالة</p>
          </div>
          <span className="text-[10px] text-gray-400 font-bold">الإجمالي: {techSummary.total}</span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:col-span-2">
            <SummaryStatCard label="مرفوض" value={techSummary.rejected} icon={<XCircle size={18} />} color="text-rose-600" bg="bg-rose-50 border-rose-100" />
            <SummaryStatCard label="تحت الإجراء" value={techSummary.inProgress} icon={<Clock size={18} />} color="text-sky-600" bg="bg-sky-50 border-sky-100" />
            <SummaryStatCard label="منجز" value={techSummary.completed} icon={<CheckCircle2 size={18} />} color="text-emerald-600" bg="bg-emerald-50 border-emerald-100" />
          </div>
          <div className="bg-gray-50 rounded-[28px] p-4 border border-gray-100">
            <div className="h-44">
              {techSummary.total === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <div className="w-28 h-28 rounded-full border-[10px] border-gray-200 flex items-center justify-center text-[10px] font-black text-gray-400">
                    لا توجد بيانات
                  </div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={techSummary.chartData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={45}
                      outerRadius={70}
                      label={renderDonutLabel}
                      labelLine={false}
                    >
                      {techSummary.chartData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="flex flex-wrap justify-center gap-3 mt-2 text-[10px] font-bold text-gray-500">
              {techSummary.chartData.map((item) => (
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

      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
          <input type="text" placeholder="البحث..." className="w-full pr-12 pl-4 py-3 bg-gray-50 rounded-xl border border-transparent focus:border-[#1B2B48] outline-none font-bold text-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}/>
        </div>
      </div>

      <div className="bg-white rounded-[30px] border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-gray-50/50 border-b border-gray-100">
              <tr>
                {!filteredByProject && <th className="p-6 text-xs font-black text-gray-400 uppercase tracking-widest">المشروع</th>}
                <th className="p-6 text-xs font-black text-gray-400 uppercase tracking-widest">بيان العمل</th>
                <th className="p-6 text-xs font-black text-gray-400 uppercase tracking-widest">جهة المراجعة</th>
                <th className="p-6 text-xs font-black text-gray-400 uppercase tracking-widest">الإنجاز</th>
                <th className="p-6 text-xs font-black text-gray-400 uppercase tracking-widest">الحالة</th>
                <th className="p-6"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredRequests?.map(req => (
                <tr key={req?.id} className="hover:bg-gray-50 transition-colors cursor-pointer group" onClick={() => {setActiveRequest(req); setIsManageModalOpen(true);}}>
                    {!filteredByProject && <td className="p-6"><p className="font-black text-[#1B2B48] text-sm">{req?.project_name}</p></td>}
                    <td className="p-6"><div className="flex items-center gap-3"><Zap size={16} className="text-[#E95D22]"/><p className="font-bold text-gray-700 text-sm">{req?.service_type}</p></div></td>
                    <td className="p-6 text-sm text-gray-400 font-bold">{req?.reviewing_entity || '-'}</td>
                    <td className="p-6 w-48"><div className="flex items-center gap-2"><div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all duration-1000 ${req?.progress === 100 ? 'bg-green-500' : 'bg-[#E95D22]'}`} style={{width:`${req?.progress || 0}%`}}/></div><span className="text-[10px] font-black text-gray-400">{req?.progress || 0}%</span></div></td>
                    <td className="p-6"><span className={`px-3 py-1 rounded-full text-[10px] font-black border ${req?.status === 'completed' || req?.status === 'منجز' || req?.status === 'approved' ? 'bg-green-50 text-green-700 border-green-100' : req?.status === 'rejected' || req?.status === 'مرفوض' ? 'bg-red-50 text-red-700 border-red-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>{STATUS_OPTIONS.find(o => o.value === req?.status)?.label || req?.status}</span></td>
                    <td className="p-6 text-left"><ChevronLeft size={18} className="text-gray-300 opacity-0 group-hover:opacity-100" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isAddModalOpen} onClose={()=>setIsAddModalOpen(false)} title={techForm.id ? "تعديل الطلب" : "إضافة طلب"}>
        <div className="space-y-4 text-right">
          <div>
            <label className="text-xs text-gray-400 font-bold block mb-1">المشروع</label>
            <select className="w-full p-4 bg-gray-50 border rounded-2xl font-bold outline-none" value={techForm.project_id} onChange={e=>setTechForm({...techForm, project_id:e.target.value})} disabled={!!filteredByProject}>
              <option value="">اختر المشروع...</option>
              {(projects || []).map(p=><option key={p?.id} value={p?.id}>{p?.id} - {p?.name || p?.title}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 font-bold block mb-1">نوع الطلب</label>
              <select className="w-full p-4 bg-gray-50 border rounded-2xl font-bold outline-none" value={techForm.service_type} onChange={e=>setTechForm({...techForm, service_type:e.target.value})}>
                <option value="">اختر...</option>
                {TECHNICAL_SERVICE_OPTIONS.map((option)=><option key={option} value={option}>{option}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 font-bold block mb-1">جهة المراجعة</label>
              <select className="w-full p-4 bg-gray-50 border rounded-2xl font-bold outline-none" value={techForm.reviewing_entity} onChange={e=>setTechForm({...techForm, reviewing_entity:e.target.value})}>
                <option value="">اختر...</option>
                {REVIEW_ENTITIES.map(e=><option key={e} value={e}>{e}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400 font-bold block mb-1">وصف الطلب</label>
            <textarea className="w-full p-4 bg-gray-50 border rounded-2xl font-bold outline-none text-sm min-h-[100px] resize-none focus:border-[#1B2B48] transition-colors" placeholder="اكتب وصف أو تفاصيل الطلب..." value={techForm.details} onChange={e=>setTechForm({...techForm, details:e.target.value})}/>
          </div>
          <button onClick={handleSubmit} disabled={isUploading} className="w-full bg-[#1B2B48] text-white py-5 rounded-[25px] font-black shadow-xl hover:brightness-110 transition-all">{isUploading ? 'جاري الحفظ...' : 'حفظ البيانات'}</button>
        </div>
      </Modal>

      {activeRequest && (
        <ManageRequestModal isOpen={isManageModalOpen} onClose={()=>setIsManageModalOpen(false)} request={activeRequest} currentUser={currentUser} usersList={usersList || []} onUpdateStatus={updateStatus} onUpdateDelegation={() => {}}/>
      )}
    </div>
  );
};

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

export default TechnicalModule;