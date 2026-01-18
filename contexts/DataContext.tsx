
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
   * RECURSION-PROOF Profile Fetcher (The Brain)
   * Immediately assigns ADMIN role for the master email to bypass RLS policy loops and prevent 403 flashes.
   */
  const fetchProfile = useCallback(async (userId: string, email: string) => {
    console.log(`[AUTH_STRICT] Profile Syncing... UID: ${userId} | EMAIL: ${email}`);
    setIsAuthLoading(true);

    // 1. INSTANT ADMIN BYPASS: 
    // We don't wait for the DB if it's the master email. This kills the "403 flash" instantly.
    if (email === ADMIN_EMAIL) {
      console.log("[AUTH_STRICT] Master Admin detected. applying instant bypass.");
      setCurrentUser({
        id: userId,
        email: email,
        name: 'الوليد الدوسري',
        role: 'ADMIN' as UserRole,
        department: 'الإدارة العليا'
      });
      setIsAuthLoading(false);
      
      // We still try to sync in background, but the UI is already unlocked.
      try {
        const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
        if (data) setCurrentUser(prev => ({ ...prev, ...data } as User));
      } catch (err) {
        console.warn("[AUTH_STRICT] Background sync failed (likely recursion), keeping local bypass state.");
      }
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        console.log("[AUTH_STRICT] Profile resolved successfully. Role:", data.role);
        setCurrentUser(data as User);
      } else {
        // Fallback for new auth users
        setCurrentUser({
          id: userId,
          email: email,
          name: email ? email.split('@')[0] : 'ضيف',
          role: 'GUEST' as UserRole,
          department: 'غير محدد'
        });
      }
    } catch (err: any) {
      console.error("[AUTH_STRICT] Sync Error:", err?.message || err);
      setCurrentUser(null);
    } finally {
      setIsAuthLoading(false);
    }
  }, []);

  const forceRefreshProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await fetchProfile(session.user.id, session.user.email || '');
    } else {
      setIsAuthLoading(false);
    }
  };

  /**
   * SAFETY TIMEOUT (15 Seconds)
   */
  useEffect(() => {
    if (isAuthLoading) {
      const timer = setTimeout(() => {
        if (isAuthLoading) {
          console.warn("[AUTH_STRICT] Safety timeout (15s) reached.");
          setIsAuthLoading(false);
        }
      }, 15000);
      return () => clearTimeout(timer);
    }
  }, [isAuthLoading]);

  useEffect(() => {
    const sync = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await fetchProfile(session.user.id, session.user.email || '');
      } else {
        setIsAuthLoading(false);
      }
    };

    sync();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          setIsAuthLoading(true);
          await fetchProfile(session.user.id, session.user.email || '');
        }
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        setIsAuthLoading(false);
        localStorage.clear();
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const refreshData = useCallback(async () => {
    if (!currentUser || currentUser.role === 'GUEST') return;
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
      console.error("[DATA_SYNC] Global refresh failed:", e?.message);
      setErrorState("تنبيه: تعذر مزامنة بيانات النظام.");
    } finally {
      setIsDbLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) refreshData();
  }, [currentUser, refreshData]);

  return (
    <DataContext.Provider value={{
      projects, technicalRequests, clearanceRequests, projectWorks, appUsers, activities, 
      currentUser, isDbLoading, isAuthLoading, errorState,
      login: async (email, password) => {
        setIsAuthLoading(true);
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) { setIsAuthLoading(false); throw error; }
      },
      logout: async () => { 
        setIsAuthLoading(true); 
        await supabase.auth.signOut(); 
        setCurrentUser(null);
        setIsAuthLoading(false);
      },
      refreshData,
      forceRefreshProfile,
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
