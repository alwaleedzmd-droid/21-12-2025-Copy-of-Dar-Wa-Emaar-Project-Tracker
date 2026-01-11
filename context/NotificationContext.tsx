
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../supabaseClient';
import { useData } from '../contexts/DataContext';

interface Notification {
  id: string;
  created_at: string;
  message: string;
  link_url: string;
  is_read: boolean;
  sender_name: string;
  recipient_role: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  fetchNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

/**
 * موفر خدمة التنبيهات: يدير الحالة والاشتراكات اللحظية
 */
export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { currentUser } = useData();

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const fetchNotifications = async () => {
    if (!currentUser) return;
    try {
      // جلب آخر 20 تنبيه يخص دور المستخدم الحالي أو موجه للمدراء
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .or(`recipient_role.eq.${currentUser.role},recipient_role.eq.ADMIN`)
        .order('created_at', { ascending: false })
        .limit(20);

      if (!error && data) setNotifications(data);
    } catch (err) {
      console.warn('Failed to fetch initial notifications.');
    }
  };

  useEffect(() => {
    if (!currentUser) return;

    fetchNotifications();

    // الاشتراك اللحظي في قناة التنبيهات
    const channel = supabase
      .channel(`realtime-notifications-${currentUser.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications'
        },
        (payload) => {
          const newNotif = payload.new as Notification;
          
          // الفلترة الذكية: التأكد من أن التنبيه موجه لهذا المستخدم أو هو مدير نظام
          if (newNotif.recipient_role === currentUser.role || currentUser.role === 'ADMIN') {
            setNotifications(prev => [newNotif, ...prev]);
            
            // تشغيل صوت تنبيه خفيف
            try {
              const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3');
              audio.volume = 0.4;
              audio.play();
            } catch(e) {
              console.log('Audio playback blocked');
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser]);

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);

      if (!error) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      }
    } catch (err) {}
  };

  const markAllAsRead = async () => {
    if (!currentUser) return;
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('recipient_role', currentUser.role);

      if (!error) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      }
    } catch (err) {}
  };

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, markAllAsRead, fetchNotifications }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications must be used within NotificationProvider');
  return context;
};
