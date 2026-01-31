import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { UserRole, UserPermissions, rolePermissions, getUserRole } from '../services/roleService';

interface AuthContextType {
  user: any;
  role: UserRole | null;
  permissions: UserPermissions | null;
  loading: boolean;
  logout: () => Promise<void>;
  hasPermission: (permission: keyof UserPermissions) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        
        if (currentUser) {
          setUser(currentUser);
          const userRole = await getUserRole(currentUser.email || '');
          setRole(userRole);
          setPermissions(userRole ? rolePermissions[userRole] : null);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);
        const userRole = await getUserRole(session.user.email || '');
        setRole(userRole);
        setPermissions(userRole ? rolePermissions[userRole] : null);
      } else {
        setUser(null);
        setRole(null);
        setPermissions(null);
      }
    });

    return () => subscription?.unsubscribe();
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setRole(null);
    setPermissions(null);
  };

  const hasPermission = (permission: keyof UserPermissions): boolean => {
    return permissions?.[permission] ?? false;
  };

  return (
    <AuthContext.Provider value={{ user, role, permissions, loading, logout, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};