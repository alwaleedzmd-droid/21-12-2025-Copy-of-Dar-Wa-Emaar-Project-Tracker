// AppleStyleHero.tsx - مشهد البداية السينمائي لنظام دار وإعمار
import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { Building2, ChevronLeft, Activity, ShieldCheck } from 'lucide-react';

const AppleStyleHero = () => {
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

  const projects = [
    { id: '01', name: 'مشروع نفاذ', status: 'الفني', color: 'border-[#1B2B48]', shadow: 'shadow-blue-900/20' },
    { id: '02', name: 'سرايا النرجس', status: 'الإفراغات', color: 'border-[#E95D22]', shadow: 'shadow-orange-900/20' },
    { id: '03', name: 'تلال الخبر', status: 'المرافق', color: 'border-green-500', shadow: 'shadow-green-900/20' },
  ];

  return (
    <div className="relative h-screen w-screen bg-[#020617] overflow-hidden font-cairo text-white" dir="rtl">
      
      {/* الخلفية: خارطة تقنية تجريدية */}
      <div ref={mapRef} className="absolute inset-0 z-0 opacity-20">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#020617] z-10" />
        <svg viewBox="0 0 1000 1000" className="w-full h-full stroke-blue-500/30 fill-none">
          <path d="M100,500 Q300,100 500,500 T900,500" strokeWidth="1" />
          <circle cx="500" cy="500" r="400" strokeDasharray="5 5" />
          <circle cx="500" cy="500" r="200" strokeDasharray="10 10" />
        </svg>
      </div>

      {/* المحتوى الرئيسي */}
      <div className="relative z-20 h-full flex flex-col items-center justify-center px-10">
        
        {/* العنوان الرأسي بأسلوب آبل */}
        <div ref={titleRef} className="text-center mb-20">
          <span className="text-[#E95D22] font-black tracking-[0.3em] text-sm mb-4 block uppercase">Operations War Room</span>
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-4">
            دار وإعمار <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-200 to-gray-500 text-5xl md:text-7xl">
              المستقبل.. بوضوح تام
            </span>
          </h1>
        </div>

        {/* كتل المشاريع العائمة */}
        <div ref={cardContainerRef} className="flex flex-wrap justify-center gap-8 w-full max-w-6xl">
          {projects.map((project) => (
            <div 
              key={project.id}
              className={`project-block w-72 p-8 rounded-[35px] bg-white/5 backdrop-blur-2xl border-t-2 ${project.color} ${project.shadow} group hover:bg-white/10 transition-all cursor-pointer`}
            >
              <div className="flex justify-between items-start mb-10">
                <span className="text-4xl font-black opacity-10 group-hover:opacity-30 transition-opacity">{project.id}</span>
                <div className={`p-3 rounded-2xl bg-white/5`}>
                  <Building2 size={24} className="text-white" />
                </div>
              </div>
              
              <h3 className="text-2xl font-black mb-2">{project.name}</h3>
              <p className="text-gray-400 text-sm mb-6 flex items-center gap-2">
                <Activity size={14} className="text-[#E95D22]" /> قيد معالجة {project.status}
              </p>

              <div className="flex items-center justify-between pt-4 border-t border-white/10">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest italic flex items-center gap-1">
                   Secure Node <ShieldCheck size={12} />
                </span>
                <ChevronLeft className="group-hover:-translate-x-2 transition-transform" />
              </div>
            </div>
          ))}
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
