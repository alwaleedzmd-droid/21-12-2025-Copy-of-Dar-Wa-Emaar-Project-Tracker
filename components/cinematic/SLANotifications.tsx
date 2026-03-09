// SLANotifications.tsx — إشعارات ذكية لتجاوز SLA
// Real-time SLA breach detection with severity levels and countdown timers
import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, AlertTriangle, Clock, CheckCircle2, Timer, X, Filter } from 'lucide-react';
import { useData } from '../../contexts/DataContext';

interface SLAAlert {
  id: number;
  taskName: string;
  projectName: string;
  daysOverdue: number;
  severity: 'critical' | 'warning' | 'approaching';
  handler: string;
  createdAt: string;
  expectedDate?: string;
}

const severityConfig = {
  critical: { color: '#EF4444', bg: 'bg-red-500/10', border: 'border-red-500/20', label: 'حرج', icon: AlertTriangle },
  warning: { color: '#F59E0B', bg: 'bg-amber-500/10', border: 'border-amber-500/20', label: 'تحذير', icon: Clock },
  approaching: { color: '#3B82F6', bg: 'bg-blue-500/10', border: 'border-blue-500/20', label: 'قريب', icon: Timer },
};

const SLANotifications: React.FC = () => {
  const { projectWorks } = useData();
  const [filter, setFilter] = useState<'all' | 'critical' | 'warning' | 'approaching'>('all');
  const [dismissedIds, setDismissedIds] = useState<Set<number>>(new Set());

  const alerts = useMemo(() => {
    const now = Date.now();
    const SLA_CRITICAL = 14; // days
    const SLA_WARNING = 7;   // days
    const SLA_APPROACHING = 4; // days

    return projectWorks
      .filter(w => w.status !== 'completed')
      .map(w => {
        const created = new Date(w.created_at).getTime();
        const ageDays = Math.floor((now - created) / (24 * 3600000));
        
        // Check expected_completion_date
        let daysOverdue = ageDays;
        if (w.expected_completion_date) {
          const expected = new Date(w.expected_completion_date).getTime();
          const overdue = Math.floor((now - expected) / (24 * 3600000));
          if (overdue > 0) daysOverdue = Math.max(daysOverdue, overdue);
        }

        let severity: SLAAlert['severity'];
        if (daysOverdue >= SLA_CRITICAL) severity = 'critical';
        else if (daysOverdue >= SLA_WARNING) severity = 'warning';
        else if (daysOverdue >= SLA_APPROACHING) severity = 'approaching';
        else return null;

        return {
          id: w.id,
          taskName: w.task_name,
          projectName: w.project_name,
          daysOverdue,
          severity,
          handler: w.current_handler || w.assigned_to_name || '—',
          createdAt: w.created_at,
          expectedDate: w.expected_completion_date,
        } as SLAAlert;
      })
      .filter((a): a is SLAAlert => a !== null && !dismissedIds.has(a.id))
      .sort((a, b) => b.daysOverdue - a.daysOverdue);
  }, [projectWorks, dismissedIds]);

  const filtered = useMemo(() => {
    if (filter === 'all') return alerts;
    return alerts.filter(a => a.severity === filter);
  }, [alerts, filter]);

  const counts = useMemo(() => ({
    all: alerts.length,
    critical: alerts.filter(a => a.severity === 'critical').length,
    warning: alerts.filter(a => a.severity === 'warning').length,
    approaching: alerts.filter(a => a.severity === 'approaching').length,
  }), [alerts]);

  return (
    <div className="w-full">
      <div className="flex items-center gap-3 mb-2">
        <Bell size={20} className="text-[#E95D22]" />
        <span className="cin-subtitle">مراقبة SLA</span>
      </div>
      <h2 className="text-3xl font-black text-[#1B2B48] mb-6">إشعارات تجاوز المواعيد</h2>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        {(['all', 'critical', 'warning', 'approaching'] as const).map(f => {
          const isActive = filter === f;
          const label = f === 'all' ? `الكل (${counts.all})` 
            : `${severityConfig[f].label} (${counts[f]})`;
          const color = f === 'all' ? '#E95D22' : severityConfig[f].color;
          
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all ${
                isActive ? 'border' : 'glass-card text-gray-400'
              }`}
              style={isActive ? { borderColor: `${color}40`, background: `${color}15`, color } : {}}
            >
              {f !== 'all' && React.createElement(severityConfig[f].icon, { size: 10 })}
              {label}
            </button>
          );
        })}
      </div>

      {/* Alert Cards */}
      <div className="glass-card p-4" style={{ borderRadius: 20 }}>
        {filtered.length === 0 ? (
          <div className="text-center py-10">
            <CheckCircle2 size={32} className="text-green-500 mx-auto mb-3 opacity-50" />
            <p className="text-sm text-gray-500 font-bold">لا توجد تنبيهات</p>
            <p className="text-[10px] text-gray-600">جميع المهام ضمن المواعيد المحددة</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            <AnimatePresence>
              {filtered.map((alert, i) => {
                const config = severityConfig[alert.severity];
                const SevIcon = config.icon;
                return (
                  <motion.div
                    key={alert.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10, height: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className={`flex items-center gap-3 p-3 rounded-xl ${config.bg} border ${config.border} group`}
                  >
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `${config.color}20` }}>
                      <SevIcon size={16} style={{ color: config.color }} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold text-[#1B2B48] truncate">{alert.taskName}</p>
                      <p className="text-[9px] text-gray-500">{alert.projectName} • {alert.handler}</p>
                    </div>

                    {/* Days counter */}
                    <div className="text-center flex-shrink-0">
                      <p className="text-lg font-black" style={{ color: config.color }}>{alert.daysOverdue}</p>
                      <p className="text-[7px] text-gray-500 font-bold">يوم</p>
                    </div>

                    {/* Expected date */}
                    {alert.expectedDate && (
                      <div className="text-center flex-shrink-0 hidden md:block">
                        <p className="text-[9px] text-gray-500">الموعد</p>
                        <p className="text-[10px] text-gray-400 font-bold">
                          {new Date(alert.expectedDate).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                    )}

                    {/* Dismiss */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDismissedIds(prev => new Set([...prev, alert.id]));
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-[#1B2B48]/5"
                    >
                      <X size={12} className="text-gray-500" />
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};

export default SLANotifications;
