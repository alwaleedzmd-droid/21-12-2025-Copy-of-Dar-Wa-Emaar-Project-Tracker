
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { 
  Building2, Zap, FileText, CheckCircle2, Clock, 
  Activity, Calendar, ArrowLeft, Filter, Search,
  ChevronLeft, LayoutDashboard, TrendingUp, AlertCircle
} from 'lucide-react';

interface DashboardProps {
  stats?: {
    completedCount: number;
    pendingCount: number;
    totalDeeds: number;
    activeProjects: number;
    progressPercent: number;
  };
  projects: any[];
  techRequests: any[];
  clearanceRequests: any[];
  projectWorks?: any[];
  activities: any[];
  currentUser: any;
  users: any[];
  onQuickAction: (action: string) => void;
  onUpdateStatus: (id: number, status: string) => void;
}

const DashboardModule: React.FC<DashboardProps> = ({ 
  stats: aggregatedStats,
  projects = [], 
  techRequests = [], 
  clearanceRequests = [], 
  projectWorks = [], 
  currentUser 
}) => {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'COMPLETED' | 'PENDING' | 'DEEDS'>('ALL');

  // --- استخدام الإحصائيات المجمعة الممرة من الأب ---
  const stats = useMemo(() => {
    if (aggregatedStats) return aggregatedStats;
    return {
      activeProjects: projects?.length || 0,
      pendingCount: 0,
      totalDeeds: clearanceRequests?.length || 0,
      completedCount: 0,
      progressPercent: 0
    };
  }, [projects, clearanceRequests, aggregatedStats]);

  // --- قائمة التحديثات الأخيرة مع الربط العميق ---
  const recentItems = useMemo(() => {
    const mappedWorks = (projectWorks || []).map(item => ({
        ...item,
        type: 'PROJECT_WORK',
        label: item?.task_name || 'عمل مشروع',
        date: item?.created_at,
        path: `/projects/${item?.projectId}`
    }));

    const mappedTech = (techRequests || []).map(item => ({
        ...item,
        type: 'TECH_REQUEST',
        label: item?.service_type || 'طلب فني',
        date: item?.created_at,
        path: '/technical'
    }));

    const mappedDeeds = (clearanceRequests || []).map(item => ({
        ...item,
        type: 'DEED',
        label: `إفراغ: ${item?.client_name || 'مستفيد'}`,
        date: item?.created_at,
        path: '/deeds'
    }));

    let combined = [...mappedWorks, ...mappedTech, ...mappedDeeds];

    switch (activeFilter) {
        case 'COMPLETED':
            combined = combined.filter(t => t?.status === 'completed' || t?.status === 'منجز' || t?.status === 'مكتمل');
            break;
        case 'PENDING':
            combined = combined.filter(t => t?.status !== 'completed' && t?.status !== 'منجز' && t?.status !== 'مكتمل');
            break;
        case 'DEEDS':
            combined = mappedDeeds;
            break;
    }

    return combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [projectWorks, techRequests, clearanceRequests, activeFilter]);

  // حساب تقدم المشاريع الفردية للعرض الجانبي
  const topProjects = useMemo(() => {
      return (projects || []).slice(0, 4).map(p => {
          const projectTasks = (projectWorks || []).filter(w => w?.projectId === p?.id);
          const completed = projectTasks.filter(w => w?.status === 'completed' || w?.status === 'منجز').length;
          const prog = projectTasks.length > 0 ? Math.round((completed / projectTasks.length) * 100) : (p?.progress || 0);
          return { ...p, calculatedProgress: prog };
      });
  }, [projects, projectWorks]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 font-cairo text-right">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
             <LayoutDashboard className="text-[#E95D22]" size={24} />
             <h2 className="text-3xl font-black text-[#1B2B48]">لوحة المعلومات المركزية</h2>
          </div>
          <p className="text-gray-500 font-bold">نظرة شاملة وموحدة لمؤشرات الأداء عبر كافة قطاعات العمل</p>
        </div>
        <div className="bg-white px-6 py-3 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3">
             <Calendar size={18} className="text-[#E95D22]"/> 
             <span className="font-black text-[#1B2B48]">{new Date().toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
            title="مشاريع قائمة" 
            value={stats.activeProjects} 
            icon={<Building2 size={24}/>} 
            color="blue" 
            onClick={() => navigate('/projects')} 
            subtitle="إجمالي المشاريع في النظام"
        />
        <StatCard 
            title="إجمالي الإفراغات" 
            value={stats.totalDeeds} 
            icon={<FileText size={24}/>} 
            color="indigo" 
            active={activeFilter === 'DEEDS'}
            onClick={() => setActiveFilter('DEEDS')} 
            subtitle="طلبات الإفراغ العقاري"
        />
        <StatCard 
            title="قيد المتابعة" 
            value={stats.pendingCount} 
            icon={<Clock size={24}/>} 
            color="orange" 
            active={activeFilter === 'PENDING'}
            onClick={() => setActiveFilter('PENDING')} 
            subtitle="أعمال فنية وإدارية معلقة"
            alert={stats.pendingCount > 10}
        />
        <StatCard 
            title="أعمال منجزة" 
            value={stats.completedCount} 
            icon={<CheckCircle2 size={24}/>} 
            color="green" 
            active={activeFilter === 'COMPLETED'}
            onClick={() => setActiveFilter('COMPLETED')} 
            subtitle={`${stats.progressPercent}% نسبة الإنجاز العام`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Activity List */}
          <div className="lg:col-span-2 space-y-4">
              <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100 min-h-[500px] flex flex-col">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-black text-[#1B2B48] flex items-center gap-2">
                        <Activity className="text-[#E95D22]" size={20} />
                        آخر التحديثات المركزية
                    </h3>
                    {activeFilter !== 'ALL' && (
                        <button onClick={() => setActiveFilter('ALL')} className="text-xs text-[#E95D22] font-black hover:underline">عرض الكل</button>
                    )}
                  </div>

                  <div className="space-y-3 flex-1">
                    {recentItems?.slice(0, 8).map((item, idx) => (
                      <div 
                        key={idx} 
                        onClick={() => navigate(item.path, { state: { openId: item.id } })}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-transparent hover:border-[#E95D22]/30 hover:bg-white hover:shadow-md transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 
                            ${item?.status === 'completed' || item?.status === 'منجز' || item?.status === 'مكتمل' ? 'bg-green-100 text-green-600' : 
                              item?.type === 'DEED' ? 'bg-indigo-100 text-indigo-600' : 'bg-orange-100 text-orange-600'}`}>
                            {item?.type === 'DEED' ? <FileText size={18}/> : 
                             (item?.status === 'completed' || item?.status === 'منجز' ? <CheckCircle2 size={18}/> : <Activity size={18}/>)}
                          </div>
                          <div>
                            <h4 className="font-bold text-[#1B2B48] text-sm group-hover:text-[#E95D22] transition-colors line-clamp-1">{item.label}</h4>
                            <p className="text-[10px] text-gray-400 mt-0.5 font-bold uppercase">
                                {item?.project_name || 'عام'} • {new Date(item.date).toLocaleDateString('ar-SA')}
                            </p>
                          </div>
                        </div>
                        <ChevronLeft size={16} className="text-gray-300 group-hover:text-[#E95D22] transition-colors" />
                      </div>
                    ))}
                    {recentItems.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-gray-300 opacity-50 py-20">
                            <Search size={48} className="mb-2"/>
                            <p className="font-bold">لا توجد بيانات متاحة لهذا التصنيف</p>
                        </div>
                    )}
                  </div>
              </div>
          </div>

          {/* Performance Dashboard Sidebar */}
          <div className="space-y-6">
              <div className="bg-[#1B2B48] p-8 rounded-[40px] text-white shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-32 h-32 bg-white/5 rounded-full -translate-x-16 -translate-y-16"></div>
                  <div className="relative z-10">
                      <div className="flex items-center gap-2 mb-4">
                        <TrendingUp size={20} className="text-green-400" />
                        <h3 className="font-bold text-lg">متوسط تقدم الأعمال</h3>
                      </div>
                      <div className="flex items-end gap-3 mb-6">
                          <span className="text-5xl font-black">{stats.progressPercent}%</span>
                          <span className="text-xs text-gray-400 font-bold pb-2">إنجاز المهام الكلي</span>
                      </div>
                      <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                          <div className="bg-green-400 h-full rounded-full transition-all duration-1000" style={{width: `${stats.progressPercent}%`}}></div>
                      </div>
                  </div>
              </div>

              <div className="bg-white p-6 rounded-[40px] border border-gray-100 shadow-sm space-y-4">
                  <h3 className="font-black text-[#1B2B48] flex items-center gap-2 px-2">
                      <Building2 size={18} className="text-[#E95D22]" />
                      تقدم المشاريع الكبرى
                  </h3>
                  <div className="space-y-4">
                      {topProjects?.map(p => (
                          <div key={p.id} onClick={() => navigate(`/projects/${p.id}`)} className="p-3 hover:bg-gray-50 rounded-2xl transition-all cursor-pointer group">
                              <div className="flex justify-between items-center mb-1.5">
                                  <span className="text-xs font-bold text-gray-600 group-hover:text-[#1B2B48]">{p.name}</span>
                                  <span className="text-[10px] font-black text-[#E95D22]">{p.calculatedProgress}%</span>
                              </div>
                              <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                                  <div className="bg-[#1B2B48] h-full rounded-full" style={{width: `${p.calculatedProgress}%`}}></div>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon, color, active, onClick, subtitle, alert }: any) => {
    const colorClasses: Record<string, string> = {
        blue: 'text-blue-600 bg-blue-50 border-blue-100',
        indigo: 'text-indigo-600 bg-indigo-50 border-indigo-100',
        orange: 'text-orange-600 bg-orange-50 border-orange-100',
        green: 'text-green-600 bg-green-50 border-green-100'
    };

    const activeClasses: Record<string, string> = {
        blue: 'bg-blue-600 text-white ring-4 ring-blue-100',
        indigo: 'bg-indigo-600 text-white ring-4 ring-indigo-100',
        orange: 'bg-[#E95D22] text-white ring-4 ring-orange-100',
        green: 'bg-green-600 text-white ring-4 ring-green-100'
    };

    return (
        <div 
            onClick={onClick}
            className={`p-6 rounded-[35px] border transition-all duration-300 cursor-pointer group relative overflow-hidden ${
                active ? activeClasses[color] : `bg-white border-gray-100 ${colorClasses[color]}`
            }`}
        >
            <div className="flex justify-between items-start mb-4 relative z-10">
                <div className={`p-3 rounded-2xl ${active ? 'bg-white/20' : colorClasses[color]}`}>
                    {icon}
                </div>
                {alert && !active && (
                    <div className="animate-pulse">
                        <AlertCircle className="text-red-500" size={18} />
                    </div>
                )}
            </div>
            <div className="relative z-10">
                <h3 className="text-4xl font-black mb-1">{value || 0}</h3>
                <p className={`text-sm font-bold ${active ? 'text-white/80' : 'text-[#1B2B48]'}`}>{title}</p>
                <p className={`text-[10px] font-bold mt-1 ${active ? 'text-white/60' : 'text-gray-400'}`}>{subtitle}</p>
            </div>
        </div>
    );
};

export default DashboardModule;
