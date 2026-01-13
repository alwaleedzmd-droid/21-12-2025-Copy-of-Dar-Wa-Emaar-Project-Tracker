
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
   * 1. ROBUST Profile Fetcher:
   * Uses try...catch...finally to ensure the loading state is ALWAYS updated.
   * Provides a GUEST fallback if no database record is found.
   */
  const fetchProfile = async (userId: string, email: string) => {
    console.log("[AUTH_SYNC] Fetching profile for:", email);
    setIsAuthLoading(true);

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error("[AUTH_SYNC] Profile query error:", error);
        throw error;
      }

      console.log("[AUTH_SYNC] Profile Data:", data);

      if (!data) {
        console.warn("[AUTH_SYNC] No profile record found. Setting GUEST fallback.");
        const guestUser: User = {
          id: userId,
          email: email,
          name: email ? email.split('@')[0] : 'ضيف',
          role: 'GUEST' as UserRole,
          department: 'غير محدد'
        };
        setCurrentUser(guestUser);
        return guestUser;
      }

      const user = data as User;
      setCurrentUser(user);
      return user;

    } catch (err) {
      console.error("[AUTH_SYNC] Profile fetch failed. Using GUEST fallback.");
      const fallback: User = {
        id: userId,
        email: email,
        name: email ? email.split('@')[0] : 'مستخدم',
        role: 'GUEST' as UserRole,
        department: 'Unknown'
      };
      setCurrentUser(fallback);
      return fallback;
    } finally {
      // NON-NEGOTIABLE: Stop the spinner no matter what.
      setIsAuthLoading(false);
      console.log("[AUTH_SYNC] Spinner stopped via finally block.");
    }
  };

  /**
   * 2. GLOBAL FAIL-SAFE TIMER:
   * Forces the app to unlock after 4 seconds to prevent infinite spinning.
   */
  useEffect(() => {
    if (isAuthLoading) {
      const safetyValve = setTimeout(() => {
        if (isAuthLoading) {
          console.warn("[BULLETPROOF] 4s Timeout Reached! Forcing UI Unlock.");
          setIsAuthLoading(false);
          // If after 4 seconds we have no user, but auth might have succeeded, set guest
          if (!currentUser) {
            console.warn("[BULLETPROOF] Setting emergency Guest session.");
            setCurrentUser({
              id: 'fallback-' + Date.now(),
              email: '',
              name: 'مستخدم (Safe Mode)',
              role: 'GUEST' as UserRole
            });
          }
        }
      }, 4000);
      return () => clearTimeout(safetyValve);
    }
  }, [isAuthLoading, currentUser]);

  /**
   * 3. AUTH STATE LISTENER SYNC
   */
  useEffect(() => {
    const initSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        console.log("[AUTH_SYNC] Initial Session Check:", !!session);
        if (session?.user) {
          await fetchProfile(session.user.id, session.user.email || '');
        } else {
          setIsAuthLoading(false);
        }
      } catch (e) {
        console.error("[AUTH_SYNC] Session Init Error:", e);
        setIsAuthLoading(false);
      }
    };

    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`[AUTH_SYNC] Event: ${event} | Session: ${!!session}`);
      
      if (session?.user) {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          await fetchProfile(session.user.id, session.user.email || '');
        }
      } else {
        if (event === 'SIGNED_OUT') {
          console.log("[AUTH_SYNC] Signed out. Clearing state.");
          setCurrentUser(null);
          setIsAuthLoading(false);
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
    } catch (err) {
      console.error("[AUTH_SYNC] Logout Error:", err);
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
