
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

      // جلب المستخدمين المستهدفين حسب الأدوار من جدول profiles
      const { data: targetUsers } = await supabase
        .from('profiles')
        .select('id, role')
        .in('role', roles);

      if (targetUsers && targetUsers.length > 0) {
        // إرسال إشعار لكل مستخدم بالدور المطلوب
        const notifications = targetUsers.map(user => ({
          user_id: user.id,
          title: senderName,
          message: message,
          link: linkUrl,
          target_role: user.role,
          is_read: false,
          created_at: new Date().toISOString()
        }));

        const { error } = await supabase
          .from('notifications')
          .insert(notifications);

        if (error && error.code !== '42P01') {
          console.warn('Notification Insert Error:', error.message);
        }
      }

      // دائماً إنشاء إشعار عام (بدون user_id) حتى يظهر للمستخدمين التجريبيين (Demo)
      const generalNotifications = roles.map(role => ({
        title: senderName,
        message: message,
        link: linkUrl,
        target_role: role,
        is_read: false,
        created_at: new Date().toISOString()
      }));

      const { error: genError } = await supabase
        .from('notifications')
        .insert(generalNotifications);

      if (genError && genError.code !== '42P01' && genError.code !== '23502') {
        console.warn('Notification General Error:', genError.message);
      }
    } catch (err) {
      // ضمان عدم تعطيل العمليات الرئيسية في حال فشل خدمة التنبيهات
      console.warn('Notification Service is currently unavailable.');
    }
  }
};
