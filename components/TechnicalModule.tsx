import React, { useState } from 'react';
import { Plus, MoreHorizontal, Trash2, Edit } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { TechnicalRequest, ProjectSummary, User } from '../types';
import Modal from './Modal';
import ManageRequestModal from './ManageRequestModal';

const REVIEW_ENTITIES = ["وزارة الإسكان", "الشركة الوطنية للإسكان", "أمانة منطقة الرياض", "الشركة السعودية للكهرباء", "أخرى"];
const WORK_STATEMENTS = ["إفراغات وحدات", "فرز صكوك", "رخص بناء", "أخرى"];
const STATUS_OPTIONS = [{ value: 'new', label: 'جديد' }, { value: 'pending', label: 'متابعة' }, { value: 'completed', label: 'منجز' }, { value: 'rejected', label: 'مرفوض' }];

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

  const [techForm, setTechForm] = useState({
    id: 0, project_id: '', service_type: '', reviewing_entity: '', requesting_entity: '', details: '', status: 'new', progress: 0
  });

  const openAddModal = () => {
    const proj = filteredByProject ? projects.find(p => p.client === filteredByProject || p.title === filteredByProject) : null;
    setTechForm({ id: 0, project_id: proj ? proj.id.toString() : '', service_type: '', reviewing_entity: '', requesting_entity: '', details: '', status: 'new', progress: 0 });
    setIsAddModalOpen(true);
  };

  const openEditModal = (req: TechnicalRequest) => {
    setTechForm({
      id: req.id, project_id: req.project_id.toString(), service_type: req.service_type, reviewing_entity: req.reviewing_entity || '', 
      requesting_entity: req.requesting_entity || '', details: req.details, status: req.status, progress: req.progress || 0
    });
    setIsAddModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("حذف العمل؟")) return;
    const { error } = await supabase.from('technical_requests').delete().eq('id', id);
    if (!error) onRefresh();
  };

  const handleSubmit = async () => {
    if (!techForm.project_id || !techForm.service_type) return alert("الحقول مطلوبة");
    const selectedProj = projects.find(p => p.id.toString() === techForm.project_id);
    const payload = {
      project_id: techForm.project_id, scope: scopeFilter || 'EXTERNAL', service_type: techForm.service_type, 
      reviewing_entity: techForm.reviewing_entity, requesting_entity: techForm.requesting_entity, details: techForm.details,
      status: techForm.status, progress: techForm.progress, project_name: selectedProj ? (selectedProj.client || selectedProj.title) : ''
    };

    if (techForm.id === 0) await supabase.from('technical_requests').insert([payload]);
    else await supabase.from('technical_requests').update(payload).eq('id', techForm.id);
    
    setIsAddModalOpen(false);
    onRefresh();
  };

  // ✅ الدالة المصححة لتحديث الحالة
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

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black text-[#1B2B48]">{scopeFilter === 'INTERNAL_WORK' ? 'أعمال داخلية' : 'مراجعات فنية'}</h2>
        <button onClick={openAddModal} className="bg-[#1B2B48] text-white px-6 py-3 rounded-[20px] font-bold shadow-lg flex items-center gap-2 hover:scale-105 transition-all"><Plus size={20} /> إضافة عمل</button>
      </div>

      <div className="bg-white rounded-[30px] border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-right">
          <thead className="bg-gray-50 text-gray-500 font-bold text-sm">
            <tr>
              {!filteredByProject && <th className="p-5">المشروع</th>}
              <th className="p-5">البيان</th>
              <th className="p-5">الجهة</th>
              <th className="p-5">الإنجاز</th>
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
                  <td className="p-5 w-48"><div className="flex items-center gap-2"><span className="text-[10px] font-black w-8">{req.progress}%</span><div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden"><div className={`h-full rounded-full ${req.progress===100?'bg-green-500':'bg-[#E95D22]'}`} style={{width:`${req.progress}%`}}/></div></div></td>
                  <td className="p-5"><span className={`px-3 py-1 rounded-full text-[10px] font-black ${req.status==='completed'?'bg-green-100 text-green-700':'bg-blue-100 text-blue-700'}`}>{req.status==='completed'?'منجز':req.status==='new'?'جديد':'متابعة'}</span></td>
                  <td className="p-5 flex gap-2" onClick={e=>e.stopPropagation()}><button onClick={()=>openEditModal(req)} className="p-2 bg-gray-50 text-gray-600 rounded-xl hover:bg-gray-200"><Edit size={18}/></button><button onClick={()=>handleDelete(req.id)} className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100"><Trash2 size={18}/></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isAddModalOpen} onClose={()=>setIsAddModalOpen(false)} title="عمل فني جديد">
         {/* ... نفس محتوى المودال السابق ... */}
         <div className="space-y-4 text-right">
            <div><label className="text-gray-400 text-xs font-bold block mb-1">المشروع</label><select className="w-full p-4 bg-gray-50 rounded-2xl border outline-none font-bold" value={techForm.project_id} onChange={e=>setTechForm({...techForm, project_id:e.target.value})} disabled={!!filteredByProject}><option value="">اختر...</option>{projects.map(p=><option key={p.id} value={p.id}>{p.client || p.title}</option>)}</select></div>
            <div><label className="text-gray-400 text-xs font-bold block mb-1">البيان</label><input className="w-full p-4 bg-gray-50 rounded-2xl border outline-none font-bold" value={techForm.service_type} onChange={e=>setTechForm({...techForm, service_type:e.target.value})}/></div>
            <button onClick={handleSubmit} className="w-full bg-[#1B2B48] text-white py-5 rounded-[25px] font-black shadow-xl">حفظ</button>
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