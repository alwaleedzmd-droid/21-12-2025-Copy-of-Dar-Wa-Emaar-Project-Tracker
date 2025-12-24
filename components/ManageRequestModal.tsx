
import React, { useState } from 'react';
import { 
  X, Send, CheckCircle2, XCircle, RotateCcw, 
  MessageSquare, User as UserIcon, Activity, 
  ShieldCheck, AlertCircle, Landmark, Edit3 
} from 'lucide-react';
import { User, TechnicalRequest, ClearanceRequest, Comment } from '../types';
import Modal from './Modal';

interface ManageRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: TechnicalRequest | ClearanceRequest | null;
  currentUser: User | null;
  usersList: any[];
  onUpdateStatus: (status: string) => void;
  onUpdateDelegation: (userId: string) => void;
  onAddComment: (text: string) => void;
  comments: Comment[];
}

const ManageRequestModal: React.FC<ManageRequestModalProps> = ({
  isOpen,
  onClose,
  request,
  currentUser,
  usersList,
  onUpdateStatus,
  onUpdateDelegation,
  onAddComment,
  comments
}) => {
  const [newComment, setNewComment] = useState('');

  if (!request) return null;

  const isClearance = 'client_name' in request;
  const canAction = (roles: string[]) => currentUser && roles.includes(currentUser.role);

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'completed': case 'منجز': 
        return <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 w-fit"><CheckCircle2 size={12}/> منجز</span>;
      case 'rejected': case 'مرفوض': 
        return <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 w-fit"><XCircle size={12}/> مرفوض</span>;
      case 'pending_modification': case 'تعديل': 
        return <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 w-fit"><AlertCircle size={12}/> مطلوب تعديل</span>;
      case 'pending_pr': 
        return <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 w-fit"><ShieldCheck size={12}/> بانتظار الاعتماد</span>;
      case 'new': 
        return <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 w-fit"><Activity size={12}/> جديد</span>;
      default: 
        return <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-[10px] font-bold w-fit">قيد المراجعة</span>;
    }
  };

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newComment.trim()) {
      onAddComment(newComment);
      setNewComment('');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="إدارة الطلب والتعليقات">
      <div className="space-y-6 text-right font-cairo">
        {/* Request Header Info */}
        <div className="p-6 bg-gray-50 rounded-[30px] border border-gray-100 flex justify-between shadow-inner">
          <div>
            <h3 className="font-black text-xl text-[#1B2B48]">
              {isClearance ? (request as ClearanceRequest).client_name : (request as TechnicalRequest).service_type}
            </h3>
            <p className="text-sm text-gray-500 font-bold">المشروع: {request.project_name}</p>
          </div>
          {getStatusBadge(request.status)}
        </div>

        {/* Responsible Person Selection */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-xs text-gray-400 mb-2 font-bold">الشخص المسؤول</p>
          <div className="flex items-center gap-2">
            <UserIcon size={18} className="text-gray-400" />
            <select 
              className="font-bold text-[#E95D22] bg-transparent outline-none w-full" 
              value={request.assigned_to || ''} 
              onChange={(e) => onUpdateDelegation(e.target.value)}
            >
              <option value="">غير محدد</option>
              {usersList.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
            </select>
          </div>
        </div>

        {/* --- Workflow Actions --- */}
        <div className="grid grid-cols-1 gap-3">
          {isClearance ? (
            /* Clearance Workflow */
            <>
              {(request.status === 'new' || request.status === 'pending_modification') && canAction(['CONVEYANCE', 'ADMIN']) && (
                <button 
                  onClick={() => onUpdateStatus('pending_pr')} 
                  className="w-full bg-indigo-600 text-white p-5 rounded-2xl font-black shadow-lg hover:brightness-110 flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  <Send size={20} /> إرسال للاعتماد (Submit for Approval)
                </button>
              )}

              {request.status === 'pending_pr' && canAction(['PR_MANAGER', 'ADMIN']) && (
                <div className="space-y-4">
                  <button 
                    onClick={() => onUpdateStatus('completed')} 
                    className="w-full bg-green-600 text-white p-5 rounded-2xl font-black shadow-lg hover:brightness-110 flex items-center justify-center gap-2 transition-all active:scale-95"
                  >
                    <CheckCircle2 size={20} /> الموافقة النهائية (Approve)
                  </button>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => onUpdateStatus('pending_modification')} 
                      className="bg-orange-50 text-orange-700 p-4 rounded-2xl font-bold border border-orange-100 flex flex-col items-center gap-2 hover:bg-orange-100 transition-all active:scale-95"
                    >
                      <RotateCcw size={20} /> إعادة للتعديل
                    </button>
                    <button 
                      onClick={() => onUpdateStatus('rejected')} 
                      className="bg-red-50 text-red-700 p-4 rounded-2xl font-bold border border-red-100 flex flex-col items-center gap-2 hover:bg-red-100 transition-all active:scale-95"
                    >
                      <XCircle size={20} /> رفض الطلب
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Technical Workflow */
            canAction(['ADMIN', 'PR_MANAGER', 'TECHNICAL']) && (
              <div className="grid grid-cols-3 gap-3">
                <button onClick={() => onUpdateStatus('completed')} className="bg-green-50 text-green-700 p-4 rounded-2xl font-bold hover:bg-green-100 flex flex-col items-center gap-1 border border-green-100"><CheckCircle2 size={24}/> منجز</button>
                <button onClick={() => onUpdateStatus('rejected')} className="bg-red-50 text-red-700 p-4 rounded-2xl font-bold hover:bg-red-100 flex flex-col items-center gap-1 border border-red-100"><XCircle size={24}/> رفض</button>
                <button onClick={() => onUpdateStatus('pending_modification')} className="bg-orange-50 text-orange-700 p-4 rounded-2xl font-bold hover:bg-orange-100 flex flex-col items-center gap-1 border border-orange-100"><Edit3 size={24}/> تعديل</button>
              </div>
            )
          )}
        </div>

        {/* --- Comments Section --- */}
        <div className="border-t border-gray-100 pt-6">
          <div className="flex items-center gap-2 mb-4 text-[#1B2B48] font-black">
            <MessageSquare size={18} />
            <h4>سجل التعليقات والملاحظات</h4>
          </div>

          <div className="space-y-4 max-h-48 overflow-y-auto mb-4 p-2">
            {comments.length === 0 ? (
              <p className="text-center text-gray-300 text-sm py-4 italic font-bold">لا يوجد تعليقات بعد</p>
            ) : (
              comments.map((comment, idx) => (
                <div key={comment.id || idx} className="bg-gray-50 p-3 rounded-2xl border border-gray-100">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-black text-[#1B2B48]">{comment.author}</span>
                    <span className="text-[10px] text-gray-400 font-mono" dir="ltr">{new Date(comment.created_at).toLocaleString('ar-EG')}</span>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">{comment.text}</p>
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleCommentSubmit} className="flex gap-2">
            <input 
              type="text" 
              placeholder="اكتب تعليقك هنا..." 
              className="flex-1 p-3 bg-gray-50 border rounded-xl outline-none text-sm font-bold focus:border-[#E95D22] transition-colors"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
            />
            <button 
              type="submit" 
              className="bg-[#1B2B48] text-white px-4 rounded-xl hover:brightness-110"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      </div>
    </Modal>
  );
};

export default ManageRequestModal;
