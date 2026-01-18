
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

// The primary admin account that must always have access
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

  /**
   * CORE Profile Synchronizer
   * Fetches the profile strictly by userId. Handles recursion errors (42P17) for Admin.
   */
  const fetchProfile = useCallback(async (userId: string, email: string, isRetry = false) => {
    console.log(`[AUTH_STRICT] Profile Syncing... UID: ${userId} | EMAIL: ${email}`);
    setIsAuthLoading(true);

    try {
      if (isRetry) await new Promise(r => setTimeout(r, 1500));

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        // Detect Postgres Recursion Error (42P17) or 403 Forbidden
        const isPolicyIssue = error.code === '42P17' || error.status === 403 || error.message?.includes('recursion');
        
        if (isPolicyIssue && email === ADMIN_EMAIL) {
          console.warn("[AUTH_STRICT] DB Policy Loop detected for Admin. Activating Local Identity Bypass.");
          setCurrentUser({
            id: userId,
            email: email,
            name: 'المدير العام (تجاوز سياسات الوصول)',
            role: 'ADMIN' as UserRole,
            department: 'الإدارة العليا'
          });
          return;
        }
        throw error;
      }

      if (data) {
        console.log("[AUTH_STRICT] Profile resolved successfully. Role:", data.role);
        setCurrentUser(data as User);
      } else if (email === ADMIN_EMAIL && !isRetry) {
        // Self-heal attempt for admin if profile is missing
        return await fetchProfile(userId, email, true);
      } else {
        // Fallback to Guest if user is authenticated but no profile exists
        setCurrentUser({
          id: userId,
          email: email,
          name: email ? email.split('@')[0] : 'ضيف',
          role: 'GUEST' as UserRole,
          department: 'غير محدد'
        });
      }
    } catch (err: any) {
      console.error("[AUTH_STRICT] Sync process encountered a fatal error:", err?.message || err);
      
      // Emergency recovery for Admin only
      if (email === ADMIN_EMAIL) {
        console.warn("[AUTH_STRICT] Critical Policy Error. Applying Hard Fallback for Admin.");
        setCurrentUser({
          id: userId,
          email: email,
          name: 'المدير العام (نمط التعافي)',
          role: 'ADMIN' as UserRole,
          department: 'الإدارة'
        });
      } else {
        setCurrentUser(null);
      }
    } finally {
      setIsAuthLoading(false);
    }
  }, []);

  /**
   * RECOVERY: Manual Refresh for users to re-sync their role if policies change.
   */
  const forceRefreshProfile = async () => {
    console.log("[AUTH_STRICT] Manual re-sync initiated...");
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await fetchProfile(session.user.id, session.user.email || '');
    } else {
      setIsAuthLoading(false);
    }
  };

  /**
   * SAFETY TIMEOUT (15 Seconds)
   * Prevents the application from being locked in a loading state if Supabase fails to respond.
   */
  useEffect(() => {
    if (isAuthLoading) {
      const timer = setTimeout(() => {
        if (isAuthLoading) {
          console.warn("[AUTH_STRICT] Safety timeout (15s) reached. Unlocking UI.");
          setIsAuthLoading(false);
        }
      }, 15000);
      return () => clearTimeout(timer);
    }
  }, [isAuthLoading]);

  /**
   * AUTH INITIALIZATION & SUBSCRIPTION
   */
  useEffect(() => {
    const initializeSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await fetchProfile(session.user.id, session.user.email || '');
      } else {
        setIsAuthLoading(false);
      }
    };

    initializeSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`[AUTH_STRICT] Auth State Update: ${event}`);
      if (session?.user) {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          setIsAuthLoading(true);
          await fetchProfile(session.user.id, session.user.email || '');
        }
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        setIsAuthLoading(false);
        localStorage.clear();
        sessionStorage.clear();
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

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

      setProjects(pRes.data?.map(p => ({ ...p, name: p.title || p.name })) || []);
      setTechnicalRequests(trRes.data || []);
      setAppUsers(profilesRes.data || []);
      setClearanceRequests(deedsRes.data || []);
      setProjectWorks(worksRes.data || []);
      setErrorState(null);
    } catch (e: any) {
      console.error("[DATA_SYNC] Global data refresh failed:", e?.message);
      setErrorState("تنبيه: تعذر مزامنة بيانات النظام مع الخادم.");
    } finally {
      setIsDbLoading(false);
    }
  }, [currentUser]);

  const login = async (email: string, password: string) => {
    setIsAuthLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (err) {
      setIsAuthLoading(false);
      throw err;
    }
  };

  const logout = async () => {
    setIsAuthLoading(true);
    try {
      await supabase.auth.signOut();
      setCurrentUser(null);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const canAccess = (allowedRoles: UserRole[]) => {
    return !!currentUser && allowedRoles.includes(currentUser.role);
  };

  useEffect(() => {
    if (currentUser) refreshData();
  }, [currentUser, refreshData]);

  return (
    <DataContext.Provider value={{
      projects, technicalRequests, clearanceRequests, projectWorks, appUsers, activities, 
      currentUser, isDbLoading, isAuthLoading, errorState,
      login, logout, refreshData, forceRefreshProfile, logActivity, canAccess
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
