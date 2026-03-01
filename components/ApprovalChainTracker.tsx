import React, { useState, useEffect } from 'react';
import { CheckCircle2, Circle, XCircle, Clock, GitBranch, ChevronDown, ChevronUp } from 'lucide-react';
import {
  WorkflowRequestType,
  ApprovalChainStep,
  getFullApprovalChain,
  getApprovalChainWithStatus,
  getCurrentApprovalStep,
  normalizeWorkflowType
} from '../services/requestWorkflowService';

interface ApprovalChainTrackerProps {
  requestType?: string;
  assignedTo?: string;
  requestStatus?: string;
  submittedBy?: string;
  createdAt?: string;
  comments?: Array<{ text?: string; content?: string; user_name?: string }>;
  /** عرض مختصر (للبطاقات في الجدول) */
  compact?: boolean;
}

const ApprovalChainTracker: React.FC<ApprovalChainTrackerProps> = ({
  requestType,
  assignedTo,
  requestStatus,
  submittedBy,
  createdAt,
  comments,
  compact = false
}) => {
  const [chainSteps, setChainSteps] = useState<ApprovalChainStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(!compact);

  useEffect(() => {
    const loadChain = async () => {
      try {
        const normalizedType = normalizeWorkflowType(requestType);
        const chain = await getFullApprovalChain(normalizedType);
        
        if (chain.length > 0) {
          const stepsWithStatus = getApprovalChainWithStatus(
            chain,
            assignedTo,
            requestStatus,
            comments
          );
          setChainSteps(stepsWithStatus);
        }
      } catch (err) {
        console.error('خطأ في تحميل سلسلة الموافقات:', err);
      } finally {
        setLoading(false);
      }
    };

    loadChain();
  }, [requestType, assignedTo, requestStatus, comments]);

  if (loading || chainSteps.length === 0) return null;

  const currentStep = chainSteps.findIndex(s => s.status === 'current');
  const totalSteps = chainSteps.length;
  const approvedCount = chainSteps.filter(s => s.status === 'approved').length;

  // العرض المختصر (للجدول)
  if (compact) {
    const currentApprover = chainSteps.find(s => s.status === 'current');
    const isFinal = ['مقبول', 'approved', 'completed', 'منجز'].includes(requestStatus || '');
    const isRejected = ['مرفوض', 'rejected'].includes(requestStatus || '');

    if (isFinal) {
      return (
        <div className="flex items-center gap-1.5">
          <CheckCircle2 size={12} className="text-green-600" />
          <span className="text-[10px] font-black text-green-700">
            تمت الموافقة ({totalSteps}/{totalSteps})
          </span>
        </div>
      );
    }

    if (isRejected) {
      return (
        <div className="flex items-center gap-1.5">
          <XCircle size={12} className="text-red-600" />
          <span className="text-[10px] font-black text-red-700">مرفوض</span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-1.5">
        <Clock size={12} className="text-blue-600" />
        <span className="text-[10px] font-bold text-blue-700">
          عند: {currentApprover?.name || assignedTo || '-'}
        </span>
        <span className="text-[9px] text-gray-400 font-bold">
          ({approvedCount + 1}/{totalSteps})
        </span>
      </div>
    );
  }

  // العرض الكامل (داخل المودال)
  return (
    <div className="bg-white p-5 rounded-[25px] border border-gray-100 shadow-sm space-y-3">
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <h3 className="font-black text-[#1B2B48] text-sm flex items-center gap-2">
          <GitBranch size={16} className="text-[#E95D22]" />
          سير الموافقات
          <span className="text-[10px] text-gray-400 font-bold mr-2">
            ({approvedCount}/{totalSteps})
          </span>
        </h3>
        {expanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
      </div>

      {expanded && (
        <div className="space-y-0 relative">
          {/* خط الربط العمودي */}
          <div className="absolute right-[7px] top-4 bottom-4 w-0.5 bg-gray-200 z-0" />

          {/* تقديم الطلب */}
          <div className="flex items-start gap-3 relative z-10 pb-4">
            <div className="w-4 h-4 rounded-full bg-[#E95D22] flex items-center justify-center flex-shrink-0 mt-0.5">
              <CheckCircle2 size={10} className="text-white" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-black text-[#1B2B48]">تم تقديم الطلب</p>
              <p className="text-[11px] text-gray-500 font-bold">{submittedBy || 'غير محدد'}</p>
              {createdAt && (
                <p className="text-[10px] text-gray-400 font-bold" dir="ltr">
                  {new Date(createdAt).toLocaleString('ar-SA')}
                </p>
              )}
            </div>
          </div>

          {/* خطوات الموافقة */}
          {chainSteps.map((step, index) => {
            const isLast = index === chainSteps.length - 1;
            
            let icon: React.ReactNode;
            let dotColor: string;
            let textColor: string;
            let badgeColor: string;
            let badgeText: string;
            
            switch (step.status) {
              case 'approved':
                icon = <CheckCircle2 size={10} className="text-white" />;
                dotColor = 'bg-green-600';
                textColor = 'text-green-700';
                badgeColor = 'bg-green-50 text-green-700 border-green-100';
                badgeText = 'تمت الموافقة ✓';
                break;
              case 'current':
                icon = <Clock size={10} className="text-white" />;
                dotColor = 'bg-blue-500 animate-pulse';
                textColor = 'text-blue-700';
                badgeColor = 'bg-blue-50 text-blue-700 border-blue-100';
                badgeText = 'بانتظار الموافقة';
                break;
              case 'rejected':
                icon = <XCircle size={10} className="text-white" />;
                dotColor = 'bg-red-500';
                textColor = 'text-red-700';
                badgeColor = 'bg-red-50 text-red-700 border-red-100';
                badgeText = 'تم الرفض ✗';
                break;
              default:
                icon = <Circle size={10} className="text-white" />;
                dotColor = 'bg-gray-300';
                textColor = 'text-gray-400';
                badgeColor = 'bg-gray-50 text-gray-500 border-gray-100';
                badgeText = 'لم يصل بعد';
            }

            return (
              <div key={step.email + index} className={`flex items-start gap-3 relative z-10 ${!isLast ? 'pb-4' : ''}`}>
                <div className={`w-4 h-4 rounded-full ${dotColor} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                  {icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={`text-xs font-black ${step.status === 'current' ? 'text-blue-700' : 'text-[#1B2B48]'}`}>
                      {step.name}
                    </p>
                    <span className={`text-[9px] px-2 py-0.5 rounded-full border font-bold ${badgeColor}`}>
                      {badgeText}
                    </span>
                    <span className="text-[9px] text-gray-300 font-bold">
                      خطوة {step.order + 1}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400 font-bold" dir="ltr">
                    {step.email}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ApprovalChainTracker;
