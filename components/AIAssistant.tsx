
import React, { useState, useRef, useEffect } from 'react';
import { X, Bot, Sparkles, ArrowUpLeft, Send } from 'lucide-react';

// --- المساعد الذكي (النسخة المطورة لعرض التفاصيل) ---
const AIAssistant = ({ currentUser, onNavigate, projects, technicalRequests, deedsRequests, projectWorks }: any) => {
  // Fix: Added missing useState hook for state management
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<any[]>([
      { id: 1, text: `مرحباً ${currentUser?.name || ''} 👋\nأنا مساعدك الذكي لمتابعة المشاريع.\nاسألني عن أي مشروع (مثال: "سرايا البدر") وسأعطيك تقريراً مفصلاً.`, sender: 'bot', time: new Date().toLocaleTimeString('ar-SA', {hour: '2-digit', minute:'2-digit'}) }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  // Fix: Added missing useRef hook for scrolling
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fix: Added missing useEffect hook for auto-scrolling to the latest message
  useEffect(() => { 
    if (isOpen) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); 
  }, [messages, isOpen]);

  if (!currentUser || !['ADMIN', 'PR_MANAGER'].includes(currentUser.role)) return null;

  const processQuery = (rawQuery: string) => {
    const query = rawQuery.toLowerCase().trim();
    let responseText = "";
    let actions: any[] = [];

    // البحث عن مشاريع
    const project = (projects || []).find((p: any) => query.includes((p.name || '').toLowerCase()));
    
    if (project) {
         // 1. جمع كل الأعمال والطلبات المرتبطة بالمشروع
         const relatedWorks = (projectWorks || []).filter((w: any) => w.projectId === project.id);
         const relatedTech = (technicalRequests || []).filter((t: any) => t.projectId === project.id);
         const allTasks = [...relatedWorks, ...relatedTech];

         // 2. فصل المنجز عن غير المنجز
         const completedList = allTasks.filter((w: any) => w.status === 'completed' || w.status === 'منجز');
         const pendingList = allTasks.filter((w: any) => w.status !== 'completed' && w.status !== 'منجز');

         // 3. بناء نص الرد (سرد الأسماء)
         let detailsText = "";

         if (completedList.length > 0) {
             detailsText += `\n✅ **أبرز الأعمال المنجزة:**\n`;
             // نعرض أول 3 أعمال فقط لتجنب طول الرسالة
             completedList.slice(0, 3).forEach((w: any) => {
                 detailsText += `- ${w.task_name || w.type}\n`;
             });
             if (completedList.length > 3) detailsText += `...و ${completedList.length - 3} أعمال أخرى.\n`;
         } else {
             detailsText += `\n⚠️ لا توجد أعمال منجزة مسجلة.\n`;
         }

         if (pendingList.length > 0) {
             detailsText += `\n⏳ **أعمال قيد المتابعة:**\n`;
             pendingList.slice(0, 3).forEach((w: any) => {
                 detailsText += `- ${w.task_name || w.type}\n`;
             });
             if (pendingList.length > 3) detailsText += `...و ${pendingList.length - 3} أعمال أخرى.\n`;
         } else {
             detailsText += `\n✨ ممتاز! لا توجد أعمال معلقة.\n`;
         }
         
         responseText = `🏗️ **تقرير مشروع: ${project.name}**\n` +
                        `📊 إجمالي المهام: ${allTasks.length}` +
                        detailsText + 
                        `\nهل تريد فتح ملف المشروع للتفاصيل الكاملة؟`;
         
         // زر فتح المشروع
         actions.push({ label: `فتح ملف ${project.name}`, type: 'PROJECT', data: project });
    } 
    else if (query.includes('افراغ') || query.includes('إفراغ')) {
         responseText = "يمكنك إدارة الإفراغات من قسم 'سجل الإفراغات'. هل تريد الذهاب هناك؟";
         actions.push({ label: 'سجل الإفراغات', type: 'DEED', data: null });
    }
    else {
        responseText = "عذراً، لم أجد مشروعاً بهذا الاسم. الرجاء كتابة اسم المشروع بدقة (مثال: تالا الشرق، سرايا الجوان).";
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
        {/* Fix: Used imported X and Bot icons */}
        {isOpen ? <X size={28} /> : <Bot size={28} />}
    </button>

    {isOpen && (
        <div className="fixed bottom-24 left-8 z-50 w-80 bg-white rounded-[30px] shadow-2xl border border-gray-100 overflow-hidden flex flex-col animate-in slide-in-from-bottom-10 duration-300 h-[500px] font-cairo" dir="rtl">
          <div className="bg-[#1B2B48] p-4 flex items-center gap-2 text-white shadow-md">
             {/* Fix: Used imported Sparkles icon */}
             <Sparkles size={18} className="text-[#E95D22]" />
             <span className="font-bold">مساعد دار وإعمار</span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#f8f9fa] custom-scrollbar">
            {messages.map((msg) => (
                <div key={msg.id} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`max-w-[90%] rounded-2xl p-3 text-sm font-bold leading-relaxed shadow-sm whitespace-pre-wrap ${msg.sender === 'user' ? 'bg-[#E95D22] text-white rounded-bl-none' : 'bg-white text-[#1B2B48] border border-gray-100 rounded-br-none'}`}>
                        {msg.text}
                    </div>
                    {msg.actions && (
                        <div className="mt-2 flex flex-wrap gap-2">
                            {msg.actions.map((action: any, idx: number) => (
                                <button key={idx} onClick={() => { 
                                    if(action.type === 'PROJECT') onNavigate('PROJECT', action.data);
                                    if(action.type === 'DEED') onNavigate('DEED', null);
                                    setIsOpen(false);
                                }} className="flex items-center gap-1 bg-[#1B2B48] text-white text-xs px-3 py-2 rounded-lg hover:bg-blue-900 transition-colors w-full justify-center">
                                    {/* Fix: Used imported ArrowUpLeft icon */}
                                    {action.label} <ArrowUpLeft size={14}/>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            ))}
            {isTyping && <div className="text-xs text-gray-400 px-2">جاري الكتابة...</div>}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-3 bg-white border-t flex gap-2">
            <input 
                className="flex-1 bg-gray-50 rounded-xl px-4 text-sm font-bold outline-none focus:ring-1 ring-[#E95D22]" 
                placeholder="أكتب اسم المشروع..." 
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
            />
            <button onClick={handleSend} className="p-3 bg-[#1B2B48] text-white rounded-xl hover:bg-[#E95D22] transition-colors">
                {/* Fix: Used imported Send icon */}
                <Send size={18} />
            </button>
          </div>
        </div>
    )}
    </>
  );
};

export default AIAssistant;
