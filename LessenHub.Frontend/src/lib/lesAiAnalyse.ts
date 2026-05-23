import { LEERDOEL_TO_INT, type LeerdoelEnum } from '@/lib/lesFormConstants';

export interface AiAnalyseResultaat {
  lessenSerieTitel?: string;
  titel?: string;
  introductie?: string;
  inhoud?: string;
  slot?: string;
  leerdoelen?: number[];
  schoolNiveau?: number | null;
  taalNiveau?: number | null;
  leerjaar?: number | null;
  tijdsDuurMinuten?: number | null;
  literatuurlijst?: string[];
}

export interface AiAnalysePipelineDebug {
  documentTextLength?: number;
  documentTextPreview?: string;
  aiCallAttempted?: boolean;
  aiCallSucceeded?: boolean;
  aiRawResponsePreview?: string;
  validationResult?: string;
}

export interface AiAnalyseApiResponse {
  result?: AiAnalyseResultaat;
  debug?: AiAnalysePipelineDebug;
}

export interface AiAnalyseCompleteness {
  kernVelden: number;
  heeftLeerdoelen: boolean;
  heeftDuur: boolean;
  heeftIets: boolean;
  isVoldoende: boolean;
}

const LEERDOEL_NAME_TO_INT: Record<string, number> = Object.fromEntries(
  (Object.entries(LEERDOEL_TO_INT) as [LeerdoelEnum, number][]).map(([name, n]) => [
    name.replace(/\s+/g, '').toLowerCase(),
    n,
  ])
);

function coerceOptionalString(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return undefined;
}

function parseTijdsDuurMinuten(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }
  if (typeof value === 'string') {
    const match = value.match(/(\d{1,3})/);
    if (match) {
      const n = parseInt(match[1], 10);
      if (n > 0 && n <= 600) return n;
    }
  }
  return null;
}

function parseLeerdoelenArray(raw: unknown): number[] | undefined {
  if (!Array.isArray(raw)) return undefined;

  const nums: number[] = [];
  for (const item of raw) {
    if (typeof item === 'number' && Number.isInteger(item) && item >= 0 && item <= 9) {
      nums.push(item);
      continue;
    }
    if (typeof item !== 'string') continue;

    const token = item.trim();
    if (!token) continue;

    const asNum = parseInt(token, 10);
    if (!Number.isNaN(asNum) && asNum >= 0 && asNum <= 9) {
      nums.push(asNum);
      continue;
    }

    const key = token.replace(/[\s_-]+/g, '').toLowerCase();
    const mapped = LEERDOEL_NAME_TO_INT[key];
    if (mapped !== undefined) nums.push(mapped);
  }

  if (nums.length === 0) return undefined;
  return [...new Set(nums)].sort((a, b) => a - b);
}

const PLACEHOLDER_TITEL = 'Concept zonder titel';

function effectiveTitel(resultaat: AiAnalyseResultaat): string | undefined {
  const titel = resultaat.titel?.trim();
  if (titel && titel !== PLACEHOLDER_TITEL) return titel;
  const serie = resultaat.lessenSerieTitel?.trim();
  if (serie) return serie;
  return titel === PLACEHOLDER_TITEL ? undefined : titel;
}

export function listOntbrekendeAnalyseVelden(resultaat: AiAnalyseResultaat): string[] {
  const ontbrekend: string[] = [];
  if (!effectiveTitel(resultaat)) ontbrekend.push('titel');
  if (!resultaat.introductie?.trim()) ontbrekend.push('introductie');
  if (!resultaat.inhoud?.trim()) ontbrekend.push('inhoud');
  if (!resultaat.slot?.trim()) ontbrekend.push('slot');
  if ((resultaat.leerdoelen?.length ?? 0) === 0) ontbrekend.push('leerdoelen');
  if (!(typeof resultaat.tijdsDuurMinuten === 'number' && resultaat.tijdsDuurMinuten > 0)) {
    ontbrekend.push('tijdsduur');
  }
  return ontbrekend;
}

export function aiAnalyseCompleteness(resultaat: AiAnalyseResultaat): AiAnalyseCompleteness {
  const titel = effectiveTitel(resultaat);
  const titelOfSerie = Boolean(titel);
  const kernVelden = [
    titel,
    resultaat.introductie,
    resultaat.inhoud,
    resultaat.slot,
  ].filter((v) => v && v.trim().length > 0).length;
  const heeftLeerdoelen = (resultaat.leerdoelen?.length ?? 0) > 0;
  const heeftDuur =
    typeof resultaat.tijdsDuurMinuten === 'number' && resultaat.tijdsDuurMinuten > 0;
  const heeftTitelEnKern =
    titelOfSerie && Boolean(resultaat.introductie?.trim() || resultaat.inhoud?.trim() || resultaat.slot?.trim());
  const isBruikbaar =
    heeftTitelEnKern
    || kernVelden >= 2
    || (kernVelden >= 1 && (heeftLeerdoelen || heeftDuur))
    || (titelOfSerie && (heeftLeerdoelen || heeftDuur));
  const heeftIets =
    titelOfSerie
    || kernVelden > 0
    || heeftLeerdoelen
    || heeftDuur
    || isBruikbaar;
  const isVoldoende =
    Boolean(titel)
    && Boolean(resultaat.introductie?.trim())
    && Boolean(resultaat.inhoud?.trim())
    && Boolean(resultaat.slot?.trim());

  return { kernVelden, heeftLeerdoelen, heeftDuur, heeftIets, isVoldoende };
}

function unwrapAnalysePayload(raw: Record<string, unknown>): {
  payload: Record<string, unknown>;
  debug?: AiAnalysePipelineDebug;
} {
  const debugRaw = raw.debug;
  const debug =
    debugRaw && typeof debugRaw === 'object'
      ? (debugRaw as AiAnalysePipelineDebug)
      : undefined;

  if (raw.result && typeof raw.result === 'object') {
    return { payload: raw.result as Record<string, unknown>, debug };
  }

  return { payload: raw, debug };
}

/** Veilig API-antwoord parsen; crasht nooit bij ontbrekende of ongeldige velden. */
export function parseAnalyseResponseSafe(raw: unknown): AiAnalyseResultaat {
  try {
    const parsed = parseAnalyseApiResponse(raw);
    return parsed.resultaat;
  } catch {
    return emptyAiResultaat();
  }
}

export function parseAnalyseApiResponse(raw: unknown): {
  resultaat: AiAnalyseResultaat;
  debug?: AiAnalysePipelineDebug;
} {
  try {
    if (raw == null || typeof raw !== 'object') {
      return { resultaat: emptyAiResultaat() };
    }

    const { payload, debug } = unwrapAnalysePayload(raw as Record<string, unknown>);
    const normalized = normalizeAnalyseResponse(payload);
    const withFallbacks = applyAnalyseFallbacks(normalized, payload);
    return { resultaat: sanitizeAiResultaat(withFallbacks), debug };
  } catch {
    return { resultaat: emptyAiResultaat() };
  }
}

export function applyAnalyseFallbacks(
  resultaat: AiAnalyseResultaat,
  rawPayload?: Record<string, unknown>
): AiAnalyseResultaat {
  const title =
    resultaat.titel?.trim()
    || coerceOptionalString(rawPayload?.title ?? rawPayload?.Title)
    || coerceOptionalString(rawPayload?.titel ?? rawPayload?.Titel)
    || resultaat.lessenSerieTitel?.trim()
    || undefined;

  const introductie =
    resultaat.introductie?.trim()
    || coerceOptionalString(
      rawPayload?.introduction
        ?? rawPayload?.Introduction
        ?? rawPayload?.intro
        ?? rawPayload?.introductie
        ?? rawPayload?.Introductie
    )
    || coerceOptionalString(rawPayload?.description ?? rawPayload?.Description)
    || '';

  const inhoud =
    resultaat.inhoud?.trim()
    || coerceOptionalString(
      rawPayload?.content ?? rawPayload?.Content ?? rawPayload?.inhoud ?? rawPayload?.Inhoud
    )
    || '';

  const slot =
    resultaat.slot?.trim()
    || coerceOptionalString(
      rawPayload?.closing ?? rawPayload?.Closing ?? rawPayload?.slot ?? rawPayload?.Slot
    )
    || '';

  const lessenSerie =
    resultaat.lessenSerieTitel?.trim()
    || coerceOptionalString(rawPayload?.lessenSerieTitel ?? rawPayload?.LessenSerieTitel)
    || title;

  return {
    ...resultaat,
    titel: title ?? resultaat.titel,
    lessenSerieTitel: lessenSerie,
    introductie: introductie || undefined,
    inhoud: inhoud || undefined,
    slot: slot || undefined,
    leerdoelen: resultaat.leerdoelen ?? [],
    literatuurlijst: resultaat.literatuurlijst ?? [],
  };
}

export function emptyAiResultaat(): AiAnalyseResultaat {
  return {
    lessenSerieTitel: undefined,
    titel: undefined,
    introductie: undefined,
    inhoud: undefined,
    slot: undefined,
    leerdoelen: [],
    tijdsDuurMinuten: null,
    literatuurlijst: [],
  };
}

export function sanitizeAiResultaatSafe(resultaat: AiAnalyseResultaat): AiAnalyseResultaat {
  try {
    return sanitizeAiResultaat(resultaat);
  } catch {
    return resultaat;
  }
}

export function getFileIcon(naam: string): string {
  if (naam.endsWith('.pdf')) return '📄';
  if (naam.endsWith('.docx')) return '📝';
  if (naam.endsWith('.pptx')) return '📊';
  return '📎';
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function minutesToTimespan(minutes: number): string {
  const safeMinutes = Number.isFinite(minutes) ? Math.max(0, Math.floor(minutes)) : 0;
  const hours = Math.floor(safeMinutes / 60);
  const mins = safeMinutes % 60;
  const hh = String(hours).padStart(2, '0');
  const mm = String(mins).padStart(2, '0');
  return `${hh}:${mm}:00`;
}

function normalizeAiText(value: string): string {
  return value
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .trim();
}

function cleanAiTitle(value?: string): string | undefined {
  if (!value) return undefined;
  const cleaned = normalizeAiText(value)
    .replace(/^leerdoelen(?=[A-Z])/i, '')
    .replace(/^\s*(?:leerdoelen|titel(?:\s+van\s+de\s+les)?|van\s+de\s+les|onderwerp|lestitel)\s*[:\-\.]?\s*/i, '')
    .replace(/^[-:]+/, '')
    .trim();

  if (!cleaned) return undefined;
  if (cleaned.length <= 90) return cleaned;

  const cut = cleaned.slice(0, 90);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > 35 ? cut.slice(0, lastSpace) : cut).trim();
}

function removeHeadingPrefix(value: string, headings: string[]): string {
  const escaped = headings.map((h) => h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const regex = new RegExp(`^\\s*(?:\\d+[).\\-]\\s*)?(?:${escaped})\\s*[:\\-]?\\s*`, 'i');
  return value.replace(regex, '').trim();
}

export function normalizeAnalyseResponse(raw: Record<string, unknown>): AiAnalyseResultaat {
  const payload =
    raw && typeof raw === 'object' && 'data' in raw && typeof raw.data === 'object' && raw.data !== null
      ? (raw.data as Record<string, unknown>)
      : raw;

  const leerdoelenRaw =
    payload.leerdoelen
    ?? payload.Leerdoelen
    ?? payload.learningGoals
    ?? payload.LearningGoals
    ?? payload.leerdoel;
  const leerdoelen = parseLeerdoelenArray(leerdoelenRaw);

  const litRaw = payload.literatuurlijst ?? payload.Literatuurlijst;
  const literatuurlijst = Array.isArray(litRaw)
    ? litRaw
        .map((s) => (typeof s === 'string' ? s.trim() : ''))
        .filter((s) => s.length > 0)
    : undefined;

  const tijdsRaw =
    payload.tijdsDuurMinuten
    ?? payload.TijdsDuurMinuten
    ?? payload.duration
    ?? payload.Duration;

  const title = coerceOptionalString(
    payload.title ?? payload.Title ?? payload.titel ?? payload.Titel
  );
  const description = coerceOptionalString(
    payload.description ?? payload.Description ?? payload.omschrijving ?? payload.Omschrijving
  );
  const introduction = coerceOptionalString(
    payload.introduction
      ?? payload.Introduction
      ?? payload.intro
      ?? payload.introductie
      ?? payload.Introductie
  );
  const content = coerceOptionalString(
    payload.content ?? payload.Content ?? payload.inhoud ?? payload.Inhoud
  );
  const closing = coerceOptionalString(
    payload.closing ?? payload.Closing ?? payload.slot ?? payload.Slot ?? payload.afsluiting
  );

  const introductie =
    introduction && description
      ? `${description.trim()}\n\n${introduction.trim()}`
      : introduction ?? description;

  return {
    lessenSerieTitel: coerceOptionalString(
      payload.lessenSerieTitel ?? payload.LessenSerieTitel ?? payload.lessenserie ?? title
    ),
    titel: title,
    introductie,
    inhoud: content,
    slot: closing,
    leerdoelen,
    tijdsDuurMinuten: parseTijdsDuurMinuten(tijdsRaw),
    literatuurlijst,
  };
}

export function sanitizeAiResultaat(resultaat: AiAnalyseResultaat): AiAnalyseResultaat {
  const safe: AiAnalyseResultaat = {
    ...resultaat,
    leerdoelen: Array.isArray(resultaat.leerdoelen) ? resultaat.leerdoelen : [],
    literatuurlijst: Array.isArray(resultaat.literatuurlijst) ? resultaat.literatuurlijst : [],
  };
  const introHeadings = ['introductie', 'inleiding', 'start'];
  const inhoudHeadings = ['inhoud', 'kern', 'lesopzet', 'uitwerking'];
  const slotHeadings = ['slot', 'afsluiting', 'reflectie', 'evaluatie'];

  const intro = safe.introductie
    ? removeHeadingPrefix(normalizeAiText(safe.introductie), introHeadings)
    : undefined;
  const inhoud = safe.inhoud
    ? removeHeadingPrefix(normalizeAiText(safe.inhoud), inhoudHeadings)
    : undefined;
  const slot = safe.slot
    ? removeHeadingPrefix(normalizeAiText(safe.slot), slotHeadings)
    : undefined;

  const literatuurlijst = safe.literatuurlijst
    .filter((s): s is string => typeof s === 'string')
    .map((s) => normalizeAiText(s))
    .filter((s) => s.length > 0);

  return {
    ...safe,
    titel: cleanAiTitle(safe.titel),
    introductie: intro,
    inhoud,
    slot,
    literatuurlijst: Array.from(new Set(literatuurlijst)),
  };
}
