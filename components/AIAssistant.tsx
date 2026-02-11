
import React, { useState, useRef, useEffect } from 'react';
import { X, Bot, Sparkles, ArrowUpLeft, Send } from 'lucide-react';

interface AIAssistantProps {
  currentUser: any;
  onNavigate: (type: string, data: any) => void;
  projects: any[];
  technicalRequests: any[];
  clearanceRequests: any[];
  projectWorks: any[];
}

const AIAssistant: React.FC<AIAssistantProps> = ({ 
  currentUser, 
  onNavigate, 
  projects = [], 
  technicalRequests = [], 
  clearanceRequests = [], 
  projectWorks = [] 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<any[]>([
    { 
      id: 1, 
      text: `مرحباً ${currentUser?.name || ''} 👋\nأنا مساعدك الذكي لمتابعة المشاريع.\nيمكنني تزويدك بتقرير تنفيذي شامل عن أي مشروع، فقط اذكر اسم المشروع (مثال: "النرجس" أو "سرايا").`, 
      sender: 'bot', 
      time: new Date().toLocaleTimeString('ar-SA', {hour: '2-digit', minute:'2-digit'}) 
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { 
    if (isOpen) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); 
  }, [messages, isOpen]);

  if (!currentUser || !['ADMIN', 'PR_MANAGER'].includes(currentUser.role)) return null;

  // دالة لتنظيف وتطبيع النصوص للبحث الذكي
  const normalizeText = (text: string) => {
    if (!text) return "";
    return text.toLowerCase()
      .trim()
      .replace(/[أإآ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/ى/g, 'ي')
      .replace(/\s+/g, ' ');
  };

  const processQuery = (rawQuery: string) => {
    const query = normalizeText(rawQuery);
    let responseText = "";
    let actions: any[] = [];

    if (!query || query.length < 2) return { text: "يرجى كتابة اسم مشروع أو استفسار واضح (أكثر من حرفين).", actions };

    // 1. البحث الذكي عن المشروع (Smart/Fuzzy Match)
    const matchedProject = projects?.find((p: any) => {
      const pName = normalizeText(p.name || p.title || "");
      return pName.includes(query) || query.includes(pName);
    });

    if (matchedProject) {
      const pId = Number(matchedProject.id);
      const pNameStr = matchedProject.name || matchedProject.title || "مشروع غير مسمى";

      // 2. تجميع البيانات من كافة المصادر مع ضمان مطابقة الأنواع (The ID Fix)
      const relatedWorks = projectWorks?.filter((w: any) => Number(w.projectId ?? w.projectid ?? w.project_id) === pId) || [];
      const relatedTech = technicalRequests?.filter((t: any) => Number(t.project_id ?? t.projectId ?? t.projectid) === pId) || [];
      
      // مطابقة الإفراغات باسم المشروع لضمان الدقة
      const relatedDeeds = clearanceRequests?.filter((d: any) => {
        const dProjName = normalizeText(d.project_name || "");
        const pNameNorm = normalizeText(pNameStr);
        return dProjName.includes(pNameNorm) || pNameNorm.includes(dProjName);
      }) || [];

      // 3. دمج كافة العمليات وتصنيف الحالات
      const allTasks = [...relatedWorks, ...relatedTech];
      const completedTasks = allTasks.filter((t: any) => 
        ['completed', 'منجز', 'مكتمل', 'تم الإفراغ'].includes(t.status?.toLowerCase())
      );
      const pendingTasks = allTasks.filter((t: any) => 
        !['completed', 'منجز', 'مكتمل', 'تم الإفراغ'].includes(t.status?.toLowerCase())
      );

      // 4. بناء التقرير التنفيذي (Executive Summary Structure)
      let summary = `🏗️ **تقرير مشروع: ${pNameStr}** | 📍 الموقع: ${matchedProject.location || 'غير محدد'}\n\n`;
      
      summary += `📊 **إحصائيات الإنجاز:**\n`;
      summary += `• إجمالي المهام: ${allTasks.length + relatedDeeds.length}\n`;
      summary += `• ✅ المنجز: ${completedTasks.length}\n`;
      summary += `• ⏳ قيد العمل: ${pendingTasks.length}\n\n`;

      // تفاصيل المنجز
      if (completedTasks.length > 0) {
        summary += `✅ **أبرز الأعمال المنجزة:**\n`;
        completedTasks.slice(0, 3).forEach(t => {
          summary += `- ${t.task_name || t.service_type || 'مهمة فنية'}\n`;
        });
      }

      // تفاصيل المعلق
      if (pendingTasks.length > 0) {
        summary += `\n⏳ **قيد المتابعة:**\n`;
        pendingTasks.slice(0, 3).forEach(t => {
          summary += `- ${t.task_name || t.service_type || 'مهمة فنية'}\n`;
        });
      }

      // سجل الإفراغات
      summary += `\n📄 **سجل الإفراغات:**\n`;
      if (relatedDeeds.length > 0) {
        const completedDeeds = relatedDeeds.filter(d => ['مكتمل', 'منجز', 'تم الإفراغ'].includes(d.status));
        summary += `يوجد عدد (${relatedDeeds.length}) سجل إفراغ مرتبطة بالمشروع (تم إنجاز ${completedDeeds.length} منها).\n`;
      } else {
        summary += `لا توجد سجلات إفراغ مسجلة حالياً لهذا المشروع.\n`;
      }

      summary += `\n_هذا التقرير تم تجميعه لحظياً من كافة قطاعات العمل._`;
      
      responseText = summary;
      actions.push({ label: `فتح ملف المشروع (ID: ${pId})`, type: 'PROJECT', data: matchedProject });
    } 
    else if (query.includes('افراغ') || query.includes('صك') || query.includes('افراغات')) {
      const totalDeeds = clearanceRequests?.length || 0;
      const completedDeeds = clearanceRequests?.filter((d: any) => 
        ['مكتمل', 'منجز', 'تم الإفراغ', 'completed'].includes(d.status)
      ).length || 0;

      responseText = `📄 **ملخص سجل الإفراغات الكلي**\n\n`;
      responseText += `• إجمالي طلبات الإفراغ: ${totalDeeds}\n`;
      responseText += `• ✅ العمليات المكتملة: ${completedDeeds}\n`;
      responseText += `• ⏳ تحت الإجراء: ${totalDeeds - completedDeeds}\n\n`;
      responseText += `هل تريد الانتقال إلى سجل الإفراغات العام؟`;
      
      actions.push({ label: 'فتح سجل الإفراغات العام', type: 'DEED', data: null });
    }
    else {
      // التعامل مع حالة عدم العثور على مشروع (Suggestions)
      responseText = "عذراً، لم أجد مشروعاً بهذا الاسم. هل تقصد أحد هذه المشاريع النشطة؟\n\n";
      const suggestions = projects?.slice(0, 4).map(p => `• ${p.name || p.title}`).join('\n');
      responseText += suggestions || "لا توجد مشاريع مسجلة حالياً.";
    }

    return { text: responseText, actions };
  };

  const handleSend = () => {
    if (!input.trim()) return;
    
    const userText = input;
    setMessages(prev => [...prev, { 
      id: Date.now(), 
      text: userText, 
      sender: 'user', 
      time: new Date().toLocaleTimeString('ar-SA', {hour: '2-digit', minute:'2-digit'}) 
    }]);
    setInput('');
    setIsTyping(true);

    setTimeout(() => {
      const { text, actions } = processQuery(userText);
      setMessages(prev => [...prev, { 
        id: Date.now() + 1, 
        text: text, 
        sender: 'bot', 
        time: new Date().toLocaleTimeString('ar-SA', {hour: '2-digit', minute:'2-digit'}),
        actions 
      }]);
      setIsTyping(false);
    }, 800);
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="fixed bottom-8 left-8 z-50 bg-[#1B2B48] hover:bg-[#E95D22] text-white p-4 rounded-full shadow-2xl transition-all duration-300 hover:scale-110 flex items-center gap-2 group"
      >
        <span className={`${isOpen ? 'hidden' : 'block'} max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-500 whitespace-nowrap font-bold text-sm`}>
          المساعد الذكي
        </span>
        {isOpen ? <X size={28} /> : <Bot size={28} />}
      </button>

      {isOpen && (
        <div className="fixed bottom-24 left-8 z-50 w-80 bg-white rounded-[30px] shadow-2xl border border-gray-100 overflow-hidden flex flex-col animate-in slide-in-from-bottom-10 duration-300 h-[600px] font-cairo" dir="rtl">
          <div className="bg-[#1B2B48] p-4 flex items-center gap-2 text-white shadow-md relative">
            <Sparkles size={18} className="text-[#E95D22]" />
            <span className="font-bold">مساعد دار وإعمار التنفيذي</span>
            <button onClick={() => setIsOpen(false)} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white">
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#f8f9fa] custom-scrollbar">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[95%] rounded-2xl p-3 text-sm font-bold leading-relaxed shadow-sm whitespace-pre-wrap ${msg.sender === 'user' ? 'bg-[#E95D22] text-white rounded-bl-none' : 'bg-white text-[#1B2B48] border border-gray-100 rounded-br-none'}`}>
                  {msg.text}
                </div>
                {msg.actions && msg.actions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2 w-full">
                    {msg.actions.map((action: any, idx: number) => (
                      <button 
                        key={idx} 
                        onClick={() => { 
                          if(action.type === 'PROJECT') onNavigate('PROJECT', action.data);
                          if(action.type === 'DEED') onNavigate('DEED', null);
                          setIsOpen(false);
                        }} 
                        className="flex items-center gap-1 bg-[#1B2B48] text-white text-[11px] px-3 py-2.5 rounded-xl hover:bg-[#E95D22] transition-colors w-full justify-center shadow-md font-black"
                      >
                        {action.label} <ArrowUpLeft size={14}/>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {isTyping && <div className="text-[10px] font-black text-[#E95D22] px-2 animate-pulse">جاري فحص قاعدة البيانات وتحليل الأداء...</div>}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-3 bg-white border-t flex gap-2 shadow-inner">
            <input 
              className="flex-1 bg-gray-50 rounded-xl px-4 text-sm font-bold outline-none focus:ring-2 ring-[#E95D22]/20 transition-all border border-gray-100" 
              placeholder="اطلب تقرير عن أي مشروع..." 
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
            />
            <button 
              onClick={handleSend} 
              disabled={!input.trim()} 
              className="p-3 bg-[#1B2B48] text-white rounded-xl hover:bg-[#E95D22] transition-colors disabled:opacity-50"
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
