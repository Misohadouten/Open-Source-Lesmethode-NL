'use client';

import gsap from 'gsap';
import React, { useEffect, useMemo, useState, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { useAuth } from '@/hooks/useAuth';
import {
  fetchLessenSeries,
  fetchLessenSerieById,
  LessenSerieDto,
  updateLessenSerie,
} from '@/lib/lessenserieApi';
import LesDuplicaatWaarschuwing, { type LesDuplicaatMatch } from '@/components/LesDuplicaatWaarschuwing';
import LesAiLoadingOverlay from '@/components/les/LesAiLoadingOverlay';
import LesAiUploadPanel from '@/components/les/LesAiUploadPanel';
import { controleerLesDuplicaat } from '@/lib/lesDuplicaatApi';
import { sidebarActiveItemFromReturnPath } from '@/lib/navigationContext';
import { btn, pageTitle } from '@/lib/buttonStyles';
import {
  ALL_LEERDOELEN,
  LEERDOEL_TO_INT,
  INT_TO_LEERDOEL,
  ALLOWED_EXTENSIONS,
  ALLOWED_MIME_TYPES,
  isAiUploadFileAllowed,
  type LeerdoelEnum,
} from '@/lib/lesFormConstants';
import {
  draftStorageKey,
  readFormDraft,
  writeFormDraft,
  clearFormDraft,
  type NewLesFormDraft,
  type DuplicaatStatus,
} from '@/lib/lesFormDraft';
import {
  getFileIcon,
  formatBytes,
  minutesToTimespan,
  aiAnalyseCompleteness,
  listOntbrekendeAnalyseVelden,
  parseAnalyseApiResponse,
} from '@/lib/lesAiAnalyse';

interface CreateLesPayload {
  Titel: string;
  Leerdoel: number[];
  Introductie: string;
  Inhoud: string;
  Slot: string;
  TijdsDuur: string;
  Literatuurlijst: string[];
}

interface CreatedLesResponse {
  id: string;
  titel: string;
  leerdoel: number[];
  introductie: string;
  inhoud: string;
  slot: string;
  tijdsDuur: string;
  literatuurlijst: string[];
}

interface PendingBijlage {
  file: File;
  naam: string;
}

export default function Page() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Laden...</div>}>
      <NewLesPage />
    </Suspense>
  );
}

function NewLesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLoading, isAuthenticated, user } = useAuth();
  const formRef = useRef<HTMLFormElement>(null);

  const from = searchParams.get('from');
  const sidebarActiveItem = sidebarActiveItemFromReturnPath(from);
  const hasFrom = Boolean(from);

  const [titel, setTitel] = useState('');
  const [leerdoel, setLeerdoel] = useState<LeerdoelEnum[]>([]);
  const [introductie, setIntroductie] = useState('');
  const [inhoud, setInhoud] = useState('');
  const [slot, setSlot] = useState('');
  const [duurMinuten, setDuurMinuten] = useState<number>(45);
  const [bijlagen, setBijlagen] = useState<PendingBijlage[]>([]);
  const [bijlageError, setBijlageError] = useState<string | null>(null);

  // AI state
  const [aiBestand, setAiBestand] = useState<File | null>(null);
  const [aiBezig, setAiBezig] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSucces, setAiSucces] = useState(false);
  const [aiLiteratuurlijst, setAiLiteratuurlijst] = useState<string[]>([]);

  const [lessenseries, setLessenseries] = useState<LessenSerieDto[]>([]);
  const [lessenserieId, setLessenserieId] = useState<string>('');
  const [lessenserieTitel, setLessenserieTitel] = useState<string | null>(null);
  const [nieuweLessenserieTitel, setNieuweLessenserieTitel] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [duplicaatMatches, setDuplicaatMatches] = useState<LesDuplicaatMatch[]>([]);
  const [duplicaatStatus, setDuplicaatStatus] = useState<DuplicaatStatus>(null);
  const [duplicaatCheckError, setDuplicaatCheckError] = useState<string | null>(null);
  const [duplicaatAcknowledged, setDuplicaatAcknowledged] = useState(false);

  const draftKey = useMemo(() => draftStorageKey(from), [from]);
  const returnToUrl = useMemo(
    () => (from ? `/lessen/new?from=${encodeURIComponent(from)}` : '/lessen/new'),
    [from]
  );
  const draftRestored = useRef(false);

  const backendUrl = useMemo(
    () => process.env.NEXT_PUBLIC_BACKEND_URL || 'https://localhost:7207',
    []
  );

  useEffect(() => {
    if (!isAuthenticated) return;
    if (from) setLessenserieId(from);

    const loadSeries = async () => {
      try {
        if (!user?.docentId) return;
        const data = await fetchLessenSeries(user.docentId);
        setLessenseries(data);
        if (from) {
          try {
            const serie = await fetchLessenSerieById(from);
            setLessenserieTitel(serie.titel ?? null);
          } catch {
            setLessenserieTitel(null);
          }
        }
      } catch {
        setLessenseries([]);
      }
    };

    loadSeries();
  }, [isAuthenticated, from, user?.docentId]);

  useEffect(() => {
    if (!isAuthenticated || draftRestored.current) return;
    const draft = readFormDraft(draftKey);
    if (!draft) return;

    const hasContent =
      Boolean(draft.titel?.trim())
      || Boolean(draft.introductie?.trim())
      || Boolean(draft.inhoud?.trim())
      || Boolean(draft.slot?.trim());
    if (!hasContent) return;

    draftRestored.current = true;
    setTitel(draft.titel ?? '');
    setLeerdoel(Array.isArray(draft.leerdoel) ? draft.leerdoel : []);
    setIntroductie(draft.introductie ?? '');
    setInhoud(draft.inhoud ?? '');
    setSlot(draft.slot ?? '');
    if (typeof draft.duurMinuten === 'number' && draft.duurMinuten > 0) {
      setDuurMinuten(draft.duurMinuten);
    }
    if (draft.lessenserieId) setLessenserieId(draft.lessenserieId);
    setNieuweLessenserieTitel(draft.nieuweLessenserieTitel ?? '');
    setAiLiteratuurlijst(Array.isArray(draft.aiLiteratuurlijst) ? draft.aiLiteratuurlijst : []);
    setDuplicaatMatches(Array.isArray(draft.duplicaatMatches) ? draft.duplicaatMatches : []);
    setDuplicaatStatus(draft.duplicaatStatus ?? null);
    setDuplicaatAcknowledged(Boolean(draft.duplicaatAcknowledged));
    if (draft.titel || draft.inhoud) setAiSucces(true);
  }, [isAuthenticated, draftKey]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const hasContent =
      titel.trim().length > 0
      || introductie.trim().length > 0
      || inhoud.trim().length > 0
      || slot.trim().length > 0;
    if (!hasContent) {
      clearFormDraft(draftKey);
      return;
    }

    writeFormDraft(draftKey, {
      titel,
      leerdoel,
      introductie,
      inhoud,
      slot,
      duurMinuten,
      lessenserieId,
      nieuweLessenserieTitel,
      aiLiteratuurlijst,
      duplicaatMatches,
      duplicaatStatus,
      duplicaatAcknowledged,
    });
  }, [
    isAuthenticated,
    draftKey,
    titel,
    leerdoel,
    introductie,
    inhoud,
    slot,
    duurMinuten,
    lessenserieId,
    nieuweLessenserieTitel,
    aiLiteratuurlijst,
    duplicaatMatches,
    duplicaatStatus,
    duplicaatAcknowledged,
  ]);

  const handleDuplicaatCheck = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setDuplicaatStatus('checking');
    setDuplicaatCheckError(null);
    setDuplicaatAcknowledged(false);

    try {
      const matches = await controleerLesDuplicaat({
        titel,
        introductie,
        inhoud,
        slot,
      });
      setDuplicaatMatches(matches);
      setDuplicaatStatus(matches.length > 0 ? 'gevonden' : 'geen');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Duplicaatcontrole mislukt.';
      setDuplicaatCheckError(message);
      setDuplicaatMatches([]);
      setDuplicaatStatus(null);
    }
  };

  useEffect(() => {
    setDuplicaatAcknowledged(false);
  }, [titel, introductie, inhoud, slot]);

  // GSAP Animatie als AI succesvol is
  useEffect(() => {
    if (aiSucces && formRef.current) {
      const ctx = gsap.context(() => {
        gsap.fromTo(
          '.ai-highlight',
          { 
            boxShadow: '0 0 0 4px rgba(249, 115, 22, 0.4)',
            backgroundColor: 'rgba(255, 237, 213, 0.5)' 
          },
          { 
            boxShadow: '0 0 0 0px rgba(249, 115, 22, 0)',
            backgroundColor: 'rgba(255, 255, 255, 1)',
            duration: 2.5, 
            ease: 'power2.out', 
            stagger: 0.15 
          }
        );
      }, formRef);
      return () => ctx.revert();
    }
  }, [aiSucces]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-gray-500">Laden...</div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

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

    const nieuweItems: PendingBijlage[] = files.map((f) => ({ file: f, naam: f.name }));
    setBijlagen((prev) => [...prev, ...nieuweItems]);
    e.target.value = '';
  };

  const removeBijlage = (index: number) => {
    setBijlagen((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAiBestandChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setAiError(null);
    setAiSucces(false);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isAiUploadFileAllowed(file)) {
      setAiError('Alleen PDF en Word (.docx) bestanden zijn toegestaan voor AI analyse.');
      e.target.value = '';
      return;
    }

    setAiBestand(file);
    e.target.value = '';

    await analyseerMetAi(file);
  };

  const analyseerMetAi = async (file: File) => {
    setAiBezig(true);
    setAiError(null);
    setAiSucces(false);

    try {
      const formData = new FormData();
      formData.append('bestand', file, file.name);

      const res = await fetch(`${backendUrl}/LesAnalyse/analyseer`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!res.ok) {
        const text = (await res.text().catch(() => '')).trim();
        if (text.includes('geen tekst uit deze PDF')) {
          throw new Error('We konden geen tekst uit deze PDF halen.');
        }
        throw new Error(text || `AI analyse mislukt (${res.status})`);
      }

      let rawJson: unknown = null;
      try {
        rawJson = await res.json();
      } catch {
        throw new Error('Ongeldig antwoord van de server (geen JSON).');
      }

      console.log('AI raw response:', rawJson);

      const { resultaat, debug } = parseAnalyseApiResponse(rawJson);

      console.log('PDF extracted text length:', debug?.documentTextLength ?? '(onbekend)');
      console.log('PDF extracted preview:', debug?.documentTextPreview ?? '(niet meegeleverd)');
      console.log('AI call attempted:', debug?.aiCallAttempted ?? '(onbekend)');
      console.log('AI call succeeded:', debug?.aiCallSucceeded ?? '(onbekend)');
      if (debug?.aiRawResponsePreview) {
        console.log('AI raw response preview:', debug.aiRawResponsePreview);
      }
      console.log('Parsed lesson data:', resultaat);

      if (!hasFrom && resultaat.lessenSerieTitel?.trim()) {
        const serieNaam = resultaat.lessenSerieTitel.trim();
        const bestaand = lessenseries.find(
          (ls) => (ls.titel ?? '').trim().toLowerCase() === serieNaam.toLowerCase()
        );
        if (bestaand?.id) {
          setLessenserieId(bestaand.id);
          setNieuweLessenserieTitel('');
          setLessenserieTitel(bestaand.titel ?? null);
        } else {
          setLessenserieId('');
          setNieuweLessenserieTitel(serieNaam);
        }
      }

      const titelVoorForm =
        resultaat.titel?.trim()
        || resultaat.lessenSerieTitel?.trim()
        || '';
      if (titelVoorForm) setTitel(titelVoorForm);
      if (resultaat.introductie?.trim()) setIntroductie(resultaat.introductie.trim());
      if (resultaat.inhoud?.trim()) setInhoud(resultaat.inhoud.trim());
      if (resultaat.slot?.trim()) setSlot(resultaat.slot.trim());

      if (Array.isArray(resultaat.literatuurlijst) && resultaat.literatuurlijst.length > 0) {
        setAiLiteratuurlijst(resultaat.literatuurlijst.filter((s) => s.trim().length > 0));
      }

      if (resultaat.leerdoelen && resultaat.leerdoelen.length > 0) {
        const mapped = resultaat.leerdoelen.map((n) => INT_TO_LEERDOEL[n]).filter(Boolean);
        if (mapped.length > 0) setLeerdoel(mapped);
      }

      if (
        typeof resultaat.tijdsDuurMinuten === 'number'
        && Number.isFinite(resultaat.tijdsDuurMinuten)
        && resultaat.tijdsDuurMinuten > 0
      ) {
        setDuurMinuten(Math.floor(resultaat.tijdsDuurMinuten));
      }

      const volledigheid = aiAnalyseCompleteness(resultaat);
      console.log('Validation result:', {
        ...volledigheid,
        serverValidation: debug?.validationResult,
      });

      if (!volledigheid.heeftIets) {
        setAiSucces(false);
        setAiError(
          'Kon geen lesgegevens uit het document halen. Probeer een ander bestand of vul de velden handmatig in.'
        );
      } else if (!volledigheid.isVoldoende) {
        setAiSucces(true);
        const ontbrekend = listOntbrekendeAnalyseVelden(resultaat);
        const alleenOptioneel =
          ontbrekend.length > 0
          && ontbrekend.every((v) => v === 'leerdoelen' || v === 'tijdsduur');
        if (ontbrekend.length === 0) {
          setAiError(null);
        } else if (alleenOptioneel) {
          setAiError(
            `Deels ingevuld — vul nog aan: ${ontbrekend.join(', ')} (optioneel voor concept).`
          );
        } else {
          setAiError(
            `Deels ingevuld — ontbreken nog: ${ontbrekend.join(', ')}. Controleer en vul aan waar nodig.`
          );
        }
      } else {
        setAiError(null);
        setAiSucces(true);
      }

      setDuplicaatStatus(null);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'AI analyse mislukt.';
      setAiError(message);
    } finally {
      setAiBezig(false);
    }
  };

  const validate = (): string | null => {
    if (!titel.trim()) return 'Titel is verplicht.';
    if (!introductie.trim()) return 'Introductie is verplicht.';
    if (!inhoud.trim()) return 'Inhoud is verplicht.';
    if (!slot.trim()) return 'Slot is verplicht.';
    if (leerdoel.length === 0) return 'Kies minstens één leerdoel.';
    if (!Number.isFinite(duurMinuten) || duurMinuten <= 0) return 'Tijdsduur moet groter zijn dan 0 minuten.';
    if (!lessenserieId && !nieuweLessenserieTitel.trim()) return 'Lessenserie titel is verplicht bij nieuwe lessenserie.';
    return null;
  };

  const uploadBijlagen = async (lesId: string) => {
    for (const bijlage of bijlagen) {
      const formData = new FormData();
      formData.append('bestand', bijlage.file, bijlage.naam);
      const res = await fetch(`${backendUrl}/Les/${lesId}/bijlagen`, {
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

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    if (duplicaatStatus === null) {
      setError('Voer eerst een AI check duplicatie uit voordat je opslaat.');
      return;
    }
    if (duplicaatStatus === 'gevonden' && !duplicaatAcknowledged) {
      setError(
        'Er zijn mogelijke duplicaten gevonden. Bekijk de vergelijking hierboven of bevestig dat je toch wilt opslaan.'
      );
      return;
    }

    const payload: CreateLesPayload = {
      Titel: titel.trim(),
      Leerdoel: leerdoel.map((ld) => LEERDOEL_TO_INT[ld]),
      Introductie: introductie.trim(),
      Inhoud: inhoud.trim(),
      Slot: slot.trim(),
      TijdsDuur: minutesToTimespan(duurMinuten),
      Literatuurlijst: aiLiteratuurlijst,
    };

    setSubmitting(true);
    try {
      const res = await fetch(`${backendUrl}/Les`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || `Backend returned ${res.status}`);
      }

      const created = (await res.json()) as CreatedLesResponse;
      const createdLesId = created?.id;

      if (bijlagen.length > 0) {
        await uploadBijlagen(createdLesId);
      }

      let targetLessenSerieId = lessenserieId;

      if (!lessenserieId) {
        try {
          const ownerId = user?.docentId;
          const newLessenSeriePayload = {
            Titel: nieuweLessenserieTitel.trim(),
            Omschrijving: `Lessenserie met ${titel}`,
            Leerdoelen: leerdoel.map((ld) => LEERDOEL_TO_INT[ld]),
            SchoolNiveau: 0,
            TaalNiveau: 0,
            Vaardigheden: [],
            AantalLessen: 1,
            TijdsDuur: minutesToTimespan(duurMinuten),
            Status: 'Nieuw',
            Literatuurlijst: aiLiteratuurlijst,
            Eigenaar: {
              ...(ownerId ? { Id: ownerId } : {}),
              Naam: user?.name || 'Docent',
              Email: user?.email || 'docent@example.com',
            },
            Lessen: [{
              id: createdLesId,
              titel: created.titel,
              leerdoel: created.leerdoel,
              introductie: created.introductie,
              inhoud: created.inhoud,
              slot: created.slot,
              tijdsDuur: created.tijdsDuur,
              literatuurlijst: created.literatuurlijst,
            }],
          };

          const createRes = await fetch(`${backendUrl}/LessenSerie`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(newLessenSeriePayload),
          });

          if (!createRes.ok) throw new Error('Failed to create new lessenserie');
          const newLessenSerie = await createRes.json();
          targetLessenSerieId = newLessenSerie.id;
        } catch (e) {
          console.warn('Nieuwe lessenserie aanmaken mislukt:', e);
        }
      } else if (targetLessenSerieId) {
        try {
          const current = await fetchLessenSerieById(targetLessenSerieId);
          const mergedLiteratuurlijst = Array.from(
            new Set([
              ...(current.literatuurlijst ?? []),
              ...aiLiteratuurlijst,
            ].filter((s): s is string => typeof s === 'string' && s.trim().length > 0))
          );
          const exists = (current.lessen ?? []).some((l) => l.id === createdLesId);
          const nextLessen = exists
            ? current.lessen ?? []
            : [
                ...(current.lessen ?? []),
                {
                  id: createdLesId,
                  titel: created.titel,
                  leerdoel: created.leerdoel,
                  introductie: created.introductie,
                  inhoud: created.inhoud,
                  slot: created.slot,
                  tijdsDuur: created.tijdsDuur,
                  literatuurlijst: created.literatuurlijst,
                },
              ];

          const updatePayload = {
            ...(current as unknown as Record<string, unknown>),
            Id: current.id ?? lessenserieId,
            Titel: current.titel,
            Omschrijving: current.omschrijving,
            Leerdoelen: current.leerdoelen,
            SchoolNiveau: current.schoolNiveau,
            TaalNiveau: current.taalNiveau,
            Vaardigheden: current.vaardigheden,
            AantalLessen: nextLessen.length,
            TijdsDuur: current.tijdsDuur,
            Status: current.status,
            Literatuurlijst: mergedLiteratuurlijst,
            Eigenaar: current.eigenaar,
            Lessen: nextLessen,
          };

          await updateLessenSerie(targetLessenSerieId, updatePayload);
        } catch (e) {
          console.warn('Koppelen aan lessenserie mislukt:', e);
        }
      }

      clearFormDraft(draftKey);

      if (from) {
        router.push(`/material-uploads/${from}`);
      } else if (targetLessenSerieId) {
        router.push(`/material-uploads/${targetLessenSerieId}`);
      } else {
        router.push('/');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Onbekende fout.';
      setError(`Aanmaken mislukt: ${message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <LesAiLoadingOverlay isAnalyzing={aiBezig} />

      <Sidebar activeItem={sidebarActiveItem} />

      <div className="flex-1 ml-64">
        <Header />

        <main className="p-8">
          <div className="max-w-3xl">
            <div className="flex items-center justify-between gap-4 mb-6">
              <div>
                <h1 className={pageTitle}>Nieuwe les toevoegen</h1>
                {hasFrom && lessenserieTitel ? (
                  <p className="text-sm text-gray-600 mt-1">
                    Lessenserie: <span className="font-semibold text-gray-800">{lessenserieTitel}</span>
                  </p>
                ) : (
                  <p className="text-sm text-gray-600 mt-1">Vul de gegevens in of laat AI helpen.</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => (hasFrom ? router.push(`/material-uploads/${from}`) : router.back())}
                className={btn.ghost}
              >
                Terug
              </button>
            </div>

            {hasFrom && (
              <div className="mb-6 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-900">
                <strong>Stap 1:</strong> upload een PDF of Word-document (.docx). AI vult titel, introductie, inhoud, slot,
                leerdoelen, tijdsduur en bronnen in. <strong>Stap 2:</strong> klik op &quot;AI check duplicatie&quot; voordat je opslaat.
              </div>
            )}

            <LesAiUploadPanel
              aiBezig={aiBezig}
              aiBestand={aiBestand}
              aiError={aiError}
              aiSucces={aiSucces}
              onFileChange={handleAiBestandChange}
            />

            {error && (
              <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800">
                {error}
              </div>
            )}

            <form ref={formRef} onSubmit={onSubmit} className="space-y-6">
              {/* Lessenserie */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Lessenserie</label>
                <select
                  value={lessenserieId}
                  onChange={(e) => setLessenserieId(e.target.value)}
                  disabled={hasFrom}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Nieuw lessenserie</option>
                  {lessenseries.map((ls) => (
                    <option key={ls.id ?? ls.titel} value={ls.id ?? ''}>
                      {ls.titel}
                    </option>
                  ))}
                </select>
                {!lessenserieId && !hasFrom && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Titel nieuwe lessenserie *</label>
                    <input
                      type="text"
                      value={nieuweLessenserieTitel}
                      onChange={(e) => setNieuweLessenserieTitel(e.target.value)}
                      placeholder="Bijv. Nederlands A1 - Basisgrammatica"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                )}
              </div>

              {/* Titel */}
              <div className={`bg-white rounded-xl border border-gray-200 p-6 ${aiSucces ? 'ai-highlight' : ''}`}>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">Titel</label>
                  {aiSucces && titel && <span className="text-xs text-green-600">✨ Door AI ingevuld</span>}
                </div>
                <input
                  value={titel}
                  onChange={(e) => setTitel(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Bijv. Samenvatten met signaalwoorden"
                />
              </div>

              {/* Leerdoelen */}
              <div className={`bg-white rounded-xl border border-gray-200 p-6 ${aiSucces ? 'ai-highlight' : ''}`}>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700">Leerdoelen</label>
                  {aiSucces && leerdoel.length > 0 && <span className="text-xs text-green-600">✨ Door AI ingevuld</span>}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {ALL_LEERDOELEN.map((ld) => (
                    <label
                      key={ld.value}
                      className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                    >
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
              <div className={`bg-white rounded-xl border border-gray-200 p-6 ${aiSucces ? 'ai-highlight' : ''}`}>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">Introductie</label>
                  {aiSucces && introductie && <span className="text-xs text-green-600">✨ Door AI ingevuld</span>}
                </div>
                <textarea
                  value={introductie}
                  onChange={(e) => setIntroductie(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Korte introductie van de les..."
                />
              </div>

              {/* Inhoud */}
              <div className={`bg-white rounded-xl border border-gray-200 p-6 ${aiSucces ? 'ai-highlight' : ''}`}>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">Inhoud</label>
                  {aiSucces && inhoud && <span className="text-xs text-green-600">✨ Door AI ingevuld</span>}
                </div>
                <textarea
                  value={inhoud}
                  onChange={(e) => setInhoud(e.target.value)}
                  rows={8}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="De volledige inhoud van de les..."
                />
              </div>

              {/* Slot */}
              <div className={`bg-white rounded-xl border border-gray-200 p-6 ${aiSucces ? 'ai-highlight' : ''}`}>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">Slot</label>
                  {aiSucces && slot && <span className="text-xs text-green-600">✨ Door AI ingevuld</span>}
                </div>
                <textarea
                  value={slot}
                  onChange={(e) => setSlot(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Afronding en reflectie..."
                />
              </div>

              {/* Literatuurlijst (bronnen) */}
              <div className={`bg-white rounded-xl border border-gray-200 p-6 ${aiSucces ? 'ai-highlight' : ''}`}>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">Literatuurlijst (bronnen)</label>
                  {aiSucces && aiLiteratuurlijst.length > 0 && <span className="text-xs text-green-600">✨ Door AI ingevuld</span>}
                </div>
                <textarea
                  value={aiLiteratuurlijst.join('\n')}
                  onChange={(e) => {
                    const next = e.target.value
                      .split('\n')
                      .map((s) => s.trim())
                      .filter((s) => s.length > 0);
                    setAiLiteratuurlijst(next);
                  }}
                  rows={4}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Elke bron op een nieuwe regel"
                />
                <p className="mt-2 text-xs text-gray-500">
                  Deze bronnen worden opgeslagen in de literatuurlijst van de lessenserie.
                </p>
              </div>

              {/* Tijdsduur */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Tijdsduur (minuten)</label>
                <input
                  type="number"
                  min={1}
                  value={duurMinuten}
                  onChange={(e) => setDuurMinuten(Number(e.target.value))}
                  className="w-40 rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* Bijlagen */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">Bijlagen</label>
                <p className="text-xs text-gray-500 mb-3">
                  Toegestaan: PDF, Word (.docx), PowerPoint (.pptx) — max 20 MB per bestand
                </p>

                {bijlageError && (
                  <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {bijlageError}
                  </div>
                )}

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

                {bijlagen.length > 0 && (
                  <ul className="mt-3 space-y-2">
                    {bijlagen.map((b, i) => (
                      <li
                        key={i}
                        className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
                      >
                        <div className="flex items-center gap-2 text-sm text-gray-700 truncate">
                          <span>{getFileIcon(b.naam)}</span>
                          <span className="truncate max-w-xs">{b.naam}</span>
                          <span className="text-gray-400 text-xs shrink-0">{formatBytes(b.file.size)}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeBijlage(i)}
                          className="text-red-500 hover:text-red-700 text-sm ml-3 shrink-0"
                        >
                          Verwijder
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Duplicaatcontrole (embedding) */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-sm font-semibold text-gray-800 mb-1">Duplicaatcontrole</h2>
                <p className="text-xs text-gray-500 mb-4">
                  Controleer of deze les inhoudelijk al bestaat (embedding-vergelijking), ook bij andere formulering.
                </p>
                <button
                  type="button"
                  onClick={() => handleDuplicaatCheck()}
                  disabled={duplicaatStatus === 'checking' || submitting}
                  className={`${btn.primary} disabled:opacity-60`}
                >
                  {duplicaatStatus === 'checking' ? 'Controleren…' : '✨ AI check duplicatie'}
                </button>

                {duplicaatStatus === 'geen' && (
                  <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
                    Geen duplicaten gevonden. Deze les lijkt uniek te zijn in het systeem.
                  </div>
                )}

                <LesDuplicaatWaarschuwing
                  matches={duplicaatStatus === 'gevonden' ? duplicaatMatches : []}
                  isChecking={duplicaatStatus === 'checking'}
                  checkError={duplicaatCheckError}
                  returnTo={returnToUrl}
                  huidigeLes={{
                    titel,
                    introductie,
                    inhoud,
                    slot,
                  }}
                  onDoorgaan={
                    duplicaatStatus === 'gevonden' ? () => setDuplicaatAcknowledged(true) : undefined
                  }
                />
              </div>

              {/* Submit */}
              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className={`${btn.primaryLg} disabled:opacity-60`}
                >
                  {submitting ? 'Opslaan…' : 'Opslaan'}
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}