
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, FileText, Activity, Plus, Upload, 
  Clock, CheckCircle2, AlertCircle, ChevronLeft, Search, Zap, Droplets, Landmark
} from 'lucide-react';

interface DashboardProps {
  projects: any[];
  techRequests: any[];
  clearanceRequests: any[];
  users: any[];
  currentUser: any;
  activities: any[];
  onQuickAction: (action: string) => void;
  onUpdateStatus: (id: number, status: string) => void;
}

const DashboardModule: React.FC<DashboardProps> = ({ 
  projects, techRequests, clearanceRequests, currentUser, activities, onQuickAction 
}) => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');

  // تحضير بيانات الأعمال المدمجة (مثل الإكسل)
  const allWorks = useMemo(() => {
    const tech = techRequests.map(t => ({ 
      id: t.id, 
      title: t.service_type, 
      project: t.project_name || 'مشروع غير محدد', 
      status: t.status, 
      type: 'فني',
      entity: t.reviewing_entity || 'المراجعة الفنية',
      date: t.created_at,
      projectId: t.project_id
    }));
    
    const deeds = clearanceRequests.map(d => ({ 
      id: d.id, 
      title: `إفراغ: ${d.client_name}`, 
      project: d.project_name || 'مشروع غير محدد', 
      status: d.status, 
      type: 'إفراغ',
      entity: d.bank_name || 'تدقيق قانوني',
      date: d.created_at,
      projectId: d.project_id
    }));

    const merged = [...tech, ...deeds].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    if (filter === 'pending') return merged.filter(w => w.status !== 'completed' && w.status !== 'منجز');
    if (filter === 'completed') return merged.filter(w => w.status === 'completed' || w.status === 'منجز');
    return merged;
  }, [techRequests, clearanceRequests, filter]);

  const handleRowClick = (projectId: number) => {
    if (projectId) navigate(`/projects/${projectId}`);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 font-cairo">
      
      {/* 1. Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="المشاريع النشطة" 
          value={projects?.length || 0} 
          icon={<Building2 className="text-blue-500" />} 
          bg="bg-blue-50" 
        />
        <StatCard 
          title="أعمال فنية" 
          value={techRequests?.length || 0} 
          icon={<Zap className="text-orange-500" />} 
          bg="bg-orange-50" 
        />
        <StatCard 
          title="سجلات الإفراغ" 
          value={clearanceRequests?.length || 0} 
          icon={<FileText className="text-purple-500" />} 
          bg="bg-purple-50" 
        />
        <StatCard 
          title="تحديثات اليوم" 
          value={activities?.length || 0} 
          icon={<Activity className="text-green-500" />} 
          bg="bg-green-50" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* 2. Work Monitoring Center (Excel View) */}
        <div className="lg:col-span-2 bg-white rounded-[40px] p-8 shadow-sm border border-gray-100 flex flex-col min-h-[600px]">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <h3 className="text-xl font-black text-[#1B2B48] flex items-center gap-2">
                <FileText size={24} className="text-[#E95D22]" />
                سجل الأعمال والمتابعة (نظرة عامة)
              </h3>
              <p className="text-gray-400 text-[10px] font-black mt-1 uppercase tracking-widest">تحديثات المهام والطلبات حسب ملفات الإنجاز</p>
            </div>
            
            <div className="flex bg-gray-50 p-1 rounded-2xl border border-gray-100">
              <FilterBtn active={filter === 'all'} label="الكل" onClick={() => setFilter('all')} />
              <FilterBtn active={filter === 'pending'} label="قيد المراجعة" onClick={() => setFilter('pending')} />
              <FilterBtn active={filter === 'completed'} label="المنجز" onClick={() => setFilter('completed')} />
            </div>
          </div>

          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-right">
              <thead className="border-b border-gray-50">
                <tr className="text-gray-400 text-[10px] font-black uppercase tracking-widest">
                  <th className="pb-4 pr-4">بيان العمل</th>
                  <th className="pb-4">المشروع</th>
                  <th className="pb-4">جهة المراجعة</th>
                  <th className="pb-4">الحالة</th>
                  <th className="pb-4 text-left pl-4">التاريخ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {allWorks.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-20 text-center opacity-30 font-bold">لا توجد أعمال لعرضها في هذا التصنيف</td>
                  </tr>
                ) : (
                  allWorks.slice(0, 10).map((work) => (
                    <tr 
                      key={`${work.type}-${work.id}`} 
                      onClick={() => handleRowClick(work.projectId)}
                      className="group hover:bg-gray-50 transition-all cursor-pointer"
                    >
                      <td className="py-5 pr-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${work.type === 'فني' ? 'bg-orange-50 text-orange-500' : 'bg-blue-50 text-blue-500'}`}>
                            {work.type === 'فني' ? <Zap size={14} /> : <FileText size={14} />}
                          </div>
                          <span className="font-bold text-[#1B2B48] text-sm group-hover:text-[#E95D22] transition-colors">{work.title}</span>
                        </div>
                      </td>
                      <td className="py-5 text-gray-500 font-bold text-xs">{work.project}</td>
                      <td className="py-5">
                        <div className="flex items-center gap-1.5 text-gray-400 text-[10px] font-bold">
                          <Landmark size={12} /> {work.entity}
                        </div>
                      </td>
                      <td className="py-5">
                        <StatusBadge status={work.status} />
                      </td>
                      <td className="py-5 text-left pl-4 text-[10px] text-gray-300 font-bold" dir="ltr">
                        {new Date(work.date).toLocaleDateString('en-GB')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          <button 
            onClick={() => navigate('/technical')}
            className="mt-6 w-full py-4 border-2 border-dashed border-gray-100 rounded-2xl text-gray-400 font-bold text-xs hover:border-[#1B2B48] hover:text-[#1B2B48] transition-all flex items-center justify-center gap-2"
          >
            عرض كافة السجلات الفنية <ChevronLeft size={16} />
          </button>
        </div>

        {/* 3. Activity Timeline */}
        <div className="bg-white rounded-[40px] p-8 shadow-sm border border-gray-100 flex flex-col h-fit">
          <h3 className="text-xl font-black text-[#1B2B48] mb-8 flex items-center gap-2">
            <Clock size={24} className="text-blue-500" />
            التحديثات الأخيرة
          </h3>
          
          <div className="space-y-8 relative before:absolute before:right-5 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-50">
            {activities.length > 0 ? activities.slice(0, 6).map((log: any) => (
              <div key={log.id} className="relative pr-12 group">
                <div className={`absolute right-0 top-0.5 w-10 h-10 rounded-2xl border-4 border-white shadow-sm flex items-center justify-center bg-white z-10 transition-transform group-hover:scale-110`}>
                  <div className={`w-3 h-3 rounded-full ${log.color === 'text-orange-500' ? 'bg-[#E95D22]' : 'bg-blue-500'}`}></div>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-gray-400 font-black mb-1 uppercase tracking-tighter" dir="ltr">
                    {new Date(log.timestamp).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <p className="text-sm font-black text-[#1B2B48] leading-tight">
                    <span className="text-blue-600">{log.user}</span> {log.action}
                  </p>
                  <p className="text-[11px] text-gray-400 font-bold mt-1.5">{log.target}</p>
                </div>
              </div>
            )) : (
              <div className="text-center py-10 text-gray-300 font-bold text-xs italic">لا توجد تحديثات حالية</div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

// --- Helpers ---
const StatCard = ({ title, value, icon, bg }: any) => (
  <div className="bg-white p-6 rounded-[35px] shadow-sm border border-gray-100 hover:shadow-md transition-all group overflow-hidden relative">
    <div className="flex justify-between items-start mb-6">
      <div className={`w-14 h-14 ${bg} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform`}>{icon}</div>
    </div>
    <h3 className="text-gray-400 font-black text-[10px] mb-1 uppercase tracking-widest">{title}</h3>
    <h2 className="text-4xl font-black text-[#1B2B48] tracking-tighter">{value}</h2>
  </div>
);

const FilterBtn = ({ active, label, onClick }: any) => (
  <button 
    onClick={onClick} 
    className={`px-5 py-2.5 rounded-xl text-[10px] font-black transition-all ${active ? 'bg-white shadow-md text-[#E95D22]' : 'text-gray-400 hover:text-gray-600'}`}
  >
    {label}
  </button>
);

const StatusBadge = ({ status }: { status: string }) => {
  const isCompleted = status === 'completed' || status === 'منجز';
  const isPending = status === 'pending' || status === 'in_progress';
  
  return (
    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black border ${
      isCompleted ? 'bg-green-50 text-green-700 border-green-100' : 
      isPending ? 'bg-orange-50 text-orange-700 border-orange-100' : 
      'bg-gray-50 text-gray-500 border-gray-100'
    }`}>
      {isCompleted ? 'مكتمل' : isPending ? 'تحت الإجراء' : 'جديد'}
    </span>
  );
};

export default DashboardModule;
