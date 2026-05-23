'use client';

import React, { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { useAuth } from '@/hooks/useAuth';
import { fetchLessenSerieById, LessenSerieDto } from '@/lib/lessenserieApi';
import { StarRatingDisplay } from '@/components/StarRating';
import BeoordelingenOverzicht from '@/components/BeoordelingenOverzicht';
import { getRatingSummary } from '@/lib/ratingUtils';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Eye } from 'lucide-react';
import { btn, pageTitle } from '@/lib/buttonStyles';
import { buildLesViewHref } from '@/lib/navigationReturn';

export default function LessenSerieDetailPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const [item, setItem] = useState<LessenSerieDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  const params = useParams<{ id?: string }>();
  const id = params?.id;

  const invalidId = !id || id === 'undefined';

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
        <Sidebar activeItem="Materialen" />
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
      <Sidebar activeItem="Materialen" />
      <div className="flex-1 ml-64">
        <Header />
        <main className="p-8">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <h1 className={pageTitle}>{item?.titel ?? 'Lessenserie'}</h1>
            </div>
            <div className="flex gap-2">
              <Link
                href="/materialen"
                className={btn.ghost}
              >
                Terug
              </Link>                      
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Lessen</h2>
              {(item?.lessen?.length ?? 0) === 0 ? (
                <div className="text-gray-600">Nog geen lessen gekoppeld.</div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {item?.lessen?.map((les) => (
                    <li key={les.id} className="py-3 flex items-center justify-between">
                      <span className="text-gray-900">{les.titel}</span>
                      <Link
                        href={buildLesViewHref(String(les.id), `/materialen/${id}`)}
                        className={btn.icon}
                        aria-label={`Bekijk ${les.titel}`}
                        title="Bekijken"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="space-y-6">
              {item && (
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-2">Beoordeling</h2>
                  <StarRatingDisplay
                    rating={getRatingSummary(item.beoordelingen).gemiddelde}
                    aantal={getRatingSummary(item.beoordelingen).aantal}
                    size="md"
                  />
                  <p className="text-sm text-gray-500 mt-3 mb-4">
                    Nieuwe beoordelingen zijn hier niet meer mogelijk.
                  </p>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Toelichting(en)</h3>
                    <BeoordelingenOverzicht beoordelingen={item.beoordelingen} />
                  </div>
                </div>
              )}

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
                    <div className="text-gray-900">{item?.status ?? '-'}</div>
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
          </div>
        </main>
      </div>
    </div>
  );
}
