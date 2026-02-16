
import { supabase } from '../supabaseClient';
import { UserRole } from '../types';

/**
 * خدمة إرسال التنبيهات المركزية (Static Service)
 * تفشل بصمت ولا تؤثر على العمليات الأساسية
 * تمنع التكرار خلال فترة زمنية قصيرة
 */

// تتبع الإشعارات المرسلة مؤخراً لمنع التكرار
const recentNotifications = new Map<string, number>();
const DEDUP_WINDOW_MS = 10000; // 10 ثوانٍ

export const notificationService = {
  send: async (
    targetRole: UserRole | UserRole[],
    message: string,
    linkUrl: string = '/',
    senderName: string = 'نظام دار وإعمار'
  ) => {
    try {
      const roles = Array.isArray(targetRole) ? targetRole : [targetRole];

      // إزالة التكرار: مفتاح فريد = الرسالة + الأدوار
      const dedupKey = `${message}_${roles.sort().join(',')}`;
      const now = Date.now();
      const lastSent = recentNotifications.get(dedupKey);
      if (lastSent && (now - lastSent) < DEDUP_WINDOW_MS) {
        console.log('⏳ تم تجاهل إشعار مكرر:', message);
        return;
      }
      recentNotifications.set(dedupKey, now);

      // تنظيف المفاتيح القديمة
      for (const [key, time] of recentNotifications) {
        if (now - time > DEDUP_WINDOW_MS * 3) recentNotifications.delete(key);
      }

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
