'use client';

import React, { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { useAuth } from '@/hooks/useAuth';
import { fetchLessenSerieById, updateLessenSerie } from '@/lib/lessenserieApi';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { btn, pageTitle, pageSubtitle } from '@/lib/buttonStyles';

export default function EditLessenSeriePage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [titel, setTitel] = useState('');
  const [omschrijving, setOmschrijving] = useState('');
  const [schoolNiveau, setSchoolNiveau] = useState('');
  const [taalNiveau, setTaalNiveau] = useState('');
  const [leerjaar, setLeerjaar] = useState('');
  const [vaardigheden, setVaardigheden] = useState<string[]>([]);
  const [literatuurlijst, setLiteratuurlijst] = useState<string[]>([]);
  const [literatuurInput, setLiteratuurInput] = useState('');
  const [rawItem, setRawItem] = useState<unknown>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const params = useParams<{ id?: string }>();
  const id = params?.id;

  useEffect(() => {
    if (!isAuthenticated) return;
    if (!id || id === 'undefined') {
      setError('Ongeldig lessenserie-id in de URL.');
      return;
    }
    const load = async () => {
      try {
        setError(null);
        const data = await fetchLessenSerieById(id);
        setRawItem(data);
        setTitel(data?.titel ?? '');
        setOmschrijving(data?.omschrijving ?? '');
        setSchoolNiveau(data?.schoolNiveau ?? '');
        setTaalNiveau(data?.taalNiveau ?? '');
        setLeerjaar(data?.leerjaar ?? '');
        setVaardigheden(data?.vaardigheden ?? []);
        setLiteratuurlijst(data?.literatuurlijst ?? []);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Kon lessenserie niet ophalen.';
        setError(message);
      }
    };
    load();
  }, [isAuthenticated, id]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-gray-500">Laden...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (!id || id === 'undefined') {
        throw new Error('Ongeldig lessenserie-id in de URL.');
      }
      // Backend expects PascalCase.
      const payload = {
        ...(rawItem ?? {}),
        Id: id,
        Titel: titel,
        Omschrijving: omschrijving,
        SchoolNiveau: schoolNiveau,
        TaalNiveau: taalNiveau,
        Leerjaar: leerjaar || null,
        Vaardigheden: vaardigheden,
        Literatuurlijst: literatuurlijst
      };

      await updateLessenSerie(id, payload);
      router.push(`/material-uploads/${id}`);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Bijwerken mislukt.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar activeItem="Mijn uploads" />
      <div className="flex-1 ml-64">
        <Header />
        <main className="p-8">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <h1 className={pageTitle}>Lessenserie bewerken</h1>
              <p className={pageSubtitle}>Werk de gegevens van je serie bij.</p>
            </div>

            <div className="flex gap-2">
              <a
                href={id ? `/material-uploads/${id}` : '/material-uploads'}
                className="px-3 py-2 text-gray-900 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Terug
              </a>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-6 max-w-3xl">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">Titel</label>
              <input
                value={titel}
                onChange={(e) => setTitel(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900 placeholder:text-gray-400"
              />
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">Omschrijving</label>
              <textarea
                value={omschrijving}
                onChange={(e) => setOmschrijving(e.target.value)}
                rows={5}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900 placeholder:text-gray-400"
              />
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Schoolniveau</label>
                  <select
                    value={schoolNiveau}
                    onChange={(e) => setSchoolNiveau(e.target.value)}
                    required
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900"
                  >
                    <option value="">Selecteer niveau</option>
                    <option value="VMBO">VMBO</option>
                    <option value="HAVO">HAVO</option>
                    <option value="VWO">VWO</option>
                    <option value="MBO">MBO</option>
                    <option value="HBO">HBO</option>
                    <option value="WO">WO</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Taalniveau</label>
                  <select
                    value={taalNiveau}
                    onChange={(e) => setTaalNiveau(e.target.value)}
                    required
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900"
                  >
                    <option value="">Selecteer niveau</option>
                    <option value="A1">A1</option>
                    <option value="A2">A2</option>
                    <option value="B1">B1</option>
                    <option value="B2">B2</option>
                    <option value="C1">C1</option>
                    <option value="C2">C2</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">Leerjaar</label>
              <select
                value={leerjaar}
                onChange={(e) => setLeerjaar(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900"
              >
                <option value="">Selecteer leerjaar</option>
                <option value="EersteLeerjaar">Eerste Leerjaar</option>
                <option value="TweedeLeerjaar">Tweede Leerjaar</option>
                <option value="DerdeLeerjaar">Derde Leerjaar</option>
                <option value="VierdeLeerjaar">Vierde Leerjaar</option>
                <option value="VijfdeLeerjaar">Vijfde Leerjaar</option>
                <option value="ZesdeLeerjaar">Zesde Leerjaar</option>
              </select>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">Vaardigheden</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={vaardigheden.includes('Communicatie')}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setVaardigheden([...vaardigheden, 'Communicatie']);
                      } else {
                        setVaardigheden(vaardigheden.filter(v => v !== 'Communicatie'));
                      }
                    }}
                    className="h-4 w-4"
                  />
                  <span className="text-sm text-gray-800">Communicatie</span>
                </label>
                <label className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={vaardigheden.includes('Samenwerking')}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setVaardigheden([...vaardigheden, 'Samenwerking']);
                      } else {
                        setVaardigheden(vaardigheden.filter(v => v !== 'Samenwerking'));
                      }
                    }}
                    className="h-4 w-4"
                  />
                  <span className="text-sm text-gray-800">Samenwerking</span>
                </label>
                <label className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={vaardigheden.includes('Probleemoplossing')}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setVaardigheden([...vaardigheden, 'Probleemoplossing']);
                      } else {
                        setVaardigheden(vaardigheden.filter(v => v !== 'Probleemoplossing'));
                      }
                    }}
                    className="h-4 w-4"
                  />
                  <span className="text-sm text-gray-800">Probleemoplossing</span>
                </label>
                <label className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={vaardigheden.includes('Creativiteit')}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setVaardigheden([...vaardigheden, 'Creativiteit']);
                      } else {
                        setVaardigheden(vaardigheden.filter(v => v !== 'Creativiteit'));
                      }
                    }}
                    className="h-4 w-4"
                  />
                  <span className="text-sm text-gray-800">Creativiteit</span>
                </label>
                <label className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={vaardigheden.includes('KritischDenken')}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setVaardigheden([...vaardigheden, 'KritischDenken']);
                      } else {
                        setVaardigheden(vaardigheden.filter(v => v !== 'KritischDenken'));
                      }
                    }}
                    className="h-4 w-4"
                  />
                  <span className="text-sm text-gray-800">Kritisch Denken</span>
                </label>
                <label className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={vaardigheden.includes('Leiderschap')}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setVaardigheden([...vaardigheden, 'Leiderschap']);
                      } else {
                        setVaardigheden(vaardigheden.filter(v => v !== 'Leiderschap'));
                      }
                    }}
                    className="h-4 w-4"
                  />
                  <span className="text-sm text-gray-800">Leiderschap</span>
                </label>
                <label className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={vaardigheden.includes('Tijdsbeheer')}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setVaardigheden([...vaardigheden, 'Tijdsbeheer']);
                      } else {
                        setVaardigheden(vaardigheden.filter(v => v !== 'Tijdsbeheer'));
                      }
                    }}
                    className="h-4 w-4"
                  />
                  <span className="text-sm text-gray-800">Tijdsbeheer</span>
                </label>
                <label className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={vaardigheden.includes('TechnologischeVaardigheden')}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setVaardigheden([...vaardigheden, 'TechnologischeVaardigheden']);
                      } else {
                        setVaardigheden(vaardigheden.filter(v => v !== 'TechnologischeVaardigheden'));
                      }
                    }}
                    className="h-4 w-4"
                  />
                  <span className="text-sm text-gray-800">Technologische Vaardigheden</span>
                </label>
                <label className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={vaardigheden.includes('Aanpassingsvermogen')}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setVaardigheden([...vaardigheden, 'Aanpassingsvermogen']);
                      } else {
                        setVaardigheden(vaardigheden.filter(v => v !== 'Aanpassingsvermogen'));
                      }
                    }}
                    className="h-4 w-4"
                  />
                  <span className="text-sm text-gray-800">Aanpassingsvermogen</span>
                </label>
                <label className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={vaardigheden.includes('EmotioneleIntelligentie')}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setVaardigheden([...vaardigheden, 'EmotioneleIntelligentie']);
                      } else {
                        setVaardigheden(vaardigheden.filter(v => v !== 'EmotioneleIntelligentie'));
                      }
                    }}
                    className="h-4 w-4"
                  />
                  <span className="text-sm text-gray-800">Emotionele Intelligentie</span>
                </label>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">Literatuurlijst</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={literatuurInput}
                  onChange={(e) => setLiteratuurInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (literatuurInput.trim()) {
                        setLiteratuurlijst([...literatuurlijst, literatuurInput.trim()]);
                        setLiteratuurInput('');
                      }
                    }
                  }}
                  className="flex-1 px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900"
                  placeholder="Voeg een literatuurreferentie toe..."
                />
                <button
                  type="button"
                  onClick={() => {
                    if (literatuurInput.trim()) {
                      setLiteratuurlijst([...literatuurlijst, literatuurInput.trim()]);
                      setLiteratuurInput('');
                    }
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Toevoegen
                </button>
              </div>
              {literatuurlijst.length > 0 && (
                <div className="space-y-2">
                  {literatuurlijst.map((item, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg">
                      <span className="text-sm text-gray-700">{item}</span>
                      <button
                        type="button"
                        onClick={() => setLiteratuurlijst(literatuurlijst.filter((_, i) => i !== index))}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Verwijder
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className={btn.primary}
              >
                {isSubmitting ? 'Opslaan...' : 'Opslaan'}
              </button>
              <Link
                href={`/material-uploads/${id}`}
                className="px-4 py-2 bg-white border border-gray-200 text-gray-900 rounded-lg hover:bg-gray-50"
              >
                Annuleren
              </Link>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}
