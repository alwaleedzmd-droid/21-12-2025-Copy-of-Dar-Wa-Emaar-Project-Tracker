import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Bell, CheckCircle2, Info } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useData } from '../contexts/DataContext';

const NotificationBell = () => {
  const { currentUser } = useData();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unreadCount = notifications.filter(n => !n.is_read).length;

  const fetchNotifications = useCallback(async () => {
    if (!currentUser) return;
    try {
      const isDemoUser = currentUser.id?.startsWith('demo-');
      let query = supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(15);

      // جلب الإشعارات الموجهة لدور المستخدم فقط
      if (currentUser.role) {
        query = query.eq('target_role', currentUser.role);
      }

      const { data, error } = await query;
      if (error) {
        if (error.code !== '42P01' && error.code !== 'PGRST116') {
          console.warn('خطأ جلب الإشعارات:', error.message);
        }
        return;
      }
      if (data) setNotifications(data);
    } catch (err) {
      console.warn('خدمة الإشعارات غير متاحة حالياً');
    }
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;

    fetchNotifications();

    // الاشتراك في التنبيهات اللحظية (Real-time) مع فلتر حسب الدور
    const channel = supabase
      .channel('realtime_notifications')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'notifications',
        filter: `target_role=eq.${currentUser.role}`
      }, (payload) => {
        const newNotif = payload.new as any;
        // منع التكرار: تجاهل الإشعار إذا كان موجوداً مسبقاً
        setNotifications(prev => {
          if (prev.some(n => n.id === newNotif.id)) return prev;
          return [newNotif, ...prev];
        });
        try {
          new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play().catch(() => {});
        } catch {} 
      })
      .subscribe();

    // تحديث دوري كل 30 ثانية
    const interval = setInterval(fetchNotifications, 30000);

    return () => { 
      supabase.removeChannel(channel); 
      clearInterval(interval);
    };
  }, [currentUser, fetchNotifications]);

  const markAsRead = async () => {
    if (unreadCount === 0) return;
    try {
      // تحديث فقط الإشعارات الموجهة لدور هذا المستخدم
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('target_role', currentUser?.role)
        .eq('is_read', false);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.warn('خطأ تحديث حالة الإشعارات:', err);
    }
  };

  // إغلاق تلقائي عند خروج الماوس
  const handleMouseEnter = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const handleMouseLeave = () => {
    if (isOpen) {
      closeTimerRef.current = setTimeout(() => {
        setIsOpen(false);
      }, 400);
    }
  };

  // تنظيف المؤقت عند إلغاء المكون
  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  return (
    <div className="relative" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} ref={panelRef}>
      <button onClick={() => { setIsOpen(!isOpen); if (!isOpen) markAsRead(); }} className="relative p-2.5 text-gray-400 hover:bg-gray-100 rounded-2xl transition-all active:scale-95">
        <Bell size={24} />
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2 w-5 h-5 bg-[#E95D22] text-white text-[10px] font-black rounded-full border-2 border-white flex items-center justify-center animate-bounce">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-4 w-80 bg-white rounded-3xl shadow-2xl border border-gray-100 z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="p-4 border-b flex justify-between items-center bg-gray-50/50">
            <h3 className="font-black text-sm text-[#1B2B48]">الإشعارات</h3>
            <span className="text-[10px] font-bold text-gray-400">آخر 15 تنبيه</span>
          </div>
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-10 text-center text-gray-300">
                <Info size={40} className="mx-auto mb-2 opacity-20" />
                <p className="text-xs font-bold">لا يوجد إشعارات حالياً</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className={`p-4 border-b last:border-0 hover:bg-gray-50 transition-colors flex gap-3 ${!n.is_read ? 'bg-orange-50/30' : ''}`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${n.type === 'PROJECT' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
                    {n.type === 'PROJECT' ? <CheckCircle2 size={18} /> : <Info size={18} />}
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-[#1B2B48]">{n.title}</p>
                    <p className="text-[11px] text-gray-500 font-bold mt-1 line-clamp-2">{n.message}</p>
                    <p className="text-[9px] text-gray-400 mt-2">{new Date(n.created_at).toLocaleTimeString('ar-SA')}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;