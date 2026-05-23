// components/MaterialsTable.tsx
'use client';
import React, { useEffect, useState } from 'react';
import { Search, Eye, Download, FileText, X } from 'lucide-react';
import Link from 'next/link';
import { fetchAllAvailableLessenSeries, LessenSerieDto, downloadLesPdf, downloadLessenSeriePdf } from '@/lib/lessenserieApi';
import { formatLeerjaar, formatSchoolNiveau, formatTaalNiveau } from '@/lib/niveauLabels';
import { getRatingSummary } from '@/lib/ratingUtils';
import { StarRatingDisplay } from '@/components/StarRating';
import { getLaatsteToelichting } from '@/components/BeoordelingenOverzicht';
import MaterialsFilters from './MaterialsFilters';
import { btn, inputClass } from '@/lib/buttonStyles';

interface MaterialsTableProps {
  showFilters?: boolean;
}

const MaterialsTable: React.FC<MaterialsTableProps> = ({ showFilters = true }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [schoolNiveau, setSchoolNiveau] = useState('');
  const [taalNiveau, setTaalNiveau] = useState('');
  const [leerjaar, setLeerjaar] = useState('');
  const [vaardigheden, setVaardigheden] = useState('');
  const [materials, setMaterials] = useState<LessenSerieDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadMaterials = async () => {
      try {
        setIsLoading(true);
        const data = await fetchAllAvailableLessenSeries('Beschikbaar');
        setMaterials(data);
        setError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load materials';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    loadMaterials();
  }, []);

  const onDownload = async (id?: string | null) => {
    if (!id) return;
    try {
      await downloadLessenSeriePdf(id);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Downloaden mislukt.';
      setError(message);
    }
  };

  const filteredMaterials = materials.filter((material) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      material.titel.toLowerCase().includes(q) ||
      material.omschrijving.toLowerCase().includes(q) ||
      formatSchoolNiveau(material.schoolNiveau).toLowerCase().includes(q) ||
      formatTaalNiveau(material.taalNiveau).toLowerCase().includes(q) ||
      formatLeerjaar(material.leerjaar).toLowerCase().includes(q);
    
    const matchesSchoolNiveau = !schoolNiveau || material.schoolNiveau === schoolNiveau;
    const matchesTaalNiveau = !taalNiveau || material.taalNiveau === taalNiveau;
    const matchesLeerjaar = !leerjaar || material.leerjaar === leerjaar;
    const matchesVaardigheid = !vaardigheden || 
      (material.vaardigheden && material.vaardigheden.includes(vaardigheden));

    return matchesSearch && matchesSchoolNiveau && matchesTaalNiveau && matchesLeerjaar && matchesVaardigheid;
  });

  if (showFilters) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Table Section - 3 columns */}
        <div className="lg:col-span-3">
          <MaterialsTableContent 
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            isLoading={isLoading}
            error={error}
            setError={setError}
            filteredMaterials={filteredMaterials}
            onDownload={onDownload}
          />
        </div>

        {/* Filters Section - 1 column */}
        <div className="lg:col-span-1">
          <MaterialsFilters 
            schoolNiveau={schoolNiveau}
            taalNiveau={taalNiveau}
            leerjaar={leerjaar}
            vaardigheden={vaardigheden}
            onSchoolNiveauChange={setSchoolNiveau}
            onTaalNiveauChange={setTaalNiveau}
            onLeerjaarChange={setLeerjaar}
            onVaardigheidChange={setVaardigheden}
          />
        </div>
      </div>
    );
  }

  return (
    <MaterialsTableContent 
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      isLoading={isLoading}
      error={error}
      setError={setError}
      filteredMaterials={filteredMaterials}
      onDownload={onDownload}
    />
  );
};

interface MaterialsTableContentProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isLoading: boolean;
  error: string | null;
  setError: (error: string | null) => void;
  filteredMaterials: LessenSerieDto[];
  onDownload: (id?: string | null) => Promise<void>;
}

const MaterialsTableContent: React.FC<MaterialsTableContentProps> = ({
  searchQuery,
  setSearchQuery,
  isLoading,
  error,
  setError,
  filteredMaterials,
  onDownload,
}) => {
  const [previewMaterial, setPreviewMaterial] = useState<LessenSerieDto & { aanmaakDatum?: string } | null>(null);
  const [selectedLesId, setSelectedLesId] = useState<string | null>(null);

  const selectedLes = previewMaterial?.lessen?.find((l: import('@/lib/lessenserieApi').LesDto) => l.id === selectedLesId) || null;

  const onPreviewDownload = async () => {
    try {
      if (selectedLes?.id) {
        if (!previewMaterial?.id) {
          throw new Error('Lessenserie-id ontbreekt.');
        }

        await downloadLesPdf(String(previewMaterial.id), selectedLes.id);
        return;
      }

      if (previewMaterial?.id) {
        await onDownload(previewMaterial.id);
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Downloaden mislukt.';
      setError(message);
    }
  };

  return (
    <div>
      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Zoek naar..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`${inputClass} pl-10`}
          />
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-8 text-gray-500">
          Materialen laden...
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg">
          {error}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && filteredMaterials.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          Geen materialen gevonden
        </div>
      )}

      {/* Table */}
      {!isLoading && !error && filteredMaterials.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Titel</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Omschrijving</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Onderwijsniveau</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Taalniveau</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Leerjaar</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Beoordeling</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Toelichting</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Docent</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Aantal Lessen</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Acties</th>
              </tr>
            </thead>
            <tbody>
              {filteredMaterials.map((material) => {
                const rating = getRatingSummary(material.beoordelingen);
                const toelichting = getLaatsteToelichting(material.beoordelingen);
                return (
                <tr key={material.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-4 px-4 text-gray-900 font-semibold">{material.titel}</td>
                  <td className="py-4 px-4 text-gray-600 max-w-xs truncate" title={material.omschrijving}>{material.omschrijving}</td>
                  <td className="py-4 px-4 text-gray-700 whitespace-nowrap">{formatSchoolNiveau(material.schoolNiveau)}</td>
                  <td className="py-4 px-4 text-gray-700 whitespace-nowrap">{formatTaalNiveau(material.taalNiveau)}</td>
                  <td className="py-4 px-4 text-gray-700 whitespace-nowrap">{formatLeerjaar(material.leerjaar)}</td>
                  <td className="py-4 px-4">
                    <StarRatingDisplay rating={rating.gemiddelde} aantal={rating.aantal} />
                  </td>
                  <td className="py-4 px-4 text-gray-600 max-w-xs">
                    {toelichting ? (
                      <span className="line-clamp-2" title={toelichting}>
                        {toelichting}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-sm">—</span>
                    )}
                  </td>
                  <td className="py-4 px-4 text-gray-900">{material.eigenaar.naam}</td>
                  <td className="py-4 px-4 text-gray-600">{material.aantalLessen || '-'}</td>
                  <td className="py-4 px-4">
                    <div className="flex gap-2">
                      <Link
                        href={`/materialen/${material.id}`}
                        className={btn.icon}
                        aria-label={`Bekijk ${material.titel}`}
                        title="Bekijken"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => {
                          setPreviewMaterial(material);
                          setSelectedLesId(null);
                        }}
                        className={`${btn.secondary} cursor-pointer`}
                        aria-label="Preview"
                        title="Voorbeeld (Word Document)"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDownload(material.id)}
                        className={`${btn.icon} cursor-pointer`}
                        aria-label="Download"
                        title="Downloaden"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Document/Preview Modal in Brand Style */}
      {previewMaterial && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-gray-900/40 backdrop-blur-sm">
          <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-[#F9FAFB] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 ring-1 ring-gray-900/5">
            {/* Header Toolbar */}
            <div className="bg-white px-6 py-4 flex justify-between items-center shrink-0 border-b border-gray-100 z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-50 flex items-center justify-center rounded-lg text-orange-500">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">{previewMaterial.titel}</h3>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Document Voorbeeld</p>
                </div>
                
                {previewMaterial.lessen && previewMaterial.lessen.length > 0 && (
                  <div className="ml-6 border-l border-gray-100 pl-6 flex items-center">
                    <select
                      value={selectedLesId || ''}
                      onChange={(e) => setSelectedLesId(e.target.value || null)}
                      className="bg-white border border-gray-200 text-gray-700 text-sm font-semibold rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#E4AE7E] focus:border-transparent outline-none cursor-pointer pr-8 bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M5%207.5L10%2012.5L15%207.5%22%20stroke%3D%22%236B7280%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_0.5rem_center] appearance-none"
                    >
                      <option value="">Algemene Informatie (Serie)</option>
                      {previewMaterial.lessen.map((les: import('@/lib/lessenserieApi').LesDto, i: number) => (
                        <option key={les.id} value={les.id}>Les {i + 1}: {les.titel}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={onPreviewDownload}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
                >
                  <Download className="w-4 h-4" /> Download PDF
                </button>
                <button 
                  onClick={() => setPreviewMaterial(null)}
                  className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-xl transition-colors"
                  title="Sluiten"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Document Content Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar bg-gray-50/50">
               <div className="mx-auto bg-white shadow-sm ring-1 ring-gray-900/5 w-full max-w-[21cm] min-h-[29.7cm] h-fit p-10 sm:p-16 text-gray-800 font-sans leading-relaxed rounded-sm">
                  <h1 className="lh-page-title mb-6">
                    {selectedLes ? selectedLes.titel : previewMaterial.titel}
                  </h1>
                  
                  <div className="mb-8 p-5 bg-orange-50/50 border border-orange-100 rounded-xl flex flex-wrap gap-8 md:gap-12">
                    {selectedLes ? (
                      <>
                        <div>
                            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-1">Tijdsduur</p>
                            <p className="text-sm font-semibold text-gray-900">{selectedLes.tijdsDuur || 'N.b.'}</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-1">Onderdeel van Serie</p>
                            <p className="text-sm font-semibold text-gray-900">{previewMaterial.titel}</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-1">Auteur</p>
                            <p className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-orange-200 text-orange-700 flex items-center justify-center text-xs">{previewMaterial.eigenaar?.naam?.charAt(0).toUpperCase() || '?'}</span>
                              {previewMaterial.eigenaar?.naam || 'Onbekend'}
                            </p>
                        </div>
                        <div>
                            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-1">Lessen</p>
                            <p className="text-sm font-semibold text-gray-900">{previewMaterial.aantalLessen || 0} stuks</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-1">Status</p>
                            <p className="text-sm font-semibold text-gray-900">{previewMaterial.status}</p>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="prose prose-orange max-w-none">
                    {selectedLes ? (
                      <>
                        <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-2 mb-4 mt-8">Introductie</h2>
                        <div className="text-gray-700 break-words w-full overflow-x-auto" dangerouslySetInnerHTML={{ __html: selectedLes.introductie || '<p>Geen introductie opgegeven.</p>' }} />

                        <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-2 mb-4 mt-8">Inhoud</h2>
                        <div className="text-gray-700 break-words w-full overflow-x-auto" dangerouslySetInnerHTML={{ __html: selectedLes.inhoud || '<p>Geen inhoud opgegeven.</p>' }} />

                        <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-2 mb-4 mt-8">Slot</h2>
                        <div className="text-gray-700 break-words w-full overflow-x-auto" dangerouslySetInnerHTML={{ __html: selectedLes.slot || '<p>Geen slot opgegeven.</p>' }} />
                      </>
                    ) : (
                      <>
                        <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-2 mb-4 mt-8">Omschrijving</h2>
                        <p className="text-gray-600 whitespace-pre-wrap leading-relaxed">{previewMaterial.omschrijving}</p>

                        <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-2 mb-4 mt-10">Doelgroep & Niveaus</h2>
                      <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-center">
                            <span className="block text-xs text-gray-500 font-medium mb-1">Schoolniveau</span>
                            <span className="block text-sm font-bold text-gray-900">{formatSchoolNiveau(previewMaterial.schoolNiveau)}</span>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-center">
                            <span className="block text-xs text-gray-500 font-medium mb-1">Leerjaar</span>
                            <span className="block text-sm font-bold text-gray-900">{formatLeerjaar(previewMaterial.leerjaar)}</span>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-center">
                            <span className="block text-xs text-gray-500 font-medium mb-1">Taalniveau</span>
                            <span className="block text-sm font-bold text-gray-900">{formatTaalNiveau(previewMaterial.taalNiveau)}</span>
                        </div>
                      </div>

                      {(previewMaterial.vaardigheden && previewMaterial.vaardigheden.length > 0) && (
                        <>
                          <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-2 mb-4 mt-10">Vaardigheden</h2>
                          <div className="flex flex-wrap gap-2 mb-6">
                            {previewMaterial.vaardigheden.map((v: string, i: number) => (
                               <span key={i} className="px-3 py-1.5 bg-orange-50 text-orange-700 border border-orange-100 rounded-lg text-sm font-semibold shadow-sm">{v}</span>
                            ))}
                          </div>
                        </>
                      )}

                      {(previewMaterial.literatuurlijst && previewMaterial.literatuurlijst.length > 0) && (
                         <>
                            <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-2 mb-4 mt-10">Literatuur & Bronnen</h2>
                            <ul className="space-y-3 mb-6">
                              {previewMaterial.literatuurlijst.map((lit: string, i: number) => (
                                <li key={i} className="flex items-start gap-3">
                                   <div className="mt-1.5 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-orange-400"></div>
                                   <span className="text-gray-700 leading-snug">{lit}</span>
                                </li>
                              ))}
                            </ul>
                         </>
                      )}
                    </>
                  )}
                  </div>
                  
                  <div className="mt-20 pt-8 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
                     <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-orange-50 text-orange-500 flex items-center justify-center font-bold">LH</div>
                        <span className="font-semibold uppercase tracking-wider">LessenHub Document Preview</span>
                     </div>
                     <span className="font-bold tracking-widest">PAGINA 1 VAN 1</span>
                  </div>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaterialsTable;