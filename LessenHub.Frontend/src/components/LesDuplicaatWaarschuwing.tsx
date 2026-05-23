'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Eye, X, GitCompare } from 'lucide-react';
import { buildLesViewHref } from '@/lib/navigationReturn';

export interface LesDuplicaatMatch {
  lesId: string;
  titel: string;
  similarityScore: number;
  reden: string;
  lessenSerieId?: string | null;
  lessenSerieTitel?: string | null;
  introductie: string;
  inhoud: string;
  slot: string;
}

interface LesInvoer {
  titel: string;
  introductie: string;
  inhoud: string;
  slot: string;
}

interface LesDuplicaatWaarschuwingProps {
  matches: LesDuplicaatMatch[];
  isChecking: boolean;
  checkError: string | null;
  huidigeLes: LesInvoer;
  /** Pad om na &quot;Inzien&quot; terug te keren naar het nieuwe-les-formulier (met AI-invoer). */
  returnTo: string;
  onDoorgaan?: () => void;
}

const LesDuplicaatWaarschuwing: React.FC<LesDuplicaatWaarschuwingProps> = ({
  matches,
  isChecking,
  checkError,
  huidigeLes,
  returnTo,
  onDoorgaan,
}) => {
  const [vergelijkMatch, setVergelijkMatch] = useState<LesDuplicaatMatch | null>(null);

  if (isChecking) {
    return (
      <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 animate-pulse">
        Controleren op duplicaten via embeddings…
      </div>
    );
  }

  if (checkError) {
    return (
      <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        Duplicaatcontrole mislukt: {checkError}
      </div>
    );
  }

  if (matches.length === 0) {
    return null;
  }

  return (
    <>
      <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-bold text-amber-900">
              Mogelijke dubbele les gevonden ({matches.length})
            </h3>
            <p className="text-sm text-amber-800 mt-1">
              Embedding-vergelijking: de inhoud lijkt sterk op bestaande lessen — ook bij andere formulering.
              Bekijk de vergelijking voordat je opslaat.
            </p>

            <ul className="mt-4 space-y-3">
              {matches.map((match) => (
                <li
                  key={match.lesId}
                  className="rounded-lg border border-amber-200 bg-white p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                >
                  <div>
                    <p className="font-semibold text-gray-900">{match.titel}</p>
                    {match.lessenSerieTitel && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        Lessenserie: {match.lessenSerieTitel}
                      </p>
                    )}
                    <p className="text-xs text-amber-700 mt-1">
                      Overeenkomst: {Math.round(match.similarityScore * 100)}% — {match.reden}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setVergelijkMatch(match)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-100 text-amber-900 text-sm font-semibold hover:bg-amber-200 transition-colors"
                    >
                      <GitCompare size={14} />
                      Vergelijk
                    </button>
                    <Link
                      href={buildLesViewHref(match.lesId, returnTo)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-colors"
                    >
                      <Eye size={14} />
                      Inzien
                    </Link>
                  </div>
                </li>
              ))}
            </ul>

            {onDoorgaan && (
              <button
                type="button"
                onClick={onDoorgaan}
                className="mt-4 text-sm font-semibold text-amber-800 underline hover:text-amber-900"
              >
                Ik begrijp het risico — toch opslaan bij verzenden
              </button>
            )}
          </div>
        </div>
      </div>

      {vergelijkMatch && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="duplicaat-vergelijk-titel"
        >
          <div className="bg-white rounded-2xl shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 id="duplicaat-vergelijk-titel" className="text-lg font-bold text-gray-900">
                Vergelijking: jouw les vs. &quot;{vergelijkMatch.titel}&quot;
              </h2>
              <button
                type="button"
                onClick={() => setVergelijkMatch(null)}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                aria-label="Sluiten"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-0 flex-1 overflow-hidden min-h-0">
              <div className="border-b md:border-b-0 md:border-r border-gray-200 flex flex-col min-h-0">
                <div className="px-4 py-3 bg-orange-50 border-b border-orange-100">
                  <p className="text-xs font-bold uppercase tracking-wider text-orange-800">Jouw invoer</p>
                </div>
                <div className="p-4 overflow-y-auto flex-1 space-y-4 text-sm">
                  <VergelijkSectie label="Titel" tekst={huidigeLes.titel} />
                  <VergelijkSectie label="Introductie" tekst={huidigeLes.introductie} />
                  <VergelijkSectie label="Inhoud" tekst={huidigeLes.inhoud} />
                  <VergelijkSectie label="Slot" tekst={huidigeLes.slot} />
                </div>
              </div>

              <div className="flex flex-col min-h-0">
                <div className="px-4 py-3 bg-blue-50 border-b border-blue-100">
                  <p className="text-xs font-bold uppercase tracking-wider text-blue-800">
                    Bestaande les ({Math.round(vergelijkMatch.similarityScore * 100)}% overlap)
                  </p>
                </div>
                <div className="p-4 overflow-y-auto flex-1 space-y-4 text-sm">
                  <VergelijkSectie label="Titel" tekst={vergelijkMatch.titel} />
                  <VergelijkSectie label="Introductie" tekst={vergelijkMatch.introductie} />
                  <VergelijkSectie label="Inhoud" tekst={vergelijkMatch.inhoud} />
                  <VergelijkSectie label="Slot" tekst={vergelijkMatch.slot} />
                  <p className="text-xs text-gray-500 italic border-t border-gray-100 pt-3">
                    {vergelijkMatch.reden}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

function VergelijkSectie({ label, tekst }: { label: string; tekst: string }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-gray-800 whitespace-pre-wrap">{tekst?.trim() || '—'}</p>
    </div>
  );
}

export default LesDuplicaatWaarschuwing;
