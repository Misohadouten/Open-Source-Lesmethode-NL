export type LessenSerieStatusKey =
  | 'Nieuw'
  | 'Concept'
  | 'Beschikbaar'
  | 'Afgewezen'
  | 'Verwijderd'
  | string;

const STATUS_BY_NUMBER: Record<number, LessenSerieStatusKey> = {
  0: 'Nieuw',
  1: 'Concept',
  2: 'Beschikbaar',
  3: 'Afgewezen',
  4: 'Verwijderd',
};

/** API kan status als string ("Nieuw") of getal (0) teruggeven. */
export function normalizeLessenSerieStatus(status?: string | number | null): string {
  if (status === null || status === undefined) return '';
  if (typeof status === 'number' && !Number.isNaN(status)) {
    return STATUS_BY_NUMBER[status] ?? String(status);
  }
  const raw = String(status).trim();
  if (/^\d+$/.test(raw)) {
    const num = Number(raw);
    return STATUS_BY_NUMBER[num] ?? raw;
  }
  return raw;
}

const STATUS_LABELS: Record<string, string> = {
  Nieuw: 'Nog niet ingediend',
  Concept: 'In beoordeling',
  Beschikbaar: 'Gepubliceerd',
  Afgewezen: 'Afgewezen',
  Verwijderd: 'Verwijderd',
};

const STATUS_HINTS: Record<string, string> = {
  Nieuw: 'Voeg lessen toe en dien in wanneer je klaar bent. Daarna verschijnt het bij Concepten.',
  Concept: 'Een beoordelaar bekijkt je serie. Je kunt deze nu niet meer bewerken.',
  Beschikbaar: 'Je serie staat in Materialen en is zichtbaar voor collega\'s.',
  Afgewezen: 'Pas je serie aan en dien opnieuw in.',
  Verwijderd: 'Deze serie is verwijderd.',
};

export function formatLessenSerieStatus(status?: string | null): string {
  const key = normalizeLessenSerieStatus(status);
  return STATUS_LABELS[key] ?? (key || '-');
}

export function getLessenSerieStatusHint(status?: string | null): string | null {
  const key = normalizeLessenSerieStatus(status);
  return STATUS_HINTS[key] ?? null;
}

export function canIndienenLessenSerie(status?: string | null): boolean {
  const key = normalizeLessenSerieStatus(status);
  return key === 'Nieuw' || key === 'Afgewezen';
}

export function canEditLessenSerie(status?: string | null): boolean {
  const key = normalizeLessenSerieStatus(status);
  return key === 'Nieuw' || key === 'Afgewezen';
}

export function statusBadgeClass(status?: string | null): string {
  const key = normalizeLessenSerieStatus(status);
  switch (key) {
    case 'Nieuw':
      return 'bg-gray-100 text-gray-800';
    case 'Concept':
      return 'bg-amber-100 text-amber-900';
    case 'Beschikbaar':
      return 'bg-green-100 text-green-800';
    case 'Afgewezen':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

export type LessenSerieFlowStep = 1 | 2 | 3 | 4;

export interface LessenSerieUiState {
  statusKey: string;
  label: string;
  hint: string | null;
  badgeClass: string;
  canEdit: boolean;
  canIndienen: boolean;
  indienenButtonLabel: string;
  showConceptenLink: boolean;
  showMaterialenLink: boolean;
  showAfwijzingFeedback: boolean;
  flowStep: LessenSerieFlowStep;
}

/** Eén plek voor status, hints, acties en voortgang in de upload-flow. */
export function getLessenSerieUiState(
  status?: string | number | null,
  options?: { lessonCount?: number }
): LessenSerieUiState {
  const statusKey = normalizeLessenSerieStatus(status);
  const lessonCount = options?.lessonCount ?? 0;
  const canEdit = canEditLessenSerie(status);
  const canIndienen = canIndienenLessenSerie(status);

  let flowStep: LessenSerieFlowStep = 1;
  if (statusKey === 'Concept' || statusKey === 'Beschikbaar') {
    flowStep = 4;
  } else if (canIndienen && lessonCount > 0) {
    flowStep = 3;
  } else if (lessonCount > 0) {
    flowStep = 2;
  }

  return {
    statusKey,
    label: formatLessenSerieStatus(status),
    hint: getLessenSerieStatusHint(status),
    badgeClass: statusBadgeClass(status),
    canEdit,
    canIndienen,
    indienenButtonLabel:
      statusKey === 'Afgewezen' ? 'Opnieuw indienen' : 'Indienen ter beoordeling',
    showConceptenLink: statusKey === 'Concept',
    showMaterialenLink: statusKey === 'Beschikbaar',
    showAfwijzingFeedback: statusKey === 'Afgewezen',
    flowStep,
  };
}
