/**
 * AIAssistant - المساعد الذكي الاستباقي (Proactive AI Analyst)
 * ============================================================================
 * محلل مخاطر واستشاري إداري يقرأ من DataContext ويقدم:
 *  - ملخص قيادة تلقائي للمدير عند الفتح
 *  - تحليل عنق الزجاجة واكتشاف التأخيرات
 *  - التنبؤ بتأخير المشاريع
 *  - تقارير أداء الموظفين
 *  - ذاكرة تراكمية لكل موضوع
 *  - إشعارات استباقية
 * ============================================================================
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  X, ArrowUpLeft, Send,
  AlertTriangle, TrendingUp, Users, Shield,
  Brain, Zap, FileText
} from 'lucide-react';
import {
  processSmartQuery,
  generateExecutiveSummary,
  formatExecutiveSummary,
  analyzeBottlenecks,
  runComprehensiveAnalysis,
  formatComprehensiveAnalysis,
} from '../services/aiAnalysisEngine';
import { notificationService } from '../services/notificationService';
import { supabase } from '../supabaseClient';

interface AIAssistantProps {
  currentUser: any;
  onNavigate: (type: string, data: any) => void;
  projects: any[];
  technicalRequests: any[];
  clearanceRequests: any[];
  projectWorks: any[];
  appUsers?: any[];
}

interface ChatMessage {
  id: number;
  text: string;
  sender: 'bot' | 'user';
  time: string;
  actions?: Array<{ label: string; type: string; data: any }>;
  alertLevel?: 'critical' | 'warning' | 'info';
}

const AIAssistant: React.FC<AIAssistantProps> = ({
  currentUser,
  onNavigate,
  projects = [],
  technicalRequests = [],
  clearanceRequests = [],
  projectWorks = [],
  appUsers = []
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [hasShownSummary, setHasShownSummary] = useState(false);
  const [alertBadge, setAlertBadge] = useState(0);
  const [workComments, setWorkComments] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastProactiveCheck = useRef<number>(0);
  const commentsLoaded = useRef(false);

  const timeNow = () => new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });

  const isAdmin = currentUser?.role === 'ADMIN';
  const isPRManager = currentUser?.role === 'PR_MANAGER';

  // ============================================================================
  //  جلب التعليقات من قاعدة البيانات (لتحليل المعالجين)
  // ============================================================================

  useEffect(() => {
    if (!isOpen || commentsLoaded.current) return;
    const fetchComments = async () => {
      try {
        const { data } = await supabase
          .from('work_comments')
          .select('*')
          .order('created_at', { ascending: true });
        if (data) {
          setWorkComments(data);
        }
      } catch { /* تعليقات غير متوفرة */ }
      commentsLoaded.current = true;
    };
    fetchComments();
  }, [isOpen]);

  // ============================================================================
  //  التحليل الاستباقي - الفحص التلقائي عند تحميل البيانات
  // ============================================================================

  const proactiveAlerts = useMemo(() => {
    if (!technicalRequests.length && !clearanceRequests.length) return [];
    return analyzeBottlenecks(technicalRequests, clearanceRequests, projectWorks, projects);
  }, [technicalRequests, clearanceRequests, projectWorks, projects]);

  // تحديث بادج التنبيهات (يشمل التأخيرات + المواعيد المنتهية)
  useEffect(() => {
    const criticalCount = proactiveAlerts.filter(a => a.severity === 'critical').length;
    // إضافة أعمال متأخرة عن الموعد النهائي
    let overdueCount = 0;
    try {
      const now = new Date();
      (projectWorks || []).forEach((w: any) => {
        if (w.expected_completion_date && !['completed', 'منجز', 'مكتمل'].includes(w.status?.toLowerCase?.())) {
          if (new Date(w.expected_completion_date) < now) overdueCount++;
        }
      });
    } catch { /* تجاهل */ }
    setAlertBadge(criticalCount + overdueCount);
  }, [proactiveAlerts, projectWorks]);

  // إرسال إشعارات استباقية للموظفين عند اكتشاف تأخير حرج (مرة واحدة كل 6 ساعات)
  useEffect(() => {
    const now = Date.now();
    const SIX_HOURS = 6 * 60 * 60 * 1000;
    if (now - lastProactiveCheck.current < SIX_HOURS) return;

    const criticalAlerts = proactiveAlerts.filter(a => a.severity === 'critical');
    if (criticalAlerts.length > 0 && isAdmin) {
      lastProactiveCheck.current = now;

      // إشعار المدير
      notificationService.send(
        'ADMIN',
        `🔴 تنبيه: ${criticalAlerts.length} طلبات متأخرة بشكل حرج (تجاوزت 96 ساعة)`,
        '/technical',
        'المحلل الذكي'
      );

      // إشعار الموظفين المعنيين
      const assignees = new Set(criticalAlerts.map(a => a.assignedTo));
      assignees.forEach(assignee => {
        const alerts = criticalAlerts.filter(a => a.assignedTo === assignee);
        notificationService.send(
          ['PR_MANAGER', 'TECHNICAL'],
          `⚠️ ${assignee}: لديك ${alerts.length} طلبات متأخرة تحتاج تحديث عاجل`,
          '/technical',
          'المحلل الذكي'
        );
      });
    }
  }, [proactiveAlerts, isAdmin]);

  // ============================================================================
  //  عند فتح المساعد - ملخص القيادة التلقائي
  // ============================================================================

  useEffect(() => {
    if (!isOpen || hasShownSummary || !currentUser) return;

    const welcomeMsg: ChatMessage = {
      id: Date.now(),
      text: getWelcomeMessage(),
      sender: 'bot',
      time: timeNow()
    };
    setMessages([welcomeMsg]);

    // ملخص القيادة للمدير — ننتظر تحميل التعليقات أولاً
    if (isAdmin || isPRManager) {
      setIsTyping(true);
      const runSummary = () => {
        // جلب التعليقات من DB إذا لم تُحمَّل بعد ثم تحليل
        const doAnalysis = async () => {
          let comments = workComments;
          if (!commentsLoaded.current || comments.length === 0) {
            try {
              const { data } = await supabase.from('work_comments').select('*').order('created_at', { ascending: true });
              if (data) { comments = data; setWorkComments(data); commentsLoaded.current = true; }
            } catch { /* تعليقات غير متوفرة */ }
          }
          return comments;
        };
        doAnalysis().then(comments => {
        // تحليل شامل (يقرأ كل البيانات + التعليقات)
        const analysis = runComprehensiveAnalysis(projects, technicalRequests, clearanceRequests, projectWorks, appUsers, comments);
        const summaryText = formatComprehensiveAnalysis(analysis);

        // إضافة تنبيهات حرجة إن وجدت
        let alertMsg = '';
        const critCount = analysis.summary.alerts.filter(a => a.severity === 'critical').length;
        if (critCount > 0) {
          alertMsg = `\n\n🚨 **تنبيه عاجل:** ${critCount} طلبات وصلت لمرحلة حرجة!`;
        }
        if (analysis.deadlines.overdue.length > 0) {
          alertMsg += `\n⏰ **${analysis.deadlines.overdue.length} أعمال متأخرة عن الموعد النهائي!**`;
        }

        setMessages(prev => [...prev, {
          id: Date.now() + 1,
          text: summaryText + alertMsg,
          sender: 'bot',
          time: timeNow(),
          alertLevel: (analysis.summary.alerts.some(a => a.severity === 'critical') || analysis.deadlines.overdue.length > 0) ? 'critical' : 'info'
        }]);
        setIsTyping(false);
        setHasShownSummary(true);
        });
      };
      setTimeout(runSummary, 800);
    } else {
      // ملخص شخصي لبقية الموظفين
      setIsTyping(true);
      setTimeout(() => {
        const userName = currentUser?.name || '';
        const myWorks = (projectWorks || []).filter((w: any) =>
          (w.assigned_to_name === userName || w.assigned_to === userName || w.assigned_to === currentUser?.email)
          && !['completed', 'منجز', 'مكتمل'].includes(w.status?.toLowerCase?.() || '')
        );
        const overdueWorks = myWorks.filter((w: any) =>
          w.expected_completion_date && new Date(w.expected_completion_date) < new Date()
        );

        let personalText = `📊 **ملخصك الشخصي:**\n`;
        personalText += `• المهام المسندة إليك: ${myWorks.length}\n`;
        if (overdueWorks.length > 0) {
          personalText += `• 🔴 متأخر عن الموعد: ${overdueWorks.length}\n`;
          overdueWorks.slice(0, 3).forEach((w: any) => {
            personalText += `  - ${w.task_name || 'عمل'}\n`;
          });
        }
        if (myWorks.length === 0) {
          personalText += `\nلا توجد مهام مسندة إليك حالياً.`;
        }

        setMessages(prev => [...prev, {
          id: Date.now() + 1,
          text: personalText,
          sender: 'bot',
          time: timeNow()
        }]);
        setIsTyping(false);
        setHasShownSummary(true);
      }, 800);
    }
  }, [isOpen, hasShownSummary, currentUser, isAdmin, isPRManager, projects, technicalRequests, clearanceRequests, projectWorks]);

  // ============================================================================
  //  تكامل الخريطة التفاعلية
  // ============================================================================

  useEffect(() => {
    const handleMapSelect = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail?.projectName) return;
      setIsOpen(true);
      const queryText = detail.projectName;
      setMessages(prev => [...prev, {
        id: Date.now(),
        text: `📍 تم اختيار مشروع "${queryText}" من الخريطة التفاعلية`,
        sender: 'user',
        time: timeNow()
      }]);
      setTimeout(() => {
        const result = processSmartQuery(queryText, projects, technicalRequests, clearanceRequests, projectWorks, appUsers, currentUser, workComments);
        setMessages(prev => [...prev, {
          id: Date.now() + 1,
          text: result.text,
          sender: 'bot',
          time: timeNow(),
          actions: result.actions
        }]);
      }, 600);
    };
    window.addEventListener('interactive-map-select', handleMapSelect);
    return () => window.removeEventListener('interactive-map-select', handleMapSelect);
  }, [projects, technicalRequests, clearanceRequests, projectWorks, appUsers, currentUser]);

  // ============================================================================
  //  التمرير التلقائي
  // ============================================================================

  useEffect(() => {
    if (isOpen) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  // ============================================================================
  //  التحقق من الصلاحية
  // ============================================================================

  if (!currentUser || !['ADMIN', 'PR_MANAGER', 'TECHNICAL', 'CONVEYANCE'].includes(currentUser.role)) return null;

  // ============================================================================
  //  رسالة الترحيب الذكية
  // ============================================================================

  function getWelcomeMessage(): string {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'صباح الخير' : hour < 17 ? 'مساء الخير' : 'مساء النور';
    const name = currentUser?.name || '';

    if (isAdmin) {
      return `${greeting} ${name} 👋\nأنا محلل المخاطر واستشاريك الإداري.\nأقرأ وأحلل كل البيانات: المشاريع، الأعمال، المواعيد، التكليفات، المعالجين، والطلبات.\n\nجاري تحضير التحليل الشامل...`;
    }
    if (isPRManager) {
      return `${greeting} ${name} 👋\nأنا مساعدك الذكي لمتابعة كل شيء في التطبيق.\nأحلل المشاريع والمواعيد والتكليفات والمعالجين.\n\nجاري تجهيز التحليل الشامل...`;
    }
    return `${greeting} ${name} 👋\nأنا مساعدك الذكي. يمكنني مساعدتك في:\n• متابعة طلباتك ومهامك المسندة\n• تحليل المواعيد النهائية والتكليفات\n• اكتشاف التأخيرات والمخاطر\n• تحليل أداء المشاريع\n\nاسألني عن أي شيء!`;
  }

  // ============================================================================
  //  معالجة الرسائل
  // ============================================================================

  const handleSend = () => {
    if (!input.trim()) return;
    const userText = input;
    setMessages(prev => [...prev, {
      id: Date.now(),
      text: userText,
      sender: 'user',
      time: timeNow()
    }]);
    setInput('');
    setIsTyping(true);

    setTimeout(() => {
      const result = processSmartQuery(userText, projects, technicalRequests, clearanceRequests, projectWorks, appUsers, currentUser, workComments);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        text: result.text,
        sender: 'bot',
        time: timeNow(),
        actions: result.actions
      }]);
      setIsTyping(false);
    }, 800);
  };

  // ============================================================================
  //  الأوامر السريعة (Quick Actions)
  // ============================================================================

  const quickActions = [
    { icon: <Brain size={14} />, label: 'تحليل شامل', query: 'تحليل شامل', color: 'bg-gradient-to-l from-[#1B2B48] to-[#2a3f63]' },
    { icon: <Shield size={14} />, label: 'ملخص القيادة', query: 'ملخص تنفيذي', color: 'bg-blue-500' },
    { icon: <AlertTriangle size={14} />, label: 'مخاطر', query: 'مخاطر وتأخيرات', color: 'bg-red-500' },
    { icon: <TrendingUp size={14} />, label: 'تنبؤ بالتأخير', query: 'تنبؤ بالتأخير', color: 'bg-amber-500' },
    { icon: <FileText size={14} />, label: 'مواعيد نهائية', query: 'تحليل المواعيد النهائية', color: 'bg-rose-500' },
    { icon: <Zap size={14} />, label: 'تكليفات', query: 'تحليل التكليفات', color: 'bg-cyan-500' },
    { icon: <Users size={14} />, label: 'موظفين', query: 'عبء الموظفين', color: 'bg-purple-500' },
    { icon: <FileText size={14} />, label: 'إفراغات', query: 'تحليل الإفراغات', color: 'bg-emerald-500' },
  ];

  const handleQuickAction = (query: string) => {
    setMessages(prev => [...prev, {
      id: Date.now(),
      text: query,
      sender: 'user',
      time: timeNow()
    }]);
    setIsTyping(true);

    setTimeout(() => {
      const result = processSmartQuery(query, projects, technicalRequests, clearanceRequests, projectWorks, appUsers, currentUser, workComments);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        text: result.text,
        sender: 'bot',
        time: timeNow(),
        actions: result.actions
      }]);
      setIsTyping(false);
    }, 600);
  };

  // ============================================================================
  //  الواجهة (UI)
  // ============================================================================

  return (
    <>
      {/* زر المساعد مع بادج التنبيهات */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-8 left-8 z-50 bg-[#1B2B48] hover:bg-[#E95D22] text-white p-4 rounded-full shadow-2xl transition-all duration-300 hover:scale-110 flex items-center gap-2 group"
        title="المساعد الذكي"
      >
        <span className={`${isOpen ? 'hidden' : 'block'} max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-500 whitespace-nowrap font-bold text-sm`}>
          المحلل الذكي
        </span>
        {isOpen ? <X size={28} /> : <Brain size={28} />}

        {/* بادج التنبيهات */}
        {alertBadge > 0 && !isOpen && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center animate-pulse">
            {alertBadge}
          </span>
        )}
      </button>

      {/* نافذة المحادثة */}
      {isOpen && (
        <div className="fixed bottom-24 left-8 z-50 w-[380px] bg-white rounded-[30px] shadow-2xl border border-gray-100 overflow-hidden flex flex-col animate-in slide-in-from-bottom-10 duration-300 h-[650px] font-cairo" dir="rtl">

          {/* الرأس */}
          <div className="bg-gradient-to-l from-[#1B2B48] to-[#2a3f63] p-4 flex items-center gap-2 text-white shadow-md relative">
            <div className="relative">
              <Brain size={20} className="text-[#E95D22]" />
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-[#1B2B48]" />
            </div>
            <div className="flex-1">
              <span className="font-bold text-sm">المحلل الذكي لدار وإعمار</span>
              <p className="text-[9px] text-gray-300 font-bold">يقرأ كل البيانات • تحليل شامل • ذاكرة تراكمية</p>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white/50 hover:text-white transition-colors" title="إغلاق">
              <X size={18} />
            </button>
          </div>

          {/* الأوامر السريعة */}
          <div className="bg-gray-50 border-b border-gray-100 px-3 py-2">
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-0.5">
              {quickActions.map((qa, i) => (
                <button
                  key={i}
                  onClick={() => handleQuickAction(qa.query)}
                  className={`flex items-center gap-1 ${qa.color} text-white text-[9px] font-bold px-2.5 py-1.5 rounded-lg whitespace-nowrap hover:brightness-110 transition-all active:scale-95 shrink-0`}
                >
                  {qa.icon}
                  {qa.label}
                </button>
              ))}
            </div>
          </div>

          {/* الرسائل */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#f8f9fa] custom-scrollbar">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[95%] rounded-2xl p-3 text-sm font-bold leading-relaxed shadow-sm whitespace-pre-wrap ${
                  msg.sender === 'user'
                    ? 'bg-[#E95D22] text-white rounded-bl-none'
                    : msg.alertLevel === 'critical'
                      ? 'bg-red-50 text-[#1B2B48] border border-red-200 rounded-br-none'
                      : 'bg-white text-[#1B2B48] border border-gray-100 rounded-br-none'
                }`}>
                  {msg.alertLevel === 'critical' && (
                    <div className="flex items-center gap-1 text-red-600 text-[10px] font-black mb-2 bg-red-100 px-2 py-1 rounded-lg w-fit">
                      <AlertTriangle size={12} />
                      تنبيه حرج
                    </div>
                  )}
                  {msg.text}
                </div>

                {/* أزرار الإجراءات */}
                {msg.actions && msg.actions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2 w-full">
                    {msg.actions.map((action: any, idx: number) => (
                      <button
                        key={idx}
                        onClick={() => {
                          if (action.type === 'PROJECT') onNavigate('PROJECT', action.data);
                          if (action.type === 'DEED') onNavigate('DEED', null);
                          if (action.type === 'TECHNICAL') onNavigate('TECHNICAL', null);
                          setIsOpen(false);
                        }}
                        className="flex items-center gap-1 bg-[#1B2B48] text-white text-[11px] px-3 py-2.5 rounded-xl hover:bg-[#E95D22] transition-colors w-full justify-center shadow-md font-black"
                      >
                        {action.label} <ArrowUpLeft size={14}/>
                      </button>
                    ))}
                  </div>
                )}

                <span className="text-[8px] text-gray-300 mt-1 px-1">{msg.time}</span>
              </div>
            ))}

            {isTyping && (
              <div className="flex items-center gap-2 px-2">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-[#E95D22] rounded-full animate-bounce" />
                  <span className="w-2 h-2 bg-[#E95D22] rounded-full animate-bounce [animation-delay:0.15s]" />
                  <span className="w-2 h-2 bg-[#E95D22] rounded-full animate-bounce [animation-delay:0.3s]" />
                </div>
                <span className="text-[10px] font-black text-[#E95D22]">جاري التحليل وفحص قاعدة البيانات...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* حقل الإدخال */}
          <div className="p-3 bg-white border-t flex gap-2 shadow-inner">
            <input
              className="flex-1 bg-gray-50 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 ring-[#E95D22]/20 transition-all border border-gray-100"
              placeholder={isAdmin ? 'اسأل عن مخاطر، تنبؤات، موظفين...' : 'اسأل عن مشروع أو طلب...'}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="p-3 bg-[#1B2B48] text-white rounded-xl hover:bg-[#E95D22] transition-colors disabled:opacity-50"
              title="إرسال"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default AIAssistant;
