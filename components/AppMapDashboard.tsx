
import React from 'react';
import { 
  FileStack, 
  LogIn, 
  BarChart3, 
  Users, 
  Map as MapIcon, 
  ArrowLeft,
  ShieldAlert,
  ChevronLeft,
  Building2,
  Zap
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { User } from '../types';

interface AppMapDashboardProps {
  currentUser: User | null;
  onLogout: () => void;
}

const AppMapDashboard: React.FC<AppMapDashboardProps> = ({ currentUser, onLogout }) => {
  const navigate = useNavigate();

  if (!currentUser || !['ADMIN', 'PR_MANAGER'].includes(currentUser.role)) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-12 text-center animate-in fade-in duration-500">
        <div className="bg-red-50 p-6 rounded-full text-red-500 mb-6 border border-red-100 shadow-sm">
          <ShieldAlert size={64} />
        </div>
        <h2 className="text-3xl font-black text-[#1B2B48] mb-4">403 - الوصول مرفوض</h2>
        <p className="text-gray-500 font-bold max-w-md leading-relaxed">
          عذراً، هذه الصفحة مخصصة حصرياً لإدارة العلاقات العامة ومدير النظام. لا تملك الصلاحيات الكافية لعرض خريطة التطبيق.
        </p>
        <button 
          onClick={() => navigate('/dashboard')}
          className="mt-8 flex items-center gap-2 px-8 py-4 bg-[#1B2B48] text-white rounded-2xl font-black transition-all hover:scale-105 active:scale-95 shadow-xl"
        >
          <ArrowLeft size={20} /> العودة للرئيسية
        </button>
      </div>
    );
  }

  const mapItems = [
    {
      title: 'لوحة الإحصائيات',
      description: 'تحليل بياني شامل لأداء المشاريع ونسب الإنجاز الفنية.',
      icon: <BarChart3 className="text-emerald-600" size={32} />,
      action: () => navigate('/statistics'),
      color: 'bg-emerald-50'
    },
    {
      title: 'إدارة المشاريع',
      description: 'استعراض وإدارة كافة المشاريع الإنشائية وتفاصيلها الفنية والهندسية.',
      icon: <Building2 className="text-blue-600" size={32} />,
      action: () => navigate('/projects'),
      color: 'bg-blue-50'
    },
    {
      title: 'سجل الإفراغات العام',
      description: 'استعراض كافة طلبات الإفراغ وإدارة الحالة القانونية للصفقات.',
      icon: <FileStack className="text-orange-500" size={32} />,
      action: () => navigate('/deeds'),
      color: 'bg-orange-50'
    },
    {
      title: 'الطلبات الفنية',
      description: 'متابعة المراجعات الحكومية والطلبات الفنية مع الجهات ذات العلاقة.',
      icon: <Zap className="text-indigo-600" size={32} />,
      action: () => navigate('/technical'),
      color: 'bg-indigo-50'
    },
    {
      title: 'إدارة المستخدمين',
      description: 'استعراض صلاحيات فريق العمل وتوزيع الأدوار (عرض فقط).',
      icon: <Users className="text-rose-600" size={32} />,
      action: () => navigate('/users'),
      color: 'bg-rose-50'
    },
    {
      title: 'شاشة تسجيل الدخول',
      description: 'الخروج من النظام والعودة لشاشة التحقق من الهوية.',
      icon: <LogIn className="text-gray-600" size={32} />,
      action: onLogout,
      color: 'bg-gray-100'
    }
  ];

  return (
    <div className="space-y-10 animate-in fade-in duration-700 font-cairo" dir="rtl">
      <div className="flex justify-between items-center bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm">
        <div className="flex items-center gap-5">
          <div className="p-4 bg-orange-50 text-[#E95D22] rounded-3xl shadow-sm">
            <MapIcon size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-[#1B2B48]">خريطة النظام الرئيسية</h1>
            <p className="text-gray-400 font-bold mt-1 uppercase tracking-widest text-xs">نظرة عامة على كافة وحدات التطبيق</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {mapItems.map((item, index) => (
          <div 
            key={index}
            className="group bg-white rounded-[35px] border border-gray-100 p-8 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 flex flex-col h-full"
          >
            <div className={`w-16 h-16 ${item.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
              {item.icon}
            </div>
            
            <h3 className="text-xl font-black text-[#1B2B48] mb-3">{item.title}</h3>
            <p className="text-gray-400 text-sm font-bold leading-relaxed mb-8 flex-1">
              {item.description}
            </p>
            
            <button 
              onClick={item.action}
              className="w-full py-4 bg-gray-50 text-[#1B2B48] rounded-2xl font-black text-sm flex items-center justify-center gap-2 hover:bg-[#1B2B48] hover:text-white transition-all group-hover:shadow-lg"
            >
              الذهاب للصفحة <ChevronLeft size={18} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AppMapDashboard;
