
import { supabase } from '../supabaseClient';
import { UserRole } from '../types';

/**
 * خدمة إرسال التنبيهات المركزية (Static Service)
 * تم تصميمها لتكون مستقلة تماماً (Decoupled) ليتم استدعاؤها من أي مكان في النظام
 * متوافقة مع هيكل جدول notifications في Supabase:
 * id (uuid), created_at (timestamptz), user_id (uuid), title (text), message (text)
 */
export const notificationService = {
  /**
   * إرسال تنبيه جديد لجهة محددة
   * @param targetRole الدور المستهدف (ADMIN, PR_MANAGER, etc.)
   * @param message نص الرسالة
   * @param linkUrl الرابط الذي يوجه إليه التنبيه عند النقر
   * @param senderName اسم المرسل (اختياري)
   */
  send: async (
    targetRole: UserRole,
    message: string,
    linkUrl: string = '/',
    senderName: string = 'نظام دار وإعمار'
  ) => {
    try {
      // جلب المستخدمين المستهدفين حسب الدور من جدول profiles
      const { data: targetUsers } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('role', targetRole);

      if (targetUsers && targetUsers.length > 0) {
        // إرسال إشعار لكل مستخدم بالدور المطلوب
        const notifications = targetUsers.map(user => ({
          user_id: user.id,
          title: `${senderName} | ${linkUrl}`,
          message: message,
          created_at: new Date().toISOString()
        }));

        const { error } = await supabase
          .from('notifications')
          .insert(notifications);

        if (error && error.code !== '42P01') {
          console.warn('Notification Insert Error:', error.message);
        }
      } else {
        // إذا لم يوجد مستخدمون بالدور، إرسال بدون user_id
        const { error } = await supabase
          .from('notifications')
          .insert([{
            title: `${senderName} → ${targetRole}`,
            message: message,
            created_at: new Date().toISOString()
          }]);

        if (error && error.code !== '42P01' && error.code !== '23502') {
          console.warn('Notification Bridge Error:', error.message);
        }
      }
    } catch (err) {
      // ضمان عدم تعطيل العمليات الرئيسية في حال فشل خدمة التنبيهات
      console.warn('Notification Service is currently unavailable.');
    }
  }
};
