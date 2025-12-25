import React, { useState } from 'react';
import { Plus, PieChart, Zap, FileText, Trash2, Building2, MapPin } from 'lucide-react';
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
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [projectForm, setProjectForm] = useState({ 
    name: '', 
    location: '', 
    client: '' 
  });

  const isAdmin = currentUser?.role === 'ADMIN';

  const handleAddProject = async () => {
    if (!projectForm.name) return alert("اسم المشروع مطلوب");
    
    // Using 'client' and 'title' fields to match the schema used in App.tsx
    const { error } = await supabase.from('projects').insert([
      { 
        client: projectForm.client || projectForm.name, 
        title: projectForm.name, 
        status: 'active', 
        location: projectForm.location 
      }
    ]);

    if (error) {
      alert("خطأ أثناء الإضافة: " + error.message);
    } else {
      alert("تم إنشاء المشروع بنجاح ✅");
      setIsProjectModalOpen(false);
      setProjectForm({ name: '', location: '', client: '' });
      onRefresh();
    }
  };

  // Fix: Changed parameter type from string to number to match ProjectSummary.id
  const handleDeleteProject = async (id: number) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا المشروع نهائياً؟ سيتم حذف كافة البيانات المرتبطة به.")) return;
    
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) {
      alert("خطأ أثناء الحذف: " + error.message);
    } else {
      alert("تم حذف المشروع بنجاح");
      onRefresh();
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      {/* Stats Cards Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-[35px] border border-gray-100 flex items-center gap-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl">
            <PieChart size={28} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">إجمالي المشاريع</p>
            <p className="text-3xl font-black text-[#1B2B48]">{stats.projects}</p>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[35px] border border-gray-100 flex items-center gap-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="p-4 bg-amber-50 text-amber-600 rounded-2xl">
            <Zap size={28} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">الطلبات الفنية</p>
            <p className="text-3xl font-black text-[#1B2B48]">{stats.techRequests}</p>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[35px] border border-gray-100 flex items-center gap-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl">
            <FileText size={28} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">سجلات الإفراغ</p>
            <p className="text-3xl font-black text-[#1B2B48]">{stats.clearRequests}</p>
          </div>
        </div>
      </div>

      {/* Header & Projects Grid Section */}
      <div className="space-y-6">
        <div className="flex justify-between items-center px-2">
          <h2 className="text-2xl font-black text-[#1B2B48]">المشاريع القائمة</h2>
          {isAdmin && (
            <button 
              onClick={() => setIsProjectModalOpen(true)} 
              className="bg-[#1B2B48] text-white px-8 py-4 rounded-[22px] font-bold shadow-xl hover:scale-105 transition-all active:scale-95 flex items-center gap-2"
            >
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
                <ProjectCard 
                  project={p} 
                  onClick={onProjectClick} 
                  onTogglePin={() => {}} 
                />
                {isAdmin && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDeleteProject(p.id); }} 
                    className="absolute top-4 left-4 bg-white/90 p-2.5 rounded-full text-red-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50 shadow-md z-30"
                    title="حذف المشروع"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add Project Modal */}
      <Modal 
        isOpen={isProjectModalOpen} 
        onClose={() => setIsProjectModalOpen(false)} 
        title="إضافة مشروع جديد للنظام"
      >
        <div className="space-y-5 text-right font-cairo overflow-visible">
          <div>
            <label className="text-gray-400 text-xs font-bold block mb-2 mr-1">اسم المشروع</label>
            <div className="relative">
              <Building2 className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 w-5 h-5" />
              <input 
                className="w-full p-4 pr-12 bg-gray-50 rounded-2xl border border-gray-200 outline-none font-bold focus:border-[#E95D22] focus:ring-1 focus:ring-[#E95D22]/20 transition-all" 
                placeholder="مثال: مشروع الملقا السكني"
                value={projectForm.name} 
                onChange={e => setProjectForm({...projectForm, name: e.target.value})} 
              />
            </div>
          </div>

          <div>
            <label className="text-gray-400 text-xs font-bold block mb-2 mr-1">اسم العميل (اختياري)</label>
            <div className="relative">
              <UserIcon className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 w-5 h-5" />
              <input 
                className="w-full p-4 pr-12 bg-gray-50 rounded-2xl border border-gray-200 outline-none font-bold focus:border-[#E95D22] transition-all" 
                placeholder="اسم صاحب المشروع"
                value={projectForm.client} 
                onChange={e => setProjectForm({...projectForm, client: e.target.value})} 
              />
            </div>
          </div>

          <div>
            <label className="text-gray-400 text-xs font-bold block mb-2 mr-1">الموقع (المدينة - الحي)</label>
            <div className="relative">
              <MapPin className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 w-5 h-5" />
              <input 
                className="w-full p-4 pr-12 bg-gray-50 rounded-2xl border border-gray-200 outline-none font-bold focus:border-[#E95D22] transition-all" 
                placeholder="مثال: الرياض - حي الملقا"
                value={projectForm.location} 
                onChange={e => setProjectForm({...projectForm, location: e.target.value})} 
              />
            </div>
          </div>

          <div className="pt-4">
            <button 
              onClick={handleAddProject} 
              className="w-full bg-[#1B2B48] text-white py-5 rounded-[22px] font-black shadow-xl hover:brightness-110 hover:-translate-y-1 transition-all active:scale-95"
            >
              حفظ المشروع والبدء
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

const UserIcon = ({ className, size = 24 }: { className?: string, size?: number }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

export default ProjectsModule;