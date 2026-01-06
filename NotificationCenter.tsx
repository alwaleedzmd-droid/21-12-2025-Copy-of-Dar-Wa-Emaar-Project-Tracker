
import React, { useState, useEffect } from 'react';
import { Bell, Check, Trash2, X } from 'lucide-react';
// إصلاح المسار: تم تغيير من '../supabaseClient' إلى './supabaseClient' لأن الملف في نفس المجلد
import { supabase } from './supabaseClient';

const NotificationCenter = () => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  // جلب الإشعارات
  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        // إذا كان الخطأ متعلقاً بعدم وجود الجدول، لا نلقي استثناءً لتجنب إزعاج المستخدم
        if (error.code === '42P01') {
          console.warn("إشعار النظام: جدول الإشعارات غير موجود حالياً في قاعدة البيانات.");
          return;
        }
        throw error;
      }

      if (data) {
        setNotifications(data);
        setUnreadCount(data.filter(n => !n.is_read).length);
      }
    } catch (err: any) {
      // إصلاح خطأ [object Object] عبر استخراج الرسالة النصية للخطأ
      console.error("Error fetching notifications:", err.message || err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // تفعيل التحديث التلقائي كل 15 ثانية (تقليل الضغط)
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, []);

  // تحديد الكل كمقروء
  const markAllRead = async () => {
    try {
      const { error } = await supabase.from('notifications').update({ is_read: true }).eq('is_read', false);
      if (error) throw error;
      fetchNotifications();
    } catch (err: any) {
      console.error("Error marking as read:", err.message || err);
    }
  };

  return (
    <div className="relative">
      {/* أيقونة الجرس */}
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="relative p-2 bg-white rounded-full shadow-sm hover:bg-gray-50 transition-all border border-gray-100"
      >
        <Bell size={20} className="text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white">
            {unreadCount > 9 ? '+9' : unreadCount}
          </span>
        )}
      </button>

      {/* القائمة المنسدلة */}
      {isOpen && (
        <div className="absolute left-0 mt-3 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
          
          {/* الرأس */}
          <div className="p-4 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
            <h3 className="font-bold text-[#1B2B48] text-sm">الإشعارات</h3>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-[10px] text-blue-600 font-bold hover:underline flex items-center gap-1">
                <Check size={12}/> تحديد كمقروء
              </button>
            )}
          </div>

          {/* القائمة */}
          <div className="max-h-80 overflow-y-auto custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-xs font-bold">
                لا توجد إشعارات جديدة
              </div>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className={`p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors ${!n.is_read ? 'bg-blue-50/30' : ''}`}>
                  <div className="flex justify-between items-start mb-1">
                     <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${n.type === 'new_request' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                        {n.type === 'new_request' ? 'طلب جديد' : 'تحديث'}
                     </span>
                     <span className="text-[9px] text-gray-400" dir="ltr">
                        {new Date(n.created_at).toLocaleTimeString('ar-SA', {hour:'2-digit', minute:'2-digit'})}
                     </span>
                  </div>
                  <p className="text-xs text-gray-600 font-bold leading-relaxed">{n.message}</p>
                  <p className="text-[9px] text-gray-400 mt-1">بواسطة: {n.created_by}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
      
      {/* غطاء لإغلاق القائمة عند الضغط خارجها */}
      {isOpen && <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>}
    </div>
  );
};

export default NotificationCenter;
