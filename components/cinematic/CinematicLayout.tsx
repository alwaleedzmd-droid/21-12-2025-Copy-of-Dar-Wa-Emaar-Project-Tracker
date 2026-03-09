// CinematicLayout.tsx — Single-Page Cinematic Experience Shell
// Lenis smooth scroll + GSAP horizontal slide between sections
import React, { useEffect, useRef, useCallback } from 'react';
import { gsap } from 'gsap';
import Lenis from 'lenis';
import './CinematicTheme.css';

interface CinematicLayoutProps {
  children: React.ReactNode;
  /** IDs of horizontal-scroll sections (children must expose data-section="id") */
  sectionIds?: string[];
}

const CinematicLayout: React.FC<CinematicLayoutProps> = ({ children, sectionIds = [] }) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const lenisRef = useRef<Lenis | null>(null);

  // ── Lenis smooth scroll ──
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.4,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });
    lenisRef.current = lenis;

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
    return () => lenis.destroy();
  }, []);

  // ── GSAP horizontal scroll for sections ──
  useEffect(() => {
    if (sectionIds.length < 2) return;

    const container = rootRef.current?.querySelector('.h-scroll-container') as HTMLElement | null;
    if (!container) return;

    const sections = container.querySelectorAll('.h-scroll-section');
    if (sections.length < 2) return;

    const totalWidth = (sections.length - 1) * window.innerWidth;

    const ctx = gsap.context(() => {
      gsap.to(container, {
        x: () => -totalWidth,
        ease: 'none',
        scrollTrigger: {
          trigger: container.parentElement,
          pin: true,
          scrub: 1,
          end: () => `+=${totalWidth}`,
          invalidateOnRefresh: true,
        },
      });
    });

    return () => ctx.revert();
  }, [sectionIds]);

  const scrollToSection = useCallback((id: string) => {
    const el = rootRef.current?.querySelector(`[data-section="${id}"]`);
    if (el && lenisRef.current) {
      lenisRef.current.scrollTo(el as HTMLElement, { offset: -40, duration: 1.8 });
    }
  }, []);

  return (
    <div ref={rootRef} className="cinematic-root" dir="rtl">
      {/* Ambient Background Orbs */}
      <div className="ambient-bg" aria-hidden="true">
        <div className="ambient-orb" style={{ width: 600, height: 600, top: '-10%', right: '-5%', background: '#E95D22' }} />
        <div className="ambient-orb" style={{ width: 500, height: 500, bottom: '-10%', left: '-5%', background: '#1B2B48' }} />
        <div className="ambient-orb" style={{ width: 300, height: 300, top: '40%', left: '30%', background: '#E95D22' }} />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {typeof children === 'function' 
          ? (children as (scrollTo: (id: string) => void) => React.ReactNode)(scrollToSection)
          : children
        }
      </div>
    </div>
  );
};

export default CinematicLayout;
