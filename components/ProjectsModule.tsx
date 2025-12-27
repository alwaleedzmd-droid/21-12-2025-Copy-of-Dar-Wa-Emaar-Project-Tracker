import React, { useState, useEffect } from 'react';
import { 
  Plus, PieChart, Zap, FileText, Trash2, Building2, MapPin, 
  ArrowRight, Edit, User as UserIcon, Phone, Briefcase, Droplet, CheckCircle2, Ruler 
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { ProjectSummary, User } from '../types';
import ProjectCard from './ProjectCard';
import Modal from './Modal';

interface ProjectsModuleProps {
  projects: ProjectSummary[];
  stats: {
    projects: number;
    techRequests: number;
    clearRequests: number;
  };
  currentUser: User | null;
  onProjectClick: (project: ProjectSummary) => void;
  onRefresh: () => void;
}

const ProjectsModule: React.FC<ProjectsModuleProps> = ({
  projects,
  stats,
  currentUser,
  onProjectClick,
  onRefresh
}) => {
  // === الحالة (State) ===
  // 1. حالة لتحديد المشروع المفتوح حالياً (للتفاصيل)
  const [internalActiveProject, setInternalActiveProject] = useState<ProjectSummary | null>(null);
  
  // 2. حالة نوافذ الإضافة والتعديل
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // 3. نماذج البيانات
  const [addForm, setAddForm] = useState({ name: '', location: '', client: '' });
  const [editForm, setEditForm] = useState<any>({});

  const isAdmin = currentUser?.role === 'ADMIN';

  // === العمليات (Functions) ===

  // 1. فتح مشروع لعرض التفاصيل
  const handleOpenProject = (project: ProjectSummary) => {
    setInternalActiveProject(project);
    onProjectClick(project); // نخبر الأب أيضاً (اختياري)
  };

  // 2. العودة للقائمة الرئيسية
  const handleBackToList = () => {
    setInternalActiveProject(null);
    onRefresh(); // تحديث البيانات عند العودة
  };

  // 3. إضافة مشروع جديد
  const handleAddProject = async () => {
    if (!addForm.name) return alert("اسم المشروع مطلوب");
    const { error } = await supabase.from('projects').insert([{ 
      client: addForm.client || addForm.name, 
      title: addForm.name, 
      status: 'active', 
      location: addForm.location 
    }]);

    if (error) alert("خطأ: " + error.message);
    else {
      alert("تم إنشاء المشروع بنجاح ✅");
      setIsAddModalOpen(false);
      setAddForm({ name: '', location: '', client: '' });
      onRefresh();
    }
  };

  // 4. حذف مشروع
  const handleDeleteProject = async (id: number) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا المشروع؟")) return;
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (!error) onRefresh();
  };

  // 5. فتح نافذة التعديل (وتعبئة البيانات)
  const openEditModal = () => {
    if (!internalActiveProject) return;
    setEditForm({
      id: internalActiveProject.id,
      units_count: internalActiveProject.units_count || 0,
      electricity_meters: internalActiveProject.electricity_meters || 0,
      water_meters: internalActiveProject.water_meters || 0,
      building_permits: internalActiveProject.building_permits || 0,
      occupancy_certificates: internalActiveProject.occupancy_certificates || 0,
      // البيانات الجديدة
      survey_decisions_count: internalActiveProject['survey_decisions_count'] || 0,
      consultant_name: internalActiveProject['consultant_name'] || '',
      consultant_engineer: internalActiveProject['consultant_engineer'] || '',
      consultant_mobile: internalActiveProject['consultant_mobile'] || '',
      water_contractor: internalActiveProject['water_contractor'] || '',
      electricity_contractor: internalActiveProject['electricity_contractor'] || ''
    });
    setIsEditModalOpen(true);
  };

  // 6. حفظ التعديلات
  const handleUpdateProject = async () => {
    const { error } = await supabase.from('projects').update(editForm).eq('id', editForm.id);
    if (error) {
      alert('حدث خطأ: ' + error.message);
    } else {
      // تحديث الواجهة فوراً
      setInternalActiveProject({ ...internalActiveProject, ...editForm } as ProjectSummary);
      setIsEditModalOpen(false);
      alert('تم حفظ التعديلات بنجاح');
    }
  };

  // === العرض (Render) ===

  // A. عرض التفاصيل (إذا كان هناك مشروع مفتوح)
  if (internalActiveProject) {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* رأس الصفحة وزر العودة */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <button onClick={handleBackToList} className="p-3 bg-white rounded-xl shadow-sm hover:bg-gray-50 text-gray-500 transition-all">
              <ArrowRight size={20}/>
            </button>
            <div>
              <h2 className="text-2xl font-black text-[#1B2B48]">{internalActiveProject.title || internalActiveProject.client}</h2>
              <p className="text-gray-400 text-sm font-bold flex items-center gap-1">
                <MapPin size={14}/> {internalActiveProject['location'] || 'غير محدد'}
              </p>
            </div>
          </div>
          {isAdmin && (
            <button onClick={openEditModal} className="flex items-center gap-2 bg-[#1B2B48] text-white px-5 py-3 rounded-xl font-bold shadow-lg hover:brightness-110 transition">
              <Edit size={18} /> تعديل البيانات
            </button>
          )}
        </div>

        {/* 1. قسم الإحصائيات (العدادات) */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
           <StatCard icon={<Building2 />} label="الوحدات" value={internalActiveProject.units_count || 0} color="bg-blue-100 text-blue-600" />
           <StatCard icon={<Zap />} label="الكهرباء" value={internalActiveProject.electricity_meters || 0} color="bg-yellow-100 text-yellow-600" />
           <StatCard icon={<Droplet />} label="المياه" value={internalActiveProject.water_meters || 0} color="bg-cyan-100 text-cyan-600" />
           <StatCard icon={<FileText />} label="رخص البناء" value={internalActiveProject.building_permits || 0} color="bg-purple-100 text-purple-600" />
           <StatCard icon={<CheckCircle2 />} label="الإشغال" value={internalActiveProject.occupancy_certificates || 0} color="bg-green-100 text-green-600" />
           <StatCard icon={<Ruler />} label="مساحي" value={internalActiveProject['survey_decisions_count'] || 0} color="bg-pink-100 text-pink-600" />
        </div>

        {/* 2. قسم الاستشاري والمقاولين (الجديد) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          
          {/* بطاقة المكتب الاستشاري */}
          <div className="bg-white p-6 rounded-[25px] border border-gray-100 shadow-sm hover:shadow-md transition-all relative overflow-hidden">
            <div className="absolute top-0 right-0 w-1.5 h-full bg-[#1B2B48]"></div>
            <div className="flex items-center gap-3 mb-5 border-b border-gray-50 pb-4">
              <div className="p-3 bg-gray-50 text-[#1B2B48] rounded-2xl"><Briefcase size={22} /></div>
              <h3 className="font-bold text-lg text-gray-800">المكتب الاستشاري</h3>
            </div>
            <div className="space-y-4">
               <InfoRow label="اسم المكتب" value={internalActiveProject['consultant_name']} />
               <InfoRow label="المهندس المسؤول" value={internalActiveProject['consultant_engineer']} />
               <InfoRow label="رقم التواصل" value={internalActiveProject['consultant_mobile']} isLtr />
            </div>
          </div>

          {/* بطاقة مقاول الكهرباء */}
          <div className="bg-white p-6 rounded-[25px] border border-gray-100 shadow-sm hover:shadow-md transition-all relative overflow-hidden">
            <div className="absolute top-0 right-0 w-1.5 h-full bg-yellow-400"></div>
            <div className="flex items-center gap-3 mb-5 border-b border-gray-50 pb-4">
              <div className="p-3 bg-yellow-50 text-yellow-600 rounded-2xl"><Zap size={22} /></div>
              <h3 className="font-bold text-lg text-gray-800">مقاول الكهرباء</h3>
            </div>
            <div className="mt-2">
               <p className="text-gray-400 text-xs font-bold mb-1">الجهة المنفذة</p>
               <p className="text-xl font-black text-[#1B2B48]">{internalActiveProject['electricity_contractor'] || '-'}</p>
            </div>
          </div>

          {/* بطاقة مقاول المياه */}
          <div className="bg-white p-6 rounded-[25px] border border-gray-100 shadow-sm hover:shadow-md transition-all relative overflow-hidden">
            <div className="absolute top-0 right-0 w-1.5 h-full bg-cyan-400"></div>
            <div className="flex items-center gap-3 mb-5 border-b border-gray-50 pb-4">
              <div className="p-3 bg-cyan-50 text-cyan-600 rounded-2xl"><Droplet size={22} /></div>
              <h3 className="font-bold text-lg text-gray-800">مقاول المياه</h3>
            </div>
            <div className="mt-2">
               <p className="text-gray-400 text-xs font-bold mb-1">الجهة المنفذة</p>
               <p className="text-xl font-black text-[#1B2B48]">{internalActiveProject['water_contractor'] || '-'}</p>
            </div>
          </div>

        </div>

        {/* --- نافذة التعديل (Edit Modal) --- */}
        <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="تعديل تفاصيل المشروع">
          <div className="space-y-6 text-right font-cairo">
            
            {/* قسم العدادات */}
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
              <h4 className="text-xs font-black text-gray-400 mb-3">الإحصائيات والعدادات</h4>
              <div className="grid grid-cols-2 gap-3">
                <InputGroup label="عدد الوحدات" value={editForm.units_count} onChange={v => setEditForm({...editForm, units_count: v})} />
                <InputGroup label="عدادات الكهرباء" value={editForm.electricity_meters} onChange={v => setEditForm({...editForm, electricity_meters: v})} />
                <InputGroup label="عدادات المياه" value={editForm.water_meters} onChange={v => setEditForm({...editForm, water_meters: v})} />
                <InputGroup label="رخص البناء" value={editForm.building_permits} onChange={v => setEditForm({...editForm, building_permits: v})} />
                <InputGroup label="شهادات الإشغال" value={editForm.occupancy_certificates} onChange={v => setEditForm({...editForm, occupancy_certificates: v})} />
                <InputGroup label="القرارات المساحية" value={editForm.survey_decisions_count} onChange={v => setEditForm({...editForm, survey_decisions_count: v})} />
              </div>
            </div>

            {/* قسم الاستشاري */}
            <div>
              <h4 className="text-xs font-black text-gray-400 mb-3">بيانات المكتب الاستشاري</h4>
              <div className="space-y-3">
                 <InputText label="اسم المكتب" value={editForm.consultant_name} onChange={v => setEditForm({...editForm, consultant_name: v})} icon={<Briefcase size={16}/>} />
                 <div className="grid grid-cols-2 gap-3">
                    <InputText label="المهندس المسؤول" value={editForm.consultant_engineer} onChange={v => setEditForm({...editForm, consultant_engineer: v})} icon={<UserIcon size={16}/>} />
                    <InputText label="رقم التواصل" value={editForm.consultant_mobile} onChange={v => setEditForm({...editForm, consultant_mobile: v})} icon={<Phone size={16}/>} />
                 </div>
              </div>
            </div>

            {/* قسم المقاولين */}
            <div>
              <h4 className="text-xs font-black text-gray-400 mb-3">بيانات المقاولين</h4>
              <div className="grid grid-cols-2 gap-3">
                 <InputText label="مقاول الكهرباء" value={editForm.electricity_contractor} onChange={v => setEditForm({...editForm, electricity_contractor: v})} icon={<Zap size={16}/>} />
                 <InputText label="مقاول المياه" value={editForm.water_contractor} onChange={v => setEditForm({...editForm, water_contractor: v})} icon={<Droplet size={16}/>} />
              </div>
            </div>

            <button onClick={handleUpdateProject} className="w-full bg-[#1B2B48] text-white py-4 rounded-[20px] font-black hover:bg-[#2a3f63] transition shadow-lg active:scale-95">
               حفظ التغييرات
            </button>
          </div>
        </Modal>

      </div>
    );
  }

  // B. عرض القائمة (الوضع الافتراضي)
  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      {/* قسم البطاقات الإحصائية العلوية */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatSummaryCard icon={<PieChart size={28} />} label="إجمالي المشاريع" value={stats.projects} color="text-blue-600 bg-blue-50" />
        <StatSummaryCard icon={<Zap size={28} />} label="الطلبات الفنية" value={stats.techRequests} color="text-amber-600 bg-amber-50" />
        <StatSummaryCard icon={<FileText size={28} />} label="سجلات الإفراغ" value={stats.clearRequests} color="text-indigo-600 bg-indigo-50" />
      </div>

      {/* قسم شبكة المشاريع */}
      <div className="space-y-6">
        <div className="flex justify-between items-center px-2">
          <h2 className="text-2xl font-black text-[#1B2B48]">المشاريع القائمة</h2>
          {isAdmin && (
            <button onClick={() => setIsAddModalOpen(true)} className="bg-[#1B2B48] text-white px-8 py-4 rounded-[22px] font-bold shadow-xl hover:scale-105 transition-all active:scale-95 flex items-center gap-2">
              <Plus size={20} /> مشروع جديد
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {projects.length === 0 ? (
            <div className="col-span-full py-32 text-center bg-white rounded-[40px] border border-dashed border-gray-200">
              <div className="flex flex-col items-center gap-4 text-gray-300">
                <Building2 size={64} strokeWidth={1} />
                <p className="text-lg font-bold italic">لا توجد مشاريع مسجلة حالياً</p>
              </div>
            </div>
          ) : (
            projects.map(p => (
              <div key={p.id} className="relative group">
                <ProjectCard project={p} onClick={handleOpenProject} onTogglePin={() => {}} />
                {isAdmin && (
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteProject(p.id); }} className="absolute top-4 left-4 bg-white/90 p-2.5 rounded-full text-red-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50 shadow-md z-30">
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* نافذة إضافة مشروع */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="إضافة مشروع جديد">
        <div className="space-y-5 text-right font-cairo">
          <InputText label="اسم المشروع" value={addForm.name} onChange={v => setAddForm({...addForm, name: v})} icon={<Building2 size={20}/>} />
          <InputText label="اسم العميل (اختياري)" value={addForm.client} onChange={v => setAddForm({...addForm, client: v})} icon={<UserIcon size={20}/>} />
          <InputText label="الموقع" value={addForm.location} onChange={v => setAddForm({...addForm, location: v})} icon={<MapPin size={20}/>} />
          <button onClick={handleAddProject} className="w-full bg-[#1B2B48] text-white py-5 rounded-[22px] font-black shadow-xl mt-4 hover:brightness-110 active:scale-95 transition">
            حفظ المشروع
          </button>
        </div>
      </Modal>
    </div>
  );
};

// --- مكونات مساعدة (Components) ---

const StatCard = ({ icon, label, value, color }: any) => (
  <div className="bg-white p-4 rounded-[20px] border border-gray-100 flex flex-col items-center justify-center gap-2 shadow-sm hover:shadow-md transition-all">
    <div className={`p-3 rounded-full ${color}`}>{icon}</div>
    <span className="text-gray-400 text-xs font-bold">{label}</span>
    <span className="text-xl font-black text-[#1B2B48]">{value}</span>
  </div>
);

const StatSummaryCard = ({ icon, label, value, color }: any) => (
  <div className="bg-white p-8 rounded-[35px] border border-gray-100 flex items-center gap-5 shadow-sm hover:shadow-md transition-shadow">
    <div className={`p-4 rounded-2xl ${color}`}>{icon}</div>
    <div>
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-3xl font-black text-[#1B2B48]">{value}</p>
    </div>
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
    <input type="number" className="w-full p-3 bg-white rounded-xl border border-gray-100 outline-none font-bold text-center focus:border-blue-500 transition"
      value={value} onChange={e => onChange(Number(e.target.value))} />
  </div>
);

const InputText = ({ label, value, onChange, icon }: any) => (
  <div>
    <label className="text-gray-400 text-xs font-bold block mb-2">{label}</label>
    <div className="relative">
      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300">{icon}</div>
      <input type="text" className="w-full p-4 pr-12 bg-gray-50 rounded-2xl border border-gray-200 outline-none font-bold focus:border-[#1B2B48] transition"
        value={value} onChange={e => onChange(e.target.value)} />
    </div>
  </div>
);

export default ProjectsModule;