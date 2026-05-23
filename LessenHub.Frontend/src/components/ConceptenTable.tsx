'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Search,
  Download,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  MessageSquare,
} from 'lucide-react';
import Link from 'next/link';
import {
  fetchLessenSeriesByStatus,
  fetchLessenSerieById,
  LessenSerieDto,
  downloadLessenSeriePdf,
  goedkeurLessenSerieMetBeoordeling,
  afwijzenLessenSerieMetBeoordeling,
} from '@/lib/lessenserieApi';
import { formatLeerjaar, formatSchoolNiveau, formatTaalNiveau } from '@/lib/niveauLabels';
import { useAuth } from '@/hooks/useAuth';
import ConceptBeoordelingModal, { type ConceptBeoordelingActie } from './ConceptBeoordelingModal';
import { btn, inputClass } from '@/lib/buttonStyles';
import { buildLesViewHref } from '@/lib/navigationReturn';
import BeoordelingenOverzicht, { getLaatsteToelichting } from '@/components/BeoordelingenOverzicht';

type WachtrijTab = 'controle' | 'eigen';

const ConceptenTable: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const docentId = user?.docentId ?? '';

  const [activeTab, setActiveTab] = useState<WachtrijTab>('controle');
  const [searchQuery, setSearchQuery] = useState('');
  const [concepten, setConcepten] = useState<LessenSerieDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedDetail, setExpandedDetail] = useState<LessenSerieDto | null>(null);
  const [expandLoading, setExpandLoading] = useState(false);
  const [beoordelingTarget, setBeoordelingTarget] = useState<{
    item: LessenSerieDto;
    actie: ConceptBeoordelingActie;
  } | null>(null);

  const loadConcepten = async () => {
    try {
      setIsLoading(true);
      const data = await fetchLessenSeriesByStatus('Concept');
      setConcepten(data);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Kon wachtrij niet laden.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadConcepten();
    }
  }, [isAuthenticated]);

  const { terControle, doorMij } = useMemo(() => {
    const ownId = docentId.toLowerCase();
    const isEigen = (c: LessenSerieDto) =>
      !!ownId && (c.eigenaar?.id ?? '').toLowerCase() === ownId;
    const eigen = concepten.filter(isEigen);
    const controle = concepten.filter((c) => !isEigen(c));
    return { terControle: controle, doorMij: eigen };
  }, [concepten, docentId]);

  const filterBySearch = (items: LessenSerieDto[]) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.titel.toLowerCase().includes(q) ||
        item.omschrijving.toLowerCase().includes(q) ||
        item.eigenaar?.naam?.toLowerCase().includes(q)
    );
  };

  const visibleItems = filterBySearch(activeTab === 'controle' ? terControle : doorMij);

  const toggleExpand = async (item: LessenSerieDto) => {
    const id = item.id;
    if (!id) return;

    if (expandedId === id) {
      setExpandedId(null);
      setExpandedDetail(null);
      return;
    }

    setExpandedId(id);
    if ((item.lessen?.length ?? 0) > 0) {
      setExpandedDetail(item);
      return;
    }

    setExpandLoading(true);
    try {
      const detail = await fetchLessenSerieById(id);
      setExpandedDetail(detail);
    } catch {
      setExpandedDetail(item);
    } finally {
      setExpandLoading(false);
    }
  };

  const onDownload = async (id?: string | null) => {
    if (!id) return;
    try {
      await downloadLessenSeriePdf(id);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Downloaden mislukt.';
      setError(message);
    }
  };

  const onBeoordelingConfirm = async (
    item: LessenSerieDto,
    actie: ConceptBeoordelingActie,
    rating: number,
    commentaar: string
  ) => {
    if (!item.id) return;
    try {
      if (actie === 'goedkeuren') {
        await goedkeurLessenSerieMetBeoordeling(item.id, rating, commentaar || undefined);
      } else {
        await afwijzenLessenSerieMetBeoordeling(item.id, rating, commentaar);
      }
      setConcepten((prev) => prev.filter((c) => c.id !== item.id));
      setBeoordelingTarget(null);
      if (expandedId === item.id) {
        setExpandedId(null);
        setExpandedDetail(null);
      }
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : actie === 'goedkeuren' ? 'Goedkeuren mislukt.' : 'Afwijzen mislukt.';
      setError(message);
      throw e;
    }
  };

  const isControleTab = activeTab === 'controle';

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-600">
        Wachtrij met ingediende lessenseries. Beoordeel materiaal van collega&apos;s onder{' '}
        <strong>Ter controle</strong>. Onder <strong>Door mij ingediend</strong> volg je je eigen
        inzendingen die op goedkeuring wachten.
      </p>

      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-1">
        <button
          type="button"
          onClick={() => setActiveTab('controle')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 -mb-px transition-colors ${
            isControleTab
              ? 'border-[#E4AE7E] text-[#E4AE7E]'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Ter controle
          {terControle.length > 0 && (
            <span className="ml-2 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 text-xs font-semibold rounded-full bg-[#E4AE7E] text-white">
              {terControle.length}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('eigen')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 -mb-px transition-colors ${
            !isControleTab
              ? 'border-[#E4AE7E] text-[#E4AE7E]'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Door mij ingediend
          {doorMij.length > 0 && (
            <span className="ml-2 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 text-xs font-semibold rounded-full bg-gray-200 text-gray-700">
              {doorMij.length}
            </span>
          )}
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Zoek in deze wachtrij..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={`${inputClass} pl-10`}
        />
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg text-sm">{error}</div>
      )}

      {isLoading && <div className="py-12 text-center text-gray-500">Wachtrij laden...</div>}

      {!isLoading && !error && visibleItems.length === 0 && (
        <div className="py-10 px-6 rounded-xl border border-dashed border-gray-200 bg-gray-50 max-w-2xl">
          <Clock className="w-10 h-10 text-gray-300 mb-3" />
          <p className="text-gray-800 font-medium">
            {isControleTab ? 'Geen concepten ter controle' : 'Je hebt geen concepten in de wachtrij'}
          </p>
          {isControleTab ? (
            <div className="text-sm text-gray-600 mt-3 space-y-2 text-left">
              <p>
                <strong>Ter controle</strong> toont alleen series van <em>andere</em> docenten. Je eigen
                inzendingen staan onder <strong>Door mij ingediend</strong> — die kun je zelf niet goedkeuren.
              </p>
              <p>Om goedkeuren/afkeuren te testen:</p>
              <ol className="list-decimal list-inside space-y-1 text-gray-700">
                <li>Herstart de backend (development) — er wordt dan een <strong>demo-concept</strong> van Jane Smith aangemaakt.</li>
                <li>Of: laat een collega inloggen, indienen, en beoordeel jij hun serie hier.</li>
              </ol>
              {terControle.length === 0 && doorMij.length > 0 && (
                <p className="text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3 mt-3">
                  Je hebt {doorMij.length} eigen concept(en) wachten op een collega. Schakel naar het tabblad{' '}
                  <button
                    type="button"
                    className="font-semibold underline"
                    onClick={() => setActiveTab('eigen')}
                  >
                    Door mij ingediend
                  </button>
                  .
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500 mt-2 text-left">
              Dien een lessenserie in via <strong>Mijn uploads</strong> → serie openen →{' '}
              <strong>Indienen ter beoordeling</strong>.
            </p>
          )}
        </div>
      )}

      {!isLoading && visibleItems.length > 0 && (
        <div className="space-y-3">
          {visibleItems.map((item) => {
            const isExpanded = expandedId === item.id;
            const detail = isExpanded && expandedDetail?.id === item.id ? expandedDetail : item;
            const lessen = detail.lessen ?? item.lessen ?? [];
            const aantal =
              item.aantalLessen && item.aantalLessen > 0 ? item.aantalLessen : (lessen.length || 0);
            const eerdereOpmerking = getLaatsteToelichting(item.beoordelingen);

            return (
              <article
                key={item.id}
                className="border border-gray-200 rounded-xl bg-white overflow-hidden shadow-sm"
              >
                <div className="p-4 flex flex-wrap items-start gap-4 justify-between">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => toggleExpand(item)}
                      className="mt-1 p-1 rounded hover:bg-gray-100 text-gray-500 shrink-0"
                      aria-expanded={isExpanded}
                      aria-label={isExpanded ? 'Lessen verbergen' : 'Lessen tonen'}
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5" />
                      ) : (
                        <ChevronRight className="w-5 h-5" />
                      )}
                    </button>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-900">{item.titel}</h3>
                      <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">{item.omschrijving}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-500">
                        {isControleTab && (
                          <span>
                            <span className="text-gray-400">Docent:</span> {item.eigenaar?.naam ?? '-'}
                          </span>
                        )}
                        <span>
                          <span className="text-gray-400">Onderwijsniveau:</span>{' '}
                          {formatSchoolNiveau(item.schoolNiveau)}
                        </span>
                        <span>
                          <span className="text-gray-400">Taalniveau:</span>{' '}
                          {formatTaalNiveau(item.taalNiveau)}
                        </span>
                        <span>
                          <span className="text-gray-400">Leerjaar:</span>{' '}
                          {formatLeerjaar(item.leerjaar)}
                        </span>
                        <span>
                          <span className="text-gray-400">Lessen:</span> {aantal}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 shrink-0">
                    <button type="button" onClick={() => toggleExpand(item)} className={btn.secondary}>
                      Inzage
                    </button>
                    <button
                      type="button"
                      onClick={() => onDownload(item.id)}
                      className={btn.icon}
                      title="Download serie"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    {isControleTab && (
                      <>
                        <button
                          type="button"
                          onClick={() => setBeoordelingTarget({ item, actie: 'goedkeuren' })}
                          className={btn.approve}
                        >
                          <CheckCircle className="w-4 h-4" />
                          Goedkeuren
                        </button>
                        <button
                          type="button"
                          onClick={() => setBeoordelingTarget({ item, actie: 'afwijzen' })}
                          className={btn.reject}
                        >
                          <XCircle className="w-4 h-4" />
                          Afkeuren
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-4 pb-4 pt-0 border-t border-gray-100 bg-gray-50/80">
                    {expandLoading && expandedId === item.id && !expandedDetail?.lessen?.length ? (
                      <p className="text-sm text-gray-500 py-3">Lessen laden...</p>
                    ) : (
                      <>
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mt-4 mb-2">
                          Lessen in deze serie
                        </h4>
                        {lessen.length === 0 ? (
                          <p className="text-sm text-gray-500">Nog geen lessen gekoppeld.</p>
                        ) : (
                          <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white overflow-hidden">
                            {lessen.map((les) => (
                              <li
                                key={les.id}
                                className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
                              >
                                <span className="font-medium text-gray-900">{les.titel}</span>
                                <Link
                                  href={buildLesViewHref(String(les.id), '/concepten')}
                                  className="text-[#E4AE7E] hover:underline font-medium whitespace-nowrap"
                                >
                                  Les bekijken
                                </Link>
                              </li>
                            ))}
                          </ul>
                        )}

                        {(eerdereOpmerking || !isControleTab) && (
                          <div className="mt-4">
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-1.5">
                              <MessageSquare className="w-3.5 h-3.5" />
                              Opmerkingen
                            </h4>
                            {!isControleTab && !eerdereOpmerking && (
                              <p className="text-sm text-gray-500 rounded-lg border border-gray-200 bg-white p-3">
                                Je inzending wacht op beoordeling. Zodra een collega heeft
                                beoordeeld, zie je de toelichting bij Mijn uploads (bij afwijzing)
                                of in Materialen (bij goedkeuring).
                              </p>
                            )}
                            {eerdereOpmerking && (
                              <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-3">
                                <p className="text-xs font-medium text-amber-900 mb-2">
                                  {isControleTab
                                    ? 'Eerdere opmerking (serie opnieuw ingediend)'
                                    : 'Eerdere opmerking bij afwijzing'}
                                </p>
                                <BeoordelingenOverzicht beoordelingen={item.beoordelingen} compact />
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {beoordelingTarget && (
        <ConceptBeoordelingModal
          item={beoordelingTarget.item}
          actie={beoordelingTarget.actie}
          onClose={() => setBeoordelingTarget(null)}
          onConfirm={(rating, commentaar) =>
            onBeoordelingConfirm(beoordelingTarget.item, beoordelingTarget.actie, rating, commentaar)
          }
        />
      )}
    </div>
  );
};

export default ConceptenTable;
