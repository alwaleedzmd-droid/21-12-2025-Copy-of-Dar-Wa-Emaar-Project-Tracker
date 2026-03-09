// CinematicStats.tsx — نبض العمليات التفاعلي واللحظي للإدارة التنفيذية
// Real-time KPIs with interactive click-to-detail + auto-refresh pulse
import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart3, FileText, Wrench, MapPin, Clock, 
  TrendingUp, CheckCircle2, AlertTriangle, Zap, Activity, RefreshCw
} from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import BentoCard from './BentoCard';

interface StatItem {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  sub?: string;
}

const AnimatedNumber: React.FC<{ value: number; suffix?: string }> = ({ value, suffix = '' }) => {
  return (
    <motion.span
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 25 }}
      className="tabular-nums"
    >
      {value.toLocaleString('ar-SA')}{suffix}
    </motion.span>
  );
};

const CinematicStats: React.FC = () => {
  const { projects, technicalRequests, clearanceRequests, projectWorks, appUsers, refreshData } = useData();
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Auto-refresh every 60s for live feel
  useEffect(() => {
    const interval = setInterval(() => {
      setLastRefresh(Date.now());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshData();
    setLastRefresh(Date.now());
    setTimeout(() => setIsRefreshing(false), 800);
  };

  const stats = useMemo(() => {
    const completedProjects = projects.filter(p => p.status === 'completed' || p.progress >= 100).length;
    const activeProjects = projects.filter(p => p.status !== 'completed' && (p.progress || 0) < 100).length;
    const pendingTech = technicalRequests.filter(r => r.status !== 'completed' && r.status !== 'approved').length;
    const completedTech = technicalRequests.filter(r => r.status === 'completed' || r.status === 'approved').length;
    const totalWorks = projectWorks.length;
    const completedWorks = projectWorks.filter(w => w.status === 'completed').length;
    const avgProgress = projects.length > 0 
      ? Math.round(projects.reduce((s, p) => s + (p.progress || 0), 0) / projects.length) 
      : 0;

    // Bottleneck count (works older than 7 days and not completed)
    const now = Date.now();
    const bottlenecks = projectWorks.filter(w => {
      if (w.status === 'completed') return false;
      const created = new Date(w.created_at).getTime();
      return (now - created) > 7 * 24 * 60 * 60 * 1000;
    }).length;

    // In-progress works
    const inProgressWorks = projectWorks.filter(w => w.status !== 'completed').length;

    return {
      totalProjects: projects.length,
      completedProjects,
      activeProjects,
      totalTech: technicalRequests.length,
      pendingTech,
      completedTech,
      totalDeeds: clearanceRequests.length,
      totalWorks,
      completedWorks,
      inProgressWorks,
      avgProgress,
      bottlenecks,
    };
  }, [projects, technicalRequests, clearanceRequests, projectWorks]);

  const items: (StatItem & { id: string; span?: 'sm' | 'md' | 'lg'; glow?: boolean; pulse?: 'red' | 'green' | null; details?: string[] })[] = [
    {
      id: 'projects',
      label: 'إجمالي المشاريع',
      value: stats.totalProjects,
      icon: <FileText size={20} />,
      color: '#1B2B48',
      sub: `${stats.activeProjects} نشط • ${stats.completedProjects} مكتمل`,
      span: 'md',
      glow: true,
      details: projects.slice(0, 5).map(p => `${p.title || p.name} — ${p.progress || 0}%`),
    },
    {
      id: 'progress',
      label: 'متوسط التقدم',
      value: `${stats.avgProgress}%`,
      icon: <TrendingUp size={20} />,
      color: '#22C55E',
      span: 'sm',
    },
    {
      id: 'bottlenecks',
      label: 'المختنقات',
      value: stats.bottlenecks,
      icon: <AlertTriangle size={20} />,
      color: stats.bottlenecks > 0 ? '#EF4444' : '#22C55E',
      sub: stats.bottlenecks > 0 ? 'مهام متأخرة تحتاج تدخل' : 'لا توجد مختنقات',
      span: 'sm',
      pulse: stats.bottlenecks > 3 ? 'red' as const : null,
      details: stats.bottlenecks > 0 ? projectWorks.filter(w => {
        if (w.status === 'completed') return false;
        const created = new Date(w.created_at).getTime();
        return (Date.now() - created) > 7 * 24 * 60 * 60 * 1000;
      }).slice(0, 5).map(w => `${w.task_name} — ${w.project_name || ''}`) : undefined,
    },
    {
      id: 'tech',
      label: 'الطلبات الفنية',
      value: stats.totalTech,
      icon: <Wrench size={20} />,
      color: '#E95D22',
      sub: `${stats.pendingTech} قيد المعالجة • ${stats.completedTech} منجز`,
      span: 'sm',
    },
    {
      id: 'deeds',
      label: 'سجلات الإفراغ',
      value: stats.totalDeeds,
      icon: <MapPin size={20} />,
      color: '#8B5CF6',
      span: 'sm',
    },
    {
      id: 'works',
      label: 'إجمالي المهام',
      value: stats.totalWorks,
      icon: <Zap size={20} />,
      color: '#06B6D4',
      sub: `${stats.completedWorks} مكتمل • ${stats.inProgressWorks} قيد العمل`,
      span: 'md',
    },
  ];

  return (
    <div className="w-full">
      {/* Section Header */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 25 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <BarChart3 size={20} className="text-[#E95D22]" />
              <span className="cin-subtitle">الإحصائيات اللحظية</span>
              <motion.div
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="w-2 h-2 rounded-full bg-green-500"
                title="متصل — بيانات لحظية"
              />
            </div>
            <h2 className="text-3xl font-black text-[#1B2B48]">نبض العمليات</h2>
          </div>
          <button
            onClick={handleRefresh}
            className="glass-card p-3 hover:bg-[#1B2B48]/5 transition-all"
            style={{ borderRadius: 14 }}
            title="تحديث البيانات"
          >
            <RefreshCw size={16} className={`text-gray-400 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </motion.div>

      {/* Bento Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 auto-rows-[160px]">
        {items.map((item, i) => (
          <BentoCard 
            key={item.id} 
            span={item.span || 'sm'} 
            glow={item.glow} 
            pulse={item.pulse || null}
            delay={i}
            onClick={item.details ? () => setExpandedCard(expandedCard === item.id ? null : item.id) : undefined}
          >
            <div className="flex flex-col justify-between h-full">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${item.color}15` }}>
                  <div style={{ color: item.color }}>{item.icon}</div>
                </div>
                <span className="cin-subtitle">{item.label}</span>
              </div>
              <div>
                <div className="text-3xl font-black text-[#1B2B48] mb-1">
                  {typeof item.value === 'number' ? <AnimatedNumber value={item.value} /> : item.value}
                </div>
                {item.sub && <p className="text-[10px] text-gray-500 font-bold">{item.sub}</p>}
              </div>
              {/* Expandable detail list */}
              <AnimatePresence>
                {expandedCard === item.id && item.details && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-2 pt-2 border-t border-[#1B2B48]/5 space-y-1 overflow-hidden"
                  >
                    {item.details.map((d, idx) => (
                      <p key={idx} className="text-[9px] text-gray-400 truncate">• {d}</p>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
              {item.details && (
                <p className="text-[8px] text-gray-600 text-center mt-1 cursor-pointer">
                  {expandedCard === item.id ? '▲ إخفاء' : '▼ اضغط للتفاصيل'}
                </p>
              )}
            </div>
          </BentoCard>
        ))}
      </div>
    </div>
  );
};

export default CinematicStats;
