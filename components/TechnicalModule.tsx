import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router';
import { 
  Plus, MoreHorizontal, Trash2, Edit, FileText, 
  Building2, AlignLeft, CheckCircle2, Paperclip, 
  FileUp, Sheet, Search, Filter, Zap, ChevronLeft, Loader2
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { TechnicalRequest, ProjectSummary, User } from '../types';
import { notificationService } from '../services/notificationService';
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

const RAW_WORK_STATEMENTS = [
  "فرز صكوك", "شبكات الري", "نظام البناء", "كهرباء ",
  "الترخيص البيئي", "بلاغ شرطة", "ربط شبكة المياه", "نقل ملكية عدادات الكهرباء",
  "سرقة سيارة/معدات", "شهادة إتمام بناء (الأشغال)", "إصدار رخص بناء", "طلب فتح خدمة الكهرباء",
  "سرقة كيابل", "سرقة مفاتيح/فصالات", "تعاقدات ", "اعتماد جامع/مسجد", "طلب استثناء",
  "تعديل بيانات المالك", "رفع الحجز عن الصكوك", "تركيب عدادات", "فصل رخص البناء", "أخرى"
];

const REVIEW_ENTITIES = Array.from(new Set(RAW_REVIEW_ENTITIES));
const WORK_STATEMENTS = Array.from(new Set(RAW_WORK_STATEMENTS));

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

      notificationService.send('TECHNICAL', `تم استيراد ${data.length} طلب فني جديد عبر إكسل`, '/technical', currentUser?.name || 'النظام');
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
    const payload = {
      project_id: parseInt(techForm.project_id),
      scope: scopeFilter || 'EXTERNAL',
      service_type: techForm.service_type, 
      reviewing_entity: techForm.reviewing_entity,
      requesting_entity: techForm.requesting_entity || currentUser?.name, 
      details: techForm.details,
      status: techForm.status, 
      progress: techForm.progress,
      project_name: selectedProj ? (selectedProj?.name || selectedProj?.title) : '',
      attachment_url: finalAttachmentUrl,
      submitted_by: currentUser?.name
    };

    try {
      if (techForm.id === 0) {
        const { error } = await supabase.from('technical_requests').insert([payload]);
        if (error) throw error;
        // إشعار بدون await لعدم تأثيره على الحفظ
        notificationService.send('TECHNICAL', `طلب فني جديد: ${techForm.service_type} لمشروع ${selectedProj?.name}`, '/technical', currentUser?.name || 'الإدارة').catch(() => {});
      } else {
        const { error } = await supabase.from('technical_requests').update(payload).eq('id', Number(techForm.id));
        if (error) throw error;
        if (currentUser?.role === 'TECHNICAL') {
            notificationService.send('PR_MANAGER', `تحديث على طلب فني: ${techForm.service_type}`, '/technical', currentUser?.name).catch(() => {});
        }
      }
      setIsAddModalOpen(false);
      await onRefresh();
      alert("تم حفظ البيانات بنجاح ✅");
    } catch (err: any) {
        console.error("❌ خطأ قاعدة البيانات:", err);
        alert("حدث خطأ في قاعدة البيانات:\n" + (err?.message || JSON.stringify(err)));
    } finally { setIsUploading(false); }
  };

  const updateStatus = async (newStatus: string) => {
    if (!activeRequest?.id) return;
    try {
      const updateData: any = { status: newStatus };
      if (newStatus === 'completed' || newStatus === 'منجز') updateData.progress = 100;
      const { error } = await supabase.from('technical_requests').update(updateData).eq('id', Number(activeRequest?.id));
      if (error) throw error;
      
      const targetRole = currentUser?.role === 'TECHNICAL' ? 'PR_MANAGER' : 'TECHNICAL';
      notificationService.send(targetRole, `تغيرت حالة العمل: ${activeRequest.service_type} إلى ${newStatus}`, '/technical', currentUser?.name || 'النظام');

      setActiveRequest({ ...activeRequest, ...updateData });
      await onRefresh();
    } catch (err: any) { alert("فشل تحديث الحالة"); }
  };

  const filteredRequests = (requests || []).filter(r => 
    (r?.project_name?.toLowerCase()?.includes(searchTerm.toLowerCase()) || '') ||
    (r?.service_type?.toLowerCase()?.includes(searchTerm.toLowerCase()) || '') ||
    (r?.reviewing_entity?.toLowerCase()?.includes(searchTerm.toLowerCase()) || '')
  );

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
                onClick={() => excelInputRef.current?.click()}
                disabled={isBulkLoading}
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-50 transition-all shadow-sm"
              >
                {isBulkLoading ? <Loader2 size={18} className="animate-spin" /> : <Sheet size={18} className="text-green-600" />}
                استيراد إكسل
              </button>
              <button onClick={openAddModal} className="flex items-center gap-2 px-6 py-2.5 bg-[#1B2B48] text-white rounded-xl font-black text-sm hover:brightness-110 shadow-lg transition-all active:scale-95">
                <Plus size={20} /> إضافة عمل يدوي
              </button>
            </>
          )}
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
                    <td className="p-6"><span className={`px-3 py-1 rounded-full text-[10px] font-black border ${req?.status === 'completed' || req?.status === 'منجز' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>{STATUS_OPTIONS.find(o => o.value === req?.status)?.label || req?.status}</span></td>
                    <td className="p-6 text-left"><ChevronLeft size={18} className="text-gray-300 opacity-0 group-hover:opacity-100" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isAddModalOpen} onClose={()=>setIsAddModalOpen(false)} title={techForm.id ? "تعديل العمل" : "إضافة عمل فني"}>
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
              <label className="text-xs text-gray-400 font-bold block mb-1">نوع العمل</label>
              <select className="w-full p-4 bg-gray-50 border rounded-2xl font-bold outline-none" value={techForm.service_type} onChange={e=>setTechForm({...techForm, service_type:e.target.value})}>
                <option value="">اختر...</option>
                {WORK_STATEMENTS.map(s=><option key={s} value={s}>{s}</option>)}
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

export default TechnicalModule;