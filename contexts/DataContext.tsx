
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
   * Waits for Supabase profile. If missing or error, sets a GUEST fallback.
   * NEVER unlocks UI (setIsAuthLoading) until it has a definitive result.
   */
  const fetchProfile = async (userId: string, email: string) => {
    console.log("[AUTH_STRICT] Fetching profile for:", email);
    setIsAuthLoading(true);

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error("[AUTH_STRICT] Profile lookup error:", error);
        throw error;
      }

      console.log("[AUTH_STRICT] Profile response:", data);

      if (!data) {
        console.warn("[AUTH_STRICT] Profile record missing. Assigning GUEST role.");
        const guest: User = {
          id: userId,
          email: email,
          name: email ? email.split('@')[0] : 'ضيف',
          role: 'GUEST' as UserRole,
          department: 'غير محدد'
        };
        setCurrentUser(guest);
      } else {
        console.log("[AUTH_STRICT] Success! User role assigned:", data.role);
        setCurrentUser(data as User);
      }
    } catch (err) {
      console.error("[AUTH_STRICT] Fatal profile fetch exception. Defaulting to Guest.");
      setCurrentUser({
        id: userId,
        email: email,
        name: 'Guest User',
        role: 'GUEST' as UserRole,
        department: 'Unknown'
      });
    } finally {
      // THE ONLY PLACE where initial loading is cleared during successful auth flow
      setIsAuthLoading(false);
      console.log("[AUTH_STRICT] UI unlocked.");
    }
  };

  /**
   * 2. GLOBAL FAIL-SAFE (10 SECONDS):
   * If the network is extremely slow or Supabase hangs, 
   * we force the UI to unlock so the user isn't stuck forever.
   */
  useEffect(() => {
    if (isAuthLoading) {
      const timer = setTimeout(() => {
        if (isAuthLoading) {
          console.warn("[AUTH_STRICT] 10s Fail-safe triggered. Forcing app start.");
          setIsAuthLoading(false);
          if (!currentUser) {
             setCurrentUser({
                id: 'timeout-' + Date.now(),
                email: '',
                name: 'مستخدم (Safe Mode)',
                role: 'GUEST' as UserRole
             });
          }
        }
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [isAuthLoading, currentUser]);

  /**
   * 3. AUTH INITIALIZATION & SUBSCRIPTION
   */
  useEffect(() => {
    const init = async () => {
      try {
        console.log("[AUTH_STRICT] Initializing session...");
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await fetchProfile(session.user.id, session.user.email || '');
        } else {
          console.log("[AUTH_STRICT] No existing session found.");
          setIsAuthLoading(false);
        }
      } catch (e) {
        console.error("[AUTH_STRICT] Init error:", e);
        setIsAuthLoading(false);
      }
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`[AUTH_STRICT] Event: ${event}`);
      
      if (session?.user) {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          await fetchProfile(session.user.id, session.user.email || '');
        }
      } else {
        if (event === 'SIGNED_OUT') {
          console.log("[AUTH_STRICT] User logout detected.");
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
      // Profile fetch is handled by onAuthStateChange(SIGNED_IN)
    } catch (err) {
      setIsAuthLoading(false);
      throw err;
    }
  };

  const logout = async () => {
    setIsAuthLoading(true);
    try {
      await supabase.auth.signOut();
      // Reset all local data states strictly
      setCurrentUser(null);
      setProjects([]);
      setTechnicalRequests([]);
      setClearanceRequests([]);
      setProjectWorks([]);
      setAppUsers([]);
      setActivities([]);
      localStorage.clear(); // Clear any cached session fragments
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
