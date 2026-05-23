'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { useAuth } from '@/hooks/useAuth';
import { fetchLessenSeries, deleteLessenSerie, downloadLessenSeriePdf, LessenSerieDto } from '@/lib/lessenserieApi';
import Link from 'next/link';
import { Eye, Edit, Trash2, Download, Search, Plus } from 'lucide-react';
import { btn, inputClass, pageTitle, pageSubtitle } from '@/lib/buttonStyles';
import LessenSerieStatusBadge from '@/components/LessenSerieStatusBadge';
import { canEditLessenSerie } from '@/lib/lessenSerieStatus';

const UploadsPage: React.FC = () => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [items, setItems] = useState<LessenSerieDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const docentId = useMemo(() => user?.docentId || '', [user?.docentId]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return items.filter(
      (ls) =>
        ls.titel.toLowerCase().includes(q) ||
        ls.omschrijving.toLowerCase().includes(q)
    );
  }, [items, searchQuery]);

  const load = async () => {
    if (!docentId) return; // Prevent 400 Bad Request on empty Guid
    setIsRefreshing(true);
    setError(null);
    try {
      const data = await fetchLessenSeries(docentId);
      setItems(data);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Kon lessenseries niet ophalen.';
      setError(message);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  if (!isLoading && !isAuthenticated) {
    return null;
  }

  const onDelete = async (id?: string | null) => {
    if (!id) return;
    const ok = window.confirm('Weet je zeker dat je deze lessenserie wilt verwijderen?');
    if (!ok) return;

    try {
      await deleteLessenSerie(id);
      await load();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Verwijderen mislukt.';
      setError(message);
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

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar activeItem="Mijn uploads" />
      
      {/* Main Content */}
      <div className="flex-1 ml-64">
        {/* Header */}
        <Header />
        
        {/* Uploads Content */}
        <main className="p-8">
          <h1 className={`${pageTitle} mb-2`}>Mijn uploads</h1>
          <p className={`${pageSubtitle} mb-8`}>Beheer je lessenseries en dien ze in ter beoordeling.</p>

          {/* Uploads Section */}
          <div className="bg-white rounded-lg shadow">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-medium text-gray-700">Lijst van lessenserie</h2>
              </div>              
            </div>

            <div className="p-6">
                {/* Search Bar */}
                <div className="mb-6 flex gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Zoek naar lessenserie..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className={`${inputClass} pl-10`}
                    />
                  </div>
                  <Link
                    href="/material-uploads/new"
                    className={`${btn.primary} whitespace-nowrap`}
                    title="Aanmaken"
                  >
                    <Plus className="w-4 h-4" />
                    Lessenserie aanmaken
                  </Link>
                </div>

                {error && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg">
                    {error}
                  </div>
                )}

                {(isLoading || isRefreshing) ? (
                  <div className="p-6 text-gray-500 animate-pulse">Lessenseries laden...</div>
                ) : filteredItems.length === 0 && !error ? (
                  <div className="p-6 text-gray-600 bg-gray-50 border border-dashed border-gray-200 rounded-lg">
                    {searchQuery ? 'Geen lessenseries gevonden voor deze zoekopdracht.' : 'Nog geen lessenseries gevonden.'}
                  </div>
                ) : (
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                    <div className="divide-y divide-gray-100">
                      {filteredItems.map((ls) => (
                        <div key={ls.id ?? ls.titel} className="p-6 flex items-center justify-between gap-4">
                          <div>
                            <Link
                              href={`/material-uploads/${ls.id}`}
                              className="text-lg font-semibold text-gray-900 hover:underline"
                            >
                              {ls.titel}
                            </Link>
                            <p className="text-gray-600 mt-1 line-clamp-2">{ls.omschrijving}</p>
                            <div className="text-xs text-gray-500 mt-2 flex gap-4">
                              <span>
                                Aantal lessen:{' '}
                                {(ls.aantalLessen && ls.aantalLessen > 0)
                                  ? ls.aantalLessen
                                  : (ls.lessen?.length ?? 0)}
                              </span>
                              <LessenSerieStatusBadge status={ls.status} />
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <Link
                              href={`/material-uploads/${ls.id}`}
                              className={btn.icon}
                              aria-label={`Bekijk ${ls.titel}`}
                              title="Bekijken"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>
                            <button
                              onClick={() => onDownload(ls.id)}
                              className={`${btn.icon} cursor-pointer`}
                              aria-label={`Download ${ls.titel}`}
                              title="Downloaden"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            {canEditLessenSerie(ls.status) && (
                              <Link
                                href={`/material-uploads/${ls.id}/edit`}
                                className={btn.icon}
                                aria-label={`Bewerk ${ls.titel}`}
                                title="Bewerken"
                              >
                                <Edit className="w-4 h-4" />
                              </Link>
                            )}
                            <button
                              onClick={() => onDelete(ls.id)}
                              className={`${btn.iconDanger} cursor-pointer`}
                              aria-label={`Verwijder ${ls.titel}`}
                              title="Verwijderen"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="px-8 py-6 border-t border-gray-200 mt-8">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <p>© 2025 Lessen Hub. Alle rechten voorbehouden.</p>
            <div className="flex gap-6">
              <a href="#" className="hover:text-gray-700">Privacy</a>
              <a href="#" className="hover:text-gray-700">Servicevoorwaarden</a>
              <a href="#" className="hover:text-gray-700">Hulp en Veelgestelde vragen</a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default UploadsPage;