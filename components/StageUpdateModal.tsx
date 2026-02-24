import React, { useState, useEffect, useRef } from 'react';
import { 
  Save, X, MessageSquare, CheckCircle2, 
  Clock, AlertCircle, Loader2, Send 
} from 'lucide-react';
import { 
  startStage, completeStage, resetStage, updateStageProgress,
  addStageComment, getStageComments 
} from '../services/workflowStageService';
import Modal from './Modal';

interface StageUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  stage: any;
  stageProgress: any;
  currentUserName: string;
  currentUserEmail: string;
  onUpdate?: () => void;
}

const StageUpdateModal: React.FC<StageUpdateModalProps> = ({
  isOpen,
  onClose,
  stage,
  stageProgress,
  currentUserName,
  currentUserEmail,
  onUpdate
}) => {
  const [status, setStatus] = useState<'pending' | 'in_progress' | 'completed'>(
    stageProgress?.status || 'pending'
  );
  const [notes, setNotes] = useState(stageProgress?.notes || '');
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingComment, setIsSavingComment] = useState(false);
  const [isCommentLoading, setIsCommentLoading] = useState(false);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && stageProgress?.id) {
      setStatus(stageProgress.status || 'pending');
      setNotes(stageProgress.notes || '');
      fetchComments();
    }
  }, [isOpen, stageProgress]);

  const fetchComments = async () => {
    if (!stageProgress?.id) return;
    setIsCommentLoading(true);
    try {
      const data = await getStageComments(stageProgress.id);
      setComments(data);
      setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setIsCommentLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: 'pending' | 'in_progress' | 'completed') => {
    if (!stageProgress?.id) return;
    setIsLoading(true);

    try {
      let result;
      if (newStatus === 'in_progress' && status === 'pending') {
        result = await startStage(stageProgress.id, currentUserName);
      } else if (newStatus === 'completed' && status === 'in_progress') {
        result = await completeStage(stageProgress.id, currentUserName, notes);
      } else if (newStatus === 'pending') {
        result = await resetStage(stageProgress.id);
      } else {
        return;
      }

      if (result.success) {
        setStatus(newStatus);
        onUpdate?.();
        fetchComments();
      } else {
        alert('فشل تحديث حالة المرحلة');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert('خطأ في تحديث الحالة');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !stageProgress?.id) return;
    setIsSavingComment(true);

    try {
      const result = await addStageComment(
        stageProgress.id,
        currentUserEmail,
        currentUserName,
        newComment.trim()
      );

      if (result.success) {
        setNewComment('');
        fetchComments();
      } else {
        alert('فشل إضافة التعليق');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setIsSavingComment(false);
    }
  };

  if (!stage) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`تحديث المرحلة: ${stage.stage_title}`}>
      <div className="space-y-6 text-right font-cairo" dir="rtl">
        {/* معلومات المرحلة */}
        <div className="bg-gradient-to-l from-orange-50 to-transparent p-5 rounded-[20px] border border-orange-100 space-y-3">
          <div>
            <label className="text-[10px] text-gray-500 font-bold block mb-1">اسم المرحلة</label>
            <p className="font-black text-[#1B2B48] text-sm">{stage.stage_title}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] text-gray-500 font-bold block mb-1">المسؤول</label>
              <p className="font-bold text-[#1B2B48] text-xs">{stage.responsible_party}</p>
            </div>
            <div>
              <label className="text-[10px] text-gray-500 font-bold block mb-1">المنصة</label>
              <p className="font-bold text-[#1B2B48] text-xs">{stage.platform_name || '-'}</p>
            </div>
          </div>
          {stage.stage_description && (
            <div>
              <label className="text-[10px] text-gray-500 font-bold block mb-1">الوصف</label>
              <p className="text-xs text-gray-600 font-bold">{stage.stage_description}</p>
            </div>
          )}
        </div>

        {/* تحديث الحالة */}
        <div className="bg-white p-5 rounded-[20px] border border-gray-100 space-y-4">
          <h3 className="font-black text-[#1B2B48] flex items-center gap-2">
            <Clock size={16} className="text-[#E95D22]" />
            تحديث حالة المرحلة
          </h3>

          <div className="flex gap-2">
            <button
              onClick={() => handleStatusChange('pending')}
              disabled={isLoading || status === 'pending'}
              className={`flex-1 py-2 px-3 rounded-lg font-black text-xs transition-all text-center ${
                status === 'pending'
                  ? 'bg-gray-100 text-gray-500 border border-gray-200'
                  : 'bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200 hover:border-gray-300'
              } disabled:opacity-50`}
            >
              في الانتظار
            </button>
            <button
              onClick={() => handleStatusChange('in_progress')}
              disabled={isLoading || status === 'in_progress' || status === 'completed'}
              className={`flex-1 py-2 px-3 rounded-lg font-black text-xs transition-all text-center ${
                status === 'in_progress'
                  ? 'bg-blue-100 text-blue-700 border border-blue-200'
                  : 'bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 hover:border-blue-300'
              } disabled:opacity-50`}
            >
              قيد التنفيذ
            </button>
            <button
              onClick={() => handleStatusChange('completed')}
              disabled={isLoading || status === 'completed' || status === 'pending'}
              className={`flex-1 py-2 px-3 rounded-lg font-black text-xs transition-all text-center ${
                status === 'completed'
                  ? 'bg-green-100 text-green-700 border border-green-200'
                  : 'bg-green-50 hover:bg-green-100 text-green-600 border border-green-200 hover:border-green-300'
              } disabled:opacity-50`}
            >
              مكتمل
            </button>
          </div>

          {/* عرض بيانات الحالة الحالية */}
          {stageProgress && (
            <div className="bg-gray-50 p-3 rounded-lg space-y-2 border border-gray-100 text-xs">
              {stageProgress.started_at && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">بدأ في:</span>
                  <span className="font-bold text-gray-700 font-mono" dir="ltr">
                    {new Date(stageProgress.started_at).toLocaleString('ar-SA')}
                  </span>
                </div>
              )}
              {stageProgress.completed_at && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">انتهى في:</span>
                  <span className="font-bold text-green-700 font-mono" dir="ltr">
                    {new Date(stageProgress.completed_at).toLocaleString('ar-SA')}
                  </span>
                </div>
              )}
              {stageProgress.completed_by && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">تم بواسطة:</span>
                  <span className="font-bold text-gray-700">{stageProgress.completed_by}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* الملاحظات */}
        {(status === 'in_progress' || status === 'completed') && (
          <div className="bg-white p-5 rounded-[20px] border border-gray-100 space-y-3">
            <label className="font-black text-[#1B2B48] text-sm">ملاحظات المرحلة</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="أضف ملاحظات حول تنفيذ هذه المرحلة..."
              className="w-full p-3 border border-gray-200 rounded-lg outline-none focus:border-[#E95D22] text-xs font-bold resize-none h-24"
              dir="rtl"
            />
            <button
              onClick={async () => {
                if (!stageProgress?.id) return;
                setIsLoading(true);
                try {
                  const result = await updateStageProgress(stageProgress.id, {
                    notes,
                    completed_by: currentUserName
                  });
                  if (!result.success) {
                    alert('فشل حفظ الملاحظات');
                    return;
                  }
                  onUpdate?.();
                } finally {
                  setIsLoading(false);
                }
              }}
              disabled={isLoading}
              className="w-full bg-[#E95D22] hover:bg-orange-600 text-white font-black text-xs py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  جاري الحفظ...
                </>
              ) : (
                <>
                  <Save size={14} />
                  حفظ الملاحظات
                </>
              )}
            </button>
          </div>
        )}

        {/* التعليقات */}
        <div className="bg-white p-5 rounded-[20px] border border-gray-100 space-y-3">
          <h3 className="font-black text-[#1B2B48] flex items-center gap-2">
            <MessageSquare size={16} className="text-[#E95D22]" />
            التعليقات والملاحظات
          </h3>

          {/* منطقة التعليقات */}
          <div className="bg-gray-50 rounded-lg p-3 h-48 overflow-y-auto space-y-2 border border-gray-100 custom-scrollbar">
            {isCommentLoading ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 size={20} className="animate-spin text-[#E95D22]" />
              </div>
            ) : comments.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-300 gap-2">
                <MessageSquare size={28} />
                <p className="text-xs font-bold">لا توجد تعليقات</p>
              </div>
            ) : (
              comments.map((comment, index) => (
                <div
                  key={index}
                  className={`p-2.5 rounded-lg text-xs max-w-[85%] ${
                    comment.user_name === currentUserName
                      ? 'bg-[#1B2B48] text-white mr-auto'
                      : 'bg-white text-[#1B2B48] ml-auto border border-gray-200'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1 gap-2">
                    <span className="font-black">{comment.user_name}</span>
                    <span className="opacity-50 text-[9px]" dir="ltr">
                      {new Date(comment.created_at).toLocaleTimeString('ar-SA', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <p className="font-bold leading-relaxed">{comment.comment}</p>
                </div>
              ))
            )}
            <div ref={commentsEndRef} />
          </div>

          {/* إضافة تعليق */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
              placeholder="أضف تعليقاً..."
              className="flex-1 p-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none text-xs font-bold focus:border-[#E95D22]"
              dir="rtl"
            />
            <button
              onClick={handleAddComment}
              disabled={!newComment.trim() || isSavingComment}
              className="bg-[#E95D22] hover:bg-orange-600 text-white font-black py-2.5 px-3 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center"
            >
              {isSavingComment ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Send size={14} />
              )}
            </button>
          </div>
        </div>

        {/* أزرار الإجراء */}
        <div className="flex gap-3 pt-4 border-t">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-black text-sm py-2.5 rounded-lg transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default StageUpdateModal;
