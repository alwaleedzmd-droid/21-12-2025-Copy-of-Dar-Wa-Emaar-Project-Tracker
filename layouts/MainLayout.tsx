
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { 
  LogOut, RefreshCw, Building2, 
  Zap, FileStack, Menu, X, Users, BarChart3, KeyRound, Loader2, Eye, EyeOff
} from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { DAR_LOGO } from '../constants';
import { supabase } from '../supabaseClient';
import NotificationBell from '../components/NotificationBell';
import Modal from '../components/Modal';

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, logout, refreshData } = useData();

  // منع فتح modal تغيير كلمة المرور للمستخدمين في Demo Mode
  const isDemoMode = (currentUser as any)?.isDemoMode === true;

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => 
    localStorage.getItem('dar_sidebar_v2_collapsed') === 'true'
  );

  useEffect(() => {
    localStorage.setItem('dar_sidebar_v2_collapsed', String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);

  const hashPassword = async (value: string) => {
    const data = new TextEncoder().encode(value);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  };

  const handleChangePassword = async () => {
    setPasswordError('');
    setPasswordSuccess('');

    if (!passwordForm.current) {
      setPasswordError('يرجى إدخال كلمة المرور الحالية');
      return;
    }
    if (!passwordForm.new || !passwordForm.confirm) {
      setPasswordError('يرجى تعبئة جميع الحقول');
      return;
    }
    if (passwordForm.new.length < 6) {
      setPasswordError('كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل');
      return;
    }
    if (passwordForm.new !== passwordForm.confirm) {
      setPasswordError('كلمة المرور الجديدة غير متطابقة');
      return;
    }
    if (passwordForm.current === passwordForm.new) {
      setPasswordError('كلمة المرور الجديدة يجب أن تكون مختلفة عن الحالية');
      return;
    }

    setPasswordLoading(true);
    try {
      if (isDemoMode) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('temp_password_hash')
          .eq('email', currentUser!.email)
          .maybeSingle();

        if (profileError) throw profileError;

        const currentHash = await hashPassword(passwordForm.current);
        if (!profile?.temp_password_hash || currentHash !== profile.temp_password_hash) {
          setPasswordError('كلمة المرور الحالية غير صحيحة');
          return;
        }

        const newHash = await hashPassword(passwordForm.new);
        const { error } = await supabase
          .from('profiles')
          .update({
            temp_password_hash: newHash,
            temp_password_set_at: new Date().toISOString(),
            must_change_password: false
          })
          .eq('email', currentUser!.email);

        if (error) throw error;
      } else {
        // الخطوة ١: التحقق من كلمة المرور الحالية عبر تسجيل الدخول
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: currentUser!.email,
          password: passwordForm.current
        });

        if (signInError || !signInData?.user) {
          setPasswordError('كلمة المرور الحالية غير صحيحة');
          return;
        }

        // الخطوة ٢: تغيير كلمة المرور
        const { error } = await supabase.auth.updateUser({ password: passwordForm.new });
        if (error) throw error;
      }

      setPasswordSuccess('تم تغيير كلمة المرور بنجاح ✅');
      setPasswordForm({ current: '', new: '', confirm: '' });
      setTimeout(() => {
        setIsChangePasswordOpen(false);
        setPasswordSuccess('');
      }, 2000);
    } catch (err: any) {
      setPasswordError('فشل تغيير كلمة المرور: ' + (err.message || 'خطأ غير معروف'));
    } finally {
      setPasswordLoading(false);
    }
  };

  if (!currentUser) return <>{children}</>;

  /**
   * تعريف صلاحيات القائمة الجانبية حسب كل دور
   * - ADMIN & PR_MANAGER: الوصول لكل شيء
   * - TECHNICAL: فقط الطلبات الفنية
   * - CONVEYANCE: فقط سجل الإفراغ
   */
  const navItems = [
    { 
      label: 'لوحة التحكم', 
      icon: <BarChart3 size={20} />, 
      path: '/dashboard', 
      roles: ['ADMIN', 'PR_MANAGER'] 
    },
    { 
      label: 'إدارة المشاريع', 
      icon: <Building2 size={20} />, 
      path: '/projects', 
      roles: ['ADMIN', 'PR_MANAGER'] 
    },
    { 
      label: 'الطلبات الفنية', 
      icon: <Zap size={20} />, 
      path: '/technical', 
      roles: ['ADMIN', 'TECHNICAL', 'PR_MANAGER'] 
    },
    { 
      label: 'سجل الإفراغ', 
      icon: <FileStack size={20} />, 
      path: '/deeds', 
      roles: ['ADMIN', 'CONVEYANCE', 'PR_MANAGER'] 
    },
    { 
      label: 'إدارة المستخدمين', 
      icon: <Users size={20} />, 
      path: '/users', 
      roles: ['ADMIN'] 
    },
  ];

  const filteredNav = navItems.filter(item => item.roles.includes(currentUser.role));

  return (
    <div className="flex min-h-screen bg-[#F8F9FA] font-cairo" dir="rtl">
      <aside className={`fixed inset-y-0 right-0 z-40 bg-[#1B2B48] text-white transition-all duration-300 flex flex-col ${isSidebarCollapsed ? 'w-20' : 'w-72 shadow-2xl'}`}>
        <div className="p-6 flex items-center justify-between border-b border-white/5">
          <div className="flex items-center gap-3">
            <img src={DAR_LOGO} className="w-10 h-10 rounded-xl" alt="Logo" /> 
            {!isSidebarCollapsed && <span className="font-black text-xl tracking-tight">دار وإعمار</span>}
          </div>
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
                className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all ${isActive ? 'bg-[#E95D22] text-white shadow-lg shadow-orange-900/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
              >
                <div className={isActive ? "text-white" : "text-gray-400 group-hover:text-white"}>
                  {item.icon}
                </div>
                {!isSidebarCollapsed && <span className="font-bold text-sm">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/5 space-y-1">
          <button onClick={() => { 
            setIsChangePasswordOpen(true); 
            setPasswordError(''); 
            setPasswordSuccess(''); 
          }} className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-amber-400 hover:bg-amber-500/10 transition-colors">
            <KeyRound size={20}/> 
            {!isSidebarCollapsed && <span className="font-bold text-sm">تغيير كلمة المرور</span>}
          </button>
          <button onClick={logout} className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-red-400 hover:bg-red-500/10 transition-colors">
            <LogOut size={20}/> 
            {!isSidebarCollapsed && <span className="font-bold text-sm">تسجيل الخروج</span>}
          </button>
        </div>
      </aside>

      <div className={`flex-1 flex flex-col transition-all duration-300 ${isSidebarCollapsed ? 'mr-20' : 'mr-72'}`}>
        <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-8 sticky top-0 z-30 shadow-sm">
          <div className="flex items-center gap-4">
             <button onClick={() => refreshData()} className="p-2 text-gray-400 hover:bg-gray-100 rounded-xl transition-all active:rotate-180">
                <RefreshCw size={20}/>
             </button>
             <div className="hidden sm:block">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">التاريخ الحالي</p>
                <p className="text-sm font-black text-[#1B2B48]">{new Date().toLocaleDateString('ar-SA')}</p>
             </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-2">
              <img src={DAR_LOGO} className="w-8 h-8 rounded-lg" alt="Dar Wa Emaar" />
              <span className="text-xs font-black text-[#1B2B48]">دار وإعمار</span>
            </div>
            <NotificationBell />
            <div className="flex items-center gap-3">
              <div className="text-left">
                <p className="text-sm font-black text-[#1B2B48]">{currentUser.name}</p>
                <p className="text-[10px] text-gray-400 font-bold text-right uppercase tracking-tighter">{ROLE_CONFIG[currentUser.role]?.label || currentUser.role}</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-white border border-gray-100 flex items-center justify-center shadow-sm">
                <img src={DAR_LOGO} className="w-7 h-7" alt="Dar Wa Emaar" />
              </div>
            </div>
          </div>
        </header>

        <main className="p-8 overflow-y-auto">
          {children}
        </main>
      </div>
      {/* مودال تغيير كلمة المرور */}
      {isChangePasswordOpen && (
        <Modal isOpen={true} onClose={() => { 
          setIsChangePasswordOpen(false); 
        }} title="تغيير كلمة المرور">
        <div className="space-y-4 pt-2" dir="rtl">
          {passwordError && (
            <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm font-bold flex items-center gap-2">
              <KeyRound size={16} /> {passwordError}
            </div>
          )}
          {passwordSuccess && (
            <div className="bg-green-50 text-green-600 p-4 rounded-2xl text-sm font-bold">
              {passwordSuccess}
            </div>
          )}
          <div className="relative">
            <input
              className="w-full p-4 bg-gray-50 border rounded-2xl font-bold outline-none focus:border-[#E95D22] pr-12"
              type={showCurrentPass ? 'text' : 'password'}
              placeholder="كلمة المرور الحالية"
              value={passwordForm.current}
              onChange={e => setPasswordForm({...passwordForm, current: e.target.value})}
            />
            <button type="button" onClick={() => setShowCurrentPass(!showCurrentPass)} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {showCurrentPass ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <div className="relative">
            <input
              className="w-full p-4 bg-gray-50 border rounded-2xl font-bold outline-none focus:border-[#E95D22] pr-12"
              type={showNewPass ? 'text' : 'password'}
              placeholder="كلمة المرور الجديدة (6 أحرف على الأقل)"
              value={passwordForm.new}
              onChange={e => setPasswordForm({...passwordForm, new: e.target.value})}
            />
            <button type="button" onClick={() => setShowNewPass(!showNewPass)} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {showNewPass ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <input
            className="w-full p-4 bg-gray-50 border rounded-2xl font-bold outline-none focus:border-[#E95D22]"
            type="password"
            placeholder="تأكيد كلمة المرور الجديدة"
            value={passwordForm.confirm}
            onChange={e => setPasswordForm({...passwordForm, confirm: e.target.value})}
          />
          <button
            onClick={handleChangePassword}
            disabled={passwordLoading}
            className="w-full bg-[#1B2B48] text-white py-4 rounded-2xl font-black shadow-xl hover:bg-[#2a3f63] transition-colors disabled:opacity-50"
          >
            {passwordLoading ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'تحديث كلمة المرور'}
          </button>
        </div>
        </Modal>
      )}
    </div>
  );
};

// مساعدة لعرض المسميات الجديدة في الهيدر
const ROLE_CONFIG: Record<string, { label: string }> = {
  'ADMIN': { label: 'مدير النظام' },
  'PR_MANAGER': { label: 'PR' },
  'TECHNICAL': { label: 'المشاريع' },
  'CONVEYANCE': { label: 'CX' }
};

export default MainLayout;
