import React, { useMemo } from 'react';
import { 
  Building2, Zap, FileText, Users, 
  ArrowUpRight, ArrowDownRight, Activity, 
  Clock, CheckCircle2, Plus, FileUp, 
  TrendingUp, Layers, MousePointer2
} from 'lucide-react';
import { ProjectSummary, TechnicalRequest, ClearanceRequest } from '../types';

interface DashboardModuleProps {
  projects: ProjectSummary[];
  techRequests: TechnicalRequest[];
  clearanceRequests: ClearanceRequest[];
  users: any[];
  onQuickAction: (action: string) => void;
}

const DashboardModule: React.FC<DashboardModuleProps> = ({ 
  projects, 
  techRequests, 
  clearanceRequests, 
  users,
  onQuickAction
}) => {

  // --- KPI Calculations ---
  const kpiStats = useMemo(() => {
    const activeProjects = projects.filter(p => p.status === 'active' || p.progress < 100).length;
    const pendingTech = techRequests.filter(r => r.status !== 'completed' && r.status !== 'منجز').length;
    const totalClearance = clearanceRequests.length;
    const teamCount = users.length;

    return { activeProjects, pendingTech, totalClearance, teamCount };
  }, [projects, techRequests, clearanceRequests, users]);

  // --- Analytics: CSS Donut Chart for Tech Requests ---
  const techAnalytics = useMemo(() => {
    const distribution: Record<string, number> = {};
    techRequests.forEach(req => {
      const type = req.service_type || 'أخرى';
      distribution[type] = (distribution[type] || 0) + 1;
    });

    const sorted = Object.entries(distribution)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 4);

    const total = Object.values(distribution).reduce((acc, curr) => acc + curr, 0) || 1;
    const colors = ['#1B2B48', '#E95D22', '#F59E0B', '#10B981'];

    let cumulativePercent = 0;
    const gradientParts = sorted.map(([_, count], i) => {
      const start = cumulativePercent;
      const end = start + (count / total) * 100;
      cumulativePercent = end;
      return `${colors[i]} ${start}% ${end}%`;
    });

    return { sorted, total, gradient: gradientParts.join(', '), colors };
  }, [techRequests]);

  // --- Recent Activity (تم التحديث: الترتيب حسب آخر تعديل) ---
  const recentActivities = useMemo(() => {
    const combined = [
      ...techRequests.map(r => ({ ...r, type: 'فني' })),
      ...clearanceRequests.map(r => ({ ...r, type: 'إفراغ', service_type: 'سجل إفراغ' }))
    ]
    .sort((a, b) => {
      // نأخذ التاريخ الأحدث بين الإنشاء والتعديل
      const dateA = new Date(a.updated_at || a.created_at).getTime();
      const dateB = new Date(b.updated_at || b.created_at).getTime();
      return dateB - dateA; // ترتيب تنازلي (الأحدث أولاً)
    })
    .slice(0, 6);
    
    return combined;
  }, [techRequests, clearanceRequests]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700 font-cairo" dir="rtl">
      
      {/* 1. TOP KPI SECTION */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard 
          title="المشاريع النشطة" 
          value={kpiStats.activeProjects} 
          subText={`من إجمالي ${projects.length} مشروع`}
          icon={<Layers size={24}/>} 
          trend="up"
          color="bg-blue-50 text-blue-600"
        />
        <KPICard 
          title="طلبات قيد المتابعة" 
          value={kpiStats.pendingTech} 
          subText="تتطلب إجراءات فنية"
          icon={<Zap size={24}/>} 
          trend="down"
          color="bg-amber-50 text-amber-600"
        />
        <KPICard 
          title="عمليات الإفراغ" 
          value={kpiStats.totalClearance} 
          subText="سجلات مكتملة"
          icon={<FileText size={24}/>} 
          trend="up"
          color="bg-cyan-50 text-cyan-600"
        />
        <KPICard 
          title="أعضاء الفريق" 
          value={kpiStats.teamCount} 
          subText="مستخدم مسجل"
          icon={<Users size={24}/>} 
          trend="up"
          color="bg-indigo-50 text-indigo-600"
        />
      </div>

      {/* 2. ANALYTICS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* CSS Donut: Distribution */}
        <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm flex flex-col items-center">
          <div className="w-full flex justify-between items-center mb-8">
             <h3 className="font-black text-[#1B2B48] flex items-center gap-2">
                <Activity size={20} className="text-gray-400" /> تحليل الخدمات
             </h3>
             <TrendingUp size={18} className="text-gray-300" />
          </div>

          <div className="relative w-48 h-48 mb-8">
            <div 
              className="w-full h-full rounded-full shadow-inner transform -rotate-90"
              style={{ background: `conic-gradient(${techAnalytics.gradient || '#f3f4f6 0% 100%'})` }}
            />
            <div className="absolute inset-6 bg-white rounded-full shadow-sm flex flex-col items-center justify-center">
              <span className="text-3xl font-black text-[#1B2B48]">{techAnalytics.total}</span>
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">إجمالي الطلبات</span>
            </div>
          </div>

          <div className="w-full space-y-3">
            {techAnalytics.sorted.map(([label, count], idx) => (
              <div key={label} className="flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: techAnalytics.colors[idx] }} />
                  <span className="text-xs font-bold text-gray-600 group-hover:text-[#1B2B48] transition-colors">{label}</span>
                </div>
                <span className="text-xs font-black text-[#1B2B48] bg-gray-50 px-2 py-0.5 rounded-md">
                  {Math.round((count / techAnalytics.total) * 100)}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Bar Chart: Project Progress */}
        <div className="lg:col-span-2 bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm">
           <h3 className="font-black text-[#1B2B48] mb-8 flex items-center gap-2">
              <CheckCircle2 size={20} className="text-gray-400" /> أداء إنجاز المشاريع (Top 5)
           </h3>
           <div className="space-y-8">
              {projects.slice(0, 5).map((p, idx) => (
                <div key={p.id}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-bold text-[#1B2B48]">{p.client || p.title}</span>
                    <span className="text-xs font-black text-[#E95D22]">{Math.round(p.progress || 0)}%</span>
                  </div>
                  <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden flex">
                     <div 
                        className={`h-full rounded-full transition-all duration-1000 ease-out shadow-sm ${idx % 2 === 0 ? 'bg-[#1B2B48]' : 'bg-[#E95D22]'}`}
                        style={{ width: `${p.progress}%` }}
                     />
                  </div>
                </div>
              ))}
              {projects.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center py-20 opacity-20">
                   <Layers size={48} />
                   <p className="font-bold">لا توجد مشاريع مسجلة</p>
                </div>
              )}
           </div>
        </div>
      </div>

      {/* 3. ACTIVITY & ACTIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Activity Table */}
        <div className="lg:col-span-2 bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
           <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
              <h3 className="font-black text-[#1B2B48] flex items-center gap-2">
                <Clock size={20} className="text-gray-400" /> آخر النشاطات المحدثة
              </h3>
              <button className="text-[10px] text-blue-600 font-bold hover:underline">مشاهدة الكل</button>
           </div>
           <div className="overflow-x-auto">
              <table className="w-full text-right">
                 <thead className="bg-gray-50/50 text-[10px] text-gray-400 font-black uppercase tracking-wider">
                    <tr>
                       <th className="p-6">المشروع</th>
                       <th className="p-6">نوع الإجراء</th>
                       <th className="p-6">الحالة</th>
                       <th className="p-6">التاريخ</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-50">
                    {recentActivities.map((act: any, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/80 transition-colors group">
                         <td className="p-6">
                            <span className="font-black text-[#1B2B48] text-sm">{act.project_name || 'غير محدد'}</span>
                         </td>
                         <td className="p-6">
                            <div className="flex items-center gap-2">
                               <div className={`w-1.5 h-1.5 rounded-full ${act.type === 'فني' ? 'bg-amber-400' : 'bg-cyan-400'}`} />
                               <span className="text-xs font-bold text-gray-600">{act.service_type || 'طلب خدمة'}</span>
                            </div>
                         </td>
                         <td className="p-6">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black shadow-sm ${
                              act.status === 'completed' || act.status === 'منجز' 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-amber-100 text-amber-700'
                            }`}>
                               {act.status === 'completed' || act.status === 'منجز' ? 'منجز' : (act.status || 'جديد')}
                            </span>
                         </td>
                         {/* نعرض تاريخ التحديث إن وجد، وإلا تاريخ الإنشاء */}
                         <td className="p-6 text-[10px] text-gray-400 font-bold" dir="ltr">
                            {new Date(act.updated_at || act.created_at).toLocaleDateString('en-GB')}
                         </td>
                      </tr>
                    ))}
                    {recentActivities.length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-20 text-center text-gray-300 italic font-bold">لا يوجد نشاط مسجل</td>
                      </tr>
                    )}
                 </tbody>
              </table>
           </div>
        </div>

        {/* Quick Actions Panel */}
        <div className="bg-[#1B2B48] p-8 rounded-[40px] text-white shadow-2xl relative overflow-hidden flex flex-col justify-between">
           <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl pointer-events-none" />
           
           <div className="relative z-10">
              <div className="flex items-center gap-3 mb-8">
                 <div className="p-3 bg-white/10 rounded-2xl"><MousePointer2 size={24} /></div>
                 <div>
                    <h3 className="text-xl font-black">إجراءات سريعة</h3>
                    <p className="text-[10px] text-white/50 font-bold">إدارة العمليات بضغطة زر</p>
                 </div>
              </div>

              <div className="space-y-4">
                 <QuickButton 
                    label="إضافة مشروع جديد" 
                    icon={<Building2 size={18}/>} 
                    onClick={() => onQuickAction('add_project')} 
                 />
                 <QuickButton 
                    label="رفع ملف إفراغات (Excel)" 
                    icon={<FileUp size={18}/>} 
                    onClick={() => onQuickAction('upload_excel')} 
                 />
                 <QuickButton 
                    label="طلب عمل فني جديد" 
                    icon={<Zap size={18}/>} 
                    onClick={() => onQuickAction('add_request')} 
                 />
              </div>
           </div>

           <div className="mt-12 pt-8 border-t border-white/5 relative z-10">
              <p className="text-[9px] text-white/30 font-bold leading-relaxed">
                 * جميع الإجراءات المذكورة أعلاه تساهم في تحديث البيانات الفورية وتظهر في سجل الإشعارات للفريق المختص.
              </p>
           </div>
        </div>

      </div>
    </div>
  );
};

// --- Sub-Components ---

const KPICard = ({ title, value, subText, icon, trend, color }: any) => (
  <div className="bg-white p-7 rounded-[35px] border border-gray-100 shadow-sm flex items-center justify-between group hover:-translate-y-1 transition-all duration-300">
    <div>
      <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider mb-2">{title}</p>
      <h3 className="text-4xl font-black text-[#1B2B48] mb-1">{value}</h3>
      <p className="text-[10px] text-gray-400 font-bold flex items-center gap-1">
        {trend === 'up' ? <ArrowUpRight size={12} className="text-green-500"/> : <ArrowDownRight size={12} className="text-red-500"/>}
        {subText}
      </p>
    </div>
    <div className={`p-5 rounded-3xl ${color} shadow-sm group-hover:scale-110 transition-transform`}>
      {icon}
    </div>
  </div>
);

const QuickButton = ({ label, icon, onClick }: any) => (
  <button 
    onClick={onClick}
    className="w-full flex items-center justify-between p-5 bg-white/5 hover:bg-white/10 rounded-[22px] transition-all group backdrop-blur-md border border-white/5 hover:border-white/10"
  >
     <div className="flex items-center gap-3">
        <div className="p-2 bg-white/5 rounded-lg text-white/50 group-hover:text-white transition-colors">{icon}</div>
        <span className="font-bold text-sm">{label}</span>
     </div>
     <ArrowUpRight size={16} className="text-white/20 group-hover:text-white group-hover:translate-x-1 transition-all" />
  </button>
);

export default DashboardModule;