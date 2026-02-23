import React, { useState } from 'react';
import { 
  Building2, Zap, FileText, MapPin, 
  ArrowLeft, Edit, User as UserIcon, Phone, Briefcase, Droplet, CheckCircle2, Ruler 
} from 'lucide-react';
import { ProjectSummary, TechnicalRequest, ClearanceRequest } from '../types';
import { supabase } from '../supabaseClient';
import Modal from './Modal';
import ProjectRequestsView from './ProjectRequestsView';

interface ProjectDetailViewProps {
  project: ProjectSummary;
  isAdmin: boolean;
  onBack: () => void;
  onRefresh: () => void;
  technicalRequests?: TechnicalRequest[];
  clearanceRequests?: ClearanceRequest[];
}

const ProjectDetailView: React.FC<ProjectDetailViewProps> = ({
  project,
  isAdmin,
  onBack,
  onRefresh,
  technicalRequests = [],
  clearanceRequests = []
}) => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openEditModal = () => {
    setEditForm({
      id: project.id,
      units_count: project.units_count || 0,
      electricity_meters: project.electricity_meters || 0,
      water_meters: project.water_meters || 0,
      building_permits: project.building_permits || 0,
      occupancy_certificates: project.occupancy_certificates || 0,
      survey_decisions_count: project['survey_decisions_count'] || 0,
      consultant_name: project['consultant_name'] || '',
      consultant_engineer: project['consultant_engineer'] || '',
      consultant_mobile: project['consultant_mobile'] || '',
      water_contractor: project['water_contractor'] || '',
      water_contractor_engineer: project['water_contractor_engineer'] || '',
      water_contractor_mobile: project['water_contractor_mobile'] || '',
      electricity_contractor: project['electricity_contractor'] || '',
      electricity_contractor_engineer: project['electricity_contractor_engineer'] || '',
      electricity_contractor_mobile: project['electricity_contractor_mobile'] || ''
    });
    setError(null);
    setIsEditModalOpen(true);
  };

  const handleUpdateProject = async () => {
    try {
      if (!editForm.id) {
        setError('خطأ: معرّف المشروع غير موجود');
        return;
      }

      setLoading(true);
      setError(null);
      
      const { id, ...dataToUpdate } = editForm;

      const { error: updateError } = await supabase
        .from('projects')
        .update(dataToUpdate)
        .eq('id', id);
      
      if (updateError) {
        throw updateError;
      }
      
      setIsEditModalOpen(false);
      setEditForm({});
      alert('تم حفظ التعديلات بنجاح ✓');
      onRefresh();
    } catch (err: any) {
      const errorMsg = err?.message || 'حدث خطأ غير معروف';
      setError(errorMsg);
      console.error('خطأ في التحديث:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseModal = () => {
    setIsEditModalOpen(false);
    setError(null);
    setEditForm({});
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
      {/* رأس الصفحة وزر العودة */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-3 bg-white rounded-xl shadow-sm hover:bg-gray-50 text-gray-500 transition-all">
            <ArrowLeft size={20}/>
          </button>
          <div>
            <h2 className="text-3xl font-black text-[#1B2B48]">{project.name || project.title || project.client || 'مشروع بدون اسم'}</h2>
            <p className="text-gray-400 text-sm font-bold flex items-center gap-1">
              <MapPin size={14}/> {project.location || 'غير محدد'}
            </p>
          </div>
        </div>
        {isAdmin && (
          <button onClick={openEditModal} className="flex items-center gap-2 bg-[#1B2B48] text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:brightness-110 transition active:scale-95">
            <Edit size={18} /> تعديل البيانات الأساسية
          </button>
        )}
      </div>

      {/* 1. قسم الإحصائيات (العدادات) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
         <StatCard icon={<Building2 />} label="الوحدات" value={project.units_count || 0} color="bg-blue-100 text-blue-600" />
         <StatCard icon={<Zap />} label="الكهرباء" value={project.electricity_meters || 0} color="bg-yellow-100 text-yellow-600" />
         <StatCard icon={<Droplet />} label="المياه" value={project.water_meters || 0} color="bg-cyan-100 text-cyan-600" />
         <StatCard icon={<FileText />} label="رخص البناء" value={project.building_permits || 0} color="bg-purple-100 text-purple-600" />
         <StatCard icon={<CheckCircle2 />} label="الإشغال" value={project.occupancy_certificates || 0} color="bg-green-100 text-green-600" />
         <StatCard icon={<Ruler />} label="مساحي" value={project['survey_decisions_count'] || 0} color="bg-pink-100 text-pink-600" />
      </div>

      {/* 2. قسم الاستشاري والمقاولين */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-[25px] border border-gray-100 shadow-sm hover:shadow-md transition-all relative overflow-hidden">
          <div className="absolute top-0 right-0 w-1.5 h-full bg-[#1B2B48]"></div>
          <div className="flex items-center gap-3 mb-5 border-b border-gray-50 pb-4">
            <div className="p-3 bg-gray-50 text-[#1B2B48] rounded-2xl"><Briefcase size={22} /></div>
            <h3 className="font-bold text-lg text-gray-800">المكتب الاستشاري</h3>
          </div>
          <div className="space-y-4">
             <InfoRow label="اسم المكتب" value={project['consultant_name']} />
             <InfoRow label="المهندس المسؤول" value={project['consultant_engineer']} />
             <InfoRow label="رقم التواصل" value={project['consultant_mobile']} isLtr />
          </div>
        </div>

        <div className="bg-white p-6 rounded-[25px] border border-gray-100 shadow-sm hover:shadow-md transition-all relative overflow-hidden">
          <div className="absolute top-0 right-0 w-1.5 h-full bg-yellow-400"></div>
          <div className="flex items-center gap-3 mb-5 border-b border-gray-50 pb-4">
            <div className="p-3 bg-yellow-50 text-yellow-600 rounded-2xl"><Zap size={22} /></div>
            <h3 className="font-bold text-lg text-gray-800">مقاول الكهرباء</h3>
          </div>
          <div className="space-y-4">
             <InfoRow label="اسم الشركة" value={project['electricity_contractor']} />
             <InfoRow label="المهندس المسؤول" value={project['electricity_contractor_engineer']} />
             <InfoRow label="رقم التواصل" value={project['electricity_contractor_mobile']} isLtr />
          </div>
        </div>

        <div className="bg-white p-6 rounded-[25px] border border-gray-100 shadow-sm hover:shadow-md transition-all relative overflow-hidden">
          <div className="absolute top-0 right-0 w-1.5 h-full bg-cyan-400"></div>
          <div className="flex items-center gap-3 mb-5 border-b border-gray-50 pb-4">
            <div className="p-3 bg-cyan-50 text-cyan-600 rounded-2xl"><Droplet size={22} /></div>
            <h3 className="font-bold text-lg text-gray-800">مقاول المياه</h3>
          </div>
          <div className="space-y-4">
             <InfoRow label="اسم الشركة" value={project['water_contractor']} />
             <InfoRow label="المهندس المسؤول" value={project['water_contractor_engineer']} />
             <InfoRow label="رقم التواصل" value={project['water_contractor_mobile']} isLtr />
          </div>
        </div>
      </div>

      {/* نافذة التعديل */}
      <Modal isOpen={isEditModalOpen} onClose={handleCloseModal} title="تعديل تفاصيل المشروع">
        <div className="space-y-6 text-right font-cairo">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-bold">
              ⚠️ {error}
            </div>
          )}
          
          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
            <h4 className="text-xs font-black text-gray-400 mb-3 uppercase tracking-wider">الإحصائيات والعدادات</h4>
            <div className="grid grid-cols-2 gap-3">
              <InputGroup label="عدد الوحدات" value={editForm.units_count} onChange={v => setEditForm({...editForm, units_count: v})} />
              <InputGroup label="عدادات الكهرباء" value={editForm.electricity_meters} onChange={v => setEditForm({...editForm, electricity_meters: v})} />
              <InputGroup label="عدادات المياه" value={editForm.water_meters} onChange={v => setEditForm({...editForm, water_meters: v})} />
              <InputGroup label="رخص البناء" value={editForm.building_permits} onChange={v => setEditForm({...editForm, building_permits: v})} />
              <InputGroup label="شهادات الإشغال" value={editForm.occupancy_certificates} onChange={v => setEditForm({...editForm, occupancy_certificates: v})} />
              <InputGroup label="القرارات المساحية" value={editForm.survey_decisions_count} onChange={v => setEditForm({...editForm, survey_decisions_count: v})} />
            </div>
          </div>
          
          <div>
            <h4 className="text-xs font-black text-gray-400 mb-3 uppercase tracking-wider">بيانات المكتب الاستشاري</h4>
            <div className="space-y-3">
               <InputText label="اسم المكتب" value={editForm.consultant_name} onChange={v => setEditForm({...editForm, consultant_name: v})} icon={<Briefcase size={16}/>} />
               <div className="grid grid-cols-2 gap-3">
                  <InputText label="المهندس المسؤول" value={editForm.consultant_engineer} onChange={v => setEditForm({...editForm, consultant_engineer: v})} icon={<UserIcon size={16}/>} />
                  <InputText label="رقم التواصل" value={editForm.consultant_mobile} onChange={v => setEditForm({...editForm, consultant_mobile: v})} icon={<Phone size={16}/>} />
               </div>
            </div>
          </div>
          
          <div>
            <h4 className="text-xs font-black text-gray-400 mb-3 uppercase tracking-wider">بيانات مقاول الكهرباء</h4>
            <div className="space-y-3">
               <InputText label="اسم الشركة" value={editForm.electricity_contractor} onChange={v => setEditForm({...editForm, electricity_contractor: v})} icon={<Zap size={16}/>} />
               <div className="grid grid-cols-2 gap-3">
                  <InputText label="المهندس المسؤول" value={editForm.electricity_contractor_engineer} onChange={v => setEditForm({...editForm, electricity_contractor_engineer: v})} icon={<UserIcon size={16}/>} />
                  <InputText label="رقم التواصل" value={editForm.electricity_contractor_mobile} onChange={v => setEditForm({...editForm, electricity_contractor_mobile: v})} icon={<Phone size={16}/>} />
               </div>
            </div>
          </div>
          
          <div>
            <h4 className="text-xs font-black text-gray-400 mb-3 uppercase tracking-wider">بيانات مقاول المياه</h4>
            <div className="space-y-3">
               <InputText label="اسم الشركة" value={editForm.water_contractor} onChange={v => setEditForm({...editForm, water_contractor: v})} icon={<Droplet size={16}/>} />
               <div className="grid grid-cols-2 gap-3">
                  <InputText label="المهندس المسؤول" value={editForm.water_contractor_engineer} onChange={v => setEditForm({...editForm, water_contractor_engineer: v})} icon={<UserIcon size={16}/>} />
                  <InputText label="رقم التواصل" value={editForm.water_contractor_mobile} onChange={v => setEditForm({...editForm, water_contractor_mobile: v})} icon={<Phone size={16}/>} />
               </div>
            </div>
          </div>
          
          <div className="flex gap-3">
            <button 
              onClick={handleUpdateProject} 
              disabled={loading}
              className="flex-1 bg-[#1B2B48] text-white py-4 rounded-[20px] font-black hover:bg-[#2a3f63] transition shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
               {loading ? '⏳ جاري الحفظ...' : '✓ حفظ التغييرات'}
            </button>
            <button 
              onClick={handleCloseModal}
              disabled={loading}
              className="flex-1 bg-gray-200 text-gray-800 py-4 rounded-[20px] font-black hover:bg-gray-300 transition shadow-lg active:scale-95 disabled:opacity-50"
            >
              إلغاء
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// مكونات مساعدة
const StatCard = ({ icon, label, value, color }: any) => (
  <div className="bg-white p-5 rounded-[22px] border border-gray-100 flex flex-col items-center justify-center gap-2 shadow-sm hover:shadow-md transition-all">
    <div className={`p-3 rounded-xl ${color}`}>{icon}</div>
    <span className="text-gray-400 text-[10px] font-black uppercase tracking-wider">{label}</span>
    <span className="text-2xl font-black text-[#1B2B48]">{value}</span>
  </div>
);

const InfoRow = ({ label, value, isLtr }: any) => (
  <div className="flex justify-between items-center border-b border-gray-50 last:border-0 pb-2 last:pb-0">
    <span className="text-gray-400 text-xs font-bold">{label}</span>
    <span className={`font-bold text-[#1B2B48] ${isLtr ? 'dir-ltr text-left' : ''}`}>{value || '-'}</span>
  </div>
);

const InputGroup = ({ label, value, onChange }: any) => (
  <div>
    <label className="block text-[10px] text-gray-400 font-bold mb-1">{label}</label>
    <input 
      type="number" 
      className="w-full p-3 bg-white rounded-xl border border-gray-100 outline-none font-bold text-center focus:border-blue-500 transition"
      value={value || 0} 
      onChange={e => onChange(Number(e.target.value))} 
      min="0"
    />
  </div>
);

const InputText = ({ label, value, onChange, icon }: any) => (
  <div>
    <label className="text-gray-400 text-xs font-bold block mb-2">{label}</label>
    <div className="relative">
      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300">{icon}</div>
      <input 
        type="text" 
        className="w-full p-4 pr-12 bg-gray-50 rounded-2xl border border-gray-200 outline-none font-bold focus:border-[#1B2B48] transition"
        value={value || ''} 
        onChange={e => onChange(e.target.value)} 
        placeholder=" "
      />
    </div>
  </div>
);

export default ProjectDetailView;
