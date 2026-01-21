import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '../supabaseClient';
import { ProjectSummary, TechnicalRequest, User, UserRole, ProjectWork } from '../types';

interface DataContextType {
  projects: ProjectSummary[];
  technicalRequests: TechnicalRequest[];
  clearanceRequests: any[];
  projectWorks: ProjectWork[];
  currentUser: User | null;
  isDbLoading: boolean;
  isAuthLoading: boolean;
  login: (email: string, password: string) => Promise<any>;
  logout: () => Promise<void>;
  refreshData: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);
const ADMIN_EMAIL = 'adaldawsari@darwaemaar.com';

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [technicalRequests, setTechnicalRequests] = useState<TechnicalRequest[]>([]);
  const [clearanceRequests, setClearanceRequests] = useState<any[]>([]);
  const [projectWorks, setProjectWorks] = useState<ProjectWork[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isDbLoading, setIsDbLoading] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const refreshData = useCallback(async () => {
    if (!currentUser) return;
    setIsDbLoading(true);
    try {
      const [pRes, trRes, drRes, pwRes] = await Promise.all([
        supabase.from('projects').select('*').order('id', { ascending: true }),
        supabase.from('technical_requests').select('*').order('created_at', { ascending: false }),
        supabase.from('deeds_requests').select('*').order('created_at', { ascending: false }),
        supabase.from('project_works').select('*').order('created_at', { ascending: false })
      ]);
      setProjects(pRes.data?.map(p => ({ ...p, name: p.name || p.title || 'مشروع' })) || []);
      setTechnicalRequests(trRes.data || []);
      setClearanceRequests(drRes.data || []);
      setProjectWorks(pwRes.data || []);
    } catch (e) { console.error("Data error:", e); } finally { setIsDbLoading(false); }
  }, [currentUser]);

  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        if (session.user.email === ADMIN_EMAIL) {
          setCurrentUser({ id: session.user.id, email: session.user.email, name: 'الوليد الدوسري', role: 'ADMIN' });
        } else {
          // جلب الملف الشخصي حصراً للموظف المسجل
          const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
          if (profile) {
            setCurrentUser(profile);
          } else {
            // طرد أي حساب غريب غير مسجل في جدول الـ profiles
            await supabase.auth.signOut();
            setCurrentUser(null);
          }
        }
      }
      setIsAuthLoading(false);
    };
    initAuth();
  }, []);

  useEffect(() => { if (currentUser) refreshData(); }, [currentUser, refreshData]);

  const login = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    window.location.href = '/';
  };

  return (
    <DataContext.Provider value={{
      projects, technicalRequests, clearanceRequests, projectWorks,
      currentUser, isDbLoading, isAuthLoading, login, logout, refreshData
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within DataProvider');
  return context;
};