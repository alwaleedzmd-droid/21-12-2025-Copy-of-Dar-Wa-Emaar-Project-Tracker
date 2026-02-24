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

// Global flag لتتبع Demo Mode - متاح في جميع الدوال
let GlobalDemoModeActive = false;

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
  'nalmalki@darwaemaar.com': { name: 'نورة المالكي', role: 'CONVEYANCE' },
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
      // محاولات الاستعلام مع معالجة الأخطاء الفردية
      const pRes = await supabase.from('projects').select('*').order('id', { ascending: true }).catch((e: any) => {
        console.error('❌ خطأ جلب المشاريع:', e?.message);
        return { data: null, error: { message: e?.message } };
      });

      const trRes = await supabase.from('technical_requests').select('*').order('created_at', { ascending: false }).catch((e: any) => {
        console.error('❌ خطأ جلب الطلبات الفنية:', e?.message);
        return { data: null, error: { message: e?.message } };
      });

      const drRes = await supabase.from('deeds_requests').select('*').order('created_at', { ascending: false }).catch((e: any) => {
        console.error('❌ خطأ جلب الإفراغات:', e?.message);
        return { data: null, error: { message: e?.message } };
      });

      const uRes = await supabase.from('profiles').select('*').catch((e: any) => {
        console.error('❌ خطأ جلب المستخدمين:', e?.message);
        return { data: null, error: { message: e?.message } };
      });

      // جلب أعمال المشاريع بشكل منفصل مع محاولة بديلة
      let pwRes = await supabase.from('project_works').select('*').order('id', { ascending: false }).catch((e: any) => {
        console.warn('⚠️ خطأ أول في جلب project_works:', e?.message);
        return { data: null, error: { message: e?.message } };
      });

      if (pwRes.error || !pwRes.data) {
        console.warn('⚠️ فشل جلب project_works مع الترتيب، إعادة المحاولة بدون ترتيب...');
        pwRes = await supabase.from('project_works').select('*').catch((e: any) => {
          console.error('❌ خطأ ثاني في جلب project_works:', e?.message);
          return { data: [], error: { message: e?.message } };
        });
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
        
        // فحص جلسة Demo أولاً - إذا وجدنا واحدة، استخدمها وتوقف تماماً عن Supabase
        const demoSessionStr = localStorage.getItem('dar_demo_session');
        if (demoSessionStr) {
          try {
            const demoUser = JSON.parse(demoSessionStr);
            console.log('✅ استرجاع جلسة Demo من localStorage:', demoUser.email);
            setCurrentUser(demoUser);
            GlobalDemoModeActive = true;  // تعيين global flag
            setIsAuthLoading(false);
            return; // توقف تماماً - لا تستدعي أي Supabase
          } catch (e) {
            console.warn('⚠️ فشل استرجاع جلسة Demo:', e);
            localStorage.removeItem('dar_demo_session');
          }
        }
        
        // فقط حاول Supabase إذا لم نجد Demo session
        if (!supabase || !supabase.auth) {
          console.error('❌ Supabase auth غير متاح.');
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
          console.log('✅ مستخدم مسجل من GoTrue:', email);
          
          if (EMPLOYEES_DATA[email]) {
            setCurrentUser({ id: session.user.id, email, ...EMPLOYEES_DATA[email], isDemoMode: false });
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
          console.log('ℹ️ لا توجد جلسة GoTrue ولا Demo');
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

    // إذا كنا في Demo Mode، لا نستمع لـ auth events على الإطلاق
    if (GlobalDemoModeActive || (currentUser as any)?.isDemoMode === true) {
      console.log('🔒 Demo Mode نشط - تخطي onAuthStateChange listener تماماً');
      return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔐 Auth state changed:', event);
      
      // تحقق مجددة من Demo Mode
      const isDemoMode = GlobalDemoModeActive || (currentUser as any)?.isDemoMode === true;
      if (isDemoMode) {
        console.log('🔒 Demo Mode نشط (global flag) - تجاهل حدث Auth بقوة:', event);
        return; // توقف تام - لا تعدل state على الإطلاق
      }
      
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

  const login = async (email: string, password: string) => {
    const e = email.toLowerCase();
    console.log('🔐 محاولة تسجيل الدخول:', e);

    if (!supabase || !supabase.auth) {
      throw new Error('خدمة المصادقة غير متاحة حالياً');
    }

    // قائمة المستخدمين المعروفة (Demo Mode Fast Track) - لا تتفاعل مع GoTrue
    if (EMPLOYEES_DATA[e]) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, name, role, temp_password_hash, must_change_password')
        .eq('email', e)
        .maybeSingle();

      if (profileError) {
        throw new Error('تعذر التحقق من كلمة المرور حاليا');
      }

      if (!profile?.temp_password_hash) {
        const err: any = new Error('يجب إعداد كلمة مرور مؤقتة');
        err.code = 'TEMP_PASSWORD_REQUIRED';
        throw err;
      }

      const inputHash = await hashPassword(password);
      if (inputHash !== profile.temp_password_hash) {
        throw new Error('البريد أو كلمة المرور غير صحيحة');
      }

      console.log('🔧 تفعيل Demo Mode المباشر - تجاوز GoTrue تماماً');
      
      // حذف جميع جلسات Supabase من localStorage لمنع أي تدخل من GoTrue
      const keysToDelete = Object.keys(localStorage).filter(key => 
        key.includes('supabase') || key.includes('auth') || key.includes('sb-')
      );
      keysToDelete.forEach(key => {
        console.log('🗑️ حذف جلسة قديمة:', key);
        localStorage.removeItem(key);
      });
      
      // NÃO تحاول حتى signOut - فقط تجاوز تماماً
      const empData = EMPLOYEES_DATA[e];
      
      const userId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
      
      const demoUser = {
        id: userId,
        email: e,
        name: profile?.name || empData.name,
        role: (profile?.role as UserRole) || empData.role,
        isDemoMode: true  // Mark as demo mode
      };
      
      // تعيين المستخدم مباشرة - هذا يجب أن يشغل App immediately
      setCurrentUser(demoUser);
      GlobalDemoModeActive = true;  // تعيين global flag
      console.log('✅ تم تفعيل Demo Mode بنجاح - المستخدم:', demoUser.email, demoUser.role);
      
      // حفظ الجلسة التجريبية فقط (بدون Supabase session)
      localStorage.setItem('dar_demo_session', JSON.stringify(demoUser));
      
      // إرجاع success object بدون أي تفاعل GoTrue
      return { user: { id: userId, email: e, user_metadata: { isDemoMode: true, ...empData } } };
    }

    // محاولة تسجيل الدخول عبر GoTrue فقط للمستخدمين الجدد
    console.log('📡 محاولة الاتصال بـ GoTrue...');
    const { data, error } = await supabase.auth.signInWithPassword({ email: e, password });
    
    if (error) {
      console.warn('❌ فشل GoTrue:', error.message);
      throw new Error('البريد أو كلمة المرور غير صحيحة');
    }
    
    if (!data?.user) {
      throw new Error('فشل تسجيل الدخول - لا توجد بيانات مستخدم');
    }

    console.log('✅ تسجيل دخول GoTrue ناجح:', data.user.id);
    
    // جلب بيانات الموظف من profiles
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).maybeSingle();
    if (profile) {
      setCurrentUser(profile);
    } else {
      setCurrentUser({ id: data.user.id, email: e, name: e.split('@')[0], role: 'PR_MANAGER' });
    }
    
    return data;
  };

  const logout = async () => {
    try {
      if (supabase && supabase.auth) await supabase.auth.signOut();
    } catch (e) { /* ignore */ }
    // حذف جميع بيانات الجلسة
    localStorage.removeItem('dar_demo_session');
    // حذف جميع جلسات Supabase
    const keysToDelete = Object.keys(localStorage).filter(key => 
      key.includes('supabase') || key.includes('auth') || key.includes('sb-')
    );
    keysToDelete.forEach(key => localStorage.removeItem(key));
    
    GlobalDemoModeActive = false;  // إعادة تعيين global flag
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
