
import { supabase } from '../supabaseClient';
import { UserRole } from '../types';

/**
 * خدمة إرسال التنبيهات المركزية (Static Service)
 * تفشل بصمت ولا تؤثر على العمليات الأساسية
 */
export const notificationService = {
  send: async (
    targetRole: UserRole | UserRole[],
    message: string,
    linkUrl: string = '/',
    senderName: string = 'نظام دار وإعمار'
  ) => {
    try {
      const roles = Array.isArray(targetRole) ? targetRole : [targetRole];

      const notifications = roles.map(role => ({
        title: senderName,
        message: message,
        link: linkUrl,
        target_role: role,
        is_read: false,
        created_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('notifications')
        .insert(notifications);

      if (error) {
        console.warn('⚠️ Notification Insert Error (ignored):', error.message);
      }
    } catch (err) {
      // تفشل بصمت - لا تؤثر على العملية الأساسية
      console.warn('⚠️ Notification Service unavailable (ignored)');
    }
  }
};
