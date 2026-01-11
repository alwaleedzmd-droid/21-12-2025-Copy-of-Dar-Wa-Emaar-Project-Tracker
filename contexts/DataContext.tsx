
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
   * REWRITTEN: FAIL-SAFE PROFILE FETCH
   * Ensures loader is always stopped and handles missing profiles gracefully.
   */
  const fetchProfile = async (userId: string, email: string) => {
    try {
      console.log("[AUTH] Fetching profile for UID:", userId);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error("[AUTH] Database error fetching profile:", error);
        throw error;
      }

      if (!data) {
        console.warn("[AUTH] Profile record not found in database. Setting fallback GUEST role.");
        // Fallback user object if the profile hasn't been created in the public.profiles table yet
        return {
          id: userId,
          email: email,
          name: email.split('@')[0],
          role: 'GUEST' as UserRole,
          department: 'غير محدد'
        } as User;
      }

      console.log("[AUTH] Profile found. Role:", data.role);
      return data as User;
    } catch (err) {
      console.error("[AUTH] Fatal error in fetchProfile logic:", err);
      return null;
    } finally {
      // CRITICAL: Stop the loading spinner no matter what happens
      setIsAuthLoading(false);
    }
  };

  /**
   * INITIAL AUTH LISTENER
   */
  useEffect(() => {
    console.log("[AUTH_INIT] Starting auth listener...");
    
    // Check initial session
    const checkInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const user = await fetchProfile(session.user.id, session.user.email || '');
          setCurrentUser(user);
        } else {
          setIsAuthLoading(false);
        }
      } catch (e) {
        setIsAuthLoading(false);
      }
    };
    checkInitialSession();

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`[AUTH_EVENT] ${event}`);
      
      if (session?.user) {
        // Only trigger loading if we don't have a user yet or it's a new login
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          const user = await fetchProfile(session.user.id, session.user.email || '');
          setCurrentUser(user);
        }
      } else {
        // Handle SIGNED_OUT or session loss
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
      console.warn("[DB_REFRESH] Business data fetch failed.");
      setErrorState("تنبيه: تعذر جلب بعض البيانات من الخادم");
    } finally {
      setIsDbLoading(false);
    }
  }, [currentUser]);

  const login = async (email: string, password: string) => {
    setIsAuthLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setIsAuthLoading(false);
      throw error;
    }
  };

  const logout = async () => {
    setIsAuthLoading(true);
    try {
      await supabase.auth.signOut();
      setCurrentUser(null);
      window.location.href = '/'; 
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
