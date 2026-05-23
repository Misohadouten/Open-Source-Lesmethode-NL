import { fetchLessenSeriesByStatus, LessenSerieDto } from '@/lib/lessenserieApi';

/** Concepten van andere docenten die op jouw beoordeling wachten. */
export async function fetchConceptenTerControle(docentId: string): Promise<LessenSerieDto[]> {
  if (!docentId) return [];
  const all = await fetchLessenSeriesByStatus('Concept');
  const ownId = docentId.toLowerCase();
  return all.filter((c) => (c.eigenaar?.id ?? '').toLowerCase() !== ownId);
}
