'use client';

import React, { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { useAuth } from '@/hooks/useAuth';
import { fetchLessenSerieById, LessenSerieDto, LessenSerieIndienen } from '@/lib/lessenserieApi';
import { useParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Edit, Plus } from 'lucide-react';
import { btn, pageTitle, pageSubtitle } from '@/lib/buttonStyles';
import LessenSerieStatusBadge from '@/components/LessenSerieStatusBadge';
import LessenSerieFlowSteps from '@/components/LessenSerieFlowSteps';
import { getLaatsteToelichting } from '@/components/BeoordelingenOverzicht';
import { getLessenSerieUiState } from '@/lib/lessenSerieStatus';

export default function LessenSerieDetailPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const [item, setItem] = useState<LessenSerieDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const router = useRouter();
  const params = useParams<{ id?: string }>();
  const id = params?.id;

  const invalidId = !id || id === 'undefined';
  const lessonCount = item?.lessen?.length ?? 0;
  const ui = getLessenSerieUiState(item?.status, { lessonCount });
  const afwijzingToelichting = ui.showAfwijzingFeedback
    ? getLaatsteToelichting(item?.beoordelingen)
    : null;

  useEffect(() => {
    if (!isAuthenticated) return;
    if (invalidId) return;
    const load = async () => {
      try {
        setError(null);
        const data = await fetchLessenSerieById(id);
        setItem(data);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Kon lessenserie niet ophalen.';
        setError(message);
      }
    };
    load();
  }, [isAuthenticated, id, invalidId]);

  const handleIndienen = async () => {
    if (!id || !ui.canIndienen) return;

    setSubmitting(true);
    try {
      await LessenSerieIndienen(id);
      router.push('/material-uploads');
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Indienen mislukt.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-gray-500">Laden...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (invalidId) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar activeItem="Mijn uploads" />
        <div className="flex-1 ml-64">
          <Header />
          <main className="p-8">
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg">
              Ongeldig lessenserie-id in de URL.
            </div>
            <Link
              href="/material-uploads"
              className="inline-flex px-3 py-2 text-gray-900 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              Terug naar overzicht
            </Link>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar activeItem="Mijn uploads" />
      <div className="flex-1 ml-64">
        <Header />
        <main className="p-8">
          <LessenSerieFlowSteps activeStep={ui.flowStep} className="mb-6" />

          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h1 className={pageTitle}>{item?.titel ?? 'Lessenserie'}</h1>
                <LessenSerieStatusBadge status={item?.status} />
              </div>
              <p className={pageSubtitle}>{item?.omschrijving ?? ''}</p>
              {ui.hint && (
                <p className="text-sm text-gray-500 mt-2">{ui.hint}</p>
              )}
            </div>
            <div className="flex flex-wrap gap-2 justify-end">
              {ui.canIndienen ? (
                <button
                  onClick={handleIndienen}
                  disabled={submitting}
                  className={`${btn.primary} whitespace-nowrap`}
                >
                  {submitting ? 'Bezig...' : ui.indienenButtonLabel}
                </button>
              ) : ui.showConceptenLink ? (
                <Link href="/concepten" className={btn.secondary}>
                  Ingediend — zie Concepten
                </Link>
              ) : null}
              {ui.showMaterialenLink && id && (
                <Link href={`/materialen/${id}`} className={btn.secondary}>
                  Bekijk in Materialen
                </Link>
              )}
              {ui.canEdit && (
                <Link href={`/material-uploads/${id}/edit`} className={btn.ghost}>
                  Serie bewerken
                </Link>
              )}
              <Link href="/material-uploads" className={btn.ghost}>
                Terug
              </Link>
            </div>
          </div>

          {afwijzingToelichting && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm font-semibold text-red-900 mb-1">Toelichting bij afwijzing</p>
              <p className="text-sm text-red-800 whitespace-pre-wrap">{afwijzingToelichting}</p>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-gray-900">Lessen</h2>
                {ui.canEdit && (
                  <Link
                    href={`/lessen/new?from=${encodeURIComponent(String(id))}`}
                    className={`${btn.primary} text-sm py-1.5 px-3`}
                  >
                    <Plus className="w-4 h-4" />
                    Les toevoegen
                  </Link>
                )}
              </div>
              {(item?.lessen?.length ?? 0) === 0 ? (
                <div className="rounded-xl border border-dashed border-orange-200 bg-orange-50/50 p-6 text-center">
                  <p className="text-gray-800 font-medium mb-1">Nog geen lessen in deze serie</p>
                  <p className="text-sm text-gray-600 mb-4">
                    {ui.canEdit
                      ? 'Voeg je eerste les toe. Upload een PDF of Word-document — AI vult de velden automatisch in.'
                      : 'Er zijn nog geen lessen gekoppeld.'}
                  </p>
                  {ui.canEdit && (
                    <Link
                      href={`/lessen/new?from=${encodeURIComponent(String(id))}`}
                      className={btn.primaryLg}
                    >
                      <Plus className="w-4 h-4" />
                      Eerste les maken met document
                    </Link>
                  )}
                </div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {item?.lessen?.map((les) => (
                    <li key={les.id} className="py-3 flex items-center justify-between">
                      <span className="text-gray-900">{les.titel}</span>
                      {ui.canEdit ? (
                        <Link
                          href={`/lessen/${les.id}/edit?from=${encodeURIComponent(String(id))}`}
                          className={btn.icon}
                          aria-label={`Bewerk ${les.titel}`}
                          title="Bewerken"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                      ) : (
                        <span className="text-xs text-gray-400">Alleen bekijken</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Details</h2>
              <div className="text-sm text-gray-700 space-y-2">
                <div>
                  <div className="text-gray-500">Eigenaar</div>
                  <div className="text-gray-900">{item?.eigenaar?.naam ?? '-'}</div>
                  <div className="text-gray-600">{item?.eigenaar?.email ?? ''}</div>
                </div>
                <div>
                  <div className="text-gray-500">Status</div>
                  <div className="mt-1">
                    <LessenSerieStatusBadge status={item?.status} />
                  </div>
                </div>
                <div>
                  <div className="text-gray-500">Aantal lessen</div>
                  <div className="text-gray-900">
                    {item?.aantalLessen && item.aantalLessen > 0
                      ? item.aantalLessen
                      : (item?.lessen?.length ?? 0)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
