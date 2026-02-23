import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { User, Comment, TechnicalRequest, ClearanceRequest } from '../types';
import Modal from './Modal';
import { MessageSquare, Send, User as UserIcon, Phone, FileText, CreditCard, Landmark, UserCheck, Loader2, GitBranch } from 'lucide-react';
import { notificationService } from '../services/notificationService';
import ApprovalPanel from './ApprovalPanel';
import { canApproveWorkflowRequest } from '../services/requestWorkflowService';

interface ManageRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: TechnicalRequest | ClearanceRequest | null;
  currentUser: User | null;
  usersList: any[];
  onUpdateStatus: (newStatus: string, reason?: string) => Promise<void>;
  onUpdateDelegation: (userId: string) => void;
}

const ManageRequestModal: React.FC<ManageRequestModalProps> = ({
  isOpen, 
  onClose, 
  request, 
  currentUser, 
  onUpdateStatus
}) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [currentStatus, setCurrentStatus] = useState('');
  const commentsEndRef = useRef<HTMLDivElement>(null);

  const isClearance = request && 'client_name' in request;
  const requestType = isClearance ? 'clearance' : 'technical';

  useEffect(() => {
    if (isOpen && request) {
      setCurrentStatus(request?.status || '');
      fetchComments();
    }
  }, [isOpen, request]);

  const fetchComments = async () => {
    if (!request?.id) return;
    setFetchLoading(true);
    try {
      const { data, error } = await supabase
        .from('request_comments')
        .select('*')
        .eq('request_id', request?.id)
        .eq('request_type', requestType)
        .order('created_at', { ascending: true });
      
      if (error) {
        setComments([]);
      } else {
        setComments(data || []);
        scrollToBottom();
      }
    } catch (err) {
      setComments([]);
    } finally {
      setFetchLoading(false);
    }
  };

  const scrollToBottom = () => {
    if (commentsEndRef.current) {
      setTimeout(() => {
        commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  };

  const handleSendComment = async () => {
    if (!newComment.trim() || !currentUser || !request?.id) return;
    setLoading(true);

    try {
      const { error } = await supabase.from('request_comments').insert([{
        request_id: request?.id,
        request_type: requestType,
        user_name: currentUser?.name || currentUser?.email,
        content: newComment.trim()
      }]);
      
      if (error) throw error;

      // تنبيه الجهات المعنية عند إضافة تعليق
      const targetRole = requestType === 'technical' ? 'TECHNICAL' : 'PR_MANAGER';
      const requestTitle = isClearance ? (request as ClearanceRequest).client_name : (request as TechnicalRequest).service_type;
      const link = requestType === 'technical' ? '/technical' : '/deeds';

      notificationService.send(
        targetRole,
        `💬 ملاحظة فنية جديدة على: ${requestTitle}`,
        link,
        currentUser?.name
      );

      setNewComment(''); 
      await fetchComments(); 
    } catch (err: any) {
      console.error("Failed to post comment:", err);
    } finally {
      setLoading(false);
    }
  };

  const changeStatusWithReason = async (newStatus: string, reason: string) => {
    if (!request?.id) return;
    const previousStatus = currentStatus;
    setCurrentStatus(newStatus);
    try {
      await onUpdateStatus(newStatus, reason);
    } catch (err) {
      setCurrentStatus(previousStatus);
    }
  };

  const getStatusInfo = (status: string) => {
    switch(status) {
      case 'completed': 
      case 'منجز':
        return { label: 'منجز ✅', color: 'bg-green-100 text-green-700 border-green-200' };
      case 'rejected': 
      case 'مرفوض':
        return { label: 'مرفوض ❌', color: 'bg-red-100 text-red-700 border-red-200' };
      case 'pending_modification': 
      case 'مطلوب تعديل':
        return { label: 'مطلوب تعديل ⚠️', color: 'bg-orange-100 text-orange-700 border-orange-200' };
      case 'pending': 
      case 'متابعة':
        return { label: 'قيد المتابعة ⏳', color: 'bg-blue-100 text-blue-700 border-blue-200' };
      case 'in_progress':
        return { label: 'قيد التنفيذ 🔄', color: 'bg-blue-100 text-blue-700 border-blue-200' };
      case 'under_review':
        return { label: 'قيد المراجعة 🔍', color: 'bg-purple-100 text-purple-700 border-purple-200' };
      case 'approved':
      case 'معتمد':
        return { label: 'معتمد ✅', color: 'bg-green-100 text-green-700 border-green-200' };
      case 'cancelled':
      case 'ملغي':
        return { label: 'ملغي 🚫', color: 'bg-gray-100 text-gray-700 border-gray-200' };
      default: 
        return { label: 'جديد 🆕', color: 'bg-gray-100 text-gray-700 border-gray-200' };
    }
  };

  if (!request) return null;

  const isDirectApprover = canApproveWorkflowRequest(currentUser?.name, (request as TechnicalRequest)?.assigned_to);
  const statusInfo = getStatusInfo(currentStatus);
  const reviewers = Array.from(new Set((comments || []).map((comment) => comment.user_name).filter(Boolean)));
  const timelineItems = [
    {
      id: 'submitted',
      title: 'تم تقديم الطلب',
      actor: (request as any)?.submitted_by || 'غير محدد',
      date: (request as any)?.created_at
    },
    ...reviewers.map((reviewerName, index) => ({
      id: `review-${index}`,
      title: 'مراجعة الطلب',
      actor: reviewerName,
      date: (comments || []).find((comment) => comment.user_name === reviewerName)?.created_at
    })),
    ((currentStatus === 'approved' || currentStatus === 'rejected' || currentStatus === 'مرفوض') ? {
      id: 'final-decision',
      title: currentStatus === 'approved' ? 'اعتماد نهائي' : 'رفض نهائي',
      actor: (request as TechnicalRequest)?.assigned_to || 'غير محدد',
      date: (request as any)?.updated_at || (request as any)?.created_at
    } : null)
  ].filter(Boolean) as Array<{ id: string; title: string; actor: string; date?: string }>;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="تفاصيل ومتابعة الطلب">
      <div className="space-y-6 text-right font-cairo overflow-visible">
        
        <div className={`p-5 rounded-[25px] border shadow-sm transition-all duration-300 ${statusInfo.color}`}>
          <div className="flex justify-between items-center">
            <div>
              <p className="text-[10px] opacity-70 font-bold uppercase tracking-wider mb-1">المشروع</p>
              <p className="font-black text-lg">
                {(request as any)?.project_name || (request as any)?.client_name || 'غير محدد'}
              </p>
            </div>
            <div className="text-center bg-white/60 px-4 py-2 rounded-xl backdrop-blur-md shadow-sm min-w-[120px]">
              <p className="text-[10px] opacity-70 font-bold uppercase mb-1">الحالة الحالية</p>
              <span className="font-black text-sm">{statusInfo?.label}</span>
            </div>
          </div>
        </div>

        {isClearance ? (
          <div className="bg-white p-5 rounded-[25px] border border-gray-100 shadow-sm space-y-4">
            <h3 className="font-black text-[#1B2B48] flex items-center gap-2 text-sm border-b pb-2">
              <UserIcon size={16} className="text-[#E95D22]" /> بيانات العميل والصفقة
            </h3>
            <div className="grid grid-cols-2 gap-4 text-right">
               <div>
                 <label className="text-[10px] text-gray-400 font-bold block">اسم العميل</label>
                 <p className="font-bold text-[#1B2B48] text-sm">{(request as ClearanceRequest)?.client_name || '-'}</p>
               </div>
               <div>
                 <label className="text-[10px] text-gray-400 font-bold block">رقم الجوال</label>
                 <p className="font-bold text-[#1B2B48] text-sm flex items-center gap-1 justify-end" dir="ltr">
                   {(request as ClearanceRequest)?.mobile || '-'} <Phone size={12} className="text-gray-400"/>
                 </p>
               </div>
               <div>
                 <label className="text-[10px] text-gray-400 font-bold block">تم الإنشاء بواسطة</label>
                 <p className="font-bold text-[#E95D22] text-sm flex items-center gap-1 justify-end">
                   {(request as ClearanceRequest)?.submitted_by || '-'} <UserCheck size={12}/>
                 </p>
               </div>
               <div>
                 <label className="text-[10px] text-gray-400 font-bold block">قيمة الصفقة</label>
                 <p className="font-bold text-green-600 text-sm flex items-center gap-1 justify-end">
                   {(request as ClearanceRequest)?.sale_price ? parseFloat((request as ClearanceRequest)?.sale_price || '0').toLocaleString() : '-'} ر.س 
                   <CreditCard size={12}/>
                 </p>
               </div>
               <div>
                 <label className="text-[10px] text-gray-400 font-bold block">البنك</label>
                 <p className="font-bold text-[#1B2B48] text-sm flex items-center gap-1 justify-end">
                   {(request as ClearanceRequest)?.bank_name || '-'} <Landmark size={12} className="text-gray-400"/>
                 </p>
               </div>
               <div>
                 <label className="text-[10px] text-gray-400 font-bold block">رقم الصك</label>
                 <p className="font-bold text-[#1B2B48] text-xs font-mono bg-gray-50 p-1 rounded w-fit mr-auto">
                   {(request as ClearanceRequest)?.deed_number || '-'}
                 </p>
               </div>
            </div>
          </div>
        ) : (
           <div className="bg-white p-5 rounded-[25px] border border-gray-100 shadow-sm">
             <h3 className="font-black text-[#1B2B48] flex items-center gap-2 text-sm border-b pb-2 mb-3">
               <FileText size={16} className="text-[#E95D22]" /> تفاصيل العمل الفني
             </h3>
             <div className="space-y-4">
               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="text-[10px] text-gray-400 font-bold block">بيان العمل</label>
                   <p className="font-bold text-[#1B2B48] text-sm">{(request as TechnicalRequest)?.service_type}</p>
                 </div>
                 <div>
                   <label className="text-[10px] text-gray-400 font-bold block">جهة المراجعة</label>
                   <p className="font-bold text-[#1B2B48] text-sm">{(request as TechnicalRequest)?.reviewing_entity || '-'}</p>
                 </div>
               </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] text-gray-400 font-bold block">المسؤول المباشر</label>
                    <p className="font-bold text-[#1B2B48] text-sm">{(request as TechnicalRequest)?.assigned_to || '-'}</p>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 font-bold block">نسخة للعلم (CC)</label>
                    <p className="font-bold text-[#1B2B48] text-sm">{(request as any)?.workflow_cc || '-'}</p>
                  </div>
                </div>
               <div>
                 <label className="text-[10px] text-gray-400 font-bold block">التفاصيل</label>
                 <p className="text-xs text-gray-600 font-bold leading-relaxed">{(request as TechnicalRequest)?.details || 'لا توجد تفاصيل إضافية'}</p>
               </div>
             </div>
           </div>
        )}

          {isDirectApprover && (
            <ApprovalPanel
              title="لوحة اعتماد المسؤول المباشر"
              onApprove={(reason) => changeStatusWithReason('approved', reason)}
              onReject={(reason) => changeStatusWithReason('rejected', reason)}
            />
          )}

          <div className="bg-white p-5 rounded-[25px] border border-gray-100 shadow-sm space-y-3">
            <h3 className="font-black text-[#1B2B48] text-sm flex items-center gap-2">
              <GitBranch size={16} className="text-[#E95D22]" />
              الشريط الزمني للطلب
            </h3>
            <div className="space-y-3">
              {timelineItems.map((item) => (
                <div key={item.id} className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-[#E95D22] mt-2" />
                  <div className="flex-1">
                    <p className="text-xs font-black text-[#1B2B48]">{item.title}</p>
                    <p className="text-[11px] text-gray-500 font-bold">{item.actor}</p>
                    <p className="text-[10px] text-gray-400 font-bold" dir="ltr">{item.date ? new Date(item.date).toLocaleString('ar-SA') : '-'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        <div className="border-t border-gray-100 pt-6">
            <h3 className="font-black text-[#1B2B48] mb-4 flex items-center gap-2">
              <MessageSquare size={18} className="text-[#E95D22]" /> التحديثات والملاحظات
            </h3>
            
            <div className="bg-gray-50 rounded-2xl p-4 h-64 overflow-y-auto space-y-3 mb-4 border border-gray-100 shadow-inner relative custom-scrollbar">
                {fetchLoading ? (
                  <div className="h-full flex items-center justify-center">
                    <Loader2 size={24} className="animate-spin text-blue-500" />
                  </div>
                ) : (!comments || comments?.length === 0) ? (
                  <div className="h-full flex flex-col items-center justify-center opacity-40">
                    <MessageSquare size={40} className="mb-2 text-gray-400" />
                    <p className="text-xs font-bold text-gray-400">لا توجد ملاحظات</p>
                  </div>
                ) : (
                  comments?.map((c: any) => (
                    <div key={c?.id} className={`p-3 rounded-xl shadow-sm max-w-[85%] ${c?.user_name === currentUser?.name ? 'bg-blue-50 mr-auto border border-blue-100' : 'bg-white ml-auto border border-gray-100'}`}>
                        <div className="flex justify-between items-center mb-1 gap-4">
                            <span className="font-black text-[10px] text-[#1B2B48]">{c?.user_name}</span>
                            <div className="flex items-center gap-1 text-[9px] text-gray-400 font-bold">
                              <span dir="ltr">{c?.created_at ? new Date(c?.created_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute:'2-digit' }) : ''}</span>
                            </div>
                        </div>
                        <p className="text-xs text-gray-700 font-bold leading-relaxed whitespace-pre-wrap">{c?.content}</p>
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
                  placeholder="اكتب ملاحظة أو تحديثاً..." 
                  className="flex-1 bg-transparent border-none p-2 outline-none text-sm font-bold placeholder:text-gray-300"
                  disabled={loading}
                />
                <button 
                  onClick={handleSendComment} 
                  disabled={loading || !newComment.trim()}
                  className="bg-[#1B2B48] text-white p-3 rounded-xl hover:bg-[#E95D22] transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16}/>}
                </button>
            </div>
        </div>
      </div>
    </Modal>
  );
};

export default ManageRequestModal;