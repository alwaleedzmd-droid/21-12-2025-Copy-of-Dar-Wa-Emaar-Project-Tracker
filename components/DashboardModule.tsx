
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Building2, Zap, FileText, Users, 
  ArrowUpLeft, Clock, CheckCircle2, Plus, 
  TrendingUp, Layers, Search, Download, 
  MoreVertical, Activity, AlertCircle, ChevronLeft
} from 'lucide-react';
import { ProjectSummary, TechnicalRequest, ClearanceRequest, User } from '../types';
import { ActivityLog } from '../App';

interface DashboardModuleProps {
  projects: ProjectSummary[];
  techRequests: TechnicalRequest[];
  clearanceRequests: any[];
  users: any[];
  currentUser: User | null;
  activities: ActivityLog[];
  onQuickAction: (action: string) => void;
  onUpdateStatus?: (requestId: number, newStatus: string) => void;
}

const DashboardModule: React.FC<DashboardModuleProps> = ({ 
  projects, 
  techRequests, 
  clearanceRequests, 
  currentUser,
  activities,
  onQuickAction
}) => {
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');
  const [searchQuery, setSearchQuery] = useState('');

  // Helper to calculate "Time Ago"
  const getTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return 'الآن';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `منذ ${minutes} دقيقة`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `منذ ${hours} ساعة`;
    return new Date(date).toLocaleDateString('ar-SA');
  };

  // STRICT ACCESS CONTROL
  if (currentUser?.role !== 'PR_MANAGER' && currentUser?.role !== 'ADMIN') {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-12 text-center bg-white rounded-[40px] shadow-sm border border-red-100">
        <div className="bg-red-50 p-6 rounded-full text-red-500 mb-6 border border-red-100 shadow-inner"><AlertCircle size={64} /></div>
        <h2 className="text-3xl font-black text-[#1B2B48] mb-4">403 - الوصول غير مصرح</h2>
        <p className="text-gray-500 font-bold max-w-md">عذراً، هذه اللوحة مخصصة حصرياً لإدارة العلاقات العامة والمسؤولين.</p>
      </div>
    );
  }

  // DYNAMIC CALCULATIONS
  const stats = useMemo(() => {
    const totalTasks = techRequests.length;
    const completedTasks = techRequests.filter(t => t.status === 'completed' || t.status === 'منجز').length;
    const activeReleases = clearanceRequests.filter(r => r.status !== 'مكتمل' && r.status !== 'منجز').length;
    
    return {
      totalProjects: projects.length,
      activeReleases: activeReleases,
      pendingTasks: totalTasks - completedTasks,
      completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
    };
  }, [projects, techRequests, clearanceRequests]);

  const filteredTasks = useMemo(() => {
    return techRequests.filter(task => {
      const matchesTab = activeTab === 'completed' 
        ? (task.status === 'completed' || task.status === 'منجز')
        : (task.status !== 'completed' && task.status !== 'منجز');
      const matchesSearch = task.service_type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            task.project_name?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesTab && matchesSearch;
    });
  }, [techRequests, activeTab, searchQuery]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700 font-cairo" dir="rtl">
      
      {/* KEY METRICS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard title="إجمالي المشاريع" value={stats.totalProjects} trend="نشط حالياً" icon={<Building2/>} color="text-blue-600" bg="bg-blue-50" />
        <KPICard title="إفراغات نشطة" value={stats.activeReleases} trend="قيد التدقيق" icon={<FileText/>} color="text-orange-600" bg="bg-orange-50" />
        <KPICard title="أعمال فنية معلقة" value={stats.pendingTasks} trend="تتطلب متابعة" icon={<Zap/>} color="text-amber-600" bg="bg-amber-50" />
        <KPICard title="نسبة الإنجاز العام" value={`${stats.completionRate}%`} trend="كفاءة التشغيل" icon={<Activity/>} color="text-emerald-600" bg="bg-emerald-50" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* INTERACTIVE WORKS SECTION */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden flex flex-col">
            <div className="p-8 border-b border-gray-50 bg-gray-50/20 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
               <div>
                  <h3 className="text-xl font-black text-[#1B2B48]">مركز متابعة الأعمال</h3>
                  <div className="flex gap-4 mt-4">
                    <button onClick={() => setActiveTab('pending')} className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'pending' ? 'bg-[#1B2B48] text-white shadow-lg' : 'text-gray-400 hover:bg-gray-100'}`}>أعمال قيد التنفيذ ({stats.pendingTasks})</button>
                    <button onClick={() => setActiveTab('completed')} className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'completed' ? 'bg-green-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-100'}`}>الأعمال المنجزة ({techRequests.length - stats.pendingTasks})</button>
                  </div>
               </div>
               <div className="relative w-full md:w-64">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                  <input type="text" placeholder="بحث في الأعمال..." className="w-full pr-10 pl-4 py-2.5 bg-white border border-gray-200 rounded-xl outline-none focus:border-[#E95D22] text-sm font-bold" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}/>
               </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead className="bg-gray-50/50 text-[10px] text-gray-400 font-black uppercase border-b border-gray-50">
                  <tr><th className="p-6">بيان العمل</th><th className="p-6">المشروع</th><th className="p-6">الحالة</th><th className="p-6 text-left">التفاصيل</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredTasks.slice(0, 6).map(task => (
                    <tr key={task.id} className="hover:bg-gray-50/50 transition-colors group cursor-pointer" onClick={() => console.log('MapsToTask:', task.id)}>
                      <td className="p-6">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${activeTab === 'completed' ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'}`}><Zap size={16} /></div>
                          <span className="font-bold text-[#1B2B48] text-sm">{task.service_type}</span>
                        </div>
                      </td>
                      <td className="p-6 text-xs font-bold text-gray-400">{task.project_name}</td>
                      <td className="p-6"><span className={`px-3 py-1 rounded-full text-[10px] font-black ${activeTab === 'completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{task.status}</span></td>
                      <td className="p-6 text-left"><ChevronLeft size={16} className="text-gray-300 group-hover:text-[#E95D22] group-hover:translate-x-[-4px] transition-all" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* LIVE ACTIVITY FEED */}
        <div className="space-y-8">
          <div className="bg-[#1B2B48] p-8 rounded-[40px] text-white shadow-xl relative overflow-hidden">
             <div className="absolute top-[-20px] left-[-20px] w-32 h-32 bg-white/5 rounded-full blur-3xl" />
             <h4 className="text-xl font-black mb-6">إجراءات سريعة</h4>
             <div className="grid grid-cols-1 gap-3">
                <button onClick={() => onQuickAction('add_project')} className="w-full flex items-center justify-between p-4 bg-white/10 hover:bg-white/20 rounded-2xl transition-all group">
                  <span className="font-bold text-sm">مشروع جديد</span>
                  <Plus size={18} className="group-hover:rotate-90 transition-transform" />
                </button>
                <button onClick={() => onQuickAction('upload_excel')} className="w-full flex items-center justify-between p-4 bg-white text-[#1B2B48] rounded-2xl transition-all hover:scale-[1.02]">
                  <span className="font-bold text-sm">تسجيل إفراغ جديد</span>
                  <ArrowUpLeft size={18} />
                </button>
             </div>
          </div>

          <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm">
             <h4 className="font-black text-[#1B2B48] mb-6 flex items-center gap-2">
               <TrendingUp size={18} className="text-[#E95D22]" /> النشاطات الحية (Log)
             </h4>
             <div className="space-y-6 max-h-[400px] overflow-y-auto no-scrollbar pr-2">
                {activities.length === 0 ? (
                  <p className="text-center text-gray-300 font-bold py-10 italic">لا توجد نشاطات مسجلة بعد</p>
                ) : (
                  activities.map(act => (
                    <div key={act.id} className="flex gap-4 border-r-2 border-gray-50 pr-4 relative">
                      <div className={`absolute right-[-5px] top-1 w-2.5 h-2.5 rounded-full bg-current ${act.color} ring-4 ring-white shadow-sm`} />
                      <div className="flex-1">
                        <p className="text-xs font-black text-[#1B2B48]">{act.user} <span className="font-bold text-gray-400">{act.action}</span></p>
                        <p className="text-[11px] font-bold text-blue-600 mt-0.5">{act.target}</p>
                        <p className="text-[9px] text-gray-300 mt-1">{getTimeAgo(act.timestamp)}</p>
                      </div>
                    </div>
                  ))
                )}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const KPICard = ({ title, value, trend, icon, color, bg }: any) => (
  <div className="bg-white p-7 rounded-[35px] border border-gray-100 shadow-sm flex items-center justify-between group hover:-translate-y-1 transition-all">
    <div className="space-y-2">
      <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider">{title}</p>
      <h3 className="text-3xl font-black text-[#1B2B48]">{value}</h3>
      <p className="text-[9px] font-bold text-gray-300">{trend}</p>
    </div>
    <div className={`p-5 rounded-2xl ${bg} ${color} group-hover:scale-110 transition-transform shadow-sm`}>{icon}</div>
  </div>
);

export default DashboardModule;
