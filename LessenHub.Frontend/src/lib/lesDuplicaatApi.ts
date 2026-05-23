import type { LesDuplicaatMatch } from '@/components/LesDuplicaatWaarschuwing';

function backendBaseUrl() {
  return process.env.NEXT_PUBLIC_BACKEND_URL || 'https://localhost:7207';
}

type RawMatch = {
  lesId?: string;
  LesId?: string;
  titel?: string;
  Titel?: string;
  similarityScore?: number;
  SimilarityScore?: number;
  reden?: string;
  Reden?: string;
  lessenSerieId?: string | null;
  LessenSerieId?: string | null;
  lessenSerieTitel?: string | null;
  LessenSerieTitel?: string | null;
  introductie?: string;
  Introductie?: string;
  inhoud?: string;
  Inhoud?: string;
  slot?: string;
  Slot?: string;
};

function normalizeMatches(raw: RawMatch[]): LesDuplicaatMatch[] {
  return raw
    .map((m) => ({
      lesId: String(m.lesId ?? m.LesId ?? ''),
      titel: m.titel ?? m.Titel ?? 'Naamloze les',
      similarityScore: m.similarityScore ?? m.SimilarityScore ?? 0,
      reden: m.reden ?? m.Reden ?? '',
      lessenSerieId: m.lessenSerieId ?? m.LessenSerieId ?? null,
      lessenSerieTitel: m.lessenSerieTitel ?? m.LessenSerieTitel ?? null,
      introductie: m.introductie ?? m.Introductie ?? '',
      inhoud: m.inhoud ?? m.Inhoud ?? '',
      slot: m.slot ?? m.Slot ?? '',
    }))
    .filter((m) => m.lesId);
}

export async function controleerLesDuplicaat(input: {
  titel: string;
  introductie: string;
  inhoud: string;
  slot: string;
  excludeLesId?: string;
}): Promise<LesDuplicaatMatch[]> {
  const res = await fetch(`${backendBaseUrl()}/LesAnalyse/controleer-duplicaat`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      Titel: input.titel.trim(),
      Introductie: input.introductie.trim(),
      Inhoud: input.inhoud.trim(),
      Slot: input.slot.trim(),
      ExcludeLesId: input.excludeLesId ?? null,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Duplicaatcontrole mislukt (${res.status})`);
  }

  const data = (await res.json()) as { matches?: RawMatch[]; Matches?: RawMatch[] };
  return normalizeMatches(data.matches ?? data.Matches ?? []);
}
