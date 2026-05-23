'use client';

import React from 'react';
import {
  formatLessenSerieStatus,
  statusBadgeClass,
} from '@/lib/lessenSerieStatus';

interface LessenSerieStatusBadgeProps {
  status?: string | null;
  className?: string;
}

const LessenSerieStatusBadge: React.FC<LessenSerieStatusBadgeProps> = ({
  status,
  className = '',
}) => (
  <span
    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass(status)} ${className}`}
  >
    {formatLessenSerieStatus(status)}
  </span>
);

export default LessenSerieStatusBadge;
