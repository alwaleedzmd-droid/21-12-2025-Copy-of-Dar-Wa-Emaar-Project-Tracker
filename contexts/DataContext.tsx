
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
   * 1. BULLETPROOF Profile Fetcher:
   * This is the ONLY source of truth for the user role.
   * It keeps isAuthLoading = true until the database responds.
   */
  const fetchProfile = async (userId: string, email: string) => {
    console.log("[AUTH_STRICT] Fetching real database profile for:", email);
    setIsAuthLoading(true);

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error("[AUTH_STRICT] Database query failed:", error);
        throw error;
      }

      if (data) {
        console.log("[AUTH_STRICT] Profile found. Role:", data.role);
        setCurrentUser(data as User);
      } else {
        console.warn("[AUTH_STRICT] No profile record in DB for this UID.");
        // We only set GUEST if we are CERTAIN no profile exists
        setCurrentUser({
          id: userId,
          email: email,
          name: email ? email.split('@')[0] : 'ضيف',
          role: 'GUEST' as UserRole,
          department: 'غير محدد'
        });
      }
    } catch (err) {
      console.error("[AUTH_STRICT] Exception in fetchProfile:", err);
      // If the DB is completely down, we still shouldn't lock the UI forever,
      // but we wait for the 15s timeout to be the final judge.
    } finally {
      // CRITICAL: Only unlock the UI after the DB has been checked.
      setIsAuthLoading(false);
      console.log("[AUTH_STRICT] Loading finished. UI unlocked.");
    }
  };

  /**
   * 2. EXTENDED SAFETY TIMEOUT (15 SECONDS):
   * Prevents infinite spinning if network or Supabase hangs indefinitely.
   */
  useEffect(() => {
    if (isAuthLoading) {
      const safetyValve = setTimeout(() => {
        if (isAuthLoading) {
          console.warn("[AUTH_STRICT] 15s Safety Timeout hit! Forcing UI unlock.");
          setIsAuthLoading(false);
          // Only assign a fallback if we still have absolutely no user data
          if (!currentUser) {
            setCurrentUser({
              id: 'timeout-' + Date.now(),
              email: '',
              name: 'مستخدم (الوضع الآمن)',
              role: 'GUEST' as UserRole
            });
          }
        }
      }, 15000);
      return () => clearTimeout(safetyValve);
    }
  }, [isAuthLoading, currentUser]);

  /**
   * 3. AUTH SYNC LISTENER
   */
  useEffect(() => {
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await fetchProfile(session.user.id, session.user.email || '');
        } else {
          setIsAuthLoading(false);
        }
      } catch (e) {
        console.error("[AUTH_STRICT] Init error:", e);
        setIsAuthLoading(false);
      }
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`[AUTH_STRICT] Auth Event: ${event}`);
      
      if (session?.user) {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          // Immediately block the UI when a sign-in is detected to prevent 403 flashes
          setIsAuthLoading(true);
          await fetchProfile(session.user.id, session.user.email || '');
        }
      } else {
        if (event === 'SIGNED_OUT') {
          setCurrentUser(null);
          setIsAuthLoading(false);
          localStorage.clear();
        }
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
    } catch (e) {
      console.error("[DB_LOAD] Refresh Error:", e);
      setErrorState("تنبيه: تعذر تحديث البيانات من الخادم.");
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
      localStorage.clear();
    } catch (err) {
      console.error("[AUTH_STRICT] Logout failure:", err);
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
