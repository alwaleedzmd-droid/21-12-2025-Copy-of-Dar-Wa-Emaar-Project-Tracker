
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
   * RESILIENT Profile Fetcher
   * Specifically designed to survive "Policy Recursion" errors (42P17) in Supabase RLS.
   */
  const fetchProfile = async (userId: string, email: string, isRetry = false) => {
    console.log(`[AUTH_STRICT] Verifying profile for: ${email}`);
    setIsAuthLoading(true);

    try {
      // Artificial delay for retries to allow DB sessions to propagate
      if (isRetry) await new Promise(r => setTimeout(r, 1000));

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        // Detect recursion or permission issues
        const isRecursion = error.code === '42P17' || error.message?.toLowerCase().includes('recursion');
        
        if (isRecursion && email === ADMIN_EMAIL) {
          console.warn("[AUTH_STRICT] Policy recursion detected. Applying Admin Local Bypass.");
          setCurrentUser({
            id: userId,
            email: email,
            name: 'المدير العام (نمط تجاوز السياسات)',
            role: 'ADMIN' as UserRole,
            department: 'الإدارة العليا'
          });
          setIsAuthLoading(false);
          return;
        }
        throw error;
      }

      if (data) {
        console.log("[AUTH_STRICT] Profile authenticated. Role:", data.role);
        setCurrentUser(data as User);
      } 
      else if (email === ADMIN_EMAIL) {
        // Self-healing for admin account if table is empty
        if (!isRetry) return await fetchProfile(userId, email, true);
        
        console.log("[AUTH_STRICT] Admin profile missing. Creating record...");
        const adminProfile = {
          id: userId,
          email: email,
          name: 'المدير العام',
          role: 'ADMIN' as UserRole,
          department: 'الإدارة'
        };

        const { data: created, error: createError } = await supabase
          .from('profiles')
          .insert([adminProfile])
          .select()
          .single();

        if (createError) throw createError;
        setCurrentUser(created as User);
      } else {
        // Default role for authenticated users with no specific profile record
        setCurrentUser({
          id: userId,
          email: email,
          name: email ? email.split('@')[0] : 'ضيف',
          role: 'GUEST' as UserRole,
          department: 'غير محدد'
        });
      }
    } catch (err: any) {
      const msg = err?.message || String(err);
      
      // Final Emergency Catch for Administrator
      if ((msg.includes('recursion') || err?.code === '42P17') && email === ADMIN_EMAIL) {
        console.warn("[AUTH_STRICT] Emergency Local Session created for Admin.");
        setCurrentUser({
          id: userId,
          email: email,
          name: 'المدير العام (نمط الطوارئ)',
          role: 'ADMIN' as UserRole,
          department: 'الإدارة'
        });
      } else {
        console.error("[AUTH_STRICT] Profile resolution failed:", msg);
        setCurrentUser(null);
      }
    } finally {
      setIsAuthLoading(false);
    }
  };

  /**
   * Safety timeout to prevent UI hang if DB hangs
   */
  useEffect(() => {
    if (isAuthLoading) {
      const safetyTimeout = setTimeout(() => {
        if (isAuthLoading) {
          console.warn("[AUTH_STRICT] Fail-safe triggered. Session unresolved.");
          setIsAuthLoading(false);
          if (!currentUser) setCurrentUser(null);
        }
      }, 10000);
      return () => clearTimeout(safetyTimeout);
    }
  }, [isAuthLoading, currentUser]);

  /**
   * Auth Listener Setup
   */
  useEffect(() => {
    const initialize = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await fetchProfile(session.user.id, session.user.email || '');
        } else {
          setIsAuthLoading(false);
        }
      } catch (e) {
        setIsAuthLoading(false);
      }
    };

    initialize();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`[AUTH_STRICT] Event: ${event}`);
      
      if (session?.user) {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          setIsAuthLoading(true);
          await new Promise(r => setTimeout(r, 500));
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
  }, []);

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
      console.error("[DATA_SYNC] Error:", e?.message || e);
      setErrorState("تنبيه: تعذر مزامنة البيانات.");
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
    } catch (err) {
      console.error("[AUTH_STRICT] Logout error:", err);
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
