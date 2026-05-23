import { normalizeLessenSerie, normalizeLessenSerieList } from '@/lib/normalizeLessenSerie';

export type LeerdoelEnumNumber = number;

export interface DocentDto {
  id: string;
  naam: string;
  email: string;
}

export interface LesDto {
  id: string;
  titel: string;
  leerdoel: LeerdoelEnumNumber[];
  introductie: string;
  inhoud: string;
  slot: string;
  tijdsDuur: string;
}

export interface BeoordelingDto {
  rating: number;
  commentaar?: string | null;
  eigenaar: DocentDto;
}

export interface LessenSerieDto {
  id?: string | null;
  titel: string;
  omschrijving: string;
  leerdoelen: LeerdoelEnumNumber[];
  schoolNiveau?: string | null;
  taalNiveau?: string | null;
  leerjaar?: string | null;
  leerjaren?: string[] | null;
  taalniveauMeijerink?: string | null;
  sloKerndoelen?: string[] | null;
  overigeVakken?: string[] | null;
  vaardigheden?: string[] | null;
  aantalLessen?: number;
  tijdsDuur?: string;
  status?: string | null;
  literatuurlijst?: string[] | null;
  eigenaar: DocentDto;
  lessen?: LesDto[];
  beoordelingen?: BeoordelingDto[] | null;
}

function backendBaseUrl() {
  return process.env.NEXT_PUBLIC_BACKEND_URL || 'https://localhost:7207';
}

async function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch (err) {
    const hint =
      'Kan de backend niet bereiken op ' +
      backendBaseUrl() +
      '. Controleer of de API draait (dotnet run in LessenHub.Backend). ' +
      'Bij HTTPS-fouten: voer "dotnet dev-certs https --trust" uit en herstart de browser. ' +
      'Zonder MongoDB: zet UseInMemoryDatabase op true in appsettings.Development.json.';
    if (err instanceof TypeError) {
      throw new Error(hint);
    }
    throw err;
  }
}

export async function fetchAllAvailableLessenSeries(status: string): Promise<LessenSerieDto[]> {
  const res = await fetch(`${backendBaseUrl()}/LessenSerie/status/${encodeURIComponent(status)}`, {
    credentials: 'include',
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => '');
    throw new Error(`Failed to fetch available LessenSeries (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  return normalizeLessenSerieList(data);
}

export async function fetchLessenSeriesByStatus(status: string): Promise<LessenSerieDto[]> {
  const res = await fetch(`${backendBaseUrl()}/LessenSerie/status/${encodeURIComponent(status)}`, {
    credentials: 'include',
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => '');
    throw new Error(`Failed to fetch LessenSeries with status ${status} (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  return normalizeLessenSerieList(data);
}

export async function fetchLessenSeries(docentId: string): Promise<LessenSerieDto[]> {
  const res = await fetch(`${backendBaseUrl()}/LessenSerie?docentId=${encodeURIComponent(docentId)}`, {
    credentials: 'include',
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => '');
    throw new Error(`Failed to fetch LessenSeries (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  return normalizeLessenSerieList(data);
}

export async function fetchLessenSerieById(id?: string): Promise<LessenSerieDto> {
  if (!id || id === 'undefined') {
    throw new Error('Ongeldig lessenserie-id.');
  }
  const res = await fetch(`${backendBaseUrl()}/LessenSerie/${encodeURIComponent(id)}`, {
    credentials: 'include',
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch LessenSerie (${res.status})`);
  }

  const data = await res.json();
  return normalizeLessenSerie(data);
}

export async function LessenSerieIndienen(id?: string): Promise<LessenSerieDto> {
    if (!id || id === 'undefined') {
        throw new Error('Ongeldig lessenserie.');
    }
    const res = await fetch(`${backendBaseUrl()}/LessenSerie/Indienen/${encodeURIComponent(id)}`, {
        credentials: 'include',
    });

    if (!res.ok) {
        throw new Error(`Failed to fetch LessenSerie (${res.status})`);
    }

    const data = await res.json();
    return normalizeLessenSerie(data);
}

export async function createLessenSerie(payload: Record<string, unknown>): Promise<LessenSerieDto> {
  const res = await apiFetch(`${backendBaseUrl()}/LessenSerie`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to create LessenSerie (${res.status}): ${text}`);
  }

  const data = await res.json();
  return normalizeLessenSerie(data);
}

export async function updateLessenSerie(id: string, payload: Record<string, unknown>): Promise<LessenSerieDto> {
  const res = await fetch(`${backendBaseUrl()}/LessenSerie/${encodeURIComponent(id)}`, {
    method: 'PUT',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to update LessenSerie (${res.status}): ${text}`);
  }

  const data = await res.json();
  return normalizeLessenSerie(data);
}

function parseApiError(text: string, status: number, fallback: string): string {
  if (text.trim()) return text.trim();
  if (status === 405 || status === 404) {
    return `${fallback} (HTTP ${status}). Herstart de backend (dotnet run in LessenHub.Backend) zodat de nieuwste API actief is.`;
  }
  return `${fallback} (HTTP ${status})`;
}

export async function afwijzenLessenSerieMetBeoordeling(
  id: string,
  rating: number,
  commentaar: string
): Promise<LessenSerieDto> {
  const res = await apiFetch(`${backendBaseUrl()}/LessenSerie/afwijzen/${encodeURIComponent(id)}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rating, commentaar }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(parseApiError(text, res.status, 'Afwijzen mislukt'));
  }

  const data = await res.json();
  return normalizeLessenSerie(data);
}

export async function goedkeurLessenSerieMetBeoordeling(
  id: string,
  rating: number,
  commentaar?: string
): Promise<LessenSerieDto> {
  const res = await apiFetch(`${backendBaseUrl()}/LessenSerie/goedkeuren/${encodeURIComponent(id)}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rating, commentaar: commentaar || null }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(parseApiError(text, res.status, 'Goedkeuren mislukt'));
  }

  const data = await res.json();
  return normalizeLessenSerie(data);
}

export async function submitLessenSerieBeoordeling(
  id: string,
  rating: number,
  commentaar?: string
): Promise<LessenSerieDto> {
  const res = await apiFetch(`${backendBaseUrl()}/LessenSerie/beoordeling/${encodeURIComponent(id)}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rating, commentaar: commentaar || null }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(parseApiError(text, res.status, 'Beoordeling opslaan mislukt'));
  }

  const data = await res.json();
  return normalizeLessenSerie(data);
}

export async function deleteLessenSerie(id: string): Promise<void> {
  const res = await fetch(`${backendBaseUrl()}/LessenSerie/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    credentials: 'include',
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to delete LessenSerie (${res.status}): ${text}`);
  }
}

export async function downloadLessenSeriePdf(id: string): Promise<void> {
  const requestUrl = `${backendBaseUrl()}/LessenSerie/download/${encodeURIComponent(id)}`;
  const res = await fetch(requestUrl, {
    credentials: 'include',
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => '');
    if (res.status === 404 && !errorText) {
      throw new Error(`Backendroute voor lessenserie-PDF is niet bereikbaar op ${requestUrl}. Start de backend opnieuw zodat de nieuwste route geladen wordt.`);
    }

    throw new Error(`Failed to download LessenSerie PDF (${res.status}) from ${requestUrl}: ${errorText || 'no response body'}`);
  }

  const blob = await res.blob();
  const blobUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = `lessenserie_${id}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(blobUrl);
}

export async function downloadLesPdf(seriesId: string, lessonId: string): Promise<void> {
  const requestUrl = `${backendBaseUrl()}/LessenSerie/${encodeURIComponent(seriesId)}/download/${encodeURIComponent(lessonId)}`;
  const res = await fetch(requestUrl, {
    credentials: 'include',
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => '');
    if (res.status === 404 && !errorText) {
      throw new Error(`Backendroute voor les-PDF is niet bereikbaar op ${requestUrl}. Start de backend opnieuw zodat de nieuwste route geladen wordt.`);
    }

    throw new Error(`Failed to download Les PDF (${res.status}) from ${requestUrl}: ${errorText || 'no response body'}`);
  }

  const blob = await res.blob();
  const blobUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = `les_${lessonId}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(blobUrl);
}
