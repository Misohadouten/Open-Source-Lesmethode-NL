'use client';

import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { pageTitle } from '@/lib/buttonStyles';

interface LesAiLoadingOverlayProps {
  isAnalyzing: boolean;
}

const LesAiLoadingOverlay: React.FC<LesAiLoadingOverlayProps> = ({ isAnalyzing }) => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLDivElement>(null);
  const scanlineRef = useRef<HTMLDivElement>(null);
  const scanGlowRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      if (isAnalyzing) {
        gsap.to(overlayRef.current, { autoAlpha: 1, duration: 0.4, ease: 'power2.out' });
        gsap.to(iconRef.current, { y: -20, repeat: -1, yoyo: true, duration: 1.5, ease: 'sine.inOut' });
        gsap.fromTo(
          [scanlineRef.current, scanGlowRef.current],
          { top: '-10%' },
          { top: '110%', repeat: -1, duration: 1.5, ease: 'linear' }
        );
        gsap.fromTo(
          ringRef.current,
          { scale: 0.5, opacity: 0.8 },
          { scale: 3.5, opacity: 0, repeat: -1, duration: 2, ease: 'power2.out' }
        );
        if (particlesRef.current) {
          const particles = particlesRef.current.children;
          gsap.set(particles, {
            x: () => gsap.utils.random(-150, 150),
            y: () => gsap.utils.random(-150, 150),
            scale: () => gsap.utils.random(0.5, 1.5),
            opacity: 0,
          });
          gsap.to(particles, {
            y: '-=100',
            x: '+=random(-30, 30)',
            opacity: () => gsap.utils.random(0.4, 0.9),
            duration: () => gsap.utils.random(1.5, 3),
            repeat: -1,
            yoyo: true,
            stagger: { amount: 2, from: 'random' },
          });
        }
      } else {
        gsap.to(overlayRef.current, { autoAlpha: 0, duration: 0.4, ease: 'power2.in' });
      }
    });

    return () => ctx.revert();
  }, [isAnalyzing]);

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-white/80 backdrop-blur-md invisible opacity-0"
    >
      <div className="relative flex flex-col items-center">
        <div ref={particlesRef} className="absolute inset-0 pointer-events-none flex items-center justify-center">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="absolute w-2 h-2 bg-orange-400 rounded-full" />
          ))}
        </div>

        <div
          ref={ringRef}
          className="absolute top-10 w-32 h-32 bg-orange-400 rounded-full mix-blend-multiply filter blur-2xl opacity-50"
        />

        <div
          ref={iconRef}
          className="relative w-28 h-40 bg-white border-2 border-orange-200 rounded-xl shadow-2xl overflow-hidden flex items-center justify-center mb-8 z-10"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-orange-50 to-amber-100/50" />
          <span className="text-6xl z-0">📄</span>
          <div
            ref={scanGlowRef}
            className="absolute left-0 right-0 h-12 bg-gradient-to-b from-transparent via-orange-400/40 to-transparent z-10"
          />
          <div
            ref={scanlineRef}
            className="absolute left-0 right-0 h-[3px] bg-orange-500 shadow-[0_0_15px_4px_rgba(249,115,22,0.8)] z-20"
          />
        </div>

        <h3 className={`${pageTitle} z-10 mb-3`}>AI analyseert document</h3>
        <div className="flex items-center gap-3 z-10 bg-orange-100/90 px-5 py-2.5 rounded-full border border-orange-200 shadow-sm">
          <svg className="animate-spin h-5 w-5 text-orange-600" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          <p className="text-orange-700 font-semibold text-lg">Magie aan het toepassen...</p>
        </div>
      </div>
    </div>
  );
};

export default LesAiLoadingOverlay;
