
import React, { useState, useMemo } from 'react';
import { 
  Building2, Zap, FileText, Users, 
  ArrowUpRight, ArrowDownRight, Activity, 
  Clock, CheckCircle2, Plus, FileUp, 
  TrendingUp, Layers, MousePointer2,
  ChevronDown, ChevronUp, ShieldCheck,
  Search, Download, Edit3, MoreVertical
} from 'lucide-react';
import { ProjectSummary, TechnicalRequest, ClearanceRequest, User } from '../types';

interface DashboardModuleProps {
  projects: ProjectSummary[];
  techRequests: TechnicalRequest[];
  clearanceRequests: ClearanceRequest[];
  users: any[];
  currentUser: User | null;
  onQuickAction: (action: string) => void;
  onUpdateStatus?: (requestId: number, newStatus: string) => void;
}

const DashboardModule: React.FC<DashboardModuleProps> = ({ 
  projects, 
  techRequests, 
  clearanceRequests, 
  users,
  currentUser,
  onQuickAction,
  onUpdateStatus
}) => {
  // --- Simulation State ---
  const [activeRole, setActiveRole] = useState<'PR' | 'DEEDS'>(
    currentUser?.role === 'PR_MANAGER' ? 'PR' : 'DEEDS'
  );
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  // Permissions logic
  const canEditStatus = activeRole === 'PR';
  const canUploadDocs = true; // Both roles can upload operational docs

  // --- Toggle Logic ---
  const toggleRow = (id: number) => {
    const next = new Set(expandedRows);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedRows(next);
  };

  // --- Data Calculations ---
  const stats = useMemo(() => {
    const completed = clearanceRequests.filter(r => r.status === 'completed' || r.status === 'منجز').length;
    return {
      active: projects.length,
      pending: clearanceRequests.filter(r => r.status !== 'completed').length,
      totalValue: clearanceRequests.reduce((acc, curr) => acc + (parseFloat(curr.deal_value || '0')), 0),
      team: users.length
    };
  }, [projects, clearanceRequests, users]);

  const filteredRequests = useMemo(() => {
    return clearanceRequests.filter(r => 
      r.client_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.project_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [clearanceRequests, searchQuery]);

  // CSS Donut Calculation
  const chartData = useMemo(() => {
    const total = techRequests.length || 1;
    const electricity = techRequests.filter(r => r.service_type.includes('كهرباء')).length;
    const water = techRequests.filter(r => r.service_type.includes('مياه')).length;
    const others = total - (electricity + water);

    const p1 = (electricity / total) * 100;
    const p2 = (water / total) * 100;
    
    return {
      gradient: `conic-gradient(#1B2B48 0% ${p1}%, #E95D22 ${p1}% ${p1+p2}%, #94a3b8 ${p1+p2}% 100%)`,
      legend: [
        { label: 'كهرباء', val: electricity, color: '#1B2B48' },
        { label: 'مياه', val: water, color: '#E95D22' },
        { label: 'أخرى', val: others, color: '#94a3b8' }
      ]
    };
  }, [techRequests]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700 font-cairo" dir="rtl">
      
      {/* ROLE SIMULATOR (Enterprise Tool) */}
      <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[60] bg-white/80 backdrop-blur-xl border border-gray-200 px-4 py-2 rounded-full shadow-2xl flex items-center gap-4">
        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-l pl-4 border-gray-100">محاكي الأدوار</span>
        <div className="flex bg-gray-100 p-1 rounded-full">
           <button 
            onClick={() => setActiveRole('PR')}
            className={`px-6 py-1.5 rounded-full text-xs font-black transition-all ${activeRole === 'PR' ? 'bg-[#1B2B48] text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}
           >
            مدير العلاقات العامة
           </button>
           <button 
            onClick={() => setActiveRole('DEEDS')}
            className={`px-6 py-1.5 rounded-full text-xs font-black transition-all ${activeRole === 'DEEDS' ? 'bg-[#E95D22] text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}
           >
            فريق الإفراغات
           </button>
        </div>
      </div>

      {/* KPI SECTION */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard title="المشاريع العقارية" value={stats.active} icon={<Building2/>} color="text-blue-600" bg="bg-blue-50" />
        <KPICard title="إفراغات قيد العمل" value={stats.pending} icon={<Clock/>} color="text-amber-600" bg="bg-amber-50" />
        <KPICard title="القيمة التعاقدية" value={`${(stats.totalValue / 1000000).toFixed(1)}M`} icon={<LandmarkIcon/>} color="text-emerald-600" bg="bg-emerald-50" />
        <KPICard title="فريق العمليات" value={stats.team} icon={<Users/>} color="text-indigo-600" bg="bg-indigo-50" />
      </div>

      {/* ANALYTICS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* CSS Donut Chart */}
        <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm">
           <div className="flex justify-between items-center mb-10">
              <h3 className="font-black text-[#1B2B48] flex items-center gap-2">
                <TrendingUp size={18} className="text-gray-400" /> تحليل فني
              </h3>
           </div>
           
           <div className="flex flex-col items-center">
              <div className="relative w-40 h-40 mb-8">
                <div 
                  className="w-full h-full rounded-full transform -rotate-90"
                  style={{ background: chartData.gradient }}
                />
                <div className="absolute inset-5 bg-white rounded-full flex flex-col items-center justify-center shadow-inner">
                  <span className="text-2xl font-black text-[#1B2B48]">{techRequests.length}</span>
                  <span className="text-[9px] text-gray-400 font-bold uppercase">إجمالي الطلبات</span>
                </div>
              </div>

              <div className="w-full space-y-3">
                {chartData.legend.map(item => (
                  <div key={item.label} className="flex items-center justify-between text-xs font-bold">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
                      <span className="text-gray-500">{item.label}</span>
                    </div>
                    <span className="text-[#1B2B48]">{item.val}</span>
                  </div>
                ))}
              </div>
           </div>
        </div>

        {/* Search & Main Data Table (One-to-Many Accordion) */}
        <div className="lg:col-span-2 bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-8 border-b border-gray-50 bg-gray-50/20 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
             <div>
                <h3 className="text-xl font-black text-[#1B2B48]">سجل الإفراغات والوحدات</h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                  {activeRole === 'PR' ? 'عرض بصلاحيات مدير العلاقات' : 'عرض بصلاحيات موظف العمليات'}
                </p>
             </div>
             
             <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                   <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                   <input 
                    type="text" 
                    placeholder="بحث باسم العميل..." 
                    className="w-full pr-10 pl-4 py-2.5 bg-white border border-gray-200 rounded-xl outline-none focus:border-[#1B2B48] transition-all text-sm font-bold"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                   />
                </div>
                <button className="p-2.5 bg-[#1B2B48] text-white rounded-xl shadow-lg hover:brightness-110 active:scale-95 transition-all">
                   <Download size={20} />
                </button>
             </div>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-right">
              <thead className="bg-gray-50/50 text-[10px] text-gray-400 font-black uppercase border-b border-gray-50">
                <tr>
                  <th className="p-6">العميل والمشروع</th>
                  <th className="p-6">الحالة</th>
                  <th className="p-6">القيمة</th>
                  <th className="p-6">التاريخ</th>
                  <th className="p-6 text-left">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredRequests.map(req => (
                  <React.Fragment key={req.id}>
                    <tr className={`hover:bg-gray-50/50 transition-colors group ${expandedRows.has(req.id) ? 'bg-blue-50/20' : ''}`}>
                      <td className="p-6">
                         <div className="flex items-center gap-4">
                            <button 
                              onClick={() => toggleRow(req.id)}
                              className={`p-1 rounded-lg border transition-all ${expandedRows.has(req.id) ? 'bg-[#1B2B48] text-white border-[#1B2B48]' : 'bg-white text-gray-400 border-gray-200'}`}
                            >
                              {expandedRows.has(req.id) ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                            </button>
                            <div>
                               <p className="font-black text-[#1B2B48] text-sm">{req.client_name}</p>
                               <p className="text-[10px] text-gray-400 font-bold">{req.project_name}</p>
                            </div>
                         </div>
                      </td>
                      <td className="p-6">
                         {canEditStatus ? (
                            <select 
                              className="bg-transparent border-b border-gray-200 text-xs font-black text-[#1B2B48] py-1 outline-none focus:border-[#E95D22]"
                              value={req.status}
                              onChange={(e) => onUpdateStatus?.(req.id, e.target.value)}
                            >
                               <option value="new">جديد</option>
                               <option value="pending">قيد المعالجة</option>
                               <option value="completed">تم الإفراغ</option>
                               <option value="delivered">تم التسليم</option>
                            </select>
                         ) : (
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black shadow-sm ${
                              req.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                               {req.status === 'completed' ? 'منجز' : 'قيد العمل'}
                            </span>
                         )}
                      </td>
                      <td className="p-6 font-black text-xs text-gray-600">
                         {parseFloat(req.deal_value || '0').toLocaleString()} ر.س
                      </td>
                      <td className="p-6 text-[10px] text-gray-400 font-bold" dir="ltr">
                        {new Date(req.created_at).toLocaleDateString('en-GB')}
                      </td>
                      <td className="p-6 text-left">
                         <div className="flex items-center justify-end gap-2">
                            {canUploadDocs && (
                              <button className="p-2 bg-gray-50 text-gray-400 hover:text-[#E95D22] hover:bg-orange-50 rounded-lg transition-all" title="رفع وثائق">
                                 <FileUp size={16} />
                              </button>
                            )}
                            <button className="p-2 text-gray-300 hover:text-gray-600">
                               <MoreVertical size={16} />
                            </button>
                         </div>
                      </td>
                    </tr>
                    
                    {/* ACCORDION CONTENT (One-to-Many Units) */}
                    {expandedRows.has(req.id) && (
                      <tr>
                        <td colSpan={5} className="bg-gray-50/30 p-0 border-b border-gray-100">
                           <div className="p-8 space-y-4 animate-in slide-in-from-top-2">
                              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                <Layers size={14} /> الوحدات السكنية المرتبطة
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                 {/* Simulated Units Data */}
                                 {[1, 2, 3].map(uIdx => (
                                   <div key={uIdx} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between group hover:border-[#E95D22] transition-all">
                                      <div>
                                         <p className="text-xs font-black text-[#1B2B48]">وحدة رقم {uIdx * 102}</p>
                                         <p className="text-[10px] text-gray-400 font-bold">الدور {uIdx === 1 ? 'الأرضي' : 'الأول'}</p>
                                      </div>
                                      <div className="flex items-center gap-2">
                                         <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                         <span className="text-[10px] font-bold text-green-700">متاحة</span>
                                      </div>
                                   </div>
                                 ))}
                                 <button className="border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center p-4 text-gray-300 hover:border-[#1B2B48] hover:text-[#1B2B48] transition-all group">
                                    <Plus size={18} className="group-hover:scale-110 transition-transform" />
                                    <span className="text-[9px] font-black mt-1">ربط وحدة</span>
                                 </button>
                              </div>
                           </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* QUICK ACTIONS BAR (Bottom) */}
      <div className="bg-[#1B2B48] p-8 rounded-[40px] text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl relative overflow-hidden">
         <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent pointer-events-none" />
         <div className="relative z-10">
            <h4 className="text-xl font-black">إدارة الطلبات المتقدمة</h4>
            <p className="text-[10px] text-white/50 font-bold uppercase tracking-widest mt-1">مركز التحكم التشغيلي</p>
         </div>
         <div className="flex flex-wrap justify-center gap-4 relative z-10">
            <button onClick={() => onQuickAction('add_project')} className="bg-white text-[#1B2B48] px-6 py-3 rounded-2xl font-black text-sm hover:scale-105 active:scale-95 transition-all flex items-center gap-2 shadow-xl">
               <Plus size={18} /> إضافة مشروع
            </button>
            <button onClick={() => onQuickAction('upload_excel')} className="bg-white/10 hover:bg-white/20 border border-white/10 px-6 py-3 rounded-2xl font-black text-sm transition-all flex items-center gap-2">
               <FileUp size={18} /> رفع إكسل
            </button>
            <button className="bg-[#E95D22] text-white px-6 py-3 rounded-2xl font-black text-sm shadow-xl hover:brightness-110 transition-all flex items-center gap-2">
               <ShieldCheck size={18} /> تدقيق نهائي
            </button>
         </div>
      </div>
    </div>
  );
};

// --- Sub Components ---

const KPICard = ({ title, value, icon, color, bg }: any) => (
  <div className="bg-white p-7 rounded-[35px] border border-gray-100 shadow-sm flex items-center justify-between group hover:-translate-y-1 transition-all">
    <div>
      <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider mb-2">{title}</p>
      <h3 className="text-3xl font-black text-[#1B2B48]">{value}</h3>
    </div>
    <div className={`p-5 rounded-2xl ${bg} ${color} group-hover:scale-110 transition-transform`}>
      {icon}
    </div>
  </div>
);

const LandmarkIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="21" x2="21" y2="21"></line>
    <line x1="3" y1="7" x2="21" y2="7"></line>
    <path d="M5 21V7"></path>
    <path d="M9 21V7"></path>
    <path d="M15 21V7"></path>
    <path d="M19 21V7"></path>
    <path d="M2 7l10-5 10 5"></path>
  </svg>
);

export default DashboardModule;
