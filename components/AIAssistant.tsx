
import React, { useState, useRef, useEffect } from 'react';
import { X, Bot, Sparkles, ArrowUpLeft, Send } from 'lucide-react';

// --- المساعد الذكي (النسخة المطورة لعرض التفاصيل) ---
const AIAssistant = ({ currentUser, onNavigate, projects, technicalRequests, clearanceRequests, projectWorks }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<any[]>([
      { 
        id: 1, 
        text: `مرحباً ${currentUser?.name || ''} 👋\nأنا مساعدك الذكي لمتابعة المشاريع.\nاسألني عن أي مشروع (مثال: "النرجس" أو "تالا") وسأعطيك تقريراً شاملاً عن حالة الإنجاز والإفراغات.`, 
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

  // دالة لتنظيف وتطبيع النصوص للبحث
  const normalizeText = (text: string) => {
    if (!text) return "";
    return text.toLowerCase().trim().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/\s+/g, ' ');
  };

  const processQuery = (rawQuery: string) => {
    const query = normalizeText(rawQuery);
    let responseText = "";
    let actions: any[] = [];

    if (!query) return { text: "يرجى كتابة استفسار صالح.", actions };

    // 1. البحث الذكي عن المشاريع (Fuzzy/Partial Match)
    const project = (projects || []).find((p: any) => {
        const pName = normalizeText(p.name || p.title || "");
        return pName.includes(query) || query.includes(pName);
    });
    
    if (project) {
         const pId = Number(project.id);
         const pNameStr = project.name || project.title || "مشروع غير مسمى";

         // 2. تجميع البيانات من كافة المصادر مع ضمان مطابقة الأنواع
         // أعمال المشروع (Project Works)
         const relatedWorks = (projectWorks || []).filter((w: any) => Number(w.projectId) === pId);
         
         // الطلبات الفنية (Technical Requests)
         const relatedTech = (technicalRequests || []).filter((t: any) => 
            Number(t.project_id) === pId || Number(t.projectId) === pId
         );

         // سجلات الإفراغ (Deeds/Clearance) - مطابقة بالاسم لأنها غالباً ترتبط بالاسم في هذا النظام
         const relatedDeeds = (clearanceRequests || []).filter((d: any) => {
            const dProjName = normalizeText(d.project_name || "");
            const pNameNorm = normalizeText(pNameStr);
            return dProjName.includes(pNameNorm) || pNameNorm.includes(dProjName);
         });

         // دمج كافة المهام الفنية والإنشائية
         const allTasks = [...relatedWorks, ...relatedTech];
         const completedCount = allTasks.filter((t: any) => t.status === 'completed' || t.status === 'منجز' || t.status === 'مكتمل').length;
         const pendingTasks = allTasks.filter((t: any) => t.status !== 'completed' && t.status !== 'منجز' && t.status !== 'مكتمل');

         // 3. بناء نص الرد الهيكلي (Professional Summary)
         let summary = `🏗️ **تقرير مشروع: ${pNameStr}**\n📍 الموقع: ${project.location || 'غير محدد'}\n\n`;
         summary += `📊 **إحصائيات الإنجاز:**\n`;
         summary += `• إجمالي المهام: ${allTasks.length}\n`;
         summary += `• المنجز: ${completedCount}\n`;
         summary += `• قيد العمل: ${pendingTasks.length}\n\n`;

         // عرض أبرز الأعمال المنجزة
         const recentCompleted = allTasks.filter((t: any) => t.status === 'completed' || t.status === 'منجز').slice(0, 3);
         if (recentCompleted.length > 0) {
             summary += `✅ **أبرز الأعمال المنجزة:**\n`;
             recentCompleted.forEach(w => {
                 summary += `- ${w.task_name || w.service_type}\n`;
             });
             if (completedCount > 3) summary += `...و ${completedCount - 3} أعمال أخرى.\n`;
         }

         // عرض الأعمال المعلقة
         if (pendingTasks.length > 0) {
             summary += `\n⏳ **قيد المتابعة:**\n`;
             pendingTasks.slice(0, 3).forEach(w => {
                 summary += `- ${w.task_name || w.service_type}\n`;
             });
             if (pendingTasks.length > 3) summary += `...و ${pendingTasks.length - 3} أعمال أخرى.\n`;
         }

         // عرض معلومات الإفراغ
         if (relatedDeeds.length > 0) {
             summary += `\n📄 **سجل الإفراغات:**\n`;
             summary += `يوجد عدد (${relatedDeeds.length}) سجل إفراغ مرتبط بهذا المشروع.\n`;
         } else {
             summary += `\n📄 **سجل الإفراغات:** لا توجد سجلات إفراغ حالياً.\n`;
         }

         summary += `\nيمكنك فتح ملف المشروع للاطلاع على كافة التفاصيل والمستندات.`;
         
         responseText = summary;
         actions.push({ label: `فتح ملف ${pNameStr}`, type: 'PROJECT', data: project });
    } 
    else if (query.includes('افراغ') || query.includes('صك') || query.includes('افراغات')) {
         responseText = "إليك ملخص سريع عن الإفراغات:\n";
         const totalDeeds = (clearanceRequests || []).length;
         const completedDeeds = (clearanceRequests || []).filter((d: any) => d.status === 'مكتمل' || d.status === 'completed').length;
         
         responseText += `📈 إجمالي طلبات الإفراغ: ${totalDeeds}\n`;
         responseText += `✅ المكتمل منها: ${completedDeeds}\n\n`;
         responseText += "هل تريد الانتقال لسجل الإفراغات العام لإدارة الطلبات؟";
         actions.push({ label: 'الذهاب لسجل الإفراغات', type: 'DEED', data: null });
    }
    else {
        responseText = "عذراً، لم أستطع العثور على المشروع المطلوب. يرجى التأكد من كتابة الاسم بشكل صحيح (مثال: سرايا، تالا، الجوان).";
    }

    return { text: responseText, actions };
  };

  const handleSend = () => {
    if (!input.trim()) return;
    
    const userText = input;
    setMessages(prev => [...prev, { id: Date.now(), text: userText, sender: 'user', time: new Date().toLocaleTimeString('ar-SA', {hour: '2-digit', minute:'2-digit'}) }]);
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
    }, 600);
  };

  return (
    <>
    <button onClick={() => setIsOpen(!isOpen)} className="fixed bottom-8 left-8 z-50 bg-[#1B2B48] hover:bg-[#E95D22] text-white p-4 rounded-full shadow-xl transition-all duration-300 hover:scale-110 flex items-center gap-2 group">
        <span className={`${isOpen ? 'hidden' : 'block'} max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-500 whitespace-nowrap font-bold text-sm`}>المساعد الذكي</span>
        {isOpen ? <X size={28} /> : <Bot size={28} />}
    </button>

    {isOpen && (
        <div className="fixed bottom-24 left-8 z-50 w-80 bg-white rounded-[30px] shadow-2xl border border-gray-100 overflow-hidden flex flex-col animate-in slide-in-from-bottom-10 duration-300 h-[550px] font-cairo" dir="rtl">
          <div className="bg-[#1B2B48] p-4 flex items-center gap-2 text-white shadow-md">
             <Sparkles size={18} className="text-[#E95D22]" />
             <span className="font-bold">مساعد دار وإعمار</span>
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
                                <button key={idx} onClick={() => { 
                                    if(action.type === 'PROJECT') onNavigate('PROJECT', action.data);
                                    if(action.type === 'DEED') onNavigate('DEED', null);
                                    setIsOpen(false);
                                }} className="flex items-center gap-1 bg-[#1B2B48] text-white text-[11px] px-3 py-2 rounded-xl hover:bg-blue-900 transition-colors w-full justify-center shadow-sm">
                                    {action.label} <ArrowUpLeft size={14}/>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            ))}
            {isTyping && <div className="text-xs text-gray-400 px-2 animate-pulse">جاري معالجة البيانات...</div>}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-3 bg-white border-t flex gap-2">
            <input 
                className="flex-1 bg-gray-50 rounded-xl px-4 text-sm font-bold outline-none focus:ring-2 ring-[#E95D22]/20 transition-all" 
                placeholder="أكتب اسم المشروع..." 
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
            />
            <button onClick={handleSend} disabled={!input.trim()} className="p-3 bg-[#1B2B48] text-white rounded-xl hover:bg-[#E95D22] transition-colors disabled:opacity-50">
                <Send size={18} />
            </button>
          </div>
        </div>
    )}
    </>
  );
};

export default AIAssistant;
