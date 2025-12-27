import React, { useState } from 'react';
import { Plus, MoreHorizontal, Trash2, Edit, FileText, Building2, AlignLeft, CheckCircle2, Paperclip, Download } from 'lucide-react'; // أضفت أيقونات جديدة
import { supabase } from '../supabaseClient';
import { TechnicalRequest, ProjectSummary, User } from '../types';
import Modal from './Modal';
import ManageRequestModal from './ManageRequestModal';

// 1. القوائم الثابتة
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
  { value: 'completed', label: 'منجز' },
  { value: 'rejected', label: 'مرفوض' }
];

interface TechnicalModuleProps {
  requests: TechnicalRequest[];
  projects: ProjectSummary[];
  currentUser: User | null;
  usersList: any[];
  onRefresh: () => void;
  filteredByProject?: string;
  scopeFilter?: 'INTERNAL_WORK' | 'EXTERNAL';
}

const TechnicalModule: React.FC<TechnicalModuleProps> = ({ 
  requests, projects, currentUser, usersList, onRefresh, filteredByProject, scopeFilter 
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [activeRequest, setActiveRequest] = useState<TechnicalRequest | null>(null);
  
  // حالة التحميل (عشان نمنع المستخدم يضغط مرتين وقت الرفع)
  const [isUploading, setIsUploading] = useState(false);

  const [attachment, setAttachment] = useState<File | null>(null);

  const [techForm, setTechForm] = useState({
    id: 0, 
    project_id: '', 
    service_type: '', 
    reviewing_entity: '', 
    requesting_entity: '', 
    details: '', 
    status: 'new', 
    progress: 0,
    attachment_url: '' // حقل لتخزين الرابط القديم في حالة التعديل
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAttachment(e.target.files[0]);
    }
  };

  const openAddModal = () => {
    const proj = filteredByProject ? projects.find(p => p.client === filteredByProject || p.title === filteredByProject) : null;
    setTechForm({ 
      id: 0, 
      project_id: proj ? proj.id.toString() : '', 
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

  const openEditModal = (req: TechnicalRequest) => {
    setTechForm({
      id: req.id, 
      project_id: req.project_id.toString(), 
      service_type: req.service_type,
      reviewing_entity: req.reviewing_entity || '', 
      requesting_entity: req.requesting_entity || '',
      details: req.details, 
      status: req.status, 
      progress: req.progress || 0,
      attachment_url: req['attachment_url'] || '' // استرجاع الرابط الموجود إذا وجد
    });
    setAttachment(null);
    setIsAddModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا العمل؟")) return;
    const { error } = await supabase.from('technical_requests').delete().eq('id', id);
    if (!error) onRefresh();
  };

  // --- دالة الحفظ المعدلة للتعامل مع رفع الملفات ---
  const handleSubmit = async () => {
    if (!techForm.project_id || !techForm.service_type || !techForm.reviewing_entity) return alert("يرجى تعبئة الحقول الأساسية");
    
    setIsUploading(true); // بدء التحميل

    let finalAttachmentUrl = techForm.attachment_url;

    // 1. إذا كان هناك ملف جديد تم اختياره، نقوم برفعه
    if (attachment) {
      const fileExt = attachment.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${fileName}`;

      // الرفع إلى Bucket اسمه 'attachments'
      const { error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(filePath, attachment);

      if (uploadError) {
        alert('حدث خطأ أثناء رفع الملف: ' + uploadError.message);
        setIsUploading(false);
        return;
      }

      // الحصول على الرابط العام
      const { data: { publicUrl } } = supabase.storage
        .from('attachments')
        .getPublicUrl(filePath);

      finalAttachmentUrl = publicUrl;
    }

    const selectedProj = projects.find(p => p.id.toString() === techForm.project_id);

    const payload = {
      project_id: techForm.project_id,
      scope: scopeFilter || 'EXTERNAL',
      service_type: techForm.service_type, 
      reviewing_entity: techForm.reviewing_entity,
      requesting_entity: techForm.requesting_entity, 
      details: techForm.details,
      status: techForm.status, 
      progress: techForm.progress,
      project_name: selectedProj ? (selectedProj.client || selectedProj.title) : '',
      attachment_url: finalAttachmentUrl // حفظ الرابط في قاعدة البيانات
    };

    if (techForm.id === 0) {
      const { error } = await supabase.from('technical_requests').insert([payload]);
      if (error) alert(error.message);
    } else {
      const { error } = await supabase.from('technical_requests').update(payload).eq('id', techForm.id);
      if (error) alert(error.message);
    }
    
    setIsUploading(false); // انتهاء التحميل
    setIsAddModalOpen(false);
    onRefresh();
  };

  const updateStatus = async (newStatus: string) => {
    if (!activeRequest) return;
    const updateData: any = { status: newStatus };
    if (newStatus === 'completed') updateData.progress = 100;
    
    const { error } = await supabase.from('technical_requests').update(updateData).eq('id', activeRequest.id);
    if (!error) {
      setActiveRequest({ ...activeRequest, ...updateData });
      onRefresh();
    }
  };

  const updateDelegation = async (assignedTo: string) => {
    if (!activeRequest) return;
    const { error } = await supabase.from('technical_requests').update({ assigned_to: assignedTo }).eq('id', activeRequest.id);
    if (!error) {
       setActiveRequest({ ...activeRequest, assigned_to: assignedTo });
       onRefresh();
    }
  };

  const canEdit = currentUser?.role === 'ADMIN' || currentUser?.role === 'PR_MANAGER' || currentUser?.role === 'TECHNICAL';
  const canDelete = currentUser?.role === 'ADMIN';

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black text-[#1B2B48]">
          {scopeFilter === 'INTERNAL_WORK' ? 'أعمال المشروع الداخلية' : 'المراجعات والطلبات الفنية'}
        </h2>
        {canEdit && (
          <button onClick={openAddModal} className="bg-[#1B2B48] text-white px-6 py-3 rounded-[20px] font-bold shadow-lg flex items-center gap-2 transition-all hover:scale-105 active:scale-95">
            <Plus size={20} /> إضافة عمل
          </button>
        )}
      </div>

      <div className="bg-white rounded-[30px] border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-right">
          <thead className="bg-gray-50 text-gray-500 font-bold text-sm">
            <tr>
              {!filteredByProject && <th className="p-5">المشروع</th>}
              <th className="p-5">بيان العمل</th>
              <th className="p-5">جهة المراجعة</th>
              <th className="p-5">الإنجاز</th>
              <th className="p-5">المرفقات</th> {/* عمود جديد للمرفقات */}
              <th className="p-5">الحالة</th>
              <th className="p-5">خيارات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {requests.map(req => (
              <tr key={req.id} className="hover:bg-blue-50/50 transition cursor-pointer" onClick={() => {setActiveRequest(req); setIsManageModalOpen(true);}}>
                  {!filteredByProject && <td className="p-5 font-bold text-[#1B2B48]">{req.project_name}</td>}
                  <td className="p-5 text-gray-600 font-bold">{req.service_type}</td>
                  <td className="p-5 text-gray-400 text-xs font-bold">{req.reviewing_entity || '-'}</td>
                  <td className="p-5 w-48">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black w-8 text-gray-400">{req.progress}%</span>
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-500 ${req.progress === 100 ? 'bg-green-500' : req.progress > 50 ? 'bg-amber-500' : 'bg-[#E95D22]'}`} style={{width:`${req.progress}%`}}/>
                      </div>
                    </div>
                  </td>
                  
                  {/* عرض أيقونة المرفق إذا وجد */}
                  <td className="p-5">
                    {req['attachment_url'] ? (
                      <a 
                        href={req['attachment_url']} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center w-8 h-8 bg-gray-100 text-blue-600 rounded-full hover:bg-blue-100 transition-colors"
                        onClick={(e) => e.stopPropagation()} // عشان ما يفتح المودال لما نضغط تحميل
                        title="عرض المرفق"
                      >
                        <Paperclip size={16} />
                      </a>
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
                  </td>

                  <td className="p-5">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black shadow-sm ${req.status === 'completed' || req.status === 'منجز' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {req.status === 'completed' || req.status === 'منجز' ? 'منجز' : (STATUS_OPTIONS.find(o => o.value === req.status)?.label || req.status)}
                    </span>
                  </td>
                  <td className="p-5 flex gap-2" onClick={e => e.stopPropagation()}>
                    <button onClick={()=>{setActiveRequest(req); setIsManageModalOpen(true);}} className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors"><MoreHorizontal size={18}/></button>
                    {canEdit && <button onClick={()=>openEditModal(req)} className="p-2 bg-gray-50 text-gray-600 rounded-xl hover:bg-gray-200 transition-colors"><Edit size={18}/></button>}
                    {canDelete && <button onClick={()=>handleDelete(req.id)} className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors"><Trash2 size={18}/></button>}
                  </td>
              </tr>
            ))}
             {requests.length === 0 && (
              <tr><td colSpan={7} className="p-20 text-center text-gray-300 italic font-bold">لا توجد سجلات حالياً</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isAddModalOpen} onClose={()=>setIsAddModalOpen(false)} title={techForm.id ? "تعديل بيانات العمل" : "إضافة عمل فني جديد"}>
        <div className="space-y-4 text-right font-cairo overflow-visible">
          
          <div>
            <label className="text-gray-400 text-xs font-bold block mb-1">المشروع</label>
            <div className="relative">
               <Building2 className="absolute right-3 top-4 text-gray-300 w-4 h-4" />
               <select className="w-full p-4 pr-10 bg-gray-50 rounded-2xl border outline-none font-bold" value={techForm.project_id} onChange={e=>setTechForm({...techForm, project_id:e.target.value})} disabled={!!filteredByProject}>
                 <option value="">اختر المشروع...</option>
                 {projects.map(p=><option key={p.id} value={p.id}>{p.client || p.title}</option>)}
               </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-gray-400 text-xs font-bold block mb-1">بيان الأعمال</label>
              <div className="relative">
                 <FileText className="absolute right-3 top-4 text-gray-300 w-4 h-4" />
                 <select className="w-full p-4 pr-10 bg-gray-50 rounded-2xl border outline-none font-bold appearance-none" value={techForm.service_type} onChange={e=>setTechForm({...techForm, service_type:e.target.value})}>
                   <option value="">اختر نوع العمل...</option>
                   {WORK_STATEMENTS.map(s=><option key={s} value={s}>{s}</option>)}
                 </select>
              </div>
            </div>

            <div>
              <label className="text-gray-400 text-xs font-bold block mb-1">جهة المراجعة</label>
              <div className="relative">
                 <CheckCircle2 className="absolute right-3 top-4 text-gray-300 w-4 h-4" />
                 <select className="w-full p-4 pr-10 bg-gray-50 rounded-2xl border outline-none font-bold appearance-none" value={techForm.reviewing_entity} onChange={e=>setTechForm({...techForm, reviewing_entity:e.target.value})}>
                   <option value="">اختر الجهة...</option>
                   {REVIEW_ENTITIES.map(e=><option key={e} value={e}>{e}</option>)}
                 </select>
              </div>
            </div>
          </div>

          <div>
            <label className="text-gray-400 text-xs font-bold block mb-1">الوصف / التفاصيل</label>
            <div className="relative">
               <AlignLeft className="absolute right-3 top-4 text-gray-300 w-4 h-4" />
               <textarea 
                 rows={3} 
                 className="w-full p-4 pr-10 bg-gray-50 rounded-2xl border outline-none font-bold resize-none" 
                 value={techForm.details} 
                 onChange={e=>setTechForm({...techForm, details:e.target.value})} 
                 placeholder="اكتب تفاصيل إضافية عن العمل..."
               />
            </div>
          </div>

          <div>
            <label className="text-gray-400 text-xs font-bold block mb-1">المرفقات (اختياري)</label>
            
            <div style={{
              border: '2px dashed #d1d5db',
              borderRadius: '1rem',
              padding: '1.5rem',
              textAlign: 'center',
              cursor: 'pointer',
              position: 'relative',
              backgroundColor: '#f9fafb',
              transition: 'all 0.2s'
            }}>
              
              <input
                type="file"
                accept=".pdf, image/*"
                onChange={handleFileChange}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  opacity: 0,
                  cursor: 'pointer'
                }}
              />

              <div className="flex flex-col items-center justify-center pointer-events-none">
                <svg className="w-8 h-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>

                <p className="text-sm font-bold text-gray-500">
                  {attachment ? (
                    <span className="text-green-600">تم اختيار: {attachment.name}</span>
                  ) : techForm.attachment_url ? (
                    <span className="text-blue-600">يوجد مرفق سابق (اضغط للتغيير)</span>
                  ) : (
                    "اضغط هنا لإرفاق صورة المشكلة أو ملف PDF"
                  )}
                </p>
              </div>

            </div>
          </div>

          <button 
            onClick={handleSubmit} 
            disabled={isUploading}
            className={`w-full text-white py-5 rounded-[25px] font-black shadow-xl transition-all active:scale-95 ${isUploading ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#1B2B48] hover:brightness-110 hover:-translate-y-1'}`}
          >
            {isUploading ? 'جاري الرفع والحفظ...' : 'حفظ البيانات'}
          </button>
        </div>
      </Modal>

      {activeRequest && (
        <ManageRequestModal 
          isOpen={isManageModalOpen} 
          onClose={()=>setIsManageModalOpen(false)} 
          request={activeRequest} 
          currentUser={currentUser} 
          usersList={usersList}
          onUpdateStatus={updateStatus}
          onUpdateDelegation={updateDelegation}
        />
      )}
    </div>
  );
};

export default TechnicalModule;