import React, { useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';

interface ApprovalPanelProps {
  onApprove: (reason: string) => Promise<void> | void;
  onReject: (reason: string) => Promise<void> | void;
  disabled?: boolean;
  title?: string;
}

const ApprovalPanel: React.FC<ApprovalPanelProps> = ({ onApprove, onReject, disabled = false, title = 'لوحة الاعتماد' }) => {
  const [reason, setReason] = useState('');

  return (
    <div className="bg-white p-5 rounded-[25px] border border-gray-100 shadow-sm space-y-3">
      <h3 className="font-black text-[#1B2B48] text-sm">{title}</h3>
      <textarea
        className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none text-xs font-bold min-h-[88px] focus:border-[#E95D22]"
        placeholder="اكتب سبب القرار (اختياري للموافقة ومهم عند الرفض)"
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        disabled={disabled}
      />
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => onApprove(reason.trim())}
          disabled={disabled}
          className="p-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 bg-green-50 text-green-700 hover:bg-green-100 disabled:opacity-50"
        >
          <CheckCircle2 size={16} />
          موافقة
        </button>
        <button
          onClick={() => onReject(reason.trim())}
          disabled={disabled}
          className="p-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50"
        >
          <XCircle size={16} />
          رفض
        </button>
      </div>
    </div>
  );
};

export default ApprovalPanel;