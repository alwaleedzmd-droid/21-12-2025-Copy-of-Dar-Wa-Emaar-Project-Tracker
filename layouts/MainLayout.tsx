
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { 
  LayoutDashboard, LogOut, RefreshCw, Building2, 
  Zap, FileStack, Menu, X, Users
} from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { DAR_LOGO } from '../constants';
import AIAssistant from '../components/AIAssistant';
import NotificationBell from '../components/NotificationBell';

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, logout, refreshData, canAccess, projects, technicalRequests, clearanceRequests, projectWorks } = useData();

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => 
    localStorage.getItem('dar_sidebar_v2_collapsed') === 'true'
  );

  if (!currentUser) return <>{children}</>;

  const navItems = [
    { label: 'لوحة التحكم', icon: <LayoutDashboard size={20} />, path: '/', roles: ['ADMIN', 'PR_MANAGER', 'PR_OFFICER'] },
    { label: 'المشاريع', icon: <Building2 size={20} />, path: '/projects', roles: ['ADMIN', 'PR_MANAGER', 'PR_OFFICER'] },
    { label: 'الطلبات الفنية', icon: <Zap size={20} />, path: '/technical', roles: ['ADMIN', 'PR_MANAGER', 'TECHNICAL', 'PR_OFFICER'] },
    { label: 'سجل الإفراغ', icon: <FileStack size={20} />, path: '/deeds', roles: ['ADMIN', 'PR_MANAGER', 'DEEDS_OFFICER', 'CONVEYANCE'] },
    { label: 'إدارة المستخدمين', icon: <Users size={20} />, path: '/users', roles: ['ADMIN'] },
  ];

  const filteredNav = navItems.filter(item => item.roles.includes(currentUser.role));

  return (
    <div className="flex min-h-screen bg-[#F8F9FA] font-cairo" dir="rtl">
      <aside className={`fixed inset-y-0 right-0 z-40 bg-[#1B2B48] text-white transition-all duration-300 flex flex-col ${isSidebarCollapsed ? 'w-20' : 'w-72 shadow-2xl'}`}>
        <div className="p-6 flex items-center justify-between border-b border-white/5">
          {!isSidebarCollapsed && (
            <div className="flex items-center gap-3">
              <img src={DAR_LOGO} className="w-10 h-10 rounded-xl" alt="Logo" /> 
              <span className="font-black text-xl tracking-tight">دار وإعمار</span>
            </div>
          )}
          <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="p-2 hover:bg-white/10 rounded-xl">
            {isSidebarCollapsed ? <Menu size={20} /> : <X size={20} />}
          </button>
        </div>

        <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto">
          {filteredNav.map(item => {
            const isActive = location.pathname === item.path;
            return (
              <button 
                key={item.path} 
                onClick={() => navigate(item.path)} 
                className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all ${isActive ? 'bg-[#E95D22] text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
              >
                {item.icon}
                {!isSidebarCollapsed && <span className="font-bold text-sm">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/5">
          <button onClick={logout} className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-red-400 hover:bg-red-500/10">
            <LogOut size={20}/> 
            {!isSidebarCollapsed && <span className="font-bold text-sm">تسجيل الخروج</span>}
          </button>
        </div>
      </aside>

      <div className={`flex-1 flex flex-col transition-all duration-300 ${isSidebarCollapsed ? 'mr-20' : 'mr-72'}`}>
        <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-8 sticky top-0 z-30 shadow-sm">
          <div className="flex items-center gap-4">
             <button onClick={() => refreshData()} className="p-2 text-gray-400 hover:bg-gray-100 rounded-xl"><RefreshCw size={20}/></button>
             <div className="hidden sm:block">
                <p className="text-[10px] text-gray-400 font-bold">التاريخ الحالي</p>
                <p className="text-sm font-black text-[#1B2B48]">{new Date().toLocaleDateString('ar-SA')}</p>
             </div>
          </div>
          <div className="flex items-center gap-6">
            <NotificationBell />
            <div className="flex items-center gap-3">
              <div className="text-left">
                <p className="text-sm font-black text-[#1B2B48]">{currentUser.name}</p>
                <p className="text-[10px] text-gray-400 font-bold text-right uppercase">{currentUser.role}</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-[#1B2B48] text-white flex items-center justify-center font-black">
                {currentUser.name[0]}
              </div>
            </div>
          </div>
        </header>

        <main className="p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
