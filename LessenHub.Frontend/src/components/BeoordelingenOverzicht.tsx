'use client';

import React from 'react';
import type { BeoordelingDto } from '@/lib/lessenserieApi';
import { normalizeBeoordelingen } from '@/lib/normalizeLessenSerie';
import { StarRatingDisplay } from '@/components/StarRating';

interface BeoordelingenOverzichtProps {
  beoordelingen?: BeoordelingDto[] | null;
  compact?: boolean;
}

export function getLaatsteToelichting(beoordelingen?: BeoordelingDto[] | null): string | null {
  const list = normalizeBeoordelingen(beoordelingen ?? []).filter((b) => b.commentaar?.trim());
  if (list.length === 0) return null;
  return list[list.length - 1].commentaar?.trim() ?? null;
}

const BeoordelingenOverzicht: React.FC<BeoordelingenOverzichtProps> = ({
  beoordelingen,
  compact = false,
}) => {
  const list = normalizeBeoordelingen(beoordelingen ?? []);

  if (list.length === 0) {
    return (
      <p className="text-sm text-gray-500">Geen beoordeling of toelichting beschikbaar.</p>
    );
  }

  if (compact) {
    const latest = list[list.length - 1];
    return (
      <div className="text-sm text-gray-700">
        <StarRatingDisplay rating={latest.rating} aantal={1} showCount={false} />
        {latest.commentaar?.trim() ? (
          <p className="mt-2 text-gray-600 line-clamp-2" title={latest.commentaar}>
            {latest.commentaar}
          </p>
        ) : (
          <p className="mt-2 text-gray-400 italic">Geen toelichting gegeven</p>
        )}
      </div>
    );
  }

  return (
    <ul className="space-y-4">
      {list.map((b, index) => (
        <li
          key={`${b.eigenaar?.id ?? 'onbekend'}-${index}`}
          className="rounded-xl border border-gray-100 bg-gray-50/80 p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <span className="text-sm font-semibold text-gray-900">
              {b.eigenaar?.naam ?? 'Onbekende beoordelaar'}
            </span>
            <StarRatingDisplay rating={b.rating} aantal={1} showCount={false} />
          </div>
          {b.commentaar?.trim() ? (
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{b.commentaar}</p>
          ) : (
            <p className="text-sm text-gray-400 italic">Geen toelichting gegeven</p>
          )}
        </li>
      ))}
    </ul>
  );
};

export default BeoordelingenOverzicht;
