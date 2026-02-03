
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

// --- تعريف الموظفين الـ 16 داخل الكود لتجاوز خطأ الـ Schema والتحقق السريع ---
const EMPLOYEES_DATA: Record<string, { name: string; role: UserRole }> = {
  'adaldawsari@darwaemaar.com': { name: 'الوليد الدوسري', role: 'ADMIN' },
  'malageel@darwaemaar.com': { name: 'مساعد العقيل', role: 'PR_MANAGER' },
  'syahya@darwaemaar.com': { name: 'صالح اليحيى', role: 'PR_MANAGER' },
  'mshammari@darwaemaar.com': { name: 'محمد الشمري', role: 'PR_MANAGER' },
  'malbahri@darwaemaar.com': { name: 'محمد البحري', role: 'PR_MANAGER' },
  'nalmaliki@darwaemaar.com': { name: 'نورة المالكي', role: 'CONVEYANCE' },
  'saalfahad@darwaemaar.com': { name: 'سارة الفهد', role: 'CONVEYANCE' },
  'tmashari@darwaemaar.com': { name: 'تماني المشاري', role: 'CONVEYANCE' },
  'shalmalki@darwaemaar.com': { name: 'شذى المالكي', role: 'CONVEYANCE' },
  'balqarni@darwaemaar.com': { name: 'بشرى القرني', role: 'CONVEYANCE' },
  'hmalsalman@darwaemaar.com': { name: 'حسن السلمان', role: 'CONVEYANCE' },
  'falshammari@darwaemaar.com': { name: 'فهد الشمري', role: 'CONVEYANCE' },
  'ssalama@darwaemaar.com': { name: 'سيد سلامة', role: 'TECHNICAL' },
  'iahmad@darwaemaar.com': { name: 'إسلام أحمد', role: 'TECHNICAL' },
  'mhbaishi@darwaemaar.com': { name: 'محمود بحيصي', role: 'TECHNICAL' },
  'mhaqeel@darwaemaar.com': { name: 'حمزة عقيل', role: 'TECHNICAL' },
  'emelshity@darwaemaar.com': { name: 'أحمد الملشتي', role: 'TECHNICAL' }
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
    if (!currentUser || !supabase) return;
    setIsDbLoading(true);
    try {
      const [pRes, trRes, drRes, pwRes, uRes] = await Promise.all([
        supabase.from('projects').select('*').order('id', { ascending: true }),
        supabase.from('technical_requests').select('*').order('created_at', { ascending: false }),
        supabase.from('deeds_requests').select('*').order('created_at', { ascending: false }),
        supabase.from('project_works').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('*')
      ]);
      setProjects(pRes.data?.map(p => ({ ...p, name: p.name || p.title || 'مشروع' })) || []);
      setTechnicalRequests(trRes.data || []);
      setClearanceRequests(drRes.data || []);
      setProjectWorks(pwRes.data || []);
      setAppUsers(uRes.data || []);
    } catch (e) { console.error("Data refresh error:", e); } 
    finally { setIsDbLoading(false); }
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

  useEffect(() => { if (currentUser) refreshData(); }, [currentUser, refreshData]);

  const login = async (email: string, password: string) => {
    const e = email.toLowerCase();
    // Immediate demo login for known employee records
    if (EMPLOYEES_DATA[e]) {
      const demoId = 'demo-' + e;
      const user = { id: demoId, email: e, ...EMPLOYEES_DATA[e] } as any;
      setCurrentUser(user);
      try { localStorage.setItem('dar_demo_session', JSON.stringify({ id: demoId, email: e })); } catch (err) { /* ignore */ }
      return { user };
    }

    // Allow any @darwaemaar.com email as a demo user with default role
    if (e.endsWith('@darwaemaar.com')) {
      const demoId = 'demo-' + e;
      const namePart = e.split('@')[0];
      const user = { id: demoId, email: e, name: namePart, role: 'PR_MANAGER' } as any;
      setCurrentUser(user);
      try { localStorage.setItem('dar_demo_session', JSON.stringify({ id: demoId, email: e })); } catch (err) { /* ignore */ }
      return { user };
    }

    if (!supabase) throw new Error("Supabase client is not available.");
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return data;
    } catch (err: any) {
      throw err;
    }
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
