'use client';

import React, { useMemo, useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { Eye, HelpCircle } from 'lucide-react';
import {
  CEFR_TAAL_NIVEAU_OPTIONS,
  LEERJAAR_OPTIONS_BY_SCHOOL,
  MEIJERINK_NIVEAU_OPTIONS,
  SCHOOL_NIVEAU_OPTIONS,
  SLO_KERNDOELEN,
  VAARDIGHEDEN_OPTIONS,
  leerjaarValuesToEnums,
} from '@/lib/lessenSerieFormConstants';
import { btn, inputClass, sectionTitle } from '@/lib/buttonStyles';
import {
  formatLeerjaar,
  formatSchoolNiveau,
  formatTaalNiveau,
} from '@/lib/niveauLabels';

interface CustomSelectProps {
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
  disabled?: boolean;
}

const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div className={`relative ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`} ref={ref}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-100 transition-all bg-white hover:border-orange-300 text-left"
      >
        <span className={selectedOption ? 'text-gray-900 font-medium' : 'text-gray-400'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <svg
          className={`w-5 h-5 text-gray-400 shrink-0 ${isOpen ? 'rotate-180 text-orange-500' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-gray-100 rounded-xl shadow-lg max-h-60 overflow-y-auto">
          <ul className="py-1">
            {options.map((opt) => (
              <li key={opt.value}>
                <button
                  type="button"
                  className={`w-full text-left px-4 py-2.5 text-sm ${
                    value === opt.value
                      ? 'bg-orange-50 text-orange-700 font-bold'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                >
                  {opt.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export interface LessenSerieFormValues {
  titel: string;
  omschrijving: string;
  schoolNiveau: string;
  taalNiveau: string;
  taalniveauMeijerink: string;
  leerjaren: string[];
  vaardigheden: string[];
  sloKerndoelen: string[];
  overigeVakken: string[];
  literatuurlijst: string[];
}

interface LessenSerieAanmakenFormProps {
  onSubmit: (values: LessenSerieFormValues) => Promise<void>;
  isSubmitting: boolean;
  error: string | null;
  submitLabel?: string;
}

const LessenSerieAanmakenForm: React.FC<LessenSerieAanmakenFormProps> = ({
  onSubmit,
  isSubmitting,
  error,
  submitLabel = 'Lessenserie aanmaken',
}) => {
  const [titel, setTitel] = useState('');
  const [omschrijving, setOmschrijving] = useState('');
  const [schoolNiveau, setSchoolNiveau] = useState('');
  const [taalNiveau, setTaalNiveau] = useState('');
  const [taalniveauMeijerink, setTaalniveauMeijerink] = useState('');
  const [leerjaren, setLeerjaren] = useState<string[]>([]);
  const [vaardigheden, setVaardigheden] = useState<string[]>([]);
  const [sloKerndoelen, setSloKerndoelen] = useState<string[]>([]);
  const [overigeVakInput, setOverigeVakInput] = useState('');
  const [overigeVakken, setOverigeVakken] = useState<string[]>([]);
  const [literatuurlijst, setLiteratuurlijst] = useState<string[]>([]);
  const [literatuurInput, setLiteratuurInput] = useState('');
  const [showPreview, setShowPreview] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);

  const leerjaarOptions = schoolNiveau ? LEERJAAR_OPTIONS_BY_SCHOOL[schoolNiveau] ?? [] : [];
  const showOverigeVakken = vaardigheden.includes('VakoverstijgendTaalonderwijs');

  const previewLeerjaren = useMemo(
    () =>
      leerjaren
        .map((v) => leerjaarOptions.find((o) => o.value === v)?.label)
        .filter(Boolean)
        .join(', '),
    [leerjaren, leerjaarOptions]
  );

  const toggleInList = (list: string[], key: string, checked: boolean) =>
    checked ? [...list, key] : list.filter((x) => x !== key);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!titel.trim()) {
      setValidationError('Vul een titel in.');
      return;
    }
    if (!omschrijving.trim()) {
      setValidationError('Vul een omschrijving in.');
      return;
    }
    if (!schoolNiveau) {
      setValidationError('Kies een onderwijsniveau.');
      return;
    }
    if (!taalNiveau) {
      setValidationError('Kies een taalniveau (CEFR).');
      return;
    }
    if (leerjaren.length === 0) {
      setValidationError('Kies minimaal één leerjaar (geschikt voor).');
      return;
    }

    await onSubmit({
      titel: titel.trim(),
      omschrijving: omschrijving.trim(),
      schoolNiveau,
      taalNiveau,
      taalniveauMeijerink,
      leerjaren,
      vaardigheden,
      sloKerndoelen,
      overigeVakken,
      literatuurlijst,
    });
  };

  const displayError = validationError || error;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
      <form onSubmit={handleSubmit} className="xl:col-span-2 space-y-8">
        {displayError && (
          <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r-lg text-sm">
            {displayError}
          </div>
        )}

        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
            <h2 className={sectionTitle}>1. Titel en omschrijving</h2>
            <p className="text-sm text-gray-500 mt-1">
              Zichtbaar in overzichten en op de detailpagina van je serie.
            </p>
          </div>
          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Titel van de serie</label>
              <input
                value={titel}
                onChange={(e) => setTitel(e.target.value)}
                required
                className="lh-input"
                placeholder="Bijv. Examentraining Nederlands — Leesvaardigheid"
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-semibold text-gray-700">Omschrijving</label>
                <span className={`text-xs ${omschrijving.length > 20000 ? 'text-red-500' : 'text-gray-400'}`}>
                  {omschrijving.length} / 20.000
                </span>
              </div>
              <textarea
                value={omschrijving}
                onChange={(e) => setOmschrijving(e.target.value)}
                rows={4}
                maxLength={20000}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-100 text-gray-900 resize-none"
                placeholder="Waar gaat deze serie over? Voor wie is het bedoeld?"
              />
            </div>
          </div>
        </section>

        <section className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
            <h2 className={sectionTitle}>2. Doelgroep en niveaus</h2>
          </div>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Onderwijsniveau</label>
                <CustomSelect
                  value={schoolNiveau}
                  onChange={(val) => {
                    setSchoolNiveau(val);
                    setLeerjaren([]);
                  }}
                  placeholder="Kies niveau..."
                  options={[...SCHOOL_NIVEAU_OPTIONS]}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Taalniveau (CEFR)
                </label>
                <CustomSelect
                  value={taalNiveau}
                  onChange={setTaalNiveau}
                  placeholder="Kies CEFR..."
                  options={[...CEFR_TAAL_NIVEAU_OPTIONS]}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Taalniveau Meijerink <span className="font-normal text-gray-400">(optioneel)</span>
                </label>
                <CustomSelect
                  value={taalniveauMeijerink}
                  onChange={setTaalniveauMeijerink}
                  placeholder="Kies Meijerink-niveau..."
                  options={[...MEIJERINK_NIVEAU_OPTIONS]}
                />
                <p className="text-xs text-gray-500 mt-2">
                  Gebruik Meijerink naast CEFR als je met het referentiekader NT2 werkt.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Geschikt voor leerjaar <span className="text-gray-400 font-normal">(meerdere mogelijk)</span>
              </label>
              {!schoolNiveau ? (
                <p className="text-sm text-gray-500">Kies eerst een onderwijsniveau.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {leerjaarOptions.map((opt) => (
                    <label
                      key={opt.value}
                      className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm ${
                        leerjaren.includes(opt.value)
                          ? 'border-orange-500 bg-orange-50 text-gray-900'
                          : 'border-gray-200 hover:border-orange-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={leerjaren.includes(opt.value)}
                        onChange={(e) =>
                          setLeerjaren(toggleInList(leerjaren, opt.value, e.target.checked))
                        }
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
            <h2 className={sectionTitle}>3. Vaardigheden</h2>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {VAARDIGHEDEN_OPTIONS.map(({ key, label }) => (
                <label
                  key={key}
                  className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer ${
                    vaardigheden.includes(key)
                      ? 'border-orange-500 bg-orange-50/30'
                      : 'border-gray-200 hover:border-orange-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={vaardigheden.includes(key)}
                    onChange={(e) =>
                      setVaardigheden(toggleInList(vaardigheden, key, e.target.checked))
                    }
                  />
                  <span className="text-sm font-medium text-gray-800">{label}</span>
                </label>
              ))}
            </div>
            {showOverigeVakken && (
              <div className="pt-4 border-t border-gray-100">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Andere vak(ken) <span className="font-normal text-gray-400">(bij vakoverstijgend)</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={overigeVakInput}
                    onChange={(e) => setOverigeVakInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (overigeVakInput.trim()) {
                          setOverigeVakken([...overigeVakken, overigeVakInput.trim()]);
                          setOverigeVakInput('');
                        }
                      }
                    }}
                    className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-gray-900"
                    placeholder="Bijv. Geschiedenis, Aardrijkskunde"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (overigeVakInput.trim()) {
                        setOverigeVakken([...overigeVakken, overigeVakInput.trim()]);
                        setOverigeVakInput('');
                      }
                    }}
                    className="px-4 py-2 bg-gray-100 rounded-lg text-sm font-medium"
                  >
                    Toevoegen
                  </button>
                </div>
                {overigeVakken.length > 0 && (
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {overigeVakken.map((v, i) => (
                      <li
                        key={`${v}-${i}`}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-sm"
                      >
                        {v}
                        <button
                          type="button"
                          className="text-gray-500 hover:text-red-600"
                          onClick={() => setOverigeVakken(overigeVakken.filter((_, j) => j !== i))}
                        >
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </section>

        <section className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
            <h2 className={sectionTitle}>4. SLO-kerndoelen taal</h2>
            <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
              <HelpCircle className="w-4 h-4" />
              Houd de muis op een kerndoel voor uitleg.
            </p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {SLO_KERNDOELEN.map((k) => (
                <label
                  key={k.code}
                  title={`${k.titel}\n\n${k.beschrijving}`}
                  className={`relative flex flex-col p-3 border rounded-xl cursor-help text-left transition-colors ${
                    sloKerndoelen.includes(k.code)
                      ? 'border-orange-500 bg-orange-50/40'
                      : 'border-gray-200 hover:border-orange-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={sloKerndoelen.includes(k.code)}
                    onChange={(e) =>
                      setSloKerndoelen(toggleInList(sloKerndoelen, k.code, e.target.checked))
                    }
                  />
                  <span className="font-bold text-gray-900">{k.code}</span>
                  <span className="text-xs text-gray-500 line-clamp-2 mt-0.5">{k.titel.split('—')[1]?.trim()}</span>
                </label>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
            <h2 className={sectionTitle}>5. Literatuurlijst</h2>
            <p className="text-sm text-gray-500">Optioneel</p>
          </div>
          <div className="p-6">
            <div className="flex gap-2">
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
                className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-gray-900"
                placeholder="Titel van boek of bron..."
              />
              <button
                type="button"
                onClick={() => {
                  if (literatuurInput.trim()) {
                    setLiteratuurlijst([...literatuurlijst, literatuurInput.trim()]);
                    setLiteratuurInput('');
                  }
                }}
                className="px-4 py-3 bg-gray-100 rounded-xl text-sm font-semibold"
              >
                Voeg toe
              </button>
            </div>
            {literatuurlijst.length > 0 && (
              <ul className="mt-3 space-y-1 text-sm text-gray-700">
                {literatuurlijst.map((item, index) => (
                  <li key={index} className="flex justify-between gap-2">
                    <span>{item}</span>
                    <button
                      type="button"
                      className="text-red-600"
                      onClick={() => setLiteratuurlijst(literatuurlijst.filter((_, i) => i !== index))}
                    >
                      Verwijder
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <div className="flex items-center justify-end gap-4 pb-8">
          <Link href="/material-uploads" className={btn.ghost}>
            Annuleren
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className={`${btn.primaryLg} min-w-[200px]`}
          >
            {isSubmitting ? 'Bezig...' : submitLabel}
          </button>
        </div>
      </form>

      <aside className="xl:col-span-1">
        <div className="sticky top-8 space-y-4">
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className={`w-full ${btn.secondary}`}
          >
            <Eye className="w-4 h-4" />
            {showPreview ? 'Preview verbergen' : 'Preview tonen'}
          </button>

          {showPreview && (
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-[#E4AE7E]/10 border-b border-[#E4AE7E]/20">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#8B6914]">Preview</p>
                <p className="text-sm text-gray-600 mt-1">Zo verschijnt je serie straks</p>
              </div>
              <div className="p-4 space-y-4 text-sm">
                <div>
                  <p className="text-xs text-gray-400 uppercase">Mijn uploads / Materialen</p>
                  <p className="font-bold text-gray-900 text-lg mt-1">{titel || 'Titel van de serie'}</p>
                  <p className="text-gray-600 mt-2 line-clamp-4">
                    {omschrijving || 'Hier komt je omschrijving…'}
                  </p>
                </div>
                <dl className="space-y-2 text-gray-700">
                  <div>
                    <dt className="text-gray-400 text-xs">Onderwijsniveau</dt>
                    <dd>
                      {schoolNiveau
                        ? (SCHOOL_NIVEAU_OPTIONS.find((o) => o.value === schoolNiveau)?.label ?? '—')
                        : '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-400 text-xs">Taalniveau (CEFR)</dt>
                    <dd>{taalNiveau ? formatTaalNiveau(CEFR_TAAL_NIVEAU_OPTIONS.find((o) => o.value === taalNiveau)?.label) : '—'}</dd>
                  </div>
                  {taalniveauMeijerink && (
                    <div>
                      <dt className="text-gray-400 text-xs">Meijerink</dt>
                      <dd>{taalniveauMeijerink}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-gray-400 text-xs">Geschikt voor leerjaar</dt>
                    <dd>{previewLeerjaren || '—'}</dd>
                  </div>
                  {vaardigheden.length > 0 && (
                    <div>
                      <dt className="text-gray-400 text-xs">Vaardigheden</dt>
                      <dd>{vaardigheden.map((v) => VAARDIGHEDEN_OPTIONS.find((o) => o.key === v)?.label ?? v).join(', ')}</dd>
                    </div>
                  )}
                  {sloKerndoelen.length > 0 && (
                    <div>
                      <dt className="text-gray-400 text-xs">SLO-kerndoelen</dt>
                      <dd>{sloKerndoelen.join(', ')}</dd>
                    </div>
                  )}
                </dl>
                <p className="text-xs text-gray-500 pt-2 border-t border-gray-100">
                  Lessen voeg je toe in de volgende stap, na het aanmaken van de serie.
                </p>
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
};

export default LessenSerieAanmakenForm;
