// MonthlyComparison.tsx — مقارنة شهرية للأداء
// Month-over-month comparison charts using Recharts
import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, BarChart3, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { useData } from '../../contexts/DataContext';

interface MonthData {
  month: string;
  monthLabel: string;
  completed: number;
  created: number;
  delayed: number;
  techRequests: number;
}

const MonthlyComparison: React.FC = () => {
  const { projectWorks, technicalRequests } = useData();
  const [period, setPeriod] = useState<3 | 6 | 12>(6);

  const monthlyData = useMemo(() => {
    const now = new Date();
    const months: MonthData[] = [];

    for (let i = period - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      const monthLabel = d.toLocaleDateString('ar-SA', { month: 'short', year: '2-digit' });

      const inMonth = (dateStr: string) => {
        const dt = new Date(dateStr);
        return dt >= d && dt < nextMonth;
      };

      const created = projectWorks.filter(w => inMonth(w.created_at)).length;
      const completed = projectWorks.filter(w => w.status === 'completed' && w.completed_at && inMonth(w.completed_at)).length;
      // For works without completed_at, estimate from created_at
      const completedFallback = completed || projectWorks.filter(w => w.status === 'completed' && inMonth(w.created_at)).length;
      
      const delayed = projectWorks.filter(w => {
        if (w.status === 'completed') return false;
        if (!inMonth(w.created_at)) return false;
        const created = new Date(w.created_at).getTime();
        return (Date.now() - created) > 7 * 24 * 3600000;
      }).length;

      const techRequests = technicalRequests.filter(t => inMonth(t.created_at)).length;

      months.push({ month: monthKey, monthLabel, completed: completedFallback, created, delayed, techRequests });
    }

    return months;
  }, [projectWorks, technicalRequests, period]);

  // Trend calculation (current vs previous month)
  const trend = useMemo(() => {
    if (monthlyData.length < 2) return { completedTrend: 0, delayedTrend: 0 };
    const curr = monthlyData[monthlyData.length - 1];
    const prev = monthlyData[monthlyData.length - 2];
    
    const completedTrend = prev.completed > 0 
      ? Math.round(((curr.completed - prev.completed) / prev.completed) * 100) 
      : curr.completed > 0 ? 100 : 0;
    const delayedTrend = prev.delayed > 0 
      ? Math.round(((curr.delayed - prev.delayed) / prev.delayed) * 100) 
      : curr.delayed > 0 ? 100 : 0;
    
    return { completedTrend, delayedTrend };
  }, [monthlyData]);

  const TrendIcon = (v: number) => v > 0 ? <TrendingUp size={12} /> : v < 0 ? <TrendingDown size={12} /> : <Minus size={12} />;
  const trendColor = (v: number, inverse = false) => {
    const positive = inverse ? v < 0 : v > 0;
    return positive ? 'text-green-400' : v === 0 ? 'text-gray-400' : 'text-red-400';
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <BarChart3 size={20} className="text-[#E95D22]" />
            <span className="cin-subtitle">تحليل الأداء</span>
          </div>
          <h2 className="text-3xl font-black text-[#1B2B48]">المقارنة الشهرية</h2>
        </div>
        <div className="flex gap-2">
          {([3, 6, 12] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all ${
                period === p ? 'bg-[#E95D22]/20 text-[#E95D22] border border-[#E95D22]/30' : 'glass-card text-gray-400'
              }`}
            >
              {p} أشهر
            </button>
          ))}
        </div>
      </div>

      {/* Trend Summary */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="glass-card p-4" style={{ borderRadius: 16 }}>
          <p className="text-[9px] text-gray-500 font-bold mb-1">المهام المكتملة (مقارنة بالشهر السابق)</p>
          <div className={`flex items-center gap-2 ${trendColor(trend.completedTrend)}`}>
            {TrendIcon(trend.completedTrend)}
            <span className="text-lg font-black">{trend.completedTrend > 0 ? '+' : ''}{trend.completedTrend}%</span>
          </div>
        </div>
        <div className="glass-card p-4" style={{ borderRadius: 16 }}>
          <p className="text-[9px] text-gray-500 font-bold mb-1">التأخيرات (مقارنة بالشهر السابق)</p>
          <div className={`flex items-center gap-2 ${trendColor(trend.delayedTrend, true)}`}>
            {TrendIcon(trend.delayedTrend)}
            <span className="text-lg font-black">{trend.delayedTrend > 0 ? '+' : ''}{trend.delayedTrend}%</span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="glass-card p-5" style={{ borderRadius: 20 }}>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={monthlyData} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(27,43,72,0.06)" />
            <XAxis 
              dataKey="monthLabel" 
              tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 700 }} 
              axisLine={false}
              tickLine={false}
            />
            <YAxis 
              tick={{ fill: '#64748B', fontSize: 9 }}
              axisLine={false}
              tickLine={false}
              width={30}
            />
            <Tooltip
              contentStyle={{ 
                background: 'rgba(255, 255, 255, 0.95)', 
                border: '1px solid rgba(27,43,72,0.08)', 
                borderRadius: 12,
                fontSize: 11,
                fontWeight: 700,
                color: '#1B2B48',
                boxShadow: '0 8px 24px -4px rgba(27,43,72,0.1)',
              }}
              labelStyle={{ fontWeight: 900, marginBottom: 4 }}
            />
            <Legend 
              wrapperStyle={{ fontSize: 10, fontWeight: 700 }}
              formatter={(value) => {
                const labels: Record<string, string> = { completed: 'مكتملة', created: 'جديدة', delayed: 'متأخرة', techRequests: 'طلبات فنية' };
                return labels[value] || value;
              }}
            />
            <Bar dataKey="completed" fill="#22C55E" radius={[4, 4, 0, 0]} name="completed" />
            <Bar dataKey="created" fill="#E95D22" radius={[4, 4, 0, 0]} name="created" />
            <Bar dataKey="delayed" fill="#EF4444" radius={[4, 4, 0, 0]} name="delayed" />
            <Bar dataKey="techRequests" fill="#3B82F6" radius={[4, 4, 0, 0]} name="techRequests" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default MonthlyComparison;
