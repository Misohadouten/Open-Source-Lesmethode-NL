'use client';

import React from 'react';
import type { LessenSerieFlowStep } from '@/lib/lessenSerieStatus';

const STEPS: { step: LessenSerieFlowStep; label: string }[] = [
  { step: 1, label: 'Serie' },
  { step: 2, label: 'Lessen' },
  { step: 3, label: 'Indienen' },
  { step: 4, label: 'Beoordeling' },
];

interface LessenSerieFlowStepsProps {
  activeStep: LessenSerieFlowStep;
  className?: string;
}

const LessenSerieFlowSteps: React.FC<LessenSerieFlowStepsProps> = ({
  activeStep,
  className = '',
}) => (
  <nav
    aria-label="Voortgang lessenserie"
    className={`flex flex-wrap items-center gap-2 sm:gap-0 ${className}`}
  >
    {STEPS.map(({ step, label }, index) => {
      const done = step < activeStep;
      const active = step === activeStep;
      return (
        <React.Fragment key={step}>
          <div className="flex items-center gap-2">
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                active
                  ? 'bg-[#E4AE7E] text-white'
                  : done
                    ? 'bg-[#E4AE7E]/20 text-[#7A5C3A]'
                    : 'bg-gray-100 text-gray-500'
              }`}
            >
              {step}
            </span>
            <span
              className={`text-sm ${
                active ? 'font-semibold text-gray-900' : done ? 'text-gray-700' : 'text-gray-500'
              }`}
            >
              {label}
            </span>
          </div>
          {index < STEPS.length - 1 && (
            <span className="hidden sm:inline mx-3 h-px w-8 bg-gray-200" aria-hidden />
          )}
        </React.Fragment>
      );
    })}
  </nav>
);

export default LessenSerieFlowSteps;
