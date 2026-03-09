// GanttTimeline.tsx — خط زمني تفاعلي لمراحل المشاريع
// Interactive Gantt-style timeline showing project phases, deadlines, and delays
import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import type { ProjectSummary, ProjectWork } from '../../types';

interface ProjectTimeline {
  project: ProjectSummary;
  works: ProjectWork[];
  startDate: Date;
  endDate: Date;
  delayedCount: number;
  completedCount: number;
}

const GanttTimeline: React.FC = () => {
  const { projects, projectWorks } = useData();
  const [expandedProject, setExpandedProject] = useState<number | null>(null);
  const [filter, setFilter] = useState<'all' | 'delayed' | 'active'>('all');

  const timelines = useMemo(() => {
    const now = Date.now();
    return projects.map(project => {
      const works = projectWorks.filter(w => w.projectId === project.id);
      const dates = works.map(w => new Date(w.created_at).getTime()).filter(Boolean);
      const endDates = works
        .filter(w => w.expected_completion_date)
        .map(w => new Date(w.expected_completion_date!).getTime());
      
      const startDate = new Date(dates.length > 0 ? Math.min(...dates) : now);
      const endDate = new Date(endDates.length > 0 ? Math.max(...endDates) : now + 30 * 24 * 3600000);
      
      const delayedCount = works.filter(w => {
        if (w.status === 'completed') return false;
        if (!w.expected_completion_date) return false;
        return new Date(w.expected_completion_date).getTime() < now;
      }).length;
      
      const completedCount = works.filter(w => w.status === 'completed').length;
      
      return { project, works, startDate, endDate, delayedCount, completedCount } as ProjectTimeline;
    }).sort((a, b) => b.delayedCount - a.delayedCount);
  }, [projects, projectWorks]);

  const filtered = useMemo(() => {
    if (filter === 'delayed') return timelines.filter(t => t.delayedCount > 0);
    if (filter === 'active') return timelines.filter(t => t.project.progress < 100);
    return timelines;
  }, [timelines, filter]);

  // Timeline range for visualization
  const globalRange = useMemo(() => {
    const allDates = timelines.flatMap(t => [t.startDate.getTime(), t.endDate.getTime()]);
    const min = allDates.length > 0 ? Math.min(...allDates) : Date.now() - 90 * 24 * 3600000;
    const max = allDates.length > 0 ? Math.max(...allDates) : Date.now() + 90 * 24 * 3600000;
    return { min, max, span: max - min || 1 };
  }, [timelines]);

  const getBarStyle = (timeline: ProjectTimeline) => {
    const left = ((timeline.startDate.getTime() - globalRange.min) / globalRange.span) * 100;
    const width = ((timeline.endDate.getTime() - timeline.startDate.getTime()) / globalRange.span) * 100;
    return { left: `${Math.max(0, left)}%`, width: `${Math.max(2, Math.min(100 - left, width))}%` };
  };

  const getBarColor = (timeline: ProjectTimeline) => {
    if (timeline.project.progress >= 100) return 'bg-green-500';
    if (timeline.delayedCount > 0) return 'bg-red-500';
    return 'bg-[#E95D22]';
  };

  const formatDate = (d: Date) => d.toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' });

  const nowPosition = ((Date.now() - globalRange.min) / globalRange.span) * 100;

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Calendar size={20} className="text-[#E95D22]" />
            <span className="cin-subtitle">الخط الزمني</span>
          </div>
          <h2 className="text-3xl font-black text-[#1B2B48]">مراحل المشاريع</h2>
          <p className="text-[10px] md:text-[11px] text-gray-500 font-bold mt-1 leading-relaxed">
            آلية الاحتساب: بداية الشريط من أول مهمة بالمشروع، ونهايته من آخر موعد متوقع للإنجاز. اللون أحمر عند وجود مهام متجاوزة للموعد المتوقع،
            أخضر عند اكتمال المشروع، وبرتقالي عند كونه نشطا دون تأخير.
          </p>
        </div>
        <div className="flex gap-2">
          {(['all', 'delayed', 'active'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all ${
                filter === f ? 'bg-[#E95D22]/20 text-[#E95D22] border border-[#E95D22]/30' : 'glass-card text-gray-400'
              }`}
            >
              {f === 'all' ? 'الكل' : f === 'delayed' ? 'متأخرة' : 'نشطة'}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline Chart */}
      <div className="glass-card p-6" style={{ borderRadius: 20 }}>
        {/* Time axis */}
        <div className="flex justify-between text-[9px] text-gray-500 font-bold mb-4 px-2">
          <span>{formatDate(new Date(globalRange.min))}</span>
          <span>{formatDate(new Date((globalRange.min + globalRange.max) / 2))}</span>
          <span>{formatDate(new Date(globalRange.max))}</span>
        </div>

        {/* Today marker */}
        <div className="relative h-0 mb-2">
          {nowPosition > 0 && nowPosition < 100 && (
            <div 
              className="absolute top-0 h-[calc(100%+400px)] w-px bg-[#E95D22]/30 z-10"
              style={{ left: `${nowPosition}%` }}
            >
              <span className="absolute -top-5 -translate-x-1/2 px-2 py-0.5 rounded-lg bg-[#E95D22]/20 text-[#E95D22] text-[8px] font-black whitespace-nowrap">
                اليوم
              </span>
            </div>
          )}
        </div>

        {/* Project Bars */}
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {filtered.map((timeline, i) => {
            const barStyle = getBarStyle(timeline);
            const barColor = getBarColor(timeline);
            const isExpanded = expandedProject === timeline.project.id;

            return (
              <motion.div
                key={timeline.project.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                {/* Project row */}
                <div 
                  className="flex items-center gap-3 cursor-pointer group hover:bg-[#1B2B48]/[0.03] rounded-xl p-2 transition-all"
                  onClick={() => setExpandedProject(isExpanded ? null : timeline.project.id)}
                >
                  {/* Label */}
                  <div className="w-36 flex-shrink-0 text-right">
                    <p className="text-[10px] font-bold text-[#1B2B48] truncate">{timeline.project.title || timeline.project.name}</p>
                    <p className="text-[8px] text-gray-500">{timeline.project.location || '—'}</p>
                  </div>

                  {/* Bar */}
                  <div className="flex-1 h-7 relative rounded-lg bg-[#1B2B48]/[0.04]">
                    <motion.div
                      className={`absolute top-0 h-full rounded-lg ${barColor} opacity-80`}
                      style={{ ...barStyle }}
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ delay: i * 0.05, duration: 0.6, ease: 'easeOut' }}
                    >
                      {/* Progress fill */}
                      <div 
                        className="h-full rounded-lg bg-white/20"
                        style={{ width: `${timeline.project.progress || 0}%` }}
                      />
                    </motion.div>
                    {/* Progress label inside bar */}
                    <span className="absolute inset-0 flex items-center justify-center text-[9px] font-black text-white/90">
                      {timeline.project.progress || 0}%
                    </span>
                  </div>

                  {/* Status badges */}
                  <div className="w-20 flex-shrink-0 flex items-center gap-1 justify-end">
                    {timeline.delayedCount > 0 && (
                      <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg bg-red-500/15 text-red-400 text-[8px] font-black">
                        <AlertTriangle size={8} /> {timeline.delayedCount}
                      </span>
                    )}
                    <span className="text-[8px] text-gray-500">
                      {timeline.completedCount}/{timeline.works.length}
                    </span>
                    {isExpanded ? <ChevronUp size={10} className="text-gray-500" /> : <ChevronDown size={10} className="text-gray-500" />}
                  </div>
                </div>

                {/* Expanded tasks */}
                <AnimatePresence>
                  {isExpanded && timeline.works.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mr-36 ml-20 mb-3 overflow-hidden"
                    >
                      <div className="space-y-1 pt-1 border-t border-[#1B2B48]/5">
                        {timeline.works.slice(0, 8).map(work => {
                          const isDelayed = work.status !== 'completed' && (
                            work.expected_completion_date && new Date(work.expected_completion_date).getTime() < Date.now()
                          );
                          return (
                            <div key={work.id} className="flex items-center gap-2 py-1">
                              {work.status === 'completed' ? (
                                <CheckCircle2 size={9} className="text-green-500 flex-shrink-0" />
                              ) : isDelayed ? (
                                <AlertTriangle size={9} className="text-red-400 flex-shrink-0" />
                              ) : (
                                <Clock size={9} className="text-[#E95D22] flex-shrink-0" />
                              )}
                              <span className={`text-[9px] truncate ${work.status === 'completed' ? 'text-gray-500 line-through' : isDelayed ? 'text-red-400' : 'text-gray-400'}`}>
                                {work.task_name}
                              </span>
                              {work.expected_completion_date && (
                                <span className="text-[8px] text-gray-600 mr-auto">
                                  {new Date(work.expected_completion_date).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' })}
                                </span>
                              )}
                            </div>
                          );
                        })}
                        {timeline.works.length > 8 && (
                          <p className="text-[8px] text-gray-600 pt-1">+{timeline.works.length - 8} مهام أخرى</p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <p className="text-center text-gray-500 text-sm py-10">لا توجد مشاريع بهذا الفلتر</p>
        )}
      </div>
    </div>
  );
};

export default GanttTimeline;
