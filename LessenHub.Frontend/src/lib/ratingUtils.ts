import type { BeoordelingDto } from '@/lib/lessenserieApi';
import { normalizeBeoordelingen } from '@/lib/normalizeLessenSerie';

export interface RatingSummary {
  gemiddelde: number | null;
  aantal: number;
  eigenRating: number | null;
}

export function getRatingSummary(
  beoordelingen: BeoordelingDto[] | null | undefined,
  docentId?: string | null
): RatingSummary {
  const list = normalizeBeoordelingen(beoordelingen ?? []);
  if (list.length === 0) {
    return { gemiddelde: null, aantal: 0, eigenRating: null };
  }

  const gemiddelde =
    Math.round((list.reduce((sum, b) => sum + b.rating, 0) / list.length) * 10) / 10;

  const eigen = docentId
    ? list.find((b) => b.eigenaar?.id === docentId)?.rating ?? null
    : null;

  return { gemiddelde, aantal: list.length, eigenRating: eigen };
}
