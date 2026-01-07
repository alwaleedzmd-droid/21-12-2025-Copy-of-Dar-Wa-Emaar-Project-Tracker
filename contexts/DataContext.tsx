
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '../supabaseClient';
import { ProjectSummary, TechnicalRequest, User, UserRole, ProjectWork } from '../types';

export const FALLBACK_PROJECTS: ProjectSummary[] = [
  { id: 200, client: "دار وإعمار", name: "سرايا النرجس", title: "سرايا النرجس", status: "active", location: "الرياض", progress: 65, units_count: 1288, electricity_meters: 1200, water_meters: 1288, building_permits: 45, occupancy_certificates: 30, survey_decisions_count: 12 },
  { id: 211, client: "دار وإعمار", name: "تالا السيف", title: "تالا السيف", status: "active", location: "المنطقة الشرقية", progress: 60, units_count: 45, electricity_meters: 45, water_meters: 45, building_permits: 45, occupancy_certificates: 40, survey_decisions_count: 3 }
];

export interface ActivityLog {
  id: string;
  user: string;
  action: string;
  target: string;
  timestamp: Date;
  color: 'text-blue-500' | 'text-orange-500' | 'text-green-500';
}

interface DataContextType {
  projects: ProjectSummary[];
  technicalRequests: TechnicalRequest[];
  clearanceRequests: any[];
  projectWorks: ProjectWork[];
  appUsers: any[];
  activities: ActivityLog[];
  currentUser: User | null;
  isDbLoading: boolean;
  isAuthLoading: boolean;
  errorState: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshData: () => Promise<void>;
  logActivity: (action: string, target: string, color?: ActivityLog['color']) => void;
  canAccess: (allowedRoles: UserRole[]) => boolean;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [technicalRequests, setTechnicalRequests] = useState<TechnicalRequest[]>([]);
  const [clearanceRequests, setClearanceRequests] = useState<any[]>([]);
  const [projectWorks, setProjectWorks] = useState<ProjectWork[]>([]);
  const [appUsers, setAppUsers] = useState<any[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [isDbLoading, setIsDbLoading] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [errorState, setErrorState] = useState<string | null>(null);
  
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const cached = localStorage.getItem('dar_user_v2_cache');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  const logActivity = useCallback((action: string, target: string, color: ActivityLog['color'] = 'text-blue-500') => {
    const newLog: ActivityLog = {
      id: Math.random().toString(36).substr(2, 9),
      user: currentUser?.name || 'مستخدم',
      action,
      target,
      timestamp: new Date(),
      color
    };
    setActivities(prev => [newLog, ...prev].slice(0, 50));
  }, [currentUser]);

  const canAccess = (allowedRoles: UserRole[]) => {
    return !!currentUser && allowedRoles.includes(currentUser.role);
  };

  const refreshData = useCallback(async () => {
    if (!currentUser) return;
    setIsDbLoading(true);
    try {
      const [pRes, trRes, profilesRes, deedsRes, worksRes] = await Promise.all([
        supabase.from('projects').select('*').order('id', { ascending: true }),
        supabase.from('technical_requests').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('*'),
        supabase.from('deeds_requests').select('*').order('created_at', { ascending: false }),
        supabase.from('project_works').select('*').order('created_at', { ascending: false })
      ]);

      if (pRes.data) {
        setProjects(pRes.data.map(p => ({
          ...p,
          name: p.title || p.name,
          progress: p.progress || 0
        })));
      }

      setTechnicalRequests(trRes.data || []);
      setAppUsers(profilesRes.data || []);
      setClearanceRequests(deedsRes.data || []);
      setProjectWorks(worksRes.data || []);
      setErrorState(null);
    } catch (e: any) {
      console.error("Fetch Data Error", e);
      // في حال كان الخطأ بسبب الجلسة، نقوم بتسجيل الخروج الصامت
      if (e.message?.includes('JWT') || e.status === 401) {
        handleAuthFailure();
      }
      setErrorState("فشل المزامنة - يرجى التحقق من الاتصال");
    } finally {
      setIsDbLoading(false);
    }
  }, [currentUser]);

  const handleAuthFailure = useCallback(() => {
    console.warn("Auth Session Expired or Corrupted. Clearing local data.");
    localStorage.removeItem('dar_user_v2_cache');
    // مسح مفاتيح Supabase من التخزين المحلي لإصلاح خطأ Refresh Token
    Object.keys(localStorage).forEach(key => {
      if (key.includes('sb-') && key.includes('-auth-token')) {
        localStorage.removeItem(key);
      }
    });
    setCurrentUser(null);
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
          if (sessionError) console.error("Session Error:", sessionError.message);
          handleAuthFailure();
          setIsAuthLoading(false);
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') {
          throw profileError;
        }

        const user: User = {
          id: session.user.id,
          email: session.user.email || '',
          name: profile?.name || session.user.user_metadata?.name || 'موظف دار وإعمار',
          role: session.user.email === 'adaldawsari@darwaemaar.com' ? 'ADMIN' : (profile?.role || 'PR_OFFICER')
        };

        setCurrentUser(user);
        localStorage.setItem('dar_user_v2_cache', JSON.stringify(user));
      } catch (err: any) {
        console.error("Init Auth Error:", err.message);
        handleAuthFailure();
      } finally {
        setIsAuthLoading(false);
      }
    };

    initAuth();

    // الاستماع لتغيرات حالة المصادقة لإصلاح أخطاء التوكن بشكل حي
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        if (!session) handleAuthFailure();
      }
      if (event === 'TOKEN_REFRESHED' && session) {
        console.debug("Token refreshed successfully.");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [handleAuthFailure]);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    // تم حذف window.location.reload لتمكين React من إدارة الحالة بسلاسة
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      handleAuthFailure();
      window.location.reload();
    }
  };

  useEffect(() => {
    if (currentUser) refreshData();
  }, [currentUser, refreshData]);

  return (
    <DataContext.Provider value={{
      projects, technicalRequests, clearanceRequests, projectWorks, appUsers, activities, 
      currentUser, isDbLoading, isAuthLoading, errorState,
      login, logout, refreshData, logActivity, canAccess
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) throw new Error('useData must be used within a DataProvider');
  return context;
};
