
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
   * ROBUST Profile Fetcher:
   * Ensures the loading spinner stops and provides a guest fallback if no profile exists.
   */
  const fetchProfile = async (userId: string, email: string) => {
    setIsAuthLoading(true);
    console.log("[AUTH_DEBUG] Initiating profile fetch for UID:", userId);
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error("[AUTH_DEBUG] Supabase Profile Query Error:", error);
        throw error;
      }

      console.log("[AUTH_DEBUG] Profile Data Received:", data);

      if (!data) {
        console.warn("[AUTH_DEBUG] No profile record found. Using GUEST fallback.");
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
      console.error("[AUTH_DEBUG] Fatal exception in fetchProfile:", err);
      // Fallback user to allow app entry even on DB failure
      const fallbackUser: User = {
        id: userId,
        email: email,
        name: 'Guest (Error Fallback)',
        role: 'GUEST' as UserRole,
        department: 'Unknown'
      };
      setCurrentUser(fallbackUser);
      return fallbackUser;
    } finally {
      // CRITICAL: Ensure the spinner ALWAYS stops
      console.log("[AUTH_DEBUG] Authentication loading complete.");
      setIsAuthLoading(false);
    }
  };

  /**
   * Safety Valve Refinement:
   * Still keep a timeout to unlock the UI if the entire auth sequence hangs for > 5 seconds,
   * but don't set a fake admin anymore.
   */
  useEffect(() => {
    if (isAuthLoading) {
      const timer = setTimeout(() => {
        if (isAuthLoading) {
          console.warn("[AUTH_DEBUG] Load timeout reached (5s). Unlocking UI.");
          setIsAuthLoading(false);
        }
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isAuthLoading]);

  /**
   * Auth Initialization & Subscription
   */
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        console.log("[AUTH_DEBUG] Initializing Auth state...");
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          console.log("[AUTH_DEBUG] Session found for:", session.user.email);
          await fetchProfile(session.user.id, session.user.email || '');
        } else {
          console.log("[AUTH_DEBUG] No active session found.");
          setIsAuthLoading(false);
        }
      } catch (e) {
        console.error("[AUTH_DEBUG] Initialization Error:", e);
        setIsAuthLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`[AUTH_DEBUG] Event Triggered: ${event}`);
      
      if (session?.user) {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          await fetchProfile(session.user.id, session.user.email || '');
        }
      } else {
        console.log("[AUTH_DEBUG] User state cleared (Signed Out or Null Session)");
        setCurrentUser(null);
        setIsAuthLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const refreshData = useCallback(async () => {
    if (!currentUser) return;
    setIsDbLoading(true);
    try {
      console.log("[DB_DEBUG] Refreshing application data...");
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
      console.log("[DB_DEBUG] Data refresh complete.");
    } catch (e) {
      console.error("[DB_DEBUG] Data refresh failed:", e);
      setErrorState("تنبيه: تعذر تحديث بعض البيانات من قاعدة البيانات");
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
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setCurrentUser(null);
    } catch (err) {
      console.error("[AUTH_DEBUG] Logout Error:", err);
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
