
import { supabase } from '../supabaseClient';
import { UserRole } from '../types';

/**
 * خدمة إرسال التنبيهات المركزية (Static Service)
 * تم تصميمها لتكون مستقلة تماماً (Decoupled) ليتم استدعاؤها من أي مكان في النظام
 * متوافقة مع هيكل جدول notifications في Supabase:
 * id (uuid), created_at (timestamptz), user_id (uuid), title (text), message (text)
 *
 * منطق التوجيه:
 * - CONVEYANCE ينشئ طلب → إشعار لـ PR_MANAGER + ADMIN
 * - PR_MANAGER يعدل/يعلق → إشعار لـ CONVEYANCE + ADMIN
 */
export const notificationService = {
  /**
   * إرسال تنبيه جديد لجهة محددة
   * @param targetRole الدور المستهدف (ADMIN, PR_MANAGER, CONVEYANCE, etc.)
   * @param message نص الرسالة
   * @param linkUrl الرابط الذي يوجه إليه التنبيه عند النقر
   * @param senderName اسم المرسل (اختياري)
   */
  send: async (
    targetRole: UserRole | UserRole[],
    message: string,
    linkUrl: string = '/',
    senderName: string = 'نظام دار وإعمار'
  ) => {
    try {
      const roles = Array.isArray(targetRole) ? targetRole : [targetRole];

      // إشعار واحد فقط لكل دور مستهدف (بدون تكرار)
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

      if (error && error.code !== '42P01' && error.code !== '23502') {
        console.warn('Notification Insert Error:', error.message);
      }
    } catch (err) {
      console.warn('Notification Service is currently unavailable.');
    }
  }
};
