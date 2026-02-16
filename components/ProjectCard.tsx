
import React, { useState } from 'react';
import { FolderOpen, MapPin, CheckCircle2, Clock, Pin, Building2, Zap, Droplets, FileText, ShieldCheck } from 'lucide-react';
import { ProjectSummary } from '../types';

interface ProjectCardProps {
  project: ProjectSummary;
  onClick: (project: ProjectSummary) => void;
  onTogglePin: (project: ProjectSummary) => void;
}

const DEFAULT_PLACEHOLDER = "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=1000";

const ProjectCard: React.FC<ProjectCardProps> = ({ project, onClick, onTogglePin }) => {
  const [imgError, setImgError] = useState(false);
  // Fix: Property 'imageUrl' does not exist on type 'ProjectSummary'. Only using image_url.
  const imageUrl = project.image_url;

  return (
    <div 
      onClick={() => onClick(project)}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 cursor-pointer hover:shadow-xl hover:border-[#E95D22]/20 transition-all duration-300 group overflow-hidden flex flex-col h-full relative"
    >
        {/* Pin Button */}
        <button
            onClick={(e) => {
                e.stopPropagation();
                onTogglePin(project);
            }}
            className={`absolute top-3 left-3 z-20 p-2 rounded-full backdrop-blur-md transition-all duration-200 ${
                project.isPinned 
                ? 'bg-[#E95D22] text-white shadow-lg' 
                : 'bg-white/50 text-gray-500 hover:bg-white hover:text-[#E95D22]'
            }`}
            title={project.isPinned ? "إلغاء التثبيت" : "تثبيت المشروع"}
        >
            <Pin className={`w-4 h-4 ${project.isPinned ? 'fill-current' : ''}`} />
        </button>

        <div className="h-48 w-full relative bg-gray-100">
            <img 
                src={(!imgError && imageUrl) ? imageUrl : DEFAULT_PLACEHOLDER} 
                alt={project.name} 
                onError={() => setImgError(true)}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#1B2B48]/90 via-[#1B2B48]/20 to-transparent" />
            <div className="absolute bottom-4 right-4 text-white z-10">
                <h3 className="font-bold text-lg leading-tight mb-1">{project.name}</h3>
                <div className="flex items-center gap-1 text-gray-200 text-xs bg-white/10 backdrop-blur-sm px-2 py-0.5 rounded-lg w-fit border border-white/10">
                    <MapPin className="w-3 h-3" />
                    <span>{project.location}</span>
                </div>
            </div>
        </div>

      <div className="px-6 py-4 flex-1 flex flex-col">
        <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="bg-gray-50 rounded-xl p-2 flex flex-col items-center justify-center border border-gray-100/50">
                <Building2 className="w-3.5 h-3.5 text-blue-600 mb-1" />
                <span className="text-[10px] font-bold text-[#1B2B48]">{project.units_count || 0}</span>
                <span className="text-[8px] text-gray-400 uppercase tracking-tighter">وحدة</span>
            </div>
            <div className="bg-gray-50 rounded-xl p-2 flex flex-col items-center justify-center border border-gray-100/50">
                <Zap className="w-3.5 h-3.5 text-amber-500 mb-1" />
                <span className="text-[10px] font-bold text-[#1B2B48]">{project.electricity_meters || 0}</span>
                <span className="text-[8px] text-gray-400 uppercase tracking-tighter">كهرباء</span>
            </div>
            <div className="bg-gray-50 rounded-xl p-2 flex flex-col items-center justify-center border border-gray-100/50">
                <Droplets className="w-3.5 h-3.5 text-cyan-500 mb-1" />
                <span className="text-[10px] font-bold text-[#1B2B48]">{project.water_meters || 0}</span>
                <span className="text-[8px] text-gray-400 uppercase tracking-tighter">مياه</span>
            </div>
        </div>

        <div className="flex justify-between items-center mb-1.5 text-[10px] text-gray-500 mt-auto">
            <span className="font-medium">نسبة الإنجاز</span>
            <span className="font-bold text-[#E95D22]">{Math.round(project.progress)}%</span>
        </div>

        <div className="w-full bg-gray-100 rounded-full h-1.5 mb-5 overflow-hidden">
            <div 
            className="bg-[#E95D22] h-full rounded-full transition-all duration-1000 ease-out" 
            style={{ width: `${project.progress}%` }}
            />
        </div>

        <div className="flex justify-between items-center text-[10px] border-t border-gray-50 pt-3">
            <div className="flex items-center gap-1 text-green-700 bg-green-50 px-2.5 py-1 rounded-lg font-bold">
                <CheckCircle2 className="w-3 h-3" />
                <span>{project.completedTasks || 0} منجز</span>
            </div>
            <div className="flex items-center gap-1 text-[#E95D22] bg-[#E95D22]/5 px-2.5 py-1 rounded-lg font-bold">
                <Clock className="w-3 h-3" />
                <span>{(project.totalTasks || 0) - (project.completedTasks || 0)} قيد العمل</span>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectCard;