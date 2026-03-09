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
  setTempPassword: (email: string, tempPassword: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshData: () => Promise<void>;
  logActivity: (action: string, target: string, color?: string) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const hashPassword = async (password: string) => {
  const data = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};

// --- تعريف الموظفين حسب البيانات المحدثة ---
const EMPLOYEES_DATA: Record<string, { name: string; role: UserRole }> = {
  // المدير العام
  'adaldawsari@darwaemaar.com': { name: 'الوليد الدوسري', role: 'ADMIN' },
  
  // علاقات عامة (PR_MANAGER)
  'malageel@darwaemaar.com': { name: 'مساعد العقيل', role: 'PR_MANAGER' },
  'ssalyahya@darwaemaar.com': { name: 'صالح اليحيى', role: 'PR_MANAGER' },
  'maashammari@darwaemaar.com': { name: 'محمد الشمري', role: 'PR_MANAGER' },
  'malbahri@darwaemaar.com': { name: 'محمد البحري', role: 'PR_MANAGER' },
  
  // القسم الفني (TECHNICAL)
  'easalama@darwaemaar.com': { name: 'سيد سلامة', role: 'TECHNICAL' },
  'emelshity@darwaemaar.com': { name: 'إسلام الملشتي', role: 'TECHNICAL' },
  'mbuhaisi@darwaemaar.com': { name: 'محمود بحيصي', role: 'TECHNICAL' },
  'hmaqel@darwaemaar.com': { name: 'حمزة عقيل', role: 'TECHNICAL' },
  
  // موظفو الإفراغات (CONVEYANCE)
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
      const safeQuery = async (
        label: string,
        run: () => Promise<any>,
        fallbackData: any = null,
        level: 'error' | 'warn' = 'error'
      ) => {
        try {
          const result = await run();
          if (result?.error) {
            console[level](`❌ خطأ جلب ${label}:`, result.error.message || result.error);
          }
          return result;
        } catch (e: any) {
          console[level](`❌ استثناء أثناء جلب ${label}:`, e?.message || e);
          return { data: fallbackData, error: { message: e?.message || 'unknown error' } };
        }
      };

      // محاولات الاستعلام مع معالجة الأخطاء الفردية
      const pRes = await safeQuery('المشاريع', () => supabase.from('projects').select('*').order('id', { ascending: true }));
      const trRes = await safeQuery('الطلبات الفنية', () => supabase.from('technical_requests').select('*').order('created_at', { ascending: false }));
      const drRes = await safeQuery('الإفراغات', () => supabase.from('deeds_requests').select('*').order('created_at', { ascending: false }));
      const uRes = await safeQuery('المستخدمين', () => supabase.from('profiles').select('*'));

      // جلب أعمال المشاريع بشكل منفصل مع محاولة بديلة
      let pwRes = await safeQuery(
        'أعمال المشاريع (المحاولة الأولى)',
        () => supabase.from('project_works').select('*').order('id', { ascending: false }),
        null,
        'warn'
      );

      if (pwRes.error || !pwRes.data) {
        console.warn('⚠️ فشل جلب project_works مع الترتيب، إعادة المحاولة بدون ترتيب...');
        pwRes = await safeQuery('أعمال المشاريع (المحاولة الثانية)', () => supabase.from('project_works').select('*'), []);
      }

      // تسجيل الأخطاء لكل جدول
      if (pRes.error) console.error('❌ خطأ جلب المشاريع:', pRes.error.message);
      if (trRes.error) console.error('❌ خطأ جلب الطلبات الفنية:', trRes.error.message);
      if (drRes.error) console.error('❌ خطأ جلب الإفراغات:', drRes.error.message);
      if (pwRes.error) console.error('❌ خطأ جلب أعمال المشاريع:', pwRes.error.message);
      if (uRes.error) console.error('❌ خطأ جلب المستخدمين:', uRes.error.message);

      // سجل بنية البيانات للتشخيص
      if (pwRes.data && pwRes.data.length > 0) {
        console.log('📋 project_works أعمدة الجدول:', Object.keys(pwRes.data[0]));
        console.log('📋 project_works عينة أول سجل:', JSON.stringify(pwRes.data[0]));
      } else {
        console.warn('⚠️ project_works: لا توجد بيانات! error:', pwRes.error?.message || 'لا يوجد خطأ', 'data:', pwRes.data);
      }

      setProjects(pRes.data?.map((p: any) => ({ ...p, name: p.name || p.title || 'مشروع' })) || []);
      setTechnicalRequests(trRes.data || []);
      setClearanceRequests(drRes.data || []);
      // تطبيع بيانات أعمال المشاريع لضمان وجود حقل projectId بشكل صحيح
      const normalizedWorks = (pwRes.data || []).map((w: any) => ({
        ...w,
        projectId: w.projectId ?? w.projectid ?? w.project_id ?? null
      }));
      setProjectWorks(normalizedWorks);
      setAppUsers(uRes.data || []);

      console.log('✅ تم جلب البيانات:', {
        projects: pRes.data?.length || 0,
        technicalRequests: trRes.data?.length || 0,
        clearanceRequests: drRes.data?.length || 0,
        projectWorks: normalizedWorks.length,
        users: uRes.data?.length || 0
      });

      if (normalizedWorks.length > 0) {
        const sample = normalizedWorks[0];
        console.log('📋 أعمال المشاريع - عينة بعد التطبيع:', { id: sample.id, projectId: sample.projectId, project_name: sample.project_name, task_name: sample.task_name });
      }
    } catch (e: any) {
      console.error('❌ خطأ عام في جلب البيانات:', e?.message || e);
      // عند الخطأ، اعرض بيانات فارغة بدلاً من الانهيار
      setProjects([]);
      setTechnicalRequests([]);
      setClearanceRequests([]);
      setProjectWorks([]);
      setAppUsers([]);
    } finally {
      setIsDbLoading(false);
    }
  }, [currentUser]);

  const setTempPassword = useCallback(async (email: string, tempPassword: string) => {
    if (!supabase) throw new Error('خدمة المصادقة غير متاحة حالياً');
    const hashed = await hashPassword(tempPassword);
    const { data, error } = await supabase
      .from('profiles')
      .update({
        temp_password_hash: hashed,
        temp_password_set_at: new Date().toISOString(),
        must_change_password: false
      })
      .select('id')
      .eq('email', email.toLowerCase());

    if (error) {
      throw new Error('فشل حفظ كلمة المرور المؤقتة');
    }
    if (!data || data.length === 0) {
      throw new Error('لا يوجد ملف مستخدم لهذا البريد');
    }
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      try {
        console.log('🔐 بدء تهيئة المصادقة...');

        // حذف أي جلسة demo قديمة غير آمنة (بدون تحقق كلمة مرور)
        const oldDemo = localStorage.getItem('dar_demo_session');
        if (oldDemo) {
          try {
            const parsed = JSON.parse(oldDemo);
            if (parsed?.id?.startsWith('demo-')) {
              localStorage.removeItem('dar_demo_session');
            }
          } catch { localStorage.removeItem('dar_demo_session'); }
        }

        // استعادة جلسة الوضع الاحتياطي الآمن (مع تحقق كلمة مرور)
        const secureSession = localStorage.getItem('dar_secure_session');
        if (secureSession) {
          try {
            const sessionData = JSON.parse(secureSession);
            // التحقق من صلاحية الجلسة (24 ساعة)
            const sessionAge = Date.now() - (sessionData.timestamp || 0);
            const MAX_SESSION_AGE = 24 * 60 * 60 * 1000; // 24 ساعة
            if (sessionData?.email && sessionData?.id && sessionAge < MAX_SESSION_AGE) {
              // التحقق من أن المستخدم لا يزال موجوداً في profiles
              const { data: verifyProfile } = await supabase.from('profiles').select('id,email,name,role').eq('id', sessionData.id).maybeSingle();
              if (verifyProfile) {
                console.log('✅ استعادة جلسة آمنة:', verifyProfile.email);
                setCurrentUser(verifyProfile);
                setIsAuthLoading(false);
                return;
              }
            }
            // جلسة منتهية الصلاحية أو غير صالحة
            localStorage.removeItem('dar_secure_session');
          } catch { localStorage.removeItem('dar_secure_session'); }
        }

        // التشغيل الفعلي: جلسة Supabase حقيقية
        if (!supabase || !supabase.auth) {
          console.error('❌ Supabase auth غير متاح.');
          setIsAuthLoading(false);
          return;
        }

        let session = null;
        try {
          const result = await supabase.auth.getSession();
          if (result.error) {
            console.warn('⚠️ خطأ في جلب الجلسة:', result.error.message);
          } else {
            session = result.data?.session;
          }
        } catch (e) {
          console.warn('⚠️ فشل الاتصال بـ Supabase Auth:', e);
        }

        if (session?.user?.email) {
          const email = session.user.email.toLowerCase();
          console.log('✅ مستخدم مسجل من GoTrue:', email);

          const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
          if (profile) {
            setCurrentUser(profile);
          } else {
            const emp = EMPLOYEES_DATA[email];
            setCurrentUser({
              id: session.user.id,
              email,
              name: emp?.name || (session.user.user_metadata as any)?.name || email.split('@')[0],
              role: emp?.role || ((session.user.user_metadata as any)?.role as UserRole) || 'PR_MANAGER'
            });
          }
        } else {
          console.log('ℹ️ لا توجد جلسة GoTrue');
          setCurrentUser(null);
        }
      } catch (e) { 
        console.error('❌ خطأ في تهيئة المصادقة:', e); 
      } finally { 
        setIsAuthLoading(false); 
        console.log('✅ انتهت تهيئة المصادقة');
      }
    };
    initAuth();
  }, []);

  // مراقبة تغييرات جلسة المصادقة (لمنع فقدان البيانات عند تغيير كلمة المرور)
  useEffect(() => {
    if (!supabase || !supabase.auth) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔐 Auth state changed:', event);

      // عند تحديث المستخدم (مثل تغيير كلمة المرور) أو تحديث التوكن، نحافظ على المستخدم الحالي
      if ((event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') && session?.user?.email && currentUser) {
        // لا نفعل شيئاً - فقط نحافظ على المستخدم الحالي
        console.log('✅ تحديث الجلسة - المستخدم لا يزال مسجلاً');
      }

      // عند تسجيل الخروج
      if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
      }
    });

    return () => { subscription.unsubscribe(); };
  }, [currentUser]);

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

  // مصادقة آمنة عبر جدول profiles (عند تعطل GoTrue)
  const secureFallbackLogin = async (email: string, password: string): Promise<User | null> => {
    console.log('🔒 محاولة المصادقة الآمنة عبر profiles...');
    try {
      // جلب بيانات المستخدم من profiles
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, email, name, role, temp_password_hash')
        .eq('email', email)
        .maybeSingle();

      if (error || !profile) {
        console.warn('❌ لا يوجد ملف شخصي لهذا البريد:', email);
        return null;
      }

      // التحقق من كلمة المرور عبر الهاش
      const passwordHash = await hashPassword(password);
      if (!profile.temp_password_hash || profile.temp_password_hash !== passwordHash) {
        console.warn('❌ كلمة المرور غير صحيحة (الوضع الاحتياطي)');
        return null;
      }

      console.log('✅ مصادقة آمنة ناجحة عبر profiles:', email);
      const user: User = {
        id: profile.id,
        email: profile.email,
        name: profile.name,
        role: profile.role,
      };
      return user;
    } catch (err) {
      console.error('❌ خطأ في المصادقة الاحتياطية:', err);
      return null;
    }
  };

  const login = async (email: string, password: string) => {
    const e = email.toLowerCase();
    console.log('🔐 محاولة تسجيل الدخول:', e);

    if (!supabase || !supabase.auth) {
      throw new Error('خدمة المصادقة غير متاحة حالياً');
    }

    // المحاولة الأولى: تسجيل دخول فعلي عبر Supabase Auth (GoTrue)
    console.log('📡 محاولة الاتصال بـ GoTrue...');
    const { data, error } = await supabase.auth.signInWithPassword({ email: e, password });
    
    if (error) {
      console.warn('❌ فشل GoTrue:', error.message);
      const msg = (error.message || '').toLowerCase();
      
      // بيانات خاطئة فعلياً - لا نجرب الوضع الاحتياطي
      if (msg.includes('invalid login credentials')) {
        // جرب المصادقة عبر profiles في حالة كلمة المرور مختلفة عن Supabase Auth
        const fallbackUser = await secureFallbackLogin(e, password);
        if (fallbackUser) {
          setCurrentUser(fallbackUser);
          localStorage.setItem('dar_secure_session', JSON.stringify({ ...fallbackUser, timestamp: Date.now() }));
          return { user: fallbackUser, session: null };
        }
        throw new Error('البريد أو كلمة المرور غير صحيحة');
      }
      
      // خطأ سيرفر (GoTrue معطل) - استخدام المصادقة الآمنة عبر profiles
      if (msg.includes('database error') || msg.includes('500') || msg.includes('querying schema')) {
        console.warn('⚠️ GoTrue معطل - التحويل للمصادقة الآمنة عبر profiles...');
        const fallbackUser = await secureFallbackLogin(e, password);
        if (fallbackUser) {
          setCurrentUser(fallbackUser);
          localStorage.setItem('dar_secure_session', JSON.stringify({ ...fallbackUser, timestamp: Date.now() }));
          return { user: fallbackUser, session: null };
        }
        throw new Error('البريد أو كلمة المرور غير صحيحة');
      }
      
      throw new Error(error.message || 'فشل تسجيل الدخول');
    }
    
    if (!data?.user) {
      throw new Error('فشل تسجيل الدخول - لا توجد بيانات مستخدم');
    }

    console.log('✅ تسجيل دخول GoTrue ناجح:', data.user.id);
    
    // حفظ هاش كلمة المرور في profiles لاستخدامه كـ fallback آمن لاحقاً
    try {
      const passwordHash = await hashPassword(password);
      await supabase.from('profiles').update({
        temp_password_hash: passwordHash,
        temp_password_set_at: new Date().toISOString()
      }).eq('id', data.user.id);
    } catch { /* تجاهل - ليس حرجاً */ }

    // جلب بيانات الموظف من profiles
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).maybeSingle();
    if (profile) {
      setCurrentUser(profile);
    } else {
      const emp = EMPLOYEES_DATA[e];
      setCurrentUser({ 
        id: data.user.id, 
        email: e, 
        name: emp?.name || e.split('@')[0], 
        role: emp?.role || 'PR_MANAGER' 
      });
    }
    
    // حذف الجلسة الاحتياطية إذا نجح GoTrue
    localStorage.removeItem('dar_secure_session');
    
    return data;
  };

  const logout = async () => {
    try {
      if (supabase && supabase.auth) await supabase.auth.signOut();
    } catch (e) { /* ignore */ }

    // حذف جميع جلسات Supabase والجلسة الاحتياطية الآمنة
    localStorage.removeItem('dar_secure_session');
    localStorage.removeItem('dar_demo_session');
    // مسح جلسة الواجهة السينمائية لتظهر مجدداً بعد تسجيل الدخول القادم
    sessionStorage.removeItem('dar_seen_hero_session');
    const keysToDelete = Object.keys(localStorage).filter(key => 
      key.includes('supabase') || key.includes('auth') || key.includes('sb-')
    );
    keysToDelete.forEach(key => localStorage.removeItem(key));

    setCurrentUser(null);
    window.location.href = '/';
  };

  return (
    <DataContext.Provider value={{
      projects, technicalRequests, clearanceRequests, projectWorks, appUsers,
      currentUser, isDbLoading, isAuthLoading, login, setTempPassword, logout, refreshData, logActivity
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
