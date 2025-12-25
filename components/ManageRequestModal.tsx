import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { User, Comment, TechnicalRequest, ClearanceRequest } from '../types';
import Modal from './Modal';
import { MessageSquare, Send, CheckCircle2, Activity, Edit3, XCircle, User as UserIcon, Phone, FileText, CreditCard, Landmark, MapPin } from 'lucide-react';

interface ManageRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: TechnicalRequest | ClearanceRequest | null;
  currentUser: User | null;
  usersList: any[];
  onUpdateStatus: (newStatus: string) => void;
  onUpdateDelegation: (userId: string) => void;
}

const ManageRequestModal: React.FC<ManageRequestModalProps> = ({
  isOpen, 
  onClose, 
  request, 
  currentUser, 
  usersList,
  onUpdateStatus,
  onUpdateDelegation
}) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  
  // حالة محلية لتخزين الحالة الحالية وعرضها فوراً
  const [currentStatus, setCurrentStatus] = useState('');
  
  const commentsEndRef = useRef<HTMLDivElement>(null);

  const isClearance = request && 'client_name' in request;
  const requestType = isClearance ? 'clearance' : 'technical';
  const clearanceData = request as ClearanceRequest;

  useEffect(() => {
    if (isOpen && request) {
      setCurrentStatus(request.status); // مزامنة الحالة عند الفتح
      fetchComments();
    }
  }, [isOpen, request]);

  const fetchComments = async () => {
    if (!request) return;
    const { data, error } = await supabase
      .from('request_comments')
      .select('*')
      .eq('request_id', request.id.toString())
      .eq('request_type', requestType)
      .order('created_at', { ascending: true });
    
    if (!error && data) {
      setComments(data);
      scrollToBottom();
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleSendComment = async () => {
    if (!newComment.trim() || !currentUser || !request) return;
    setLoading(true);

    const { error } = await supabase.from('request_comments').insert([{
      request_id: request.id.toString(),
      request_type: requestType,
      user_name: currentUser.name || currentUser.email,
      content: newComment
    }]);
    
    if (!error) { 
      setNewComment(''); 
      fetchComments(); 
    } else {
      alert("خطأ: " + error.message);
    }
    setLoading(false);
  };

  // ✅ دالة تغيير الحالة (محدثة لتستجيب فوراً)
  const changeStatus = (newStatus: string) => {
    setCurrentStatus(newStatus); // 1. تغيير اللون فوراً في الشاشة
    onUpdateStatus(newStatus);   // 2. إرسال التحديث لقاعدة البيانات
  };

  // دالة لجلب لون وعنوان الحالة
  const getStatusInfo = (status: string) => {
    switch(status) {
      case 'completed': return { label: 'منجز', color: 'bg-green-100 text-green-700 border-green-200' };
      case 'rejected': return { label: 'مرفوض', color: 'bg-red-100 text-red-700 border-red-200' };
      case 'pending_modification': return { label: 'مطلوب تعديل', color: 'bg-orange-100 text-orange-700 border-orange-200' };
      case 'pending': return { label: 'متابعة', color: 'bg-blue-100 text-blue-700 border-blue-200' };
      default: return { label: 'جديد / قيد المراجعة', color: 'bg-gray-100 text-gray-700 border-gray-200' };
    }
  };

  if (!request) return null;

  const canAction = (roles: string[]) => currentUser && roles.includes(currentUser.role);
  const statusInfo = getStatusInfo(currentStatus);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="تفاصيل ومتابعة الطلب">
      <div className="space-y-6 text-right font-cairo overflow-visible">
        
        {/* --- رأس البطاقة الملون (يتغير فوراً) --- */}
        <div className={`p-5 rounded-[25px] border shadow-sm transition-all duration-300 ${statusInfo.color}`}>
          <div className="flex justify-between items-center">
            <div>
              <p className="text-[10px] opacity-70 font-bold uppercase tracking-wider mb-1">المشروع</p>
              <p className="font-black text-lg">
                {(request as any).project_name || (request as any).client_name || 'غير محدد'}
              </p>
            </div>
            <div className="text-center bg-white/60 px-4 py-2 rounded-xl backdrop-blur-md shadow-sm">
              <p className="text-[10px] opacity-70 font-bold uppercase mb-1">الحالة الحالية</p>
              <span className="font-black text-sm">{statusInfo.label}</span>
            </div>
          </div>
        </div>

        {/* --- بيانات العميل (للإفراغات) --- */}
        {isClearance && (
          <div className="bg-white p-5 rounded-[25px] border border-gray-100 shadow-sm space-y-4">
            <h3 className="font-black text-[#1B2B48] flex items-center gap-2 text-sm border-b pb-2">
              <UserIcon size={16} className="text-[#E95D22]" /> بيانات العميل والصفقة
            </h3>
            <div className="grid grid-cols-2 gap-4">
               <div>
                 <label className="text-[10px] text-gray-400 font-bold block">اسم العميل</label>
                 <p className="font-bold text-[#1B2B48] text-sm">{clearanceData.client_name}</p>
               </div>
               <div>
                 <label className="text-[10px] text-gray-400 font-bold block">رقم الجوال</label>
                 <p className="font-bold text-[#1B2B48] text-sm flex items-center gap-1" dir="ltr">
                   {clearanceData.mobile} <Phone size={12} className="text-gray-400"/>
                 </p>
               </div>
               <div>
                 <label className="text-[10px] text-gray-400 font-bold block">قيمة الصفقة</label>
                 <p className="font-bold text-green-600 text-sm flex items-center gap-1">
                   {clearanceData.deal_value ? parseFloat(clearanceData.deal_value).toLocaleString() : '-'} ر.س 
                   <CreditCard size={12}/>
                 </p>
               </div>
               <div>
                 <label className="text-[10px] text-gray-400 font-bold block">البنك</label>
                 <p className="font-bold text-[#1B2B48] text-sm flex items-center gap-1">
                   {clearanceData.bank_name || '-'} <Landmark size={12} className="text-gray-400"/>
                 </p>
               </div>
               <div>
                 <label className="text-[10px] text-gray-400 font-bold block">رقم الصك</label>
                 <p className="font-bold text-[#1B2B48] text-xs font-mono bg-gray-50 p-1 rounded w-fit">
                   {clearanceData.deed_number || '-'}
                 </p>
               </div>
               <div>
                 <label className="text-[10px] text-gray-400 font-bold block">رقم القطعة</label>
                 <p className="font-bold text-[#1B2B48] text-sm flex items-center gap-1">
                   {clearanceData.plot_number || '-'} <MapPin size={12} className="text-gray-400"/>
                 </p>
               </div>
            </div>
          </div>
        )}

        {/* --- بيانات العمل الفني --- */}
        {!isClearance && (
           <div className="bg-white p-5 rounded-[25px] border border-gray-100 shadow-sm">
             <h3 className="font-black text-[#1B2B48] flex items-center gap-2 text-sm border-b pb-2 mb-3">
               <FileText size={16} className="text-[#E95D22]" /> تفاصيل العمل الفني
             </h3>
             <div className="space-y-3">
               <div>
                 <label className="text-[10px] text-gray-400 font-bold block">بيان العمل</label>
                 <p className="font-bold text-[#1B2B48] text-sm">{(request as TechnicalRequest).service_type}</p>
               </div>
               <div>
                 <label className="text-[10px] text-gray-400 font-bold block">جهة المراجعة</label>
                 <p className="font-bold text-[#1B2B48] text-sm">{(request as TechnicalRequest).reviewing_entity || '-'}</p>
               </div>
               <div>
                 <label className="text-[10px] text-gray-400 font-bold block">التفاصيل</label>
                 <p className="text-xs text-gray-600 font-bold leading-relaxed">{(request as TechnicalRequest).details || 'لا توجد تفاصيل إضافية'}</p>
               </div>
             </div>
           </div>
        )}

        {/* --- أزرار الإجراءات (تعمل فوراً الآن) --- */}
        {canAction(['ADMIN', 'PR_MANAGER', 'TECHNICAL', 'CONVEYANCE']) && (
          <div className="grid grid-cols-4 gap-2">
            <button onClick={() => changeStatus('completed')} className={`p-3 rounded-xl font-black flex flex-col items-center justify-center gap-1 transition-all active:scale-95 ${currentStatus === 'completed' ? 'bg-green-600 text-white shadow-lg ring-2 ring-green-200' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}>
              <CheckCircle2 size={18}/> <span className="text-[10px]">منجز</span>
            </button>
            <button onClick={() => changeStatus('pending')} className={`p-3 rounded-xl font-black flex flex-col items-center justify-center gap-1 transition-all active:scale-95 ${currentStatus === 'pending' ? 'bg-blue-600 text-white shadow-lg ring-2 ring-blue-200' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}>
              <Activity size={18}/> <span className="text-[10px]">متابعة</span>
            </button>
            <button onClick={() => changeStatus('pending_modification')} className={`p-3 rounded-xl font-black flex flex-col items-center justify-center gap-1 transition-all active:scale-95 ${currentStatus === 'pending_modification' ? 'bg-orange-500 text-white shadow-lg ring-2 ring-orange-200' : 'bg-orange-50 text-orange-700 hover:bg-orange-100'}`}>
              <Edit3 size={18}/> <span className="text-[10px]">تعديل</span>
            </button>
            <button onClick={() => changeStatus('rejected')} className={`p-3 rounded-xl font-black flex flex-col items-center justify-center gap-1 transition-all active:scale-95 ${currentStatus === 'rejected' ? 'bg-red-600 text-white shadow-lg ring-2 ring-red-200' : 'bg-red-50 text-red-700 hover:bg-red-100'}`}>
              <XCircle size={18}/> <span className="text-[10px]">مرفوض</span>
            </button>
          </div>
        )}

        {/* --- قسم التعليقات --- */}
        <div className="border-t border-gray-100 pt-6">
            <h3 className="font-black text-[#1B2B48] mb-4 flex items-center gap-2">
              <MessageSquare size={18} className="text-[#E95D22]" /> الملاحظات
            </h3>
            
            <div className="bg-gray-50 rounded-2xl p-4 h-64 overflow-y-auto space-y-3 mb-4 border border-gray-100 shadow-inner">
                {comments.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center opacity-40">
                    <MessageSquare size={40} className="mb-2 text-gray-400" />
                    <p className="text-xs font-bold text-gray-400">لا توجد ملاحظات</p>
                  </div>
                ) : (
                  comments.map(c => (
                    <div key={c.id} className={`p-3 rounded-xl shadow-sm max-w-[85%] ${c.user_name === currentUser?.name ? 'bg-blue-50 mr-auto border border-blue-100' : 'bg-white ml-auto border border-gray-100'}`}>
                        <div className="flex justify-between items-center mb-1 gap-4">
                            <span className="font-black text-[10px] text-[#1B2B48]">{c.user_name}</span>
                            <div className="flex items-center gap-1 text-[9px] text-gray-400 font-bold">
                              <span dir="ltr">{new Date(c.created_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute:'2-digit' })}</span>
                            </div>
                        </div>
                        <p className="text-xs text-gray-700 font-bold leading-relaxed whitespace-pre-wrap">{c.content}</p>
                    </div>
                  ))
                )}
                <div ref={commentsEndRef} />
            </div>

            <div className="flex gap-2 p-2 bg-white rounded-2xl border border-gray-200 focus-within:border-[#E95D22] focus-within:ring-2 focus-within:ring-[#E95D22]/10 transition-all shadow-sm">
                <input 
                  value={newComment} 
                  onChange={e => setNewComment(e.target.value)} 
                  onKeyDown={e => e.key === 'Enter' && !loading && handleSendComment()} 
                  placeholder="اكتب ملاحظة..." 
                  className="flex-1 bg-transparent border-none p-2 outline-none text-sm font-bold placeholder:text-gray-300"
                  disabled={loading}
                />
                <button 
                  onClick={handleSendComment} 
                  disabled={loading || !newComment.trim()}
                  className="bg-[#1B2B48] text-white p-3 rounded-xl hover:bg-[#E95D22] transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center"
                >
                  <Send size={16}/>
                </button>
            </div>
        </div>
      </div>
    </Modal>
  );
};

export default ManageRequestModal;