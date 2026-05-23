'use client';

import React, { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import {
  fetchLessenSeries,
  fetchAllAvailableLessenSeries,
  LessenSerieDto,
} from '@/lib/lessenserieApi';
import { FileText, Clock, ArrowRight, BookMarked, User, Plus } from 'lucide-react';
import { btn, pageTitle } from '@/lib/buttonStyles';
import { normalizeLessenSerieStatus } from '@/lib/lessenSerieStatus';
import { fetchConceptenTerControle } from '@/lib/conceptWachtrij';

const cardClass =
  'bg-white/95 rounded-xl border border-[#E4AE7E]/20 shadow-sm shadow-[#E4AE7E]/5';

const DashboardPage: React.FC = () => {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const [mySeries, setMySeries] = useState<LessenSerieDto[]>([]);
  const [platformSeries, setPlatformSeries] = useState<LessenSerieDto[]>([]);
  const [teBeoordelen, setTeBeoordelen] = useState(0);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.docentId) return;

    const loadDashboardData = async () => {
      try {
        setIsLoadingData(true);
        setError(null);
        const docentId = user.docentId as string;
        const [myLessen, allAvailable, wachtrij] = await Promise.all([
          fetchLessenSeries(docentId),
          fetchAllAvailableLessenSeries('Beschikbaar'),
          fetchConceptenTerControle(docentId),
        ]);

        setMySeries(myLessen || []);
        setPlatformSeries((allAvailable || []).slice().reverse().slice(0, 5));
        setTeBeoordelen(wachtrij.length);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Er is een fout opgetreden bij het ophalen van de data.';
        setError(message);
      } finally {
        setIsLoadingData(false);
      }
    };

    loadDashboardData();
  }, [user?.docentId]);

  if (!authLoading && !isAuthenticated) return null;

  const firstName = user?.name?.split(' ')[0] || 'Docent';
  const myInBeoordeling = mySeries.filter((s) => normalizeLessenSerieStatus(s.status) === 'Concept');
  const myBeschikbaar = mySeries.filter((s) => normalizeLessenSerieStatus(s.status) === 'Beschikbaar');
  const werkAan = mySeries
    .filter((s) => {
      const key = normalizeLessenSerieStatus(s.status);
      return key === 'Nieuw' || key === 'Afgewezen';
    })
    .slice()
    .reverse()
    .slice(0, 4);

  const statCards = [
    {
      label: 'Te beoordelen',
      value: teBeoordelen,
      icon: Clock,
      iconWrap: 'bg-amber-100 text-amber-700 ring-1 ring-amber-200/80',
      href: teBeoordelen > 0 ? '/concepten' : undefined,
    },
    {
      label: 'Live materiaal',
      value: myBeschikbaar.length,
      icon: BookMarked,
      iconWrap: 'bg-[#EEF4F0] text-[#4A7A5C] ring-1 ring-[#9BB5A4]/50',
      href: '/materialen',
    },
    {
      label: 'In beoordeling',
      value: myInBeoordeling.length,
      icon: FileText,
      iconWrap: 'bg-[#F5EBE0] text-[#9A7350] ring-1 ring-[#E4AE7E]/30',
      href: '/material-uploads',
    },
  ];

  return (
    <div className="flex min-h-screen bg-[#FBF7F2]">
      <Sidebar activeItem="Dashboard" />

      <div className="flex-1 ml-64 lh-dashboard-bg min-h-screen">
        <Header />

        <main className="p-8 max-w-7xl mx-auto">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
            <h1 className={pageTitle}>
              Welkom terug, {authLoading ? '...' : firstName}
            </h1>
            <Link href="/material-uploads/new" className={btn.primaryLg}>
              <Plus className="w-4 h-4" />
              Nieuw materiaal
            </Link>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-lg border border-red-200 bg-red-50 text-red-800 flex justify-between items-center gap-4">
              <p className="text-sm font-medium">{error}</p>
              <button type="button" onClick={() => setError(null)} className={btn.ghost}>
                Sluiten
              </button>
            </div>
          )}

          {authLoading || isLoadingData ? (
            <div className="animate-pulse space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-24 rounded-xl bg-white/50" />
                ))}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="h-72 rounded-xl bg-white/50" />
                <div className="h-72 rounded-xl bg-white/50" />
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {statCards.map((card) => {
                  const inner = (
                    <>
                      <div>
                        <p className="text-sm font-medium text-gray-600">{card.label}</p>
                        <p className="text-3xl font-bold text-gray-900 mt-1 tabular-nums">
                          {card.value}
                        </p>
                      </div>
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center ${card.iconWrap}`}
                      >
                        <card.icon className="w-6 h-6" strokeWidth={2} />
                      </div>
                    </>
                  );

                  const className = `${cardClass} p-5 flex items-center justify-between transition-all ${
                    card.href ? 'hover:shadow-md hover:border-[#E4AE7E]/40 hover:-translate-y-0.5' : ''
                  }`;

                  return card.href ? (
                    <Link key={card.label} href={card.href} className={className}>
                      {inner}
                    </Link>
                  ) : (
                    <div key={card.label} className={className}>
                      {inner}
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <section className={`${cardClass} overflow-hidden flex flex-col`}>
                  <div className="px-5 py-4 border-b border-[#E4AE7E]/15 flex justify-between items-center bg-[#F5EBE0]/40">
                    <h2 className="text-base font-semibold text-gray-900">Verder werken aan</h2>
                    <Link
                      href="/material-uploads"
                      className="text-sm font-semibold text-[#9A7350] hover:text-[#7A5C3A] flex items-center gap-1"
                    >
                      Alles <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                  <div className="flex-1">
                    {werkAan.length === 0 ? (
                      <div className="p-8 text-center">
                        <p className="font-medium text-gray-700">Geen openstaande series</p>
                        <Link href="/material-uploads/new" className={`${btn.primaryLg} mt-4 inline-flex`}>
                          <Plus className="w-4 h-4" />
                          Nieuwe serie
                        </Link>
                      </div>
                    ) : (
                      <ul className="divide-y divide-[#E4AE7E]/10">
                        {werkAan.map((serie) => (
                          <li
                            key={serie.id}
                            className="px-5 py-4 hover:bg-[#F5EBE0]/25 transition-colors"
                          >
                            <div className="flex justify-between items-center gap-3">
                              <div className="min-w-0 flex-1">
                                <h3 className="font-semibold text-gray-900 truncate">
                                  {serie.titel || 'Naamloze lessenserie'}
                                </h3>
                                <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">
                                  {serie.omschrijving || 'Geen omschrijving'}
                                </p>
                                <p className="text-xs text-gray-500 mt-1.5">
                                  {normalizeLessenSerieStatus(serie.status) === 'Afgewezen'
                                    ? 'Afgewezen'
                                    : 'Nog niet ingediend'}
                                  {' · '}
                                  {serie.aantalLessen || serie.lessen?.length || 0} lessen
                                </p>
                              </div>
                              <Link
                                href={`/material-uploads/${serie.id}`}
                                className={`${btn.action} shrink-0`}
                              >
                                Hervatten
                              </Link>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </section>

                <section className={`${cardClass} overflow-hidden flex flex-col`}>
                  <div className="px-5 py-4 border-b border-[#E4AE7E]/15 flex justify-between items-center bg-[#F5EBE0]/25">
                    <h2 className="text-base font-semibold text-gray-900">Nieuw in de community</h2>
                    <Link
                      href="/materialen"
                      className="text-sm font-semibold text-[#9A7350] hover:text-[#7A5C3A] flex items-center gap-1"
                    >
                      Meer <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                  <div className="flex-1">
                    {platformSeries.length === 0 ? (
                      <p className="p-8 text-center text-gray-500 font-medium">
                        Nog geen gedeeld materiaal
                      </p>
                    ) : (
                      <ul className="divide-y divide-[#E4AE7E]/10">
                        {platformSeries.map((serie) => (
                          <li
                            key={serie.id}
                            className="px-5 py-4 hover:bg-[#F5EBE0]/20 transition-colors"
                          >
                            <div className="flex justify-between items-center gap-3">
                              <div className="min-w-0 flex-1">
                                <h3 className="font-semibold text-gray-900 truncate">{serie.titel}</h3>
                                <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-2">
                                  <span className="inline-flex items-center gap-1">
                                    <span className="w-6 h-6 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center text-[9px] font-bold">
                                      {serie.eigenaar?.naam?.charAt(0).toUpperCase() || (
                                        <User className="w-3 h-3" />
                                      )}
                                    </span>
                                    {serie.eigenaar?.naam || 'Onbekend'}
                                  </span>
                                  <span className="text-gray-400">{serie.schoolNiveau || 'Niveau n.b.'}</span>
                                </p>
                              </div>
                              <Link
                                href={`/materialen/${serie.id}`}
                                className={`${btn.secondary} shrink-0`}
                              >
                                Bekijken
                              </Link>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </section>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default DashboardPage;
