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
  refreshData: () => Promise<void>;
  logout: () => Promise<void>;
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

      setProjects(pRes.data?.map(p => ({ ...p, name: p.name || p.title || 'مشروع بدون اسم' })) || []);
      setTechnicalRequests(trRes.data || []);
      setClearanceRequests(drRes.data || []);
      setProjectWorks(pwRes.data || []);
    } catch (e) { console.error("Error fetching data", e); }
    finally { setIsDbLoading(false); }
  }, [currentUser]);

  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setCurrentUser({ id: session.user.id, email: session.user.email || '', name: 'الوليد الدوسري', role: 'ADMIN' as UserRole });
      }
      setIsAuthLoading(false);
    };
    initAuth();
  }, []);

  useEffect(() => { if (currentUser) refreshData(); }, [currentUser, refreshData]);

  return (
    <DataContext.Provider value={{
      projects, technicalRequests, clearanceRequests, projectWorks, currentUser, isDbLoading, isAuthLoading, refreshData,
      logout: async () => { await supabase.auth.signOut(); setCurrentUser(null); window.location.href = '/'; }
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