import React, { useMemo, useState, useEffect } from 'react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  Building2, Zap, FileStack, TrendingUp,
  CheckCircle2, Clock, Activity, BarChart3
} from 'lucide-react';
import { useData } from '../contexts/DataContext';

// ─── ألوان هوية دار وإعمار ───
const NAVY = '#1B2B48';
const ORANGE = '#E95D22';
const COLORS = {
  navy: NAVY,
  orange: ORANGE,
  green: '#10B981',
  amber: '#F59E0B',
  sky: '#0EA5E9',
  rose: '#F43F5E',
  slate: '#64748B',
  emerald: '#059669',
};

const PIE_COLORS = [COLORS.green, COLORS.orange];
const BAR_COLORS = [COLORS.navy, COLORS.orange, COLORS.green, COLORS.amber, COLORS.sky, COLORS.rose];

// ─── ترجمة حالات الطلبات الفنية ───
const STATUS_LABELS: Record<string, string> = {
  pending: 'قيد الانتظار',
  approved: 'معتمد',
  completed: 'مكتمل',
  rejected: 'مرفوض',
  in_progress: 'قيد التنفيذ',
  new: 'جديد',
  cancelled: 'ملغى',
  under_review: 'تحت المراجعة',
};

// ─── مكون البطاقة الإحصائية ───
interface StatCardProps {
  title: string;
  value: number;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
  delay: number;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, icon, color, delay }) => {
  const [displayValue, setDisplayValue] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const showTimer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(showTimer);
  }, [delay]);

  useEffect(() => {
    if (!visible) return;
    if (value === 0) { setDisplayValue(0); return; }
    const duration = 1200;
    const steps = 40;
    const stepValue = value / steps;
    let current = 0;
    const interval = setInterval(() => {
      current += stepValue;
      if (current >= value) {
        setDisplayValue(value);
        clearInterval(interval);
      } else {
        setDisplayValue(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(interval);
  }, [value, visible]);

  return (
    <div
      className={`bg-white rounded-[35px] shadow-sm border border-gray-100 p-7 flex flex-col gap-4 transition-all duration-700 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
      }`}
    >
      <div className="flex items-center justify-between">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center"
          style={{ backgroundColor: `${color}15` }}
        >
          <div style={{ color }}>{icon}</div>
        </div>
        <TrendingUp size={18} className="text-gray-300" />
      </div>
      <div>
        <p className="text-sm font-bold text-gray-400 mb-1">{title}</p>
        <p className="text-4xl font-black" style={{ color: NAVY }}>
          {displayValue.toLocaleString('ar-SA')}
        </p>
        {subtitle && (
          <p className="text-xs font-bold mt-2" style={{ color }}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
};

// ─── مكون شريط التقدم ───
interface ProgressBarProps {
  label: string;
  percentage: number;
  color: string;
  icon: React.ReactNode;
  delay: number;
}

const AnimatedProgressBar: React.FC<ProgressBarProps> = ({ label, percentage, color, icon, delay }) => {
  const [width, setWidth] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const showTimer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(showTimer);
  }, [delay]);

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => setWidth(percentage), 300);
    return () => clearTimeout(timer);
  }, [percentage, visible]);

  return (
    <div
      className={`transition-all duration-700 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${color}15` }}
          >
            <div style={{ color }}>{icon}</div>
          </div>
          <span className="font-bold text-sm text-gray-700">{label}</span>
        </div>
        <span className="font-black text-lg" style={{ color }}>
          {percentage.toFixed(1)}%
        </span>
      </div>
      <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-[1500ms] ease-out"
          style={{ width: `${width}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
};

// ─── Tooltip مخصص للرسوم البيانية ───
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 font-cairo" dir="rtl">
      {label && <p className="font-bold text-sm text-gray-600 mb-2">{label}</p>}
      {payload.map((entry: any, index: number) => (
        <div key={index} className="flex items-center gap-2 text-sm">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: entry.color || entry.payload?.fill }}
          />
          <span className="font-bold" style={{ color: entry.color || NAVY }}>
            {entry.name}: {entry.value}
          </span>
        </div>
      ))}
    </div>
  );
};

// ─── مكون الرسم البياني الدائري المخصص ───
const CustomPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: any) => {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  if (percent < 0.05) return null;
  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      className="font-bold"
      style={{ fontSize: '13px', fontFamily: 'Cairo' }}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

// ═══════════════════════════════════════════
//  المكون الرئيسي: لوحة الإحصائيات
// ═══════════════════════════════════════════
const StatisticsDashboard: React.FC = () => {
  const { projects, technicalRequests, clearanceRequests, projectWorks, isDbLoading } = useData();
  const [chartsVisible, setChartsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setChartsVisible(true), 600);
    return () => clearTimeout(timer);
  }, []);

  // ─── حساب الإحصائيات مع useMemo ───
  const stats = useMemo(() => {
    const safeProjects = projects ?? [];
    const safeTechnical = technicalRequests ?? [];
    const safeClearance = clearanceRequests ?? [];
    const safeWorks = projectWorks ?? [];

    // إجماليات البطاقات
    const totalProjects = safeProjects.length;
    const totalTechnical = safeTechnical.length;
    const completedTechnical = safeTechnical.filter(
      (r) => r.status === 'completed'
    ).length;
    const technicalCompletionRate =
      totalTechnical > 0 ? (completedTechnical / totalTechnical) * 100 : 0;

    const totalClearance = safeClearance.length;
    const completedClearance = safeClearance.filter(
      (r: any) => r.status === 'completed' || r.status === 'done' || r.status === 'منجز'
    ).length;
    const clearanceCompletionRate =
      totalClearance > 0 ? (completedClearance / totalClearance) * 100 : 0;

    // بيانات المخطط الدائري (أعمال المشاريع)
    const completedWorks = safeWorks.filter(
      (w) => w.status === 'completed'
    ).length;
    const inProgressWorks = safeWorks.length - completedWorks;
    const pieData = [
      { name: 'منجز', value: completedWorks },
      { name: 'قيد الإنجاز', value: inProgressWorks },
    ];

    // بيانات المخطط العمودي (الطلبات الفنية حسب الحالة)
    const techByStatus = safeTechnical.reduce<Record<string, number>>((acc, r) => {
      const status = r.status || 'unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
    const barData = Object.entries(techByStatus).map(([status, count]) => ({
      name: STATUS_LABELS[status] || status,
      العدد: count,
      status,
    }));

    // نسب الإنجاز لأشرطة التقدم
    const worksCompletionRate =
      safeWorks.length > 0 ? (completedWorks / safeWorks.length) * 100 : 0;

    return {
      totalProjects,
      totalTechnical,
      completedTechnical,
      technicalCompletionRate,
      totalClearance,
      completedClearance,
      clearanceCompletionRate,
      pieData,
      barData,
      worksCompletionRate,
    };
  }, [projects, technicalRequests, clearanceRequests, projectWorks]);

  // ─── حالة التحميل ───
  if (isDbLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center" dir="rtl">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full border-4 border-gray-200 border-t-[#E95D22] animate-spin" />
          <p className="text-gray-400 font-bold text-sm font-cairo">
            جاري تحميل الإحصائيات...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 font-cairo" dir="rtl">
      {/* ═══ العنوان الرئيسي ═══ */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#1B2B48] to-[#2a4068] flex items-center justify-center shadow-lg">
          <BarChart3 size={26} className="text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-[#1B2B48]">لوحة الإحصائيات</h1>
          <p className="text-sm text-gray-400 font-bold">
            نظرة شاملة على أداء المشاريع والإنجاز
          </p>
        </div>
      </div>

      {/* ═══ بطاقات الملخص العلوي ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          title="المشاريع النشطة"
          value={stats.totalProjects}
          subtitle={`${stats.totalProjects} مشروع مسجل`}
          icon={<Building2 size={26} />}
          color={COLORS.navy}
          delay={100}
        />
        <StatCard
          title="الطلبات الفنية"
          value={stats.totalTechnical}
          subtitle={`نسبة الإنجاز: ${stats.technicalCompletionRate.toFixed(1)}%`}
          icon={<Zap size={26} />}
          color={COLORS.orange}
          delay={250}
        />
        <StatCard
          title="سجل الإفراغات"
          value={stats.totalClearance}
          subtitle={`نسبة الإنجاز: ${stats.clearanceCompletionRate.toFixed(1)}%`}
          icon={<FileStack size={26} />}
          color={COLORS.green}
          delay={400}
        />
      </div>

      {/* ═══ الرسوم البيانية ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* المخطط الدائري - أعمال المشاريع */}
        <div
          className={`bg-white rounded-[35px] shadow-sm border border-gray-100 p-8 transition-all duration-700 ${
            chartsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
              <Activity size={20} className="text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-black text-[#1B2B48]">توزيع أعمال المشاريع</h3>
              <p className="text-xs text-gray-400 font-bold">
                منجز مقابل قيد الإنجاز
              </p>
            </div>
          </div>

          {stats.pieData.every((d) => d.value === 0) ? (
            <div className="h-72 flex items-center justify-center text-gray-300 font-bold">
              لا توجد بيانات أعمال حالياً
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats.pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={120}
                  paddingAngle={4}
                  dataKey="value"
                  labelLine={false}
                  label={CustomPieLabel}
                  animationBegin={400}
                  animationDuration={1200}
                  animationEasing="ease-out"
                >
                  {stats.pieData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={PIE_COLORS[index]}
                      stroke="none"
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  formatter={(value: string) => (
                    <span className="font-bold text-sm text-gray-600 font-cairo">
                      {value}
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* المخطط العمودي - الطلبات الفنية حسب الحالة */}
        <div
          className={`bg-white rounded-[35px] shadow-sm border border-gray-100 p-8 transition-all duration-700 delay-150 ${
            chartsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
              <BarChart3 size={20} className="text-orange-600" />
            </div>
            <div>
              <h3 className="text-lg font-black text-[#1B2B48]">الطلبات الفنية حسب الحالة</h3>
              <p className="text-xs text-gray-400 font-bold">
                تصنيف الطلبات وفقاً لمراحل المعالجة
              </p>
            </div>
          </div>

          {stats.barData.length === 0 ? (
            <div className="h-72 flex items-center justify-center text-gray-300 font-bold">
              لا توجد طلبات فنية حالياً
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={stats.barData}
                margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
                barCategoryGap="25%"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12, fontFamily: 'Cairo', fontWeight: 700, fill: '#64748B' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fontFamily: 'Cairo', fontWeight: 700, fill: '#64748B' }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8f9fa' }} />
                <Bar
                  dataKey="العدد"
                  radius={[12, 12, 0, 0]}
                  animationBegin={600}
                  animationDuration={1200}
                  animationEasing="ease-out"
                >
                  {stats.barData.map((_, index) => (
                    <Cell
                      key={`bar-${index}`}
                      fill={BAR_COLORS[index % BAR_COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ═══ قسم تحليل الإنجاز ═══ */}
      <div
        className={`bg-white rounded-[35px] shadow-sm border border-gray-100 p-8 transition-all duration-700 delay-300 ${
          chartsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center">
            <TrendingUp size={20} className="text-sky-600" />
          </div>
          <div>
            <h3 className="text-lg font-black text-[#1B2B48]">تحليل نسب الإنجاز</h3>
            <p className="text-xs text-gray-400 font-bold">
              متابعة مستوى الإنجاز في كل قسم
            </p>
          </div>
        </div>

        <div className="space-y-8">
          <AnimatedProgressBar
            label="إنجاز الطلبات الفنية"
            percentage={stats.technicalCompletionRate}
            color={COLORS.orange}
            icon={<Zap size={20} />}
            delay={800}
          />
          <AnimatedProgressBar
            label="إنجاز الإفراغات"
            percentage={stats.clearanceCompletionRate}
            color={COLORS.green}
            icon={<FileStack size={20} />}
            delay={1000}
          />
          <AnimatedProgressBar
            label="إنجاز الأعمال الميدانية"
            percentage={stats.worksCompletionRate}
            color={COLORS.navy}
            icon={<CheckCircle2 size={20} />}
            delay={1200}
          />
        </div>
      </div>

      {/* ═══ ملخص سفلي سريع ═══ */}
      <div
        className={`grid grid-cols-2 md:grid-cols-4 gap-4 transition-all duration-700 delay-500 ${
          chartsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
        }`}
      >
        {[
          {
            label: 'طلبات فنية مكتملة',
            value: stats.completedTechnical,
            icon: <CheckCircle2 size={18} />,
            color: COLORS.green,
          },
          {
            label: 'طلبات فنية معلقة',
            value: stats.totalTechnical - stats.completedTechnical,
            icon: <Clock size={18} />,
            color: COLORS.amber,
          },
          {
            label: 'إفراغات مكتملة',
            value: stats.completedClearance,
            icon: <CheckCircle2 size={18} />,
            color: COLORS.emerald,
          },
          {
            label: 'إفراغات معلقة',
            value: stats.totalClearance - stats.completedClearance,
            icon: <Clock size={18} />,
            color: COLORS.rose,
          },
        ].map((item) => (
          <div
            key={item.label}
            className="bg-white rounded-[25px] shadow-sm border border-gray-100 p-5 flex items-center gap-4"
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${item.color}15` }}
            >
              <div style={{ color: item.color }}>{item.icon}</div>
            </div>
            <div>
              <p className="text-2xl font-black" style={{ color: NAVY }}>
                {item.value.toLocaleString('ar-SA')}
              </p>
              <p className="text-[11px] font-bold text-gray-400">{item.label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StatisticsDashboard;
