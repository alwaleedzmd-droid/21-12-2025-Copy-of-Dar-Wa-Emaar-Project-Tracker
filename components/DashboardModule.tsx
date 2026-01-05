
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, Zap, FileText, CheckCircle2, Clock, 
  Activity, Calendar, ArrowLeft, Filter, Search
} from 'lucide-react';

interface DashboardProps {
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
  projects, 
  techRequests, 
  clearanceRequests, 
  projectWorks = [], 
  currentUser 
}) => {
  const navigate = useNavigate();
  // حالة لتحديد الفلتر النشط (الكل، منجز، متابعة، إفراغات)
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'COMPLETED' | 'PENDING' | 'DEEDS'>('ALL');

  // --- 1. الحسابات الذكية للأرقام ---
  const stats = useMemo(() => {
    // دمج أعمال المشاريع والطلبات الفنية
    const allTasks = [...projectWorks, ...techRequests];
    
    return {
      activeProjects: projects.filter(p => p.status === 'active').length,
      // حساب المنجز (completed أو 'منجز')
      completedTasks: allTasks.filter(t => t.status === 'completed' || t.status === 'منجز').length,
      // حساب المتابعة (أي شيء ليس منجزاً)
      pendingTasks: allTasks.filter(t => t.status !== 'completed' && t.status !== 'منجز').length,
      totalDeeds: clearanceRequests.length,
      completionRate: allTasks.length > 0 
        ? Math.round((allTasks.filter(t => t.status === 'completed' || t.status === 'منجز').length / allTasks.length) * 100) 
        : 0
    };
  }, [projects, techRequests, clearanceRequests, projectWorks]);

  // --- 2. تصفية القائمة بناءً على البطاقة المختارة ---
  const filteredList = useMemo(() => {
    const allWorks = [...projectWorks, ...techRequests].map(item => ({
        ...item,
        category: 'WORK',
        // Fix: prioritize service_type so the dashboard shows the actual work description (e.g., فرز صكوك)
        label: item.service_type || item.type || item.task_name || 'عمل فني',
        date: item.created_at
    }));

    const allDeeds = clearanceRequests.map(item => ({
        ...item,
        category: 'DEED',
        label: `إفراغ: ${item.beneficiary_name || item.client_name} (${item.deed_number || ''})`,
        date: item.created_at,
        status: item.status || 'new'
    }));

    let data = [];

    switch (activeFilter) {
        case 'COMPLETED':
            data = allWorks.filter(t => t.status === 'completed' || t.status === 'منجز');
            break;
        case 'PENDING':
            data = allWorks.filter(t => t.status !== 'completed' && t.status !== 'منجز');
            break;
        case 'DEEDS':
            data = allDeeds;
            break;
        default: // 'ALL' - نعرض آخر التحديثات بشكل عام
            data = [...allWorks, ...allDeeds];
            break;
    }

    // ترتيب حسب الأحدث
    return data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [projectWorks, techRequests, clearanceRequests, activeFilter]);

  // دالة مساعدة لتحديد عنوان القائمة
  const getListTitle = () => {
      switch(activeFilter) {
          case 'COMPLETED': return '✅ قائمة الأعمال المنجزة';
          case 'PENDING': return '⏳ قائمة الأعمال قيد المتابعة';
          case 'DEEDS': return '📄 سجلات الإفراغ العقاري';
          default: return '⚡ آخر التحديثات والأنشطة';
      }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 font-cairo text-right">
      
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-[#1B2B48] mb-2">لوحة المعلومات المركزية</h2>
          <p className="text-gray-500 font-bold">أهلاً {currentUser?.name}، انقر على البطاقات لتصفية البيانات 👇</p>
        </div>
        <div className="hidden md:block">
           <p className="text-lg font-black text-[#1B2B48] flex items-center gap-2" dir="ltr">
             <Calendar size={18} className="text-[#E95D22]"/> {new Date().toLocaleDateString('ar-SA')}
           </p>
        </div>
      </div>

      {/* --- البطاقات التفاعلية (Interactive Cards) --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* 1. المشاريع (ينقل لصفحة المشاريع) */}
        <div 
            onClick={() => navigate('/projects')}
            className="bg-white p-6 rounded-[30px] shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-200 transition-all cursor-pointer group"
        >
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl group-hover:scale-110 transition-transform"><Building2 size={24} /></div>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">إدارة</span>
          </div>
          <h3 className="text-4xl font-black text-[#1B2B48] mb-1">{stats.activeProjects}</h3>
          <p className="text-gray-400 font-bold text-sm">مشاريع قائمة</p>
        </div>

        {/* 2. الإفراغات (فلتر) */}
        <div 
            onClick={() => setActiveFilter('DEEDS')}
            className={`p-6 rounded-[30px] shadow-sm border transition-all cursor-pointer group ${activeFilter === 'DEEDS' ? 'bg-[#1B2B48] text-white ring-4 ring-blue-100' : 'bg-white border-gray-100 hover:border-purple-200'}`}
        >
          <div className="flex justify-between items-start mb-4">
            <div className={`p-3 rounded-2xl transition-transform group-hover:scale-110 ${activeFilter === 'DEEDS' ? 'bg-white/10 text-white' : 'bg-purple-50 text-purple-600'}`}><FileText size={24} /></div>
          </div>
          <h3 className={`text-4xl font-black mb-1 ${activeFilter === 'DEEDS' ? 'text-white' : 'text-[#1B2B48]'}`}>{stats.totalDeeds}</h3>
          <p className={`font-bold text-sm ${activeFilter === 'DEEDS' ? 'text-gray-300' : 'text-gray-400'}`}>سجلات الإفراغ</p>
        </div>

        {/* 3. المنجز (فلتر) */}
        <div 
            onClick={() => setActiveFilter('COMPLETED')}
            className={`p-6 rounded-[30px] shadow-sm border transition-all cursor-pointer group ${activeFilter === 'COMPLETED' ? 'bg-green-500 text-white ring-4 ring-green-100' : 'bg-white border-gray-100 hover:border-green-200'}`}
        >
          <div className="flex justify-between items-start mb-4">
            <div className={`p-3 rounded-2xl transition-transform group-hover:scale-110 ${activeFilter === 'COMPLETED' ? 'bg-white/20 text-white' : 'bg-green-50 text-green-600'}`}><CheckCircle2 size={24} /></div>
            <span className={`text-xs font-bold px-2 py-1 rounded-lg ${activeFilter === 'COMPLETED' ? 'bg-white/20 text-white' : 'bg-green-50 text-green-600'}`}>
              {stats.completionRate}% إنجاز
            </span>
          </div>
          <h3 className={`text-4xl font-black mb-1 ${activeFilter === 'COMPLETED' ? 'text-white' : 'text-[#1B2B48]'}`}>{stats.completedTasks}</h3>
          <p className={`font-bold text-sm ${activeFilter === 'COMPLETED' ? 'text-green-100' : 'text-gray-400'}`}>مهام منجزة</p>
        </div>

        {/* 4. قيد المتابعة (فلتر) */}
        <div 
            onClick={() => setActiveFilter('PENDING')}
            className={`p-6 rounded-[30px] shadow-sm border transition-all cursor-pointer group ${activeFilter === 'PENDING' ? 'bg-[#E95D22] text-white ring-4 ring-orange-100' : 'bg-white border-gray-100 hover:border-orange-200'}`}
        >
          <div className="flex justify-between items-start mb-4">
            <div className={`p-3 rounded-2xl transition-transform group-hover:scale-110 ${activeFilter === 'PENDING' ? 'bg-white/20 text-white' : 'bg-orange-50 text-orange-600'}`}><Clock size={24} /></div>
            <span className={`text-xs font-bold px-2 py-1 rounded-lg ${activeFilter === 'PENDING' ? 'bg-white/20 text-white' : 'bg-orange-50 text-orange-600'}`}>
              عاجل
            </span>
          </div>
          <h3 className={`text-4xl font-black mb-1 ${activeFilter === 'PENDING' ? 'text-white' : 'text-[#1B2B48]'}`}>{stats.pendingTasks}</h3>
          <p className={`font-bold text-sm ${activeFilter === 'PENDING' ? 'text-orange-100' : 'text-gray-400'}`}>قيد المتابعة</p>
        </div>
      </div>

      {/* --- قسم القائمة التفاعلية --- */}
      <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100 min-h-[400px]">
          <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
            <h3 className="text-xl font-black text-[#1B2B48] flex items-center gap-2">
              <Filter className="text-[#E95D22]" size={20} />
              {getListTitle()}
            </h3>
            {activeFilter !== 'ALL' && (
                <button onClick={() => setActiveFilter('ALL')} className="text-sm text-gray-400 hover:text-[#E95D22] font-bold">
                    إلغاء الفلتر
                </button>
            )}
          </div>

          <div className="space-y-3">
            {filteredList.length === 0 ? (
              <div className="text-center py-20 text-gray-400 flex flex-col items-center">
                  <Search size={48} className="mb-4 text-gray-200" />
                  <p>لا توجد بيانات في هذا التصنيف حالياً</p>
              </div>
            ) : (
              filteredList.map((item: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-transparent hover:border-[#E95D22]/30 hover:bg-white hover:shadow-sm transition-all group">
                  
                  {/* تفاصيل العنصر */}
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 
                      ${item.status === 'completed' || item.status === 'منجز' ? 'bg-green-100 text-green-600' : 
                        item.category === 'DEED' ? 'bg-purple-100 text-purple-600' : 'bg-orange-100 text-orange-600'}`}>
                      {item.category === 'DEED' ? <FileText size={18}/> : 
                       (item.status === 'completed' || item.status === 'منجز' ? <CheckCircle2 size={18}/> : <Clock size={18}/>)}
                    </div>
                    
                    <div>
                      <h4 className="font-bold text-[#1B2B48] text-sm group-hover:text-[#E95D22] transition-colors">{item.label}</h4>
                      <p className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                        <span className="bg-white px-2 py-0.5 rounded border border-gray-200">{item.project_name || 'مشروع عام'}</span>
                        <span className="text-gray-400">{new Date(item.date).toLocaleDateString('ar-SA')}</span>
                      </p>
                    </div>
                  </div>

                  {/* زر الذهاب للمشروع */}
                  {item.projectId && (
                      <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/projects/${item.projectId}`);
                        }}
                        className="flex items-center gap-2 bg-white border border-gray-200 text-gray-500 px-4 py-2 rounded-xl text-xs font-bold hover:bg-[#1B2B48] hover:text-white hover:border-[#1B2B48] transition-all"
                      >
                        الذهاب للمشروع <ArrowLeft size={14}/>
                      </button>
                  )}
                  {item.category === 'DEED' && (
                      <button 
                        onClick={() => navigate('/deeds')}
                        className="flex items-center gap-2 bg-purple-50 text-purple-600 px-4 py-2 rounded-xl text-xs font-bold hover:bg-purple-100 transition-all"
                      >
                        تفاصيل الإفراغ <ArrowLeft size={14}/>
                      </button>
                  )}

                </div>
              ))
            )}
          </div>
      </div>
    </div>
  );
};

export default DashboardModule;
