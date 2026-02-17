
import React, { useState } from 'react';
import { 
  Plus, PieChart, Zap, FileText, Trash2, Building2, MapPin, 
  User as UserIcon 
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { ProjectSummary, User } from '../types';
import ProjectCard from './ProjectCard';
import Modal from './Modal';
import ProjectDetailView from './ProjectDetailView';

interface ProjectsModuleProps {
  projects: ProjectSummary[];
  stats: {
    projects: number;
    techRequests: number;
    clearRequests: number;
  };
  currentUser: User | null;
  onProjectClick: (project: ProjectSummary | null) => void;
  onRefresh: () => void;
  selectedProject?: ProjectSummary | null;
}

const ProjectsModule: React.FC<ProjectsModuleProps> = ({
  projects,
  stats,
  currentUser,
  onProjectClick,
  onRefresh,
  selectedProject
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', location: '' });

  const isAdmin = currentUser?.role === 'ADMIN';

  const handleAddProject = async () => {
    if (!addForm.name) return alert("اسم المشروع مطلوب");
    const { error } = await supabase.from('projects').insert([{ 
      name: addForm.name,
      title: addForm.name, 
      status: 'active', 
      location: addForm.location 
    }]);

    if (error) alert("خطأ: " + error.message);
    else {
      alert("تم إنشاء المشروع بنجاح ✅");
      setIsAddModalOpen(false);
      setAddForm({ name: '', location: '' });
      onRefresh();
    }
  };

  const handleDeleteProject = async (id: number) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا المشروع؟")) return;
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (!error) onRefresh();
  };

  if (selectedProject) {
    return (
      <ProjectDetailView 
        project={selectedProject}
        isAdmin={isAdmin}
        onBack={() => onProjectClick(null)}
        onRefresh={onRefresh}
      />
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatSummaryCard icon={<PieChart size={28} />} label="إجمالي المشاريع" value={stats.projects} color="text-blue-600 bg-blue-50" />
        <StatSummaryCard icon={<Zap size={28} />} label="الطلبات الفنية" value={stats.techRequests} color="text-amber-600 bg-amber-50" />
        <StatSummaryCard icon={<FileText size={28} />} label="سجلات الإفراغ" value={stats.clearRequests} color="text-indigo-600 bg-indigo-50" />
      </div>

      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-2">
          <h2 className="text-2xl font-black text-[#1B2B48]">المشاريع القائمة</h2>
          {isAdmin && (
            <button onClick={() => setIsAddModalOpen(true)} className="w-full md:w-auto bg-[#1B2B48] text-white px-8 py-4 rounded-[22px] font-bold shadow-xl hover:scale-105 transition-all active:scale-95 flex items-center justify-center gap-2">
              <Plus size={20} /> إضافة مشروع جديد
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
                <ProjectCard project={p} onClick={onProjectClick} onTogglePin={() => {}} />
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

      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="إضافة مشروع جديد">
        <div className="space-y-5 text-right font-cairo">
          <InputText label="اسم المشروع" value={addForm.name} onChange={(v: string) => setAddForm({...addForm, name: v})} icon={<Building2 size={20}/>} />
          <InputText label="الموقع" value={addForm.location} onChange={(v: string) => setAddForm({...addForm, location: v})} icon={<MapPin size={20}/>} />
          <button onClick={handleAddProject} className="w-full bg-[#1B2B48] text-white py-5 rounded-[22px] font-black shadow-xl mt-4 hover:brightness-110 active:scale-95 transition">
            حفظ المشروع
          </button>
        </div>
      </Modal>
    </div>
  );
};

const StatSummaryCard = ({ icon, label, value, color }: any) => (
  <div className="bg-white p-8 rounded-[35px] border border-gray-100 flex items-center gap-5 shadow-sm hover:shadow-md transition-shadow">
    <div className={`p-4 rounded-2xl ${color}`}>{icon}</div>
    <div>
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-3xl font-black text-[#1B2B48]">{value}</p>
    </div>
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
