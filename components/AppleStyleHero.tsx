// AppleStyleHero.tsx — مشهد البداية السينمائي الغامر لنظام دار وإعمار
// Immersive Single-Page Cinematic Experience — Brand-Aligned Theme
import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, ChevronDown, ShieldCheck, BarChart3, FileText, Wrench, 
  MapPin, Users, List, BookOpen, Map, Eye, ArrowLeft, Sparkles,
  Calendar, Heart, FileDown, Bell, TrendingUp, Activity, Flame, Settings
} from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useNavigate } from 'react-router-dom';
import { DAR_LOGO } from '../constants';
import CinematicLayout from './cinematic/CinematicLayout';
import InteractiveProjectPulse from './cinematic/InteractiveProjectPulse';
import CinematicStats from './cinematic/CinematicStats';
import ManagerialRadar from './cinematic/ManagerialRadar';
import BentoCard from './cinematic/BentoCard';
import GanttTimeline from './cinematic/GanttTimeline';
import ProjectHealthScore from './cinematic/ProjectHealthScore';
import ExecutivePDFReport from './cinematic/ExecutivePDFReport';
import SLANotifications from './cinematic/SLANotifications';
import MonthlyComparison from './cinematic/MonthlyComparison';
import ActivityTimeline from './cinematic/ActivityTimeline';
import AreaHeatMap from './cinematic/AreaHeatMap';
import CustomKPIDashboard from './cinematic/CustomKPIDashboard';

interface AppleStyleHeroProps {
  onSeen?: (targetPath?: string) => void;
}

const AppleStyleHero: React.FC<AppleStyleHeroProps> = ({ onSeen }) => {
  const titleRef = useRef<HTMLDivElement>(null);
  const { currentUser } = useData();
  const navigate = useNavigate();
  const [logoOk, setLogoOk] = useState(true);
  const [radarMode, setRadarMode] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // ── GSAP entrance animations ──
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(titleRef.current, {
        y: 120,
        opacity: 0,
        duration: 1.8,
        ease: 'power4.out',
      });
      gsap.from('.hero-orb', {
        scale: 0,
        opacity: 0,
        stagger: 0.15,
        duration: 1.2,
        ease: 'back.out(1.7)',
        delay: 0.6,
      });
      gsap.from('.nav-pill', {
        y: 30,
        opacity: 0,
        stagger: 0.08,
        duration: 0.8,
        ease: 'power3.out',
        delay: 1,
      });
    });
    return () => ctx.revert();
  }, []);

  const sections = [
    { id: 'dashboard', label: 'لوحة المعلومات', icon: <BarChart3 size={18} />, path: '/dashboard', roles: ['ADMIN', 'PR_MANAGER'] },
    { id: 'projects', label: 'المشاريع', icon: <FileText size={18} />, path: '/projects', roles: ['ADMIN', 'PR_MANAGER'] },
    { id: 'technical', label: 'الطلبات الفنية', icon: <Wrench size={18} />, path: '/technical', roles: ['ADMIN', 'TECHNICAL', 'PR_MANAGER'] },
    { id: 'deeds', label: 'سجلات الإفراغ', icon: <MapPin size={18} />, path: '/deeds', roles: ['ADMIN', 'CONVEYANCE', 'PR_MANAGER'] },
    { id: 'users', label: 'إدارة المستخدمين', icon: <Users size={18} />, path: '/users', roles: ['ADMIN'] },
    { id: 'workflow', label: 'إدارة المسارات', icon: <List size={18} />, path: '/workflow', roles: ['ADMIN', 'PR_MANAGER'] },
    { id: 'mytasks', label: 'مهامي', icon: <Map size={18} />, path: '/my-tasks', roles: ['ADMIN', 'TECHNICAL', 'PR_MANAGER', 'CONVEYANCE'] },
    { id: 'assignment', label: 'تعيين المهام', icon: <FileText size={18} />, path: '/task-assignment', roles: ['ADMIN'] },
    { id: 'guide', label: 'دليل النظام', icon: <BookOpen size={18} />, path: '/guide', roles: ['ADMIN', 'PR_MANAGER'] },
    { id: 'operations-map', label: 'الخريطة التفاعلية', icon: <Map size={18} />, path: '/operations-map', roles: ['ADMIN', 'PR_MANAGER'] },
  ];

  const handleNavigate = (path: string) => {
    if (onSeen) {
      onSeen(path);
      setTimeout(() => navigate(path), 300);
    } else {
      navigate(path);
    }
  };

  const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'PR_MANAGER';

  return (
    <CinematicLayout>
      {/* ─── Radar Mode Overlay ─── */}
      <AnimatePresence>
        {radarMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 overflow-y-auto"
            style={{ background: 'rgba(248,249,252,0.97)' }}
          >
            <div className="max-w-6xl mx-auto px-6 pt-24 pb-12">
              <ManagerialRadar onClose={() => setRadarMode(false)} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════ SECTION 1: Hero Landing ═══════ */}
      <section data-section="hero" className="min-h-screen flex flex-col items-center justify-center px-6 relative">
        {/* Decorative background circles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
          <div className="hero-orb absolute w-[500px] h-[500px] rounded-full top-1/4 right-[-10%] opacity-[0.07]"
               style={{ background: 'radial-gradient(circle, #E95D22 0%, transparent 70%)' }} />
          <div className="hero-orb absolute w-[400px] h-[400px] rounded-full bottom-1/4 left-[-8%] opacity-[0.05]"
               style={{ background: 'radial-gradient(circle, #1B2B48 0%, transparent 70%)' }} />
        </div>

        <div ref={titleRef} className="text-center relative z-10 max-w-4xl">
          {/* Logo */}
          {logoOk ? (
            <img 
              src={DAR_LOGO} 
              alt="دار وإعمار" 
              className="w-20 mx-auto mb-8 opacity-80"
              onError={() => setLogoOk(false)} 
              onLoad={() => setLogoOk(true)} 
            />
          ) : (
            <div className="w-20 h-20 mx-auto mb-8 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
              <Sparkles size={24} className="text-[#E95D22]/60" />
            </div>
          )}

          {/* Tagline */}
          <motion.span 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 1 }}
            className="text-[#E95D22] font-black tracking-[0.4em] text-[10px] mb-6 block uppercase"
          >
            Immersive Operations System
          </motion.span>

          {/* Main Title */}
          <h1 className="cin-title text-6xl md:text-8xl lg:text-9xl mb-4 text-[#1B2B48]">
            دار وإعمار
          </h1>
          <p className="text-xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#1B2B48]/60 to-[#E95D22] mb-8">
            إتقان في التفاصيل
          </p>

          {/* User greeting */}
          {currentUser && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.5, type: 'spring' }}
              className="glass-card inline-flex items-center gap-3 px-6 py-3"
              style={{ borderRadius: 16 }}
            >
              <div className="w-8 h-8 rounded-xl bg-[#E95D22]/10 flex items-center justify-center text-[#E95D22] text-xs font-black">
                {currentUser.name?.charAt(0) || '?'}
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-[#1B2B48]">{currentUser.name}</p>
                <p className="text-[10px] text-gray-500">{currentUser.role === 'ADMIN' ? 'مدير النظام' : currentUser.role === 'PR_MANAGER' ? 'مدير العلاقات' : currentUser.role === 'TECHNICAL' ? 'فني' : 'إفراغ'}</p>
              </div>
            </motion.div>
          )}
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.3, y: [0, 8, 0] }}
          transition={{ delay: 2, duration: 2, repeat: Infinity }}
          className="absolute bottom-10 flex flex-col items-center gap-2"
        >
          <span className="text-[9px] font-bold text-gray-400 tracking-[0.2em] uppercase">استكشف</span>
          <ChevronDown size={16} className="text-gray-400" />
        </motion.div>
      </section>

      {/* ═══════ SECTION 2: Custom KPI Dashboard ═══════ */}
      <section data-section="kpi" className="min-h-screen flex flex-col justify-center px-6 py-20 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ type: 'spring', stiffness: 150, damping: 25 }}
        >
          <CustomKPIDashboard />

          {/* Inline PDF + SLA buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <BentoCard span="sm" glow>
              <ExecutivePDFReport />
            </BentoCard>
            <BentoCard span="sm">
              <SLANotifications />
            </BentoCard>
          </div>
        </motion.div>
      </section>

      {/* ═══════ SECTION 3: Project Pulse (التوأم الرقمي) ═══════ */}
      <section data-section="pulse" className="min-h-screen flex flex-col justify-center px-6 py-20 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ type: 'spring', stiffness: 150, damping: 25 }}
        >
          <div className="flex items-center gap-3 mb-2">
            <Sparkles size={18} className="text-[#E95D22]" />
            <span className="cin-subtitle">التوأم الرقمي</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-[#1B2B48] mb-10">نبض المشاريع</h2>

          <BentoCard span="full" glow className="!p-8">
            <InteractiveProjectPulse />
          </BentoCard>
        </motion.div>
      </section>

      {/* ═══════ SECTION 4: Gantt Timeline ═══════ */}
      <section data-section="gantt" className="min-h-screen flex flex-col justify-center px-6 py-20 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ type: 'spring', stiffness: 150, damping: 25 }}
        >
          <GanttTimeline />
        </motion.div>
      </section>

      {/* ═══════ SECTION 5: Health Score + Stats ═══════ */}
      <section data-section="health" className="min-h-screen flex flex-col justify-center px-6 py-20 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ type: 'spring', stiffness: 150, damping: 25 }}
        >
          <ProjectHealthScore />
          <div className="mt-8">
            <CinematicStats />
          </div>
        </motion.div>
      </section>

      {/* ═══════ SECTION 6: Analytics (Monthly + Heat Map + Activity) ═══════ */}
      <section data-section="analytics" className="min-h-screen flex flex-col justify-center px-6 py-20 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ type: 'spring', stiffness: 150, damping: 25 }}
        >
          <MonthlyComparison />
          <div className="mt-10">
            <AreaHeatMap />
          </div>
          <div className="mt-10">
            <ActivityTimeline />
          </div>
        </motion.div>
      </section>

      {/* ═══════ SECTION 7: Navigation Grid ═══════ */}
      <section data-section="navigate" className="min-h-screen flex flex-col justify-center px-6 py-20 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ type: 'spring', stiffness: 150, damping: 25 }}
        >
          <div className="flex items-center gap-3 mb-2">
            <ArrowLeft size={18} className="text-[#E95D22]" />
            <span className="cin-subtitle">الانتقال السريع</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-[#1B2B48] mb-10">أقسام النظام</h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {sections.map((sec, i) => {
              const allowed = currentUser && sec.roles.includes(currentUser.role as string);
              return (
                <BentoCard
                  key={sec.id}
                  delay={i}
                  onClick={allowed ? () => handleNavigate(sec.path) : undefined}
                  className={`!p-5 ${!allowed ? 'opacity-30 cursor-not-allowed' : ''}`}
                >
                  <div className="flex flex-col items-center gap-3 text-center">
                    <div className="w-11 h-11 rounded-xl bg-[#1B2B48]/5 flex items-center justify-center text-[#1B2B48]/70">
                      {sec.icon}
                    </div>
                    <h3 className="text-xs font-bold text-[#1B2B48]">{sec.label}</h3>
                    <ChevronLeft size={14} className="text-gray-600" />
                    {!allowed && (
                      <div className="flex items-center gap-1 text-gray-600">
                        <ShieldCheck size={10} />
                        <span className="text-[9px] font-bold">مقفول</span>
                      </div>
                    )}
                  </div>
                </BentoCard>
              );
            })}
          </div>

          {/* Enter system button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5, type: 'spring' }}
            className="flex justify-center mt-12"
          >
            <button
              onClick={() => {
                if (onSeen) onSeen();
              }}
              className="glass-card px-10 py-4 text-sm font-black text-[#1B2B48] hover:bg-[#1B2B48]/5 transition-all duration-300 glow-border flex items-center gap-3"
              style={{ borderRadius: 20 }}
            >
              <span>الدخول للنظام الكامل</span>
              <ChevronLeft size={16} />
            </button>
          </motion.div>
        </motion.div>
      </section>

      {/* ─── Status message ─── */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 glass-card px-5 py-3 text-sm font-bold text-[#1B2B48]"
            style={{ borderRadius: 14 }}
          >
            {message}
          </motion.div>
        )}
      </AnimatePresence>
    </CinematicLayout>
  );
};

export default AppleStyleHero;
