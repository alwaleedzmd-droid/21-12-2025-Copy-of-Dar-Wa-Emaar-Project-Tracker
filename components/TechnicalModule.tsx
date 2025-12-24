
import React, { useState, useEffect } from 'react';
import { 
  Plus, CheckCircle2, XCircle, AlertCircle, ShieldCheck, 
  Activity, Calendar, User as UserIcon, Building2, Zap, 
  Briefcase, FileText, Clock, Send, Edit3, MapPin, Landmark,
  Hash, Info, LayoutList
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { User, TechnicalRequest, ProjectSummary, Comment } from '../types';
import { TECHNICAL_ENTITY_MAPPING } from '../constants';
import Modal from './Modal';
import ManageRequestModal from './ManageRequestModal';

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
  // Modals State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [activeRequest, setActiveRequest] = useState<TechnicalRequest | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);

  // Form State
  const [techForm, setTechForm] = useState({
    project_name: filteredByProject || '',
    scope: scopeFilter === 'INTERNAL_WORK' ? 'INTERNAL_WORK' : '',
    entity: scopeFilter === 'INTERNAL_WORK' ? 'إدارة المشروع' : '',
    service_type: '',
    requesting_entity: '',
    details: '',
    deadline: ''
  });

  const canAction = (roles: string[]) => currentUser && roles.includes(currentUser.role);

  // Status Badge Helper
  const getStatusBadge = (status: string) => {
    const baseClasses = "px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 w-fit transition-all shadow-sm";
    switch(status) {
      case 'completed': case 'منجز': 
        return <span className={`${baseClasses} bg-green-100 text-green-700`}><CheckCircle2 size={12}/> منجز</span>;
      case 'rejected': case 'مرفوض': 
        return <span className={`${baseClasses} bg-red-100 text-red-700`}><XCircle size={12}/> مرفوض</span>;
      case 'pending_modification': case 'تعديل': 
        return <span className={`${baseClasses} bg-orange-100 text-orange-700`}><AlertCircle size={12}/> مطلوب تعديل</span>;
      case 'pending_pr': 
        return <span className={`${baseClasses} bg-indigo-100 text-indigo-700`}><ShieldCheck size={12}/> بانتظار الاعتماد</span>;
      case 'new': 
        return <span className={`${baseClasses} bg-blue-100 text-blue-700`}><Activity size={12}/> جديد</span>;
      default: 
        return <span className={`${baseClasses} bg-blue-50 text-blue-700`}>قيد المراجعة</span>;
    }
  };

  const fetchComments = async (requestId: string) => {
    const { data, error } = await supabase
      .from('comments')
      .select('*, profiles(name)')
      .eq('technical_request_id', requestId)
      .order('created_at', { ascending: true });
    
    if (!error && data) {
      setComments(data.map(c => ({
        id: c.id,
        text: c.content,
        author: c.profiles?.name || 'مجهول',
        created_at: c.created_at,
        author_role: '',
        request_id: requestId
      })));
    }
  };

  useEffect(() => {
    if (activeRequest) fetchComments(activeRequest.id);
  }, [activeRequest]);

  const handleAddSubmit = async () => {
    if (!techForm.project_name || !techForm.service_type) return alert("المشروع ونوع العمل مطلوبان");
    
    const payload = {
      ...techForm,
      entity: techForm.scope === 'INTERNAL_WORK' ? 'إدارة المشروع' : techForm.scope,
      submitted_by: currentUser?.name,
      status: 'new',
      deadline: techForm.deadline || null
    };

    const { error } = await supabase.from('technical_requests').insert([payload]);

    if (!error) {
      alert("تم حفظ الطلب الفني بنجاح");
      setIsAddModalOpen(false);
      setTechForm({
        project_name: filteredByProject || '',
        scope: scopeFilter === 'INTERNAL_WORK' ? 'INTERNAL_WORK' : '',
        entity: scopeFilter === 'INTERNAL_WORK' ? 'إدارة المشروع' : '',
        service_type: '',
        requesting_entity: '',
        details: '',
        deadline: ''
      });
      onRefresh();
    } else {
      alert(error.message);
    }
  };

  const updateStatus = async (newStatus: string) => {
    if (!activeRequest) return;
    const { error } = await supabase.from('technical_requests').update({ status: newStatus }).eq('id', activeRequest.id);
    if (!error) {
      setActiveRequest({ ...activeRequest, status: newStatus } as any);
      onRefresh();
      alert("تم تحديث الحالة");
    }
  };

  const updateDelegation = async (assignedTo: string) => {
    if (!activeRequest) return;
    const { error } = await supabase.from('technical_requests').update({ assigned_to: assignedTo }).eq('id', activeRequest.id);
    if (!error) {
      setActiveRequest({ ...activeRequest, assigned_to: assignedTo } as any);
      onRefresh();
    }
  };

  const postComment = async (content: string) => {
    if (!activeRequest) return;
    const { error } = await supabase.from('comments').insert([{
      content,
      user_id: currentUser?.id,
      technical_request_id: activeRequest.id
    }]);
    if (!error) fetchComments(activeRequest.id);
  };

  const displayRequests = requests.filter(r => {
    const projectMatch = filteredByProject ? r.project_name === filteredByProject : true;
    if (!projectMatch) return false;
    
    if (scopeFilter === 'INTERNAL_WORK') return r.scope === 'INTERNAL_WORK';
    if (scopeFilter === 'EXTERNAL') return r.scope !== 'INTERNAL_WORK';
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="font-black text-2xl text-[#1B2B48]">
          {scopeFilter === 'INTERNAL_WORK' ? 'سجل أعمال المشروع الداخلية' : 'سجل الطلبات والمراجعات الفنية'}
        </h3>
        {canAction(['ADMIN', 'TECHNICAL', 'PR_MANAGER']) && (
          <button 
            onClick={() => setIsAddModalOpen(true)} 
            className={`text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-md hover:scale-105 transition-all active:scale-95 ${scopeFilter === 'INTERNAL_WORK' ? 'bg-[#1B2B48]' : 'bg-[#E95D22]'}`}
          >
            <Plus size={18} /> {scopeFilter === 'INTERNAL_WORK' ? 'إضافة عمل' : 'طلب مراجعة'}
          </button>
        )}
      </div>

      <div className="bg-white rounded-[40px] shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-right">
          <thead className="bg-gray-50 border-b">
            <tr>
              {!filteredByProject && <th className="p-6 text-xs text-gray-400 font-bold">المشروع</th>}
              <th className="p-6 text-xs text-gray-400 font-bold">{scopeFilter === 'INTERNAL_WORK' ? 'العمل / المهمة' : 'جهة المراجعة'}</th>
              {scopeFilter !== 'INTERNAL_WORK' && <th className="p-6 text-xs text-gray-400 font-bold">بيان العمل</th>}
              <th className="p-6 text-xs text-gray-400 font-bold">المسؤول</th>
              <th className="p-6 text-xs text-gray-400 font-bold">الحالة</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {displayRequests.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-20 text-center text-gray-300 italic font-bold">
                  لا توجد طلبات مسجلة
                </td>
              </tr>
            ) : (
              displayRequests.map(r => (
                <tr 
                  key={r.id} 
                  onClick={() => { setActiveRequest(r); setIsManageModalOpen(true); }} 
                  className="hover:bg-gray-50/80 cursor-pointer transition-colors group"
                >
                  {!filteredByProject && <td className="p-6 font-bold text-[#1B2B48]">{r.project_name}</td>}
                  <td className="p-6 font-bold text-[#1B2B48]">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-lg ${r.scope === 'INTERNAL_WORK' ? 'bg-indigo-50 text-indigo-600' : 'bg-orange-50 text-orange-600'}`}>
                        {r.scope === 'INTERNAL_WORK' ? <Briefcase size={14}/> : <Landmark size={14}/>}
                      </div>
                      {r.scope === 'INTERNAL_WORK' ? r.service_type : r.scope}
                    </div>
                  </td>
                  {scopeFilter !== 'INTERNAL_WORK' && <td className="p-6 text-sm text-gray-500 font-bold">{r.service_type}</td>}
                  <td className="p-6 text-sm text-gray-400 font-bold">
                    <div className="flex items-center gap-2">
                       <UserIcon size={12} className="text-gray-300" />
                       {r.assigned_to || <span className="text-gray-200 italic">غير محدد</span>}
                    </div>
                  </td>
                  <td className="p-6">{getStatusBadge(r.status)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* --- Add Tech Request Modal --- */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title={scopeFilter === 'INTERNAL_WORK' ? "إضافة عمل مشروع داخلي" : "إضافة طلب مراجعة فني"}>
        <div className="space-y-4 text-right overflow-visible">
          <div>
            <label className="text-xs text-gray-400 font-bold block mb-1">المشروع</label>
            <div className="relative">
              <Building2 className="absolute right-3 top-4 text-gray-300 w-4 h-4" />
              <select 
                className="w-full p-4 pr-10 bg-gray-50 rounded-2xl border outline-none font-bold appearance-none hover:border-[#E95D22] transition-colors" 
                value={techForm.project_name} 
                onChange={e => setTechForm({...techForm, project_name: e.target.value})}
                disabled={!!filteredByProject}
              >
                <option value="">اختر المشروع...</option>
                {projects.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
              </select>
            </div>
          </div>

          {scopeFilter !== 'INTERNAL_WORK' ? (
            <>
              <div>
                <label className="text-xs text-gray-400 font-bold block mb-1">جهة المراجعة</label>
                <div className="relative">
                  <Landmark className="absolute right-3 top-4 text-gray-300 w-4 h-4" />
                  <select 
                    className="w-full p-4 pr-10 bg-gray-50 rounded-2xl border outline-none font-bold appearance-none hover:border-[#E95D22] transition-colors" 
                    value={techForm.scope} 
                    onChange={e => setTechForm({...techForm, scope: e.target.value, entity: e.target.value})}
                  >
                    <option value="">اختر جهة المراجعة...</option>
                    {Object.keys(TECHNICAL_ENTITY_MAPPING).map(k => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 font-bold block mb-1">بيان الأعمال</label>
                <div className="relative">
                  <Zap className="absolute right-3 top-4 text-gray-300 w-4 h-4" />
                  <select 
                    className="w-full p-4 pr-10 bg-gray-50 rounded-2xl border outline-none font-bold appearance-none hover:border-[#E95D22] transition-colors" 
                    value={techForm.service_type} 
                    onChange={e => setTechForm({...techForm, service_type: e.target.value})} 
                    disabled={!techForm.scope}
                  >
                    <option value="">اختر نوع العمل...</option>
                    {techForm.scope && TECHNICAL_ENTITY_MAPPING[techForm.scope]?.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </>
          ) : (
            <div>
              <label className="text-xs text-gray-400 font-bold block mb-1">بيان العمل</label>
              <div className="relative">
                <Briefcase className="absolute right-3 top-4 text-gray-300 w-4 h-4" />
                <input 
                  type="text" 
                  className="w-full p-4 pr-10 bg-gray-50 rounded-2xl border outline-none font-bold hover:border-[#E95D22] transition-colors" 
                  placeholder="مثال: مراجعة المخططات، تسوية الأرض..." 
                  value={techForm.service_type} 
                  onChange={e => setTechForm({...techForm, service_type: e.target.value})} 
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-xs text-gray-400 font-bold block mb-1">الجهة طالبة الخدمة</label>
            <div className="relative">
              <UserIcon className="absolute right-3 top-4 text-gray-300 w-4 h-4" />
              <input 
                type="text" 
                placeholder="مثال: إدارة المشاريع، المبيعات..."
                className="w-full p-4 pr-10 bg-gray-50 rounded-2xl border outline-none font-bold hover:border-[#E95D22] transition-colors" 
                value={techForm.requesting_entity} 
                onChange={e => setTechForm({...techForm, requesting_entity: e.target.value})} 
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-400 font-bold block mb-1">الوصف والتفاصيل</label>
            <div className="relative">
              <FileText className="absolute right-3 top-4 text-gray-300 w-4 h-4" />
              <textarea 
                rows={3} 
                placeholder="وصف تفصيلي للطلب..."
                className="w-full p-4 pr-10 bg-gray-50 rounded-2xl border outline-none font-bold resize-none hover:border-[#E95D22] transition-colors" 
                value={techForm.details} 
                onChange={e => setTechForm({...techForm, details: e.target.value})} 
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-400 font-bold block mb-1">تاريخ الاستحقاق</label>
            <div className="relative">
              <Calendar className="absolute right-3 top-4 text-gray-300 w-4 h-4" />
              <input 
                type="date" 
                className="w-full p-4 pr-10 bg-gray-50 rounded-2xl border outline-none font-bold hover:border-[#E95D22] transition-colors" 
                value={techForm.deadline} 
                onChange={e => setTechForm({...techForm, deadline: e.target.value})} 
              />
            </div>
          </div>

          <button 
            onClick={handleAddSubmit} 
            className={`w-full text-white py-5 rounded-[25px] font-black shadow-xl mt-4 hover:brightness-110 transition-all active:scale-95 ${scopeFilter === 'INTERNAL_WORK' ? 'bg-[#1B2B48]' : 'bg-[#E95D22]'}`}
          >
            إرسال الطلب وحفظ
          </button>
        </div>
      </Modal>

      {/* --- Manage Request Modal --- */}
      <ManageRequestModal 
        isOpen={isManageModalOpen}
        onClose={() => setIsManageModalOpen(false)}
        request={activeRequest}
        currentUser={currentUser}
        usersList={usersList}
        onUpdateStatus={updateStatus}
        onUpdateDelegation={updateDelegation}
        onAddComment={postComment}
        comments={comments}
      />
    </div>
  );
};

export default TechnicalModule;
