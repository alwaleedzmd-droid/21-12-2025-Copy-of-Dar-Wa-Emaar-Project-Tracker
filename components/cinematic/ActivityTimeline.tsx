// ActivityTimeline.tsx — سجل نشاط مرئي
// Real-time timeline showing recent system activities with filtering
import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, Clock, User, FileText, Wrench, MapPin, 
  CheckCircle2, AlertTriangle, Edit3, Trash2, Plus, 
  ArrowRight, RefreshCw, Filter
} from 'lucide-react';
import { activityLogService, type ActionType, type EntityType } from '../../services/activityLogService';

interface ActivityEntry {
  id: string;
  user_name: string;
  user_role: string;
  action_type: ActionType;
  entity_type: EntityType;
  entity_name: string;
  description: string;
  created_at: string;
}

const actionIcons: Record<string, React.ReactNode> = {
  create: <Plus size={12} />,
  update: <Edit3 size={12} />,
  delete: <Trash2 size={12} />,
  approve: <CheckCircle2 size={12} />,
  reject: <AlertTriangle size={12} />,
  assign: <ArrowRight size={12} />,
  complete: <CheckCircle2 size={12} />,
  status_change: <Activity size={12} />,
  comment: <FileText size={12} />,
  handler_change: <User size={12} />,
  deadline_change: <Clock size={12} />,
  justify_delay: <AlertTriangle size={12} />,
};

const actionColors: Record<string, string> = {
  create: '#22C55E',
  update: '#3B82F6',
  delete: '#EF4444',
  approve: '#22C55E',
  reject: '#EF4444',
  assign: '#E95D22',
  complete: '#22C55E',
  status_change: '#8B5CF6',
  comment: '#64748B',
  handler_change: '#F59E0B',
  deadline_change: '#F59E0B',
  justify_delay: '#EF4444',
};

const entityIcons: Record<string, React.ReactNode> = {
  project: <FileText size={10} />,
  work: <Wrench size={10} />,
  deed_request: <MapPin size={10} />,
  technical_request: <Wrench size={10} />,
  assignment: <User size={10} />,
  workflow: <Activity size={10} />,
  user: <User size={10} />,
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'الآن';
  if (minutes < 60) return `${minutes} دقيقة`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ساعة`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} يوم`;
  return new Date(dateStr).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' });
}

const ActivityTimeline: React.FC = () => {
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | EntityType>('all');
  const [limit, setLimit] = useState(30);

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const data = await activityLogService.getRecent(limit);
      setActivities(data as ActivityEntry[]);
    } catch {
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchActivities(); }, [limit]);

  const filtered = useMemo(() => {
    if (filter === 'all') return activities;
    return activities.filter(a => a.entity_type === filter);
  }, [activities, filter]);

  // Group by date
  const grouped = useMemo(() => {
    const groups: Record<string, ActivityEntry[]> = {};
    filtered.forEach(a => {
      const date = new Date(a.created_at).toLocaleDateString('ar-SA', { weekday: 'long', month: 'long', day: 'numeric' });
      if (!groups[date]) groups[date] = [];
      groups[date].push(a);
    });
    return Object.entries(groups);
  }, [filtered]);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Activity size={20} className="text-[#E95D22]" />
            <span className="cin-subtitle">سجل النظام</span>
          </div>
          <h2 className="text-3xl font-black text-[#1B2B48]">سجل النشاط المرئي</h2>
        </div>
        <button 
          onClick={fetchActivities}
          className="glass-card p-3 hover:bg-[#1B2B48]/5 transition-all" style={{ borderRadius: 14 }}
        >
          <RefreshCw size={14} className={`text-gray-400 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Entity filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        {[
          { key: 'all' as const, label: 'الكل' },
          { key: 'project' as const, label: 'المشاريع' },
          { key: 'work' as const, label: 'المهام' },
          { key: 'technical_request' as const, label: 'الفنية' },
          { key: 'deed_request' as const, label: 'الإفراغ' },
          { key: 'user' as const, label: 'المستخدمين' },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all ${
              filter === f.key ? 'bg-[#E95D22]/20 text-[#E95D22] border border-[#E95D22]/30' : 'glass-card text-gray-400'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Timeline */}
      <div className="glass-card p-5" style={{ borderRadius: 20 }}>
        {loading && activities.length === 0 ? (
          <div className="text-center py-10">
            <RefreshCw size={20} className="animate-spin text-gray-500 mx-auto mb-3" />
            <p className="text-sm text-gray-500">جاري التحميل...</p>
          </div>
        ) : grouped.length === 0 ? (
          <div className="text-center py-10">
            <Activity size={24} className="text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-500">لا توجد نشاطات مسجلة</p>
          </div>
        ) : (
          <div className="space-y-6 max-h-[450px] overflow-y-auto">
            {grouped.map(([date, entries]) => (
              <div key={date}>
                <p className="text-[10px] font-black text-gray-500 mb-3 sticky top-0 bg-transparent">{date}</p>
                <div className="relative mr-4 border-r-2 border-[#1B2B48]/5">
                  {entries.map((entry, i) => {
                    const color = actionColors[entry.action_type] || '#64748B';
                    return (
                      <motion.div
                        key={entry.id || i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.02 }}
                        className="flex items-start gap-3 pr-4 pb-3 relative"
                      >
                        {/* Timeline dot */}
                        <div 
                          className="absolute right-[-7px] top-1 w-3 h-3 rounded-full border-2 flex-shrink-0"
                          style={{ borderColor: color, background: `${color}30` }}
                        />

                        {/* Action icon */}
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: `${color}15`, color }}>
                          {actionIcons[entry.action_type] || <Activity size={12} />}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] text-[#1B2B48] font-bold leading-relaxed">{entry.description}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[8px] text-gray-500 flex items-center gap-1">
                              <User size={8} /> {entry.user_name}
                            </span>
                            {entry.entity_name && (
                              <span className="text-[8px] text-gray-600 flex items-center gap-1">
                                {entityIcons[entry.entity_type]} {entry.entity_name}
                              </span>
                            )}
                            <span className="text-[8px] text-gray-600 mr-auto">{timeAgo(entry.created_at)}</span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Load more */}
        {!loading && activities.length >= limit && (
          <button 
            onClick={() => setLimit(l => l + 30)}
            className="w-full mt-3 py-2 text-center text-[10px] font-bold text-gray-500 hover:text-[#E95D22] transition-colors"
          >
            تحميل المزيد...
          </button>
        )}
      </div>
    </div>
  );
};

export default ActivityTimeline;
