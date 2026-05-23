'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { useAuth } from '@/hooks/useAuth';
import { getSafeLesReturnPath, getUploadsSerieBackPath } from '@/lib/navigationReturn';
import { sidebarActiveItemFromReturnPath } from '@/lib/navigationContext';
import { btn, pageTitle } from '@/lib/buttonStyles';

const LEERDOEL_LABELS: Record<number, string> = {
  0: 'Begrijpend lezen',
  1: 'Schrijven',
  2: 'Luisteren',
  3: 'Spreken',
  4: 'Woordenschat',
  5: 'Grammatica',
  6: 'Cultuurbegrip',
  7: 'Kritisch denken',
  8: 'Samenwerken',
  9: 'Probleemoplossing',
};

type BijlageDto = {
  id: string;
  bestandsnaam: string;
  contentType: string;
  grootte: number;
  geuploadOp: string;
};

type LesDto = {
  id: string;
  titel: string;
  leerdoel: number[];
  introductie: string;
  inhoud: string;
  slot: string;
  tijdsDuur: string;
  bijlagen: BijlageDto[];
};

function getFileIcon(naam: string): string {
  if (naam.endsWith('.pdf')) return '📄';
  if (naam.endsWith('.docx')) return '📝';
  if (naam.endsWith('.pptx')) return '📊';
  return '📎';
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function LesDetailPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const [les, setLes] = useState<LesDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const params = useParams<{ id?: string }>();
  const id = params?.id;
  const invalidId = !id || id === 'undefined';
  const searchParams = useSearchParams();
  const from = searchParams.get('from');
  const returnTo = getSafeLesReturnPath(searchParams.get('returnTo'));
  const uploadsSerieBack = !returnTo ? getUploadsSerieBackPath(from) : null;
  const sidebarActiveItem = sidebarActiveItemFromReturnPath(returnTo ?? from);
  const isReturnToNewLesForm = returnTo?.startsWith('/lessen/new') ?? false;

  const onBack = () => {
    if (returnTo) {
      router.push(returnTo);
      return;
    }
    if (uploadsSerieBack) {
      router.push(uploadsSerieBack);
      return;
    }
    router.back();
  };

  const backendUrl = useMemo(
    () => process.env.NEXT_PUBLIC_BACKEND_URL || 'https://localhost:7207',
    []
  );

  useEffect(() => {
    if (!isAuthenticated) return;
    if (invalidId) return;

    const load = async () => {
      try {
        setError(null);
        const res = await fetch(`${backendUrl}/Les/${encodeURIComponent(id)}`, {
          credentials: 'include',
        });

        if (!res.ok) {
          const text = await res.text().catch(() => '');
          throw new Error(text || `Backend returned ${res.status}`);
        }

        const data = (await res.json()) as LesDto;
        setLes(data);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Kon les niet ophalen.';
        setError(message);
      }
    };

    load();
  }, [isAuthenticated, invalidId, id, backendUrl]);

  const downloadBijlage = async (bijlage: BijlageDto) => {
    setDownloadingId(bijlage.id);
    try {
      const res = await fetch(
        `${backendUrl}/Les/${encodeURIComponent(id!)}/bijlagen/${encodeURIComponent(bijlage.id)}/download`,
        { credentials: 'include' }
      );

      if (!res.ok) throw new Error(`Download mislukt (${res.status})`);

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = bijlage.bestandsnaam;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Download mislukt:', e);
    } finally {
      setDownloadingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-gray-500">Laden...</div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  if (invalidId) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar activeItem={sidebarActiveItem} />
        <div className="flex-1 ml-64">
          <Header />
          <main className="p-8">
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg">
              Ongeldig les-id in de URL.
            </div>
              <button type="button" onClick={onBack} className={btn.ghost}>
                Terug
              </button>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar activeItem={sidebarActiveItem} />
      <div className="flex-1 ml-64">
        <Header />
        <main className="p-8">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <h1 className={pageTitle}>{les?.titel ?? 'Les'}</h1>
              <p className="text-sm text-gray-600 mt-1">Tijdsduur: {les?.tijdsDuur ?? '-'}</p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={onBack} className={btn.ghost}>
                {isReturnToNewLesForm ? 'Terug naar les aanmaken' : 'Terug'}
              </button>
            </div>
          </div>

          {isReturnToNewLesForm && (
            <p className="mb-4 text-sm text-gray-600">
              Je invoer (AI-velden en duplicaatcontrole) blijft bewaard als je teruggaat.
            </p>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg">
              {error}
            </div>
          )}

          {les && (
            <div className="grid grid-cols-1 gap-6 max-w-4xl">
              <section className="bg-white border border-gray-200 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Introductie</h2>
                <p className="text-gray-800 whitespace-pre-wrap">{les.introductie}</p>
              </section>

              <section className="bg-white border border-gray-200 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Inhoud</h2>
                <p className="text-gray-800 whitespace-pre-wrap">{les.inhoud}</p>
              </section>

              <section className="bg-white border border-gray-200 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Slot</h2>
                <p className="text-gray-800 whitespace-pre-wrap">{les.slot}</p>
              </section>

              <section className="bg-white border border-gray-200 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Leerdoelen</h2>
                {(les.leerdoel?.length ?? 0) === 0 ? (
                  <div className="text-gray-600">Geen leerdoelen opgeslagen.</div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {les.leerdoel.map((ld) => (
                      <span
                        key={ld}
                        className="inline-flex items-center px-2.5 py-1 rounded-full bg-orange-100 text-orange-800 text-sm"
                      >
                        {LEERDOEL_LABELS[ld] ?? `Leerdoel ${ld}`}
                      </span>
                    ))}
                  </div>
                )}
              </section>

              {/* Bijlagen */}
              <section className="bg-white border border-gray-200 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Bijlagen</h2>
                {(les.bijlagen?.length ?? 0) === 0 ? (
                  <p className="text-gray-500 text-sm">Geen bijlagen toegevoegd.</p>
                ) : (
                  <ul className="space-y-2">
                    {les.bijlagen.map((b) => (
                      <li
                        key={b.id}
                        className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3"
                      >
                        <div className="flex items-center gap-3 truncate">
                          <span className="text-xl">{getFileIcon(b.bestandsnaam)}</span>
                          <div className="truncate">
                            <p className="text-sm font-medium text-gray-800 truncate">{b.bestandsnaam}</p>
                            <p className="text-xs text-gray-400">
                              {formatBytes(b.grootte)} · {new Date(b.geuploadOp).toLocaleDateString('nl-NL')}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => downloadBijlage(b)}
                          disabled={downloadingId === b.id}
                          className="ml-4 shrink-0 px-3 py-1.5 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                        >
                          {downloadingId === b.id ? 'Downloaden...' : '⬇ Download'}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}