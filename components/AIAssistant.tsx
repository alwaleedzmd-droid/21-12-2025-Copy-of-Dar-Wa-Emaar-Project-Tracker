import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Sparkles, Bot, BarChart3, ArrowUpLeft, Search, Zap, CheckCircle2, AlertCircle } from 'lucide-react';

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
  
  // رسالة ترحيبية ذكية ومتغيرة حسب الوقت
  const getGreeting = () => {
      const hour = new Date().getHours();
      const greeting = hour < 12 ? 'صباح الخير ☀️' : 'مساء الخير 🌙';
      return `${greeting}، أنا مساعدك الذكي.\nاكتب اسم أي مشروع أو عميل وسأعطيك التفاصيل فوراً.`;
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

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isTyping]);

  // --- 🛠️ دالة تنظيف واستخراج اسم العمل ---
  const getWorkTitle = (work: any) => {
      if (work.service_type) return work.service_type; // الأولوية لنوع الخدمة
      if (work.title) return work.title;
      if (work.request_type) {
          const map: any = { 'electricity': '⚡ كهرباء', 'water': '💧 مياه', 'paint': '🎨 دهانات', 'maintenance': '🔧 صيانة' };
          return map[work.request_type] || work.request_type;
      }
      return work.description ? work.description.substring(0, 25) + '...' : 'عمل إداري/فني';
  };

  // --- 🧠 المحرك الذكي المطور (NLP-Lite) ---
  const processQuery = (rawQuery: string) => {
    const query = rawQuery.toLowerCase().trim();
    let responseText = "";
    let actions: ActionButton[] = [];

    // الكلمات المفتاحية للفهم (Keywords)
    const intentProject = query.includes('مشروع') || query.includes('وضع') || query.includes('اخبار') || query.includes('تفاصيل') || query.includes('وش') || query.includes('ابي');
    const intentDeed = query.includes('افراغ') || query.includes('صك') || query.includes('عميل') || query.includes('هوية');
    const intentSummary = query.includes('ملخص') || query.includes('تقرير') || query.includes('حالة') || query.includes('عام');

    // 1️⃣ البحث الذكي عن المشاريع (Fuzzy Search)
    // نبحث عن أي مشروع يحتوي اسمه على جزء من نص المستخدم
    const matchedProjects = projects.filter(p => query.includes(p.name.toLowerCase()) || p.name.toLowerCase().includes(query));
    
    // إذا وجدنا مشروعاً واحداً مطابقاً تماماً أو جزئياً
    if (matchedProjects.length === 1) {
        const project = matchedProjects[0];
        
        // جلب الأعمال
        const works = [...technicalRequests, ...clearanceRequests].filter(r => r.project_name === project.name);
        
        // تحليل الحالة
        const completed = works.filter(w => w.status === 'completed' || w.status === 'منجز').length;
        const pending = works.length - completed;
        const completionRate = works.length > 0 ? Math.round((completed / works.length) * 100) : 0;

        // أهم 5 أعمال حديثة (غير المنجزة أولاً)
        const recentWorks = works
            .sort((a, b) => (a.status === 'completed' ? 1 : -1)) // ترتيب: غير المنجز أولاً
            .slice(0, 5)
            .map(w => `• ${getWorkTitle(w)} (${w.status === 'completed' || w.status === 'منجز' ? '✅' : '⏳'})`)
            .join('\n');

        responseText = `🏗️ **${project.name}**\n` +
                       `📍 ${project.location || 'الرياض'} | 📊 الإنجاز: ${completionRate}%\n` +
                       `ــــــــــــــــــــــــــــــــــــــــــــــــ\n` +
                       `⚡ **حالة الأعمال (${works.length}):**\n` +
                       (recentWorks || "لا توجد أعمال مسجلة حالياً.") + 
                       `\n\n💡 **المقاولين:**\n` + 
                       `- كهرباء: ${project.electricity_contractor || 'غير محدد'}\n` +
                       `- مياه: ${project.water_contractor || 'غير محدد'}`;

        actions.push({ label: `فتح ${project.name}`, type: 'PROJECT', data: project });
    
    } 
    // إذا وجدنا أكثر من مشروع (Ambiguous)
    else if (matchedProjects.length > 1) {
        responseText = "وجدنا أكثر من مشروع بهذا الاسم، أيهم تقصد؟ 👇";
        matchedProjects.slice(0, 4).forEach(p => {
            actions.push({ label: p.name, type: 'PROJECT', data: p });
        });
    }
    
    // 2️⃣ البحث عن إفراغ (بالاسم أو الهوية)
    else if (intentDeed || (!intentProject && !intentSummary && query.length > 2)) {
        // محاولة البحث في الإفراغات حتى لو لم يكتب "إفراغ"
        const deed = deedsRequests.find(d => 
            query.includes(d.client_name?.toLowerCase()) || 
            query.includes(String(d.id_number))
        );

        if (deed) {
            responseText = `👤 **العميل:** ${deed.client_name}\n` +
                           `🆔 **الهوية:** ${deed.id_number}\n` +
                           `🏠 **المشروع:** ${deed.project_name}\n` +
                           `ــــــــــــــــــــــــــــــــــــــــــــــــ\n` +
                           `📊 **الحالة:** ${deed.status} ${deed.status === 'منجز' ? '✅' : '⏳'}\n` +
                           `💰 **القيمة:** ${Number(deed.unit_value).toLocaleString()} ر.س`;
            
            if (deed.sakani_support_number) responseText += `\n✅ **دعم سكني:** ${deed.sakani_support_number}`;
            
            actions.push({ label: 'عرض السجل', type: 'DEED', data: deed });
        } else if (intentDeed) {
            responseText = "لم أجد إفراغاً بهذا الاسم. تأكد من صحة الاسم أو رقم الهوية.";
        }
    }

    // 3️⃣ الملخص العام (Fallback للإحصائيات)
    if (!responseText && (intentSummary || query === 'ملخص')) {
        const total = projects.length;
        const deeds = deedsRequests.length;
        const tech = technicalRequests.length;
        responseText = `📊 **نظرة سريعة:**\n🏢 ${total} مشروع\n📝 ${deeds} إفراغ\n🔧 ${tech} طلب فني\n\nاكتب اسم أي مشروع للتفاصيل.`;
    }

    // 4️⃣ الرد الافتراضي (اقتراحات)
    if (!responseText) {
        responseText = "لم أتعرف على هذا الاسم في النظام 🤔\nجرب كتابة اسم المشروع مباشرة (مثل: 'النرجس' أو 'سرايا') أو اسم العميل.";
    }

    return { text: responseText, actions };
  };

  const handleSend = (textInput: string = input) => {
    if (!textInput.trim()) return;

    const userMsg: Message = { id: Date.now(), text: textInput, sender: 'user', time: new Date().toLocaleTimeString('ar-SA', {hour: '2-digit', minute:'2-digit'}) };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    // محاكاة ذكية للتفكير (تأخير بسيط)
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
    }, 700);
  };

  return (
    <>
      <button onClick={() => setIsOpen(true)} className={`fixed bottom-6 left-6 z-50 bg-[#E95D22] text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-transform duration-300 ${isOpen ? 'hidden' : 'flex'}`}>
        <Sparkles size={28} className="animate-pulse" />
      </button>

      {isOpen && (
        <div className="fixed bottom-6 left-6 z-50 w-full max-w-sm bg-white rounded-[30px] shadow-2xl border border-gray-100 overflow-hidden flex flex-col animate-in slide-in-from-bottom-10 duration-300 h-[600px] max-h-[80vh] font-cairo" dir="rtl">
          
          {/* Header */}
          <div className="bg-[#1B2B48] p-5 flex justify-between items-center text-white shadow-md">
            <div className="flex items-center gap-3">
                <div className="bg-white/10 p-2 rounded-xl backdrop-blur-md relative">
                    <Bot size={24} className="text-[#E95D22]" />
                    <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-[#1B2B48]"></span>
                </div>
                <div>
                    <h3 className="font-bold text-lg">مساعدك الذكي</h3>
                    <p className="text-[10px] text-gray-300 opacity-80">جاهز للإجابة...</p>
                </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white/60 hover:text-white hover:bg-white/10 p-2 rounded-full transition-all"><X size={20} /></button>
          </div>

          {/* Messages Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-5 bg-[#f8f9fa] custom-scrollbar">
            {messages.map((msg) => (
                <div key={msg.id} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-2`}>
                    <div className={`max-w-[85%] rounded-2xl p-4 text-sm font-medium leading-relaxed whitespace-pre-line shadow-sm ${msg.sender === 'user' ? 'bg-[#E95D22] text-white rounded-bl-none' : 'bg-white text-[#1B2B48] border border-gray-100 rounded-br-none'}`}>
                        {msg.text}
                    </div>
                    
                    {/* Action Chips */}
                    {msg.actions && msg.actions.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2 w-full">
                            {msg.actions.map((action, idx) => (
                                <button 
                                    key={idx}
                                    onClick={() => {
                                        onNavigate(action.type, action.data);
                                        // Optional: Close chat on navigate
                                        // setIsOpen(false); 
                                    }}
                                    className="flex items-center gap-1.5 bg-blue-50 text-[#1B2B48] text-xs font-bold px-4 py-2 rounded-xl hover:bg-[#1B2B48] hover:text-white transition-all shadow-sm border border-blue-100"
                                >
                                    {action.type === 'PROJECT' ? <BarChart3 size={14}/> : <Search size={14}/>}
                                    {action.label} 
                                    <ArrowUpLeft size={14} />
                                </button>
                            ))}
                        </div>
                    )}
                    <span className="text-[9px] text-gray-400 mt-1 px-1 opacity-70">{msg.time}</span>
                </div>
            ))}
            
            {/* Typing Indicator */}
            {isTyping && (
                <div className="flex items-start">
                    <div className="bg-white border border-gray-100 p-3 rounded-2xl rounded-br-none shadow-sm flex gap-1">
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-75"></span>
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-150"></span>
                    </div>
                </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestions */}
          {messages.length < 2 && (
             <div className="px-4 py-2 bg-white/50 backdrop-blur-sm flex gap-2 overflow-x-auto no-scrollbar">
                {['📊 ملخص عام', '🏗️ مشاريع الرياض', '📝 أحدث الإفراغات'].map((s, i) => (
                    <button key={i} onClick={() => handleSend(s)} className="text-[10px] font-bold bg-white border border-gray-200 text-gray-600 px-3 py-1.5 rounded-full hover:border-[#E95D22] hover:text-[#E95D22] transition-colors whitespace-nowrap shadow-sm">
                        {s}
                    </button>
                ))}
             </div>
          )}

          {/* Input Area */}
          <div className="p-4 bg-white border-t border-gray-100">
            <div className="relative flex items-center gap-2">
                <input 
                    type="text" 
                    placeholder="اكتب اسم المشروع أو العميل..." 
                    className="w-full pl-4 pr-12 py-3.5 bg-gray-50 border border-gray-200 rounded-[20px] focus:outline-none focus:border-[#E95D22] focus:bg-white text-sm font-bold text-[#1B2B48] transition-all placeholder:text-gray-400" 
                    value={input} 
                    onChange={(e) => setInput(e.target.value)} 
                    onKeyPress={(e) => e.key === 'Enter' && handleSend()} 
                />
                <button 
                    onClick={() => handleSend()} 
                    className={`absolute left-2 p-2 rounded-xl transition-all ${input.trim() ? 'bg-[#E95D22] text-white shadow-lg shadow-orange-100 scale-100' : 'bg-transparent text-gray-300 scale-90'}`}
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