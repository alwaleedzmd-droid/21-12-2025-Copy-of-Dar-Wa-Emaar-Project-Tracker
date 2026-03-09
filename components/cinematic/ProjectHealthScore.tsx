// ProjectHealthScore.tsx — مؤشر صحة المشروع المركّب
// Composite health score from: progress + delays + open tasks + SLA compliance
import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Activity, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Heart } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import type { ProjectSummary, ProjectWork } from '../../types';

interface HealthData {
  project: ProjectSummary;
  score: number;           // 0-100
  progressScore: number;   // 0-35 (task completion)
  delayScore: number;      // 0-40 (inverse of overdue severity)
  onTimeScore: number;     // 0-25 (on-time delivery rate)
  grade: 'excellent' | 'good' | 'warning' | 'critical';
  delayedTasks: number;
  totalTasks: number;
  completedTasks: number;
  avgDaysOverdue: number;
}

function calcHealth(project: ProjectSummary, works: ProjectWork[]): HealthData {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const totalTasks = works.length;
  const completedTasks = works.filter(w => w.status === 'completed').length;

  // 1. Progress score (0-35): actual task completion ratio
  const progressScore = totalTasks > 0
    ? Math.round((completedTasks / totalTasks) * 35)
    : Math.min(35, (project.progress || 0) * 0.35);

  // 2. Delay score (0-40): based on ACTUAL expected_completion_date
  //    Only tasks with a real deadline that is past count as overdue
  const overdueTasks: number[] = []; // days overdue per task
  works.forEach(w => {
    if (w.status === 'completed') return;
    if (!w.expected_completion_date) return; // no deadline = not overdue
    const deadline = new Date(w.expected_completion_date).getTime();
    if (deadline < today) {
      const daysLate = Math.ceil((today - deadline) / (24 * 3600000));
      overdueTasks.push(daysLate);
    }
  });
  const delayedTasks = overdueTasks.length;
  const avgDaysOverdue = delayedTasks > 0
    ? Math.round(overdueTasks.reduce((a, b) => a + b, 0) / delayedTasks)
    : 0;
  // Severity: 0 overdue → 40, heavily overdue → 0
  // Uses ratio of overdue tasks AND severity of delays
  const overdueRatio = totalTasks > 0 ? delayedTasks / totalTasks : 0;
  const severityPenalty = Math.min(1, avgDaysOverdue / 30); // max penalty at 30+ days late
  const delayScore = Math.round(40 * (1 - (overdueRatio * 0.6 + severityPenalty * 0.4)));

  // 3. On-time delivery score (0-25): completed tasks delivered on/before deadline
  let onTimeTasks = 0;
  let tasksWithDeadline = 0;
  works.forEach(w => {
    if (w.status !== 'completed') return;
    if (!w.expected_completion_date) return;
    tasksWithDeadline++;
    const deadline = new Date(w.expected_completion_date).getTime();
    const completedAt = w.completed_at ? new Date(w.completed_at).getTime() : today;
    if (completedAt <= deadline + 24 * 3600000) { // grace: 1 day
      onTimeTasks++;
    }
  });
  const onTimeScore = tasksWithDeadline > 0
    ? Math.round((onTimeTasks / tasksWithDeadline) * 25)
    : (completedTasks > 0 ? 15 : 12); // neutral if no deadlines set

  const score = Math.max(0, Math.min(100, Math.round(progressScore + delayScore + onTimeScore)));

  const grade: HealthData['grade'] =
    score >= 80 ? 'excellent' :
    score >= 60 ? 'good' :
    score >= 40 ? 'warning' : 'critical';

  return { project, score, progressScore, delayScore, onTimeScore, grade, delayedTasks, totalTasks, completedTasks, avgDaysOverdue };
}

const gradeConfig = {
  excellent: { color: '#22C55E', bg: 'bg-green-500/10', border: 'border-green-500/20', label: 'ممتاز', icon: CheckCircle2 },
  good: { color: '#3B82F6', bg: 'bg-blue-500/10', border: 'border-blue-500/20', label: 'جيد', icon: TrendingUp },
  warning: { color: '#F59E0B', bg: 'bg-amber-500/10', border: 'border-amber-500/20', label: 'تحذير', icon: AlertTriangle },
  critical: { color: '#EF4444', bg: 'bg-red-500/10', border: 'border-red-500/20', label: 'حرج', icon: TrendingDown },
};

// SVG Circular Progress Ring
const HealthRing: React.FC<{ score: number; size?: number; color: string }> = ({ score, size = 56, color }) => {
  const r = (size - 8) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - score / 100);
  
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(27,43,72,0.08)" strokeWidth={4} />
      <motion.circle 
        cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={4}
        strokeLinecap="round"
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
        strokeDasharray={circumference}
      />
      <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="central" 
        className="rotate-90 origin-center" fill="#1B2B48" fontSize={size * 0.24} fontWeight={900}>
        {score}
      </text>
    </svg>
  );
};

const ProjectHealthScore: React.FC = () => {
  const { projects, projectWorks } = useData();

  const healthData = useMemo(() => {
    return projects
      .map(p => calcHealth(p, projectWorks.filter(w => w.projectId === p.id)))
      .sort((a, b) => a.score - b.score); // worst first
  }, [projects, projectWorks]);

  const avgScore = useMemo(() => {
    if (healthData.length === 0) return 0;
    return Math.round(healthData.reduce((s, h) => s + h.score, 0) / healthData.length);
  }, [healthData]);

  const avgGrade = avgScore >= 80 ? 'excellent' : avgScore >= 60 ? 'good' : avgScore >= 40 ? 'warning' : 'critical';
  const config = gradeConfig[avgGrade];

  // Distribution counts
  const distribution = useMemo(() => ({
    excellent: healthData.filter(h => h.grade === 'excellent').length,
    good: healthData.filter(h => h.grade === 'good').length,
    warning: healthData.filter(h => h.grade === 'warning').length,
    critical: healthData.filter(h => h.grade === 'critical').length,
  }), [healthData]);

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <Heart size={20} className="text-[#E95D22]" />
        <span className="cin-subtitle">صحة المحفظة</span>
      </div>
      <h2 className="text-3xl font-black text-[#1B2B48] mb-6">مؤشر صحة المشاريع</h2>
      <p className="text-[10px] md:text-[11px] text-gray-500 font-bold -mt-3 mb-5 leading-relaxed">
        آلية الاحتساب: يعتمد المؤشر على تقدم التنفيذ، والالتزام بالمواعيد، والتسليم في الوقت.
        لا تعتبر المهمة متأخرة إلا إذا تجاوزت تاريخ الإنجاز المتوقع.
      </p>

      {/* Overall Score + Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Overall score card */}
        <div className="glass-card p-6 flex items-center gap-5 glow-border md:col-span-1" style={{ borderRadius: 20 }}>
          <HealthRing score={avgScore} size={80} color={config.color} />
          <div>
            <p className="text-2xl font-black text-[#1B2B48]">{avgScore}<span className="text-sm text-gray-500">/100</span></p>
            <p className="text-xs font-bold" style={{ color: config.color }}>{config.label}</p>
            <p className="text-[9px] text-gray-500 mt-1">{healthData.length} مشروع</p>
          </div>
        </div>

        {/* Distribution */}
        <div className="glass-card p-5 md:col-span-2" style={{ borderRadius: 20 }}>
          <p className="text-[10px] font-bold text-gray-400 mb-3">التوزيع</p>
          <div className="grid grid-cols-4 gap-3">
            {(Object.entries(distribution) as [HealthData['grade'], number][]).map(([grade, count]) => {
              const gc = gradeConfig[grade];
              const GradeIcon = gc.icon;
              return (
                <div key={grade} className={`rounded-xl p-3 ${gc.bg} border ${gc.border} text-center`}>
                  <GradeIcon size={14} style={{ color: gc.color }} className="mx-auto mb-1" />
                  <p className="text-lg font-black text-[#1B2B48]">{count}</p>
                  <p className="text-[8px] font-bold" style={{ color: gc.color }}>{gc.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Project List */}
      <div className="glass-card p-5" style={{ borderRadius: 20 }}>
        <div className="space-y-2 max-h-[350px] overflow-y-auto">
          {healthData.map((h, i) => {
            const gc = gradeConfig[h.grade];
            return (
              <motion.div
                key={h.project.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-[#1B2B48]/[0.03] transition-all"
              >
                <HealthRing score={h.score} size={38} color={gc.color} />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold text-[#1B2B48] truncate">{h.project.title || h.project.name}</p>
                  <p className="text-[9px] text-gray-500">{h.project.location || 'بدون موقع'} • {h.completedTasks}/{h.totalTasks} مهام</p>
                </div>
                {h.delayedTasks > 0 && (
                  <span className="flex items-center gap-0.5 px-2 py-0.5 rounded-lg bg-red-500/10 text-red-400 text-[8px] font-black">
                    <AlertTriangle size={8} /> {h.delayedTasks} متأخر ({h.avgDaysOverdue} يوم)
                  </span>
                )}
                <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black ${gc.bg} border ${gc.border}`} style={{ color: gc.color }}>
                  {gc.label}
                </span>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ProjectHealthScore;
