'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { StarRatingInput } from '@/components/StarRating';
import type { LessenSerieDto } from '@/lib/lessenserieApi';
import { btn } from '@/lib/buttonStyles';
import { getLaatsteToelichting } from '@/components/BeoordelingenOverzicht';
import { StarRatingDisplay } from '@/components/StarRating';
import { getRatingSummary } from '@/lib/ratingUtils';

export type ConceptBeoordelingActie = 'goedkeuren' | 'afwijzen';

interface ConceptBeoordelingModalProps {
  item: LessenSerieDto;
  actie: ConceptBeoordelingActie;
  onClose: () => void;
  onConfirm: (rating: number, commentaar: string) => Promise<void>;
}

const ConceptBeoordelingModal: React.FC<ConceptBeoordelingModalProps> = ({
  item,
  actie,
  onClose,
  onConfirm,
}) => {
  const isAfwijzen = actie === 'afwijzen';
  const eerdereToelichting = getLaatsteToelichting(item.beoordelingen);
  const eerdereRating = getRatingSummary(item.beoordelingen);
  const heeftEerdereBeoordeling = eerdereRating.aantal > 0 || !!eerdereToelichting;
  const [rating, setRating] = useState(0);
  const [commentaar, setCommentaar] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (rating < 1) {
      setError('Geef minimaal 1 ster.');
      return;
    }
    if (isAfwijzen && !commentaar.trim()) {
      setError('Geef een toelichting bij afwijzen.');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await onConfirm(rating, commentaar.trim());
      onClose();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : isAfwijzen ? 'Afwijzen mislukt.' : 'Goedkeuren mislukt.';
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl ring-1 ring-gray-900/5">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-start">
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              {isAfwijzen ? 'Beoordelen & afkeuren' : 'Beoordelen & goedkeuren'}
            </h3>
            <p className="text-sm text-gray-600 mt-1">{item.titel}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg text-gray-400"
            aria-label="Sluiten"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-gray-600">
            {isAfwijzen
              ? 'Beoordeel dit concept en geef aan waarom het wordt afgewezen. De uploadende docent ziet je toelichting.'
              : 'Beoordeel dit concept voordat het beschikbaar komt in Materialen.'}
          </p>

          {heeftEerdereBeoordeling && (
            <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-3 text-sm">
              <p className="font-medium text-amber-900 mb-1">Opnieuw ingediend</p>
              <p className="text-amber-800 text-xs mb-2">
                De docent heeft deze serie aangepast na een eerdere afwijzing.
              </p>
              {eerdereRating.aantal > 0 && (
                <StarRatingDisplay
                  rating={eerdereRating.gemiddelde}
                  aantal={eerdereRating.aantal}
                  showCount={false}
                />
              )}
              {eerdereToelichting && (
                <p className="mt-2 text-amber-900 whitespace-pre-wrap">{eerdereToelichting}</p>
              )}
            </div>
          )}

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Beoordeling (1–5 sterren)</p>
            <StarRatingInput value={rating} onChange={setRating} disabled={isSaving} />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2 block">
              Toelichting {isAfwijzen ? '(verplicht)' : '(optioneel)'}
            </label>
            <textarea
              value={commentaar}
              onChange={(e) => setCommentaar(e.target.value)}
              rows={3}
              placeholder={
                isAfwijzen
                  ? 'Bijv. onduidelijke structuur, mist leerdoelen...'
                  : 'Bijv. sterk lesmateriaal, duidelijke structuur...'
              }
              className="lh-input"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button type="button" onClick={onClose} disabled={isSaving} className={btn.ghost}>
            Annuleren
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving || rating < 1 || (isAfwijzen && !commentaar.trim())}
            className={isAfwijzen ? btn.reject : btn.approve}
          >
            {isSaving ? 'Bezig...' : isAfwijzen ? 'Beoordelen en afkeuren' : 'Beoordelen en goedkeuren'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConceptBeoordelingModal;
