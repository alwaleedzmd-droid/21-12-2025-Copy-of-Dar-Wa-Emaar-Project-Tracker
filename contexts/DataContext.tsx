import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '../supabaseClient';
import { ProjectSummary, TechnicalRequest, User, UserRole, ProjectWork } from '../types';

interface DataContextType {
  projects: ProjectSummary[];
  technicalRequests: TechnicalRequest[];
  clearanceRequests: any[];
  projectWorks: ProjectWork[];
  appUsers: User[];
  currentUser: User | null;
  isDbLoading: boolean;
  isAuthLoading: boolean;
  login: (email: string, password: string) => Promise<any>;
  logout: () => Promise<void>;
  refreshData: () => Promise<void>;
  logActivity: (action: string, target: string, color?: string) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// --- تعريف الموظفين حسب البيانات المحدثة ---
const EMPLOYEES_DATA: Record<string, { name: string; role: UserRole }> = {
  // المدير العام
  'adaldawsari@darwaemaar.com': { name: 'الوليد الدوسري', role: 'ADMIN' },
  
  // علاقات عامة (PR_MANAGER)
  'malageel@darwaemaar.com': { name: 'مساعد العقيل', role: 'PR_MANAGER' },
  'ssalyahya@darwaemaar.com': { name: 'صالح اليحيى', role: 'PR_MANAGER' },
  'syahya@darwaemaar.com': { name: 'صالح اليحيى', role: 'PR_MANAGER' },
  'maashammari@darwaemaar.com': { name: 'محمد الشمري', role: 'PR_MANAGER' },
  'mshammari@darwaemaar.com': { name: 'محمد الشمري', role: 'PR_MANAGER' },
  'malbahri@darwaemaar.com': { name: 'محمد البحري', role: 'PR_MANAGER' },
  
  // القسم الفني (TECHNICAL)
  'ssalama@darwaemaar.com': { name: 'سيد سلامة', role: 'TECHNICAL' },
  'easalama@darwaemaar.com': { name: 'سيد سلامة', role: 'TECHNICAL' },
  'iahmad@darwaemaar.com': { name: 'إسلام أحمد', role: 'TECHNICAL' },
  'emelshity@darwaemaar.com': { name: 'إسلام الملشتي', role: 'TECHNICAL' },
  'mhbaishi@darwaemaar.com': { name: 'محمود بحيصي', role: 'TECHNICAL' },
  'mbuhaisi@darwaemaar.com': { name: 'محمود بحيصي', role: 'TECHNICAL' },
  'mhaqeel@darwaemaar.com': { name: 'حمزة عقيل', role: 'TECHNICAL' },
  'hmaqel@darwaemaar.com': { name: 'حمزة عقيل', role: 'TECHNICAL' },
  
  // موظفو الإفراغات (CONVEYANCE)
  'nalmaliki@darwaemaar.com': { name: 'نورة المالكي', role: 'CONVEYANCE' },
  'saalfahad@darwaemaar.com': { name: 'سارة الفهد', role: 'CONVEYANCE' },
  'tmashari@darwaemaar.com': { name: 'تماني المشاري', role: 'CONVEYANCE' },
  'shalmalki@darwaemaar.com': { name: 'شذى المالكي', role: 'CONVEYANCE' },
  'balqarni@darwaemaar.com': { name: 'بشرى القرني', role: 'CONVEYANCE' },
  'hmalsalman@darwaemaar.com': { name: 'حسن السلمان', role: 'CONVEYANCE' },
  'falshammari@darwaemaar.com': { name: 'فهد الشمري', role: 'CONVEYANCE' },
  'saalabdulsalam@darwaemaar.com': { name: 'سارة عبدالسلام', role: 'CONVEYANCE' },
  'taalmalki@darwaemaar.com': { name: 'تماني المالكي', role: 'CONVEYANCE' },
  'smalsanawi@darwaemaar.com': { name: 'شذى الصنعاوي', role: 'CONVEYANCE' },
  'bsalzamaa@darwaemaar.com': { name: 'بشرى القحطاني', role: 'CONVEYANCE' },
  'hmalsenbel@darwaemaar.com': { name: 'حسن السنبل', role: 'CONVEYANCE' },
  'ffalotaibi@darwaemaar.com': { name: 'فهد العتيبي', role: 'CONVEYANCE' }
};

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [technicalRequests, setTechnicalRequests] = useState<TechnicalRequest[]>([]);
  const [clearanceRequests, setClearanceRequests] = useState<any[]>([]);
  const [projectWorks, setProjectWorks] = useState<ProjectWork[]>([]);
  const [appUsers, setAppUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isDbLoading, setIsDbLoading] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const logActivity = useCallback((action: string, target: string, color: string = 'text-gray-500') => {
    console.log(`[Dar Activity] ${action}: ${target} (${color})`);
  }, []);

  const refreshData = useCallback(async () => {
    if (!currentUser || !supabase) {
      console.warn('⚠️ refreshData: لا يوجد مستخدم أو عميل Supabase');
      return;
    }
    setIsDbLoading(true);
    console.log('🔄 جاري جلب البيانات من Supabase...');
    try {
      const [pRes, trRes, drRes, pwRes, uRes] = await Promise.all([
        supabase.from('projects').select('*').order('id', { ascending: true }),
        supabase.from('technical_requests').select('*').order('created_at', { ascending: false }),
        supabase.from('deeds_requests').select('*').order('created_at', { ascending: false }),
        supabase.from('project_works').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('*')
      ]);

      // تسجيل الأخطاء لكل جدول
      if (pRes.error) console.error('❌ خطأ جلب المشاريع:', pRes.error.message);
      if (trRes.error) console.error('❌ خطأ جلب الطلبات الفنية:', trRes.error.message);
      if (drRes.error) console.error('❌ خطأ جلب الإفراغات:', drRes.error.message);
      if (pwRes.error) console.error('❌ خطأ جلب أعمال المشاريع:', pwRes.error.message);
      if (uRes.error) console.error('❌ خطأ جلب المستخدمين:', uRes.error.message);

      setProjects(pRes.data?.map(p => ({ ...p, name: p.name || p.title || 'مشروع' })) || []);
      setTechnicalRequests(trRes.data || []);
      setClearanceRequests(drRes.data || []);
      setProjectWorks(pwRes.data || []);
      setAppUsers(uRes.data || []);

      console.log('✅ تم جلب البيانات:', {
        projects: pRes.data?.length || 0,
        technicalRequests: trRes.data?.length || 0,
        clearanceRequests: drRes.data?.length || 0,
        projectWorks: pwRes.data?.length || 0,
        users: uRes.data?.length || 0
      });
    } catch (e: any) {
      console.error('❌ خطأ عام في جلب البيانات:', e?.message || e);
    } finally {
      setIsDbLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    const initAuth = async () => {
      try {
        console.log('🔐 بدء تهيئة المصادقة...');
        
        if (!supabase || !supabase.auth) {
          console.warn("⚠️ Supabase auth غير متاح. استخدام وضع Demo...");
          // Try demo session from localStorage
          const demo = localStorage.getItem('dar_demo_session');
          if (demo) {
            try {
              const parsed = JSON.parse(demo);
              const email = parsed.email?.toLowerCase();
              if (email && EMPLOYEES_DATA[email]) {
                console.log('✅ تسجيل دخول Demo:', email);
                setCurrentUser({ id: parsed.id || 'demo-' + email, email, ...EMPLOYEES_DATA[email] });
              }
            } catch (err) { console.error('خطأ في تحليل demo session:', err); }
          }
          setIsAuthLoading(false);
          return;
        }

        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ خطأ في جلب الجلسة:', error);
          throw error;
        }

        if (session?.user?.email) {
          const email = session.user.email.toLowerCase();
          console.log('✅ مستخدم مسجل:', email);
          
          if (EMPLOYEES_DATA[email]) {
            setCurrentUser({ id: session.user.id, email, ...EMPLOYEES_DATA[email] });
          } else {
            const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
            if (profile) setCurrentUser(profile);
            else { 
              console.warn('⚠️ ملف تعريف غير موجود للمستخدم');
              await supabase.auth.signOut(); 
              setCurrentUser(null); 
            }
          }
        } else {
          console.log('ℹ️ لا توجد جلسة نشطة، التحقق من Demo session...');
          // If there's no session but a local demo session exists, restore it
          const demo = localStorage.getItem('dar_demo_session');
          if (demo) {
            try {
              const parsed = JSON.parse(demo);
              const demEmail = parsed.email?.toLowerCase();
              if (demEmail && EMPLOYEES_DATA[demEmail]) {
                console.log('✅ استعادة Demo session:', demEmail);
                setCurrentUser({ id: parsed.id || 'demo-' + demEmail, email: demEmail, ...EMPLOYEES_DATA[demEmail] });
              }
            } catch (err) { console.error('خطأ في استعادة demo:', err); }
          }
        }
      } catch (e) { 
        console.error("❌ خطأ في تهيئة المصادقة:", e); 
      } finally { 
        setIsAuthLoading(false); 
        console.log('✅ انتهت تهيئة المصادقة');
      }
    };
    initAuth();
  }, []);

  // ربط اشتراك Real-time لتحديث البيانات تلقائياً
  useEffect(() => {
    if (!currentUser) return;
    refreshData();

    // الاشتراك في التغييرات اللحظية من Supabase
    const channel = supabase
      .channel('db-realtime-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => {
        console.log('🔔 تحديث لحظي: المشاريع');
        refreshData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'technical_requests' }, () => {
        console.log('🔔 تحديث لحظي: الطلبات الفنية');
        refreshData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deeds_requests' }, () => {
        console.log('🔔 تحديث لحظي: الإفراغات');
        refreshData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_works' }, () => {
        console.log('🔔 تحديث لحظي: أعمال المشاريع');
        refreshData();
      })
      .subscribe((status) => {
        console.log('📡 حالة Real-time:', status);
      });

    return () => { supabase.removeChannel(channel); };
  }, [currentUser, refreshData]);

  const login = async (email: string, password: string) => {
    const e = email.toLowerCase();
    console.log('🔐 محاولة تسجيل الدخول:', e);

    // ١- محاولة تسجيل الدخول عبر Supabase Auth أولاً
    if (supabase && supabase.auth) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email: e, password });
        if (!error && data?.user) {
          console.log('✅ تسجيل دخول ناجح عبر Supabase Auth:', data.user.id);
          const emp = EMPLOYEES_DATA[e];
          if (emp) {
            setCurrentUser({ id: data.user.id, email: e, ...emp });
          } else {
            const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).maybeSingle();
            if (profile) {
              setCurrentUser(profile);
            } else {
              setCurrentUser({ id: data.user.id, email: e, name: e.split('@')[0], role: 'PR_MANAGER' });
            }
          }
          return data;
        }
        // إذا فشل Supabase Auth، نسجل الخطأ ونحاول الوضع التجريبي
        if (error) console.warn('⚠️ Supabase Auth رفض:', error.message);
      } catch (err: any) {
        console.warn('⚠️ خطأ Supabase Auth:', err?.message);
      }
    }

    // ٢- الوضع التجريبي (Demo) للموظفين المعروفين
    if (EMPLOYEES_DATA[e]) {
      console.log('ℹ️ تسجيل دخول تجريبي (Demo):', e);
      const demoId = 'demo-' + e;
      const user = { id: demoId, email: e, ...EMPLOYEES_DATA[e] } as any;
      setCurrentUser(user);
      try { localStorage.setItem('dar_demo_session', JSON.stringify({ id: demoId, email: e })); } catch (err) { /* ignore */ }
      return { user };
    }

    // ٣- السماح لأي بريد @darwaemaar.com كمستخدم تجريبي
    if (e.endsWith('@darwaemaar.com')) {
      const demoId = 'demo-' + e;
      const namePart = e.split('@')[0];
      const user = { id: demoId, email: e, name: namePart, role: 'PR_MANAGER' } as any;
      setCurrentUser(user);
      try { localStorage.setItem('dar_demo_session', JSON.stringify({ id: demoId, email: e })); } catch (err) { /* ignore */ }
      return { user };
    }

    throw new Error('بيانات تسجيل الدخول غير صحيحة');
  };

  const logout = async () => {
    try {
      if (supabase && supabase.auth) await supabase.auth.signOut();
    } catch (e) { /* ignore */ }
    localStorage.removeItem('dar_demo_session');
    setCurrentUser(null);
    window.location.href = '/';
  };

  return (
    <DataContext.Provider value={{
      projects, technicalRequests, clearanceRequests, projectWorks, appUsers,
      currentUser, isDbLoading, isAuthLoading, login, logout, refreshData, logActivity
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within DataProvider');
  return context;
};
