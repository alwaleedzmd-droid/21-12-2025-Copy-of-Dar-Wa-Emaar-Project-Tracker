// CustomKPIDashboard.tsx — لوحة KPI مخصصة (Drag & Drop)
// Executive can pick and arrange their preferred KPI cards
import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { motion, Reorder, AnimatePresence } from 'framer-motion';
import { 
  BarChart3, FileText, Wrench, MapPin, Zap, TrendingUp, 
  AlertTriangle, CheckCircle2, Clock, Activity,
  Settings, GripVertical, Plus, X, Save, RotateCcw
} from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import BentoCard from './BentoCard';

interface KPIConfig {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  getValue: () => string | number;
  getSub?: () => string;
  enabled: boolean;
}

const STORAGE_KEY = 'dar_kpi_dashboard_config';

const CustomKPIDashboard: React.FC = () => {
  const { projects, technicalRequests, clearanceRequests, projectWorks } = useData();
  const [isEditing, setIsEditing] = useState(false);

  // Calculate all stats once
  const stats = useMemo(() => {
    const now = Date.now();
    const totalProjects = projects.length;
    const completedProjects = projects.filter(p => p.status === 'completed' || p.progress >= 100).length;
    const activeProjects = totalProjects - completedProjects;
    const avgProgress = totalProjects > 0 ? Math.round(projects.reduce((s, p) => s + (p.progress || 0), 0) / totalProjects) : 0;
    const totalWorks = projectWorks.length;
    const completedWorks = projectWorks.filter(w => w.status === 'completed').length;
    const inProgressWorks = totalWorks - completedWorks;
    const completionRate = totalWorks > 0 ? Math.round((completedWorks / totalWorks) * 100) : 0;
    const bottlenecks = projectWorks.filter(w => {
      if (w.status === 'completed') return false;
      const created = new Date(w.created_at).getTime();
      return (now - created) > 7 * 24 * 3600000;
    }).length;
    const pendingTech = technicalRequests.filter(t => t.status === 'pending' || t.status === 'in_progress').length;
    const totalTech = technicalRequests.length;
    const totalDeeds = clearanceRequests.length;

    // SLA breaches
    const slaBreaches = projectWorks.filter(w => {
      if (w.status === 'completed') return false;
      if (w.expected_completion_date) {
        return new Date(w.expected_completion_date).getTime() < now;
      }
      const created = new Date(w.created_at).getTime();
      return (now - created) > 14 * 24 * 3600000;
    }).length;

    return {
      totalProjects, completedProjects, activeProjects, avgProgress,
      totalWorks, completedWorks, inProgressWorks, completionRate,
      bottlenecks, pendingTech, totalTech, totalDeeds, slaBreaches,
    };
  }, [projects, technicalRequests, clearanceRequests, projectWorks]);

  // All available KPIs
  const allKPIs: Omit<KPIConfig, 'enabled'>[] = useMemo(() => [
    { id: 'totalProjects', label: 'إجمالي المشاريع', icon: <FileText size={18} />, color: '#1B2B48', getValue: () => stats.totalProjects, getSub: () => `${stats.activeProjects} نشط • ${stats.completedProjects} مكتمل` },
    { id: 'avgProgress', label: 'متوسط التقدم', icon: <TrendingUp size={18} />, color: '#22C55E', getValue: () => `${stats.avgProgress}%` },
    { id: 'bottlenecks', label: 'المختنقات', icon: <AlertTriangle size={18} />, color: stats.bottlenecks > 0 ? '#EF4444' : '#22C55E', getValue: () => stats.bottlenecks, getSub: () => stats.bottlenecks > 0 ? 'مهام تحتاج تدخل' : 'لا مختنقات' },
    { id: 'totalWorks', label: 'إجمالي المهام', icon: <Zap size={18} />, color: '#06B6D4', getValue: () => stats.totalWorks, getSub: () => `${stats.completedWorks} مكتمل • ${stats.inProgressWorks} قيد العمل` },
    { id: 'completionRate', label: 'نسبة الإنجاز', icon: <CheckCircle2 size={18} />, color: '#22C55E', getValue: () => `${stats.completionRate}%`, getSub: () => 'من إجمالي المهام' },
    { id: 'techRequests', label: 'الطلبات الفنية', icon: <Wrench size={18} />, color: '#E95D22', getValue: () => stats.totalTech, getSub: () => `${stats.pendingTech} قيد المعالجة` },
    { id: 'deeds', label: 'سجلات الإفراغ', icon: <MapPin size={18} />, color: '#8B5CF6', getValue: () => stats.totalDeeds },
    { id: 'slaBreaches', label: 'تجاوزات SLA', icon: <Clock size={18} />, color: stats.slaBreaches > 0 ? '#EF4444' : '#22C55E', getValue: () => stats.slaBreaches, getSub: () => stats.slaBreaches > 0 ? 'مهام تجاوزت الموعد' : 'لا تجاوزات' },
    { id: 'activeProjects', label: 'المشاريع النشطة', icon: <Activity size={18} />, color: '#3B82F6', getValue: () => stats.activeProjects },
  ], [stats]);

  // Load saved config
  const [enabledIds, setEnabledIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch { /* ignore */ }
    // Default: first 6
    return ['totalProjects', 'avgProgress', 'bottlenecks', 'totalWorks', 'completionRate', 'techRequests'];
  });

  // Reorder state
  const [orderedIds, setOrderedIds] = useState<string[]>(enabledIds);

  useEffect(() => {
    setOrderedIds(enabledIds);
  }, [enabledIds]);

  const saveConfig = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orderedIds));
    setEnabledIds(orderedIds);
    setIsEditing(false);
  };

  const resetConfig = () => {
    const defaults = ['totalProjects', 'avgProgress', 'bottlenecks', 'totalWorks', 'completionRate', 'techRequests'];
    setOrderedIds(defaults);
    setEnabledIds(defaults);
    localStorage.removeItem(STORAGE_KEY);
    setIsEditing(false);
  };

  const toggleKPI = (id: string) => {
    setOrderedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const displayKPIs = orderedIds
    .map(id => allKPIs.find(k => k.id === id))
    .filter((k): k is Omit<KPIConfig, 'enabled'> => !!k);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <BarChart3 size={20} className="text-[#E95D22]" />
            <span className="cin-subtitle">لوحة مخصصة</span>
          </div>
          <h2 className="text-3xl font-black text-[#1B2B48]">مؤشرات الأداء</h2>
        </div>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className={`glass-card p-3 transition-all ${isEditing ? 'bg-[#E95D22]/20 text-[#E95D22]' : 'text-gray-400 hover:bg-[#1B2B48]/5'}`}
          style={{ borderRadius: 14 }}
        >
          <Settings size={16} />
        </button>
      </div>

      {/* Edit Mode */}
      <AnimatePresence>
        {isEditing && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 overflow-hidden"
          >
            <div className="glass-card p-4" style={{ borderRadius: 16 }}>
              <p className="text-[10px] text-gray-400 font-bold mb-3">اختر المؤشرات المراد عرضها (اسحب لإعادة الترتيب)</p>
              <div className="flex flex-wrap gap-2 mb-3">
                {allKPIs.map(kpi => {
                  const isEnabled = orderedIds.includes(kpi.id);
                  return (
                    <button
                      key={kpi.id}
                      onClick={() => toggleKPI(kpi.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all border ${
                        isEnabled 
                          ? 'border-[#E95D22]/30 bg-[#E95D22]/15 text-[#E95D22]' 
                          : 'border-[#1B2B48]/5 bg-[#1B2B48]/[0.02] text-gray-500'
                      }`}
                    >
                      {isEnabled ? <X size={10} /> : <Plus size={10} />}
                      {kpi.label}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-2">
                <button onClick={saveConfig} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#E95D22]/20 text-[#E95D22] text-[10px] font-bold border border-[#E95D22]/30">
                  <Save size={10} /> حفظ
                </button>
                <button onClick={resetConfig} className="flex items-center gap-1.5 px-4 py-2 rounded-xl glass-card text-gray-400 text-[10px] font-bold">
                  <RotateCcw size={10} /> إعادة ضبط
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {displayKPIs.map((kpi, i) => (
          <BentoCard key={kpi.id} span="sm" delay={i}>
            <div className="flex flex-col justify-between h-full p-1">
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${kpi.color}15` }}>
                  <div style={{ color: kpi.color }}>{kpi.icon}</div>
                </div>
                <span className="cin-subtitle text-[9px]">{kpi.label}</span>
              </div>
              <div>
                <p className="text-2xl font-black text-[#1B2B48]">{kpi.getValue()}</p>
                {kpi.getSub && <p className="text-[9px] text-gray-500 font-bold mt-0.5">{kpi.getSub()}</p>}
              </div>
            </div>
          </BentoCard>
        ))}
      </div>

      {displayKPIs.length === 0 && (
        <div className="glass-card p-10 text-center" style={{ borderRadius: 20 }}>
          <Settings size={28} className="text-gray-600 mx-auto mb-3" />
          <p className="text-sm text-gray-500 font-bold">لم يتم اختيار أي مؤشرات</p>
          <p className="text-[10px] text-gray-600">اضغط على أيقونة الإعدادات لتخصيص اللوحة</p>
        </div>
      )}
    </div>
  );
};

export default CustomKPIDashboard;
