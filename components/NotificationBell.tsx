
import React, { useState } from 'react';
import { Bell, Info, CheckCircle2, AlertCircle } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import { useNavigate } from 'react-router';

/**
 * أيقونة التنبيهات في الهيدر الرئيسي
 */
const NotificationBell: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const navigate = useNavigate();

  const handleNotificationClick = (n: any) => {
    markAsRead(n.id);
    setIsOpen(false);
    // التنقل الذكي (Deep Linking) للرابط المحدد في التنبيه
    if (n.link_url) navigate(n.link_url);
  };

  return (
    <div className="relative font-cairo">
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className={`relative p-2.5 rounded-2xl transition-all duration-300 ${isOpen ? 'bg-orange-50 text-[#E95D22]' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
      >
        <Bell size={22} className={unreadCount > 0 ? "animate-pulse-slow" : ""} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-black flex items-center justify-center rounded-full border-2 border-white shadow-sm">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
          <div className="absolute left-0 mt-4 w-80 bg-white rounded-[25px] shadow-2xl border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 origin-top-left">
            <div className="p-4 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
              <div className="flex items-center gap-2">
                <h3 className="font-black text-[#1B2B48] text-xs">مركز التنبيهات</h3>
                {unreadCount > 0 && <span className="px-1.5 py-0.5 bg-red-100 text-red-600 rounded-md text-[9px] font-black">{unreadCount} جديد</span>}
              </div>
              {unreadCount > 0 && (
                <button onClick={markAllAsRead} className="text-[10px] text-blue-600 font-bold hover:underline">
                  تصفير الكل
                </button>
              )}
            </div>

            <div className="max-h-[450px] overflow-y-auto custom-scrollbar">
              {notifications.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Bell size={28} className="text-gray-200" />
                  </div>
                  <p className="text-xs text-gray-400 font-bold">هدوء تام.. لا توجد تنبيهات</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <div 
                    key={n.id} 
                    onClick={() => handleNotificationClick(n)}
                    className={`p-4 border-b border-gray-50 hover:bg-blue-50/20 transition-all cursor-pointer group flex gap-3 ${!n.is_read ? 'bg-orange-50/30 border-r-4 border-r-[#E95D22]' : ''}`}
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${!n.is_read ? 'bg-[#E95D22]/10 text-[#E95D22]' : 'bg-gray-100 text-gray-400'}`}>
                      {n.message.includes('منجز') ? <CheckCircle2 size={16}/> : n.message.includes('جديد') ? <AlertCircle size={16}/> : <Info size={16} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-[#1B2B48] font-bold leading-relaxed">{n.message}</p>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-[9px] text-gray-400 font-bold">{n.sender_name}</span>
                        <span className="text-[9px] text-gray-400" dir="ltr">{new Date(n.created_at).toLocaleTimeString('ar-SA', {hour:'2-digit', minute:'2-digit'})}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
      
      <style>{`
        .animate-pulse-slow {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: .7; }
        }
      `}</style>
    </div>
  );
};

export default NotificationBell;
