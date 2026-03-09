// InteractiveProjectPulse.tsx — التوأم الرقمي — خريطة حالة المشاريع للإدارة التنفيذية
// ألوان: أخضر=مكتمل, أحمر نابض=تأخير, برتقالي=قيد العمل
import React, { useMemo, useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { gsap } from 'gsap';
import { CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import type { ProjectSummary, ProjectWork } from '../../types';

// ── Status Colors (executive-friendly) ──
const STATUS_COLORS = {
  completed: '#22C55E',   // أخضر — مكتمل
  delayed: '#EF4444',     // أحمر — تأخير
  inProgress: '#E95D22',  // برتقالي — قيد العمل
} as const;

type ProjectStatus = 'completed' | 'delayed' | 'inProgress';

function getProjectStatus(project: ProjectSummary, works: ProjectWork[]): ProjectStatus {
  // 1. Completed
  if (project.status === 'completed' || project.progress >= 100) return 'completed';
  if (works.length > 0 && works.every(w => w.status === 'completed')) return 'completed';

  // 2. Delayed — any incomplete work older than 7 days
  const now = Date.now();
  const hasDelay = works.some(w => {
    if (w.status === 'completed') return false;
    const created = new Date(w.created_at).getTime();
    return (now - created) > 7 * 24 * 60 * 60 * 1000;
  });
  // Also check expected_completion_date overdue
  const hasOverdue = works.some(w => {
    if (w.status === 'completed') return false;
    if (!w.expected_completion_date) return false;
    return new Date(w.expected_completion_date).getTime() < now;
  });
  if (hasDelay || hasOverdue) return 'delayed';

  // 3. In Progress
  return 'inProgress';
}

function getProjectColor(project: ProjectSummary, works: ProjectWork[]): string {
  return STATUS_COLORS[getProjectStatus(project, works)];
}

function isBottleneck(project: ProjectSummary, works: ProjectWork[]): boolean {
  return getProjectStatus(project, works) === 'delayed';
}

interface ProjectOrb {
  project: ProjectSummary;
  works: ProjectWork[];
  color: string;
  bottleneck: boolean;
  x: number;
  y: number;
  radius: number;
}

const InteractiveProjectPulse: React.FC = () => {
  const { projects, projectWorks } = useData();
  const svgRef = useRef<SVGSVGElement>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const [dimensions, setDimensions] = useState({ width: 900, height: 600 });

  // Responsive sizing
  useEffect(() => {
    const updateSize = () => {
      const w = Math.min(window.innerWidth - 80, 1200);
      const h = Math.min(window.innerHeight * 0.55, 650);
      setDimensions({ width: w, height: h });
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Build orb positions
  const orbs: ProjectOrb[] = useMemo(() => {
    if (!projects.length) return [];
    const { width, height } = dimensions;
    const cx = width / 2;
    const cy = height / 2;
    const maxR = Math.min(width, height) * 0.38;

    return projects.map((p, i) => {
      const works = projectWorks.filter(w => 
        w.projectId === p.id || w.project_name === p.title || w.project_name === p.name
      );
      const angle = (2 * Math.PI * i) / projects.length - Math.PI / 2;
      const ringRadius = maxR * (0.5 + 0.5 * ((i % 3) / 2));
      const progress = Math.max(5, p.progress || 0);
      const orbRadius = 18 + (progress / 100) * 28;

      return {
        project: p,
        works,
        color: getProjectColor(p, works),
        bottleneck: isBottleneck(p, works),
        x: cx + ringRadius * Math.cos(angle),
        y: cy + ringRadius * Math.sin(angle),
        radius: orbRadius,
      };
    });
  }, [projects, projectWorks, dimensions]);

  // Floating animation for orbs
  useEffect(() => {
    if (!svgRef.current) return;
    const nodes = svgRef.current.querySelectorAll('.project-orb');
    const ctx = gsap.context(() => {
      nodes.forEach((node, i) => {
        gsap.to(node, {
          y: `+=${8 + (i % 3) * 4}`,
          duration: 2.5 + (i % 4) * 0.5,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          delay: i * 0.15,
        });
      });
    });
    return () => ctx.revert();
  }, [orbs]);

  const { width, height } = dimensions;
  const hoveredOrb = orbs.find(o => o.project.id === hovered);

  return (
    <div className="relative w-full" dir="rtl">
      <p className="text-[10px] md:text-[11px] text-gray-500 font-bold mb-3 leading-relaxed">
        آلية العمل: كل دائرة تمثل مشروعا. حجم الدائرة = نسبة التقدم، واللون يوضح الحالة (أخضر مكتمل، برتقالي قيد العمل، أحمر متأخر).
        الخطوط المنقطة هي خطوط ربط تشغيلية من مركز "دار وإعمار" إلى كل مشروع لعرض ارتباطه بالمحفظة، وليست مسافات جغرافية.
      </p>

      {/* SVG Canvas */}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto"
        style={{ maxHeight: '65vh' }}
      >
        <defs>
          {/* Glow filter */}
          <filter id="orb-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Pulse filter for bottlenecks */}
          <filter id="pulse-glow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="12" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Radial gradients per orb */}
          {orbs.map(o => (
            <radialGradient key={`grad-${o.project.id}`} id={`grad-${o.project.id}`} cx="35%" cy="35%">
              <stop offset="0%" stopColor={o.color} stopOpacity="0.9" />
              <stop offset="100%" stopColor={o.color} stopOpacity="0.4" />
            </radialGradient>
          ))}
        </defs>

        {/* Connection lines from center */}
        <g opacity="0.28">
          {orbs.map(o => (
            <line
              key={`line-${o.project.id}`}
              x1={width / 2}
              y1={height / 2}
              x2={o.x}
              y2={o.y}
              stroke="#64748B"
              strokeWidth="1"
              strokeDasharray="5 7"
            />
          ))}
        </g>

        {/* Center hub */}
        <circle cx={width / 2} cy={height / 2} r={20} fill="rgba(27,43,72,0.04)" stroke="rgba(27,43,72,0.1)" strokeWidth="1" />
        <text x={width / 2} y={height / 2 + 5} textAnchor="middle" fill="rgba(27,43,72,0.5)" fontSize="8" fontFamily="Cairo" fontWeight="700">
          دار وإعمار
        </text>

        {/* Project Orbs */}
        {orbs.map((o) => (
          <g
            key={o.project.id}
            className="project-orb"
            style={{ cursor: 'pointer' }}
            onMouseEnter={() => setHovered(o.project.id)}
            onMouseLeave={() => setHovered(null)}
          >
            {/* Bottleneck pulse ring */}
            {o.bottleneck && (
              <circle
                cx={o.x}
                cy={o.y}
                r={o.radius + 10}
                fill="none"
                stroke="#EF4444"
                strokeWidth="2"
                opacity="0.4"
                filter="url(#pulse-glow)"
              >
                <animate
                  attributeName="r"
                  values={`${o.radius + 5};${o.radius + 18};${o.radius + 5}`}
                  dur="2s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="opacity"
                  values="0.5;0.1;0.5"
                  dur="2s"
                  repeatCount="indefinite"
                />
              </circle>
            )}

            {/* Main orb */}
            <circle
              cx={o.x}
              cy={o.y}
              r={o.radius}
              fill={`url(#grad-${o.project.id})`}
              stroke={hovered === o.project.id ? '#1B2B48' : `${o.color}60`}
              strokeWidth={hovered === o.project.id ? 2 : 1}
              filter={hovered === o.project.id ? 'url(#orb-glow)' : undefined}
              style={{ transition: 'stroke 0.3s, stroke-width 0.3s' }}
            />

            {/* Progress arc */}
            {o.project.progress > 0 && o.project.progress < 100 && (
              <circle
                cx={o.x}
                cy={o.y}
                r={o.radius - 3}
                fill="none"
                stroke="rgba(27,43,72,0.2)"
                strokeWidth="2"
                strokeDasharray={`${(o.project.progress / 100) * 2 * Math.PI * (o.radius - 3)} ${2 * Math.PI * (o.radius - 3)}`}
                strokeLinecap="round"
                transform={`rotate(-90 ${o.x} ${o.y})`}
              />
            )}

            {/* Label */}
            <text
              x={o.x}
              y={o.y + o.radius + 16}
              textAnchor="middle"
              fill="rgba(27,43,72,0.6)"
              fontSize="9"
              fontFamily="Cairo"
              fontWeight="600"
            >
              {(o.project.title || o.project.name || '').slice(0, 20)}
            </text>
          </g>
        ))}
      </svg>

      {/* Hover Tooltip */}
      <AnimatePresence>
        {hoveredOrb && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="absolute top-4 right-4 glass-card p-5 max-w-xs z-30"
            style={{ borderRadius: 20 }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-4 h-4 rounded-full" style={{ background: hoveredOrb.color }} />
              <h4 className="text-sm font-black text-[#1B2B48]">{hoveredOrb.project.title || hoveredOrb.project.name}</h4>
            </div>
            <div className="space-y-1.5 text-xs text-gray-400">
              {/* Status badge */}
              <div className="flex items-center gap-1.5 mb-2">
                {hoveredOrb.bottleneck ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-red-500/15 text-red-400 text-[10px] font-black"><AlertTriangle size={10} /> تأخير</span>
                ) : hoveredOrb.color === '#22C55E' ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-green-500/15 text-green-400 text-[10px] font-black"><CheckCircle2 size={10} /> مكتمل</span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-orange-500/15 text-orange-400 text-[10px] font-black"><Clock size={10} /> قيد العمل</span>
                )}
              </div>
              <p>التقدم: <span className="text-[#1B2B48] font-bold">{hoveredOrb.project.progress || 0}%</span></p>
              <p>الموقع: <span className="text-[#1B2B48]">{hoveredOrb.project.location || '—'}</span></p>
              <p>الوحدات: <span className="text-[#1B2B48]">{hoveredOrb.project.units_count || '—'}</span></p>
              {/* Work summary */}
              {hoveredOrb.works.length > 0 && (
                <div className="mt-2 pt-2 border-t border-[#1B2B48]/5">
                  <p className="text-[10px] text-gray-500 mb-1">المهام: {hoveredOrb.works.filter(w => w.status === 'completed').length}/{hoveredOrb.works.length} مكتمل</p>
                  <div className="h-1 rounded-full bg-[#1B2B48]/5 overflow-hidden">
                    <div className="h-full rounded-full bg-green-500" style={{ width: `${hoveredOrb.works.length > 0 ? (hoveredOrb.works.filter(w => w.status === 'completed').length / hoveredOrb.works.length) * 100 : 0}%` }} />
                  </div>
                </div>
              )}
              {hoveredOrb.bottleneck && (
                <p className="text-red-400 font-bold mt-2 text-[10px]">⚠ يوجد مهام متأخرة تحتاج متابعة</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Legend + Live Counter */}
      <div className="flex flex-wrap items-center justify-center gap-6 mt-6">
        {[
          { color: STATUS_COLORS.completed, label: 'مكتمل', icon: <CheckCircle2 size={11} />, count: orbs.filter(o => o.color === STATUS_COLORS.completed).length },
          { color: STATUS_COLORS.inProgress, label: 'قيد العمل', icon: <Clock size={11} />, count: orbs.filter(o => o.color === STATUS_COLORS.inProgress).length },
          { color: STATUS_COLORS.delayed, label: 'تأخير', icon: <AlertTriangle size={11} />, count: orbs.filter(o => o.color === STATUS_COLORS.delayed).length },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-2 glass-card px-3 py-1.5" style={{ borderRadius: 12 }}>
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
            <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1">{item.icon} {item.label}</span>
            <span className="text-[11px] font-black text-[#1B2B48]">{item.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default InteractiveProjectPulse;
