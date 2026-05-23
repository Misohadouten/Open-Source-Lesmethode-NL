import type { BeoordelingDto, DocentDto, LessenSerieDto } from '@/lib/lessenserieApi';
import { normalizeLessenSerieStatus } from '@/lib/lessenSerieStatus';

function normalizeStringList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((x) => String(x)).filter(Boolean);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object') return value as Record<string, unknown>;
  return null;
}

function normalizeDocent(raw: unknown): DocentDto {
  const r = asRecord(raw) ?? {};
  return {
    id: String(r.id ?? r.Id ?? ''),
    naam: String(r.naam ?? r.Naam ?? 'Onbekend'),
    email: String(r.email ?? r.Email ?? ''),
  };
}

export function normalizeBeoordeling(raw: unknown): BeoordelingDto {
  const r = asRecord(raw) ?? {};
  return {
    rating: Number(r.rating ?? r.Rating ?? 0),
    commentaar: (r.commentaar ?? r.Commentaar ?? null) as string | null,
    eigenaar: normalizeDocent(r.eigenaar ?? r.Eigenaar),
  };
}

export function normalizeBeoordelingen(raw: unknown): BeoordelingDto[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(normalizeBeoordeling).filter((b) => b.rating >= 1 && b.rating <= 5);
}

export function normalizeLessenSerie(raw: unknown): LessenSerieDto {
  const r = asRecord(raw) ?? {};
  const beoordelingenRaw = r.beoordelingen ?? r.Beoordelingen;

  return {
    ...(r as unknown as LessenSerieDto),
    id: (r.id ?? r.Id) as string | null | undefined,
    titel: String(r.titel ?? r.Titel ?? ''),
    omschrijving: String(r.omschrijving ?? r.Omschrijving ?? ''),
    status: normalizeLessenSerieStatus((r.status ?? r.Status) as string | number | null | undefined) || undefined,
    schoolNiveau: (r.schoolNiveau ?? r.SchoolNiveau) as string | null | undefined,
    taalNiveau: (r.taalNiveau ?? r.TaalNiveau) as string | null | undefined,
    leerjaar: (r.leerjaar ?? r.Leerjaar) as string | null | undefined,
    leerjaren: normalizeStringList(r.leerjaren ?? r.Leerjaren),
    taalniveauMeijerink: (r.taalniveauMeijerink ?? r.TaalniveauMeijerink ?? null) as string | null,
    sloKerndoelen: normalizeStringList(r.sloKerndoelen ?? r.SloKerndoelen),
    overigeVakken: normalizeStringList(r.overigeVakken ?? r.OverigeVakken),
    eigenaar: normalizeDocent(r.eigenaar ?? r.Eigenaar),
    beoordelingen: normalizeBeoordelingen(beoordelingenRaw),
  };
}

export function normalizeLessenSerieList(raw: unknown): LessenSerieDto[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(normalizeLessenSerie);
}
