
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { ProjectSummary, TechnicalRequest, User, UserRole } from '../types';

export const FALLBACK_PROJECTS: ProjectSummary[] = [
  { id: 101, client: "دار وإعمار", title: "مشروع تالا الشرق", name: "تالا الشرق", status: "نشط", location: "الرياض", progress: 65, totalTasks: 12, completedTasks: 8, details: { unitsCount: 120, electricityMetersCount: 120, waterMetersCount: 120 }, image_url: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&q=80&w=1000" },
  { id: 102, client: "دار وإعمار", title: "مشروع سرايا الجوان", name: "سرايا الجوان", status: "نشط", location: "الرياض", progress: 40, totalTasks: 20, completedTasks: 5, details: { unitsCount: 350, electricityMetersCount: 350, waterMetersCount: 350 }, image_url: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=1000" }
];

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
  const [appUsers, setAppUsers] = useState<any[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [isDbLoading, setIsDbLoading] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [errorState, setErrorState] = useState<string | null>(null);
  
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const cached = localStorage.getItem('dar_user_v2_cache');
      return cached ? JSON.parse(cached) : null;
    } catch { return null; }
  });

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

  const canAccess = (allowedRoles: UserRole[]) => {
    return !!currentUser && allowedRoles.includes(currentUser.role);
  };

  const refreshData = useCallback(async () => {
    if (!currentUser) return;
    setIsDbLoading(true);
    try {
      const [pRes, trRes, profilesRes, deedsRes] = await Promise.all([
        supabase.from('projects').select('*').order('created_at', { ascending: false }),
        supabase.from('technical_requests').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('*'),
        supabase.from('deeds_requests').select('*').order('created_at', { ascending: false })
      ]);

      if (pRes.error) throw pRes.error;

      setProjects(pRes.data && pRes.data.length > 0 ? pRes.data.map(p => ({
        ...p,
        name: p.title || p.name || p.client,
        progress: p.progress || 0,
        completedTasks: 0,
        totalTasks: 0
      })) : FALLBACK_PROJECTS);

      setTechnicalRequests(trRes.data || []);
      setAppUsers(profilesRes.data || []);
      setClearanceRequests(deedsRes.data || []);
      setErrorState(null);
    } catch (e: any) {
      console.error("Fetch Data Error", e);
      setErrorState("فشل المزامنة - يتم عرض البيانات المحلية");
      if (projects.length === 0) setProjects(FALLBACK_PROJECTS);
    } finally {
      setIsDbLoading(false);
    }
  }, [currentUser, projects.length]);

  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        const user: User = {
          id: session.user.id,
          email: session.user.email || '',
          name: profile?.name || 'موظف دار وإعمار',
          role: session.user.email === 'adaldawsari@darwaemaar.com' ? 'ADMIN' : (profile?.role || 'PR_OFFICER')
        };
        setCurrentUser(user);
        localStorage.setItem('dar_user_v2_cache', JSON.stringify(user));
      }
      setIsAuthLoading(false);
    };
    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session) {
        setCurrentUser(null);
        localStorage.removeItem('dar_user_v2_cache');
      } else {
        initAuth();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (currentUser) refreshData();
  }, [currentUser, refreshData]);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <DataContext.Provider value={{
      projects, technicalRequests, clearanceRequests, appUsers, activities, 
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
