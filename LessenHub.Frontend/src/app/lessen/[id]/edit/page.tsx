'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { useAuth } from '@/hooks/useAuth';
import { sidebarActiveItemFromReturnPath } from '@/lib/navigationContext';
import { btn, pageTitle } from '@/lib/buttonStyles';

type LeerdoelEnum =
  | 'BegrijpendLezen'
  | 'Schrijven'
  | 'Luisteren'
  | 'Spreken'
  | 'Woordenschat'
  | 'Grammatica'
  | 'Cultuurbegrip'
  | 'KritischDenken'
  | 'Samenwerken'
  | 'Probleemoplossing';

const ALL_LEERDOELEN: { value: LeerdoelEnum; label: string }[] = [
  { value: 'BegrijpendLezen', label: 'Begrijpend lezen' },
  { value: 'Schrijven', label: 'Schrijven' },
  { value: 'Luisteren', label: 'Luisteren' },
  { value: 'Spreken', label: 'Spreken' },
  { value: 'Woordenschat', label: 'Woordenschat' },
  { value: 'Grammatica', label: 'Grammatica' },
  { value: 'Cultuurbegrip', label: 'Cultuurbegrip' },
  { value: 'KritischDenken', label: 'Kritisch denken' },
  { value: 'Samenwerken', label: 'Samenwerken' },
  { value: 'Probleemoplossing', label: 'Probleemoplossing' },
];

const LEERDOEL_TO_INT: Record<LeerdoelEnum, number> = {
  BegrijpendLezen: 0,
  Schrijven: 1,
  Luisteren: 2,
  Spreken: 3,
  Woordenschat: 4,
  Grammatica: 5,
  Cultuurbegrip: 6,
  KritischDenken: 7,
  Samenwerken: 8,
  Probleemoplossing: 9,
};

const INT_TO_LEERDOEL: Record<number, LeerdoelEnum> = Object.fromEntries(
  Object.entries(LEERDOEL_TO_INT).map(([k, v]) => [v, k as LeerdoelEnum])
) as Record<number, LeerdoelEnum>;

const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.pptx'];
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
];

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

type UpdateLesPayload = {
  Id: string;
  Titel: string;
  Leerdoel: number[];
  Introductie: string;
  Inhoud: string;
  Slot: string;
  TijdsDuur: string;
};

interface PendingBijlage {
  file: File;
  naam: string;
}

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

export default function EditLesPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const params = useParams<{ id?: string }>();
  const id = params?.id;
  const invalidId = !id || id === 'undefined';
  const searchParams = useSearchParams();
  const from = searchParams.get('from');
  const sidebarActiveItem = sidebarActiveItemFromReturnPath(from);
  const backHref = from ? `/material-uploads/${from}` : `/lessen/${id}`;

  const backendUrl = useMemo(
    () => process.env.NEXT_PUBLIC_BACKEND_URL || 'https://localhost:7207',
    []
  );

  const [titel, setTitel] = useState('');
  const [leerdoel, setLeerdoel] = useState<LeerdoelEnum[]>([]);
  const [introductie, setIntroductie] = useState('');
  const [inhoud, setInhoud] = useState('');
  const [slot, setSlot] = useState('');
  const [tijdsDuur, setTijdsDuur] = useState('00:45:00');

  // Existing bijlagen from backend
  const [bestaandeBijlagen, setBestaandeBijlagen] = useState<BijlageDto[]>([]);
  // New bijlagen to upload
  const [nieuweBijlagen, setNieuweBijlagen] = useState<PendingBijlage[]>([]);
  const [bijlageError, setBijlageError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        setTitel(data.titel ?? '');
        // Convert integers back to enum strings for checkboxes
        setLeerdoel((data.leerdoel ?? []).map((n) => INT_TO_LEERDOEL[n]).filter(Boolean));
        setIntroductie(data.introductie ?? '');
        setInhoud(data.inhoud ?? '');
        setSlot(data.slot ?? '');
        setTijdsDuur(data.tijdsDuur ?? '00:45:00');
        setBestaandeBijlagen(data.bijlagen ?? []);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Kon les niet ophalen.';
        setError(message);
      }
    };

    load();
  }, [isAuthenticated, invalidId, id, backendUrl]);

  const toggleLeerdoel = (value: LeerdoelEnum) => {
    setLeerdoel((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  };

  const handleBijlageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBijlageError(null);
    const files = Array.from(e.target.files ?? []);

    for (const file of files) {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(ext) || !ALLOWED_MIME_TYPES.includes(file.type)) {
        setBijlageError(`"${file.name}" is niet toegestaan. Alleen PDF, Word en PowerPoint.`);
        e.target.value = '';
        return;
      }
      if (file.size > 20 * 1024 * 1024) {
        setBijlageError(`"${file.name}" is te groot (max 20 MB).`);
        e.target.value = '';
        return;
      }
    }

    setNieuweBijlagen((prev) => [...prev, ...files.map((f) => ({ file: f, naam: f.name }))]);
    e.target.value = '';
  };

  const removeNieuweBijlage = (index: number) => {
    setNieuweBijlagen((prev) => prev.filter((_, i) => i !== index));
  };

  const deleteBijlage = async (bijlage: BijlageDto) => {
    setDeletingId(bijlage.id);
    try {
      const res = await fetch(
        `${backendUrl}/Les/${encodeURIComponent(id!)}/bijlagen/${encodeURIComponent(bijlage.id)}`,
        { method: 'DELETE', credentials: 'include' }
      );
      if (!res.ok) throw new Error(`Verwijderen mislukt (${res.status})`);
      setBestaandeBijlagen((prev) => prev.filter((b) => b.id !== bijlage.id));
    } catch (e) {
      console.error('Bijlage verwijderen mislukt:', e);
    } finally {
      setDeletingId(null);
    }
  };

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

  const uploadNieuweBijlagen = async () => {
    for (const bijlage of nieuweBijlagen) {
      const formData = new FormData();
      formData.append('bestand', bijlage.file, bijlage.naam);
      const res = await fetch(`${backendUrl}/Les/${encodeURIComponent(id!)}/bijlagen`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        console.warn(`Bijlage "${bijlage.naam}" uploaden mislukt: ${text}`);
      }
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (invalidId) {
      setError('Ongeldig les-id in de URL.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: UpdateLesPayload = {
        Id: id,
        Titel: titel.trim(),
        Leerdoel: leerdoel.map((ld) => LEERDOEL_TO_INT[ld]),
        Introductie: introductie,
        Inhoud: inhoud,
        Slot: slot,
        TijdsDuur: tijdsDuur,
      };

      const res = await fetch(`${backendUrl}/Les/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || `Backend returned ${res.status}`);
      }

      // Upload any new bijlagen
      if (nieuweBijlagen.length > 0) {
        await uploadNieuweBijlagen();
      }

      router.push(from ? `/material-uploads/${from}` : `/lessen/${id}`);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Opslaan mislukt.';
      setError(message);
    } finally {
      setIsSubmitting(false);
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
            <Link href="/material-uploads" className="px-3 py-2 text-gray-900 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
              Naar lessenseries
            </Link>
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
              <h1 className={pageTitle}>Les bewerken</h1>
              <p className="text-gray-600 mt-1">Pas de les aan en klik op opslaan.</p>
            </div>
            <Link href={backHref} className="px-3 py-2 text-gray-900 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
              Terug
            </Link>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg">{error}</div>
          )}

          <form onSubmit={onSubmit} className="space-y-6 max-w-3xl">
            {/* Titel */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">Titel</label>
              <input
                value={titel}
                onChange={(e) => setTitel(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900"
              />
            </div>

            {/* Leerdoelen */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">Leerdoelen</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {ALL_LEERDOELEN.map((ld) => (
                  <label key={ld.value} className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={leerdoel.includes(ld.value)}
                      onChange={() => toggleLeerdoel(ld.value)}
                      className="h-4 w-4"
                    />
                    <span className="text-sm text-gray-800">{ld.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Introductie */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">Introductie</label>
              <textarea
                value={introductie}
                onChange={(e) => setIntroductie(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900"
              />
            </div>

            {/* Inhoud */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">Inhoud</label>
              <textarea
                value={inhoud}
                onChange={(e) => setInhoud(e.target.value)}
                rows={8}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900"
              />
            </div>

            {/* Slot */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">Slot</label>
              <textarea
                value={slot}
                onChange={(e) => setSlot(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900"
              />
            </div>

            {/* Tijdsduur */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">Tijdsduur</label>
              <input
                value={tijdsDuur}
                onChange={(e) => setTijdsDuur(e.target.value)}
                className="w-48 px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900"
                placeholder="HH:MM:SS"
              />
            </div>

            {/* Bijlagen */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">Bijlagen</label>
              <p className="text-xs text-gray-500 mb-3">Toegestaan: PDF, Word (.docx), PowerPoint (.pptx) — max 20 MB</p>

              {bijlageError && (
                <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {bijlageError}
                </div>
              )}

              {/* Bestaande bijlagen */}
              {bestaandeBijlagen.length > 0 && (
                <ul className="mb-3 space-y-2">
                  {bestaandeBijlagen.map((b) => (
                    <li key={b.id} className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                      <div className="flex items-center gap-2 truncate">
                        <span>{getFileIcon(b.bestandsnaam)}</span>
                        <span className="text-sm text-gray-700 truncate max-w-xs">{b.bestandsnaam}</span>
                        <span className="text-xs text-gray-400 shrink-0">{formatBytes(b.grootte)}</span>
                      </div>
                      <div className="flex gap-2 ml-3 shrink-0">
                        <button
                          type="button"
                          onClick={() => downloadBijlage(b)}
                          disabled={downloadingId === b.id}
                          className="px-2 py-1 text-xs rounded border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                        >
                          {downloadingId === b.id ? '...' : '⬇'}
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteBijlage(b)}
                          disabled={deletingId === b.id}
                          className="px-2 py-1 text-xs rounded border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          {deletingId === b.id ? '...' : 'Verwijder'}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {/* Nieuwe bijlagen toevoegen */}
              <label className="flex items-center gap-2 w-fit cursor-pointer px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">
                <span>📎</span>
                <span>Bestand toevoegen</span>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.docx,.pptx"
                  onChange={handleBijlageChange}
                  className="hidden"
                />
              </label>

              {nieuweBijlagen.length > 0 && (
                <ul className="mt-3 space-y-2">
                  {nieuweBijlagen.map((b, i) => (
                    <li key={i} className="flex items-center justify-between rounded-lg border border-blue-100 bg-blue-50 px-3 py-2">
                      <div className="flex items-center gap-2 text-sm text-gray-700 truncate">
                        <span>{getFileIcon(b.naam)}</span>
                        <span className="truncate max-w-xs">{b.naam}</span>
                        <span className="text-gray-400 text-xs shrink-0">{formatBytes(b.file.size)}</span>
                        <span className="text-blue-500 text-xs shrink-0">Nieuw</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeNieuweBijlage(i)}
                        className="text-red-500 hover:text-red-700 text-sm ml-3 shrink-0"
                      >
                        Verwijder
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Submit */}
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className={btn.primary}
              >
                {isSubmitting ? 'Opslaan...' : 'Opslaan'}
              </button>
              <Link href={backHref} className="px-4 py-2 bg-white border border-gray-200 text-gray-900 rounded-lg hover:bg-gray-50">
                Annuleren
              </Link>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}