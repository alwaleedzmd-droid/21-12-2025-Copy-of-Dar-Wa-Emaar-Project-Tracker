import { supabase } from '../supabaseClient';

export type UserRole = 'علاقات عامة' | 'القسم الفني' | 'موظف الإفراغات' | 'مدير';

export interface UserPermissions {
  canViewProjects: boolean;
  canEditProjects: boolean;
  canViewReports: boolean;
  canEditReports: boolean;
  canApproveRequests: boolean;
  canManageUsers: boolean;
  canAccessDashboard: boolean;
}

export const rolePermissions: Record<UserRole, UserPermissions> = {
  'علاقات عامة': {
    canViewProjects: true,
    canEditProjects: false,
    canViewReports: true,
    canEditReports: false,
    canApproveRequests: false,
    canManageUsers: false,
    canAccessDashboard: true
  },
  'القسم الفني': {
    canViewProjects: true,
    canEditProjects: true,
    canViewReports: true,
    canEditReports: true,
    canApproveRequests: true,
    canManageUsers: false,
    canAccessDashboard: true
  },
  'موظف الإفراغات': {
    canViewProjects: true,
    canEditProjects: true,
    canViewReports: true,
    canEditReports: true,
    canApproveRequests: true,
    canManageUsers: false,
    canAccessDashboard: true
  },
  'مدير': {
    canViewProjects: true,
    canEditProjects: true,
    canViewReports: true,
    canEditReports: true,
    canApproveRequests: true,
    canManageUsers: true,
    canAccessDashboard: true
  }
};

export const getUserRole = async (email: string): Promise<UserRole | null> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('role')
      .eq('email', email)
      .single();

    if (error) throw error;
    return data?.role as UserRole || null;
  } catch (error) {
    console.error('Error fetching user role:', error);
    return null;
  }
};

export const getUserPermissions = async (email: string): Promise<UserPermissions | null> => {
  const role = await getUserRole(email);
  return role ? rolePermissions[role] : null;
};

export const hasPermission = async (email: string, permission: keyof UserPermissions): Promise<boolean> => {
  const permissions = await getUserPermissions(email);
  return permissions ? permissions[permission] : false;
};

export const createOrUpdateUser = async (
  email: string,
  name: string,
  role: UserRole,
  password?: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // التحقق من وجود المستخدم
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      // تحديث المستخدم الموجود
      const { error: updateError } = await supabase
        .from('users')
        .update({ name, role, updated_at: new Date().toISOString() })
        .eq('email', email);

      if (updateError) throw updateError;
      return { success: true };
    } else {
      // إنشاء مستخدم جديد
      const { error: authError } = await supabase.auth.signUp({
        email,
        password: password || '123456',
        options: {
          data: { name, role }
        }
      });

      if (authError) throw authError;

      // إضافة المستخدم إلى جدول المستخدمين
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          email,
          name,
          role,
          created_at: new Date().toISOString()
        });

      if (insertError) throw insertError;
      return { success: true };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const seedUsersWithRoles = async () => {
  const usersData = [
    // علاقات عامة
    { email: 'malageel@darwaemaar.com', name: 'مساعد العقيل', role: 'علاقات عامة' as UserRole },
    { email: 'ssalyahya@darwaemaar.com', name: 'صالح اليحيي', role: 'علاقات عامة' as UserRole },
    { email: 'maashammari@darwaemaar.com', name: 'محمد الشمري', role: 'علاقات عامة' as UserRole },
    { email: 'malbahri@darwaemaar.com', name: 'محمد البحري', role: 'علاقات عامة' as UserRole },
    // القسم الفني
    { email: 'easalama@darwaemaar.com', name: 'سيد سلامة', role: 'القسم الفني' as UserRole },
    { email: 'emelshity@darwaemaar.com', name: 'اسلام', role: 'القسم الفني' as UserRole },
    { email: 'mbuhaisi@darwaemaar.com', name: 'محمود بحيصي', role: 'القسم الفني' as UserRole },
    { email: 'hmaqel@darwaemaar.com', name: 'حمزة عقيل', role: 'القسم الفني' as UserRole },
    // موظف الإفراغات
    { email: 'saalabdulsalam@darwaemaar.com', name: 'سارة عبدالسلام', role: 'موظف الإفراغات' as UserRole },
    { email: 'taalmalki@darwaemaar.com', name: 'تماني المالكي', role: 'موظف الإفراغات' as UserRole },
    { email: 'smalsanawi@darwaemaar.com', name: 'شذى الصنعاوي', role: 'موظف الإفراغات' as UserRole },
    { email: 'bsalzamaa@darwaemaar.com', name: 'بشرى القحطاني', role: 'موظف الإفراغات' as UserRole },
    { email: 'hmalsenbel@darwaemaar.com', name: 'حسن السنبل', role: 'موظف الإفراغات' as UserRole },
    { email: 'ffalotaibi@darwaemaar.com', name: 'فهد العتيبي', role: 'موظف الإفراغات' as UserRole }
  ];

  const results = [];
  for (const user of usersData) {
    const result = await createOrUpdateUser(user.email, user.name, user.role, '123456');
    results.push({ email: user.email, ...result });
  }

  return results;
};