import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Sparkles, Bot, User, BarChart3, FileText } from 'lucide-react';

interface AIAssistantProps {
  projects: any[];
  technicalRequests: any[];
  deedsRequests: any[];
  clearanceRequests: any[];
}

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'bot';
  time: string;
}

const AIAssistant: React.FC<AIAssistantProps> = ({ projects, technicalRequests, deedsRequests, clearanceRequests }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, text: 'مرحباً! أنا مساعد دار وإعمار الذكي 🤖\nكيف يمكنني مساعدتك في إدارة أملاكك اليوم؟', sender: 'bot', time: new Date().toLocaleTimeString('ar-SA', {hour: '2-digit', minute:'2-digit'}) }
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // --- المنطق المحدث (Logic) ---
  const processQuery = (query: string) => {
    const lowerQuery = query.toLowerCase();
    let response = "";

    // 1. ملخص عام
    if (lowerQuery.includes('ملخص') || lowerQuery.includes('تقرير') || lowerQuery.includes('وضع عام')) {
      const activeProjects = projects.length;
      const totalDeeds = deedsRequests.length;
      const pendingTech = technicalRequests.filter(t => t.status !== 'completed' && t.status !== 'منجز').length;
      
      response = `📊 **إليك ملخص النظام حالياً:**\n
      - عدد المشاريع الإجمالي: ${activeProjects} مشاريع.
      - إجمالي طلبات الإفراغ والتخليص: ${totalDeeds} طلب.
      - طلبات فنية قيد المتابعة: ${pendingTech} طلب.
      \nهل تود تفاصيل عن مشروع محدد؟`;
    }
    
    // 2. البحث عن مشروع (محدث ليشمل الأعمال الداخلية)
    else if (projects.some(p => lowerQuery.includes(p.name.toLowerCase()))) {
      const project = projects.find(p => lowerQuery.includes(p.name.toLowerCase()));
      
      if (project) {
        // --- الفلاتر ---
        // الأعمال الفنية الخارجية (Tech)
        const techWorks = technicalRequests.filter(r => r.project_name === project.name && r.scope !== 'INTERNAL_WORK');
        // الأعمال الداخلية (Internal)
        const internalWorks = technicalRequests.filter(r => r.project_name === project.name && r.scope === 'INTERNAL_WORK');
        
        // حساب النسب
        const completedTech = techWorks.filter(t => t.status === 'completed' || t.status === 'منجز').length;
        const completedInternal = internalWorks.filter(t => t.status === 'completed' || t.status === 'منجز').length;

        // بناء قائمة الأعمال الداخلية
        let internalWorksList = "";
        if (internalWorks.length > 0) {
            internalWorksList = internalWorks.slice(0, 5).map(work => 
                `🔹 ${work.title || 'عمل داخلي'}: ${work.status === 'completed' || work.status === 'منجز' ? '✅ منجز' : '⏳ قيد التنفيذ'}`
            ).join('\n');
        } else {
            internalWorksList = "لا توجد أعمال داخلية مسجلة.";
        }

        // بناء قائمة الأعمال الفنية
        let techWorksList = "";
        if (techWorks.length > 0) {
            techWorksList = techWorks.slice(0, 5).map(work => 
                `🔸 ${work.type || work.title}: ${work.status === 'completed' || work.status === 'منجز' ? '✅ منجز' : '⏳ قيد التنفيذ'}`
            ).join('\n');
        } else {
            techWorksList = "لا توجد أعمال فنية مسجلة.";
        }

        // صياغة الرد النهائي
        response = `🏗️ **تقرير مشروع ${project.name}:**\n
        📍 الموقع: ${project.location || 'الرياض'}
        
        🚧 **حالة الأعمال الداخلية:**
        - الإنجاز: ${completedInternal} من أصل ${internalWorks.length}
        ${internalWorksList}
        
        🔧 **المراجعات والطلبات الفنية:**
        - الإنجاز: ${completedTech} من أصل ${techWorks.length}
        ${techWorksList}
        
        💡 **المقاولين:**
        - الكهرباء: ${project.electricity_contractor || 'غير محدد'}
        - المياه: ${project.water_contractor || 'غير محدد'}
        `;
      }
    }

    // 3. البحث عن إفراغ
    else if (lowerQuery.includes('افراغ') || lowerQuery.includes('إفراغ') || lowerQuery.includes('صك')) {
        const deed = deedsRequests.find(d => 
            lowerQuery.includes(d.client_name?.toLowerCase()) || 
            lowerQuery.includes(d.id_number)
        );

        if (deed) {
            response = `📄 **بيانات الإفراغ:**\n
            👤 العميل: ${deed.client_name}
            🆔 الهوية: ${deed.id_number}
            🏠 المشروع: ${deed.project_name} - وحدة ${deed.unit_number || '-'}
            📊 الحالة: ${deed.status} ${deed.status === 'منجز' ? '✅' : '⏳'}
            💰 القيمة: ${deed.unit_value ? Number(deed.unit_value).toLocaleString() : '-'} ر.س
            ${deed.sakani_support_number ? `✅ رقم الدعم: ${deed.sakani_support_number}` : ''}
            `;
        } else {
            response = "عذراً، لم أجد طلب إفراغ بهذا الاسم أو الرقم. تأكد من صحة البيانات.";
        }
    }

    // 4. رد افتراضي
    else {
        response = "مرحباً بك 👋\nيمكنني مساعدتك في:\n1️⃣ عرض ملخص للمشاريع.\n2️⃣ الاستعلام عن حالة مشروع (مثل: 'مشروع تالا الشرق').\n3️⃣ البحث عن حالة إفراغ عميل.\n\nبماذا أبدأ؟";
    }

    return response;
  };

  const handleSend = () => {
    if (!input.trim()) return;

    const userMsg: Message = { id: Date.now(), text: input, sender: 'user', time: new Date().toLocaleTimeString('ar-SA', {hour: '2-digit', minute:'2-digit'}) };
    setMessages(prev => [...prev, userMsg]);
    setInput('');

    setTimeout(() => {
        const replyText = processQuery(userMsg.text);
        const botMsg: Message = { id: Date.now() + 1, text: replyText, sender: 'bot', time: new Date().toLocaleTimeString('ar-SA', {hour: '2-digit', minute:'2-digit'}) };
        setMessages(prev => [...prev, botMsg]);
    }, 600);
  };

  // --- اختصارات سريعة (Chips) ---
  const suggestions = [
    { label: '📊 ملخص عام', action: 'ملخص عام للمشاريع' },
    { label: '📄 الإفراغات', action: 'حالة طلبات الإفراغ' },
  ];

  return (
    <>
      {/* Floating Button */}
      <button 
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 left-6 z-50 bg-[#E95D22] text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-transform duration-300 ${isOpen ? 'hidden' : 'flex'}`}
      >
        <Bot size={28} className="animate-bounce-slow" />
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 left-6 z-50 w-full max-w-sm bg-white rounded-[30px] shadow-2xl border border-gray-100 overflow-hidden flex flex-col animate-in slide-in-from-bottom-10 duration-300 h-[600px] max-h-[80vh] font-cairo" dir="rtl">
          {/* Header */}
          <div className="bg-[#1B2B48] p-5 flex justify-between items-center text-white shadow-md">
            <div className="flex items-center gap-3">
                <div className="bg-white/10 p-2 rounded-xl backdrop-blur-md">
                    <Bot size={24} className="text-[#E95D22]" />
                </div>
                <div>
                    <h3 className="font-bold text-lg">مساعد دار وإعمار</h3>
                    <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                        <p className="text-[10px] text-gray-300 font-medium">متصل الآن</p>
                    </div>
                </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white/60 hover:text-white hover:bg-white/10 p-2 rounded-full transition-all"><X size={20} /></button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#f8f9fa] custom-scrollbar">
            {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl p-3.5 text-sm font-bold leading-relaxed whitespace-pre-line shadow-sm ${
                        msg.sender === 'user' 
                        ? 'bg-[#E95D22] text-white rounded-bl-none' 
                        : 'bg-white text-[#1B2B48] border border-gray-100 rounded-br-none'
                    }`}>
                        {msg.text}
                        <p className={`text-[9px] mt-2 text-left ${msg.sender === 'user' ? 'text-white/60' : 'text-gray-400'}`}>{msg.time}</p>
                    </div>
                </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input & Suggestions */}
          <div className="p-4 bg-white border-t border-gray-100">
            {messages.length < 3 && (
                <div className="flex gap-2 mb-3 overflow-x-auto no-scrollbar pb-1">
                    {suggestions.map((s, i) => (
                        <button key={i} onClick={() => setInput(s.action)} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-full text-xs font-bold text-gray-600 hover:bg-[#E95D22] hover:text-white hover:border-[#E95D22] transition-colors whitespace-nowrap">
                            {s.label}
                        </button>
                    ))}
                </div>
            )}
            <div className="relative flex items-center gap-2">
                <input 
                    type="text" 
                    placeholder="اسألني أي شيء..." 
                    className="w-full pl-4 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-[20px] focus:outline-none focus:border-[#E95D22] text-sm font-bold text-[#1B2B48] transition-all placeholder:text-gray-400"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                />
                <button 
                    onClick={handleSend}
                    className={`p-3.5 rounded-[18px] transition-all shadow-lg ${input.trim() ? 'bg-[#1B2B48] text-white hover:bg-[#E95D22] hover:scale-105' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                    disabled={!input.trim()}
                >
                    <Send size={18} className={input.trim() ? '' : 'opacity-50'} />
                </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AIAssistant;