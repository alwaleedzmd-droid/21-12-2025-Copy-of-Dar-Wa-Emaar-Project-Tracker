
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
   * SAFETY VALVE: Forced app entry after 3 seconds.
   * If the database or auth takes too long, we force the loading state to false
   * and set an Emergency Admin to allow the developer to debug the UI.
   */
  useEffect(() => {
    if (isAuthLoading) {
      const safetyTimer = setTimeout(() => {
        console.warn("CRITICAL: Auth/Profile loading timed out after 3 seconds. Forcing entry.");
        setIsAuthLoading(false);
        if (!currentUser) {
          console.warn("Setting Emergency Admin for debugging purposes.");
          setCurrentUser({
            id: 'emergency-temp-id',
            email: 'admin@emergency.com',
            name: 'Emergency Admin (Safe Mode)',
            role: 'ADMIN',
            department: 'System Recovery'
          });
        }
      }, 3000);
      return () => clearTimeout(safetyTimer);
    }
  }, [isAuthLoading, currentUser]);

  /**
   * fetchProfile: Fetches user metadata from the 'profiles' table.
   */
  const fetchProfile = async (userId: string, email: string) => {
    try {
      console.log("[AUTH] Fetching Profile for:", userId);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      console.log("[AUTH] Profile search result:", data, error);

      if (error || !data) {
        // Fallback profile if record doesn't exist yet
        return {
          id: userId,
          email: email,
          name: email ? email.split('@')[0] : 'User',
          role: 'ADMIN' as UserRole, // Set to ADMIN by default to allow first user setup
          department: 'IT'
        } as User;
      }

      return data as User;
    } catch (err) {
      console.error("[AUTH] fetchProfile Exception:", err);
      return null;
    } finally {
      setIsAuthLoading(false);
    }
  };

  /**
   * Auth Initialization
   */
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const user = await fetchProfile(session.user.id, session.user.email || '');
          if (user) setCurrentUser(user);
        } else {
          setIsAuthLoading(false);
        }
      } catch (e) {
        console.error("[AUTH_INIT] Error:", e);
        setIsAuthLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`[AUTH_EVENT] ${event}`);
      if (session?.user) {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          const user = await fetchProfile(session.user.id, session.user.email || '');
          if (user) setCurrentUser(user);
        }
      } else {
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
      console.error("[DB_REFRESH] Error:", e);
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
      await supabase.auth.signOut();
      setCurrentUser(null);
      window.location.href = '/'; 
    } catch (err) {
      console.error("Logout Error:", err);
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
