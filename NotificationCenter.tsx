
import React, { useState, useEffect } from 'react';
import { Bell, Check, WifiOff } from 'lucide-react';
import { supabase } from './supabaseClient';

const NotificationCenter = () => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        if (error.code === 'PGRST116' || error.code === '42P01') return; // جدول غير موجود أو فارغ
        throw error;
      }

      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.is_read).length || 0);
      setIsOffline(false);
    } catch (err: any) {
      // معالجة خطأ TypeError: Failed to fetch
      if (err instanceof TypeError || err.message?.includes('fetch')) {
        setIsOffline(true);
        console.warn("Notification Service: Network connection unavailable or Supabase project paused.");
      } else {
        console.error("Notification Error:", err.message || "Unknown error");
      }
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // تحديث كل 30 ثانية لتقليل الضغط
    return () => clearInterval(interval);
  }, []);

  const markAllRead = async () => {
    try {
      await supabase.from('notifications').update({ is_read: true }).eq('is_read', false);
      fetchNotifications();
    } catch (err) {}
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="relative p-2 bg-white rounded-full shadow-sm hover:bg-gray-50 transition-all border border-gray-100"
      >
        <Bell size={20} className={isOffline ? "text-gray-300" : "text-gray-600"} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white">
            {unreadCount}
          </span>
        )}
        {isOffline && (
          <span className="absolute -bottom-1 -left-1 text-orange-500 bg-white rounded-full">
            <WifiOff size={10} />
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-3 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
          <div className="p-4 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
            <h3 className="font-bold text-[#1B2B48] text-sm">الإشعارات</h3>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-[10px] text-blue-600 font-bold hover:underline">
                تحديد الكل كمقروء
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto custom-scrollbar">
            {isOffline ? (
              <div className="p-8 text-center text-gray-400 text-xs font-bold">
                تعذر الاتصال بخدمة الإشعارات حالياً
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-xs font-bold">
                لا توجد إشعارات جديدة
              </div>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className={`p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors ${!n.is_read ? 'bg-blue-50/30' : ''}`}>
                  <p className="text-xs text-gray-600 font-bold leading-relaxed">{n.message}</p>
                  <span className="text-[9px] text-gray-400 mt-1 block">
                    {new Date(n.created_at).toLocaleTimeString('ar-SA')}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
      {isOpen && <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>}
    </div>
  );
};

export default NotificationCenter;
