// AppleStyleHero.tsx - مشهد البداية السينمائي لنظام دار وإعمار
import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ChevronLeft, ShieldCheck, BarChart3, FileText, Wrench, MapPin, Users, List, BookOpen, Map } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useNavigate } from 'react-router-dom';
import { DAR_LOGO } from '../constants';

interface AppleStyleHeroProps {
  onSeen?: (targetPath?: string) => void;
}

const AppleStyleHero: React.FC<AppleStyleHeroProps> = ({ onSeen }) => {
  const mapRef = useRef(null);
  const titleRef = useRef(null);
  const cardContainerRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // 1. حركة ظهور العنوان (تدرج وظهور من الأسفل)
      gsap.from(titleRef.current, {
        y: 100,
        opacity: 0,
        duration: 1.5,
        ease: "power4.out"
      });

      // 2. حركة "تزوم" الخريطة في الخلفية
      gsap.from(mapRef.current, {
        scale: 1.5,
        opacity: 0,
        duration: 2,
        ease: "expo.out"
      });

      // 3. ظهور كتل المشاريع (واحد تلو الآخر)
      gsap.from(".project-block", {
        y: 50,
        opacity: 0,
        stagger: 0.2,
        duration: 1,
        ease: "back.out(1.7)",
        delay: 0.5
      });

      // 4. تأثير الطفو المستمر (Floating Animation)
      gsap.to(".project-block", {
        y: -15,
        duration: 2,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        stagger: 0.3
      });
    });

    return () => ctx.revert();
  }, []);

  const { currentUser } = useData();
  const navigate = useNavigate();
  const [logoOk, setLogoOk] = useState(true);

  const sections = [
    { id: 'dashboard', label: 'لوحة المعلومات', icon: <BarChart3 />, path: '/dashboard', roles: ['ADMIN', 'PR_MANAGER'] },
    { id: 'projects', label: 'المشاريع', icon: <FileText />, path: '/projects', roles: ['ADMIN', 'PR_MANAGER'] },
    { id: 'technical', label: 'الطلبات الفنية', icon: <Wrench />, path: '/technical', roles: ['ADMIN', 'TECHNICAL', 'PR_MANAGER'] },
    { id: 'deeds', label: 'سجلات الإفراغ', icon: <MapPin />, path: '/deeds', roles: ['ADMIN', 'CONVEYANCE', 'PR_MANAGER'] },
    { id: 'users', label: 'إدارة المستخدمين', icon: <Users />, path: '/users', roles: ['ADMIN'] },
    { id: 'workflow', label: 'إدارة المسارات', icon: <List />, path: '/workflow', roles: ['ADMIN', 'PR_MANAGER'] },
    { id: 'mytasks', label: 'مهامي', icon: <Map />, path: '/my-tasks', roles: ['ADMIN', 'TECHNICAL', 'PR_MANAGER', 'CONVEYANCE'] },
    { id: 'assignment', label: 'تعيين المهام', icon: <FileText />, path: '/task-assignment', roles: ['ADMIN'] },
    { id: 'guide', label: 'دليل النظام', icon: <BookOpen />, path: '/guide', roles: ['ADMIN', 'PR_MANAGER'] },
    { id: 'operations-map', label: 'الخريطة التفاعلية', icon: <Map />, path: '/operations-map', roles: ['ADMIN', 'PR_MANAGER'] },
  ];
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState<string | null>(sections[0]?.id || null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const nodes = containerRef.current?.querySelectorAll('.section-panel') || [];
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const id = entry.target.getAttribute('data-id');
        if (entry.isIntersecting && id) setActive(id);
      });
    }, { threshold: 0.6 });

    nodes.forEach((n: Element) => obs.observe(n));
    return () => obs.disconnect();
  }, []);

  return (
    <div className="relative h-screen w-screen bg-white overflow-hidden font-cairo text-[#1B2B48] pt-20" dir="rtl">
      
      {/* الخلفية: خارطة تقنية تجريدية */}
      <div ref={mapRef} className="absolute inset-0 z-0 opacity-10">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white z-10" />
        <svg viewBox="0 0 1000 1000" className="w-full h-full stroke-[#1B2B48]/10 fill-none">
          <path d="M100,500 Q300,100 500,500 T900,500" strokeWidth="1" />
          <circle cx="500" cy="500" r="400" strokeDasharray="5 5" />
          <circle cx="500" cy="500" r="200" strokeDasharray="10 10" />
        </svg>
      </div>

      {/* المحتوى الرئيسي */}
      <div className="relative z-20 h-full flex flex-col items-center justify-center px-10">
        
        {/* العنوان الرأسي بأسلوب آبل */}
        <div ref={titleRef} className="text-center mb-6">
          {logoOk ? (
            <img src={DAR_LOGO} alt="دار وإعمار" className="w-40 mx-auto mt-6 mb-6 z-50 relative" style={{display: 'block'}} onError={() => setLogoOk(false)} onLoad={() => setLogoOk(true)} />
          ) : (
            <div className="w-40 mx-auto mt-6 mb-6 flex items-center justify-center relative z-50">
              <svg width="160" height="40" viewBox="0 0 160 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                <rect width="160" height="40" rx="6" fill="#fff" stroke="#E95D22" />
                <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fill="#1B2B48" fontSize="14" fontWeight="700">دار وإعمار</text>
              </svg>
            </div>
          )}
          <span className="text-[#E95D22] font-black tracking-[0.3em] text-sm mb-4 block uppercase">Building a Better Tomorrow</span>
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-4 text-[#1B2B48]">
            دار وإعمار <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#1B2B48] to-[#2a4068] text-5xl md:text-7xl">
              إتقان في التفاصيل
            </span>
          </h1>
        </div>
        {/* قسم التمرير: كل قسم شاشة كاملة (scroll-snap) */}
        <div ref={cardContainerRef} className="w-full h-[65vh] max-w-6xl mt-8">
          <div ref={containerRef} className="h-full overflow-y-auto snap-y snap-mandatory space-y-6 px-6">
            {sections.map((sec) => {
              const allowed = currentUser && sec.roles.includes(currentUser.role as string);
              const isActive = active === sec.id;
              return (
                <div
                  key={sec.id}
                  data-id={sec.id}
                  className={`section-panel snap-start h-full rounded-3xl p-8 relative flex flex-col items-center justify-center transition-transform duration-500 ${isActive ? 'scale-100 opacity-100' : 'scale-95 opacity-60'}`}
                >
                  <div
                    role="button"
                    tabIndex={0}
                    aria-disabled={!allowed}
                        onClick={() => {
                          if (!allowed) {
                            setMessage('غير مصرح بالوصول لهذا القسم');
                            setTimeout(() => setMessage(null), 2000);
                            console.warn('Attempt to open', sec.path, 'was blocked for role', currentUser?.role);
                            return;
                          }
                          console.log('Hero click, target:', sec.path, 'allowed:', allowed, 'role:', currentUser?.role);
                          if (onSeen) {
                            onSeen(sec.path);
                            // fallback after short delay in case parent doesn't navigate
                            setTimeout(() => navigate(sec.path), 300);
                            return;
                          }
                          navigate(sec.path);
                        }}
                        onKeyDown={(e) => { if ((e as any).key === 'Enter' && allowed) { console.log('Hero key enter, target:', sec.path); if (onSeen) { onSeen(sec.path); setTimeout(() => navigate(sec.path), 300); return; } ; navigate(sec.path); } }}
                    className={`w-full h-full rounded-2xl p-12 bg-white border border-gray-200 shadow-sm flex flex-col items-center justify-between ${allowed ? 'cursor-pointer hover:bg-gray-50' : 'cursor-not-allowed'}`}
                  >
                    <div className="flex items-center gap-6 text-[#1B2B48]">
                      <div className="p-4 rounded-xl bg-gray-50 text-3xl">{sec.icon}</div>
                      <h3 className="text-4xl font-black">{sec.label}</h3>
                    </div>
                    <p className="text-gray-600 text-center max-w-xl">انتقل إلى {sec.label} لعرض ومتابعة المهام ذات الصلة.</p>
                    <div className="w-full flex items-center justify-between">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest italic">النظام</span>
                      <ChevronLeft className="text-gray-400" />
                    </div>
                    {!allowed && (
                      <div className="absolute inset-0 rounded-2xl flex items-center justify-center pointer-events-none">
                        <div className="bg-white/80 text-[#1B2B48] px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-2 border border-gray-200"><ShieldCheck size={14}/> مقفول</div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* مؤشر السكرول (The Apple Scroll Indicator) */}
        <div className="absolute bottom-10 flex flex-col items-center gap-2 opacity-40">
            <span className="text-[10px] font-bold tracking-[0.2em] uppercase">حرك للأسفل للاستكشاف</span>
            <div className="w-px h-12 bg-gradient-to-b from-white to-transparent" />
        </div>
      </div>
    </div>
  );
};

export default AppleStyleHero;
