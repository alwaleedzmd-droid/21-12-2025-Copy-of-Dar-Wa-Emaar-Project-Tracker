// AreaHeatMap.tsx — خريطة حرارية للمناطق
// Visualizes project density and delay severity by geographic location
import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, AlertTriangle, CheckCircle2, BarChart3, Flame } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { LOCATIONS_ORDER } from '../../constants';

interface LocationData {
  name: string;
  projectCount: number;
  completedCount: number;
  delayedCount: number;
  avgProgress: number;
  totalWorks: number;
  completedWorks: number;
  heat: number; // 0-1 intensity
}

const AreaHeatMap: React.FC = () => {
  const { projects, projectWorks } = useData();
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'heat' | 'projects' | 'delayed'>('heat');

  const locationData = useMemo(() => {
    const now = Date.now();
    // Gather all unique locations
    const locSet = new Set<string>();
    projects.forEach(p => {
      if (p.location) locSet.add(p.location);
    });
    // Also add known locations
    LOCATIONS_ORDER.forEach(l => locSet.add(l));

    const data: LocationData[] = Array.from(locSet).map(name => {
      const locProjects = projects.filter(p => p.location === name);
      const projectCount = locProjects.length;
      const completedCount = locProjects.filter(p => p.status === 'completed' || p.progress >= 100).length;
      const avgProgress = projectCount > 0 
        ? Math.round(locProjects.reduce((s, p) => s + (p.progress || 0), 0) / projectCount) 
        : 0;

      const locWorkIds = locProjects.map(p => p.id);
      const locWorks = projectWorks.filter(w => locWorkIds.includes(w.projectId));
      const totalWorks = locWorks.length;
      const completedWorks = locWorks.filter(w => w.status === 'completed').length;
      const delayedCount = locWorks.filter(w => {
        if (w.status === 'completed') return false;
        const created = new Date(w.created_at).getTime();
        return (now - created) > 7 * 24 * 3600000;
      }).length;

      // Heat score: weighted combination of delays and project density
      const delayRatio = totalWorks > 0 ? delayedCount / totalWorks : 0;
      const heat = Math.min(1, delayRatio * 0.7 + (projectCount / Math.max(1, projects.length)) * 0.3);

      return { name, projectCount, completedCount, delayedCount, avgProgress, totalWorks, completedWorks, heat };
    }).filter(d => d.projectCount > 0);

    // Sort
    if (sortBy === 'heat') data.sort((a, b) => b.heat - a.heat);
    else if (sortBy === 'projects') data.sort((a, b) => b.projectCount - a.projectCount);
    else data.sort((a, b) => b.delayedCount - a.delayedCount);

    return data;
  }, [projects, projectWorks, sortBy]);

  const maxProjects = useMemo(() => Math.max(1, ...locationData.map(d => d.projectCount)), [locationData]);

  const getHeatColor = (heat: number) => {
    if (heat > 0.7) return { bg: 'rgba(239, 68, 68, 0.25)', border: 'rgba(239, 68, 68, 0.4)', text: '#EF4444' };
    if (heat > 0.4) return { bg: 'rgba(245, 158, 11, 0.2)', border: 'rgba(245, 158, 11, 0.3)', text: '#F59E0B' };
    if (heat > 0.15) return { bg: 'rgba(233, 93, 34, 0.15)', border: 'rgba(233, 93, 34, 0.25)', text: '#E95D22' };
    return { bg: 'rgba(34, 197, 94, 0.12)', border: 'rgba(34, 197, 94, 0.2)', text: '#22C55E' };
  };

  const selected = selectedLocation ? locationData.find(d => d.name === selectedLocation) : null;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Flame size={20} className="text-[#E95D22]" />
            <span className="cin-subtitle">التوزيع الجغرافي</span>
          </div>
          <h2 className="text-3xl font-black text-[#1B2B48]">خريطة حرارية للمناطق</h2>
          <p className="text-[10px] md:text-[11px] text-gray-500 font-bold mt-1 leading-relaxed">
            آلية الاحتساب: مستوى الحرارة يرتفع مع زيادة التأخير وكثافة المشاريع داخل المنطقة.
            اللون الأخضر منخفض، البرتقالي متوسط، والأحمر يشير لمناطق تحتاج متابعة عاجلة.
          </p>
        </div>
        <div className="flex gap-2">
          {([
            { key: 'heat' as const, label: 'الحرارة' },
            { key: 'projects' as const, label: 'المشاريع' },
            { key: 'delayed' as const, label: 'التأخيرات' },
          ]).map(s => (
            <button
              key={s.key}
              onClick={() => setSortBy(s.key)}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all ${
                sortBy === s.key ? 'bg-[#E95D22]/20 text-[#E95D22] border border-[#E95D22]/30' : 'glass-card text-gray-400'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Heat Grid */}
        <div className="md:col-span-2 glass-card p-5" style={{ borderRadius: 20 }}>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[400px] overflow-y-auto">
            {locationData.map((loc, i) => {
              const heat = getHeatColor(loc.heat);
              const isSelected = selectedLocation === loc.name;
              return (
                <motion.div
                  key={loc.name}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => setSelectedLocation(isSelected ? null : loc.name)}
                  className={`rounded-xl p-4 cursor-pointer transition-all border ${isSelected ? 'ring-2 ring-[#E95D22]/50' : ''}`}
                  style={{ background: heat.bg, borderColor: heat.border }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin size={12} style={{ color: heat.text }} />
                    <span className="text-[11px] font-black text-[#1B2B48] truncate">{loc.name}</span>
                  </div>
                  
                  {/* Project density bar */}
                  <div className="h-2 rounded-full bg-[#1B2B48]/5 mb-2 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: heat.text }}
                      initial={{ width: 0 }}
                      animate={{ width: `${(loc.projectCount / maxProjects) * 100}%` }}
                      transition={{ delay: i * 0.05, duration: 0.6 }}
                    />
                  </div>

                  <div className="flex justify-between text-[8px] font-bold">
                    <span className="text-gray-400">{loc.projectCount} مشروع</span>
                    {loc.delayedCount > 0 && (
                      <span className="text-red-400 flex items-center gap-0.5">
                        <AlertTriangle size={7} /> {loc.delayedCount}
                      </span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {locationData.length === 0 && (
            <p className="text-center text-gray-500 text-sm py-10">لا توجد بيانات مواقع</p>
          )}
        </div>

        {/* Detail Panel */}
        <div className="glass-card p-5" style={{ borderRadius: 20 }}>
          {selected ? (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <MapPin size={16} className="text-[#E95D22]" />
                <h3 className="text-sm font-black text-[#1B2B48]">{selected.name}</h3>
              </div>

              <div className="space-y-3">
                {[
                  { label: 'المشاريع', value: selected.projectCount, color: '#1B2B48' },
                  { label: 'المكتملة', value: selected.completedCount, color: '#22C55E' },
                  { label: 'متوسط التقدم', value: `${selected.avgProgress}%`, color: '#E95D22' },
                  { label: 'إجمالي المهام', value: selected.totalWorks, color: '#3B82F6' },
                  { label: 'المهام المكتملة', value: selected.completedWorks, color: '#22C55E' },
                  { label: 'المتأخرة', value: selected.delayedCount, color: selected.delayedCount > 0 ? '#EF4444' : '#22C55E' },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between py-2 border-b border-[#1B2B48]/5">
                    <span className="text-[10px] text-gray-400 font-bold">{item.label}</span>
                    <span className="text-sm font-black" style={{ color: item.color }}>{item.value}</span>
                  </div>
                ))}
              </div>

              {/* Heat indicator */}
              <div className="mt-4 text-center">
                <p className="text-[9px] text-gray-500 mb-1">مستوى الحرارة</p>
                <div className="h-3 rounded-full bg-gradient-to-l from-red-500 via-amber-500 to-green-500 relative">
                  <motion.div
                    className="absolute top-[-4px] w-5 h-5 rounded-full bg-white border-2 border-gray-300 shadow-lg"
                    animate={{ left: `${selected.heat * 100}%` }}
                    transition={{ type: 'spring', stiffness: 200 }}
                    style={{ marginLeft: -10 }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center py-10">
              <MapPin size={28} className="text-gray-600 mb-3" />
              <p className="text-xs text-gray-500 font-bold">اختر منطقة</p>
              <p className="text-[9px] text-gray-600">اضغط على أي منطقة لعرض التفاصيل</p>
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-4 mt-4 text-[9px] font-bold">
        {[
          { color: '#22C55E', label: 'منخفض' },
          { color: '#E95D22', label: 'متوسط' },
          { color: '#F59E0B', label: 'مرتفع' },
          { color: '#EF4444', label: 'حرج' },
        ].map(item => (
          <span key={item.label} className="flex items-center gap-1.5 text-gray-400">
            <span className="w-3 h-3 rounded" style={{ background: item.color }} />
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
};

export default AreaHeatMap;
