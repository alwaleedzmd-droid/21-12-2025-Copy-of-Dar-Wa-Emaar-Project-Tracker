
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '../supabaseClient';
import { ProjectSummary, TechnicalRequest, User, UserRole, ProjectWork } from '../types';

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
  forceRefreshProfile: () => Promise<void>;
  logActivity: (action: string, target: string, color?: ActivityLog['color']) => void;
  canAccess: (allowedRoles: UserRole[]) => boolean;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// الحساب المدير الأساسي لتجاوز كافة السياسات والدخول الصامت
const ADMIN_EMAIL = 'adaldawsari@darwaemaar.com';

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
  const [currentUser, setCurrentUser] = useState<User | null>(null);

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

  const refreshData = useCallback(async () => {
    if (!currentUser || currentUser.role === 'GUEST') return;
    setIsDbLoading(true);
    try {
      const [pRes, trRes, drRes, pwRes, prRes] = await Promise.all([
        supabase.from('projects').select('*').order('id', { ascending: true }),
        supabase.from('technical_requests').select('*').order('created_at', { ascending: false }),
        supabase.from('deeds_requests').select('*').order('created_at', { ascending: false }),
        supabase.from('project_works').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('*')
      ]);

      setProjects(pRes.data?.map(p => ({ ...p, name: p.title || p.name })) || []);
      setTechnicalRequests(trRes.data || []);
      setClearanceRequests(drRes.data || []);
      setProjectWorks(pwRes.data || []);
      setAppUsers(prRes.data || []);
      setErrorState(null);
    } catch (e: any) {
      console.warn("[SILENT_DATA] Refresh incomplete:", e?.message);
    } finally {
      setIsDbLoading(false);
    }
  }, [currentUser]);

  /**
   * SILENT AUTH FETCH
   * Immediately sets Admin for specific email to unlock UI instantly.
   */
  const fetchProfile = useCallback(async (userId: string, email: string) => {
    // 1. Instant Admin Bypass
    if (email === ADMIN_EMAIL) {
      setCurrentUser({
        id: userId,
        email: email,
        name: 'الوليد الدوسري',
        role: 'ADMIN' as UserRole,
        department: 'الإدارة العليا'
      });
      setIsAuthLoading(false);
      
      // Secondary background sync
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle().then(({ data }) => {
        if (data) setCurrentUser(prev => ({ ...prev, ...data } as User));
      });
      return;
    }

    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
      if (error) throw error;
      if (data) {
        setCurrentUser(data as User);
      } else {
        setCurrentUser({
          id: userId,
          email: email,
          name: email.split('@')[0],
          role: 'GUEST' as UserRole,
          department: 'غير محدد'
        });
      }
    } catch (err) {
      setCurrentUser(null);
    } finally {
      setIsAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await fetchProfile(session.user.id, session.user.email || '');
      } else {
        setIsAuthLoading(false);
      }
    };
    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setIsAuthLoading(true);
        await fetchProfile(session.user.id, session.user.email || '');
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        setIsAuthLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  useEffect(() => {
    if (currentUser) refreshData();
  }, [currentUser, refreshData]);

  return (
    <DataContext.Provider value={{
      projects, technicalRequests, clearanceRequests, projectWorks, appUsers, activities, 
      currentUser, isDbLoading, isAuthLoading, errorState,
      login: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      },
      logout: async () => { 
        setIsAuthLoading(true);
        await supabase.auth.signOut();
        localStorage.clear();
        sessionStorage.clear();
        setCurrentUser(null);
        setIsAuthLoading(false);
        window.location.href = '/'; // Forced immediate redirect
      },
      refreshData,
      forceRefreshProfile: async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) await fetchProfile(session.user.id, session.user.email || '');
      },
      logActivity,
      canAccess: (allowedRoles) => !!currentUser && allowedRoles.includes(currentUser.role)
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) throw new Error('useData must be used within DataProvider');
  return context;
};
