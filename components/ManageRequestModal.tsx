
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { User, Comment, TechnicalRequest, ClearanceRequest } from '../types';
import Modal from './Modal';
import { MessageSquare, Send, CheckCircle2, Activity, Edit3, XCircle, Clock, User as UserIcon } from 'lucide-react';

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

  useEffect(() => {
    if (isOpen && request) {
      fetchComments();
    }
  }, [isOpen, request]);

  const fetchComments = async () => {
    if (!request) return;
    const { data, error } = await supabase
      .from('request_comments')
      .select('*')
      .eq('request_id', request.id)
      .eq('request_type', 'client_name' in request ? 'clearance' : 'technical')
      .order('created_at', { ascending: true });
    
    if (!error && data) {
      setComments(data);
    }
  };

  const handleSendComment = async () => {
    if (!newComment.trim() || !currentUser || !request) return;
    setLoading(true);
    const { error } = await supabase.from('request_comments').insert([{
      request_id: request.id,
      request_type: 'client_name' in request ? 'clearance' : 'technical',
      user_name: currentUser.name || currentUser.email,
      content: newComment
    }]);
    
    if (!error) { 
      setNewComment(''); 
      fetchComments(); 
    } else {
      alert("خطأ أثناء إضافة التعليق: " + error.message);
    }
    setLoading(false);
  };

  if (!request) return null;

  const isClearance = 'client_name' in request;
  const canAction = (roles: string[]) => currentUser && roles.includes(currentUser.role);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="متابعة وإدارة الطلب">
      <div className="space-y-6 text-right font-cairo overflow-visible">
        {/* Request Details Header */}
        <div className="bg-gray-50 p-5 rounded-[25px] border border-gray-100 shadow-inner">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">المشروع</p>
              <p className="font-black text-[#1B2B48] text-lg">{request.project_name || (request as any).client_name || 'غير محدد'}</p>
            </div>
            <div className="text-left">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">الحالة</p>
              <span className={`px-3 py-1 rounded-full text-[10px] font-black ${request.status === 'completed' || request.status === 'منجز' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                {request.status === 'completed' || request.status === 'منجز' ? 'منجز' : request.status}
              </span>
            </div>
          </div>
          <div>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">الخدمة / البيان</p>
            <p className="font-bold text-[#1B2B48]">{isClearance ? 'إجراءات إفراغ' : (request as TechnicalRequest).service_type}</p>
          </div>
        </div>

        {/* Responsible Person Selection */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100">
          <label className="text-[10px] text-gray-400 font-black mb-2 block uppercase">المسؤول عن المتابعة</label>
          <div className="relative">
            <UserIcon size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300" />
            <select 
              className="w-full font-bold text-[#1B2B48] bg-gray-50 pr-10 py-3 rounded-xl outline-none appearance-none border border-transparent focus:border-[#E95D22] transition-all" 
              value={request.assigned_to || ''} 
              onChange={(e) => onUpdateDelegation(e.target.value)}
            >
              <option value="">غير محدد</option>
              {usersList.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        {canAction(['ADMIN', 'PR_MANAGER', 'TECHNICAL', 'CONVEYANCE']) && (
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => onUpdateStatus('completed')} className="bg-green-50 text-green-700 p-4 rounded-2xl font-black hover:bg-green-100 flex flex-col items-center gap-1 border border-green-100 transition-all"><CheckCircle2 size={24}/> منجز</button>
            <button onClick={() => onUpdateStatus('pending')} className="bg-blue-50 text-blue-700 p-4 rounded-2xl font-black hover:bg-blue-100 flex flex-col items-center gap-1 border border-blue-100 transition-all"><Activity size={24}/> متابعة</button>
            <button onClick={() => onUpdateStatus('pending_modification')} className="bg-orange-50 text-orange-700 p-4 rounded-2xl font-black hover:bg-orange-100 flex flex-col items-center gap-1 border border-orange-100 transition-all"><Edit3 size={24}/> تعديل</button>
            <button onClick={() => onUpdateStatus('rejected')} className="bg-red-50 text-red-700 p-4 rounded-2xl font-black hover:bg-red-100 flex flex-col items-center gap-1 border border-red-100 transition-all"><XCircle size={24}/> مرفوض</button>
          </div>
        )}

        {/* Comments Section */}
        <div className="border-t border-gray-100 pt-6">
            <h3 className="font-black text-[#1B2B48] mb-4 flex items-center gap-2">
              <MessageSquare size={18} className="text-[#E95D22]" /> التعليقات والملاحظات
            </h3>
            
            <div className="bg-gray-50 rounded-2xl p-4 h-64 overflow-y-auto space-y-3 mb-4 border border-gray-100 no-scrollbar shadow-inner">
                {comments.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center opacity-30">
                    <MessageSquare size={48} className="mb-2" />
                    <p className="text-sm font-bold">لا توجد تعليقات بعد</p>
                  </div>
                ) : (
                  comments.map(c => (
                    <div key={c.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-50 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-center mb-2">
                            <span className="font-black text-xs text-[#1B2B48]">{c.user_name}</span>
                            <div className="flex items-center gap-1 text-[9px] text-gray-400 font-bold">
                              <Clock size={10} />
                              <span dir="ltr">{new Date(c.created_at).toLocaleString('ar-SA', { dateStyle: 'short', timeStyle: 'short' })}</span>
                            </div>
                        </div>
                        <p className="text-sm text-gray-600 leading-relaxed font-bold">{c.content}</p>
                    </div>
                  ))
                )}
            </div>

            <div className="flex gap-2 p-2 bg-gray-50 rounded-2xl border border-gray-100 focus-within:border-[#E95D22] transition-all">
                <input 
                  value={newComment} 
                  onChange={e => setNewComment(e.target.value)} 
                  onKeyDown={e => e.key === 'Enter' && !loading && handleSendComment()} 
                  placeholder="اكتب ملاحظة أو تحديث هنا..." 
                  className="flex-1 bg-transparent border-none p-3 outline-none text-sm font-bold placeholder:text-gray-300"
                  disabled={loading}
                />
                <button 
                  onClick={handleSendComment} 
                  disabled={loading || !newComment.trim()}
                  className="bg-[#1B2B48] text-white p-3 rounded-xl hover:bg-[#E95D22] transition-all active:scale-95 disabled:opacity-50"
                >
                  <Send size={18}/>
                </button>
            </div>
        </div>
      </div>
    </Modal>
  );
};

export default ManageRequestModal;
