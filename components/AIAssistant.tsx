
import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Sparkles, Bot, BarChart3, ArrowUpLeft, Search, Zap, CheckCircle2, AlertCircle, Clock } from 'lucide-react';

interface AIAssistantProps {
  projects: any[];
  technicalRequests: any[];
  deedsRequests: any[];
  clearanceRequests: any[];
  onNavigate: (type: 'PROJECT' | 'DEED', data: any) => void;
}

interface ActionButton {
    label: string;
    type: 'PROJECT' | 'DEED';
    data: any;
}

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'bot';
  time: string;
  actions?: ActionButton[];
}

const AIAssistant: React.FC<AIAssistantProps> = ({ projects, technicalRequests, deedsRequests, clearanceRequests, onNavigate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  const getGreeting = () => {
      const hour = new Date().getHours();
      const greeting = hour < 12 ? 'صباح الخير ☀️' : 'مساء الخير 🌙';
      return `${greeting}، أنا مساعدك الذكي.\nيمكنك سؤالي عن مشروع محدد، أو طلب "ملخص النظام" أو "الأعمال المتابعة".`;
  };

  const [messages, setMessages] = useState<Message[]>([
    { 
      id: 1, 
      text: getGreeting(), 
      sender: 'bot', 
      time: new Date().toLocaleTimeString('ar-SA', {hour: '2-digit', minute:'2-digit'}) 
    }
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { 
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); 
    }
  }, [messages, isTyping, isOpen]);

  // --- دالة استخراج اسم العمل الحقيقي (حل مشكلة Untitled Work) ---
  const getWorkTitle = (work: any) => {
      if (work.service_type) return work.service_type;
      if (work.title) return work.title;
      if (work.type) return work.type;
      
      // الترجمة اليدوية للحقول البرمجية الشائعة
      const typeMap: Record<string, string> = {
          'electricity': '⚡ أعمال الكهرباء',
          'water': '💧 أعمال المياه',
          'paint': '🎨 أعمال الدهانات',
          'internal': '🏠 أعمال داخلية',
          'external': '🏗️ أعمال خارجية'
      };
      
      if (work.request_type && typeMap[work.request_type]) return typeMap[work.request_type];
      if (work.request_type) return work.request_type;
      
      return work.description ? (work.description.substring(0, 30) + '...') : `مهمة رقم ${work.id}`;
  };

  // --- المحرك الذكي المطور ---
  const processQuery = (rawQuery: string) => {
    const query = rawQuery.toLowerCase().trim();
    let responseText = "";
    let actions: ActionButton[] = [];

    // كلمات الفلترة
    const isCompletedQuery = query.includes('منجز') || query.includes('تم') || query.includes('خالص');
    const isPendingQuery = query.includes('متابعة') || query.includes('جاري') || query.includes('باقي') || query.includes('تحت');

    // 1️⃣ البحث عن مشروع محدد
    const project = projects.find(p => query.includes(p.name.toLowerCase()) || query.includes((p.title || '').toLowerCase()));
    
    if (project && !query.includes('ملخص عام')) {
        const works = [...technicalRequests, ...clearanceRequests].filter(r => r.project_name === project.name || r.projectName === project.name);
        
        let displayedWorks = works;
        let statusTitle = "جميع الأعمال";

        if (isCompletedQuery) {
            displayedWorks = works.filter(w => w.status === 'completed' || w.status === 'منجز');
            statusTitle = "✅ الأعمال المنجزة";
        } else if (isPendingQuery) {
            displayedWorks = works.filter(w => w.status !== 'completed' && w.status !== 'منجز');
            statusTitle = "⏳ الأعمال قيد المتابعة";
        }

        const completionRate = works.length > 0 ? Math.round((works.filter(w => w.status === 'completed' || w.status === 'منجز').length / works.length) * 100) : 0;

        const listText = displayedWorks.slice(0, 8).map((w, i) => {
            const title = getWorkTitle(w);
            const statusIcon = (w.status === 'completed' || w.status === 'منجز') ? '✅' : '⏳';
            return `${i+1}. ${title} ${statusIcon}`;
        }).join('\n');

        responseText = `🏗️ **تقرير مشروع: ${project.name}**\n` +
                       `📍 الموقع: ${project.location || 'غير محدد'}\n` +
                       `📊 نسبة الإنجاز: ${completionRate}%\n` +
                       `ــــــــــــــــــــــــــــــــــــــــــــــــ\n` +
                       `🔍 **${statusTitle} (${displayedWorks.length}):**\n` +
                       (listText || "لا توجد سجلات في هذا التصنيف.") + 
                       (displayedWorks.length > 8 ? `\n...و ${displayedWorks.length - 8} أخرى` : '');

        actions.push({ label: `فتح ملف ${project.name}`, type: 'PROJECT', data: project });
    } 

    // 2️⃣ ملخص حالة النظام (Dashboard Summary)
    else if (query.includes('ملخص') || query.includes('حالة') || query.includes('تقرير')) {
        const completedDeeds = deedsRequests.filter(d => d.status === 'منجز').length;
        const pendingDeeds = deedsRequests.length - completedDeeds;
        const completedTech = technicalRequests.filter(t => t.status === 'completed' || t.status === 'منجز').length;
        const pendingTech = technicalRequests.length - completedTech;

        responseText = `📊 **تقرير حالة النظام الحالية:**\n\n` +
                       `📝 **سجل الإفراغات:**\n` +
                       `- ✅ المنجز: ${completedDeeds}\n` +
                       `- ⏳ المتابعة: ${pendingDeeds}\n\n` +
                       `🔧 **الطلبات الفنية والأعمال:**\n` +
                       `- ✅ المنجز: ${completedTech}\n` +
                       `- ⏳ المتابعة: ${pendingTech}\n\n` +
                       `هل تريد تفاصيل مشروع معين؟`;
    }

    // 3️⃣ البحث عن إفراغ عميل
    else if (query.includes('افراغ') || query.includes('إفراغ') || query.includes('عميل')) {
        const deed = deedsRequests.find(d => 
            query.includes(d.client_name?.toLowerCase()) || 
            query.includes(String(d.id_number))
        );

        if (deed) {
            responseText = `📄 **بيانات الإفراغ:**\n` +
                           `👤 العميل: ${deed.client_name}\n` +
                           `🏠 المشروع: ${deed.project_name}\n` +
                           `📊 الحالة: ${deed.status}\n` +
                           `📅 التاريخ: ${new Date(deed.created_at).toLocaleDateString('ar-SA')}`;
            
            actions.push({ label: 'عرض في سجل الإفراغات', type: 'DEED', data: deed });
        } else {
            responseText = "عذراً، لم أجد إفراغاً بهذا الاسم أو الهوية. يرجى التأكد من البيانات.";
        }
    }

    // 4️⃣ الرد الافتراضي
    if (!responseText) {
        responseText = "لم أفهم طلبك تماماً. جرب سؤالي عن:\n- ملخص عام للنظام\n- حالة مشروع معين (مثال: 'مشروع سرايا')\n- إفراغ عميل محدد بالاسم";
    }

    return { text: responseText, actions };
  };

  const handleSend = (textInput: string = input) => {
    if (!textInput.trim()) return;

    const userMsg: Message = { id: Date.now(), text: textInput, sender: 'user', time: new Date().toLocaleTimeString('ar-SA', {hour: '2-digit', minute:'2-digit'}) };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    setTimeout(() => {
        const { text, actions } = processQuery(textInput);
        const botMsg: Message = { 
            id: Date.now() + 1, 
            text: text, 
            sender: 'bot', 
            time: new Date().toLocaleTimeString('ar-SA', {hour: '2-digit', minute:'2-digit'}),
            actions: actions 
        };
        setMessages(prev => [...prev, botMsg]);
        setIsTyping(false);
    }, 600);
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)} 
        className={`fixed bottom-6 left-6 z-50 bg-[#E95D22] text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-transform duration-300 ${isOpen ? 'hidden' : 'flex'}`}
      >
        <Sparkles size={28} className="animate-pulse" />
      </button>

      {isOpen && (
        <div className="fixed bottom-6 left-6 z-50 w-full max-w-sm bg-white rounded-[30px] shadow-2xl border border-gray-100 overflow-hidden flex flex-col animate-in slide-in-from-bottom-10 duration-300 h-[600px] max-h-[80vh] font-cairo" dir="rtl">
          
          <div className="bg-[#1B2B48] p-5 flex justify-between items-center text-white shadow-md">
            <div className="flex items-center gap-3">
                <div className="bg-white/10 p-2 rounded-xl backdrop-blur-md">
                    <Bot size={24} className="text-[#E95D22]" />
                </div>
                <div>
                    <h3 className="font-bold text-lg">مساعد دار وإعمار</h3>
                    <p className="text-[10px] text-green-400 font-bold">متصل الآن</p>
                </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white/60 hover:text-white hover:bg-white/10 p-2 rounded-full transition-all"><X size={20} /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#f8f9fa] custom-scrollbar">
            {messages.map((msg) => (
                <div key={msg.id} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl p-4 text-sm font-bold leading-relaxed whitespace-pre-line shadow-sm ${msg.sender === 'user' ? 'bg-[#E95D22] text-white rounded-bl-none' : 'bg-white text-[#1B2B48] border border-gray-100 rounded-br-none'}`}>
                        {msg.text}
                    </div>
                    {msg.actions && msg.actions.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                            {msg.actions.map((action, idx) => (
                                <button 
                                    key={idx}
                                    onClick={() => { onNavigate(action.type, action.data); setIsOpen(false); }}
                                    className="flex items-center gap-1.5 bg-[#1B2B48] text-white text-xs font-black px-4 py-2.5 rounded-xl hover:bg-blue-900 transition-all shadow-md"
                                >
                                    {action.label} <ArrowUpLeft size={14} />
                                </button>
                            ))}
                        </div>
                    )}
                    <span className="text-[9px] text-gray-400 mt-1 px-1">{msg.time}</span>
                </div>
            ))}
            
            {isTyping && (
                <div className="flex items-start">
                    <div className="bg-white border border-gray-100 p-3 rounded-2xl flex gap-1">
                        <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce"></span>
                        <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce delay-75"></span>
                        <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce delay-150"></span>
                    </div>
                </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 bg-white border-t border-gray-100">
            <div className="relative flex items-center gap-2">
                <input 
                    type="text" 
                    placeholder="اكتب استفسارك هنا..." 
                    className="w-full pl-4 pr-12 py-3.5 bg-gray-50 border border-gray-200 rounded-[20px] focus:outline-none focus:border-[#E95D22] text-sm font-bold text-[#1B2B48] transition-all" 
                    value={input} 
                    onChange={(e) => setInput(e.target.value)} 
                    onKeyPress={(e) => e.key === 'Enter' && handleSend()} 
                />
                <button 
                    onClick={() => handleSend()} 
                    className={`absolute left-2 p-2 rounded-xl transition-all ${input.trim() ? 'bg-[#1B2B48] text-white shadow-lg' : 'bg-gray-100 text-gray-300'}`}
                    disabled={!input.trim()}
                >
                    <Send size={18} />
                </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AIAssistant;
