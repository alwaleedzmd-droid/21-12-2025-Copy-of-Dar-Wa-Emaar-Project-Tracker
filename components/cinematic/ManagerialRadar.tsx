// ManagerialRadar.tsx — "رادار المدير" Bottleneck & SLA Tracker
// Shows only blocked/delayed units with handler connection lines and time-since-delay
import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, AlertTriangle, Clock, User, ArrowLeft } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import type { ProjectWork } from '../../types';
import BentoCard from './BentoCard';

// ── SLA timer helper ──
function formatDuration(ms: number): string {
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days} يوم ${hours} ساعة`;
  const mins = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours} ساعة ${mins} دقيقة`;
}

function getSLAClass(delayDays: number): string {
  if (delayDays >= 14) return 'sla-critical';
  if (delayDays >= 7) return 'sla-warning';
  return 'sla-ok';
}

interface Bottleneck {
  work: ProjectWork;
  projectTitle: string;
  handler: string;
  delayMs: number;
  delayDays: number;
}

interface ManagerialRadarProps {
  onClose?: () => void;
}

const ManagerialRadar: React.FC<ManagerialRadarProps> = ({ onClose }) => {
  const { projects, projectWorks, appUsers } = useData();
  const [sortBy, setSortBy] = useState<'delay' | 'handler'>('delay');

  const bottlenecks: Bottleneck[] = useMemo(() => {
    const now = Date.now();
    const results: Bottleneck[] = [];

    for (const w of projectWorks) {
      if (w.status === 'completed') continue;

      const created = new Date(w.created_at).getTime();
      const delayMs = now - created;
      const delayDays = delayMs / (1000 * 60 * 60 * 24);
      
      // Only show items delayed more than 5 days
      if (delayDays < 5) continue;

      const project = projects.find(p => 
        p.id === w.projectId || p.title === w.project_name || p.name === w.project_name
      );

      results.push({
        work: w,
        projectTitle: project?.title || project?.name || w.project_name || 'غير معروف',
        handler: w.current_handler || w.assigned_to || 'غير محدد',
        delayMs,
        delayDays,
      });
    }

    if (sortBy === 'delay') {
      results.sort((a, b) => b.delayMs - a.delayMs);
    } else {
      results.sort((a, b) => a.handler.localeCompare(b.handler, 'ar'));
    }

    return results;
  }, [projects, projectWorks, sortBy]);

  // Group by handler for radar lines
  const handlerGroups = useMemo(() => {
    const map = new Map<string, Bottleneck[]>();
    for (const b of bottlenecks) {
      const list = map.get(b.handler) || [];
      list.push(b);
      map.set(b.handler, list);
    }
    return Array.from(map.entries());
  }, [bottlenecks]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="w-full min-h-screen"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-8 px-2">
        <div className="flex items-center gap-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center"
          >
            <Eye size={22} className="text-red-400" />
          </motion.div>
          <div>
            <h2 className="text-2xl font-black text-white">الرؤية الاستراتيجية</h2>
            <p className="text-xs text-gray-500 font-bold">رادار المختنقات — {bottlenecks.length} مهمة متأخرة</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSortBy(sortBy === 'delay' ? 'handler' : 'delay')}
            className="glass-card px-4 py-2 text-xs font-bold text-gray-400 hover:text-white transition-colors"
            style={{ borderRadius: 12 }}
          >
            ترتيب: {sortBy === 'delay' ? 'حسب التأخير' : 'حسب المسؤول'}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="glass-card px-4 py-2 text-xs font-bold text-gray-400 hover:text-white transition-colors flex items-center gap-2"
              style={{ borderRadius: 12 }}
            >
              <EyeOff size={14} /> إغلاق الرادار
            </button>
          )}
        </div>
      </div>

      {/* Radar SVG — Handler ↔ Work relationships */}
      {handlerGroups.length > 0 && (
        <div className="mb-8">
          <svg viewBox="0 0 800 200" className="w-full h-auto max-h-[200px]">
            <defs>
              <linearGradient id="radarLine" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#EF4444" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#EF4444" stopOpacity="0.1" />
              </linearGradient>
            </defs>
            {handlerGroups.map(([handler, items], gi) => {
              const handlerX = 60;
              const handlerY = 30 + gi * (160 / Math.max(handlerGroups.length, 1));
              return (
                <g key={handler}>
                  {/* Handler node */}
                  <circle cx={handlerX} cy={handlerY} r={12} fill="rgba(239,68,68,0.15)" stroke="#EF4444" strokeWidth="1" />
                  <text x={handlerX} y={handlerY + 3} textAnchor="middle" fill="#F87171" fontSize="6" fontFamily="Cairo" fontWeight="700">
                    <tspan>{(handler || '?').slice(0, 4)}</tspan>
                  </text>
                  <text x={handlerX} y={handlerY + 22} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="7" fontFamily="Cairo">
                    {handler}
                  </text>

                  {/* Lines to bottleneck works */}
                  {items.slice(0, 6).map((b, bi) => {
                    const workX = 200 + bi * 95;
                    const workY = handlerY;
                    return (
                      <g key={b.work.id}>
                        <line
                          x1={handlerX + 12}
                          y1={handlerY}
                          x2={workX - 12}
                          y2={workY}
                          stroke="url(#radarLine)"
                          strokeWidth="1"
                          className="radar-line"
                          style={{ animationDelay: `${bi * 0.2}s` }}
                        />
                        <circle cx={workX} cy={workY} r={10} fill="rgba(239,68,68,0.1)" stroke="#EF444480" strokeWidth="0.5">
                          <animate attributeName="r" values="9;12;9" dur="2s" repeatCount="indefinite" />
                        </circle>
                        <text x={workX} y={workY - 14} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="6" fontFamily="Cairo">
                          {b.projectTitle.slice(0, 12)}
                        </text>
                        <text x={workX} y={workY + 3} textAnchor="middle" fill="#F87171" fontSize="6" fontFamily="Cairo" fontWeight="700">
                          {Math.floor(b.delayDays)}d
                        </text>
                      </g>
                    );
                  })}
                </g>
              );
            })}
          </svg>
        </div>
      )}

      {/* Bottleneck Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <AnimatePresence mode="popLayout">
          {bottlenecks.map((b, i) => (
            <motion.div
              key={b.work.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 200, damping: 25, delay: i * 0.05 }}
            >
              <BentoCard glow pulse={b.delayDays >= 14 ? 'red' : null} className="!p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-black text-white truncate">{b.work.task_name}</h4>
                    <p className="text-[10px] text-gray-500 mt-0.5">{b.projectTitle}</p>
                  </div>
                  <div className={`text-left font-mono text-xs font-black ${getSLAClass(b.delayDays)}`}>
                    <Clock size={12} className="inline ml-1" />
                    {formatDuration(b.delayMs)}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-400">
                    <User size={12} />
                    <span className="text-xs font-bold">{b.handler}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {b.delayDays >= 14 && <AlertTriangle size={12} className="text-red-400" />}
                    <span className="text-[10px] font-bold text-gray-600 uppercase">
                      {b.work.status || 'قيد التنفيذ'}
                    </span>
                  </div>
                </div>

                {/* SLA Bar */}
                <div className="mt-3 h-1 rounded-full bg-white/5 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (b.delayDays / 30) * 100)}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className={`h-full rounded-full ${b.delayDays >= 14 ? 'bg-red-500' : b.delayDays >= 7 ? 'bg-yellow-500' : 'bg-green-500'}`}
                  />
                </div>
              </BentoCard>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Empty state */}
      {bottlenecks.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-20"
        >
          <div className="w-16 h-16 mx-auto rounded-full bg-green-500/10 flex items-center justify-center mb-4">
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              ✅
            </motion.div>
          </div>
          <h3 className="text-xl font-black text-white mb-2">لا توجد مختنقات</h3>
          <p className="text-gray-500 text-sm">جميع المهام تسير بوتيرة طبيعية</p>
        </motion.div>
      )}
    </motion.div>
  );
};

export default ManagerialRadar;
