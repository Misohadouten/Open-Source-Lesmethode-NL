'use client';

import React from 'react';
import { Star } from 'lucide-react';

interface StarRatingDisplayProps {
  rating: number | null;
  aantal?: number;
  size?: 'sm' | 'md';
  showCount?: boolean;
}

export function StarRatingDisplay({
  rating,
  aantal = 0,
  size = 'sm',
  showCount = true,
}: StarRatingDisplayProps) {
  const iconSize = size === 'md' ? 'w-5 h-5' : 'w-4 h-4';

  if (rating === null || aantal === 0) {
    return (
      <span className="text-xs text-gray-400" title="Nog niet beoordeeld bij goedkeuring">
        Nog niet beoordeeld
      </span>
    );
  }

  const fullStars = Math.round(rating);

  return (
    <div className="flex items-center gap-1.5" title={`Gemiddeld ${rating} van 5 (${aantal} beoordelingen)`}>
      <div className="flex">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            className={`${iconSize} ${i <= fullStars ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`}
          />
        ))}
      </div>
      <span className="text-sm font-semibold text-gray-800">{rating.toFixed(1)}</span>
      {showCount && <span className="text-xs text-gray-500">({aantal})</span>}
    </div>
  );
}

interface StarRatingInputProps {
  value: number;
  onChange: (rating: number) => void;
  disabled?: boolean;
}

export function StarRatingInput({ value, onChange, disabled = false }: StarRatingInputProps) {
  const [hover, setHover] = React.useState(0);

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => {
        const active = star <= (hover || value);
        return (
          <button
            key={star}
            type="button"
            disabled={disabled}
            onClick={() => onChange(star)}
            onMouseEnter={() => !disabled && setHover(star)}
            onMouseLeave={() => setHover(0)}
            className={`p-0.5 rounded transition-colors ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:scale-110'}`}
            aria-label={`${star} sterren`}
          >
            <Star
              className={`w-7 h-7 ${active ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`}
            />
          </button>
        );
      })}
    </div>
  );
}
