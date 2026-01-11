
import { supabase } from '../supabaseClient';
import { UserRole } from '../types';

/**
 * خدمة إرسال التنبيهات المركزية (Static Service)
 * تم تصميمها لتكون مستقلة تماماً (Decoupled) ليتم استدعاؤها من أي مكان في النظام
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
      // إرسال البيانات مباشرة لجدول التنبيهات
      const { error } = await supabase
        .from('notifications')
        .insert([{
          recipient_role: targetRole,
          message,
          link_url: linkUrl,
          sender_name: senderName,
          is_read: false,
          created_at: new Date().toISOString()
        }]);

      if (error) {
        // الفشل الصامت في حال عدم وجود الجدول أو مشاكل الشبكة
        if (error.code !== '42P01') {
          console.warn('Notification Bridge Error:', error.message);
        }
      }
    } catch (err) {
      // ضمان عدم تعطيل العمليات الرئيسية في حال فشل خدمة التنبيهات
      console.warn('Notification Service is currently unavailable.');
    }
  }
};
