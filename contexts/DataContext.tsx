
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '../supabaseClient';
import { ProjectSummary, TechnicalRequest, User, UserRole } from '../types';

export const FALLBACK_PROJECTS: ProjectSummary[] = [
  { id: 200, client: "دار وإعمار", name: "سرايا النرجس", title: "سرايا النرجس", status: "active", location: "الرياض", progress: 65, units_count: 1288, electricity_meters: 1200, water_meters: 1288, building_permits: 45, occupancy_certificates: 30, survey_decisions_count: 12 },
  { id: 201, client: "دار وإعمار", name: "النرجس كوميونيتيز", title: "النرجس كوميونيتيز", status: "active", location: "الرياض", progress: 45, units_count: 540, electricity_meters: 400, water_meters: 540, building_permits: 20, occupancy_certificates: 10, survey_decisions_count: 5 },
  { id: 202, client: "دار وإعمار", name: "سرايا الجوان 1", title: "سرايا الجوان 1", status: "active", location: "الرياض", progress: 80, units_count: 936, electricity_meters: 936, water_meters: 936, building_permits: 936, occupancy_certificates: 850, survey_decisions_count: 10 },
  { id: 203, client: "دار وإعمار", name: "سرايا الجوان 2", title: "سرايا الجوان 2", status: "active", location: "الرياض", progress: 30, units_count: 409, electricity_meters: 200, water_meters: 0, building_permits: 409, occupancy_certificates: 0, survey_decisions_count: 8 },
  { id: 204, client: "دار وإعمار", name: "تالا الخزام", title: "تالا الخزام", status: "active", location: "الرياض", progress: 10, units_count: 300, electricity_meters: 0, water_meters: 0, building_permits: 150, occupancy_certificates: 0, survey_decisions_count: 2 },
  { id: 205, client: "دار وإعمار", name: "سرايا الفرسان 1", title: "سرايا الفرسان 1", status: "active", location: "الرياض", progress: 15, units_count: 827, electricity_meters: 100, water_meters: 0, building_permits: 827, occupancy_certificates: 0, survey_decisions_count: 15 },
  { id: 206, client: "دار وإعمار", name: "سرايا الفرسان 2", title: "سرايا الفرسان 2", status: "active", location: "الرياض", progress: 5, units_count: 500, electricity_meters: 0, water_meters: 0, building_permits: 500, occupancy_certificates: 0, survey_decisions_count: 5 },
  { id: 207, client: "دار وإعمار", name: "سرايا هومز", title: "سرايا هومز", status: "active", location: "الرياض", progress: 20, units_count: 120, electricity_meters: 0, water_meters: 0, building_permits: 120, occupancy_certificates: 0, survey_decisions_count: 1 },
  { id: 208, client: "دار وإعمار", name: "برج الجزيرة", title: "برج الجزيرة", status: "active", location: "الرياض", progress: 40, units_count: 1, electricity_meters: 1, water_meters: 1, building_permits: 1, occupancy_certificates: 1, survey_decisions_count: 1 },
  { id: 209, client: "دار وإعمار", name: "سرايا البحيرات", title: "سرايا البحيرات", status: "active", location: "جدة", progress: 25, units_count: 358, electricity_meters: 0, water_meters: 0, building_permits: 358, occupancy_certificates: 0, survey_decisions_count: 4 },
  { id: 210, client: "دار وإعمار", name: "سرايا البدر", title: "سرايا البدر", status: "active", location: "المدينة المنورة", progress: 10, units_count: 23, electricity_meters: 0, water_meters: 0, building_permits: 23, occupancy_certificates: 0, survey_decisions_count: 1 },
  { id: 211, client: "دار وإعمار", name: "تالا السيف", title: "تالا السيف", status: "active", location: "المنطقة الشرقية", progress: 60, units_count: 45, electricity_meters: 45, water_meters: 45, building_permits: 45, occupancy_certificates: 40, survey_decisions_count: 3 },
  { id: 212, client: "دار وإعمار", name: "سرايا الشرق", title: "سرايا الشرق", status: "active", location: "المنطقة الشرقية", progress: 5, units_count: 150, electricity_meters: 0, water_meters: 0, building_permits: 150, occupancy_certificates: 0, survey_decisions_count: 2 },
  { id: 213, client: "دار وإعمار", name: "سرايا البحر", title: "سرايا البحر", status: "active", location: "القطيف", progress: 15, units_count: 88, electricity_meters: 88, water_meters: 88, building_permits: 88, occupancy_certificates: 50, survey_decisions_count: 5 }
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
  const [projects, setProjects] = useState<ProjectSummary[]>(FALLBACK_PROJECTS);
  const [technicalRequests, setTechnicalRequests] = useState<TechnicalRequest[]>([]);
  const [clearanceRequests, setClearanceRequests] = useState<any[]>([]);
  const [appUsers, setAppUsers] = useState<any[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [isDbLoading, setIsDbLoading] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [errorState, setErrorState] = useState<string | null>(null);
  
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const cached = localStorage.getItem('dar_user_v2_cache');
    return cached ? JSON.parse(cached) : null;
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
        supabase.from('projects').select('*').order('id', { ascending: true }),
        supabase.from('technical_requests').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('*'),
        supabase.from('clearance_requests').select('*').order('created_at', { ascending: false })
      ]);

      if (pRes.data && pRes.data.length > 0) {
        setProjects(pRes.data.map(p => ({
          ...p,
          name: p.title || p.name,
          progress: p.progress || 0,
          completedTasks: 0,
          totalTasks: 0
        })));
      } else {
        setProjects(FALLBACK_PROJECTS);
      }

      setTechnicalRequests(trRes.data || []);
      setAppUsers(profilesRes.data || []);
      setClearanceRequests(deedsRes.data || []);
      setErrorState(null);
    } catch (e: any) {
      console.error("Fetch Data Error", e);
      setErrorState("فشل المزامنة - يتم عرض البيانات المحلية");
      setProjects(FALLBACK_PROJECTS);
    } finally {
      setIsDbLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        try {
          const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
          const user: User = {
            id: session.user.id,
            email: session.user.email || '',
            name: profile?.name || session.user.user_metadata?.name || 'موظف دار وإعمار',
            role: session.user.email === 'adaldawsari@darwaemaar.com' ? 'ADMIN' : (profile?.role || 'PR_OFFICER')
          };
          setCurrentUser(user);
          localStorage.setItem('dar_user_v2_cache', JSON.stringify(user));
        } catch {
          const guest: User = { id: session.user.id, email: session.user.email || '', name: 'ضيف', role: 'PR_OFFICER' };
          setCurrentUser(guest);
        }
      }
      setIsAuthLoading(false);
    };
    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    window.location.reload();
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    localStorage.removeItem('dar_user_v2_cache');
    window.location.reload();
  };

  useEffect(() => {
    if (currentUser) refreshData();
  }, [currentUser, refreshData]);

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
