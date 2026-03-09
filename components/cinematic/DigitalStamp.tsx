// DigitalStamp.tsx — الختم الرقمي الفخم (Digital Approval Seal)
// Animated stamp that drops in with cinematic physics when a checklist milestone is approved
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, ShieldCheck, Lock } from 'lucide-react';

interface ChecklistItem {
  id: string;
  label: string;
  completed: boolean;
}

interface DigitalStampProps {
  title: string;
  items: ChecklistItem[];
  onApprove?: () => void;
  approvedAt?: string | null;
  approvedBy?: string | null;
}

const DigitalStamp: React.FC<DigitalStampProps> = ({
  title, items, onApprove, approvedAt, approvedBy,
}) => {
  const [showStamp, setShowStamp] = useState(!!approvedAt);
  const allComplete = items.every(i => i.completed);
  const progress = items.length > 0 ? items.filter(i => i.completed).length / items.length : 0;

  const handleApprove = () => {
    if (!allComplete) return;
    setShowStamp(true);
    onApprove?.();
  };

  return (
    <div className="relative">
      {/* Checklist Header */}
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-black text-white">{title}</h4>
        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
          {items.filter(i => i.completed).length}/{items.length}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1 rounded-full bg-white/5 mb-5 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress * 100}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={`h-full rounded-full ${allComplete ? 'bg-green-500' : 'bg-[#E95D22]'}`}
        />
      </div>

      {/* Checklist items */}
      <div className="space-y-2 mb-5">
        {items.map((item, i) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 25, delay: i * 0.06 }}
            className="flex items-center gap-3"
          >
            <div className={`w-5 h-5 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors duration-300 ${
              item.completed 
                ? 'bg-green-500/20 text-green-400' 
                : 'bg-white/5 text-gray-600'
            }`}>
              {item.completed ? <CheckCircle2 size={13} /> : <div className="w-2.5 h-2.5 rounded-sm bg-white/10" />}
            </div>
            <span className={`text-xs font-bold transition-colors duration-300 ${
              item.completed ? 'text-gray-300 line-through' : 'text-gray-400'
            }`}>
              {item.label}
            </span>
          </motion.div>
        ))}
      </div>

      {/* Approve button */}
      {!showStamp && (
        <motion.button
          whileHover={allComplete ? { scale: 1.02 } : {}}
          whileTap={allComplete ? { scale: 0.98 } : {}}
          onClick={handleApprove}
          disabled={!allComplete}
          className={`w-full py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all duration-300 ${
            allComplete
              ? 'bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 cursor-pointer'
              : 'bg-white/3 text-gray-600 border border-white/5 cursor-not-allowed'
          }`}
        >
          <Lock size={12} className="inline ml-2" />
          {allComplete ? 'اعتماد والانتقال للمرحلة التالية' : 'أكمل جميع المتطلبات أولاً'}
        </motion.button>
      )}

      {/* Digital Stamp Overlay */}
      <AnimatePresence>
        {showStamp && (
          <motion.div
            initial={{ scale: 3, rotate: -15, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 15,
              mass: 0.8,
            }}
            className="mt-4 flex flex-col items-center"
          >
            {/* Stamp visual */}
            <div className="relative">
              {/* Ink splash effect */}
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1.5, opacity: 0.1 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="absolute inset-0 rounded-full bg-green-500 blur-3xl"
              />

              <div className="relative w-28 h-28 rounded-full border-4 border-green-500/40 flex flex-col items-center justify-center bg-green-500/5 backdrop-blur-sm">
                <ShieldCheck size={28} className="text-green-400 mb-1" />
                <span className="text-[8px] font-black text-green-400 uppercase tracking-[0.2em]">معتمد</span>
                <span className="text-[7px] font-bold text-green-500/60 mt-0.5">APPROVED</span>
              </div>

              {/* Ring pulse */}
              <motion.div
                initial={{ scale: 1, opacity: 0.5 }}
                animate={{ scale: 1.8, opacity: 0 }}
                transition={{ duration: 1.5, repeat: 2 }}
                className="absolute inset-0 rounded-full border-2 border-green-500/30"
              />
            </div>

            {/* Approval metadata */}
            {(approvedBy || approvedAt) && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="mt-3 text-center"
              >
                {approvedBy && <p className="text-[10px] text-gray-500">بواسطة: <span className="text-gray-400 font-bold">{approvedBy}</span></p>}
                {approvedAt && <p className="text-[10px] text-gray-600">{new Date(approvedAt).toLocaleDateString('ar-SA')}</p>}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DigitalStamp;
