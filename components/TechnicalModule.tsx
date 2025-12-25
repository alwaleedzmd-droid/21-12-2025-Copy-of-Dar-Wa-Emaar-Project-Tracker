
import React, { useState, useEffect } from 'react';
import { Plus, MoreHorizontal, Trash2, Edit } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { TechnicalRequest, ProjectSummary, User } from '../types';
import Modal from './Modal';
import ManageRequestModal from './ManageRequestModal';

const REVIEW_ENTITIES = [
  "وزارة الإسكان", "الشركة الوطنية للإسكان", "أمانة منطقة الرياض", "الشركة السعودية للكهرباء",
  "المركز الوطني للرقابة على الالتزام البيئي", "شرطة العارض", "شركة المياه الوطنية", "بلدية شمال الرياض",
  "وزارة الشؤون الإسلامية", "أمانة محافظة جدة", "بلدية العقيق", "الدفاع المدني", "أمانة المنطقة الشرقية",
  "بلدية صفوى", "بلدية شرق الدمام", "أمانة العاصمة المقدسة", "الهيئة الملكية لتطوير الرياض", "أخرى"
];

const WORK_STATEMENTS = [
  "معاملة إفراغات وحدات", "فرز صكوك", "تسليم شبكات الري", "نظام البناء", "كهرباء عمائر",
  "الترخيص البيئي", "مراجعة بلاغ شرطة", "ربط شبكة المياه", "نقل ملكية عدادات الكهرباء",
  "سرقة سيارة/معدات", "شهادة إتمام بناء (الأشغال)", "إصدار رخص بناء", "طلب فتح خدمة الكهرباء",
  "سرقة كيابل", "سرقة مفاتيح/فصالات", "إصدار رخص هدم", "اعتماد جامع/مسجد", "طلب استثناء",
  "تعديل بيانات المالك", "رفع الحجز عن الصكوك", "تركيب عدادات", "فصل رخص البناء", "أخرى"
];

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
  requests, 
  projects, 
  currentUser, 
  usersList, 
  onRefresh, 
  filteredByProject,
  scopeFilter 
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [activeRequest, setActiveRequest] = useState<TechnicalRequest | null>(null);

  const [techForm, setTechForm] = useState({
    id: 0, 
    project_id: '', 
    service_type: '', 
    reviewing_entity: '', 
    requesting_entity: '', 
    details: '', 
    status: 'new', 
    progress: 0
  });

  const openAddModal = () => {
    const projId = filteredByProject ? projects.find(p => p.name === filteredByProject || p.title === filteredByProject)?.id.toString() : '';
    setTechForm({ 
      id: 0, 
      project_id: projId || '', 
      service_type: '', 
      reviewing_entity: '', 
      requesting_entity: '', 
      details: '', 
      status: 'new', 
      progress: 0 
    });
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
      progress: req.progress || 0
    });
    setIsAddModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا العمل؟")) return;
    const { error } = await supabase.from('technical_requests').delete().eq('id', id);
    if (!error) onRefresh();
  };

  const handleStatusChange = (newStatus: string) => {
    let newProgress = techForm.progress;
    if (newStatus === 'completed' || newStatus === 'منجز') newProgress = 100;
    setTechForm({ ...techForm, status: newStatus, progress: newProgress });
  };

  const handleProgressChange = (val: number) => {
    let newStatus = techForm.status;
    if (val === 100) newStatus = 'completed';
    else if ((newStatus === 'completed' || newStatus === 'منجز') && val < 100) newStatus = 'pending';
    setTechForm({ ...techForm, progress: val, status: newStatus });
  };

  const handleSubmit = async () => {
    if (!techForm.project_id || !techForm.service_type) return alert("يرجى ملء جميع الحقول الإلزامية");
    
    const payload = {
      project_id: parseInt(techForm.project_id),
      scope: scopeFilter || 'EXTERNAL',
      service_type: techForm.service_type, 
      reviewing_entity: techForm.reviewing_entity,
      requesting_entity: techForm.requesting_entity, 
      details: techForm.details,
      status: techForm.status, 
      progress: techForm.progress,
      project_name: projects.find(p => p.id.toString() === techForm.project_id)?.title || projects.find(p => p.id.toString() === techForm.project_id)?.client
    };

    if (techForm.id === 0) {
      const { error } = await supabase.from('technical_requests').insert([payload]);
      if (error) alert(error.message);
    } else {
      const { error } = await supabase.from('technical_requests').update(payload).eq('id', techForm.id);
      if (error) alert(error.message);
    }
    
    setIsAddModalOpen(false);
    onRefresh();
  };

  const updateStatus = async (newStatus: string) => {
    if (!activeRequest) return;
    const updateData: any = { status: newStatus };
    if (newStatus === 'completed') updateData.progress = 100;
    
    const { error } = await supabase.from('technical_requests').update(updateData).eq('id', activeRequest.id);
    if (!error) {
      onRefresh();
      setIsManageModalOpen(false);
    }
  };

  const updateDelegation = async (assignedTo: string) => {
    if (!activeRequest) return;
    const { error } = await supabase.from('technical_requests').update({ assigned_to: assignedTo }).eq('id', activeRequest.id);
    if (!error) onRefresh();
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
              <th className="p-5">الحالة</th>
              <th className="p-5">خيارات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {requests.map(req => {
              const proj = projects.find(p => p.id === req.project_id);
              return (
                <tr key={req.id} className="hover:bg-blue-50/50 transition cursor-pointer" onClick={() => {setActiveRequest(req); setIsManageModalOpen(true);}}>
                  {!filteredByProject && <td className="p-5 font-bold text-[#1B2B48]">{proj?.client || proj?.title}</td>}
                  <td className="p-5 text-gray-600 font-bold">{req.service_type}</td>
                  <td className="p-5 text-gray-400 text-xs font-bold">{req.reviewing_entity || '-'}</td>
                  <td className="p-5 w-48" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black w-8 text-gray-400">{req.progress}%</span>
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-500 ${req.progress === 100 ? 'bg-green-500' : req.progress > 50 ? 'bg-amber-500' : 'bg-[#E95D22]'}`} style={{width:`${req.progress}%`}}/>
                      </div>
                    </div>
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
              );
            })}
            {requests.length === 0 && (
              <tr>
                <td colSpan={6} className="p-20 text-center text-gray-300 italic font-bold">لا توجد سجلات حالياً</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isAddModalOpen} onClose={()=>setIsAddModalOpen(false)} title={techForm.id ? "تعديل بيانات العمل" : "إضافة عمل فني جديد"}>
        <div className="space-y-4 text-right font-cairo overflow-visible">
          <div>
            <label className="text-gray-400 text-xs font-bold block mb-1">المشروع</label>
            <select className="w-full p-4 bg-gray-50 rounded-2xl border outline-none font-bold" value={techForm.project_id} onChange={e=>setTechForm({...techForm, project_id:e.target.value})} disabled={!!filteredByProject}>
              <option value="">اختر المشروع...</option>
              {projects.map(p=><option key={p.id} value={p.id}>{p.client || p.title}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-gray-400 text-xs font-bold block mb-1">بيان العمل</label>
              <select className="w-full p-4 bg-gray-50 rounded-2xl border outline-none font-bold" value={techForm.service_type} onChange={e=>setTechForm({...techForm, service_type:e.target.value})}>
                <option value="">اختر نوع العمل...</option>
                {WORK_STATEMENTS.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-gray-400 text-xs font-bold block mb-1">جهة المراجعة</label>
              <select className="w-full p-4 bg-gray-50 rounded-2xl border outline-none font-bold" value={techForm.reviewing_entity} onChange={e=>setTechForm({...techForm, reviewing_entity:e.target.value})}>
                <option value="">اختر الجهة...</option>
                {REVIEW_ENTITIES.map(e=><option key={e} value={e}>{e}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
             <div>
               <label className="text-gray-400 text-xs font-bold block mb-1">الجهة طالبة الخدمة</label>
               <input className="w-full p-4 bg-gray-50 rounded-2xl border outline-none font-bold" value={techForm.requesting_entity} onChange={e=>setTechForm({...techForm, requesting_entity:e.target.value})} placeholder="مثال: المبيعات"/>
             </div>
             <div>
               <label className="text-gray-400 text-xs font-bold block mb-1">الحالة</label>
               <select className="w-full p-4 bg-gray-50 rounded-2xl border outline-none font-bold" value={techForm.status} onChange={e=>handleStatusChange(e.target.value)}>
                 {STATUS_OPTIONS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
               </select>
             </div>
          </div>
          <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 shadow-inner">
            <div className="flex justify-between items-center mb-4">
              <label className="text-gray-400 font-bold text-xs uppercase tracking-wider">نسبة الإنجاز</label>
              <span className="text-[#E95D22] font-black text-xl">{techForm.progress}%</span>
            </div>
            <input type="range" min="0" max="100" step="5" className="w-full accent-[#E95D22] h-2 bg-gray-200 rounded-lg cursor-pointer appearance-none" value={techForm.progress} onChange={e=>handleProgressChange(parseInt(e.target.value))}/>
          </div>
          <div>
            <label className="text-gray-400 text-xs font-bold block mb-1">تفاصيل وملاحظات</label>
            <textarea rows={3} className="w-full p-4 bg-gray-50 rounded-2xl border outline-none font-bold resize-none" value={techForm.details} onChange={e=>setTechForm({...techForm, details:e.target.value})} placeholder="اكتب أي ملاحظات إضافية هنا..."/>
          </div>
          <button onClick={handleSubmit} className="w-full bg-[#1B2B48] text-white py-5 rounded-[25px] font-black shadow-xl hover:brightness-110 hover:-translate-y-1 transition-all active:scale-95">حفظ البيانات</button>
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
